import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, ChevronRight, ClipboardList } from 'lucide-react';

export interface HomeAction { id: string; label: string; hint: string; icon: LucideIcon; onClick: () => void; main?: boolean }

const pesos = (value: number) => value.toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

/** Ventas de los últimos 7 días: una sola serie, con el valor al pasar el mouse o al tocar. */
function WeekSales({ days }: { days: { label: string; day: string; total: number }[] }) {
  const top = Math.max(...days.map(day => day.total));
  if (!top) return null;
  return <section className="home-week" aria-label="Ventas de los últimos 7 días">
    <h2>Ventas de la semana</h2>
    <ol className="home-week-bars">
      {days.map(day => <li key={day.day} title={`${day.label}: ${pesos(day.total)}`}>
        <small>{day.total === top ? pesos(day.total) : '\u00a0'}</small>
        <span className="home-week-track"><span className="home-week-bar" style={{ height: `${Math.max(day.total ? 4 : 0, day.total / top * 100)}%` }} /></span>
        <small>{day.label}</small>
        <span className="sr-only">{pesos(day.total)}</span>
      </li>)}
    </ol>
  </section>;
}

/** Primera pantalla: cómo está el comercio y un botón grande por cada tarea diaria. */
export function HomeTab({ place, cashOpen, sold, week, lowStock, remitos, actions, disabled, onLowStock, onRemitos }: {
  place: string; cashOpen: boolean; sold: { total: number; tickets: number } | null; week: { label: string; day: string; total: number }[]; lowStock: string[]; remitos: number;
  actions: HomeAction[]; disabled: boolean; onLowStock?: () => void; onRemitos?: () => void;
}) {
  const allGood = !lowStock.length && !remitos;
  return <div className="home-tab">
    <section className={`home-status ${cashOpen ? 'is-open' : ''}`} aria-label="Estado del comercio">
      <div><small>{place}</small><strong>{cashOpen ? 'La caja está abierta' : 'La caja está cerrada'}</strong></div>
      {sold && <div className="home-sold"><small>Vendido hoy</small><strong>{sold.total.toLocaleString('es-AR', { style: 'currency', currency: 'ARS' })}</strong><small>{sold.tickets} {sold.tickets === 1 ? 'venta' : 'ventas'}</small></div>}
    </section>

    <div className="home-actions">
      {actions.map(({ id, label, hint, icon: Icon, onClick, main }) => <button key={id} type="button" className={`home-action ${main ? 'is-main' : ''}`} disabled={disabled} onClick={onClick}>
        <span className="home-action-icon"><Icon size={main ? 34 : 26} aria-hidden="true" /></span>
        <strong>{label}</strong><small>{hint}</small>
      </button>)}
    </div>

    {week.length > 0 && <WeekSales days={week} />}

    <section className="home-alerts" aria-label="Avisos">
      {allGood && <p className="home-alert is-good"><CheckCircle2 size={20} aria-hidden="true" /><span><strong>Todo en orden</strong><small>No hay nada para resolver ahora.</small></span></p>}
      {lowStock.length > 0 && <button type="button" className="home-alert is-warning" disabled={disabled || !onLowStock} onClick={onLowStock}>
        <AlertTriangle size={20} aria-hidden="true" />
        <span><strong>{lowStock.length === 1 ? 'Queda poco de 1 producto' : `Queda poco de ${lowStock.length} productos`}</strong><small>{lowStock.slice(0, 3).join(', ')}{lowStock.length > 3 ? '…' : ''}</small></span>
        {onLowStock && <ChevronRight size={18} aria-hidden="true" />}
      </button>}
      {remitos > 0 && <button type="button" className="home-alert" disabled={disabled || !onRemitos} onClick={onRemitos}>
        <ClipboardList size={20} aria-hidden="true" />
        <span><strong>{remitos === 1 ? '1 remito para revisar' : `${remitos} remitos para revisar`}</strong><small>Mercadería cargada que espera tu aprobación.</small></span>
        {onRemitos && <ChevronRight size={18} aria-hidden="true" />}
      </button>}
    </section>
  </div>;
}
