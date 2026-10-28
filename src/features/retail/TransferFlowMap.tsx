import { useId } from 'react';
import { ArrowRight, Building2, Warehouse, X } from 'lucide-react';

export interface TransferMapNode { id: string; name: string; summary: string }
export interface TransferMapRoute { id: string; from: string; to: string; summary: string; count: number }
export function TransferFlowMap({ nodes, routes, selectedNode, selectedRoute, onNode, onRoute, onClear }: {
  nodes: TransferMapNode[]; routes: TransferMapRoute[]; selectedNode: string; selectedRoute: string;
  onNode: (id: string) => void; onRoute: (id: string) => void; onClear: () => void;
}) {
  const arrow = `flow-arrow-${useId().replace(/:/g, '')}`;
  const branches = nodes.filter(node => node.id !== 'depot');
  const height = Math.max(310, Math.ceil(branches.length / 2) * 125 + 60);
  const positions = new Map(nodes.map(node => {
    const index = branches.findIndex(branch => branch.id === node.id);
    return [node.id, node.id === 'depot' ? { x: 35, y: height / 2 - 45 } : { x: 365 + (index % 2) * 260, y: 35 + Math.floor(index / 2) * 125 }];
  }));
  const drawn = selectedRoute ? routes.filter(route => route.id === selectedRoute)
    : selectedNode ? routes.filter(route => route.from === selectedNode || route.to === selectedNode) : routes.slice(0, 8);
  const path = (from: string, to: string, offset = 0) => {
    const a = positions.get(from), b = positions.get(to);
    if (!a || !b) return '';
    if (a.x === b.x) return `M${a.x + 190},${a.y + 45} C${a.x + 225 + offset},${a.y + 45} ${b.x + 225 + offset},${b.y + 45} ${b.x + 190},${b.y + 45}`;
    const ax = a.x + (a.x < b.x ? 190 : 0), bx = b.x + (a.x < b.x ? 0 : 190), middle = (ax + bx) / 2;
    return `M${ax},${a.y + 45} C${middle + offset},${a.y + 45} ${middle + offset},${b.y + 45} ${bx},${b.y + 45}`;
  };
  return <section className="transfer-flow" aria-label="Mapa de sucursales y depósito">
    <div className="transfer-flow-heading"><span>Seleccioná una ubicación o un recorrido para ver su historial</span>
      {(selectedNode || selectedRoute) && <button type="button" className="text-button" onClick={onClear}><X size={13} /> Ver todo</button>}
    </div>
    <div className="transfer-flow-scroll" tabIndex={0} role="region" aria-label="Diagrama desplazable de ubicaciones">
      <div className="transfer-flow-canvas" style={{ height }}>
        <svg viewBox={`0 0 900 ${height}`} preserveAspectRatio="none" aria-hidden="true">
          <defs><marker id={arrow} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 z" fill="currentColor" /></marker></defs>
          {branches.map(branch => <path key={branch.id} d={path('depot', branch.id)} className="transfer-flow-guide" />)}
          {drawn.map((route, index) => <path key={route.id} d={path(route.from, route.to, (index % 3) * 12)} className="transfer-flow-arrow" markerEnd={`url(#${arrow})`}><title>{route.summary}</title></path>)}
        </svg>
        {nodes.map(node => { const point = positions.get(node.id)!; return <button type="button" key={node.id}
          className={`transfer-flow-node ${node.id === 'depot' ? 'is-depot' : ''}`} aria-pressed={selectedNode === node.id}
          style={{ left: `${point.x / 9}%`, top: point.y, width: `${190 / 9}%` }} onClick={() => onNode(node.id)}>
          {node.id === 'depot' ? <Warehouse size={23} /> : <Building2 size={22} />}<span><strong title={node.name}>{node.name}</strong><small>{node.summary}</small></span>
        </button>; })}
      </div>
    </div>
    {drawn.length > 0 && <div className="transfer-flow-routes" role="group" aria-label="Recorridos del historial cargado">
      {drawn.map(route => <button type="button" key={route.id} aria-pressed={selectedRoute === route.id} onClick={() => onRoute(route.id)}>
        {nodes.find(node => node.id === route.from)?.name || 'Ubicación anterior'} <ArrowRight size={13} /> {nodes.find(node => node.id === route.to)?.name || 'Ubicación anterior'}
        <small>{route.count} movimientos · {route.summary}</small>
      </button>)}
    </div>}
    {!drawn.length && <p className="transfer-flow-empty">Sin recorridos en el historial cargado. Las líneas punteadas muestran las conexiones disponibles.</p>}
  </section>;
}
