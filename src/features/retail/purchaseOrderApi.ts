import { supabase } from '../../lib/supabase';
import { normalizeSupplierText } from '../../services/supplierMappingService';
import { hasComposition } from '../../services/productComposition';
import { unitsPerPack } from '../../services/inventoryUnits';
import type { Product, Supplier } from './api';

export type OrderStatus = 'draft' | 'sent' | 'received' | 'cancelled';
export interface ReceiptLine { product_id: string; name: string; qty: number; unit_cost: number | null }
export interface PurchaseOrderLine { product_id: string; product_name: string; qty: number; unit_cost: number | null; suggested: number | null }
export interface PurchaseOrder {
  id: string; supplier_id: string | null; supplier_name: string; branch_id: string; status: OrderStatus; notes: string | null;
  actor_email: string | null; created_at: string; sent_at: string | null; receipt: ReceiptLine[] | null; received_at: string | null; received_email: string | null;
  lines: PurchaseOrderLine[];
}
export interface Velocity { product_id: string; branch_id: string; units: number }

async function rpc<T>(name: string, args: Record<string, unknown>) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw error;
  return data as T;
}

export const purchaseOrders = {
  async list(store: string) {
    const { data, error } = await supabase.from('retail_purchase_orders')
      .select('id,supplier_id,supplier_name,branch_id,status,notes,actor_email,created_at,sent_at,receipt,received_at,received_email,retail_purchase_order_lines(product_id,product_name,qty,unit_cost,suggested)')
      .eq('store_id', store).order('created_at', { ascending: false }).limit(60);
    if (error) throw error;
    return (data || []).map(({ retail_purchase_order_lines: lines, ...row }) => ({
      ...row, lines: ((lines || []) as PurchaseOrderLine[]).map(line => ({ ...line, unit_cost: line.unit_cost === null ? null : Number(line.unit_cost) })),
    })) as PurchaseOrder[];
  },
  velocity: (store: string, days: number) => rpc<Velocity[]>('retail_product_sales_velocity', { p_store: store, p_days: days }),
  save: (store: string, id: string, order: { supplier_id: string | null; supplier_name: string; branch_id: string; notes: string; lines: { product_id: string; qty: number; suggested?: number }[] }) =>
    rpc<string>('retail_save_purchase_order', { p_store: store, p_id: id, p_order: order }),
  setStatus: (store: string, id: string, status: 'sent' | 'cancelled') => rpc<void>('retail_set_purchase_order_status', { p_store: store, p_id: id, p_status: status }),
  receive: (store: string, supplierName: string, branch: string | undefined, receipt: ReceiptLine[]) =>
    rpc<string | null>('retail_receive_purchase_order', { p_store: store, p_supplier_name: supplierName, p_branch: branch || null, p_receipt: receipt }),
};

export interface Suggestion {
  product: Product; stock: number; min: number; dailySales: number; suggested: number; pack: number;
}
export interface SupplierGroup { key: string; supplier: Supplier | null; name: string; phone: string; items: Suggestion[] }

/**
 * Qué pedir para una sucursal: lo que falta para cubrir el aviso configurado más los días elegidos
 * según lo vendido en los últimos días, redondeado a bultos. Solo productos con stock propio.
 */
export function suggestionFor(product: Product, velocity: Velocity[], branchId: string, salesDays: number, coverDays: number): Suggestion {
  const sold = velocity.find(row => row.branch_id === branchId && row.product_id === product.id);
  const stock = product.branchStocks?.[branchId] ?? Math.max(0, product.stock - (product.depotStock || 0));
  const min = Math.max(0, product.minStock || 0);
  const dailySales = Number(sold?.units || 0) / salesDays;
  const pack = unitsPerPack(product.pack_size);
  const missing = min + Math.ceil(dailySales * coverDays) - stock;
  const suggested = missing <= 0 || (stock > min && dailySales === 0) ? 0 : Math.ceil(missing / pack) * pack;
  return { product, stock, min, dailySales, suggested, pack };
}

/** Grupo de un proveedor aunque no tenga nada sugerido, para armar un pedido a mano. */
export function supplierGroup(key: string, name: string, suppliers: Supplier[]): SupplierGroup {
  const supplier = suppliers.find(row => normalizeSupplierText(row.name) === key) || null;
  return { key, supplier, name: supplier?.name || name, phone: supplier?.profile?.phone || '', items: [] };
}

