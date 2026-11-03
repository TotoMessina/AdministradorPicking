// Supabase Edge Function: billing-authorize
// Integración oficial con Web Services de ARCA (ex AFIP): WSAA y WSFE.
// Gestiona autenticación con certificado digital X.509 y clave privada (.key),
// firma de ticket de acceso (CMS/PKCS#7) y solicitud de CAE real para comprobantes fiscales.
//
// Contra duplicados: la base da un solo turno por punto de venta y tipo (retail_billing_begin), el número se anota
// antes de enviarlo (retail_billing_mark_sent) y, si la respuesta de ARCA se pierde, se consulta ese número
// (FECompConsultar) antes de pedir otro. Importes, tipo, CUIT y punto de venta salen de la venta guardada.

import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.117.2';
import forge from 'npm:node-forge@1.3.1';
import { reportFailure, validId } from '../_shared/errorReporting.ts';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

const env = (name: string, fallback = '') => Deno.env.get(name) || fallback;

type Environment = 'homo' | 'prod';
interface Secrets { cert: string; key: string; environment: Environment; token?: string | null; sign?: string | null }
interface Attempt {
  id: string; sale_id: string; pto_vta: number; cbte_tipo: number; cbte_nro: number | null; cbte_fch: string; imp_total: number; imp_neto: number; imp_iva: number;
  doc_tipo: number; doc_nro: number; cond_iva_receptor: number;
  /** Nota de crédito: factura asociada. */
  asoc?: { tipo: number; pto_vta: number; nro: number; cuit?: string; fecha?: string } | null;
}
interface Auth { token: string; sign: string }

// Tiempos máximos: el turno de la base dura 3 minutos y todo el pedido entra con margen.
const WSAA_TIMEOUT = 20_000;
const WSFE_TIMEOUT = 25_000;

/** ARCA no respondió o está caído: no se sabe si recibió el pedido. */
class ArcaUnavailable extends Error {}
/** ARCA contestó que no: el comprobante no existe. `retryable` cuando el motivo es pasajero (por ejemplo, número ya usado). */
class ArcaRejected extends Error {
  constructor(message: string, readonly retryable = false) { super(message); }
}

const urls = (environment: Environment) => environment === 'prod'
  ? { wsaa: 'https://wsaa.afip.gov.ar/ws/services/LoginCms', wsfe: 'https://servicios1.afip.gov.ar/wsfev1/service.asmx' }
  : { wsaa: 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms', wsfe: 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx' };

/** Fecha de hoy en Argentina, YYYYMMDD. */
const ymd = (value: string) => value.slice(0, 10).replace(/-/g, '');
const tag = (xml: string, name: string) => xml.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`, 'i'))?.[1]?.trim();
const errors = (xml: string) => [...xml.matchAll(/<(?:Err|Obs)>\s*<Code>(\d+)<\/Code>\s*<Msg>([\s\S]*?)<\/Msg>/gi)].map(m => ({ code: Number(m[1]), msg: m[2].trim() }));

async function soap(url: string, action: string, body: string, timeout: number) {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml;charset=UTF-8', SOAPAction: action },
      body,
      signal: AbortSignal.timeout(timeout),
    });
  } catch (err) {
    throw new ArcaUnavailable(err instanceof DOMException && err.name === 'TimeoutError' ? 'ARCA no respondió a tiempo' : 'No se pudo conectar con ARCA');
  }
  const text = await response.text().catch(() => '');
  if (response.status >= 500 && !/<soap(env)?:Envelope|<faultstring>/i.test(text)) throw new ArcaUnavailable(`ARCA no está disponible (HTTP ${response.status})`);
  return { ok: response.ok, text };
}

const envelope = (inner: string) => `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>${inner}</soapenv:Body>
</soapenv:Envelope>`;
const authXml = (cuit: string, auth: Auth) => `<ar:Auth><ar:Token>${auth.token}</ar:Token><ar:Sign>${auth.sign}</ar:Sign><ar:Cuit>${cuit}</ar:Cuit></ar:Auth>`;

/**
 * Genera el XML del ticket de requerimiento de acceso (TRA) para ARCA WSAA
 */
function createLoginTicketRequest(): string {
  const uniqueId = Math.floor(Date.now() / 1000);
  const now = new Date();
  const genTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // 10 min antes por desfase horario
  const expTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  return `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;
}

/**
 * Firma el XML con el certificado y clave privada usando PKCS#7 / CMS (SHA-256)
 */
