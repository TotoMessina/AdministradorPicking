// Textos, vistas y orden de la planilla de conteo.
export const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
export const statuses = { open: 'Abierto', confirmed: 'Confirmado', cancelled: 'Cancelado' };
export type View = 'pending' | 'counted' | 'different';
export type SheetSort = 'name' | 'code' | 'category' | 'system' | 'counted' | 'difference';
export const sheetLimit = 300;
