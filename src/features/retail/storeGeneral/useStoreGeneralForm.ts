import { useState, useEffect } from 'react';
import type { StoreGeneralSettingsFormProps } from './useStoreGeneralSettings';

/** Datos editables del comercio. */
export function useStoreGeneralForm(ctx: StoreGeneralSettingsFormProps) {
  const { store } = ctx;
  const [name, setName] = useState(store.name);
  const [address, setAddress] = useState(store.address || '');
  const [phone, setPhone] = useState(store.phone || '');
  const [message, setMessage] = useState(store.receipt_message || '');
  const [color, setColor] = useState(store.accent_color || '#2563eb');
  const [isDirty, setIsDirty] = useState(false);

  useEffect(() => {
    setName(store.name);
    setAddress(store.address || '');
    setPhone(store.phone || '');
    setMessage(store.receipt_message || '');
    setColor(store.accent_color || '#2563eb');
    setIsDirty(false);
  }, [store.id, store.name, store.address, store.phone, store.receipt_message, store.accent_color]);

  const handleReset = () => {
    setName(store.name);
    setAddress(store.address || '');
    setPhone(store.phone || '');
    setMessage(store.receipt_message || '');
    setColor(store.accent_color || '#2563eb');
    setIsDirty(false);
  };

  const PRESET_COLORS = [
    { name: 'Azul clásico', hex: '#2563eb' },
    { name: 'Índigo moderno', hex: '#6366f1' },
    { name: 'Esmeralda', hex: '#10b981' },
    { name: 'Ámbar cálido', hex: '#f59e0b' },
    { name: 'Rosa intenso', hex: '#e11d48' },
    { name: 'Púrpura', hex: '#8b5cf6' },
    { name: 'Pizarra', hex: '#475569' },
  ];

  return { name, setName, address, setAddress, phone, setPhone, message, setMessage, color, setColor, isDirty, setIsDirty, handleReset, PRESET_COLORS };
}
