export const permissionOptions = [
  { id: 'sell', label: 'Vender y cobrar' },
  { id: 'cash_income', label: 'Registrar ingresos de efectivo' },
  { id: 'cash_withdrawal', label: 'Registrar retiros de efectivo' },
  { id: 'move_sale_ledger', label: 'Cambiar ventas propias de registro' },
  { id: 'submit_remito', label: 'Enviar remitos para revisión' },
  { id: 'view_sales', label: 'Consultar ventas e informes de las cajas asignadas' },
  { id: 'replenish_stock', label: 'Reponer stock compartido (unidades y bultos)' },
  { id: 'edit_prices', label: 'Editar precios base del catálogo' },
  { id: 'manage_quick_products', label: 'Personalizar botonera de las sucursales asignadas' },
] as const;
export type Permission = typeof permissionOptions[number]['id'];
export type StaffBaseRole = 'cashier' | 'supervisor';
export interface PermissionProfile { id: string; store_id: string; name: string; base_role: StaffBaseRole; permissions: Permission[] }
export const defaultPermissions = (role: StaffBaseRole): Permission[] => [
  'sell', 'cash_income', 'cash_withdrawal', 'move_sale_ledger', 'submit_remito',
  ...(role === 'supervisor' ? ['view_sales' as const] : []),
];
