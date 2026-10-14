import { useEffect, useState } from 'react';
import type { KioscoSale } from '../../types/kiosco';
import { retail, errorMessage, type Branch, type Register, type Shift, type SalesLedger } from './api';
import type { Run } from './Management';
import { salesCsv } from './pricing';

const money = (n: number) => '$' + n.toLocaleString('es-AR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Argentina/Buenos_Aires', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function SalesOverview({ storeId, branches, registers, shifts, ledgers, revision, run, busy, onTicket }: { storeId: string; branches: Branch[]; registers: Register[]; shifts: Shift[]; ledgers: SalesLedger[]; revision: number; run: Run; busy: boolean; onTicket: (s: KioscoSale) => void }) {
  const [from, setFrom] = useState(today);
  const [to, setTo] = useState(today);
  const [period, setPeriod] = useState({ from: today(), to: today() });
  const [branch, setBranch] = useState('');
  const [ledger, setLedger] = useState('');
  const [invoice, setInvoice] = useState('');
  const [rows, setRows] = useState<KioscoSale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [limit, setLimit] = useState(50);
  useEffect(() => {
    let active = true; setLoading(true); setError(''); setRows([]); setLimit(50);
    const end = new Date(`${period.to}T00:00:00-03:00`); end.setTime(end.getTime() + 86400000);
    retail.reportSales(storeId, new Date(`${period.from}T00:00:00-03:00`).toISOString(), end.toISOString())
      .then(data => { if (active) setRows(data); })
      .catch(e => { if (active) setError(errorMessage(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [storeId, period, revision]);
  const visible = rows.filter(s => (!branch || s.branchId === branch) && (!ledger || s.ledgerId === ledger) && (!invoice || (invoice === 'yes') === !!s.invoiceReference));
  const exportAll = () => {
    const url = URL.createObjectURL(new Blob([salesCsv(rows)], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `ventas-completas-${period.from}-${period.to}.csv`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <section className="retail-panel sales-overview"><h2>Resumen del comercio</h2>
    <p>Consultá todas las sucursales y los registros de ventas. El archivo incluye todas las operaciones del período, con su estado de comprobante.</p>
    <form className="business-controls" onSubmit={e => { e.preventDefault(); if (from <= to) setPeriod({ from, to }); }}>
      <label>Desde<input type="date" required value={from} max={to} onChange={e => setFrom(e.target.value)} /></label>
      <label>Hasta<input type="date" required value={to} min={from} onChange={e => setTo(e.target.value)} /></label>
      <button className="secondary-button" disabled={loading || busy}>Consultar</button>
      <button type="button" className="secondary-button" disabled={loading || !!error || !rows.length || busy} onClick={exportAll}>Exportar período completo (CSV)</button>
    </form>
    <p>Período consultado: {period.from} al {period.to} · Hora de Argentina.</p>
    {loading ? <p role="status">Cargando todas las ventas del período…</p> : error ? <p role="alert">{error}</p> : <>
      <div className="cash-metrics"><div><small>Total del comercio</small><strong>{money(rows.reduce((n, s) => n + s.total, 0))}</strong></div><div><small>Con comprobante asociado</small><strong>{money(rows.filter(s => s.invoiceReference).reduce((n, s) => n + s.total, 0))}</strong></div><div><small>Sin comprobante asociado</small><strong>{money(rows.filter(s => !s.invoiceReference).reduce((n, s) => n + s.total, 0))}</strong></div></div>
      <div className="table-scroll"><table><thead><tr><th>Sucursal</th><th>Cajas activas</th><th>Turnos abiertos</th><th>Ventas del período</th></tr></thead><tbody>{branches.map(b => <tr key={b.id}><td>{b.name}</td><td>{registers.filter(r => r.branch_id === b.id && r.active).length}</td><td>{shifts.filter(s => !s.closed_at && registers.some(r => r.id === s.register_id && r.branch_id === b.id)).length}</td><td>{money(rows.filter(s => s.branchId === b.id).reduce((n, s) => n + s.total, 0))}</td></tr>)}</tbody></table></div>
      <div className="business-controls">
        <label>Sucursal del informe<select value={branch} onChange={e => { setBranch(e.target.value); setLimit(50); }}><option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <label>Registro del informe<select value={ledger} onChange={e => { setLedger(e.target.value); setLimit(50); }}><option value="">Todos los registros</option>{ledgers.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}</select></label>
        <label>Comprobante<select value={invoice} onChange={e => { setInvoice(e.target.value); setLimit(50); }}><option value="">Todos los estados</option><option value="yes">Con comprobante asociado</option><option value="no">Sin comprobante asociado</option></select></label>
      </div>
      <p>{visible.length} ventas en la consulta · {money(visible.reduce((n, s) => n + s.total, 0))}</p>
      <div className="table-scroll"><table><thead><tr><th>Venta</th><th>Sucursal / caja</th><th>Lista / registro</th><th>Total</th><th>Comprobante externo</th></tr></thead><tbody>
        {visible.slice(0, limit).map(s => <tr key={s.id}><td><button className="text-button" onClick={() => onTicket(s)}>{s.ticketNumber}</button><small>{s.date} {s.timestamp}</small></td><td>{s.branchName}<small>{s.registerName}</small></td><td>{s.priceListName}<small>{s.ledgerName}</small></td><td>{money(s.total)}</td><td>{s.invoiceReference || <details><summary>Sin comprobante · Asociar</summary><form className="retail-form" onSubmit={e => { e.preventDefault(); const reference = String(new FormData(e.currentTarget).get('reference')); void run(() => retail.attachInvoice(s.id, reference), 'Comprobante asociado'); }}><label>Referencia del comprobante ya emitido<input name="reference" required maxLength={120} placeholder="Tipo, punto de venta y número" /></label><p>Se guarda la referencia y quién la asoció. Esta acción no emite ni valida una factura.</p><button className="secondary-button" disabled={busy}>Asociar comprobante</button></form></details>}</td></tr>)}
        {!visible.length && <tr><td colSpan={5}>No hay ventas para esta consulta.</td></tr>}
      </tbody></table></div>
      {visible.length > limit && <button className="secondary-button" onClick={() => setLimit(n => n + 50)}>Ver más ventas</button>}
    </>}
  </section>;
}
