import type { Store, Product, Shift, Movement, Role, Member } from '../../features/retail/api';
import type { KioscoSale } from '../../types/kiosco';

export interface AIAssistantProps {
  store: Store;
  products: Product[];
  shifts: Shift[];
  sales: KioscoSale[];
  movements: Movement[];
  role: Role;
  ownerEmail?: string;
  members?: Member[];
}
