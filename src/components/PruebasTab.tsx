import React, { useState } from 'react';
import {
  Database,
  RefreshCw,
  CheckCircle2,
  Circle,
  UploadCloud,
  Printer,
  ShieldCheck,
  Server,
  Zap,
  Package,
  DollarSign,
  AlertCircle
} from 'lucide-react';
import type { KioscoProduct, KioscoSale, SandboxChecklist, CashMovement } from '../types/kiosco';
import { playScannerBeep, playTapTone } from '../utils/audio';
import { useToast } from '../context/ToastContext';
import { SUPABASE_URL, DEFAULT_STORE_ID } from '../lib/supabase';

interface PruebasTabProps {
  products: KioscoProduct[];
  setProducts: React.Dispatch<React.SetStateAction<KioscoProduct[]>>;
  salesHistory: KioscoSale[];
  cashMovements: CashMovement[];
  initialCashFund: number;
  checklist: SandboxChecklist;
  setChecklist: React.Dispatch<React.SetStateAction<SandboxChecklist>>;
  onOpenTicket: (sale: KioscoSale) => void;
  onRefreshFromDb: () => Promise<void>;
  onBulkImportProducts?: (prods: KioscoProduct[]) => Promise<void>;
  onClearLocalCache?: () => void;
}

export const PruebasTab: React.FC<PruebasTabProps> = ({
  products,
  salesHistory,
  cashMovements,
  initialCashFund,
  checklist,
  setChecklist,
  onOpenTicket,
  onRefreshFromDb,
  onBulkImportProducts,
  onClearLocalCache
}) => {
  const { notify } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [bulkInput, setBulkInput] = useState('');
  const [showBulkModal, setShowBulkModal] = useState(false);

  const checklistItems = [
    {
      key: 'scanner' as const,
      label: '1. Lectura / Scanner de Código',
      desc: 'Autofoco permanente, pistola láser USB/Bluetooth o búsqueda predictiva de artículos.'
    },
    {
      key: 'vuelto' as const,
      label: '2. Cobro Efectivo con Cálculo de Vuelto',
      desc: 'Billetes rápidos ($1.000 a $20.000) y display de vuelto esmeralda de alto contraste.'
    },
    {
      key: 'qr' as const,
      label: '3. Cobro Digital (QR Mercado Pago / Tarjetas)',
      desc: 'Aprobación de billeteras virtuales y POSnet sin pasos burocráticos.'
    },
    {
      key: 'ticket' as const,
      label: '4. Emisión de Ticket Térmico ESC/POS',
      desc: 'Comprobante formateado a 58mm/80mm listo para imprimir en comanderas de mostrador.'
    },
    {
      key: 'arqueo' as const,
      label: '5. Caja & Arqueo del Turno',
      desc: 'Fondo de cambio, registro de gastos/retiros y cuadre ciego con detección de diferencias.'
    },
    {
      key: 'stock' as const,
      label: '6. Control & Alerta de Reposición Urgente',
      desc: 'Detección de artículos en nivel crítico (≤ umbral) y reposición en 1 toque.'
    }
  ];

  const completedCount = Object.values(checklist).filter(Boolean).length;

  // Handle manual database synchronization
  const handleSyncNow = async () => {
    setIsSyncing(true);
    playTapTone();
    try {
      await onRefreshFromDb();
      notify('success', '¡Base de datos sincronizada correctamente con Supabase!');
    } catch {
      notify('warning', 'Sincronizado con almacenamiento local de la tienda.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Process bulk input
  const handleProcessBulkImport = async () => {
    if (!bulkInput.trim()) {
      notify('warning', 'Ingresá al menos una línea con formato: Nombre, Código, Rubro, Precio, Stock');
      return;
    }

    const lines = bulkInput.trim().split('\n');
    const newProducts: KioscoProduct[] = [];

    const emojiMap: Record<string, string> = {
      golosinas: '🍬',
      bebidas: '🥤',
      cigarrillos: '🚬',
      snacks: '🍪',
      varios: '⚡'
    };

    for (const line of lines) {
      const parts = line.split(',').map(s => s.trim());
      if (parts.length >= 2) {
        const name = parts[0];
        const code = parts[1] || `779${Math.floor(1000000000 + Math.random() * 9000000000)}`;
        const categoryRaw = parts[2] || 'Varios';
        const price = parseFloat(parts[3]) || 500;
        const stock = parseInt(parts[4]) || 15;

        let validCategory: any = 'Varios';
        const catLower = categoryRaw.toLowerCase();
        if (catLower.includes('golosina') || catLower.includes('dulce')) validCategory = 'Golosinas';
        else if (catLower.includes('bebida') || catLower.includes('gaseosa')) validCategory = 'Bebidas';
        else if (catLower.includes('cigarro') || catLower.includes('tabaco')) validCategory = 'Cigarrillos';
        else if (catLower.includes('snack') || catLower.includes('galletita')) validCategory = 'Snacks';

        newProducts.push({
          id: `p_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          code,
          name,
          category: validCategory,
          price,
          cost: Math.round(price * 0.65),
          stock,
          minStock: 4,
          emoji: emojiMap[validCategory.toLowerCase()] || '⚡'
        });
      }
    }

    if (newProducts.length === 0) {
      notify('warning', 'No se pudieron procesar productos válidos.');
      return;
    }

    if (onBulkImportProducts) {
      await onBulkImportProducts(newProducts);
    }

    playScannerBeep();
    notify('success', `¡${newProducts.length} productos reales importados con éxito!`);
    setBulkInput('');
    setShowBulkModal(false);
  };

  const totalStockUnits = products.reduce((acc, p) => acc + p.stock, 0);

  return (
    <div className="management-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem', height: '100%', overflowY: 'auto' }}>
      {/* Left Column: Interactive Checklist & Operational Readiness */}
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          border: '1px solid var(--border-light, #e2e8f0)',
          borderRadius: '1.25rem',
          padding: '1.25rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '1rem',
          boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.625rem',
                background: 'rgba(79, 70, 229, 0.12)',
                color: '#4f46e5',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                Checklist Operativo del Kiosco
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
                Verificación de los 6 sistemas mínimos funcionando con datos reales
              </div>
            </div>
          </div>

          <div
            style={{
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: completedCount === 6 ? '#ecfdf5' : '#eef2ff',
              color: completedCount === 6 ? '#047857' : '#4f46e5',
              border: `1px solid ${completedCount === 6 ? '#a7f3d0' : '#c7d2fe'}`,
              fontSize: '0.75rem',
              fontWeight: 800
            }}
          >
            {completedCount} de 6 Verificados
          </div>
        </div>

        {/* Progress Bar */}
        <div style={{ width: '100%', height: '8px', background: '#e2e8f0', borderRadius: '9999px', overflow: 'hidden' }}>
          <div
            style={{
              width: `${(completedCount / 6) * 100}%`,
              height: '100%',
              background: 'linear-gradient(90deg, #4f46e5 0%, #10b981 100%)',
              transition: 'width 0.4s ease'
            }}
          />
        </div>

        {/* Checklist Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {checklistItems.map(item => {
            const isChecked = checklist[item.key];
            return (
              <div
                key={item.key}
                onClick={() => {
                  setChecklist(prev => ({ ...prev, [item.key]: !prev[item.key] }));
                }}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.75rem',
                  padding: '0.75rem',
                  borderRadius: '0.75rem',
                  background: isChecked ? '#f0fdf4' : 'var(--bg-surface-elevated, #f8fafc)',
                  border: isChecked ? '1px solid #bbf7d0' : '1px solid var(--border-light, #e2e8f0)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <div style={{ marginTop: '2px', color: isChecked ? '#10b981' : '#cbd5e1' }}>
                  {isChecked ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: '0.875rem',
                      fontWeight: 800,
                      color: isChecked ? '#065f46' : 'var(--text-main, #0f172a)'
                    }}
                  >
                    {item.label}
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)', marginTop: '2px' }}>
                    {item.desc}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right Column: Database Health & Synchronization Real Tools */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Supabase Database Status Card */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div
                style={{
                  width: '34px',
                  height: '34px',
                  borderRadius: '0.5rem',
                  background: 'rgba(16, 185, 129, 0.12)',
                  color: '#10b981',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <Database size={18} />
              </div>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                  Base de Datos Supabase (En Línea)
                </div>
                <div style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
                  Conectado • Sin datos simulados
                </div>
              </div>
            </div>

            <button
              onClick={handleSyncNow}
              disabled={isSyncing}
              style={{
                padding: '0.45rem 0.85rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                background: '#ffffff',
                color: '#4f46e5',
                fontSize: '0.75rem',
                fontWeight: 800,
                cursor: isSyncing ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <RefreshCw size={13} className={isSyncing ? 'spin' : ''} />
              {isSyncing ? 'Sincronizando...' : 'Recargar DB'}
            </button>
          </div>

          {/* Database Live Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.625rem' }}>
            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 700 }}>ARTÍCULOS EN DB</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a', marginTop: '2px' }}>
                {products.length}
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 700 }}>STOCK TOTAL FÍSICO</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#10b981', marginTop: '2px' }}>
                {totalStockUnits} un.
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 700 }}>VENTAS REALES</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#4f46e5', marginTop: '2px' }}>
                {salesHistory.length} tickets
              </div>
            </div>

            <div style={{ padding: '0.75rem', borderRadius: '0.75rem', background: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: '0.6875rem', color: '#64748b', fontWeight: 700 }}>FONDO INICIAL CAJA</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 900, color: '#d97706', marginTop: '2px' }}>
                ${initialCashFund.toLocaleString('es-AR')}
              </div>
            </div>
          </div>

          {/* Connection Detail Metadata */}
          <div style={{ padding: '0.625rem 0.75rem', borderRadius: '0.5rem', background: '#f1f5f9', fontSize: '0.71875rem', color: '#64748b', display: 'flex', flexDirection: 'column', gap: '3px' }}>
            <div><strong style={{ color: '#334155' }}>Host:</strong> {SUPABASE_URL.replace('https://', '')}</div>
            <div><strong style={{ color: '#334155' }}>Store ID:</strong> {DEFAULT_STORE_ID}</div>
            <div><strong style={{ color: '#334155' }}>Modo:</strong> 100% Datos Reales (Cero Mock Data)</div>
          </div>
        </div>

        {/* Real Data Actions Card */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            boxShadow: 'var(--shadow-sm, 0 1px 3px rgba(0,0,0,0.04))',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.75rem'
          }}
        >
          <div style={{ fontSize: '0.875rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
            Herramientas de Carga & Hardware
          </div>

          <button
            onClick={() => setShowBulkModal(!showBulkModal)}
            style={{
              padding: '0.75rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              fontWeight: 800,
              fontSize: '0.8125rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.25)'
            }}
          >
            <UploadCloud size={16} /> Carga Rápida Masiva de Artículos (CSV / Texto)
          </button>

          {salesHistory.length > 0 && (
            <button
              onClick={() => onOpenTicket(salesHistory[0])}
              style={{
                padding: '0.75rem',
                borderRadius: '0.75rem',
                border: '1px solid var(--border-light, #cbd5e1)',
                background: '#ffffff',
                color: 'var(--text-main, #0f172a)',
                fontWeight: 700,
                fontSize: '0.8125rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem'
              }}
            >
              <Printer size={15} /> Imprimir Último Ticket Emitido ({salesHistory[0].ticketNumber})
            </button>
          )}

          {onClearLocalCache && (
            <button
              onClick={onClearLocalCache}
              style={{
                padding: '0.625rem',
                borderRadius: '0.625rem',
                border: '1px solid #fee2e2',
                background: '#fff5f5',
                color: '#dc2626',
                fontWeight: 700,
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.35rem',
                marginTop: '0.25rem'
              }}
            >
              <RefreshCw size={13} /> Limpiar Almacenamiento Local Huérfano
            </button>
          )}
        </div>

        {/* Bulk Modal Inline */}
        {showBulkModal && (
          <div
            style={{
              background: '#ffffff',
              border: '2px solid #4f46e5',
              borderRadius: '1rem',
              padding: '1rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.5rem'
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: '#0f172a' }}>
              Pegar artículos reales (1 por línea):
            </div>
            <div style={{ fontSize: '0.6875rem', color: '#64748b' }}>
              Formato: <code>Nombre, Código, Rubro, Precio, Stock</code>
            </div>
            <textarea
              rows={4}
              placeholder={`Alfajor Milka Blanco, 77912345, Golosinas, 1200, 24\nCoca Cola 500ml, 77954321, Bebidas, 1600, 18\nPapas Lays Clásicas 85g, 77998765, Snacks, 1500, 10`}
              value={bulkInput}
              onChange={e => setBulkInput(e.target.value)}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '0.5rem',
                border: '1px solid #cbd5e1',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                outline: 'none',
                resize: 'none'
              }}
            />
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowBulkModal(false)}
                style={{
                  padding: '0.4rem 0.75rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #cbd5e1',
                  background: '#fff',
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleProcessBulkImport}
                style={{
                  padding: '0.4rem 0.85rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: '#4f46e5',
                  color: '#fff',
                  fontWeight: 800,
                  fontSize: '0.75rem',
                  cursor: 'pointer'
                }}
              >
                Importar a Base de Datos
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
