import { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { date, dateTime, Feedback, number, usePlatformData } from '../platformShared';
import { type UserRow, roles } from './platformTypes';

// Usuarios de la plataforma.
export function Users({ active }: { active: boolean }) {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const list = usePlatformData<UserRow[]>('retail_admin_users', { p_search: search || null }, active);
  return <div className="platform-stack">
    <form className="platform-filters" onSubmit={event => { event.preventDefault(); setSearch(query.trim()); }}>
      <label className="platform-search">Buscar<span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Correo o ID de usuario" />
        <button className="secondary-button" disabled={list.loading}>Buscar</button></span></label>
    </form>
    <Feedback loading={list.loading} error={list.error} />
    {list.data && !list.data.length && <p className="platform-muted">No hay usuarios con esa búsqueda.</p>}
    {list.data && list.data.length > 0 && <>
      <p className="platform-muted">{list.data.length >= 200 ? 'Se muestran los 200 más recientes; buscá por correo para acotar.' : `${number(list.data.length)} usuarios.`}</p>
      <div className="platform-table-wrap"><table className="platform-table">
        <thead><tr><th scope="col">Usuario</th><th scope="col">Alta</th><th scope="col">Último ingreso</th><th scope="col">Comercios</th></tr></thead>
        <tbody>{list.data.map(user => <tr key={user.user_id}>
          <th scope="row"><strong>{user.email}{user.is_platform_admin && <span className="platform-pill is-admin"><BadgeCheck size={12} aria-hidden="true" /> Plataforma</span>}</strong>
            <small>{user.confirmed ? 'Correo confirmado' : 'Correo sin confirmar'}</small></th>
          <td>{date(user.created_at)}</td>
          <td>{dateTime(user.last_sign_in_at)}</td>
          <td>{user.stores.length ? user.stores.map(store => `${store.name} (${roles[store.role] || store.role})`).join(', ') : <span className="platform-muted">Sin comercio</span>}</td>
        </tr>)}</tbody>
      </table></div>
    </>}
  </div>;
}
