// Supabase Edge Function: billing-authorize
// Integración oficial con Web Services de ARCA (ex AFIP): WSAA y WSFE.
// Gestiona autenticación con certificado digital X.509 y clave privada (.key),
// firma de ticket de acceso (CMS/PKCS#7) y solicitud de CAE real para comprobantes fiscales.

import { createClient } from 'npm:@supabase/supabase-js@2.117.2';
import forge from 'npm:node-forge@1.3.1';

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

// Cache en memoria para Token y Sign de WSAA (validez 12 horas por CUIT y entorno)
interface WsaaTokenCache {
  token: string;
  sign: string;
  expiration: number;
}
const wsaaCache = new Map<string, WsaaTokenCache>();

/**
 * Genera el XML del ticket de requerimiento de acceso (TRA) para ARCA WSAA
 */
function createLoginTicketRequest(): { xml: string; uniqueId: number } {
  const uniqueId = Math.floor(Date.now() / 1000);
  const now = new Date();
  const genTime = new Date(now.getTime() - 10 * 60 * 1000).toISOString(); // 10 min antes por desfase horario
  const expTime = new Date(now.getTime() + 10 * 60 * 1000).toISOString();

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<loginTicketRequest version="1.0">
  <header>
    <uniqueId>${uniqueId}</uniqueId>
    <generationTime>${genTime}</generationTime>
    <expirationTime>${expTime}</expirationTime>
  </header>
  <service>wsfe</service>
</loginTicketRequest>`;

  return { xml, uniqueId };
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
 * Solicita o reutiliza Token y Sign ante el Web Service de Autenticación (WSAA)
 */
async function getWsaaAuth(
  cuit: string,
  certPem: string,
  keyPem: string,
  environment: 'homo' | 'prod',
): Promise<{ token: string; sign: string }> {
  const cacheKey = `${cuit}_${environment}`;
  const cached = wsaaCache.get(cacheKey);

  // Reutilizar si aún le queda al menos 10 minutos de validez
  if (cached && cached.expiration > Date.now() + 10 * 60 * 1000) {
    return { token: cached.token, sign: cached.sign };
  }

  const { xml } = createLoginTicketRequest();
  const cmsBase64 = signLoginTicket(xml, certPem, keyPem);

  const wsaaUrl = environment === 'prod'
    ? 'https://wsaa.afip.gov.ar/ws/services/LoginCms'
    : 'https://wsaahomo.afip.gov.ar/ws/services/LoginCms';

  const soapEnvelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:wsaa="http://wsaa.view.afip.gov.ar">
  <soapenv:Header/>
  <soapenv:Body>
    <wsaa:loginCms>
      <wsaa:in>${cmsBase64}</wsaa:in>
    </wsaa:loginCms>
  </soapenv:Body>
</soapenv:Envelope>`;

  const response = await fetch(wsaaUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction': '""',
    },
    body: soapEnvelope,
  });

  const responseText = await response.text();

  if (!response.ok) {
    const faultMatch = responseText.match(/<faultstring>(.*?)<\/faultstring>/i);
    const faultMsg = faultMatch ? faultMatch[1] : `Error HTTP ${response.status} en WSAA`;
    throw new Error(`Error de autenticación WSAA ARCA: ${faultMsg}`);
  }

  // Parsear XML retornado por WSAA
  const tokenMatch = responseText.match(/<token>(.*?)<\/token>/i);
  const signMatch = responseText.match(/<sign>(.*?)<\/sign>/i);
  const expMatch = responseText.match(/<expirationTime>(.*?)<\/expirationTime>/i);

  if (!tokenMatch || !signMatch) {
    throw new Error('Respuesta de WSAA ARCA no contenía credenciales válidas (token/sign)');
  }

  const token = tokenMatch[1];
  const sign = signMatch[1];
  const expiration = expMatch ? new Date(expMatch[1]).getTime() : Date.now() + 11 * 3600 * 1000;

  wsaaCache.set(cacheKey, { token, sign, expiration });
  return { token, sign };
}

/**
 * Consulta el último comprobante autorizado en AFIP (WSFE)
 */
