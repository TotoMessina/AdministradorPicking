import type { KioscoCartItem, KioscoProduct, KioscoSale, StockComponent } from '../types/kiosco';

export const hasComposition = (product: Pick<KioscoProduct, 'stock_components'>) => !!product.stock_components?.length;
export const compositionKey = (components: StockComponent[] = []) => JSON.stringify(
  components.map(({ product_id, quantity }) => ({ product_id, quantity })).sort((a, b) => a.product_id.localeCompare(b.product_id)),
);
export const stockRequirements = (product: KioscoProduct): StockComponent[] => product.code === 'MANUAL' ? []
  : hasComposition(product) ? product.stock_components! : [{ product_id: product.id, quantity: 1 }];

/** Inventory analysis uses the recorded recipe, never today's edited composition. */
export function inventorySaleUnits(item: Pick<KioscoSale['items'][number], 'productId' | 'qty' | 'stockComponents'>): { productId: string; qty: number }[] {
  if (!item || !Number.isFinite(item.qty) || item.qty <= 0) return [];
  if (Array.isArray(item.stockComponents) && item.stockComponents.length) return item.stockComponents
    .filter(part => typeof part.product_id === 'string' && Number.isInteger(part.quantity) && part.quantity > 0)
    .map(part => ({ productId: part.product_id, qty: part.quantity * item.qty }));
  return item.productId ? [{ productId: item.productId, qty: item.qty }] : [];
}

/** A composed product has availability, never a second physical stock. No nested recipes. */
export function withAvailableStock<T extends KioscoProduct>(products: T[]): T[] {
  const byId = new Map(products.map(product => [product.id, product]));
  return products.map(product => !hasComposition(product) ? product : { ...product, stock: Math.max(0, Math.min(
    ...product.stock_components!.map(component => {
      const source = byId.get(component.product_id);
      return source && !hasComposition(source) && Number.isInteger(component.quantity) && component.quantity > 0
        ? Math.floor(source.stock / component.quantity) : 0;
    }),
  )) });
}

export function cartStockError(cart: Pick<KioscoCartItem, 'product' | 'qty'>[], products: KioscoProduct[]): string {
  const byId = new Map(products.map(product => [product.id, product]));
  const required = new Map<string, number>();
  for (const line of cart) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 999999) return 'Ingresá una cantidad entera entre 1 y 999999.';
    if (line.product.code === 'MANUAL') continue;
    const current = byId.get(line.product.id);
    if (!current) return `${line.product.name} ya no está disponible. Retiralo de la venta y actualizá el catálogo.`;
    if (compositionKey(current.stock_components) !== compositionKey(line.product.stock_components))
      return `Cambió la composición de ${current.name}. Retiralo de la venta y volvé a agregarlo.`;
    for (const component of stockRequirements(current)) {
      const source = byId.get(component.product_id);
      if (!source || (hasComposition(current) && hasComposition(source)) || !Number.isInteger(component.quantity) || component.quantity < 1)
        return `Revisá los componentes de ${current.name} con administración.`;
      required.set(source.id, (required.get(source.id) || 0) + component.quantity * line.qty);
    }
  }
  for (const [id, quantity] of required) {
    const source = byId.get(id)!;
    if (source.stock < quantity) return `Stock insuficiente de ${source.name}: necesitás ${quantity} y hay ${source.stock}. Revisá las cantidades del carrito.`;
  }
  return '';
}

/** Maximum for this line after reserving components used by all the other lines. */
export function availableForCart(product: KioscoProduct, cart: KioscoCartItem[], products: KioscoProduct[]): number {
  if (product.code === 'MANUAL') return 999999;
  const byId = new Map(products.map(row => [row.id, row]));
  const current = byId.get(product.id);
  if (!current || compositionKey(current.stock_components) !== compositionKey(product.stock_components)) return 0;
  const used = new Map<string, number>();
  for (const line of cart) {
    if (line.product.id === product.id) continue;
    for (const part of stockRequirements(byId.get(line.product.id) || line.product))
      used.set(part.product_id, (used.get(part.product_id) || 0) + part.quantity * line.qty);
  }
  return Math.max(0, Math.min(999999, ...stockRequirements(current).map(part => {
    const source = byId.get(part.product_id);
    return source && (!hasComposition(current) || !hasComposition(source)) && part.quantity > 0
      ? Math.floor((source.stock - (used.get(source.id) || 0)) / part.quantity) : 0;
  })));
}

export function consumeSaleStock<T extends KioscoProduct>(products: T[], items: KioscoSale['items']): T[] {
  const cart = items.filter(item => item.productId).map(item => {
    const product = products.find(product => product.id === item.productId);
    if (!product) throw new Error(`${item.name} ya no está disponible. Actualizá el catálogo.`);
    return { product: { ...product, stock_components: item.stockComponents || [] }, qty: item.qty };
  });
  const error = cartStockError(cart, products);
  if (error) throw new Error(error);
  const used = new Map<string, number>();
  for (const { product, qty } of cart) for (const part of stockRequirements(product))
    used.set(part.product_id, (used.get(part.product_id) || 0) + part.quantity * qty);
  return withAvailableStock(products.map(product => hasComposition(product) ? product : { ...product, stock: product.stock - (used.get(product.id) || 0) }));
}
