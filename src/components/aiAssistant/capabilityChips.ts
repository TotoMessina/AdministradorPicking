import { TrendingUp, AlertTriangle, Trophy, LayoutGrid, ShoppingCart } from 'lucide-react';

/** Preguntas sugeridas al abrir el asistente. */
export const INITIAL_CAPABILITY_CHIPS = [
  { label: "¿Tengo mercadería clavada o por vencer?", icon: AlertTriangle },
  { label: "¿Cómo va el negocio esta semana?", icon: TrendingUp },
  { label: "¿Detectaste algo raro en los cierres de caja?", icon: AlertTriangle },
  { label: "¿Qué distribuidor me deja más margen?", icon: TrendingUp },
  { label: "Analizá mis productos sin movimiento", icon: AlertTriangle },
  { label: "¿Cuál fue mi mejor día de caja del mes?", icon: Trophy },
  { label: "Sugerí categorías para reorganizar el catálogo", icon: LayoutGrid },
  { label: "¿Qué debería comprar esta semana?", icon: ShoppingCart },
  { label: "¿De qué me voy a quedar sin stock esta semana?", icon: ShoppingCart },
];
