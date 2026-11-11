import { technicalMessage } from '../../../lib/errorReporting';

function plainError(message?: string) {
  if (!message) return message;
  if (/failed to fetch|networkerror|load failed|err_connection|timeout/i.test(message)) return 'No hay conexión. Revisá internet y probá de nuevo.';
  if (technicalMessage.test(message)) {
    console.error(message);
    return 'Algo salió mal y no se guardó. Probá de nuevo en un momento; si sigue pasando, avisale al administrador.';
  }
  return message;
}

export function errorMessage(error: unknown): string {
  const e = error as { code?: string; message?: string };
  if (['PGRST202', 'PGRST204', '42703', '42P01'].includes(e?.code || '') && /retail_set_billing_settings|retail_update_sale_billing|billing_enabled|cuit|razon_social/.test(e.message || ''))
    return 'Falta actualizar la configuración fiscal en la base. Aplicá schema.sql con la migración 202610260003_billing_fields.sql y reintentá. El borrador se conserva.';
  if (e?.code === 'PGRST202' && /retail_create_composite_product/.test(e.message || ''))
    return 'Falta actualizar la creación de combos. Aplicá schema.sql con 202610260002_create_composite_product.sql y reintentá. El borrador se conserva.';
  if (['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01'].includes(e?.code || '') && /retail_(?:set_depot|depot_)|depot_enabled/.test(e.message || ''))
    return 'Falta habilitar el depósito en la base. Aplicá schema.sql con 202610260001_optional_depot.sql, actualizá los datos y reintentá. El borrador se conserva.';
  if (['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /p_denominations|closing_denominations|ticket_count|retail_shift_ticket_count/.test(e.message || ''))
    return 'Falta actualizar el cierre de turnos. Aplicá schema.sql con la migración 202610240001_shift_closing_details.sql y actualizá los datos. El detalle pendiente se conserva.';
  if (['PGRST204', '42703'].includes(e?.code || '') && /sellable/.test(e.message || ''))
    return 'Falta habilitar insumos y costos de combos en Supabase. Aplicá 202610230002_ingredients_and_composition_costs.sql después de las migraciones anteriores, actualizá el catálogo y reintentá. El borrador se conserva.';
  if (['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /retail_set_margin_threshold|low_margin_threshold/.test(e.message || ''))
    return 'Falta habilitar el margen automático. Aplicá 202610230001_automatic_margin_groups.sql después de las migraciones anteriores y actualizá los datos.';
  if ((['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /retail_save_permission_profile|retail_management_locations|retail_write_branch|retail_write_register|revision/.test(e.message || '')) || (e?.code === '23514' && e.message?.includes('retail_permission_profiles_permissions_check')))
    return 'Falta ampliar los perfiles en Supabase. Aplicá 202610220006_complete_permission_profiles.sql después de las migraciones anteriores y actualizá los datos.';
  if ((e?.code === '23514' && e.message?.includes('retail_permission_profiles_permissions_check'))
    || (e?.code === 'PGRST202' && e.message?.includes('retail_update_product_price')))
    return 'Falta habilitar las acciones delegadas de productos. Aplicá la migración 202610210004_delegated_catalog_actions.sql y actualizá los permisos antes de reintentar.';
  if ((['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01'].includes(e?.code || '')
    && /retail_(?:permissions|permission_profiles|set_staff_profile)|profile_id/.test(e.message || ''))
    || (e?.code === '23514' && /retail_(?:members|invitations)_role_check/.test(e.message || '')))
    return 'Falta actualizar roles y perfiles en Supabase. Aplicá la migración 202610210002_staff_profiles.sql y actualizá los datos antes de reintentar.';
  if (['PGRST202', 'PGRST204', 'PGRST205', '42703', '42P01'].includes(e?.code || '')
    && /retail_(?:save_ledger_routing|prepare_sales_ledgers|move_sale_ledger|sale_ledger_changes)|payment_methods/.test(e.message || ''))
    return 'Falta actualizar los registros de ventas en Supabase. Aplicá la migración 202610210001_ledger_routing.sql, actualizá los datos y reintentá. Este cambio no se guardó.';
  if (['PGRST202', 'PGRST204', '42P01', '42703'].includes(e?.code || '') && /retail_enable_loose_cigarettes|retail_loose_unit_conversions/.test(e.message || ''))
    return 'Falta habilitar la conversión de atados en Supabase. Aplicá 202610220002_loose_cigarettes.sql después de la migración de composiciones y reintentá. No se convirtió el stock.';
  if (['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /stock_components|retail_save_product_composition/.test(e.message || ''))
    return 'Falta habilitar combos y sueltos en Supabase. Aplicá la migración 202610220001_product_compositions.sql, actualizá el catálogo y reintentá.';
  if (['PGRST202', 'PGRST205', '42P01'].includes(e?.code || '') && /retail_set_product_active|retail_product_deletions/.test(e.message || ''))
    return 'Falta habilitar el historial de productos en Supabase. Aplicá la migración 202610220003_product_deletion_history.sql y reintentá.';
  if (['PGRST202', 'PGRST204', '42703'].includes(e?.code || '') && /display_name|retail_rename_category/.test(e.message || ''))
    return 'Falta habilitar los nombres de categorías. Aplicá 202610220005_category_labels.sql y actualizá los datos.';
  if (['PGRST204', 'PGRST205', '42703', '42P01'].includes(e?.code || '') && /catalog_name|retail_category_catalog/.test(e.message || ''))
    return 'Falta actualizar las categorías en Supabase. Aplicá 202610220004_standard_categories.sql y actualizá los datos. No hace falta crear categorías.';
  if (e?.code === '23505' && e.message?.includes('retail_one_active_price_list_per_branch'))
    return 'Esta sucursal ya tiene una lista activa. Desactivala o cambiala a global antes de asignar otra.';
  if (e?.code === 'PGRST204' || e?.code === '42703') {
    if (/sale_markup|is_primary/.test(e.message || ''))
      return 'Falta actualizar la lista Principal en Supabase. Aplicá supabase/updates/202610270002_primary_product_markup.sql después de las actualizaciones anteriores y recargá los datos. El borrador se conserva.';
    if (e.message?.includes('margin_group'))
      return 'Falta actualizar la base de datos: ejecutá completa la migración 202610160004_margin_groups.sql en el SQL Editor de Supabase. Después, actualizá la pantalla y volvé a guardar. El producto no se guardó.';
    if (e.message?.includes('pack_size'))
      return 'Falta actualizar la base de datos: ejecutá completa la migración 202610160003_pack_size.sql en el SQL Editor de Supabase. Después, actualizá la pantalla y volvé a guardar. El producto no se guardó.';
    if (e.message?.includes('expiry_date') || e.message?.includes('last_restocked_at'))
      return 'Falta actualizar la base de datos: ejecutá completa la migración 202610200003_product_expiry.sql en el SQL Editor de Supabase. Después, actualizá la pantalla y volvé a guardar. El producto no se guardó.';
    return `La base de datos no tiene una columna que necesita esta versión. Revisá las migraciones pendientes en SUPABASE_SETUP.md. ${e.message || ''}`;
  }
  if (e?.code === "PGRST205" || e?.code === "PGRST202" || e?.code === "42P01")
    return "Falta instalar la base de datos. Ejecutá la migración SQL indicada en SUPABASE_SETUP.md y volvé a intentar.";
  if (e?.code === "PGRST116")
    return "El registro cambió o ya no está disponible. Actualizá los datos antes de volver a guardar.";
  // Los avisos propios del servidor ya explican qué se repite; el texto genérico queda para índices únicos.
  if (e?.code === "23505")
    return e.message && !/duplicate key/i.test(e.message) ? e.message
      : "Ya existe un registro con esos datos, o esta caja ya tiene un turno abierto. Actualizá la pantalla.";
  if (e?.code === "42501")
    return "Tu usuario no tiene permiso para realizar esta acción.";
  if (e?.message === "Invalid login credentials")
    return "Email o contraseña incorrectos.";
  if (e?.message === "Email not confirmed")
    return "Confirmá tu email antes de ingresar.";
  return (
    plainError(e?.message) ||
    "No se pudo conectar. Verificá tu conexión y volvé a intentar."
  );
}
