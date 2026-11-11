import { withOffline } from '../offline';
import { locationsApi } from './locations';
import { pricingApi } from './pricing';
import { salesApi } from './sales';
import { customersApi } from './customers';
import { storesApi } from './stores';
import { teamApi } from './team';
import { billingApi } from './billing';
import { shiftsApi } from './shifts';
import { remitosApi } from './remitos';
import { suppliersApi } from './suppliers';
import { catalogLookupApi } from './catalogLookup';
import { productsApi } from './products';

export type { PendingReplenishment, PendingReplenishmentItem } from '../remitos';
export type { BillingStatus, CondicionIva } from '../billing';
export * from './types';
export { errorMessage } from './errors';
export { saleFromRow } from './saleFromRow';

/** Todas las llamadas a Supabase, agrupadas por tema en los archivos de esta carpeta. */
const remoteRetail = {
  ...locationsApi,
  ...pricingApi,
  ...salesApi,
  ...customersApi,
  ...storesApi,
  ...teamApi,
  ...billingApi,
  ...shiftsApi,
  ...remitosApi,
  ...suppliersApi,
  ...catalogLookupApi,
  ...productsApi,
};

export const retail = withOffline(remoteRetail);

if (typeof window !== "undefined") {
  (window as unknown as { retail?: typeof retail }).retail = retail;
}