async function getUltimoComprobante(
  cuit: string,
  token: string,
  sign: string,
  ptoVta: number,
  cbteTipo: number,
  wsfeUrl: string,
): Promise<number> {
  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECompUltimoAutorizado>
      <ar:Auth>
        <ar:Token>${token}</ar:Token>
        <ar:Sign>${sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:PtoVta>${ptoVta}</ar:PtoVta>
      <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
    </ar:FECompUltimoAutorizado>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(wsfeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECompUltimoAutorizado',
    },
    body: envelope,
  });

  const text = await res.text();
  const nroMatch = text.match(/<CbteNro>(\d+)<\/CbteNro>/i);
  if (nroMatch) {
    return parseInt(nroMatch[1], 10);
  }

  const errMatch = text.match(/<Msg>(.*?)<\/Msg>/i);
  if (errMatch) {
    throw new Error(`AFIP WSFE Consulta: ${errMatch[1]}`);
  }

  return 0;
}

/**
 * Solicita el CAE a ARCA (WSFE FECAESolicitar)
 */
async function solicitarCaeAfip(
  cuit: string,
  token: string,
  sign: string,
  ptoVta: number,
  cbteTipo: number,
  cbteNro: number,
  total: number,
  neto: number,
  iva: number,
  wsfeUrl: string,
): Promise<{ cae: string; caeVto: string }> {
  const now = new Date();
  const cbteFch = now.toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD

  // Generar sección IVA para Factura B (tipo 6)
  let ivaXml = '';
  if (cbteTipo === 6 && iva > 0) {
    ivaXml = `
      <ar:Iva>
        <ar:AlicIva>
          <ar:Id>5</ar:Id>
          <ar:BaseImp>${neto.toFixed(2)}</ar:BaseImp>
          <ar:Importe>${iva.toFixed(2)}</ar:Importe>
        </ar:AlicIva>
      </ar:Iva>`;
  }

  const envelope = `<?xml version="1.0" encoding="UTF-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:ar="http://ar.gov.afip.dif.FEV1/">
  <soapenv:Header/>
  <soapenv:Body>
    <ar:FECAESolicitar>
      <ar:Auth>
        <ar:Token>${token}</ar:Token>
        <ar:Sign>${sign}</ar:Sign>
        <ar:Cuit>${cuit}</ar:Cuit>
      </ar:Auth>
      <ar:FeCAEReq>
        <ar:FeCabReq>
          <ar:CantReg>1</ar:CantReg>
          <ar:PtoVta>${ptoVta}</ar:PtoVta>
          <ar:CbteTipo>${cbteTipo}</ar:CbteTipo>
        </ar:FeCabReq>
        <ar:FeDetReq>
          <ar:FECAEDetRequest>
            <ar:Concepto>1</ar:Concepto>
            <ar:DocTipo>99</ar:DocTipo>
            <ar:DocNro>0</ar:DocNro>
            <ar:CbteDesde>${cbteNro}</ar:CbteDesde>
            <ar:CbteHasta>${cbteNro}</ar:CbteHasta>
            <ar:CbteFch>${cbteFch}</ar:CbteFch>
            <ar:ImpTotal>${total.toFixed(2)}</ar:ImpTotal>
            <ar:ImpTotConc>0.00</ar:ImpTotConc>
            <ar:ImpNeto>${neto.toFixed(2)}</ar:ImpNeto>
            <ar:ImpOpEx>0.00</ar:ImpOpEx>
            <ar:ImpTrib>0.00</ar:ImpTrib>
            <ar:ImpIVA>${iva.toFixed(2)}</ar:ImpIVA>
            <ar:MonId>PES</ar:MonId>
            <ar:MonCotiz>1</ar:MonCotiz>
            ${ivaXml}
          </ar:FECAEDetRequest>
        </ar:FeDetReq>
      </ar:FeCAEReq>
    </ar:FECAESolicitar>
  </soapenv:Body>
</soapenv:Envelope>`;

  const res = await fetch(wsfeUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'text/xml;charset=UTF-8',
      'SOAPAction': 'http://ar.gov.afip.dif.FEV1/FECAESolicitar',
    },
    body: envelope,
  });

  const responseText = await res.text();

  // Verificar resultado
  const resultadoMatch = responseText.match(/<Resultado>(.*?)<\/Resultado>/i);
  const resultado = resultadoMatch ? resultadoMatch[1] : null;

  if (resultado === 'A') {
    const caeMatch = responseText.match(/<CAE>(.*?)<\/CAE>/i);
    const vtoMatch = responseText.match(/<CAEFchVto>(.*?)<\/CAEFchVto>/i);

    if (caeMatch && vtoMatch) {
      const vtoRaw = vtoMatch[1]; // YYYYMMDD
      const caeVto = `${vtoRaw.slice(0, 4)}-${vtoRaw.slice(4, 6)}-${vtoRaw.slice(6, 8)}`;
      return { cae: caeMatch[1], caeVto };
    }
  }

  // Si fue rechazado o hubo errores, extraer detalle de AFIP
  const errMsgs: string[] = [];
  const errRegex = /<Msg>(.*?)<\/Msg>/gi;
  let match;
  while ((match = errRegex.exec(responseText)) !== null) {
    errMsgs.push(match[1]);
  }

  const errorDesc = errMsgs.length > 0
    ? errMsgs.join(' · ')
    : 'ARCA rechazó el comprobante sin mensaje específico';

  throw new Error(`Rechazo ARCA: ${errorDesc}`);
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { headers: cors });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Método no permitido' }, 405);
  }

  try {
    const supabaseUrl = env('SUPABASE_URL');
    const serviceRoleKey = env('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
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

    // 2. Parsear cuerpo de la solicitud
    const body = await request.json().catch(() => null);
    if (!body || !body.storeId) {
      return json({ error: 'Parámetro storeId obligatorio' }, 400);
    }

    const { storeId, saleId, cbteTipo, puntoVenta, total, cuit, action } = body;

    // 3. Validar permisos en el comercio
    const { data: member, error: memberError } = await db
      .from('retail_members')
      .select('role')
      .eq('store_id', storeId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (memberError || !member) {
      return json({ error: 'No tenés permisos en este comercio' }, 403);
    }

    // 4. Obtener datos fiscales del comercio
    const { data: store, error: storeError } = await db
      .from('retail_stores')
      .select('cuit, punto_venta_afip, billing_enabled, condicion_iva, razon_social')
      .eq('id', storeId)
      .single();

    if (storeError || !store) {
      return json({ error: 'Comercio no encontrado' }, 404);
    }

    // 5. Obtener credenciales privadas de ARCA (tabla retail_private o variables de entorno)
    const { data: storeCreds } = await db
      .from('store_billing_credentials')
      .select('arca_cert, arca_key, arca_environment')
      .eq('store_id', storeId)
      .maybeSingle();

    const certPem = storeCreds?.arca_cert || env('ARCA_CERT');
    const keyPem = storeCreds?.arca_key || env('ARCA_KEY');
    const environment: 'homo' | 'prod' = storeCreds?.arca_environment === 'prod' || env('ARCA_ENVIRONMENT') === 'prod'
      ? 'prod'
      : 'homo';

    const cleanCuit = String(cuit || store.cuit || '').replace(/\D/g, '');
    const ptoVta = Number(puntoVenta || store.punto_venta_afip || 1);
    const cbteTipoNum = Number(cbteTipo || (store.condicion_iva === 'RI' ? 6 : 11));
    const wsfeUrl = environment === 'prod'
      ? 'https://servicios1.afip.gov.ar/wsfev1/service.asmx'
      : 'https://wswhomo.afip.gov.ar/wsfev1/service.asmx';

    // ACCIÓN: Generación de par de claves RSA (2048 bits) y Pedido de Certificado (CSR) para AFIP
    if (action === 'generate_csr') {
      if (!cleanCuit || cleanCuit.length < 11) {
        return json({ error: 'Se requiere un CUIT válido de 11 dígitos para generar el pedido de certificado' }, 400);
      }
      const alias = String(body.alias || 'kiosco_pos');
      const storeOrg = String(body.razonSocial || store.razon_social || 'Comercio').slice(0, 64);

      // Generar par de claves RSA de 2048 bits
      const keys = forge.pki.rsa.generateKeyPair(2048);

      // Crear pedido de certificación PKCS#10 (CSR) para AFIP
      const csr = forge.pki.createCertificationRequest();
      csr.publicKey = keys.publicKey;
      csr.setSubject([
        { name: 'commonName', value: alias },
        { name: 'countryName', value: 'AR' },
        { name: 'organizationName', value: storeOrg },
        { type: '2.5.4.5', value: `CUIT ${cleanCuit}` }, // OID 2.5.4.5 = serialNumber
      ]);
      csr.sign(keys.privateKey, forge.md.sha256.create());

      const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);
      const csrPem = forge.pki.certificationRequestToPem(csr);

      return json({
        success: true,
        privateKey: privateKeyPem,
        csr: csrPem,
      });
    }

    // ACCIÓN: Prueba de conexión / diagnóstico
    if (action === 'test_connection') {
      if (!certPem || !keyPem) {
        return json({
          success: false,
          error: 'Falta configurar el certificado digital (.crt) y la clave privada (.key) para este comercio.',
        }, 400);
      }

      const { token: wToken, sign: wSign } = await getWsaaAuth(cleanCuit, certPem, keyPem, environment);
      const lastNro = await getUltimoComprobante(cleanCuit, wToken, wSign, ptoVta, cbteTipoNum, wsfeUrl);

      return json({
        success: true,
        message: 'Conexión con ARCA exitosa',
        environment: environment === 'prod' ? 'Producción (Oficial)' : 'Homologación (Testing)',
        puntoVenta: ptoVta,
        ultimoComprobante: lastNro,
      });
    }

    // ACCIÓN: Autorización de venta
    if (!saleId) {
      return json({ error: 'Parámetro saleId obligatorio para emitir comprobante' }, 400);
    }

    if (!store.billing_enabled) {
      return json({ error: 'La facturación electrónica está desactivada en este comercio' }, 400);
    }

    // Si NO hay certificados configurados, informar claramente al cliente
    if (!certPem || !keyPem) {
      return json({
        success: false,
        error: 'Certificado digital de AFIP no configurado. Cargá tu certificado y clave en Mi Comercio -> Facturación Electrónica ARCA para emitir en ARCA.',
      }, 400);
    }

    // --- EMISIÓN REAL EN ARCA ---
    // A) Autenticar en WSAA
    const { token: wsaaToken, sign: wsaaSign } = await getWsaaAuth(cleanCuit, certPem, keyPem, environment);

    // B) Consultar correlativo oficial en AFIP
    const lastOfficialNro = await getUltimoComprobante(cleanCuit, wsaaToken, wsaaSign, ptoVta, cbteTipoNum, wsfeUrl);
    const nextCbteNro = lastOfficialNro + 1;

    // C) Desglosar importes
    const impTotal = Number(total || 0);
    let impNeto = impTotal;
    let impIVA = 0;
    if (cbteTipoNum === 6) {
      impNeto = Math.round((impTotal / 1.21) * 100) / 100;
      impIVA = Math.round((impTotal - impNeto) * 100) / 100;
    }

    // D) Solicitar CAE a AFIP
    const { cae, caeVto } = await solicitarCaeAfip(
      cleanCuit,
      wsaaToken,
      wsaaSign,
      ptoVta,
      cbteTipoNum,
      nextCbteNro,
      impTotal,
      impNeto,
      impIVA,
      wsfeUrl,
    );

    // E) Persistir en base de datos
    const { error: updateError } = await db.rpc('retail_update_sale_billing', {
      p_store: storeId,
      p_sale: saleId,
      p_status: 'authorized',
      p_cbte_tipo: cbteTipoNum,
      p_cbte_nro: nextCbteNro,
      p_cae: cae,
      p_cae_vto: caeVto,
      p_error: null,
    });

    if (updateError) {
      console.warn('Error al persistir venta autorizada:', updateError);
    }

    return json({
      success: true,
      cae,
      cae_vto: caeVto,
      cbte_nro: nextCbteNro,
      cbte_tipo: cbteTipoNum,
      environment,
      simulated: false,
    });
  } catch (err: any) {
    console.error('Error en billing-authorize:', err);
    return json({
      success: false,
      error: err?.message || 'Error interno al procesar facturación con ARCA',
    }, 500);
  }
});
