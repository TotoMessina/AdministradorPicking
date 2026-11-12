import { useState } from 'react';
import { Pencil, Plus, Check, RotateCcw, Receipt, Banknote, QrCode, CreditCard, ArrowRightLeft, SlidersHorizontal, Star, Sparkles, Info, Coins } from 'lucide-react';
import { retail, type SalesLedger } from './api';
import type { Run } from './Management';
import { ledgerPaymentMethods } from './ledgerRouting';

/** Registros de ventas y a cuál va cada medio de pago. */
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
            <p>Sirven para separar tus ventas en grupos, por ejemplo «Mostrador» y «Delivery», o «Kiosco» y «Librería». Antes de cobrar elegís en cuál va; todas suman al total y descuentan stock.</p>
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
                  Link: <ArrowRightLeft size={16} />,
                  Debito: <CreditCard size={16} />,
                  Credito: <CreditCard size={16} />,
                  Fiado: <CreditCard size={16} />,
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
