export const permissionOptions = [
  { id: 'sell', label: 'Vender y cobrar' },
  { id: 'cash_income', label: 'Registrar ingresos de efectivo' },
  { id: 'cash_withdrawal', label: 'Registrar retiros de efectivo' },
  { id: 'move_sale_ledger', label: 'Cambiar ventas propias de registro' },
  { id: 'submit_remito', label: 'Enviar remitos para revisión' },
  { id: 'view_sales', label: 'Consultar ventas e informes de las cajas asignadas' },
  { id: 'replenish_stock', label: 'Recibir mercadería y mover stock entre salón y depósito (unidades y bultos)' },
  { id: 'edit_prices', label: 'Editar precios base del catálogo' },
  { id: 'manage_quick_products', label: 'Personalizar botonera de las sucursales asignadas' },
  { id: 'manage_products', label: 'Crear, editar e importar productos (incluye costos y stock)' },
  { id: 'manage_compositions', label: 'Configurar combos, paquetes y cigarrillos sueltos' },
  { id: 'delete_products', label: 'Eliminar, restaurar y consultar historial de productos' },
  { id: 'manage_price_lists', label: 'Crear y editar listas y precios por sucursal' },
  { id: 'review_remitos', label: 'Consultar, aprobar y rechazar remitos pendientes' },
  { id: 'manage_transfers', label: 'Crear, confirmar y cancelar transferencias' },
  { id: 'manage_funds', label: 'Consultar fondos y transferir dinero entre sucursales y depósito' },
  { id: 'manage_supplier_accounts', label: 'Consultar saldos de proveedores y registrar pagos' },
  { id: 'attach_invoice', label: 'Asociar comprobantes a ventas accesibles' },
  { id: 'manage_store', label: 'Editar datos del comercio, ticket y límite de bajo margen' },
  { id: 'manage_locations', label: 'Crear y editar sucursales y cajas' },
  { id: 'manage_categories', label: 'Personalizar nombres de categorías' },
  { id: 'manage_ledgers', label: 'Configurar registros y reglas por medio de pago' },
  { id: 'manage_staff', label: 'Administrar accesos, roles y asignaciones de personal' },
  { id: 'manage_profiles', label: 'Crear y editar perfiles de permisos' },
  { id: 'use_ai', label: 'Consultar análisis completo del asistente' },
] as const;
export type Permission = typeof permissionOptions[number]['id'];
export type StaffBaseRole = 'cashier' | 'supervisor';
export interface PermissionProfile { id: string; store_id: string; name: string; base_role: StaffBaseRole; permissions: Permission[]; revision?: number }
export const settingsPermissions: Permission[] = ['manage_store', 'manage_locations', 'manage_categories', 'manage_ledgers', 'manage_staff', 'manage_profiles', 'manage_supplier_accounts'];
export const catalogPermissions: Permission[] = ['manage_products', 'manage_compositions', 'delete_products', 'manage_price_lists', 'manage_transfers', 'manage_funds', 'review_remitos', 'replenish_stock', 'edit_prices', 'manage_quick_products'];
export const defaultPermissions = (role: StaffBaseRole): Permission[] => [
  'sell', 'cash_income', 'cash_withdrawal', 'move_sale_ledger', 'submit_remito',
  ...(role === 'supervisor' ? ['view_sales' as const] : []),
];
