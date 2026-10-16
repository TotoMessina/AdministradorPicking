import type { KioscoSale } from '../../types/kiosco';
export const cashInSale = (sale: KioscoSale) => sale.payments
  ? sale.payments.filter(p => p.method === 'Efectivo').reduce((sum, p) => sum + Number(p.amount), 0)
  : sale.paymentMethod === 'Efectivo' ? sale.total : 0;
export const cents = (value: number) => Math.round(value * 100);
