import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Crosshair, LocateFixed, Search, Trash2, Check } from 'lucide-react';
import type { Branch } from './api';

export interface MapPoint { latitude: number; longitude: number }

// Sin sucursales ubicadas, el mapa arranca en Buenos Aires.
const fallbackCenter: L.LatLngTuple = [-34.6037, -58.3816];
const tiles = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const attribution = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';
const pinSvg = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>';

const pinIcon = (empty = false) => L.divIcon({
  className: 'branch-leaflet-icon',
  html: `<span class="branch-map-marker ${empty ? 'is-empty' : ''}">${pinSvg}</span>`,
  iconSize: [44, 44],
  iconAnchor: [22, 50],
  tooltipAnchor: [0, -50],
});

export const locatedPoint = (b: Branch): MapPoint | null =>
  b.latitude != null && b.longitude != null ? { latitude: b.latitude, longitude: b.longitude } : null;

/** Crea el mapa una sola vez y lo mantiene ajustado aunque el panel se muestre después. */
function useLeaflet(options: L.MapOptions) {
  const container = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const initial = useRef(options);
  useEffect(() => {
    if (!container.current) return;
    const instance = L.map(container.current, { center: fallbackCenter, zoom: 11, ...initial.current });
    L.tileLayer(tiles, { attribution, maxZoom: 19 }).addTo(instance);
    const observer = new ResizeObserver(() => instance.invalidateSize());
    observer.observe(container.current);
    setMap(instance);
    return () => { observer.disconnect(); instance.remove(); setMap(null); };
  }, []);
  return { container, map };
}

