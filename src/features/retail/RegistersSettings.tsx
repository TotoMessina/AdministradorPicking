import { Monitor } from 'lucide-react';
import { useRegistersSettings, type RegistersSettingsProps } from './registersSettings/useRegistersSettings';
import { RegistersList } from './registersSettings/RegistersList';

export function RegistersSettings(props: RegistersSettingsProps) {
  const state = useRegistersSettings(props);
  const { scoped, activeRegisters } = state;
  return (
    <div className={scoped ? 'branch-modal-registers' : 'store-settings-card'}>
      {scoped ? (
        <div className="branch-modal-section-title">
          <Monitor size={16} />
          <h3>Cajas de cobro</h3>
          <span className="location-pill-badge">{activeRegisters.length}</span>
        </div>
      ) : (
      <div className="store-settings-header">
        <div className="store-settings-header-icon">
          <Monitor size={22} />
        </div>
        <div className="store-settings-header-text">
          <h3>Cajas de cobro</h3>
          <p>Cada caja es un lugar donde se cobra (un mostrador, una PC). Pertenece a un local y se abre y se cierra contando la plata.</p>
        </div>
      </div>
      )}

      <RegistersList state={state} />
    </div>
  );
}
