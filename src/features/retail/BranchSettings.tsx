import { Building2 } from 'lucide-react';
import { useBranchSettings, type BranchSettingsProps } from './businessSettings/useBranchSettings';
import { BranchList } from './businessSettings/BranchList';
import { BranchEditorModal } from './businessSettings/BranchEditorModal';

/** Sucursales: alta, edición, ubicación y cajas. */

export function BranchSettings(props: BranchSettingsProps) {
  const state = useBranchSettings(props);
  return (
    <div className="store-settings-card">
      <div className="store-settings-header">
        <div className="store-settings-header-icon">
          <Building2 size={22} />
        </div>
        <div className="store-settings-header-text">
          <h3>Locales y sucursales</h3>
          <p>Elegí un local en el mapa o en la lista para ver sus cajas, ubicarlo o eliminarlo.</p>
        </div>
      </div>

      <BranchList state={state} />

      <BranchEditorModal state={state} />
    </div>
  );
}
