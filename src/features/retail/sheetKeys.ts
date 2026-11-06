import type { KeyboardEvent } from 'react';

/**
 * Como en Excel: Enter y las flechas ↑/↓ pasan a la misma columna (`td[data-col]`) de la fila de abajo o de arriba.
 * En un desplegable solo Enter mueve, así las flechas siguen eligiendo opciones.
 */
export function moveInColumn(event: KeyboardEvent<HTMLElement>) {
  if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key) || event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.currentTarget instanceof HTMLSelectElement && event.key !== 'Enter') return;
  const cell = event.currentTarget.closest('td');
  const tr = cell?.parentElement;
  if (!cell || !tr) return;
  event.preventDefault();
  const column = cell.dataset.col;
  let next = (event.key === 'ArrowUp' ? tr.previousElementSibling : tr.nextElementSibling) as HTMLElement | null;
  while (next) {
    const target = next.querySelector<HTMLElement>(`td[data-col="${column}"] input:not(:disabled), td[data-col="${column}"] select:not(:disabled)`);
    if (target) { target.focus(); if (target instanceof HTMLInputElement) target.select(); return; }
    next = (event.key === 'ArrowUp' ? next.previousElementSibling : next.nextElementSibling) as HTMLElement | null;
  }
}
