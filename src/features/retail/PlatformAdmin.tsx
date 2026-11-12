import { useState } from 'react';
import { PlatformBilling } from './PlatformBilling';
import { PlatformNotices } from './PlatformNotices';
import { PlatformAds } from './PlatformAds';
import { SectionNav } from './SectionNav';
import { GlobalCatalog } from './GlobalCatalog';
import type { Run } from './managementTypes';
import './platform-admin.css';
import type { View } from './platformAdmin/platformTypes';
import { Summary } from './platformAdmin/PlatformSummary';
import { Stores } from './platformAdmin/PlatformStores';
import { Users } from './platformAdmin/PlatformUsers';
import { AiPanel } from './platformAdmin/PlatformAiPanel';

/**
 * Panel del proveedor del servicio: todos los comercios, usuarios, uso de IA y catálogo global.
 * Mostrarlo no da permisos: cada función vuelve a validar en la base que sea administrador de plataforma.
 */
export function PlatformAdmin({ run, busy, active }: { run: Run; busy: boolean; active: boolean }) {
  const [view, setView] = useState<View>('summary');
  const [days, setDays] = useState(30);
  const [selectedStore, setSelectedStore] = useState<string | null>(null);
  const openStore = (id: string) => { setSelectedStore(id); setView('stores'); };
  const sections = [
    { id: 'summary', label: 'Resumen' }, { id: 'stores', label: 'Comercios' }, { id: 'billing', label: 'Planes y abonos' }, { id: 'notices', label: 'Avisos' }, { id: 'ads', label: 'Publicidad' }, { id: 'users', label: 'Usuarios' },
    { id: 'ai', label: 'Uso de IA' }, { id: 'catalog', label: 'Catálogo global' },
  ];
  return <section className="retail-panel platform-admin" aria-labelledby="platform-admin-title">
    <div className="section-heading"><div><h2 id="platform-admin-title">Panel de plataforma</h2>
      <p>Lo que se administra como proveedor del servicio. No muestra tickets, clientes ni comprobantes de los comercios.</p></div>
      {!['catalog', 'users', 'billing', 'notices', 'ads'].includes(view) && <label className="platform-period">Período<select value={days} onChange={event => setDays(Number(event.target.value))}>
        <option value={7}>Últimos 7 días</option><option value={30}>Últimos 30 días</option><option value={90}>Últimos 90 días</option><option value={365}>Último año</option>
      </select></label>}
    </div>
    <SectionNav name="platform" label="Secciones del panel de plataforma" value={view} onChange={value => setView(value as View)} sections={sections} />
    {sections.map(section => <div key={section.id} role="tabpanel" id={`platform-panel-${section.id}`} aria-labelledby={`platform-tab-${section.id}`} hidden={view !== section.id}>
      {view === section.id && section.id === 'summary' && <Summary days={days} active={active} />}
      {view === section.id && section.id === 'stores' && <Stores days={days} active={active} run={run} busy={busy} selected={selectedStore} setSelected={setSelectedStore} />}
      {view === section.id && section.id === 'ads' && <PlatformAds active={active} run={run} busy={busy} />}
      {view === section.id && section.id === 'notices' && <PlatformNotices active={active} run={run} busy={busy} />}
      {view === section.id && section.id === 'billing' && <PlatformBilling active={active} run={run} busy={busy} onOpenStore={openStore} />}
      {view === section.id && section.id === 'users' && <Users active={active} />}
      {view === section.id && section.id === 'ai' && <AiPanel days={days} active={active} run={run} busy={busy} />}
      {view === section.id && section.id === 'catalog' && <GlobalCatalog run={run} busy={busy} active={active} />}
    </div>)}
  </section>;
}
