import type { Product } from '../../features/retail/api';
import type { PickingUpProduct } from './pickingUpTypes';

// Conversión de productos locales al formato de PickingUp.
// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Convierte un Product del sistema local en un PickingUpProduct para la API.
 * Aplica reglas de negocio críticas:
 * - stock_control = true siempre que manejamos inventario en kiosco
 * - stock_available es obligatorio si stock_control = true
 * - ref_externa guarda el ID interno de Supabase
 */
export function mapLocalProductToPickingUp(
  product: Product,
  categoryCode: string
): PickingUpProduct {
  const code = (product.code || '').trim();
  const name = (product.name || '').trim();
  const stockAvailable =
    typeof product.stock === 'number' && !Number.isNaN(product.stock)
      ? Math.max(0, product.stock)
      : 0;
  const stockMin =
    typeof product.minStock === 'number' && !Number.isNaN(product.minStock)
      ? Math.max(0, product.minStock)
      : 0;

  return {
    code,
    name,
    enabled: product.active !== false,
    ean_code: code || undefined,
    category_code: categoryCode.trim(),
    stock_control: true,
    stock_available: stockAvailable,
    stock_min: stockMin,
    min_units: 1,
    selling_factor: 1,
    ref_externa: product.id ? String(product.id) : undefined,
  };
}

/**
 * Divide un array en lotes más pequeños para evitar payloads masivos y timeouts
 */
export function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
