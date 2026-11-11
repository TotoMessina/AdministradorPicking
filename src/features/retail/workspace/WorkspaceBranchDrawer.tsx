import { X, MapPin } from 'lucide-react';
import type { WorkspaceState } from './useWorkspace';

/** Selector de sucursal y caja (cuando hay más de una sucursal). */
export function WorkspaceBranchDrawer({ state }: { state: WorkspaceState }) {
  const {
    session, registers, availability, branches, branchId, setBranchId, branchSelection, registerId,
    setRegisterId, shifts, cart, branchDrawerOpen, setBranchDrawerOpen, loading, busy, branchRegisters,
  } = state;
  return (
    <>
      {branches.length > 1 && (
        <>
          <div
            className={`branch-drawer-backdrop${branchDrawerOpen ? " open" : ""}`}
            onClick={() => setBranchDrawerOpen(false)}
            aria-hidden={!branchDrawerOpen}
          />
          <aside
            className={`branch-drawer-panel${branchDrawerOpen ? " open" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-label="Cambiar sucursal o caja"
            aria-hidden={!branchDrawerOpen}
          >
            <div className="branch-drawer-header">
              <div className="branch-drawer-title">
                <MapPin size={18} className="branch-drawer-icon" aria-hidden="true" />
                <div>
                  <h3>Sucursal y Caja</h3>
                  <p>Elegí dónde vas a operar</p>
                </div>
              </div>
              <button
                type="button"
                className="branch-drawer-close"
                onClick={() => setBranchDrawerOpen(false)}
                aria-label="Cerrar panel"
              >
                <X size={18} />
              </button>
            </div>

            <div className="branch-drawer-body">
              {cart.length > 0 && (
                <div className="branch-drawer-alert" role="alert">
                  Terminá o vaciá la venta actual para poder cambiar de sucursal o caja.
                </div>
              )}

              <div className="branch-drawer-controls">
                <label className="branch-drawer-field">
                  <span className="branch-drawer-field-label">Sucursal</span>
                  <select
                    disabled={busy || loading || cart.length > 0}
                    value={branchId}
                    onChange={(e) => {
                      branchSelection.current = e.target.value;
                      setBranchId(e.target.value);
                      const available = registers.filter(
                        (r) => r.active && r.branch_id === e.target.value,
                      );
                      setRegisterId(
                        available.find(
                          (r) =>
                            !availability.some(
                              (a) => a.register_id === r.id && a.occupied,
                            ),
                        )?.id ||
                          available[0]?.id ||
                          "",
                      );
                    }}
                    className="branch-drawer-select"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                  <span className="branch-drawer-field-hint">
                    Elegís el local y sus cajas disponibles.
                  </span>
                </label>

                {branchRegisters.length > 0 && (
                  <label className="branch-drawer-field">
                    <span className="branch-drawer-field-label">Caja</span>
                    <select
                      disabled={busy || loading || cart.length > 0}
                      value={registerId}
                      onChange={(e) => setRegisterId(e.target.value)}
                      className="branch-drawer-select"
                    >
                      {branchRegisters.map((r) => (
                        <option key={r.id} value={r.id}>
                          {r.name}
                          {availability.some(
                            (a) => a.register_id === r.id && a.occupied,
                          ) &&
                          !shifts.some(
                            (s) =>
                              s.register_id === r.id &&
                              !s.closed_at &&
                              s.opened_by === session.user.id,
                          )
                            ? " · En uso por otra persona"
                            : ""}
                        </option>
                      ))}
                    </select>
                    <span className="branch-drawer-field-hint">
                      Elegís el puesto donde vas a cobrar.
                    </span>
                  </label>
                )}
              </div>
            </div>

            <div className="branch-drawer-footer">
              <button
                type="button"
                className="primary-button branch-drawer-done-btn"
                onClick={() => setBranchDrawerOpen(false)}
              >
                Listo
              </button>
            </div>
          </aside>
        </>
      )}
    </>
  );
}
