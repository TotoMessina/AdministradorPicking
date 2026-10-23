import { useState } from 'react';
import { retail, type Category } from './api';
import type { Run } from './Management';

export function CategoryLabelEditor({ storeId, category, busy, run, close }: {
  storeId: string; category: Category; busy: boolean; run: Run; close: () => void;
}) {
  const [snapshot] = useState(category);
  const [name, setName] = useState(category.name);
  return <form className="retail-form" onSubmit={async event => {
    event.preventDefault();
    if (await run(() => retail.renameCategory(storeId, snapshot, name), 'Nombre de categoría actualizado')) close();
  }}>
    <label>Nombre en tu comercio<input required maxLength={80} value={name} disabled={busy} onChange={event => setName(event.target.value)} /></label>
    <p>Solo cambia cómo se muestra en este comercio. Categoría original: {snapshot.canonicalName || snapshot.name}.</p>
    <div className="button-row">
      <button className="primary-button" disabled={busy || name.trim() === snapshot.name}>Guardar nombre</button>
      <button type="button" className="text-button" disabled={busy} onClick={() => setName(snapshot.canonicalName || snapshot.name)}>Usar nombre original</button>
    </div>
  </form>;
}
