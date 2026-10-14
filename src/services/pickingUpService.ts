import type { Category, Product } from '../features/retail/api';

// ============================================================================
// Tipos e Interfaces de PickingUp Distributors API
// ============================================================================

export interface PickingUpCategory {
  code: string;
  name: string;
  enabled: boolean;
}

export interface PickingUpProduct {
  code: string; // SKU del ERP — mapea al `code` (EAN) de KioscoProduct
  name: string; // mapea a KioscoProduct.name
  enabled: boolean; // mapea a Product.active
  ean_code?: string; // código EAN-13 alternativo
  category_code: string; // referencia a Category.code
  stock_control: boolean; // true si manejamos stock
  stock_available?: number; // mapea a KioscoProduct.stock
  stock_min?: number; // mapea a KioscoProduct.minStock
  min_units?: number;
  selling_factor?: number;
  ref_externa?: string; // ID interno Supabase del producto para trazabilidad
}

export interface PickingUpPricelist {
  code: string;
  name: string;
  description?: string;
  enabled: boolean;
}

export interface PickingUpPriceEntry {
  item_code: string;
  price: number; // Costo mayorista / neto
  final_price: number; // Precio de venta final al público
}

export interface PickingUpOrderItem {
  id?: number;
  sku: string;
  name: string;
  quantity: number;
  net_amount?: number;
  final_amount?: number;
}

export interface PickingUpOrder {
  id: number;
  status: string; // 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled'
  notes?: string | null;
  net_amount?: number;
  final_amount?: number;
  created_at?: string;
  updated_at?: string;
  exported_at?: string | null;
  customer?: {
    code: string;
    document?: string;
  };
  pricelist?: {
    code: string;
  };
  items: PickingUpOrderItem[];
}

export interface PickingUpSyncResult {
  synced: number;
  errors: string[];
  skipped?: number;
}

export interface PickingUpPagination {
  current_page: number;
  per_page: number;
  total: number;
}

export interface PickingUpPaginatedResponse<T> {
  data?: T[];
  items?: T[];
  pagination?: PickingUpPagination;
}

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
function chunkArray<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// ============================================================================
// Servicio Principal PickingUp
// ============================================================================

export class PickingUpService {
  private baseUrl: string;
  private customToken?: string;
  private defaultPricelistCode: string;

  constructor(config?: {
    baseUrl?: string;
    token?: string;
    pricelistCode?: string;
  }) {
    this.baseUrl =
      config?.baseUrl ||
      (import.meta.env?.VITE_PICKINGUP_BASE_URL as string | undefined)?.trim() ||
      'https://mainapi-staging.pickingup.ar/api/external/distributors/v1';

    this.customToken = config?.token;

    this.defaultPricelistCode =
      config?.pricelistCode ||
      (import.meta.env?.VITE_PICKINGUP_PRICELIST_CODE as string | undefined)?.trim() ||
      'LIST-PRINCIPAL';
  }

  /**
   * Obtiene el token de autenticación activo, revisando:
   * 1. Token custom asignado en memoria
   * 2. localStorage ('pickingup_api_token') para persistencia en UI
   * 3. Variable de entorno Vite (VITE_PICKINGUP_API_TOKEN)
   */
  public getToken(): string {
    if (this.customToken && this.customToken.trim().length > 0) {
      return this.customToken.trim();
    }

    if (typeof window !== 'undefined' && window.localStorage) {
      const stored = window.localStorage.getItem('pickingup_api_token');
      if (stored && stored.trim().length > 0) {
        return stored.trim();
      }
    }

    return (
      (import.meta.env?.VITE_PICKINGUP_API_TOKEN as string | undefined)?.trim() ||
      ''
    );
  }

  /**
   * Actualiza el token de autenticación en memoria
   */
  public setToken(token: string): void {
    this.customToken = token.trim();
  }

  /**
   * Obtiene la URL base configurada
   */
  public getBaseUrl(): string {
    return this.baseUrl;
  }

  /**
   * Modifica la URL base de la API
   */
  public setBaseUrl(url: string): void {
    this.baseUrl = url.trim();
  }

  /**
   * Obtiene el código de la lista de precios por defecto
   */
  public getDefaultPricelistCode(): string {
    return this.defaultPricelistCode;
  }

