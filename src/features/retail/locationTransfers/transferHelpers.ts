import type { LocationTransfer } from '../locationTransferApi';

// Textos, columnas y claves de la planilla de transferencias.
export type HistoryStock = LocationTransfer & { legacy?: boolean };
export const money = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' });
export const statuses = { pending: 'Pendiente', confirmed: 'Confirmada', cancelled: 'Cancelada' };
export const transferKey = (from: string, to: string) => `${from}>${to}`;
export type SheetSort = 'name' | 'code' | 'category' | 'origin' | 'destination' | 'min' | 'need' | 'qty';
export const sheetColumns: { key: SheetSort; label: string; numeric?: boolean }[] = [
  { key: 'name', label: 'Producto' }, { key: 'code', label: 'Código' }, { key: 'category', label: 'Categoría' },
  { key: 'origin', label: 'Origen', numeric: true }, { key: 'destination', label: 'Destino', numeric: true },
  { key: 'min', label: 'Mín.', numeric: true }, { key: 'need', label: 'Falta', numeric: true }, { key: 'qty', label: 'A transferir', numeric: true },
];
export const sheetLimit = 300;
