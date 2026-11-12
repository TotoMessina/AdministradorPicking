import { useEffect, useState, type Ref } from 'react';
import { X } from 'lucide-react';
import { NumberInput } from '../../../components/NumberInput';
import type { Category, PriceRule, Product } from '../api';

// Campos de una regla de la lista y del porcentaje de ajuste.
export function RuleFields({ rule, index, products, categories, onChange, onRemove }: { rule: PriceRule; index: number; products: Product[]; categories: Category[]; onChange: (rule: PriceRule) => void; onRemove: () => void }) {
  const [query, setQuery] = useState('');
  const categoryOptions = categories.length ? categories.map(c => ({ id: c.id, name: c.name })) : [...new Map(products.map(p => [p.categoryId, { id: p.categoryId, name: p.category }])).values()];
  const options = rule.scope === 'category' ? categoryOptions : rule.scope === 'brand' ? [...new Map(products.filter(p => p.brand?.trim()).map(p => [p.brand!.trim().toLowerCase(), { id: p.brand!.trim().toLowerCase(), name: p.brand!.trim() }])).values()] : products.map(p => ({ id: p.id, name: `${p.name} · ${p.code}` }));
  const filtered = options.filter(o => o.name.toLowerCase().includes(query.toLowerCase())).slice(0, 100);
  const current = options.find(o => o.id === rule.target);
  if (current && !filtered.some(o => o.id === current.id)) filtered.unshift(current);
  return <div className="price-rule" role="group" aria-label={`Ajuste específico ${index + 1}`}><label>Aplicar a<select value={rule.scope} onChange={e => { onChange({ ...rule, scope: e.target.value as PriceRule['scope'], target: '' }); setQuery(''); }}><option value="category">Categoría</option><option value="brand">Marca</option><option value="product">Producto</option></select></label>
    <div className="price-rule-target">{options.length > 100 && <input aria-label={`Buscar destino del ajuste ${index + 1}`} value={query} onChange={e => setQuery(e.target.value)} placeholder="Buscar…" />}<label>Destino<select required value={rule.target} onChange={e => onChange({ ...rule, target: e.target.value })}><option value="">Elegí {rule.scope === 'category' ? 'una categoría' : rule.scope === 'brand' ? 'una marca' : 'un producto'}</option>{!!rule.target && !current && <option value={rule.target}>Destino guardado no disponible</option>}{filtered.map(o => <option key={o.id} value={o.id}>{o.name}</option>)}</select></label></div>
    <AdjustmentField label="Ajuste" value={rule.adjustment} onChange={adjustment => onChange({ ...rule, adjustment })} />
    <button type="button" className="text-button" onClick={onRemove} aria-label={`Quitar ajuste ${index + 1}`}><X size={16} aria-hidden="true" /></button>
  </div>;
}

export function AdjustmentField({ label, value, onChange, fieldRef }: { label: string; value: number; onChange: (value: number) => void; fieldRef?: Ref<HTMLInputElement> }) {
  const [direction, setDirection] = useState(value < 0 ? -1 : 1);
  useEffect(() => { if (value < 0) setDirection(-1); else if (value > 0) setDirection(1); }, [value]);
  return <fieldset className="price-adjustment"><legend>{label}</legend><div>
    <select aria-label={`${label}: aumentar o descontar`} value={direction} onChange={e => { const next = Number(e.target.value); setDirection(next); onChange(next * Math.abs(value)); }}><option value={1}>Aumentar</option><option value={-1}>Descontar</option></select>
    <NumberInput ref={fieldRef} aria-label={`${label} (%)`} required min="0" max={direction < 0 ? '99.99' : '10000'} step="0.01" value={Math.abs(value)} onValueChange={raw => onChange(raw === '' ? NaN : direction * Math.abs(Number(raw)))} /><span aria-hidden="true">%</span>
  </div></fieldset>;
}