  /**
   * Ejecuta peticiones HTTP autenticadas contra la API PickingUp
   */
  private async request<T = unknown>(
    path: string,
    options: RequestInit = {}
  ): Promise<T> {
    const token = this.getToken();
    if (!token) {
      throw new Error(
        'Token de API PickingUp no configurado. Ingresa tu token en el archivo .env o en el panel de integración.'
      );
    }

    const cleanBase = this.baseUrl.replace(/\/+$/, '');
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = `${cleanBase}${cleanPath}`;

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    let response: Response;
    try {
      response = await fetch(url, {
        ...options,
        headers,
      });
    } catch (networkError) {
      const msg =
        networkError instanceof Error ? networkError.message : String(networkError);
      throw new Error(`Error de red al conectar con PickingUp (${url}): ${msg}`);
    }

    if (!response.ok) {
      let errorMessage = `HTTP ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        if (errorData?.message) {
          errorMessage = errorData.message;
        } else if (errorData?.error) {
          errorMessage =
            typeof errorData.error === 'string'
              ? errorData.error
              : JSON.stringify(errorData.error);
        } else if (Array.isArray(errorData?.errors)) {
          errorMessage = errorData.errors.join(', ');
        }
      } catch {
        // En caso de que la respuesta no sea JSON, preservamos statusText
      }
      throw new Error(errorMessage);
    }

    if (response.status === 204) {
      return {} as T;
    }

    return (await response.json()) as T;
  }

  /**
   * Verifica la validez del token y conectividad con la API PickingUp.
   * Llama a GET /me. Retorna true si es válido, false en caso contrario.
   */
  public async verifyConnection(): Promise<boolean> {
    try {
      await this.request('/me', { method: 'GET' });
      return true;
    } catch (err) {
      console.warn('[PickingUp] Error al verificar conexión:', err);
      return false;
    }
  }

  /**
   * Obtiene la lista actual de categorías en PickingUp
   */
  public async getCategories(): Promise<PickingUpCategory[]> {
    try {
      const res = await this.request<any>('/categories', { method: 'GET' });
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.items)) return res.items;
      return [];
    } catch (err) {
      console.warn('[PickingUp] Error al obtener categorías:', err);
      return [];
    }
  }

  /**
   * Sincroniza categorías locales con PickingUp.
   * - Consulta categorías existentes vía GET /categories
   * - Envía POST /categories para nuevas
   * - Envía PATCH /categories para existentes
   * - Si un batch atómico falla, hace fallback individual para no perder entidades válidas
   */
  public async syncCategories(categories: Category[]): Promise<PickingUpSyncResult> {
    const result: PickingUpSyncResult = { synced: 0, errors: [], skipped: 0 };

    if (!categories || categories.length === 0) {
      return result;
    }

    // 1. Obtener categorías ya existentes en PickingUp
    const existing = await this.getCategories();
    const existingCodes = new Set(existing.map((c) => c.code.toLowerCase()));

    const toCreate: PickingUpCategory[] = [];
    const toUpdate: PickingUpCategory[] = [];

    for (const cat of categories) {
      const code = (cat.id || cat.name || '').trim();
      const name = (cat.name || '').trim();

      if (!code || !name) {
        result.skipped = (result.skipped || 0) + 1;
        result.errors.push(
          `Categoría ignorada por datos incompletos (id: "${cat.id}", nombre: "${cat.name}").`
        );
        continue;
      }

      const item: PickingUpCategory = {
        code,
        name,
        enabled: true,
      };

      if (existingCodes.has(code.toLowerCase())) {
        toUpdate.push(item);
      } else {
        toCreate.push(item);
      }
    }

    // 2. Crear nuevas categorías (POST /categories en lotes)
    if (toCreate.length > 0) {
      const createBatches = chunkArray(toCreate, 50);
      for (const batch of createBatches) {
        try {
          await this.request('/categories', {
            method: 'POST',
            body: JSON.stringify(batch),
          });
          result.synced += batch.length;
        } catch (batchErr: any) {
          console.warn('[PickingUp] Falló lote POST /categories, reintentando individualmente:', batchErr);
          // Fallback uno a uno por ser operación atómica
          for (const item of batch) {
            try {
              await this.request('/categories', {
                method: 'POST',
                body: JSON.stringify([item]),
              });
              result.synced++;
            } catch (singleErr: any) {
              result.errors.push(
                `Categoría "${item.name}" (${item.code}) [POST]: ${singleErr?.message || singleErr}`
              );
            }
          }
        }
      }
    }

    // 3. Actualizar categorías existentes (PATCH /categories en lotes)
    if (toUpdate.length > 0) {
      const updateBatches = chunkArray(toUpdate, 50);
      for (const batch of updateBatches) {
        try {
          await this.request('/categories', {
            method: 'PATCH',
            body: JSON.stringify(batch),
          });
          result.synced += batch.length;
        } catch (batchErr: any) {
          console.warn('[PickingUp] Falló lote PATCH /categories, reintentando individualmente:', batchErr);
          for (const item of batch) {
            try {
              await this.request(`/categories/${encodeURIComponent(item.code)}`, {
                method: 'PATCH',
                body: JSON.stringify({ name: item.name, enabled: item.enabled }),
              });
              result.synced++;
            } catch (singleErr: any) {
              result.errors.push(
                `Categoría "${item.name}" (${item.code}) [PATCH]: ${singleErr?.message || singleErr}`
              );
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Obtiene la lista actual de productos en PickingUp
   */
  public async getProducts(limit = 1000): Promise<PickingUpProduct[]> {
    try {
      const res = await this.request<any>(`/products?limit=${limit}`, {
        method: 'GET',
      });
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.items)) return res.items;
      return [];
    } catch (err) {
      console.warn('[PickingUp] Error al obtener productos:', err);
      return [];
    }
  }

  /**
   * Sincroniza productos locales con PickingUp.
   * - Mapea campos locales al schema de PickingUp
   * - POST /products para nuevos
   * - PATCH /products para existentes
   * - Fallback a envíos individuales ante fallas atómicas de lote
   */
  public async syncProducts(
    products: Product[],
    categoryCodeMap: Map<string, string>
  ): Promise<PickingUpSyncResult> {
    const result: PickingUpSyncResult = { synced: 0, errors: [], skipped: 0 };

    if (!products || products.length === 0) {
      return result;
    }

    // 1. Obtener productos existentes para distinguir creación de actualización
    const existing = await this.getProducts(2000);
    const existingCodes = new Set(existing.map((p) => p.code.toLowerCase()));

    const toCreate: PickingUpProduct[] = [];
    const toUpdate: PickingUpProduct[] = [];

    for (const prod of products) {
      const code = (prod.code || '').trim();
      const name = (prod.name || '').trim();

      if (!code) {
        result.skipped = (result.skipped || 0) + 1;
        result.errors.push(
          `Producto "${name || 'Sin nombre'}" omitido: código EAN / SKU no definido.`
        );
        continue;
      }

      if (!name) {
        result.skipped = (result.skipped || 0) + 1;
        result.errors.push(`Producto con código "${code}" omitido: nombre vacío.`);
        continue;
      }

      // Mapear código de categoría desde el Map provisto o ID/nombre directo
      const catCode =
        categoryCodeMap.get(prod.categoryId) ||
        categoryCodeMap.get(prod.category) ||
        categoryCodeMap.get(prod.id) ||
        prod.categoryId ||
        prod.category;

      if (!catCode || !catCode.trim()) {
        result.skipped = (result.skipped || 0) + 1;
        result.errors.push(
          `Producto "${name}" (${code}) omitido: no se encontró código de categoría asociado.`
        );
        continue;
      }

      const mapped = mapLocalProductToPickingUp(prod, catCode);

      if (existingCodes.has(code.toLowerCase())) {
        toUpdate.push(mapped);
      } else {
        toCreate.push(mapped);
      }
    }

    // 2. Crear nuevos productos (POST /products en lotes de 50)
    if (toCreate.length > 0) {
      const createBatches = chunkArray(toCreate, 50);
      for (const batch of createBatches) {
        try {
          await this.request('/products', {
            method: 'POST',
            body: JSON.stringify(batch),
          });
          result.synced += batch.length;
        } catch (batchErr: any) {
          console.warn('[PickingUp] Falló lote POST /products, reintentando individualmente:', batchErr);
          for (const item of batch) {
            try {
              await this.request('/products', {
                method: 'POST',
                body: JSON.stringify([item]),
              });
              result.synced++;
            } catch (singleErr: any) {
              result.errors.push(
                `Producto "${item.name}" (${item.code}) [POST]: ${singleErr?.message || singleErr}`
              );
            }
          }
        }
      }
    }

    // 3. Actualizar productos existentes (PATCH /products en lotes de 50)
    if (toUpdate.length > 0) {
      const updateBatches = chunkArray(toUpdate, 50);
      for (const batch of updateBatches) {
        try {
          await this.request('/products', {
            method: 'PATCH',
            body: JSON.stringify(batch),
          });
          result.synced += batch.length;
        } catch (batchErr: any) {
          console.warn('[PickingUp] Falló lote PATCH /products, reintentando individualmente:', batchErr);
          for (const item of batch) {
            try {
              await this.request(`/products/${encodeURIComponent(item.code)}`, {
                method: 'PATCH',
                body: JSON.stringify(item),
              });
              result.synced++;
            } catch (singleErr: any) {
              result.errors.push(
                `Producto "${item.name}" (${item.code}) [PATCH]: ${singleErr?.message || singleErr}`
              );
            }
          }
        }
      }
    }

    return result;
  }

  /**
   * Sincroniza precios con una lista de precios de PickingUp.
   * PUT /pricelists/{code}/prices
   * - price = costo mayorista (product.cost)
   * - final_price = precio de venta al público (product.price)
   * - Para eliminar o deslistar un producto: price: 0 y final_price: 0 (si active === false)
   */
  public async syncPrices(
    pricelistCode: string,
    products: Product[]
  ): Promise<PickingUpSyncResult> {
    const result: PickingUpSyncResult = { synced: 0, errors: [], skipped: 0 };
    const code = (pricelistCode || this.defaultPricelistCode).trim();

    if (!code) {
      throw new Error('Código de lista de precios no especificado.');
    }

    if (!products || products.length === 0) {
      return result;
    }

    const priceEntries: PickingUpPriceEntry[] = [];

    for (const prod of products) {
      const itemCode = (prod.code || '').trim();
      if (!itemCode) {
        result.skipped = (result.skipped || 0) + 1;
        continue;
      }

      // Si el producto está inactivo, se envía 0 en ambos para deslistar según protocolo de PickingUp
      const isDelisted = prod.active === false;
      const wholesaleCost =
        typeof prod.cost === 'number' && !Number.isNaN(prod.cost) ? prod.cost : 0;
      const retailPrice =
        typeof prod.price === 'number' && !Number.isNaN(prod.price) ? prod.price : 0;

      priceEntries.push({
        item_code: itemCode,
        price: isDelisted ? 0 : Math.max(0, wholesaleCost),
        final_price: isDelisted ? 0 : Math.max(0, retailPrice),
      });
    }

    if (priceEntries.length === 0) {
      return result;
    }

    // Enviar en lotes de 100 precios
    const batches = chunkArray(priceEntries, 100);
    const endpoint = `/pricelists/${encodeURIComponent(code)}/prices`;

    for (const batch of batches) {
      try {
        await this.request(endpoint, {
          method: 'PUT',
          body: JSON.stringify(batch),
        });
        result.synced += batch.length;
      } catch (batchErr: any) {
        console.warn(`[PickingUp] Falló lote PUT ${endpoint}, reintentando individualmente:`, batchErr);
        for (const entry of batch) {
          try {
            await this.request(endpoint, {
              method: 'PUT',
              body: JSON.stringify([entry]),
            });
            result.synced++;
          } catch (singleErr: any) {
            result.errors.push(
              `Precio para producto "${entry.item_code}": ${singleErr?.message || singleErr}`
            );
          }
        }
      }
    }

    return result;
  }

  /**
   * Deshabilita un producto en PickingUp sin eliminar historial (Soft disable)
   * PATCH /products/{code} con { enabled: false }
   */
  public async disableProduct(productCode: string): Promise<void> {
    const code = (productCode || '').trim();
    if (!code) {
      throw new Error('Código de producto no especificado.');
    }
    await this.request(`/products/${encodeURIComponent(code)}`, {
      method: 'PATCH',
      body: JSON.stringify({ enabled: false }),
    });
  }

  /**
   * Consulta pedidos recibidos en PickingUp (paginado y filtrable)
   * GET /orders
   */
  public async getOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
  }): Promise<PickingUpOrder[]> {
    const query = new URLSearchParams();
    if (params?.page) query.set('page', String(params.page));
    if (params?.limit) query.set('limit', String(params.limit));
    if (params?.status) query.set('status', params.status);

    const qs = query.toString();
    const endpoint = qs ? `/orders?${qs}` : '/orders';

    const res = await this.request<any>(endpoint, { method: 'GET' });
    if (Array.isArray(res)) return res;
    if (Array.isArray(res?.data)) return res.data;
    if (Array.isArray(res?.items)) return res.items;
    return [];
  }

  /**
   * Actualiza el estado de un pedido (ej: 'processing', 'shipped', 'delivered')
   * PATCH /orders/{id}
   */
  public async updateOrderStatus(orderId: number, status: string): Promise<void> {
    if (!orderId) {
      throw new Error('ID de pedido inválido.');
    }
    await this.request(`/orders/${orderId}`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  }

  /**
   * Lista las listas de precios configuradas
   * GET /pricelists
   */
  public async getPricelists(): Promise<PickingUpPricelist[]> {
    try {
      const res = await this.request<any>('/pricelists', { method: 'GET' });
      if (Array.isArray(res)) return res;
      if (Array.isArray(res?.data)) return res.data;
      if (Array.isArray(res?.items)) return res.items;
      return [];
    } catch (err) {
      console.warn('[PickingUp] Error al obtener listas de precios:', err);
      return [];
    }
  }
}

// Instancia singleton por defecto
export const pickingUpService = new PickingUpService();