function signLoginTicket(xmlText: string, certPem: string, keyPem: string): string {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(xmlText, 'utf8');

  const cert = forge.pki.certificateFromPem(certPem.trim());
  const key = forge.pki.privateKeyFromPem(keyPem.trim());

  p7.addCertificate(cert);
  p7.addSigner({
    key: key,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      { type: forge.pki.oids.contentType, value: forge.pki.oids.data },
      { type: forge.pki.oids.messageDigest },
      { type: forge.pki.oids.signingTime, value: new Date() },
    ],
  });

  p7.sign({ detached: false });
  const asn1 = p7.toAsn1();
  const der = forge.pkcs7.asn1ToDer(asn1);
  return forge.util.encode64(der.getBytes());
}

/**
 * Token y Sign de WSAA. Se guardan en la base (12 horas): ARCA niega uno nuevo mientras el anterior siga vigente.
 */
async function getWsaaAuth(db: SupabaseClient, storeId: string, secrets: Secrets): Promise<Auth> {
  if (secrets.token && secrets.sign) return { token: secrets.token, sign: secrets.sign };

  const cmsBase64 = signLoginTicket(createLoginTicketRequest(), secrets.cert, secrets.key);
  const { ok, text } = await soap(urls(secrets.environment).wsaa, '""', `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.afip.gov.ar">
  <soapenv:Header/>
  <soapenv:Body><wsaa:loginCms><wsaa:in>${cmsBase64}</wsaa:in></wsaa:loginCms></soapenv:Body>
</soapenv:Envelope>`, WSAA_TIMEOUT);

  // loginCmsReturn trae el XML del ticket escapado.
  const decoded = text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  const token = tag(decoded, 'token');
  const sign = tag(decoded, 'sign');
  if (!ok || !token || !sign) {
    const fault = tag(text, 'faultstring') || `Error HTTP en WSAA`;
    if (/TA valido|TA válido/i.test(fault)) {
      throw new ArcaUnavailable('ARCA ya entregó un permiso que no quedó guardado. Se puede volver a pedir cuando venza (hasta 12 horas)');
    }
    throw new Error(`ARCA no aceptó el certificado: ${fault}`);
  }
  const expiration = tag(decoded, 'expirationTime');
  const expiresAt = expiration ? new Date(expiration).toISOString() : new Date(Date.now() + 11 * 3600 * 1000).toISOString();
  const { error } = await db.rpc('retail_billing_save_token', { p_store: storeId, p_environment: secrets.environment, p_token: token, p_sign: sign, p_expires_at: expiresAt });
  if (error) await reportFailure(new Error('No se guardó el permiso de ARCA'), { funcion: 'billing-authorize', comercio: validId(storeId) });
  secrets.token = token;
  secrets.sign = sign;
  return { token, sign };
}

/**
 * Consulta el último comprobante autorizado en AFIP (WSFE)
 */
async function getUltimoComprobante(cuit: string, auth: Auth, ptoVta: number, cbteTipo: number, wsfeUrl: string): Promise<number> {
  const { text } = await soap(wsfeUrl, 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
    envelope(`<ar:FECompUltimoAutorizado>${authXml(cuit, auth)}<ar:PtoVta>${ptoVta}</ar:PtoVta><ar:CbteTipo>${cbteTipo}</ar:CbteTipo></ar:FECompUltimoAutorizado>`), WSFE_TIMEOUT);
  const nro = tag(text, 'CbteNro');
  if (nro && /^\d+$/.test(nro)) return Number(nro);
  const problem = errors(text)[0];
  if (problem) throw new Error(`ARCA: ${problem.msg}`);
  throw new ArcaUnavailable('ARCA respondió sin el último número');
}

/**
 * Busca en ARCA un comprobante por número (FECompConsultar). Null si no existe.
 */
async function consultarComprobante(cuit: string, auth: Auth, attempt: Attempt, wsfeUrl: string) {
  const { text } = await soap(wsfeUrl, 'http://ar.gov.afip.dif.FEV1/FECompConsultar',
    envelope(`<ar:FECompConsultar>${authXml(cuit, auth)}<ar:FeCompConsReq><ar:CbteTipo>${attempt.cbte_tipo}</ar:CbteTipo><ar:CbteNro>${attempt.cbte_nro}</ar:CbteNro><ar:PtoVta>${attempt.pto_vta}</ar:PtoVta></ar:FeCompConsReq></ar:FECompConsultar>`), WSFE_TIMEOUT);
  const cae = tag(text, 'CodAutorizacion');
  if (cae && tag(text, 'Resultado') === 'A') {
    return { cae, vto: tag(text, 'FchVto') || '', total: Number(tag(text, 'ImpTotal') || 0), fecha: tag(text, 'CbteFch') || '' };
  }
  // 602: no existe el comprobante.
  if (errors(text).some(e => e.code === 602)) return null;
  throw new ArcaUnavailable('ARCA no confirmó si el comprobante existe');
}

