import { Coins, Package, Receipt } from 'lucide-react';
import type { ReactNode } from 'react';
import { BillingSettings } from './BillingSettings';
import { DepotSettings } from './DepotSettings';
import { MarginThresholdSettings } from './MarginThresholdSettings';
import { PriceRoundingSettings } from './PriceRoundingSettings';
import type { Store } from './api';
import type { Run } from './Management';

function Group({ id, icon, title, help, children }: { id: string; icon: ReactNode; title: string; help: string; children: ReactNode }) {
  return <section className="store-settings-card store-config-group" aria-labelledby={`config-${id}`}>
    <div className="store-settings-header">
      <div className="store-settings-header-icon">{icon}</div>
      <div className="store-settings-header-text"><h3 id={`config-${id}`}>{title}</h3><p>{help}</p></div>
    </div>
    <div className="store-config-body">{children}</div>
  </section>;
}

/**
 * Ajustes del comercio que se definen una vez: precios, facturación electrónica y stock.
 * Reúne los formularios existentes sin cambiar lo que guardan ni sus permisos.
 */
export function StoreConfiguration({ store, busy, run, active }: { store: Store; busy: boolean; run: Run; active: boolean }) {
  return <div className="store-configuration">
    <p className="store-config-intro">Ajustes que se definen una vez y valen para todo el comercio. Cada producto puede tener su propia ganancia y su propio redondeo desde su ficha.</p>
    <Group id="prices" icon={<Coins size={22} />} title="Precios" help="Ganancia por defecto sobre el costo, redondeo de los precios y cuándo un margen se considera bajo.">
      <PriceRoundingSettings key={`pricing-${store.id}`} store={store} busy={busy} run={run} />
      <MarginThresholdSettings key={`margin-${store.id}`} store={store} busy={busy} run={run} />
    </Group>
    <Group id="billing" icon={<Receipt size={22} />} title="Facturación electrónica (ARCA)" help="Datos fiscales, certificado y punto de venta para emitir facturas.">
      <BillingSettings key={`billing-${store.id}`} store={store} busy={busy} run={run} active={active} />
    </Group>
    <Group id="stock" icon={<Package size={22} />} title="Stock" help="Depósito opcional, separado del salón.">
      <DepotSettings key={`depot-${store.id}`} store={store} busy={busy} run={run} active={active} />
    </Group>
  </div>;
}
