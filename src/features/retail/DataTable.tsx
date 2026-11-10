import { Fragment, useState, type ReactNode } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import './data-table.css';

export interface DataColumn<T> {
  id: string;
  label: string;
  /** Importes y cantidades: alineados a la derecha. */
  num?: boolean;
  cell: (row: T) => ReactNode;
}

/**
 * Tabla de consulta como en Excel: una fila por registro, encabezado fijo, importes alineados y, si hace falta,
 * una fila desplegable con el detalle y sus acciones. En pantallas angostas cada fila se ve como una tarjeta con
 * sus campos etiquetados.
 */
export function DataTable<T>({ rows, columns, rowKey, label, actions, detail, detailLabel = 'Ver detalle', empty, rowClass }: {
  rows: T[];
  columns: DataColumn<T>[];
  rowKey: (row: T) => string;
  /** Nombre de la tabla para lectores de pantalla. */
  label: string;
  /** Botones al final de la fila (por ejemplo, Pagar). */
  actions?: (row: T) => ReactNode;
  /** Contenido de la fila desplegable; `close` la pliega. */
  detail?: (row: T, close: () => void) => ReactNode;
  detailLabel?: string;
  empty?: ReactNode;
  rowClass?: (row: T) => string | undefined;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const span = columns.length + (actions || detail ? 1 : 0);
  return <div className="data-table-scroll" role="region" aria-label={label} tabIndex={0}>
    <table className="data-table">
      <thead><tr>
        {columns.map(column => <th key={column.id} scope="col" className={column.num ? 'num' : undefined}>{column.label}</th>)}
        {(actions || detail) && <th scope="col"><span className="sr-only">Acciones</span></th>}
      </tr></thead>
      <tbody>
        {!rows.length && <tr><td colSpan={span} className="data-table-empty">{empty ?? 'Sin registros.'}</td></tr>}
        {rows.map(row => {
          const key = rowKey(row);
          const expanded = open === key;
          return <Fragment key={key}>
            <tr className={[expanded ? 'is-open' : '', rowClass?.(row) ?? ''].join(' ').trim() || undefined}>
              {columns.map(column => <td key={column.id} data-label={column.label} className={column.num ? 'num' : undefined}>{column.cell(row)}</td>)}
              {(actions || detail) && <td className="data-table-actions">
                {actions?.(row)}
                {detail && <button type="button" className="text-button" aria-expanded={expanded} onClick={() => setOpen(expanded ? null : key)}>
                  {expanded ? <><ChevronUp size={14} aria-hidden="true" /> Ocultar</> : <><ChevronDown size={14} aria-hidden="true" /> {detailLabel}</>}</button>}
              </td>}
            </tr>
            {detail && expanded && <tr className="data-table-detail"><td colSpan={span}>{detail(row, () => setOpen(null))}</td></tr>}
          </Fragment>;
        })}
      </tbody>
    </table>
  </div>;
}
