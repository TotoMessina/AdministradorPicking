import type { Product, Category } from '../../features/retail/api';
import { invoiceRulesPrompt, type SupplierInvoiceRules } from '../../services/supplierInvoiceRules';
import { resolveProductCategory } from '../../services/productCategoryService';

// Rubro sugerido y pedido a la IA para leer la factura.
export function resolveCategory(
  suggestedCategory: string | undefined,
  productName: string,
  availableCategories: Category[],
): string {
  return resolveProductCategory(availableCategories, suggestedCategory, productName);
}

export function buildParsePrompt(invoiceText: string, categories: Category[] = [], _products: Product[] = [], rules: SupplierInvoiceRules = {}): string {
  const categoryNames = categories.map((c) => c.name.trim()).filter(Boolean);
  const categoriesHint = categoryNames.length > 0 ? `Categorías disponibles: ${categoryNames.slice(0, 15).join(', ')}.` : '';

  return `Analizá el siguiente texto de una factura o remito de compra de kiosco.
Identificá el proveedor (la empresa que EMITE la factura) y extraé la lista completa de todos los productos facturados.
Ignorá datos fiscales, CUIT, direcciones, fechas, subtotales y totales generales.

Respondé ÚNICAMENTE un objeto JSON válido con esta estructura, sin texto explicativo ni formato markdown:
{
  "proveedor": "Nombre de la empresa emisora, o vacío si no se lee",
  "items": [
    {
      "invoice_line": "Renglón original del producto tal como figura en la factura",
      "name": "Nombre comercial claro del producto",
      "code": "Código de barras o código interno si figura, o null",
      "qty": 1,
      "cost": 1500.0,
      "unitsPerPack": 1,
      "category": "Golosinas"
    }
  ]
}

Reglas:
- Extraé cada producto o artículo facturado.
- qty: cantidad comprada (número).
- proveedor: es quien vende y emite la factura (logo o razón social del encabezado, junto a su CUIT). Nunca uses el cliente o comprador (Cliente, Razón Social del receptor, Sr./Señores, Domicilio de entrega). Si no se lee, dejalo vacío.
- cost: precio unitario de COMPRA facturado (columnas como Unitario, P. Unit., Pr Unit, Precio o P. Lista; número sin signo $). Nunca uses columnas de precio Sugerido, P.V.P., Precio público o de venta al público: son precios de venta, no costo.
- unitsPerPack: si viene en bulto/display/caja (ej: X24, X12, Pack x 6), poné la cantidad de unidades; si es suelto o no especifica, poné 1.
- Cigarrillos: el atado es la unidad. Los cigarrillos por atado ("x20u.", "KS 20", "BOX 20", "SOF 20") NO son unitsPerPack: poné 1. Si dice "x10 ATADOS" es un cartón: unitsPerPack 10.
${categoriesHint ? `- category: asigná la categoría más adecuada (${categoriesHint}) o "Varios".` : ''}${invoiceRulesPrompt(rules)}

TEXTO DEL COMPROBANTE:
${invoiceText}`;
}

// ─── Main Component ──────────────────────────────────────────────────────────
