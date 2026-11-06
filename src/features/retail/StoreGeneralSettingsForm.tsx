import { useState, useEffect } from "react";
import { Check, Eye, Loader2, MapPin, Receipt, RotateCcw, Store as StoreIcon } from "lucide-react";
import type { Store } from "./api";
import { retail } from "./api";
import type { Run } from './managementTypes';

export function StoreGeneralSettingsForm({
  store,
  busy,
  run,
}: {
  store: Store;
  busy: boolean;
  run: Run;
}) {
  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [message, setMessage] = useState(store.receipt_message || '');
  const [color, setColor] = useState(store.accent_color || '#2563eb');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setName(store.name);
    setAddress(store.address || '');
    setPhone(store.phone || '');
    setMessage(store.receipt_message || '');
    setColor(store.accent_color || '#2563eb');
    setIsDirty(false);
  }, [store.id, store.name, store.address, store.phone, store.receipt_message, store.accent_color]);

  const handleReset = () => {
    setName(store.name);
    setAddress(store.address || '');
    setPhone(store.phone || '');
    setMessage(store.receipt_message || '');
    setColor(store.accent_color || '#2563eb');
    setIsDirty(false);
  };

  const PRESET_COLORS = [
    { name: 'Azul clásico', hex: '#2563eb' },
    { name: 'Índigo moderno', hex: '#6366f1' },
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Ámbar cálido', hex: '#f59e0b' },
    { name: 'Rosa intenso', hex: '#e11d48' },
    { name: 'Púrpura', hex: '#8b5cf6' },
    { name: 'Pizarra', hex: '#475569' },
  ];

  return (
    <form
      className="retail-form store-settings-container"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const success = await run(
          () =>
            retail.updateStore(store.id, {
              name: String(f.get("name")).trim(),
              address: String(f.get("address")),
              phone: String(f.get("phone")),
              receipt_message: String(f.get("message")),
              accent_color: String(f.get("color")),
            }),
          "Comercio actualizado",
        );
        if (success) {
          setIsDirty(false);
        }
      }}
    >
      <div className="store-settings-card">
        <div className="store-settings-header">
          <div
            className="store-settings-header-icon"
            style={{ backgroundColor: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            <StoreIcon size={22} />
          </div>
          <div className="store-settings-header-text">
            <h3>Datos del comercio</h3>
            <p>Configurá la identidad visual, datos de contacto y el comprobante de tus ventas.</p>
          </div>
        </div>

        <fieldset disabled={busy} className="store-settings-body">
          {/* SECCIÓN 1: IDENTIDAD Y MARCA */}
          <section className="store-settings-section">
            <div className="store-section-header">
              <div className="store-section-header-title">
                <StoreIcon size={16} className="store-section-icon" />
                <h4>Identidad y marca</h4>
              </div>
              <p className="store-section-desc">Nombre comercial y color característico de tu negocio.</p>
            </div>

            <div className="store-section-fields">
              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-name">
                  Nombre
                </label>
                <div className="store-input-wrapper">
                  <input
                    id="store-name"
                    name="name"
                    required
                    maxLength={100}
                    placeholder="Nombre de tu comercio"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <p className="store-field-hint">
                  Se muestra en la barra superior, en las pantallas de cobro y como encabezado en cada ticket.
                </p>
              </div>

              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-color-hex">
                  Color de marca
                </label>
                <div className="store-color-section">
                  <div className="store-color-controls">
                    <div
                      className="store-color-preview-swatch"
                      style={{ backgroundColor: color }}
                      title="Hacé clic para elegir un color personalizado"
                    >
                      <input
                        id="store-color-picker"
                        type="color"
                        name="color"
                        className="store-color-native-input"
                        value={color}
                        onChange={(e) => {
                          setColor(e.target.value);
                          setIsDirty(true);
                        }}
                      />
                    </div>
                    <input
                      id="store-color-hex"
                      type="text"
                      className="store-color-hex-input"
                      maxLength={7}
                      value={color}
                      onChange={(e) => {
                        setColor(e.target.value);
                        setIsDirty(true);
                      }}
                    />
                    <span className="store-field-hint" style={{ margin: 0 }}>
                      Personaliza botones, detalles y recibos
                    </span>
                  </div>
                  <div className="store-color-palette" role="group" aria-label="Colores recomendados">
                    {PRESET_COLORS.map((preset) => (
                      <button
                        key={preset.hex}
                        type="button"
                        className={`store-color-dot ${color.toLowerCase() === preset.hex.toLowerCase() ? 'active' : ''}`}
                        style={{ backgroundColor: preset.hex }}
                        title={preset.name}
                        onClick={() => {
                          setColor(preset.hex);
                          setIsDirty(true);
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: UBICACIÓN Y CONTACTO */}
          <section className="store-settings-section">
            <div className="store-section-header">
              <div className="store-section-header-title">
                <MapPin size={16} className="store-section-icon" />
                <h4>Ubicación y contacto</h4>
              </div>
              <p className="store-section-desc">Información del local para que tus clientes sepan dónde encontrarte o comunicarse.</p>
            </div>

            <div className="store-section-fields store-fields-2col">
              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-address">
                  Dirección
                </label>
                <div className="store-input-wrapper">
                  <input
                    id="store-address"
                    name="address"
                    maxLength={300}
                    placeholder="Ej. Av. Corrientes 1234, CABA"
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <p className="store-field-hint">
                  Domicilio del local principal. Se imprime en el encabezado del ticket.
                </p>
              </div>

              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-phone">
                  Teléfono
                </label>
                <div className="store-input-wrapper">
                  <input
                    id="store-phone"
                    name="phone"
                    maxLength={60}
                    placeholder="Ej. 11 5566-7788"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <p className="store-field-hint">
                  Teléfono de contacto o WhatsApp de atención al cliente.
                </p>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: PERSONALIZACIÓN DEL TICKET */}
          <section className="store-settings-section">
            <div className="store-section-header">
              <div className="store-section-header-title">
                <Receipt size={16} className="store-section-icon" />
                <h4>Mensaje del ticket</h4>
              </div>
              <p className="store-section-desc">Frase de cortesía o agradecimiento que se imprime al pie de cada comprobante.</p>
            </div>

            <div className="store-section-fields">
              <div className="store-field-group">
                <label className="store-field-label" htmlFor="store-message">
                  Mensaje personalizado
                </label>
                <div className="store-input-wrapper">
                  <input
                    id="store-message"
                    name="message"
                    maxLength={300}
                    placeholder="Ej. ¡Gracias por su compra! Vuelva pronto."
                    value={message}
                    onChange={(e) => {
                      setMessage(e.target.value);
                      setIsDirty(true);
                    }}
                  />
                </div>
                <p className="store-field-hint">
                  Aparece centrado y entre comillas al final de cada ticket emitido.
                </p>
              </div>
            </div>
          </section>
        </fieldset>

        <div className="store-settings-footer">
          <div className="store-settings-footer-left">
            <span>Moneda: <strong>Pesos Argentinos (ARS)</strong></span>
            {isDirty && (
              <span className="store-dirty-badge">
                ● Cambios sin guardar
              </span>
            )}
          </div>
          <div className="store-settings-footer-actions">
            <button
              type="button"
              className="text-button"
              disabled={busy || !isDirty}
              onClick={handleReset}
            >
              <RotateCcw size={14} /> Cancelar
            </button>
            <button className="primary-button" disabled={busy}>
              {busy ? <Loader2 size={16} className="spin" /> : <Check size={16} />}
              Guardar cambios
            </button>
          </div>
        </div>
      </div>

      <div className="store-preview-wrapper">
        <div className="store-preview-header">
          <div className="store-preview-header-title">
            <Receipt size={16} className="store-preview-header-icon" />
            <h4>Vista previa del ticket</h4>
          </div>
          <span className="store-preview-badge">Térmica 58/80mm</span>
        </div>

        <div className="thermal-ticket-card" style={{ '--store-accent': color } as React.CSSProperties}>
          <div className="thermal-ticket-accent-bar" style={{ backgroundColor: color }} />
          <div className="thermal-ticket-header">
            <h4 className="thermal-ticket-title">{name || 'MI COMERCIO'}</h4>
            <p className="thermal-ticket-meta">
              {address || 'Dirección de ejemplo 123'}
              <br />
              {phone ? `TEL: ${phone}` : 'TEL: 11 0000-0000'}
            </p>
          </div>

          <div className="thermal-ticket-body">
            <div className="thermal-ticket-row">
              <span>1x Café expreso</span>
              <strong>$ 1.500,00</strong>
            </div>
            <div className="thermal-ticket-row">
              <span>2x Medialunas</span>
              <strong>$ 1.600,00</strong>
            </div>
            <hr className="thermal-ticket-divider" />
            <div className="thermal-ticket-row thermal-ticket-total">
              <span>TOTAL</span>
              <span>$ 3.100,00</span>
            </div>
            <div className="thermal-ticket-row" style={{ color: '#78716c', fontSize: '11px' }}>
              <span>PAGO: EFECTIVO</span>
              <span>$ 3.100,00</span>
            </div>
          </div>

          <div className="thermal-ticket-footer">
            <p className="thermal-ticket-message">
              "{message || '¡Gracias por su compra!'}"
            </p>
          </div>
          <div className="thermal-ticket-bottom-scallop" />
        </div>

        <div className="preview-helper-badge">
          <Eye size={15} />
          <span>Actualización en tiempo real con los datos y el color seleccionado.</span>
        </div>
      </div>
    </form>
  );
}