/**
 * Solicita el CAE a ARCA (WSFE FECAESolicitar) con los importes guardados en el turno.
 */
async function solicitarCae(cuit: string, auth: Auth, attempt: Attempt, wsfeUrl: string): Promise<{ cae: string; caeVto: string }> {
  // Facturas y notas de crédito A y B informan el IVA al 21%. Las C no lo discriminan.
  const ivaXml = [1, 3, 6, 8].includes(attempt.cbte_tipo) && attempt.imp_iva > 0
    ? `<ar:Iva><ar:AlicIva><ar:Id>5</ar:Id><ar:BaseImp>${Number(attempt.imp_neto).toFixed(2)}</ar:BaseImp><ar:Importe>${Number(attempt.imp_iva).toFixed(2)}</ar:Importe></ar:AlicIva></ar:Iva>`
    : '';
  const asoc = attempt.asoc;
  const asocXml = asoc
    ? `<ar:CbtesAsoc><ar:CbteAsoc><ar:Tipo>${asoc.tipo}</ar:Tipo><ar:PtoVta>${asoc.pto_vta}</ar:PtoVta><ar:Nro>${asoc.nro}</ar:Nro>${asoc.cuit ? `<ar:Cuit>${asoc.cuit}</ar:Cuit>` : ''}${asoc.fecha ? `<ar:CbteFch>${ymd(asoc.fecha)}</ar:CbteFch>` : ''}</ar:CbteAsoc></ar:CbtesAsoc>`
    : '';

  const { text } = await soap(wsfeUrl, 'http://ar.gov.afip.dif.FEV1/FECAESolicitar', envelope(`<ar:FECAESolicitar>
      ${authXml(cuit, auth)}
      <ar:FeCAEReq>
        <ar:FeCabReq><ar:CantReg>1</ar:CantReg><ar:PtoVta>${attempt.pto_vta}</ar:PtoVta><ar:CbteTipo>${attempt.cbte_tipo}</ar:CbteTipo></ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>1</ar:Concepto>
            <ar:DocTipo>${attempt.doc_tipo}</ar:DocTipo>
            <ar:DocNro>${attempt.doc_nro}</ar:DocNro>
            <ar:CbteDesde>${attempt.cbte_nro}</ar:CbteDesde>
            <ar:CbteHasta>${attempt.cbte_nro}</ar:CbteHasta>
            <ar:CbteFch>${ymd(attempt.cbte_fch)}</ar:CbteFch>
            <ar:ImpTotal>${Number(attempt.imp_total).toFixed(2)}</ar:ImpTotal>
            <ar:ImpTotConc>0.00</ar:ImpTotConc>
            <ar:ImpNeto>${Number(attempt.imp_neto).toFixed(2)}</ar:ImpNeto>
            <ar:ImpOpEx>0.00</ar:ImpOpEx>
            <ar:ImpTrib>0.00</ar:ImpTrib>
            <ar:ImpIVA>${Number(attempt.imp_iva).toFixed(2)}</ar:ImpIVA>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            <ar:CondicionIVAReceptorId>${attempt.cond_iva_receptor}</ar:CondicionIVAReceptorId>
            ${asocXml}
            ${ivaXml}
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>`), WSFE_TIMEOUT);

  const resultado = tag(text, 'Resultado');
  const cae = tag(text, 'CAE');
  const vto = tag(text, 'CAEFchVto');
  if (resultado === 'A' && cae && vto) return { cae, caeVto: `${vto.slice(0, 4)}-${vto.slice(4, 6)}-${vto.slice(6, 8)}` };

  const problems = errors(text);
  if (resultado === 'R' || problems.length) {
    // 10016: el número ya no es el próximo (otro sistema emitió en este punto de venta). 501/502: error interno de ARCA.
    const retryable = resultado !== 'R' && problems.every(p => [10016, 501, 502].includes(p.code));
    throw new ArcaRejected(problems.length ? problems.map(p => p.msg).join(' · ') : 'ARCA rechazó el comprobante sin detalle', retryable);
  }
  throw new ArcaUnavailable('ARCA respondió sin resultado');
}

