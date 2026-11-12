import { NumberInput } from '../NumberInput';
import React, { useEffect, useRef, useState } from 'react';
import type { KioscoCartItem } from '../../types/kiosco';

/** Cantidad editable de un renglón del carrito, con control de stock. */
export function CartQuantityInput({
  item,
  availableStock,
  disabled,
  onUpdateQty,
  onNotify,
}: {
  item: KioscoCartItem;
  availableStock: number;
  disabled?: boolean;
  onUpdateQty: (qty: number) => void;
  onNotify?: (msg: string) => void;
}) {
  const [text, setText] = useState(String(item.qty));
  const isFocused = useRef(false);
  const isManual = item.product.code === "MANUAL";
  const maxStock = isManual ? 999999 : Math.max(1, availableStock);

  useEffect(() => {
    if (!isFocused.current) {
      setText(String(item.qty));
    }
  }, [item.qty]);

  const commitValue = (val: number) => {
    let finalQty = val;
    if (isNaN(finalQty) || finalQty < 1) {
      finalQty = 1;
    } else if (!isManual && finalQty > maxStock) {
      finalQty = maxStock;
      onNotify?.(`Stock máximo disponible para ${item.product.name}: ${maxStock} u.`);
    }
    setText(String(finalQty));
    onUpdateQty(finalQty);
  };

  const handleInputChange = (value: string) => {
    if (!/^\d*$/.test(value)) return;
    const raw = value;
    if (!raw) {
      setText("");
      return;
    }
    const num = parseInt(raw, 10);
    if (!isManual && num > maxStock) {
      commitValue(maxStock);
      return;
    }
    setText(raw);
    if (num >= 1) {
      onUpdateQty(num);
    }
  };

  const handleBlur = () => {
    isFocused.current = false;
    const num = parseInt(text, 10);
    commitValue(num);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      const num = parseInt(text, 10);
      commitValue(num);
      e.currentTarget.blur();
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      setText(String(item.qty));
      e.currentTarget.blur();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const current = parseInt(text, 10) || item.qty;
      commitValue(current + 1);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      const current = parseInt(text, 10) || item.qty;
      commitValue(Math.max(1, current - 1));
    }
  };

  return (
    <NumberInput
      type="number"
      inputMode="numeric"
      step="1"
      disabled={disabled}
      className="cart-qty-input"
      style={{ '--cart-qty-width': `${Math.max(3, Number(text || 0).toLocaleString('es-AR').length)}ch` } as React.CSSProperties}
      value={text}
      title="Hacé clic para escribir la cantidad con el teclado"
      aria-label={`Cantidad de ${item.product.name}`}
      onFocus={(e) => {
        isFocused.current = true;
        e.currentTarget.select();
      }}
      onValueChange={handleInputChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}
