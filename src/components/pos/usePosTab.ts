import type { PosTabProps } from './posTabProps';
import { usePosState } from './usePosState';
import { usePosActions } from './usePosActions';

export type { PosTabProps };

/** Props con los valores por defecto que tenía la firma original. */
export const posTabProps = (props: PosTabProps) => ({
  ...props,
  active: (props.active === undefined ? true : props.active) as Exclude<PosTabProps['active'], undefined>,
  canCustomizeQuick: (props.canCustomizeQuick === undefined ? false : props.canCustomizeQuick) as Exclude<PosTabProps['canCustomizeQuick'], undefined>,
  controlledMobileView: props.mobilePosView,
  canOverLimit: (props.canOverLimit === undefined ? false : props.canOverLimit) as Exclude<PosTabProps['canOverLimit'], undefined>,
  billingEnabled: (props.billingEnabled === undefined ? false : props.billingEnabled) as Exclude<PosTabProps['billingEnabled'], undefined>,
});

/** Todo el estado y las acciones de PosTab. */
export function usePosTab(props: PosTabProps) {
  const base = posTabProps(props);
  const s1 = usePosState(base);
  const s2 = usePosActions({ ...base, ...s1 });
  return { ...base, ...s1, ...s2 };
}

export type PosTabState = ReturnType<typeof usePosTab>;
