/**
 * Menús desplegables (`<details data-dropdown>` con un hijo `[data-dropdown-menu]`):
 * - uno abierto por vez: abrir otro cierra el anterior;
 * - se cierran al tocar afuera, con Escape (el foco vuelve a su botón) o al elegir una opción;
 * - se dibujan por encima de la barra de navegación y de los encabezados fijos, dentro de la pantalla:
 *   abren hacia abajo si hay lugar y, si no, hacia arriba, con desplazamiento propio cuando no entran.
 */
const MARGIN = 8;
const openMenus = () => [...document.querySelectorAll<HTMLDetailsElement>('details[data-dropdown][open]')];

/** Bordes libres de la pantalla, descontando barras fijas (navegación de abajo en el celular, encabezado de arriba). */
function freeArea() {
  let top = MARGIN; let bottom = window.innerHeight - MARGIN;
  for (const bar of document.querySelectorAll<HTMLElement>('.app-sidebar nav, .mobile-cart-bar, [data-fixed-bar]')) {
    const style = getComputedStyle(bar);
    if (style.position !== 'fixed' || style.display === 'none' || style.visibility === 'hidden') continue;
    const rect = bar.getBoundingClientRect();
    if (!rect.height) continue;
    if (rect.top > window.innerHeight / 2) bottom = Math.min(bottom, rect.top - MARGIN);
    else top = Math.max(top, rect.bottom + MARGIN);
  }
  return { top, bottom };
}

function place(details: HTMLDetailsElement) {
  const summary = details.querySelector<HTMLElement>(':scope > summary');
  const menu = details.querySelector<HTMLElement>(':scope > [data-dropdown-menu]');
  if (!summary || !menu) return;
  const anchor = summary.getBoundingClientRect();
  Object.assign(menu.style, { position: 'fixed', zIndex: '1150', top: '', bottom: '', left: '', right: 'auto', maxHeight: '', overflowY: 'auto' });
  const width = Math.min(menu.offsetWidth, window.innerWidth - 2 * MARGIN);
  const { top, bottom } = freeArea();
  const below = bottom - anchor.bottom - 6;
  const above = anchor.top - top - 6;
  const needed = Math.min(menu.scrollHeight, 320);
  const downward = below >= needed || below >= above;
  // Alineado al borde derecho del botón, como antes, pero sin salirse de la pantalla por ningún lado.
  const left = Math.min(Math.max(anchor.right - width, MARGIN), window.innerWidth - width - MARGIN);
  menu.style.left = `${left}px`;
  menu.style.maxWidth = `${window.innerWidth - 2 * MARGIN}px`;
  if (downward) { menu.style.top = `${anchor.bottom + 6}px`; menu.style.maxHeight = `${Math.max(120, below)}px`; }
  else { menu.style.bottom = `${window.innerHeight - anchor.top + 6}px`; menu.style.maxHeight = `${Math.max(120, above)}px`; }
}

function close(details: HTMLDetailsElement, focus = false) {
  details.open = false;
  if (focus) details.querySelector<HTMLElement>(':scope > summary')?.focus();
}

/** Se instala una vez para toda la app. Devuelve la función que lo desinstala. */
export function installDropdownMenus(): () => void {
  const onToggle = (event: Event) => {
    const details = event.target;
    if (!(details instanceof HTMLDetailsElement) || !details.hasAttribute('data-dropdown')) return;
    if (!details.open) return;
    for (const other of openMenus()) if (other !== details) close(other);
    place(details);
  };
  const onPointerDown = (event: PointerEvent) => {
    for (const details of openMenus()) if (!details.contains(event.target as Node)) close(details);
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Escape') return;
    const current = openMenus();
    if (!current.length) return;
    for (const details of current) close(details, details.contains(document.activeElement));
  };
  const onClick = (event: MouseEvent) => {
    // Elegir una opción cierra el menú; las casillas (como Columnas) lo dejan abierto para marcar varias.
    const option = (event.target as HTMLElement).closest('[data-dropdown-menu] button');
    const details = option?.closest<HTMLDetailsElement>('details[data-dropdown]');
    if (option && details && !details.hasAttribute('data-dropdown-keep-open')) close(details);
  };
  let frame = 0;
  const reposition = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(() => openMenus().forEach(place)); };
  document.addEventListener('toggle', onToggle, true);
  document.addEventListener('pointerdown', onPointerDown, true);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('click', onClick);
  window.addEventListener('scroll', reposition, true);
  window.addEventListener('resize', reposition);
  return () => {
    document.removeEventListener('toggle', onToggle, true);
    document.removeEventListener('pointerdown', onPointerDown, true);
    document.removeEventListener('keydown', onKeyDown);
    document.removeEventListener('click', onClick);
    window.removeEventListener('scroll', reposition, true);
    window.removeEventListener('resize', reposition);
    cancelAnimationFrame(frame);
  };
}
