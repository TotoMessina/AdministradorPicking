import type { KioscoCartItem, KioscoProduct, KioscoSale, StockComponent } from '../types/kiosco';
import { priceFromMarkup } from './productSalePrice';

export const hasComposition = (product: Pick<KioscoProduct, 'stock_components'>) => !!product.stock_components?.length;
/** A depot reserves physical units; virtual products already contain sale availability. */
export const stockForSale = (product: KioscoProduct) => Math.max(0, !hasComposition(product) && product.branchStocks && product.stockBranchId
  ? product.branchStocks[product.stockBranchId] || 0 : product.stock - (hasComposition(product) ? 0 : (product.depotStock || 0)));
export const productsAtBranch = <T extends KioscoProduct>(products: T[], branch?: string) => withAvailableStock(products.map(product => ({ ...product,
  ...(branch ? { branchStocks: product.branchStocks || {} } : {}), stockBranchId: branch || undefined,
})));
/** Zero cost means unknown, as in margin analytics. Never show a partial recipe as a complete cost. */
export function compositionCost(components: StockComponent[], products: KioscoProduct[] | ReadonlyMap<string, KioscoProduct>) {
  const byId = Array.isArray(products) ? new Map(products.map(product => [product.id, product])) : products;
  const missing: string[] = [];
  let cents = 0n;
  for (const component of components) {
    const source = byId.get(component.product_id);
    if (!source || !(Number(source.cost) > 0) || !Number.isFinite(source.cost) || !Number.isInteger(component.quantity) || component.quantity < 1) {
      missing.push(source?.name || 'Componente sin elegir');
      continue;
    }
    cents += BigInt(Math.round(source.cost! * 100)) * BigInt(component.quantity);
  }
  return { cost: missing.length ? 0 : Number(cents) / 100, missing };
}
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
  return products.map(product => {
   const resolved = !hasComposition(product) ? product : { ...product, cost: compositionCost(product.stock_components!, byId).cost, stock: Math.max(0, Math.min(
    ...product.stock_components!.map(component => {
      const source = byId.get(component.product_id);
      return source && !hasComposition(source) && Number.isInteger(component.quantity) && component.quantity > 0
        ? Math.floor(stockForSale(source) / component.quantity) : 0;
    }),
   )) };
   if (resolved.sale_markup == null || resolved.sellable === false) return resolved;
   try { return { ...resolved, price: priceFromMarkup(Number(resolved.cost), resolved.sale_markup), pricingError: undefined }; }
   catch (error) { return { ...resolved, pricingError: error instanceof Error ? error.message : 'Revisá costo y porcentaje.' }; }
  });
}

export function cartStockError(cart: Pick<KioscoCartItem, 'product' | 'qty'>[], products: KioscoProduct[]): string {
  const byId = new Map(products.map(product => [product.id, product]));
  const required = new Map<string, number>();
  for (const line of cart) {
    if (!Number.isInteger(line.qty) || line.qty < 1 || line.qty > 999999) return 'Ingresá una cantidad entera entre 1 y 999999.';
    if (line.product.code === 'MANUAL') continue;
    const current = byId.get(line.product.id);
    if (!current) return `${line.product.name} ya no está disponible. Retiralo de la venta y actualizá el catálogo.`;
    if (current.sellable === false) return `${current.name} es solo un insumo. Retiralo de la venta; podés vender el combo que lo utiliza.`;
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
    if (stockForSale(source) < quantity) return `Stock insuficiente de ${source.name}: necesitás ${quantity} y hay ${stockForSale(source)} disponibles${source.depotStock ? ` en salón (${source.depotStock} en depósito). Reponé el salón antes de vender` : '. Revisá las cantidades del carrito'}.`;
  }
  return '';
}

/** Maximum for this line after reserving components used by all the other lines. */
export function availableForCart(product: KioscoProduct, cart: KioscoCartItem[], products: KioscoProduct[]): number {
  if (product.code === 'MANUAL') return 999999;
  const byId = new Map(products.map(row => [row.id, row]));
  const current = byId.get(product.id);
  if (!current || current.sellable === false || compositionKey(current.stock_components) !== compositionKey(product.stock_components)) return 0;
  const used = new Map<string, number>();
  for (const line of cart) {
    if (line.product.id === product.id) continue;
    for (const part of stockRequirements(byId.get(line.product.id) || line.product))
      used.set(part.product_id, (used.get(part.product_id) || 0) + part.quantity * line.qty);
  }
  return Math.max(0, Math.min(999999, ...stockRequirements(current).map(part => {
    const source = byId.get(part.product_id);
    return source && (!hasComposition(current) || !hasComposition(source)) && part.quantity > 0
      ? Math.floor((stockForSale(source) - (used.get(source.id) || 0)) / part.quantity) : 0;
  })));
}

export function consumeSaleStock<T extends KioscoProduct>(products: T[], items: KioscoSale['items'], branch?: string): T[] {
  if (branch) products = productsAtBranch(products, branch);
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
  return withAvailableStock(products.map(product => hasComposition(product) ? { ...product, stockBranchId: undefined } : {
    ...product, stockBranchId: undefined, stock: product.stock - (used.get(product.id) || 0),
    ...(product.branchStocks && branch ? { branchStocks: { ...product.branchStocks, [branch]: (product.branchStocks[branch] || 0) - (used.get(product.id) || 0) } } : {}),
  }));
}
