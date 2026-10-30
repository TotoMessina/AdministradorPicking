/** Importes del pie de la factura, como figuran en el Libro IVA Compras. */
export const PURCHASE_AMOUNT_FIELDS = [
  { id: 'net_21', label: 'Neto gravado 21%' },
  { id: 'vat_21', label: 'IVA 21%' },
  { id: 'net_10_5', label: 'Neto gravado 10,5%' },
  { id: 'vat_10_5', label: 'IVA 10,5%' },
  { id: 'net_27', label: 'Neto gravado 27%' },
  { id: 'vat_27', label: 'IVA 27%' },
  { id: 'untaxed', label: 'No gravado / exento' },
  { id: 'internal_taxes', label: 'Impuestos internos' },
  { id: 'vat_perceptions', label: 'Percepción IVA' },
  { id: 'iibb_perceptions', label: 'Percepción IIBB' },
  { id: 'other_taxes', label: 'Otros tributos' },
  { id: 'total', label: 'Total' },
] as const;
export type PurchaseAmountField = typeof PURCHASE_AMOUNT_FIELDS[number]['id'];
