import type { KioscoSale } from '../../../types/kiosco';
import { retail, type Movement, type Register, type Shift, type Store } from '../api';
import type { Run } from '../Management';
import { useCashDeskState } from './useCashDeskState';
import { useCashDeskAi } from './useCashDeskAi';

export type CashDeskProps = {
  storeId: string;
  /** Datos del comercio para el encabezado de los recibos de ingresos y retiros. */
  storeInfo?: Pick<Store, 'name' | 'address' | 'razon_social' | 'cuit'>;
  register: Register | undefined;
  shift: Shift | undefined;
  shifts: Shift[];
  sales: KioscoSale[];
  movements: Movement[];
  canOperate: boolean;
  run: Run;
  busy: boolean;
  onTicket: (sale: KioscoSale) => void;
  onRefresh: () => void;
  occupiedByOther?: boolean;
  cashierMode?: boolean;
  onSell?: () => void;
  active?: boolean;
  openFromSale?: boolean;
  onOpened?: () => void;
  hasPendingSale?: boolean;
  openShift?: (store: string, register: string, opening: number) => Promise<unknown>;
  openingOnly?: boolean;
  closeRequest?: number;
  onCloseRequestHandled?: () => void;
  allowIncome?: boolean;
  allowWithdrawal?: boolean;
  canUseAccounts?: boolean;
  canRefund?: boolean;
};

/** Props con los valores por defecto que tenía la firma original. */
export const cashDeskProps = (props: CashDeskProps) => ({
  ...props,
  occupiedByOther: (props.occupiedByOther === undefined ? false : props.occupiedByOther) as Exclude<CashDeskProps['occupiedByOther'], undefined>,
  cashierMode: (props.cashierMode === undefined ? false : props.cashierMode) as Exclude<CashDeskProps['cashierMode'], undefined>,
  active: (props.active === undefined ? true : props.active) as Exclude<CashDeskProps['active'], undefined>,
  openFromSale: (props.openFromSale === undefined ? false : props.openFromSale) as Exclude<CashDeskProps['openFromSale'], undefined>,
  hasPendingSale: (props.hasPendingSale === undefined ? false : props.hasPendingSale) as Exclude<CashDeskProps['hasPendingSale'], undefined>,
  openShift: (props.openShift === undefined ? retail.openShift : props.openShift) as Exclude<CashDeskProps['openShift'], undefined>,
  openingOnly: (props.openingOnly === undefined ? false : props.openingOnly) as Exclude<CashDeskProps['openingOnly'], undefined>,
  closeRequest: (props.closeRequest === undefined ? 0 : props.closeRequest) as Exclude<CashDeskProps['closeRequest'], undefined>,
  allowIncome: (props.allowIncome === undefined ? true : props.allowIncome) as Exclude<CashDeskProps['allowIncome'], undefined>,
  allowWithdrawal: (props.allowWithdrawal === undefined ? true : props.allowWithdrawal) as Exclude<CashDeskProps['allowWithdrawal'], undefined>,
  canUseAccounts: (props.canUseAccounts === undefined ? false : props.canUseAccounts) as Exclude<CashDeskProps['canUseAccounts'], undefined>,
  canRefund: (props.canRefund === undefined ? false : props.canRefund) as Exclude<CashDeskProps['canRefund'], undefined>,
});

/** Todo el estado y las acciones de CashDesk. */
export function useCashDesk(props: CashDeskProps) {
  const base = cashDeskProps(props);
  const s1 = useCashDeskState(base);
  const s2 = useCashDeskAi({ ...base, ...s1 });
  return { ...base, ...s1, ...s2 };
}

export type CashDeskState = ReturnType<typeof useCashDesk>;
