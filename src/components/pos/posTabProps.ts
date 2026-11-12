import React from 'react';
import type { KioscoProduct, KioscoCartItem, PaymentMethod, KioscoSale } from '../../types/kiosco';

export interface PosTabProps {
  active?: boolean;
  products: KioscoProduct[];
  cart: KioscoCartItem[];
  setCart: React.Dispatch<React.SetStateAction<KioscoCartItem[]>>;
  onCompleteSale: (sale: KioscoSale) => void | Promise<void>;
  onTriggerChecklist: (key: string) => void;
  onGoToCreateProduct?: () => void;
  isLoading?: boolean;
  storeName?: string;
  onOpenAi?: () => void;
  stationControls?: React.ReactNode;
  saleLedgerLabel?: (method: PaymentMethod) => string;
  storeId?: string;
  branchId?: string;
  canCustomizeQuick?: boolean;
  mobilePosView?: "catalog" | "checkout";
  onMobilePosViewChange?: (view: "catalog" | "checkout") => void;
  /** Clientes de cuenta corriente: habilitan el pago «Fiado». */
  customers?: CreditCustomer[];
  canOverLimit?: boolean;
  /** Facturación ARCA activa: el cliente elegido recibe la factura a su nombre. */
  billingEnabled?: boolean;
}
export interface CreditCustomer { id: string; name: string; balance: number; credit_limit: number | null; active: boolean; tax_id?: string | null; iva_condition?: string | null }