export function suggestOrders(products: Product[], suppliers: Supplier[], velocity: Velocity[], branchId: string, salesDays: number, coverDays: number): SupplierGroup[] {
  const groups = new Map<string, SupplierGroup>();
  for (const product of products) {
    if (product.active === false || hasComposition(product)) continue;
    const item = suggestionFor(product, velocity, branchId, salesDays, coverDays);
    if (!item.suggested) continue;
    const key = normalizeSupplierText(product.supplier || '');
    const group = groups.get(key) || (key ? supplierGroup(key, product.supplier?.trim() || '', suppliers) : { key, supplier: null, name: 'Sin proveedor', phone: '', items: [] });
    group.items.push(item);
    groups.set(key, group);
  }
  return [...groups.values()].map(group => ({ ...group, items: group.items.sort((a, b) => a.product.name.localeCompare(b.product.name, 'es')) }))
    .sort((a, b) => (a.key ? 0 : 1) - (b.key ? 0 : 1) || a.name.localeCompare(b.name, 'es'));
}

const units = (qty: number, pack: number) => pack > 1 && qty % pack === 0 ? `${qty / pack} bultos x ${pack}` : `${qty} u.`;

/** Texto para mandar a mano por WhatsApp o pegarlo donde se quiera. */
export function orderMessage(order: { supplier_name: string; notes?: string | null; lines: { product_id: string; product_name: string; qty: number }[] }, storeName: string, branchName: string, products: Product[]) {
  const code = (id: string) => products.find(product => product.id === id)?.code || '';
  const pack = (id: string) => unitsPerPack(products.find(product => product.id === id)?.pack_size);
  return [
    `Hola ${order.supplier_name}, te paso el pedido de ${storeName}${branchName ? ` (${branchName})` : ''}:`,
    ...order.lines.map(line => `• ${line.product_name}${code(line.product_id) ? ` [${code(line.product_id)}]` : ''}: ${units(line.qty, pack(line.product_id))}`),
    ...(order.notes ? [`Nota: ${order.notes}`] : []),
    'Gracias.',
  ].join('\n');
}

export function whatsappLink(phone: string, text: string) {
  const digits = phone.replace(/\D/g, '');
  // Un número local sin código de país se completa con el de Argentina.
  const full = digits && !digits.startsWith('54') ? `54${digits.replace(/^0/, '')}` : digits;
  return `https://wa.me/${full}?text=${encodeURIComponent(text)}`;
}

export interface ReceiptComparison {
  product_id: string; name: string; ordered: number; received: number; difference: number;
  orderedCost: number | null; receivedCost: number | null; costIncrease: number | null;
}
/** Pedido contra lo que trajo la factura: faltantes, sobrantes, productos no pedidos y aumentos de costo. */
export function compareReceipt(order: PurchaseOrder): ReceiptComparison[] {
  const received = new Map<string, ReceiptLine & { total: number }>();
  for (const line of order.receipt || []) {
    const previous = received.get(line.product_id);
    received.set(line.product_id, { ...line, qty: (previous?.qty || 0) + Number(line.qty), total: (previous?.total || 0) + Number(line.qty) * Number(line.unit_cost || 0), unit_cost: line.unit_cost ?? previous?.unit_cost ?? null });
  }
  const rows: ReceiptComparison[] = order.lines.map(line => {
    const got = received.get(line.product_id);
    const receivedCost = got && got.qty > 0 && got.unit_cost !== null ? Math.round(got.total / got.qty * 100) / 100 : null;
    return { product_id: line.product_id, name: line.product_name, ordered: line.qty, received: got?.qty || 0, difference: (got?.qty || 0) - line.qty,
      orderedCost: line.unit_cost, receivedCost, costIncrease: line.unit_cost && receivedCost !== null && receivedCost > line.unit_cost ? (receivedCost - line.unit_cost) / line.unit_cost : null };
  });
  for (const [id, got] of received) if (!order.lines.some(line => line.product_id === id)) {
    rows.push({ product_id: id, name: got.name, ordered: 0, received: got.qty, difference: got.qty, orderedCost: null, receivedCost: got.unit_cost, costIncrease: null });
  }
  return rows;
}
