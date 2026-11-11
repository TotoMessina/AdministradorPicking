import { supabase } from '../../../lib/supabase';
import type { BillingStatus, CondicionIva } from '../billing';
import { result } from './request';

/** Facturación electrónica: configuración, credenciales y estado de cada venta. */
export const billingApi = {
  async saveBillingSettings(
    store: string,
    settings: {
      cuit: string;
      razon_social: string;
      condicion_iva: CondicionIva;
      punto_venta_afip: number;
      iibb?: string | null;
      inicio_actividades?: string | null;
      billing_enabled: boolean;
    },
  ) {
    return result(
      supabase.rpc('retail_set_billing_settings', {
        p_store: store,
        p_cuit: settings.cuit,
        p_razon_social: settings.razon_social,
        p_condicion_iva: settings.condicion_iva,
        p_punto_venta_afip: settings.punto_venta_afip,
        p_iibb: settings.iibb || null,
        p_inicio_actividades: settings.inicio_actividades || null,
        p_billing_enabled: settings.billing_enabled,
      }),
    );
  },
  async updateSaleBilling(
    store: string,
    saleId: string,
    status: BillingStatus,
    details?: {
      cbte_tipo?: number;
      cbte_nro?: number;
      cae?: string;
      cae_vto?: string;
      error?: string;
    },
  ) {
    const params: Record<string, unknown> = {
      p_store: store,
      p_sale: saleId,
      p_status: status,
    };
    if (details?.cbte_tipo != null) params.p_cbte_tipo = details.cbte_tipo;
    if (details?.cbte_nro != null) params.p_cbte_nro = details.cbte_nro;
    if (details?.cae != null) params.p_cae = details.cae;
    if (details?.cae_vto != null) params.p_cae_vto = details.cae_vto;
    if (details?.error != null) params.p_error = details.error;

    return result(supabase.rpc('retail_update_sale_billing', params));
  },
  async setBillingCredentials(
    store: string,
    cert: string,
    key: string,
    environment: 'homo' | 'prod' = 'homo',
  ) {
    return result(
      supabase.rpc('retail_set_billing_credentials', {
        p_store: store,
        p_cert: cert,
        p_key: key,
        p_environment: environment,
      }),
    );
  },
  async getBillingCredentialsStatus(
    store: string,
  ): Promise<{ configured: boolean; environment?: 'homo' | 'prod'; updated_at?: string | null }> {
    return result(
      supabase.rpc('retail_get_billing_credentials_status', {
        p_store: store,
      }),
    );
  },
  async testBillingConnection(
    store: string,
  ): Promise<{ success: boolean; message?: string; environment?: string; puntoVenta?: number; ultimoComprobante?: number; error?: string }> {
    const { data, error } = await supabase.functions.invoke('billing-authorize', {
      body: {
        storeId: store,
        action: 'test_connection',
      },
    });
    if (error) {
      throw new Error(error.message || 'Error al conectar con el servicio de comprobación de ARCA');
    }
    return data;
  },
  /** El par de claves y el pedido se generan en el navegador: el servidor nunca ve ni devuelve la clave. */
  async generateBillingCsr(
    _store: string,
    cuit: string,
    razonSocial: string,
    alias = 'kiosco_pos',
  ): Promise<{ success: boolean; privateKey: string; csr: string; error?: string }> {
    const { generateArcaCsr } = await import('../arcaCsr');
    return { success: true, ...(await generateArcaCsr(cuit, razonSocial, alias)) };
  },
};
