import { useEffect, useRef, useState } from 'react';
import { errorMessage, retail, type Product } from './api';
import type { Run } from './Management';
import { hasComposition } from '../../services/productComposition';
import { randomUUID } from '../../utils/uuid';

/** Explicit conversion from packet stock to individual units; never run while selling. */
export function LooseCigaretteEditor({ storeId, packet, products, busy, active, run, onSaved, onBack }: {
  storeId: string; packet: Product; products: Product[]; busy: boolean; active: boolean; run: Run; onSaved: () => void; onBack: () => void;
}) {
  const [units, setUnits] = useState('');
  const [target, setTarget] = useState<Product | null>(null);
  const [name, setName] = useState(`${packet.name.slice(0, 153)} suelto`);
  const [code, setCode] = useState(`${packet.code.slice(0, 92)}-SUELTO`);
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [error, setError] = useState('');
  const saving = useRef(false);
  const request = useRef({ signature: '', id: '' });
  const first = useRef<HTMLInputElement>(null);
  useEffect(() => { if (active) first.current?.focus(); }, [active]);
  const perPacket = Number(units);
  const expectedUnits = packet.stock * perPacket;
  const eligible = products.filter(product => product.id !== packet.id && product.active && product.sellable !== false &&
    ((!hasComposition(product) && product.stock === 0) || (product.stock_components?.length === 1 && product.stock_components[0].product_id === packet.id)));
  const candidates = target && !eligible.some(product => product.id === target.id) ? [...eligible, target] : eligible;
  const unitCost = cost.trim() ? Number(cost) : target?.cost ?? Math.round(packet.cost / perPacket * 100) / 100;
  const validUnits = Number.isInteger(perPacket) && perPacket >= 2 && perPacket <= 1000 && Number.isSafeInteger(expectedUnits) && expectedUnits >= 0 && expectedUnits <= 2147483647;
  return <form className="retail-form product-editor" onSubmit={async event => {
    event.preventDefault();
    if (!active || busy || saving.current) return;
    if (!validUnits) { setError('Revisá cuántos cigarrillos trae el atado.'); return; }
    const input = { unitsPerPacket: perPacket, target, name: target?.name || name.trim(), code: target?.code || code.trim(), price: Number(price), cost: unitCost };
    const signature = JSON.stringify(input);
    if (request.current.signature !== signature) request.current = { signature, id: randomUUID() };
    saving.current = true; setError('');
    try {
      if (await run(async () => {
        try { return await retail.enableLooseCigarettes(storeId, packet, request.current.id, input); }
        catch (error) {
          const message = errorMessage(error);
          setError(navigator.onLine === false || /fetch|network|timeout/i.test(message)
            ? 'No pudimos confirmar la conversión. Revisá la conexión y reintentá sin cambiar los datos: la misma solicitud no vuelve a convertir el stock.' : message);
          throw error;
        }
      }, 'Venta de cigarrillos sueltos configurada')) onSaved();
    } finally { saving.current = false; }
  }}>
    <h3>Vender cigarrillos sueltos</h3>
    <p>Atado: <strong>{packet.name}</strong>. El stock se contará en cigarrillos individuales.</p>
    <label>Cigarrillos por atado<input ref={first} type="number" required min="2" max="1000" step="1" placeholder="Ej. 10 o 20" disabled={busy} value={units} onChange={event => setUnits(event.target.value)} /></label>
    <label>Producto suelto<select disabled={busy} value={target?.id || ''} onChange={event => {
      const selected = candidates.find(product => product.id === event.target.value);
      setTarget(selected ? structuredClone(selected) : null); setPrice(selected ? String(selected.price) : ''); setCost(selected ? String(selected.cost) : ''); setError('');
    }}><option value="">Crear uno nuevo</option>{candidates.map(product => <option value={product.id} key={product.id}>{product.name}</option>)}</select></label>
    <fieldset className="form-grid" disabled={busy || !!target} hidden={!!target}>
      <label>Nombre del suelto<input required maxLength={160} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>Código interno del suelto<input required maxLength={100} value={code} onChange={event => setCode(event.target.value)} /></label>
    </fieldset>
    <div className="form-grid">
      <label>Precio por cigarrillo ($)<input type="number" min="0.01" max="9999999999" step="0.01" required disabled={busy} value={price} onChange={event => setPrice(event.target.value)} /></label>
      <label>Costo por cigarrillo ($)<input type="number" min="0" max="9999999999" step="0.01" disabled={busy} value={cost} placeholder={Number.isFinite(unitCost) ? String(unitCost) : ''} onChange={event => setCost(event.target.value)} /><small>{target ? 'Conserva el costo existente, salvo que lo edites.' : 'Si lo dejás vacío, usa el costo del atado dividido por sus cigarrillos, redondeado a centavos.'}</small></label>
    </div>
    <div className="composition-fields" aria-live="polite">
      <strong>{validUnits ? `${packet.stock} atados × ${perPacket} = ${expectedUnits} cigarrillos` : 'Revisá cuántos cigarrillos trae el atado.'}</strong>
      <p>Guardar convierte esas existencias una sola vez. El atado pasa a descontar {validUnits ? perPacket : 'sus'} cigarrillos por venta; un suelto descuenta 1.</p>
      <p>El precio del atado se conserva. Su costo se calcula como {validUnits ? perPacket : 'las unidades'} × costo por cigarrillo{validUnits && Number.isFinite(unitCost) && unitCost > 0 ? `: $${(Math.round(unitCost * 100) * perPacket / 100).toLocaleString('es-AR')}` : ' (pendiente si falta ese costo)'}. La reposición se carga sobre el suelto, por atados{validUnits ? ` de ${perPacket} cigarrillos` : ''}.</p>
      {target && hasComposition(target) && <p>Se reemplaza la vinculación inversa de {target.name} con este atado. No se cambian ventas anteriores.</p>}
    </div>
    <small>Con conexión y sin operaciones pendientes. Sincronizá los otros dispositivos antes de convertir el stock.</small>
    {error && <p role="alert">{error}</p>}
    <div className="button-row product-editor-actions"><button className="primary-button" disabled={busy || !validUnits}>Convertir stock y habilitar sueltos</button>
      <button type="button" className="secondary-button" disabled={busy} onClick={onBack}>Volver a componentes</button></div>
  </form>;
}
