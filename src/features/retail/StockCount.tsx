import { ClipboardList, Plus, RefreshCw } from 'lucide-react';
import './stock-count.css';
import { countReasons } from './stockCountApi';
import { money, statuses } from './stockCount/stockCountHelpers';
import { useStockCount, type StockCountProps } from './stockCount/useStockCount';
import { StockCountSheet } from './stockCount/StockCountSheet';

/**
 * Conteo físico por sucursal o depósito. Lo contado se guarda solo al cargarlo: el servidor anota en ese momento
 * cuánto decía el sistema, así lo que se venda después no aparece como diferencia.
 * Quien no puede editar productos cuenta a ciegas: no ve el stock del sistema ni las diferencias.
 */

export function StockCount(props: StockCountProps) {
  const state = useStockCount(props);
  const {
    categories, canConfirm, counts, current, loadError, loading, location, setLocation, category,
    setCategory, brand, setBrand, notes, setNotes, history, disabled, places, placeName, sectionName,
    brands, sectionSize, load, open, start, showHistory, productName, openCounts,
  } = state;
  return <section className="retail-panel stock-count" aria-labelledby="stock-count-title">
    <div className="section-heading"><div><h2 id="stock-count-title"><ClipboardList size={20} aria-hidden="true" /> Contar stock</h2>
      <p>Contá lo que hay de verdad en un local o en el depósito. Si no coincide con el sistema, se corrige y queda anotado el motivo.</p></div>
      {!current && <button type="button" className="secondary-button" disabled={disabled || loading} onClick={() => void load()}><RefreshCw size={15} /> Actualizar</button>}
    </div>
    {loadError && <p role="alert" className="error-banner">{loadError}</p>}

    {!current && <>
      {openCounts.length > 0 && <ul className="stock-count-open">{openCounts.map(row => <li key={row.id}>
        <span><strong>{placeName(row.location)}</strong> · {sectionName(row)} · empezó {new Date(row.created_at).toLocaleString('es-AR')}{row.actor_email ? ` · ${row.actor_email}` : ''}</span>
        <button type="button" className="primary-button" disabled={disabled} onClick={() => void open(row)}>Seguir contando</button>
      </li>)}</ul>}
      <form className="retail-form stock-count-start" onSubmit={event => { event.preventDefault(); void start(); }}>
        <h3>Nuevo conteo</h3>
        <fieldset disabled={disabled}>
          <label>Dónde<select required value={location} onChange={event => setLocation(event.target.value)}>
            <option value="">Elegí sucursal o depósito</option>{places.map(place => { const busyHere = openCounts.filter(row => row.location === place.id).length; return <option key={place.id} value={place.id}>{place.name}{busyHere ? ` · ${busyHere} ${busyHere === 1 ? 'conteo abierto' : 'conteos abiertos'}` : ''}</option>; })}
          </select></label>
          <label>Categoría<select value={category} onChange={event => { setCategory(event.target.value); setBrand(''); }}>
            <option value="">Todas las categorías</option>{categories.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}
          </select></label>
          <label>Marca<select value={brand} onChange={event => setBrand(event.target.value)} disabled={!brands.length}>
            <option value="">{brands.length ? 'Todas las marcas' : 'Sin marcas cargadas'}</option>{brands.map(name => <option key={name} value={name}>{name}</option>)}
          </select></label>
          <label>Nota (opcional)<input maxLength={1000} value={notes} onChange={event => setNotes(event.target.value)} placeholder="Ej.: conteo de fin de mes" /></label>
        </fieldset>
        <p className="stock-count-message">Vas a contar <strong>{sectionSize} {sectionSize === 1 ? 'producto' : 'productos'}</strong>{category || brand ? ` de ${sectionName({ category_id: category || null, brand: brand || null })}` : ', todo el lugar'}. Si no te da el tiempo, contá por sección: se pueden tener varias abiertas en el mismo lugar.</p>
        <button className="primary-button" disabled={disabled || !location || !sectionSize}><Plus size={15} /> Empezar a contar</button>
      </form>
    </>}

    <StockCountSheet state={state} />

    {!current && <>
      <h3>Historial</h3>
      <ol className="location-transfer-history">{counts.filter(row => row.status !== 'open').map(row => <li key={row.id}><article>
        <div className="location-transfer-record-heading"><time dateTime={row.created_at}>{new Date(row.created_at).toLocaleString('es-AR')}</time><span className={`stock-transfer-status ${row.status === 'confirmed' ? 'confirmed' : 'cancelled'}`}>{statuses[row.status]}</span></div>
        <strong className="location-transfer-record-route">{placeName(row.location)} · {sectionName(row)}</strong>
        <small>Contó: {row.actor_email || 'Usuario'}{row.closed_email ? ` · ${row.status === 'confirmed' ? 'Confirmó' : 'Canceló'}: ${row.closed_email}` : ''}</small>
        {row.notes && <p>{row.notes}</p>}
        <details onToggle={event => { if (event.currentTarget.open) void showHistory(row); }}><summary>Ver productos</summary>
          {!history[row.id] ? <p role="status">Cargando…</p> : <ul>{history[row.id].map(line => <li key={line.product_id}>
            {productName(line.product_id)}: contó {line.counted}{canConfirm && line.adjustment ? ` · ajuste ${line.adjustment > 0 ? '+' : ''}${line.adjustment}` : ''}{line.reason ? ` · ${countReasons[line.reason]}` : ''}{line.note ? ` (${line.note})` : ''}{canConfirm && line.adjustment && line.adjustment < 0 && line.unit_cost ? ` · ${money(-line.adjustment * line.unit_cost)}` : ''}{line.counted_email ? ` · ${line.counted_email}` : ''}
          </li>)}</ul>}
        </details>
      </article></li>)}</ol>
      {!counts.some(row => row.status !== 'open') && !loading && <p className="transfer-flow-empty">Todavía no hay conteos cerrados.</p>}
    </>}
  </section>;
}
