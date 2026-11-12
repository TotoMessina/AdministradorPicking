import type { AIReportPanelProps } from './aiReportTypes';
import { useAiReportPanelState } from './useAiReportPanelState';

export type { AIReportPanelProps };

/** Props con los valores por defecto que tenía la firma original. */
export const aiReportPanelProps = (props: AIReportPanelProps) => ({
  ...props,
  shifts: (props.shifts === undefined ? [] : props.shifts) as Exclude<AIReportPanelProps['shifts'], undefined>,
  allSales: (props.allSales === undefined ? [] : props.allSales) as Exclude<AIReportPanelProps['allSales'], undefined>,
  products: (props.products === undefined ? [] : props.products) as Exclude<AIReportPanelProps['products'], undefined>,
  storeName: (props.storeName === undefined ? "Kiosco Express" : props.storeName) as Exclude<AIReportPanelProps['storeName'], undefined>,
  role: (props.role === undefined ? "owner" : props.role) as Exclude<AIReportPanelProps['role'], undefined>,
});

/** Todo el estado y las acciones de AIReportPanel. */
export function useAiReportPanel(props: AIReportPanelProps) {
  const base = aiReportPanelProps(props);
  const s1 = useAiReportPanelState(base);
  return { ...base, ...s1 };
}

export type AiReportPanelState = ReturnType<typeof useAiReportPanel>;
