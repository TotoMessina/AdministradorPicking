import type { Props } from './priceListHelpers';
import { usePriceListSelection } from './usePriceListSelection';
import { usePriceListTree } from './usePriceListTree';

export type PriceListSettingsProps = Props;

/** Props con los valores por defecto que tenía la firma original. */
export const priceListSettingsProps = (props: PriceListSettingsProps) => ({
  ...props,
  categories: (props.categories === undefined ? [] : props.categories) as Exclude<PriceListSettingsProps['categories'], undefined>,
  branches: (props.branches === undefined ? [] : props.branches) as Exclude<PriceListSettingsProps['branches'], undefined>,
  expanded: (props.expanded === undefined ? false : props.expanded) as Exclude<PriceListSettingsProps['expanded'], undefined>,
});

/** Todo el estado y las acciones de PriceListSettings. */
export function usePriceListSettings(props: PriceListSettingsProps) {
  const base = priceListSettingsProps(props);
  const s1 = usePriceListSelection(base);
  const s2 = usePriceListTree({ ...base, ...s1 });
  return { ...base, ...s1, ...s2 };
}

export type PriceListSettingsState = ReturnType<typeof usePriceListSettings>;
