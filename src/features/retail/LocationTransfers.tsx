import { Banknote, Package, Plus } from 'lucide-react';
import { retail } from './api';
import { MoneyAccountEditor } from './MoneyAccountEditor';
import { TransferFlowMap } from './TransferFlowMap';
import { FundsInTransit } from './FundsInTransit';
import { useLocationTransfers, type LocationTransfersProps } from './locationTransfers/useLocationTransfers';
import { TransferFundSheet } from './locationTransfers/TransferFundSheet';
import { TransferComposer } from './locationTransfers/TransferComposer';
import { TransferHistory } from './locationTransfers/TransferHistory';

export function LocationTransfers(props: LocationTransfersProps) {
  const state = useLocationTransfers(props);
  const {
    store, branches, run, canStock, canFunds, isAdmin, only, mode, setMode, composing, selectedNode,
    setSelectedNode, selectedRoute, setSelectedRoute, items, notes, amount, fundNote, initialBranch,
    setInitialBranch, fundHistory, accounts, accountEditor, setAccountEditor, accountsMissing,
    setFormError, saving, setVisible, disabled, placeName, load, execute, clearSelection, routes, nodes,
    newTransfer,
  } = state;
  return <section className="retail-panel location-transfers" aria-labelledby="location-transfers-title">
    <div className="section-heading"><div><h2 id="location-transfers-title" className={only === 'money' ? 'sr-only' : undefined}>{only === 'money' ? 'Plata' : only === 'stock' ? 'Mover mercadería' : 'Mover entre locales'}</h2><p>{only === 'money' ? 'Tus cuentas de banco y billeteras, y el efectivo de cada local y del depósito: cuánto hay, los pases entre ellos, lo que entra y lo que sale, con su recibo.' : only === 'stock' ? 'Pasá mercadería entre tus locales y el depósito. Queda registrado quién lo hizo y cuándo.' : 'Pasá mercadería o plata entre tus locales, el depósito y tus cuentas. Queda registrado quién lo hizo y cuándo.'}</p></div>
      {!composing && <button type="button" className="primary-button" disabled={disabled || (mode === 'stock' && !store.branch_inventory_enabled)} onClick={newTransfer}><Plus size={16} />{(mode === 'stock' ? items.length || notes : amount || fundNote) ? 'Retomar borrador' : mode === 'money' ? 'Nuevo movimiento de plata' : 'Nueva transferencia'}</button>}
    </div>
    {!only && <div className="location-transfer-tabs" role="group" aria-label="Tipo de transferencia">
      {canStock && <button type="button" aria-pressed={mode === 'stock'} disabled={!!saving} onClick={() => { setMode('stock'); clearSelection(); setFormError(''); }}><Package size={16} /> Productos</button>}
      {canFunds && <button type="button" aria-pressed={mode === 'money'} disabled={!!saving} onClick={() => { setMode('money'); clearSelection(); setFormError(''); }}><Banknote size={16} /> Dinero</button>}
    </div>}
    {mode === 'stock' && !store.branch_inventory_enabled && <div className="location-transfer-setup">
      <h3>Distribuir el stock actual</h3><p>Lo guardado en depósito se conserva. Elegí dónde está hoy el stock del salón. Después podrás repartirlo con transferencias.</p>
      {isAdmin ? <><label>Sucursal inicial<select value={initialBranch} disabled={disabled} onChange={event => setInitialBranch(event.target.value)}><option value="">Elegir sucursal</option>{branches.map(branch => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></label>
        <p>Cerrá las cajas y sincronizá todos los dispositivos antes de activar.</p><button type="button" className="primary-button" disabled={disabled || !initialBranch} onClick={() => void execute('enable', () => retail.enableBranchInventory(store.id, initialBranch), 'Inventario distribuido sin duplicar existencias')}>Activar stock por sucursal y depósito</button></>
        : <p>Un administrador debe hacer la distribución inicial.</p>}
    </div>}
    {!composing && <details className="location-transfer-more"><summary>Ver mapa de movimientos</summary>
    <TransferFlowMap nodes={nodes} routes={routes} selectedNode={selectedNode} selectedRoute={selectedRoute}
      onNode={id => { setSelectedNode(previous => previous === id ? '' : id); setSelectedRoute(''); setVisible(25); }}
      onRoute={id => { setSelectedRoute(previous => previous === id ? '' : id); setSelectedNode(''); setVisible(25); }} onClear={clearSelection} />
    </details>}
    {mode === 'money' && !composing && <FundsInTransit storeId={store.id} transfers={fundHistory} placeName={placeName} run={run} disabled={disabled} onChanged={load} />}
    {mode === 'money' && !composing && accountEditor && <MoneyAccountEditor key={accountEditor === 'new' ? 'new' : accountEditor.id} storeId={store.id}
      account={accountEditor === 'new' ? undefined : accountEditor} accounts={accounts} disabled={disabled} execute={execute} onClose={() => setAccountEditor(null)} />}
    {mode === 'money' && !composing && !accountEditor && <div className="money-accounts-bar">
      <p>Cargá tu banco o billetera (Mercado Pago, por ejemplo). Lo que cobrás con QR, tarjeta o transferencia se suma solo, y desde acá anotás cuando sacás plata, pagás algo o la pasás a un local.</p>
      {accountsMissing ? <p role="status" className="info-banner">Para usar cuentas falta aplicar la actualización 202611040006 en Supabase.</p>
        : <button type="button" className="secondary-button" disabled={disabled} onClick={() => setAccountEditor('new')}><Plus size={15} /> Cuenta</button>}
    </div>}
    <TransferFundSheet state={state} />
    <TransferComposer state={state} />
    <TransferHistory state={state} />
  </section>;
}
