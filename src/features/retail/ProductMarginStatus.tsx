import { lowMarginThreshold, productMargin } from '../../services/productMarginService';
import './product-margin.css';

export function ProductMarginStatus({ price, cost, threshold }: { price: number; cost?: number | null; threshold?: number | null }) {
  const margin = productMargin(price, cost, threshold);
  const limit = lowMarginThreshold(threshold);
  const percent = margin.percent === null ? '' : margin.group === 'low_margin' && Math.round(margin.percent * 100) / 100 >= limit
    ? `menos del ${limit.toLocaleString('es-AR')}%`
    : `${margin.percent.toLocaleString('es-AR', { maximumFractionDigits: 2 })}%`;
  return <div className={`product-margin-status${margin.group === 'low_margin' ? ' product-margin-low' : ''}${margin.belowCost ? ' product-margin-loss' : ''}`} role="status" aria-live="polite" aria-atomic="true">
    <strong>{margin.percent === null ? 'Margen sin calcular' : `${margin.belowCost ? 'Venta por debajo del costo' : margin.group === 'low_margin' ? 'Bajo margen automático' : 'Margen bruto'} · ${percent}`}</strong>
    <small>{margin.percent === null ? 'Completá un precio y un costo mayores a cero para calcularlo.' : `Límite del comercio: menor al ${lowMarginThreshold(threshold).toLocaleString('es-AR')}% sobre el precio base. No incluye otros gastos.`}</small>
  </div>;
}