const message = (err: unknown) => err instanceof Error ? err.message : 'Error al facturar';

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405);
  }

  const place: { comercio?: string; sucursal?: string } = {};
  try {
    const supabaseUrl = env('SUPABASE_URL');
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');
    const anonKey = env('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !serviceRoleKey || !anonKey) {
      return json({ error: 'Configuración incompleta de Supabase en backend' }, 500);
    }

    const db = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // 1. Validar autenticación del usuario
    const token = request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '');
    if (!token) {
      return json({ error: 'Autenticación requerida' }, 401);
    }

    const {
      data: { user },
      error: userError,
    } = await db.auth.getUser(token);

    if (userError || !user) {
      return json({ error: 'Sesión inválida o expirada' }, 401);
    }
    // Con la sesión de la persona: la base revisa sus permisos.
    const userDb = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });

    // 2. Parsear cuerpo de la solicitud. Solo se usan identificadores: el resto sale de la base.
    const body = await request.json().catch(() => null);
    const storeId = validId(body?.storeId);
    if (!storeId) {
      return json({ error: 'Parámetro storeId obligatorio' }, 400);
    }
    const { saleId, returnId, action } = body;
    place.comercio = storeId;
    place.sucursal = validId(body.branchId);

    let secrets: Secrets | null = null;
    const loadSecrets = async () => {
      if (secrets) return secrets;
      const { data, error } = await db.rpc('retail_billing_secrets', { p_store: storeId });
      if (error) throw new Error('No se pudo leer el certificado de ARCA');
      if (!data?.cert || !data?.key) throw new Error('Falta cargar el certificado y la clave de ARCA en Mi comercio');
      secrets = data as Secrets;
      return secrets;
    };

    // ACCIÓN: Prueba de conexión / diagnóstico (solo dueño o administrador)
    if (action === 'test_connection') {
      const { data: status, error: statusError } = await userDb.rpc('retail_get_billing_credentials_status', { p_store: storeId });
      if (statusError || status?.error) return json({ success: false, error: 'Solo el dueño o un administrador puede probar la conexión' }, 403);
      if (!status?.configured) {
        return json({ success: false, error: 'Falta configurar el certificado digital (.crt) y la clave privada (.key) para este comercio.' });
      }
      const { data: store } = await db.from('retail_stores').select('cuit, punto_venta_afip, condicion_iva').eq('id', storeId).single();
      const cuit = String(store?.cuit || '').replace(/\D/g, '');
      const ptoVta = Number(store?.punto_venta_afip || 1);
      const s = await loadSecrets();
      const auth = await getWsaaAuth(db, storeId, s);
      const lastNro = await getUltimoComprobante(cuit, auth, ptoVta, store?.condicion_iva === 'RI' ? 6 : 11, urls(s.environment).wsfe);

      return json({
        success: true,
        message: 'Conexión con ARCA exitosa',
        environment: s.environment === 'prod' ? 'Producción (Oficial)' : 'Homologación (Testing)',
        puntoVenta: ptoVta,
        ultimoComprobante: lastNro,
      });
    }

    // ACCIÓN: factura de una venta o nota de crédito de una devolución
    const creditNote = action === 'credit_note';
    if (creditNote ? !validId(returnId) : !validId(saleId)) {
      return json({ error: creditNote ? 'Parámetro returnId obligatorio para la nota de crédito' : 'Parámetro saleId obligatorio para emitir comprobante' }, 400);
    }
    const begin = () => creditNote
      ? userDb.rpc('retail_billing_begin_credit', { p_store: storeId, p_return: returnId })
      : userDb.rpc('retail_billing_begin', { p_store: storeId, p_sale: saleId });

    const finish = async (attempt: Attempt, result: string, extra: { cae?: string; vto?: string; error?: string } = {}) => {
      const { data, error } = await db.rpc('retail_billing_finish', {
        p_attempt: attempt.id, p_result: result, p_cae: extra.cae ?? null, p_cae_vto: extra.vto ?? null, p_error: extra.error ?? null,
      });
      if (error) {
        // Si ARCA autorizó y no se pudo guardar, el turno sigue "enviado" y el próximo pedido lo recupera consultando ARCA.
        await reportFailure(new Error(`No se guardó el resultado de ARCA (${result})`), { funcion: 'billing-authorize', ...place });
        return { state: 'retry', error: 'ARCA respondió pero no se pudo guardar. Se recupera en el próximo intento' };
      }
      return data as { state: string; error?: string; cae?: string; cae_vto?: string; cbte_nro?: number; cbte_tipo?: number };
    };

    // Respuesta perdida de un pedido anterior: se consulta ese número en ARCA antes de pedir uno nuevo.
    const recover = async (attempt: Attempt, cuit: string) => {
      const s = await loadSecrets();
      const found = await consultarComprobante(cuit, await getWsaaAuth(db, storeId, s), attempt, urls(s.environment).wsfe);
      if (!found) return finish(attempt, 'not_issued', { error: 'ARCA no la había registrado. Se pide de nuevo' });
      const same = Math.abs(found.total - Number(attempt.imp_total)) < 0.01 && found.fecha === ymd(attempt.cbte_fch);
      if (!same) {
        await reportFailure(new Error('Número de comprobante usado por otro comprobante en ARCA'), { funcion: 'billing-authorize', ...place });
        return finish(attempt, 'conflict', { error: `El número ${attempt.cbte_nro} ya figura en ARCA con otro importe o fecha. Revisalo con tu contador antes de reintentar` });
      }
      return finish(attempt, 'authorized', { cae: found.cae, vto: `${found.vto.slice(0, 4)}-${found.vto.slice(4, 6)}-${found.vto.slice(6, 8)}` });
    };

    const issue = async (attempt: Attempt, cuit: string) => {
      let s: Secrets;
      let auth: Auth;
      let last: number;
      try {
        s = await loadSecrets();
        auth = await getWsaaAuth(db, storeId, s);
        last = await getUltimoComprobante(cuit, auth, attempt.pto_vta, attempt.cbte_tipo, urls(s.environment).wsfe);
      } catch (err) {
        // Todavía no salió nada a ARCA: se puede reintentar sin riesgo.
        return finish(attempt, err instanceof ArcaUnavailable ? 'cancelled' : 'rejected', { error: message(err) });
      }
      const number = last + 1;
      const { error: sentError } = await db.rpc('retail_billing_mark_sent', { p_attempt: attempt.id, p_cbte_nro: number });
      if (sentError) return finish(attempt, 'cancelled', { error: 'No se pudo reservar el número. Se reintenta' });
      attempt.cbte_nro = number;
      try {
        const { cae, caeVto } = await solicitarCae(cuit, auth, attempt, urls(s.environment).wsfe);
        return finish(attempt, 'authorized', { cae, vto: caeVto });
      } catch (err) {
        if (err instanceof ArcaRejected) return finish(attempt, err.retryable ? 'not_issued' : 'rejected', { error: `Rechazo ARCA: ${err.message}` });
        // Sin respuesta: puede haber quedado autorizada. No se pide otro número hasta consultarlo.
        return finish(attempt, 'unknown', { error: message(err) });
      }
    };

    for (let round = 0; round < 3; round++) {
      const { data: plan, error: planError } = await begin();
      if (planError) return json({ success: false, state: 'error', error: planError.message });
      if (plan.state === 'recover') {
        try {
          await recover(plan.attempt as Attempt, plan.cuit);
        } catch (err) {
          return json({ success: false, state: 'retry', error: `${message(err)}. Se reintenta más tarde` });
        }
        continue;
      }
      const result = plan.state === 'issue' ? await issue(plan.attempt as Attempt, plan.cuit) : plan;
      if (result.state === 'authorized') {
        return json({ success: true, state: 'authorized', cae: result.cae, cae_vto: result.cae_vto, cbte_nro: result.cbte_nro, cbte_tipo: result.cbte_tipo, environment: secrets?.environment });
      }
      if (result.state === 'busy') return json({ success: false, state: 'retry', error: 'Otra caja está facturando en este punto de venta. Se reintenta en un momento' });
      return json({ success: false, state: result.state === 'conflict' ? 'error' : result.state, error: result.error || null });
    }
    return json({ success: false, state: 'retry', error: 'Quedaban pedidos anteriores por revisar. Se reintenta en un momento' });
  } catch (err: unknown) {
    console.error('Error en billing-authorize:', err);
    await reportFailure(err, { funcion: 'billing-authorize', ...place });
    return json({
      success: false,
      state: 'retry',
      error: message(err) || 'Error interno al procesar facturación con ARCA',
    }, 500);
  }
});
