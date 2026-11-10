/**
 * Ayuda global para formularios: cuando algo impide avanzar, llevar a la persona a eso y marcarlo.
 *
 * - Campo inválido al enviar (requerido, número fuera de rango, correo mal escrito…): se marca en rojo con su
 *   mensaje debajo, se abren las secciones plegadas que lo contienen, se lleva a la vista y se enfoca. El
 *   navegador solo no puede enfocar un campo dentro de un «Más opciones» cerrado, y el envío fallaba en silencio.
 * - Mensaje de error de la app (role="alert") que aparece fuera de la pantalla: se lleva a la vista.
 * - La marca se quita sola cuando el campo pasa a ser válido.
 *
 * Solo agrega atributos propios (data-feedback-invalid, data-field-error) y no inserta nodos, así no interfiere
 * con React. No cambia qué se valida ni cómo se guarda.
 */
type Field = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

const isField = (node: EventTarget | null): node is Field =>
  node instanceof HTMLInputElement || node instanceof HTMLSelectElement || node instanceof HTMLTextAreaElement;
const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
const offscreen = (element: Element) => {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && (rect.top < 64 || rect.bottom > window.innerHeight - 24);
};
const reveal = (element: Element) => element.scrollIntoView({ block: 'center', behavior: reducedMotion() ? 'auto' : 'smooth' });
// Dónde va el mensaje: la etiqueta o celda del campo, o su contenedor directo (si es una fila, como contraseña con
// el botón del ojo, el mensaje pasa a una segunda línea por CSS).
const holder = (field: Field): Element | null => field.closest('label, td') ?? field.parentElement;

function mark(field: Field) {
  field.setAttribute('aria-invalid', 'true');
  field.dataset.feedbackInvalid = 'true';
  const place = holder(field);
  if (place && field.validationMessage) place.setAttribute('data-field-error', field.validationMessage);
}

function clear(field: Field) {
  if (field.dataset.feedbackInvalid !== 'true' || !field.validity.valid) {
    // Mientras siga inválido, el mensaje acompaña lo que se escribe.
    if (field.dataset.feedbackInvalid === 'true') holder(field)?.setAttribute('data-field-error', field.validationMessage);
    return;
  }
  field.removeAttribute('aria-invalid');
  delete field.dataset.feedbackInvalid;
  holder(field)?.removeAttribute('data-field-error');
}

let installed = false;
export function installFormFeedback() {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  let first: Field | null = null;
  let reporting = false;

  document.addEventListener('invalid', event => {
    const field = event.target;
    if (!isField(field) || reporting) return;
    mark(field);
    // Abrir lo plegado que lo esconde («Más opciones», «Datos fiscales», etc.).
    for (let parent = field.parentElement; parent; parent = parent.parentElement) {
      if (parent instanceof HTMLDetailsElement && !parent.open) parent.open = true;
    }
    if (first) return;
    first = field;
    // Después de que el navegador intente lo suyo: si no pudo enfocarlo, lo hacemos nosotros.
    setTimeout(() => {
      const target = first;
      first = null;
      if (!target || !target.isConnected) return;
      if (offscreen(target)) reveal(target);
      if (document.activeElement !== target) {
        target.focus({ preventScroll: true });
        reporting = true;
        try { target.reportValidity(); } finally { reporting = false; }
      }
    }, 0);
  }, true);

  const recheck = (event: Event) => { if (isField(event.target)) clear(event.target); };
  document.addEventListener('input', recheck, true);
  document.addEventListener('change', recheck, true);

  // Errores que muestra la app al intentar guardar: si quedan fuera de la pantalla, se traen a la vista.
  // Solo justo después de que la persona envió o tocó un botón: un aviso de fondo no mueve la pantalla.
  let intentAt = 0;
  const intent = (event: Event) => { if (event.type === 'submit' || (event.target instanceof Element && event.target.closest('button'))) intentAt = Date.now(); };
  document.addEventListener('submit', intent, true);
  document.addEventListener('click', intent, true);
  let queued = false;
  const pendingAlerts = new Set<Element>();
  new MutationObserver(records => {
    for (const record of records) {
      const node = record.target instanceof Element ? record.target : record.target.parentElement;
      const alert = node?.closest('[role="alert"]');
      if (alert) pendingAlerts.add(alert);
      record.addedNodes.forEach(added => {
        if (!(added instanceof Element)) return;
        if (added.matches('[role="alert"]')) pendingAlerts.add(added);
        added.querySelectorAll('[role="alert"]').forEach(found => pendingAlerts.add(found));
      });
    }
    if (Date.now() - intentAt > 4000) { pendingAlerts.clear(); return; }
    if (queued || !pendingAlerts.size) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      const visible = [...pendingAlerts].filter(alert => alert.isConnected && alert.textContent?.trim() && !alert.closest('[hidden], .toast-container'));
      pendingAlerts.clear();
      // El primero en la página (por ejemplo, la primera fila con error de una planilla).
      visible.sort((a, b) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1);
      const target = visible[0];
      if (target && offscreen(target)) reveal(target);
    });
  }).observe(document.body, { childList: true, subtree: true, characterData: true });
}
