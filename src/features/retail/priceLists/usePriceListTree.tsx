import { AlertCircle, Building2, CornerDownRight, Eye, Pencil, Plus, SlidersHorizontal, Store, TrendingUp } from 'lucide-react';
import type { PriceList } from '../api';
import { percent, origin, sourceName } from './priceListHelpers';
import type { priceListSettingsProps } from './usePriceListSettings';
import type { usePriceListSelection } from './usePriceListSelection';

/** Árbol de listas (de costo y de otras listas) y acciones de guardar y borrar. */
export function usePriceListTree(ctx: ReturnType<typeof priceListSettingsProps> & ReturnType<typeof usePriceListSelection>) {
  const { lists, branches, busy, selected, sessions, start, inspect } = ctx;
  interface TreeNode {
    list: PriceList;
    children: TreeNode[];
  }
  const visited = new Set<string>();
  const buildTree = (sourceId: string, depth = 0): TreeNode[] => {
    if (depth >= 12) return [];
    return lists
      .filter(l => origin(l) === sourceId && !visited.has(l.id))
      .map(l => {
        visited.add(l.id);
        return {
          list: l,
          children: buildTree(l.id, depth + 1),
        };
      });
  };

  const costTree = buildTree('cost');
  const catalogTree = buildTree('catalog');
  const orphanNodes: TreeNode[] = lists
    .filter(l => !visited.has(l.id))
    .map(list => ({ list, children: [] }));

  const renderTree = (items: TreeNode[], depth = 0) => {
    if (!items.length) return null;
    return (
      <ol className={`price-tree-list depth-${depth}`}>
        {items.map(({ list: l, children }) => {
          const isSelected = selected === l.id;
          const branchName = l.branch_id ? branches.find(b => b.id === l.branch_id)?.name : null;
          const parentName = sourceName(origin(l), lists);
          const rulesCount = l.pricing_rules?.length || 0;
          const isEditing = sessions.some(s => s.key === l.id);

          return (
            <li key={l.id} className="price-tree-item">
              <article className={`price-flow-node ${l.is_primary ? 'is-primary' : ''} ${isSelected ? 'selected' : ''}`}>
                <div className="price-flow-main">
                  <button
                    type="button"
                    className="price-flow-name"
                    onClick={() => inspect(l.id)}
                    aria-pressed={isSelected}
                    aria-label={`Ver precios de ${l.name}`}
                  >
                    <div className="price-node-title-row">
                      <span className="price-node-icon" aria-hidden="true">
                        {l.is_primary ? <Store size={15} /> : <TrendingUp size={14} />}
                      </span>
                      <strong className="price-node-name">{l.name}</strong>
                      {l.is_primary && (
                        <span className="price-primary-pill">Principal</span>
                      )}
                    </div>
                    <span className="price-node-origin">
                      {l.is_primary ? (
                        'Costo base + margen individual de cada producto'
                      ) : (
                        <>
                          <CornerDownRight size={11} aria-hidden="true" />
                          <span>Deriva de <strong>{parentName}</strong></span>
                        </>
                      )}
                    </span>
                  </button>

                  {!l.is_primary && (
                    <button
                      type="button"
                      className={`price-percent ${l.adjustment > 0 ? 'is-markup' : l.adjustment < 0 ? 'is-discount' : 'is-neutral'}`}
                      disabled={busy}
                      onClick={() => start(origin(l), l, true)}
                      aria-label={`Editar porcentaje de ${l.name}: ${percent(l.adjustment)}`}
                      title="Clic para editar porcentaje general"
                    >
                      <Pencil size={11} aria-hidden="true" />
                      <span>{percent(l.adjustment)}</span>
                    </button>
                  )}
                </div>

                {(rulesCount > 0 || branchName || !l.active) && (
                  <div className="price-flow-badges">
                    {rulesCount > 0 && (
                      <span className="price-badge-item" title="Reglas por categoría o marca">
                        <SlidersHorizontal size={11} aria-hidden="true" />
                        <span>{rulesCount} {rulesCount === 1 ? 'regla' : 'reglas'}</span>
                      </span>
                    )}
                    {branchName && (
                      <span className="price-badge-item" title="Exclusiva para esta sucursal">
                        <Building2 size={11} aria-hidden="true" />
                        <span>{branchName}</span>
                      </span>
                    )}
                    {!l.active && (
                      <span className="price-badge-item is-inactive">
                        <AlertCircle size={11} aria-hidden="true" />
                        <span>Inactiva</span>
                      </span>
                    )}
                  </div>
                )}

                <div className="price-flow-actions">
                  <button
                    type="button"
                    className={`price-action-link ${isSelected ? 'active-view' : ''}`}
                    onClick={() => inspect(l.id)}
                    aria-label={`Ver precios de ${l.name}`}
                  >
                    <Eye size={13} aria-hidden="true" />
                    <span>{isSelected ? 'Viendo precios' : 'Ver precios'}</span>
                  </button>
                  <button
                    type="button"
                    className="price-action-link"
                    disabled={busy}
                    onClick={() => start(origin(l), l)}
                    aria-label={`Editar ${l.name}`}
                  >
                    <Pencil size={13} aria-hidden="true" />
                    <span>{isEditing ? 'Continuar' : 'Editar'}</span>
                  </button>
                  <button
                    type="button"
                    className="price-action-link price-action-add"
                    disabled={busy}
                    onClick={() => start(l.id)}
                    aria-label={`Crear una lista que salga de ${l.name}`}
                    title={`Crear una lista que salga de ${l.name}`}
                  >
                    <Plus size={13} aria-hidden="true" />
                    <span>Derivar lista</span>
                  </button>
                </div>
              </article>

              {children.length > 0 && renderTree(children, depth + 1)}
            </li>
          );
        })}
      </ol>
    );
  };

  return { visited, buildTree, costTree, catalogTree, orphanNodes, renderTree };
}
