import { useState } from 'react';
import {
  Building2,
  MapPin,
  Pencil,
  Plus,
  Check,
  RotateCcw,
  Receipt,
  Banknote,
  QrCode,
  CreditCard,
  ArrowRightLeft,
  SlidersHorizontal,
  Star,
  Sparkles,
  Info,
  Coins,
} from 'lucide-react';
import { retail, type Branch, type PriceList, type PriceOverride, type Product, type SalesLedger } from './api';
import type { Run } from './Management';
import { productsForList } from './pricing';
import { SettingsEditor, SettingsEditorGroup } from './SettingsEditor';
import { ledgerPaymentMethods, resolveSaleLedger } from './ledgerRouting';

export function BranchSettings({
  storeId,
  branches,
  run,
  busy,
  registerCounts,
}: {
  storeId: string;
  branches: Branch[];
  run: Run;
  busy: boolean;
  registerCounts?: Record<string, number>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(branches.length === 0);

  return (
    <div className="store-settings-card">
      <div className="store-settings-header">
        <div className="store-settings-header-icon">
          <Building2 size={22} />
        </div>
        <div className="store-settings-header-text">
          <h3>Locales y sucursales</h3>
          <p>Puntos de venta de tu comercio. Comparten catálogo y stock general.</p>
        </div>
      </div>

      <div className="location-card-body">
        {/* Lista de sucursales */}
        <div className="location-items-list">
          {branches.map((b) => {
            const isEditing = editingId === b.id;
            if (isEditing) {
              return (
                <form
                  key={b.id}
                  className="location-inline-edit"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    const f = new FormData(e.currentTarget);
                    const success = await run(
                      () =>
                        retail.saveBranch(
                          storeId,
                          String(f.get('name')),
                          String(f.get('address')),
                          b.id,
                        ),
                      'Sucursal actualizada',
                    );
                    if (success) setEditingId(null);
                  }}
                >
                  <div className="store-field-group">
                    <label className="store-field-label" htmlFor={`branch-name-${b.id}`}>
                      Sucursal
                    </label>
                    <input
                      id={`branch-name-${b.id}`}
                      name="name"
                      required
                      maxLength={80}
                      defaultValue={b.name}
                      placeholder="Ej. Centro"
                      className="store-text-input"
                    />
                  </div>
                  <div className="store-field-group">
                    <label className="store-field-label" htmlFor={`branch-addr-${b.id}`}>
                      Dirección
                    </label>
                    <input
                      id={`branch-addr-${b.id}`}
                      name="address"
                      maxLength={300}
                      defaultValue={b.address || ''}
                      placeholder="Ej. Av. San Martín 100"
                      className="store-text-input"
                    />
                  </div>
                  <div className="location-edit-actions">
                    <button
                      type="button"
                      className="text-button"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                    >
                      <RotateCcw size={14} /> Cancelar
                    </button>
                    <button className="primary-button" disabled={busy}>
                      <Check size={15} /> Guardar sucursal
                    </button>
                  </div>
                </form>
              );
            }

            const count = registerCounts?.[b.id];
            return (
              <div key={b.id} className="location-item-row">
                <div className="location-item-left">
                  <div className="location-item-icon">
                    <Building2 size={18} />
                  </div>
                  <div className="location-item-info">
                    <strong className="location-item-name">{b.name}</strong>
                    <div className="location-item-meta">
                      <span className="location-item-address">
                        <MapPin size={12} /> {b.address || 'Sin dirección asignada'}
                      </span>
                      {count !== undefined && (
                        <span className="location-pill-badge">
                          {count} {count === 1 ? 'caja' : 'cajas'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="location-item-actions">
                  <button
                    type="button"
                    className="secondary-button"
                    disabled={busy}
                    onClick={() => setEditingId(b.id)}
                    title={`Editar ${b.name}`}
                  >
                    <Pencil size={13} /> Editar
                  </button>
                </div>
              </div>
            );
          })}

          {!branches.length && (
            <div className="location-empty-notice">
              <Building2 size={24} />
              <p>Todavía no agregaste sucursales. Creá tu primer local para comenzar a operar cajas.</p>
            </div>
          )}
        </div>

        {/* Sección Agregar Sucursal */}
        <div className="location-add-section">
          <div className="location-add-header">
            <div className="location-add-title">
              <Plus size={16} />
              <span>Nueva sucursal</span>
            </div>
            {branches.length > 0 && (
              <button
                type="button"
                className="text-button"
                onClick={() => setIsAdding(!isAdding)}
              >
                {isAdding ? 'Ocultar' : '+ Agregar otra'}
              </button>
            )}
          </div>

          {(isAdding || branches.length === 0) && (
            <form
              className="location-add-form"
              onSubmit={async (e) => {
                e.preventDefault();
                const f = new FormData(e.currentTarget);
                const formEl = e.currentTarget;
                const success = await run(
                  () =>
                    retail.saveBranch(
                      storeId,
                      String(f.get('name')),
                      String(f.get('address')),
                      undefined,
                    ),
                  'Sucursal creada',
                );
                if (success) {
                  formEl.reset();
                  if (branches.length > 0) setIsAdding(false);
                }
              }}
            >
              <div className="store-fields-2col">
                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-branch-name">
                    Nueva sucursal
                  </label>
                  <input
                    id="new-branch-name"
                    name="name"
                    required
                    maxLength={80}
                    placeholder="Ej. Centro"
                    className="store-text-input"
                  />
                </div>
                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-branch-address">
                    Dirección
                  </label>
                  <input
                    id="new-branch-address"
                    name="address"
                    maxLength={300}
                    placeholder="Ej. Av. San Martín 100"
                    className="store-text-input"
                  />
                </div>
              </div>
              <div className="location-add-footer">
                <button className="primary-button" disabled={busy}>
                  <Plus size={16} /> Crear sucursal
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

export function LedgerSettings({
  storeId,
  ledgers,
  run,
  busy,
}: {
  storeId: string;
  ledgers: SalesLedger[];
  run: Run;
  busy: boolean;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const hasGeneral = ledgers.some((l) => l.name === 'General' && l.active);
  const hasPruebas = ledgers.some((l) => l.name === 'Pruebas' && l.active);
  const activeCount = ledgers.filter((l) => l.active).length;
  const defaultLedger = ledgers.find((l) => l.is_default) || ledgers.find((l) => l.active);

  const getAssignedMethodsCount = (ledgerId: string) => {
    return ledgerPaymentMethods.filter((method) => {
      const explicit = ledgers.find((l) => l.active && l.payment_methods?.includes(method.id));
      if (explicit) return explicit.id === ledgerId;
      return defaultLedger?.id === ledgerId;
    }).length;
  };

  return (
    <div className="ledgers-settings-container">
      {/* Tarjeta 1: Registros de ventas */}
      <div className="store-settings-card">
        <div className="store-settings-header">
          <div className="store-settings-header-icon icon-ledgers">
            <Receipt size={22} />
          </div>
          <div className="store-settings-header-text">
            <h3>Registros de ventas</h3>
            <p>Agrupaciones para clasificar tus ventas. Todas integran el total general y descuentan existencias.</p>
          </div>
        </div>

        <div className="location-card-body">
          {/* Badges de estado general */}
          <div className="team-summary-badges">
            <span className="location-pill-badge active">
              {activeCount} {activeCount === 1 ? 'registro activo' : 'registros activos'}
            </span>
            {defaultLedger && (
              <span className="location-pill-badge active">
                <Star size={11} /> Principal: {defaultLedger.name}
              </span>
            )}
          </div>

          {/* Banner si faltan los registros estándar */}
          {(!hasGeneral || !hasPruebas) && (
            <div className="ledger-prepare-banner">
              <div className="ledger-prepare-text">
                <div className="ledger-prepare-title">
                  <Sparkles size={16} />
                  <strong>Registros estándar recomendados</strong>
                </div>
                <p>Configurá General como principal y Pruebas para ventas reales de prueba con un clic.</p>
              </div>
              <button
                type="button"
                className="secondary-button ledger-prepare-btn"
                disabled={busy}
                onClick={() =>
                  void run(
                    () => retail.prepareSalesLedgers(storeId),
                    'Registros preparados. General es el principal.'
                  )
                }
              >
                Preparar General y Pruebas
              </button>
            </div>
          )}

          {/* Nota informativa */}
          <div className="ledger-info-box">
            <Info size={15} />
            <span>
              <strong>General</strong> y <strong>Pruebas</strong> registran ventas reales: ambos descuentan stock y afectan caja. Pruebas no es un entorno de simulación.
            </span>
          </div>

          {/* Lista de registros */}
          <div className="location-items-list">
            {ledgers.map((l) => {
              const isEditing = editingId === l.id;
              if (isEditing) {
                return (
                  <form
                    key={l.id}
                    className="location-inline-edit"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const success = await run(
                        () => retail.saveLedger(storeId, String(f.get('name')), l.id, l.active),
                        'Registro actualizado'
                      );
                      if (success) setEditingId(null);
                    }}
                  >
                    <div className="store-field-group">
                      <label className="store-field-label" htmlFor={`ledger-name-${l.id}`}>
                        Nombre del registro
                      </label>
                      <input
                        id={`ledger-name-${l.id}`}
                        name="name"
                        required
                        maxLength={80}
                        defaultValue={l.name}
                        placeholder="Ej. Ventas mayoristas"
                        className="store-text-input"
                      />
                    </div>
                    <div className="location-edit-actions">
                      {!l.is_default && (
                        <button
                          type="button"
                          className="text-button text-button-danger"
                          disabled={busy}
                          onClick={async () => {
                            const ok = await run(
                              () => retail.saveLedger(storeId, l.name, l.id, !l.active),
                              l.active ? 'Registro desactivado' : 'Registro reactivado'
                            );
                            if (ok) setEditingId(null);
                          }}
                        >
                          {l.active ? 'Desactivar registro' : 'Reactivar registro'}
                        </button>
                      )}
                      <div className="location-edit-actions-right">
                        <button
                          type="button"
                          className="text-button"
                          disabled={busy}
                          onClick={() => setEditingId(null)}
                        >
                          <RotateCcw size={14} /> Cancelar
                        </button>
                        <button className="primary-button" disabled={busy}>
                          <Check size={15} /> Guardar
                        </button>
                      </div>
                    </div>
                  </form>
                );
              }

              const assignedCount = getAssignedMethodsCount(l.id);
              return (
                <div key={l.id} className="location-item-row">
                  <div className="location-item-left">
                    <div className="location-item-icon icon-ledger">
                      <Receipt size={18} />
                    </div>
                    <div className="location-item-info">
                      <strong className="location-item-name">{l.name}</strong>
                      <div className="location-item-meta">
                        {l.is_default && (
                          <span className="location-pill-badge active">
                            <Star size={11} /> Principal
                          </span>
                        )}
                        <span className={`location-pill-badge ${l.active ? 'active' : ''}`}>
                          {l.active ? 'Activo' : 'Inactivo'}
                        </span>
                        {assignedCount > 0 && (
                          <span className="location-pill-badge">
                            {assignedCount} {assignedCount === 1 ? 'medio asignado' : 'medios asignados'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="location-item-actions">
                    <button
                      type="button"
                      className="secondary-button"
                      disabled={busy}
                      onClick={() => {
                        setEditingId(l.id);
                        setIsAdding(false);
                      }}
                      title={`Editar ${l.name}`}
                    >
                      <Pencil size={13} /> Editar
                    </button>
                  </div>
                </div>
              );
            })}

            {!ledgers.length && (
              <div className="location-empty-notice">
                <Receipt size={24} />
                <p>No tenés registros de ventas configurados. Creá uno nuevo o prepará los registros estándar.</p>
              </div>
            )}
          </div>

          {/* Sección Agregar Registro */}
          <div className="location-add-section">
            <div className="location-add-header">
              <div className="location-add-title">
                <Plus size={16} />
                <span>Nuevo registro</span>
              </div>
              {ledgers.length > 0 && (
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setIsAdding((v) => !v)}
                >
                  {isAdding ? 'Cerrar' : '+ Agregar'}
                </button>
              )}
            </div>

            {isAdding && (
              <form
                className="location-add-form"
                onSubmit={async (e) => {
                  e.preventDefault();
                  const form = e.currentTarget;
                  const f = new FormData(form);
                  const name = String(f.get('name') || '').trim();
                  if (!name) return;
                  const ok = await run(
                    () => retail.saveLedger(storeId, name),
                    'Registro de ventas agregado'
                  );
                  if (ok) {
                    form.reset();
                    setIsAdding(false);
                  }
                }}
              >
                <div className="store-field-group">
                  <label className="store-field-label" htmlFor="new-ledger-name">
                    Nombre del registro
                  </label>
                  <div className="location-add-row">
                    <input
                      id="new-ledger-name"
                      name="name"
                      required
                      maxLength={80}
                      placeholder="Ej. Ventas mayoristas, Eventos"
                      className="store-text-input"
                    />
                    <button className="primary-button" disabled={busy}>
                      <Plus size={15} /> Crear registro
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>

      {/* Tarjeta 2: Ruteo por medio de pago */}
      <div className="store-settings-card">
        <div className="store-settings-header">
          <div className="store-settings-header-icon">
            <SlidersHorizontal size={22} />
          </div>
          <div className="store-settings-header-text">
            <h3>Ruteo por medio de pago</h3>
            <p>Configurá a qué registro se imputa automáticamente cada cobro al realizar una venta.</p>
          </div>
        </div>

        <div className="location-card-body">
          <form
            className="routing-form"
            onSubmit={async (event) => {
              event.preventDefault();
              const fields = new FormData(event.currentTarget);
              const rules = Object.fromEntries(
                ledgerPaymentMethods
                  .map((method) => [method.id, String(fields.get(method.id) || '')])
                  .filter(([, value]) => value)
              );
              await run(
                () => retail.saveLedgerRouting(storeId, String(fields.get('default')), rules),
                'Reglas de ruteo guardadas correctamente'
              );
            }}
          >
            {/* Registro Principal */}
            <div className="routing-default-section">
              <label className="store-field-label" htmlFor="default-ledger-select">
                Registro principal predeterminado
              </label>
              <div className="routing-default-row">
                <select
                  id="default-ledger-select"
                  name="default"
                  required
                  defaultValue={ledgers.find((l) => l.is_default)?.id || ''}
                  disabled={busy}
                  className="store-select-field routing-default-select"
                >
                  <option value="" disabled>Elegí un registro principal</option>
                  {ledgers.filter((l) => l.active).map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
              <p className="routing-helper-text">
                Si un medio de pago no tiene una regla específica definida abajo, se utilizará este registro.
              </p>
            </div>

            <hr className="account-divider" />

            {/* Lista de reglas por medio de pago */}
            <div className="routing-methods-list">
              <span className="store-field-label">Reglas individuales por medio de pago</span>
              {ledgerPaymentMethods.map((method) => {
                const currentTarget = ledgers.find(
                  (l) => l.active && l.payment_methods?.includes(method.id)
                )?.id || '';

                const methodIcon = {
                  Efectivo: <Banknote size={16} />,
                  QR: <QrCode size={16} />,
                  Transferencia: <ArrowRightLeft size={16} />,
                  Debito: <CreditCard size={16} />,
                  Credito: <CreditCard size={16} />,
                  Mixto: <Receipt size={16} />,
                }[method.id] || <Coins size={16} />;

                return (
                  <div key={method.id} className="routing-method-row">
                    <div className="routing-method-info">
                      <div className="routing-method-icon">
                        {methodIcon}
                      </div>
                      <strong className="routing-method-label">{method.label}</strong>
                    </div>
                    <div className="routing-method-target">
                      <select
                        name={method.id}
                        disabled={busy}
                        defaultValue={currentTarget}
                        className="store-select-field routing-method-select"
                        aria-label={`Registro para ${method.label}`}
                      >
                        <option value="">Usar registro principal</option>
                        {ledgers.filter((l) => l.active).map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Aviso sobre Pago mixto */}
            <div className="ledger-info-box">
              <Info size={15} />
              <span>
                En <strong>Pago mixto</strong> se envía la venta completa al registro asignado, sin dividir el ticket. Siempre podés cambiar el registro manualmente al cobrar en <strong>Vender</strong>.
              </span>
            </div>

            <button className="primary-button routing-save-btn" disabled={busy}>
              <Check size={16} /> Guardar reglas de cobro
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

export function PriceListSettings({ storeId, lists, overrides, products, branches = [], run, busy, expanded = false }: { storeId: string; lists: PriceList[]; overrides: PriceOverride[]; products: Product[]; branches?: Branch[]; run: Run; busy: boolean; expanded?: boolean }) {
  const [selected, setSelected] = useState('');
  const [query, setQuery] = useState('');
  const list = lists.find(l => l.id === selected);
  const priced = productsForList(products, list, overrides);
  return <section className="retail-panel price-list-settings"><details open={expanded || undefined}><summary>Listas de precios · Ver y administrar</summary>
    <p><strong>Precio del catálogo</strong> (lista madre) usa los precios base de los productos. Las demás listas se calculan con un porcentaje: −10 descuenta 10%; 15 suma 15%. Un precio fijo reemplaza ese cálculo para un producto.</p>
    <h3>Listas del comercio</h3>
    <p>Una lista global puede usarse en todas las sucursales. Una lista de sucursal se aplica solo en ese local y se selecciona por defecto al vender. Cada sucursal puede tener una lista exclusiva activa; sin ella, usa el precio del catálogo.</p>
    {!lists.length && <p>Usás los precios del catálogo. Podés crear una lista para otra sucursal o forma de venta.</p>}
    <SettingsEditorGroup>{[...lists, null].map(l => <SettingsEditor key={l?.id || 'new'} busy={busy}
      label={l ? `Editar ${l.name}` : 'Crear lista'} summary={l && <><strong>{l.name}</strong><small>{Number(l.adjustment)}% · {l.branch_id ? branches.find(b => b.id === l.branch_id)?.name || 'Sucursal asignada' : 'Todas las sucursales'} · {l.active ? 'Activa' : 'Inactiva'}</small></>}>
      {close => <form className="inline-form business-edit-row" onSubmit={async e => {
        e.preventDefault(); const form = e.currentTarget; const f = new FormData(form);
        if (await run(() => retail.savePriceList(storeId, String(f.get('name')), Number(f.get('adjustment')), l?.id, l?.active ?? true, String(f.get('branch')) || null), 'Lista guardada')) close();
      }}>
        <label>{l ? 'Lista' : 'Nueva lista'}<input name="name" required maxLength={80} defaultValue={l?.name} placeholder="Ej. Mayorista" /></label>
        <label>Ajuste %<input name="adjustment" type="number" required step="0.01" min="-99.99" max="10000" defaultValue={l?.adjustment ?? 0} /></label>
        <label>Sucursal<select name="branch" aria-label={l ? `Sucursal de la lista ${l.name}` : 'Sucursal de la nueva lista'} defaultValue={l?.branch_id || ''}><option value="">Todas las sucursales</option>{branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}</select></label>
        <button className="secondary-button" disabled={busy}>{l ? 'Guardar' : 'Crear lista'}</button>
        {l && <button type="button" className="text-button" disabled={busy} onClick={() => void run(() => retail.savePriceList(storeId, l.name, Number(l.adjustment), l.id, !l.active, l.branch_id || null), 'Lista actualizada')}>{l.active ? 'Desactivar' : 'Reactivar'}</button>}
      </form>}</SettingsEditor>)}</SettingsEditorGroup>
    <details><summary>Consultar precios y editar precios fijos</summary>
    <div className="business-controls">
      <label>Consultar lista<select value={selected} onChange={e => setSelected(e.target.value)}><option value="">Precio del catálogo</option>{lists.map(l => <option key={l.id} value={l.id}>{l.name}{l.active ? '' : ' (inactiva)'}</option>)}</select></label>
      <label>Buscar producto<input value={query} onChange={e => setQuery(e.target.value)} placeholder="Nombre o código" /></label>
    </div>
    <SettingsEditorGroup><div className="table-scroll"><table><thead><tr><th>Producto</th><th>Precio del catálogo</th><th>Precio de la lista</th>{list && <th>Precio fijo opcional</th>}</tr></thead><tbody>
      {priced.filter(p => p.sellable !== false && `${p.name} ${p.code}`.toLowerCase().includes(query.toLowerCase())).slice(0, 50).map(p => {
        const fixed = overrides.find(o => o.list_id === selected && o.product_id === p.id);
        return <tr key={p.id}><td>{p.name}<small>{p.code}</small></td><td>${products.find(base => base.id === p.id)?.price.toLocaleString('es-AR')}</td><td>${p.price.toLocaleString('es-AR')}</td>{list && <td><SettingsEditor key={selected + p.id} busy={busy} label={`Editar precio de ${p.name}`} summary={fixed ? `$${Number(fixed.price).toLocaleString('es-AR')}` : 'Usa el porcentaje de la lista'}>{close => <form className="inline-form" onSubmit={async e => {
          e.preventDefault(); const value = String(new FormData(e.currentTarget).get('price'));
          if (await run(() => retail.savePriceOverride(storeId, list.id, p.id, value === '' ? null : Number(value)), value === '' ? 'Vuelve al cálculo de la lista' : 'Precio fijo guardado')) close();
        }}><label>Precio fijo ($)<input name="price" type="number" min="0.01" max="999999999999.99" step="0.01" defaultValue={fixed?.price} placeholder="Usar porcentaje" /></label><button className="secondary-button" disabled={busy}>Guardar</button></form>}</SettingsEditor></td>}</tr>;
      })}
    </tbody></table></div></SettingsEditorGroup><p>Se muestran hasta 50 coincidencias. Para quitar un precio fijo, dejá su campo vacío y guardá.</p>
    </details>
  </details></section>;
}
