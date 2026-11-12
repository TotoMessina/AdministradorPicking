import type { KioscoProduct, KioscoCartItem, PaymentMethod, KioscoSale } from '../../types/kiosco';
import type { Shift, Movement } from '../../features/retail/api';
import { useAiWidgetChat } from './useAiWidgetChat';
import { useAiWidgetQuery } from './useAiWidgetQuery';

export interface AiAssistantWidgetProps {
  storeName?: string;
  currentTab?: "home" | "pos" | "cash" | "catalog" | "suppliers" | "finance" | "money" | "customers" | "settings" | "remito" | "ai";
  products: KioscoProduct[];
  cart: KioscoCartItem[];
  total: number;
  paymentMethod?: PaymentMethod;
  shifts?: Shift[];
  sales?: KioscoSale[];
  movements?: Movement[];
  role?: string;
  isOpen: boolean;
  onToggle: (open: boolean) => void;
  onOpenFull?: () => void;
}

/** Props con los valores por defecto que tenía la firma original. */
export const aiAssistantWidgetProps = (props: AiAssistantWidgetProps) => ({
  ...props,
  storeName: (props.storeName === undefined ? "tu comercio" : props.storeName) as Exclude<AiAssistantWidgetProps['storeName'], undefined>,
  currentTab: (props.currentTab === undefined ? "pos" : props.currentTab) as Exclude<AiAssistantWidgetProps['currentTab'], undefined>,
  paymentMethod: (props.paymentMethod === undefined ? "Efectivo" : props.paymentMethod) as Exclude<AiAssistantWidgetProps['paymentMethod'], undefined>,
  shifts: (props.shifts === undefined ? [] : props.shifts) as Exclude<AiAssistantWidgetProps['shifts'], undefined>,
  sales: (props.sales === undefined ? [] : props.sales) as Exclude<AiAssistantWidgetProps['sales'], undefined>,
  movements: (props.movements === undefined ? [] : props.movements) as Exclude<AiAssistantWidgetProps['movements'], undefined>,
  role: (props.role === undefined ? "cajero" : props.role) as Exclude<AiAssistantWidgetProps['role'], undefined>,
});

/** Todo el estado y las acciones de AiAssistantWidget. */
export function useAiAssistantWidget(props: AiAssistantWidgetProps) {
  const base = aiAssistantWidgetProps(props);
  const s1 = useAiWidgetChat(base);
  const s2 = useAiWidgetQuery({ ...base, ...s1 });
  return { ...base, ...s1, ...s2 };
}

export type AiAssistantWidgetState = ReturnType<typeof useAiAssistantWidget>;
