import { JSDOM } from 'jsdom';
import { createServer } from 'vite';
import assert from 'node:assert/strict';

const dom = new JSDOM('<!doctype html><html><body></body></html>', { url: 'http://localhost:3001' });
Object.assign(globalThis, { window: dom.window, document: dom.window.document, HTMLElement: dom.window.HTMLElement, IS_REACT_ACT_ENVIRONMENT: true,
  requestAnimationFrame: fn => setTimeout(fn, 0), cancelAnimationFrame: clearTimeout });
Object.defineProperty(globalThis, 'navigator', { value: dom.window.navigator, configurable: true });
const mobile = new dom.window.EventTarget(); mobile.matches = true;
const reduced = new dom.window.EventTarget(); reduced.matches = false;
window.matchMedia = query => query.includes('reduced-motion') ? reduced : mobile;
const viewport = new dom.window.EventTarget();
Object.assign(viewport, { height: 800, offsetTop: 0, scale: 1 });
Object.defineProperty(window, 'visualViewport', { value: viewport });
Object.defineProperty(window, 'innerHeight', { value: 800, writable: true });
const animations = [];
dom.window.HTMLElement.prototype.animate = function() {
  const animation = { cancelled: false, cancel() { this.cancelled = true; } };
  animations.push(animation); return animation;
};
const React = await import('react');
const { render, screen, fireEvent, cleanup, waitFor } = await import('@testing-library/react');
const server = await createServer({ server: { middlewareMode: true, watch: null, hmr: false }, optimizeDeps: { noDiscovery: true, include: [] }, appType: 'custom' });
try {
  const { useMobileViewport, useMobileScreenMotion } = await server.ssrLoadModule('/src/features/retail/useMobileExperience.ts');
  function Harness({ page }) {
    const ref = React.useRef(null);
    useMobileViewport(); useMobileScreenMotion(ref, page);
    return React.createElement('main', { ref }, React.createElement('h1', { className: 'page-heading' }, page), React.createElement('input', { 'aria-label': 'Importe', defaultValue: '' }));
  }
  const view = render(React.createElement(Harness, { page: 'pos' }));
  const input = screen.getByLabelText('Importe');
  fireEvent.change(input, { target: { value: '250' } });
  view.rerender(React.createElement(Harness, { page: 'cash' }));
  assert.equal(animations.length, 2);
  assert.equal(screen.getByLabelText('Importe'), input);
  assert.equal(input.value, '250');
  fireEvent.pointerDown(input); assert.ok(animations.every(a => a.cancelled));
  reduced.matches = true;
  view.rerender(React.createElement(Harness, { page: 'catalog' }));
  assert.equal(animations.length, 2);
  reduced.matches = false; mobile.matches = false;
  view.rerender(React.createElement(Harness, { page: 'settings' }));
  assert.equal(animations.length, 2);
  mobile.matches = true;
  input.focus(); viewport.height = 460;
  viewport.dispatchEvent(new dom.window.Event('resize'));
  await waitFor(() => assert.equal(document.documentElement.hasAttribute('data-mobile-keyboard'), true));
  assert.equal(document.documentElement.style.getPropertyValue('--visual-height'), '460px');
  viewport.scale = 2; viewport.dispatchEvent(new dom.window.Event('resize'));
  await waitFor(() => assert.equal(document.documentElement.hasAttribute('data-mobile-keyboard'), false));
  viewport.scale = 1; viewport.height = 800; input.blur();
  viewport.dispatchEvent(new dom.window.Event('resize'));
  await waitFor(() => assert.equal(document.documentElement.style.getPropertyValue('--visual-height'), '800px'));
  assert.equal(document.documentElement.hasAttribute('data-mobile-keyboard'), false);
  cleanup();
  assert.equal(document.documentElement.style.getPropertyValue('--visual-height'), '');
  assert.equal(document.documentElement.hasAttribute('data-mobile-keyboard'), false);
  console.log('PASS mobile transitions preserve fields, cancel on interaction, respect reduced motion/desktop, and distinguish keyboard from zoom');
} finally { cleanup(); await server.close(); dom.window.close(); }
