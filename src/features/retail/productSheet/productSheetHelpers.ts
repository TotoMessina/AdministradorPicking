import type { PresentationSizes } from '../../../services/productPresentation';
import type { Product } from '../api';

// Renglón de la planilla y formatos.
export interface Row extends PresentationSizes {
  key: string; original?: Product;
  code: string; name: string; categoryId: string;
  qty: string; cost: string; markup: string; manual: boolean; price: string; minStock: string;
  brand: string; supplier: string; supplierCode: string; expiry: string; sellable: boolean; unitType: string; emoji: string; rounding: number | null;
  /** EAN-13 del display, DUN-14 del bulto y bultos por pallet (202611060009). */
  displayCode: string; packCode: string; palletPacks: string;
  /** Etiquetas separadas por coma. */
  tags: string;
  open: boolean; error: string;
}
export type Field = keyof Row;

let counter = 0;
export const nextKey = () => `row-${Date.now()}-${counter++}`;
export const money = (value: number) => `$${value.toLocaleString('es-AR', { maximumFractionDigits: 2 })}`;
/** «sin TACC, importado» → ['sin TACC', 'importado'], sin repetidos ni vacíos. */
export const tagList = (text: string) => [...new Set(text.split(',').map(tag => tag.trim().replace(/^#/, '')).filter(Boolean))].slice(0, 30);
export const unitTypes: Record<string, string> = { unit: 'Unidad', kg: 'Kilo', lt: 'Litro', pack: 'Pack', box: 'Caja' };

/**
 * Planilla para dar de alta o editar productos en filas, como la revisión de facturas.
 * La cantidad y el costo se cargan por la presentación elegida (unidad, display o bulto) y se guardan por unidad.
 * Guarda cada fila con el mismo retail.saveProduct de la ficha, así mantiene sucursal, precio por costo y permisos.
 */