export function BranchMap({ branches, counts, onSelect }: {
  branches: Branch[];
  counts: Record<string, number>;
  onSelect: (id: string) => void;
}) {
  const { container, map } = useLeaflet({ scrollWheelZoom: false });
  const select = useRef(onSelect);
  useEffect(() => { select.current = onSelect; }, [onSelect]);
  const located = branches.filter((b) => locatedPoint(b));
  const boundsKey = located.map((b) => `${b.id}:${b.latitude},${b.longitude}`).join('|');

  useEffect(() => {
    if (!map) return;
    const layer = L.layerGroup().addTo(map);
    for (const b of located) {
      const count = counts[b.id] || 0;
      const label = document.createElement('span');
      label.textContent = `${b.name} · ${count ? `${count} ${count === 1 ? 'caja' : 'cajas'}` : 'sin cajas'}`;
      L.marker([b.latitude!, b.longitude!], { icon: pinIcon(!count), title: `Ver cajas de ${b.name}`, alt: b.name, keyboard: true })
        .bindTooltip(label, { direction: 'top', permanent: located.length <= 8, className: 'branch-leaflet-tooltip' })
        .on('click', () => select.current(b.id))
        .addTo(layer);
    }
    return () => { layer.remove(); };
    // `located` se deriva de `branches`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, branches, counts]);

  useEffect(() => {
    if (!map || !located.length) return;
    if (located.length === 1) map.setView([located[0].latitude!, located[0].longitude!], 15);
    else map.fitBounds(L.latLngBounds(located.map((b) => [b.latitude!, b.longitude!] as L.LatLngTuple)), { padding: [60, 60], maxZoom: 16 });
    // Reencuadra solo cuando cambian las ubicaciones, no al actualizar conteos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, boundsKey]);

  return <div ref={container} className="branch-leaflet-map" role="region" aria-label="Mapa de sucursales" />;
}

export function BranchLocationPicker({ branch, busy, onSave }: {
  branch: Branch;
  busy: boolean;
  onSave: (point: MapPoint | null) => Promise<boolean>;
}) {
  const saved = locatedPoint(branch);
  const [point, setPoint] = useState<MapPoint | null>(saved);
  const [query, setQuery] = useState(branch.address || '');
  const [status, setStatus] = useState('');
  const [searching, setSearching] = useState(false);
  const { container, map } = useLeaflet(saved ? { center: [saved.latitude, saved.longitude], zoom: 16 } : {});
  const marker = useRef<L.Marker | null>(null);
  const changed = point?.latitude !== saved?.latitude || point?.longitude !== saved?.longitude;

  useEffect(() => {
    if (!map) return;
    const click = (e: L.LeafletMouseEvent) => setPoint({ latitude: e.latlng.lat, longitude: e.latlng.lng });
    map.on('click', click);
    return () => { map.off('click', click); };
  }, [map]);

  useEffect(() => {
    if (!map) return;
    if (!point) { marker.current?.remove(); marker.current = null; return; }
    if (!marker.current) {
      marker.current = L.marker([point.latitude, point.longitude], { icon: pinIcon(), draggable: true, keyboard: false })
        .on('dragend', (e) => { const p = (e.target as L.Marker).getLatLng(); setPoint({ latitude: p.lat, longitude: p.lng }); })
        .addTo(map);
    } else marker.current.setLatLng([point.latitude, point.longitude]);
  }, [map, point]);

  const focus = (p: MapPoint) => { setPoint(p); map?.setView([p.latitude, p.longitude], 17); };

  const search = async () => {
    const text = query.trim();
    if (!text) { setStatus('Escribí una dirección para buscar.'); return; }
    setSearching(true);
    setStatus('');
    try {
      const response = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&accept-language=es&q=${encodeURIComponent(text)}`);
      if (!response.ok) throw new Error(String(response.status));
      const [found] = await response.json() as { lat: string; lon: string }[];
      if (!found) setStatus('No encontramos esa dirección. Probá agregando la ciudad o marcá el punto en el mapa.');
      else { focus({ latitude: Number(found.lat), longitude: Number(found.lon) }); setStatus('Revisá el punto: podés arrastrarlo para ajustarlo.'); }
    } catch {
      setStatus('No se pudo buscar la dirección. Marcá el punto tocando el mapa.');
    } finally { setSearching(false); }
  };

  const locate = () => {
    if (!navigator.geolocation) { setStatus('Este dispositivo no permite obtener la ubicación.'); return; }
    setStatus('Obteniendo ubicación…');
    navigator.geolocation.getCurrentPosition(
      (p) => { focus({ latitude: p.coords.latitude, longitude: p.coords.longitude }); setStatus('Revisá el punto: podés arrastrarlo para ajustarlo.'); },
      () => setStatus('No se pudo obtener tu ubicación. Revisá los permisos del navegador.'),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="branch-location-picker">
      <div className="branch-modal-section-title">
        <Crosshair size={16} />
        <h3>Ubicación en el mapa</h3>
        {!saved && <span className="location-pill-badge">Sin ubicar</span>}
      </div>
      <form className="branch-location-search" onSubmit={(e) => { e.preventDefault(); void search(); }}>
        <label className="store-field-label" htmlFor={`branch-search-${branch.id}`}>Buscar dirección</label>
        <div className="location-add-row">
          <input id={`branch-search-${branch.id}`} className="store-text-input" value={query} maxLength={300}
            onChange={(e) => setQuery(e.target.value)} placeholder="Ej. Av. San Martín 100, Córdoba" />
          <button className="secondary-button" disabled={busy || searching}><Search size={14} /> {searching ? 'Buscando…' : 'Buscar'}</button>
        </div>
      </form>
      <div ref={container} className="branch-leaflet-map is-picker" role="region" aria-label="Elegí la ubicación tocando el mapa" />
      <p className="routing-helper-text" role="status">{status || 'Tocá el mapa para ubicar el local o arrastrá el pin para ajustarlo.'}</p>
      <div className="location-edit-actions">
        <button type="button" className="text-button" disabled={busy} onClick={locate}><LocateFixed size={14} /> Usar mi ubicación</button>
        <div className="location-edit-actions-right">
          {saved && <button type="button" className="text-button" disabled={busy} onClick={async () => { if (await onSave(null)) setPoint(null); }}><Trash2 size={14} /> Quitar del mapa</button>}
          <button type="button" className="primary-button" disabled={busy || !point || !changed} onClick={() => void onSave(point)}><Check size={15} /> Guardar ubicación</button>
        </div>
      </div>
    </div>
  );
}
