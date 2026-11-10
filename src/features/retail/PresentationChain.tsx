import { Boxes, Layers, Package, PackageOpen } from 'lucide-react';

const whole = (value: string) => { const number = Number(value); return value.trim() && Number.isInteger(number) && number >= 1 ? number : null; };
const units = (value: number) => `${value.toLocaleString('es-AR')} u.`;

/**
 * Cómo se arma el producto, de la unidad al pallet: cada eslabón dice cuántas trae del anterior.
 * Solo dibuja las presentaciones cargadas; si el bulto no se arma con displays enteros, no los encadena.
 */
export function PresentationChain({ displayUnits, packUnits, palletPacks, buying }: { displayUnits: string; packUnits: string; palletPacks: string; buying?: 'unit' | 'display' | 'pack' }) {
  const display = whole(displayUnits), pack = whole(packUnits), pallet = whole(palletPacks);
  const displaysPerPack = display && display > 1 && pack && pack % display === 0 && pack > display ? pack / display : null;
  const steps = [
    { id: 'unit', icon: <PackageOpen size={18} />, name: 'Unidad', total: 1, link: '' },
    ...(display && display > 1 ? [{ id: 'display', icon: <Layers size={18} />, name: 'Display', total: display, link: `× ${display}` }] : []),
    ...(pack && pack > 1 ? [{ id: 'pack', icon: <Package size={18} />, name: 'Bulto', total: pack, link: displaysPerPack ? `× ${displaysPerPack}` : `× ${pack} u.` }] : []),
    ...(pack && pallet ? [{ id: 'pallet', icon: <Boxes size={18} />, name: 'Pallet', total: pack * pallet, link: `× ${pallet}` }] : []),
  ];
  if (steps.length < 2) return null;
  return <ol className="presentation-chain" aria-label={`Cómo viene: ${steps.map(step => `${step.name} ${units(step.total)}`).join(', ')}`}>
    {steps.map(step => <li key={step.id} className={buying === step.id ? 'is-buying' : undefined}>
      {step.link && <span className="presentation-chain-link" aria-hidden="true">{step.link}</span>}
      <span className="presentation-chain-node">{step.icon}<strong>{step.name}</strong><small>{units(step.total)}</small>{buying === step.id && <em>Comprás así</em>}</span>
    </li>)}
  </ol>;
}
