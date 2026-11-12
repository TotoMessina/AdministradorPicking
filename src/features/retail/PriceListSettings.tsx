import { CircleHelp, Coins, LockKeyhole, Plus } from 'lucide-react';
import './permission-profiles.css';
import './price-lists.css';
import { origin } from './priceLists/priceListHelpers';
import { PriceListEditor } from './priceLists/PriceListEditor';
import { usePriceListSettings, type PriceListSettingsProps } from './priceLists/usePriceListSettings';
import { PriceListPreview } from './priceLists/PriceListPreview';

export function PriceListSettings(props: PriceListSettingsProps) {
  const state = usePriceListSettings(props);
  const {
    lists, overrides, products, categories, branches, run, busy, primary, selected, setSelected,
    sessions, active, percentageTarget, heading, start, close, inspect, costTree, catalogTree,
    orphanNodes, renderTree,
  } = state;
  return <section className="retail-panel price-list-settings" aria-label="Listas de precios">
    <div className="price-lists-heading"><h3 ref={heading} tabIndex={-1}>Listas de precios</h3>
      <button type="button" className="primary-button" disabled={busy || !primary} onClick={() => start(primary!.id)}><Plus size={16} aria-hidden="true" /> Crear lista</button>
    </div>
    <div className={`price-lists-layout${active ? ' editing' : ''}`}>
      <div className="price-flow" aria-label="Listas y de cuál sale cada una">
        <div className="price-flow-tree-header">
          <span className="price-flow-tree-title">Estructura jerárquica de listas</span>
          <span className="price-flow-tree-subtitle">Elegí cualquier lista para consultar o fijar sus precios</span>
        </div>

        {/* Nodo Raíz: Costo */}
        <div className={`price-flow-root ${selected === 'cost' ? 'selected' : ''}`}>
          <button
            type="button"
            className="price-flow-name"
            aria-pressed={selected === 'cost'}
            onClick={() => inspect('cost')}
          >
            <div className="price-node-title-row">
              <span className="price-node-icon price-root-icon" aria-hidden="true">
                <Coins size={16} />
              </span>
              <div className="price-root-text">
                <strong className="price-node-name">Costo de reposición</strong>
                <span className="price-node-origin">Base de compra sin recargos</span>
              </div>
            </div>
          </button>
          <div className="price-root-meta">
            <span className="price-origin-badge">
              <LockKeyhole size={12} aria-hidden="true" /> Solo consulta
            </span>
            {selected === 'cost' && (
              <span className="price-viewing-badge">Viendo costos</span>
            )}
            {primary && (
              <button type="button" className="price-action-link price-action-add" disabled={busy} onClick={() => start('cost')} aria-label="Crear una lista que salga del costo" title="Crear una lista con un porcentaje sobre el costo">
                <Plus size={13} aria-hidden="true" />
                <span>Derivar lista</span>
              </button>
            )}
          </div>
        </div>

        {!!costTree.length && renderTree(costTree, 0)}

        {primary ? (
          catalogTree.length > 0 && renderTree(catalogTree, 0)
        ) : (
          <details className="price-catalog-origin" open={!costTree.length && catalogTree.length ? true : undefined}>
            <summary>Catálogo legado{catalogTree.length ? ` · ${catalogTree.length} listas` : ''}</summary>
            <div className="price-flow-root">
              <button type="button" className="price-flow-name" aria-pressed={selected === 'catalog'} onClick={() => inspect('catalog')}>
                <strong>Precios del catálogo</strong>
              </button>
              <button type="button" className="text-button" disabled={busy} onClick={() => start('catalog')} aria-label="Crear lista desde el catálogo">
                <Plus size={14} aria-hidden="true" /> Derivar lista
              </button>
            </div>
            {renderTree(catalogTree, 0)}
          </details>
        )}

        {!primary && <p role="status">Instalá la actualización de lista principal para crear nuevas listas.</p>}
        {!!orphanNodes.length && (
          <div className="price-orphan-block">
            <p role="status">Listas con origen a revisar:</p>
            {renderTree(orphanNodes, 0)}
          </div>
        )}
      </div>
      <div hidden={!active} className="price-list-workspace">{sessions.map(s => <div key={s.key} hidden={active !== s.key}>
        <PriceListEditor session={s} active={active === s.key} percentageFocus={percentageTarget.key === s.key ? percentageTarget.request : 0} lists={lists} overrides={overrides} products={products} categories={categories} branches={branches} run={run} busy={busy} onCancel={() => close(s.key)} onSaved={() => { setSelected(s.draft.id); close(s.key); }} onDeleted={() => { setSelected(prev => prev === s.draft.id ? 'cost' : prev); close(s.key); }} onEditDerived={l => start(origin(l), l)} />
      </div>)}</div>
    <PriceListPreview state={state} />
    </div>
    <details className="price-list-guide"><summary><CircleHelp size={14} aria-hidden="true" /> Cómo se calcula</summary>
      <p><strong>La Principal</strong> es tu precio de siempre: sale del costo de cada producto más su ganancia.</p>
      <p><strong>Las otras listas salen de una anterior</strong> con un porcentaje. Ejemplo: «Mayorista» = Principal −10%. Si cambia la Principal, cambia sola. Podés ajustar por categoría, marca o producto: se aplican en ese orden ($100 +50% −10% = $135).</p>
      <p><strong>Un precio fijo</strong> deja ese producto quieto en esa lista; borralo para que vuelva a calcularse.</p>
      <p><strong>En cada local</strong> se vende con la lista que tenga elegida; si no tiene ninguna, con la Principal. Cambiar una lista no toca tickets ya hechos ni ventas a medio cobrar.</p>
    </details>
  </section>;
}
