import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import ts from 'typescript';

// Compile only these modules in memory; no network requests or real API keys.
const asModule = source => 'data:text/javascript;base64,' + Buffer.from(source).toString('base64');
const compile = source => ts.transpileModule(source, { compilerOptions: { target: ts.ScriptTarget.ES2023, module: ts.ModuleKind.ESNext } }).outputText;
const typesUrl = asModule(compile(await readFile('src/types/ai.ts', 'utf8')));
const serviceCode = compile(await readFile('src/services/groqService.ts', 'utf8'))
  .replaceAll('../types/ai', typesUrl)
  .replaceAll('import.meta.env.VITE_GROQ_API_KEY', 'globalThis.__groqTestEnv.key');
const { groqChat, groqStream, GroqError } = await import(asModule(serviceCode));
const messages = Object.freeze([Object.freeze({ role: 'user', content: 'Hola' })]);
const originalFetch = globalThis.fetch;
globalThis.__groqTestEnv = { key: 'test-only-key' };
const fail = (code, status) => error => error instanceof GroqError && error.code === code && error.status === status;
const event = text => `data: ${JSON.stringify({ choices: [{ index: 0, delta: { content: text } }] })}\n\n`;
function stream(text, split = false) {
  const bytes = new TextEncoder().encode(text);
  return new Response(new ReadableStream({ start(controller) {
    if (split) for (const byte of bytes) controller.enqueue(Uint8Array.of(byte));
    else controller.enqueue(bytes);
    controller.close();
  } }), { headers: { 'Content-Type': 'text/event-stream; charset=utf-8' } });
}
try {
 await test('chat: defaults, prompt, options, signal, no mutation or shared conversation', async () => {
  const calls = [];
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => { calls.push({ url, options, body: JSON.parse(options.body) }); return Response.json({ choices: [{ message: { content: 'Dale, che.' } }] }); };
  assert.equal(await groqChat(messages, { temperature: 0, maxTokens: 64, signal: controller.signal }), 'Dale, che.');
  assert.equal(calls[0].url, 'https://api.groq.com/openai/v1/chat/completions');
  assert.equal(calls[0].body.model, 'llama-3.3-70b-versatile');
  assert.equal(calls[0].body.temperature, 0);
  assert.equal(calls[0].body.max_completion_tokens, 64);
  assert.equal(calls[0].options.signal, controller.signal);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-only-key');
  assert.match(calls[0].body.messages[0].content, /rioplatense/);
  await groqChat([{ role: 'system', content: 'Sé breve.' }, ...messages], { model: 'custom-model' });
  assert.equal(calls[1].body.model, 'custom-model');
  assert.equal(calls[1].body.messages.length, 3);
  assert.equal(messages.length, 1);
 });
 await test('configuration and option errors do not call fetch', async () => {
  globalThis.fetch = () => { throw new Error('must not fetch'); };
  globalThis.__groqTestEnv.key = ' ';
  await assert.rejects(groqChat(messages), fail('MISSING_API_KEY', 0));
  globalThis.__groqTestEnv.key = 'test-only-key';
  await assert.rejects(groqChat([]), fail('INVALID_MESSAGES', 0));
  await assert.rejects(groqChat(messages, { temperature: 3 }), fail('INVALID_OPTIONS', 0));
  await assert.rejects(groqChat(messages, { maxTokens: 1.5 }), fail('INVALID_OPTIONS', 0));
 });
 await test('HTTP errors preserve API status, message and code', async () => {
  globalThis.fetch = async () => Response.json({ error: { message: 'Rate limited', code: 'rate_limit_exceeded' } }, { status: 429 });
  await assert.rejects(groqChat(messages), e => fail('rate_limit_exceeded', 429)(e) && e.message === 'Rate limited');
  await assert.rejects(groqStream(messages, () => {}), fail('rate_limit_exceeded', 429));
  globalThis.fetch = async () => new Response('<html>Gateway failure</html>', { status: 502 });
  await assert.rejects(groqChat(messages), fail('HTTP_502', 502));
 });
 await test('network, abort and invalid JSON produce GroqError', async () => {
  globalThis.fetch = async () => { throw new TypeError('fetch failed'); };
  await assert.rejects(groqChat(messages), fail('NETWORK_ERROR', 0));
  const controller = new AbortController(); controller.abort();
  await assert.rejects(groqChat(messages, { signal: controller.signal }), fail('ABORTED', 0));
  globalThis.fetch = async () => new Response('invalid');
  await assert.rejects(groqChat(messages), fail('INVALID_RESPONSE', 200));
  globalThis.fetch = async () => Response.json({ choices: [] });
  await assert.rejects(groqChat(messages), fail('INVALID_RESPONSE', 200));
 });
 await test('SSE: fragmented UTF-8, split CRLF, metadata, comments, DONE', async () => {
  const text = ': keepalive\r\ndata: {"choices":[{"index":0,"delta":{"role":"assistant"}}]}\r\n\r\n' +
    event('Che, café 🧉').replaceAll('\n', '\r\n') + event(' listo') +
    'data: {"choices":[],"usage":{}}\n\ndata: [DONE]\n\n' + event('must ignore');
  globalThis.fetch = async (_, options) => { assert.equal(JSON.parse(options.body).stream, true); return stream(text, true); };
  const chunks = [];
  await groqStream(messages, text => chunks.push(text));
  assert.deepEqual(chunks, ['Che, café 🧉', ' listo']);
 });
 await test('SSE: multiline data, CR-only boundaries, final DONE without newline', async () => {
  globalThis.fetch = async () => stream('data: {"choices":\rdata: [{"index":0,"delta":{"content":"Dale"}}]}\r\rdata: [DONE]', true);
  const chunks = [];
  await groqStream(messages, text => chunks.push(text));
  assert.deepEqual(chunks, ['Dale']);
 });
 await test('SSE deltas are delivered before the connection finishes', async () => {
  let controller;
  globalThis.fetch = async () => new Response(new ReadableStream({ start(c) { controller = c; c.enqueue(new TextEncoder().encode(event('Primero'))); } }), { headers: { 'Content-Type': 'text/event-stream' } });
  let delivered;
  const firstChunk = new Promise(resolve => { delivered = resolve; });
  const pending = groqStream(messages, text => delivered(text));
  assert.equal(await firstChunk, 'Primero');
  controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
  controller.close();
  await pending;
 });
 await test('SSE: incomplete streams, malformed events, embedded API errors', async () => {
  globalThis.fetch = async () => stream(event('Partial'));
  await assert.rejects(groqStream(messages, () => {}), fail('INCOMPLETE_STREAM', 200));
  globalThis.fetch = async () => stream('data: not-json\n\n');
  await assert.rejects(groqStream(messages, () => {}), fail('INVALID_RESPONSE', 200));
  globalThis.fetch = async () => stream('data: {"error":{"message":"Failed","code":"generation_failed"}}\n\n');
  await assert.rejects(groqStream(messages, () => {}), fail('generation_failed', 200));
 });
 await test('SSE: missing body and incorrect content type', async () => {
  globalThis.fetch = async () => new Response(null, { status: 204 });
  await assert.rejects(groqStream(messages, () => {}), fail('MISSING_STREAM', 204));
  globalThis.fetch = async () => Response.json({ choices: [] });
  await assert.rejects(groqStream(messages, () => {}), fail('INVALID_STREAM', 200));
 });
 await test('SSE: callback errors cancel and release the stream', async () => {
  let cancelled = false; let body;
  globalThis.fetch = async () => {
    body = new ReadableStream({ start(c) { c.enqueue(new TextEncoder().encode(event('one'))); }, cancel() { cancelled = true; } });
    return new Response(body, { headers: { 'Content-Type': 'text/event-stream' } });
  };
  await assert.rejects(groqStream(messages, () => { throw new Error('UI failed'); }), fail('CALLBACK_ERROR', 0));
  assert.equal(cancelled, true); assert.equal(body.locked, false);
 });
 await test('SSE: cancellation stops later deltas in the same network chunk', async () => {
  const controller = new AbortController(); const chunks = [];
  globalThis.fetch = async () => stream(event('one') + event('two') + 'data: [DONE]\n\n');
  await assert.rejects(groqStream(messages, text => { chunks.push(text); controller.abort(); }, { signal: controller.signal }), fail('ABORTED', 0));
  assert.deepEqual(chunks, ['one']);
 });
} finally { globalThis.fetch = originalFetch; delete globalThis.__groqTestEnv; }
