import React, { useState } from 'react';
import {
  Lock,
  Edit2,
  Check,
  FileText
} from 'lucide-react';
import type { CashMovement, ShiftSummary, KioscoSale } from '../types/kiosco';
import { playCashChime, playWarningTone, playTapTone } from '../utils/audio';
import { useToast } from '../context/ToastContext';

interface ArqueoTabProps {
  initialCashFund: number;
  setInitialCashFund: (fund: number) => void;
  cashMovements: CashMovement[];
  onAddMovement: (mov: CashMovement) => Promise<void>;
  salesHistory: KioscoSale[];
  onTriggerChecklist: (key: string) => void;
  onOpenShiftReport: (summary: ShiftSummary) => void;
}

export const ArqueoTab: React.FC<ArqueoTabProps> = ({
  initialCashFund,
  setInitialCashFund,
  cashMovements,
  onAddMovement,
  salesHistory,
  onTriggerChecklist,
  onOpenShiftReport
}) => {
  const { notify } = useToast();

  const [isEditingFund, setIsEditingFund] = useState(false);
  const [fundInput, setFundInput] = useState(String(initialCashFund));

  // Movement Form
  const [movementType, setMovementType] = useState<'INGRESO' | 'RETIRO'>('RETIRO');
  const [movementAmount, setMovementAmount] = useState('');
  const [movementReason, setMovementReason] = useState('');

  // Blind Cash Count
  const [countedCash, setCountedCash] = useState<number | ''>('');

  // Computations
  const cashSalesTotal = salesHistory
    .filter(s => s.paymentMethod === 'Efectivo')
    .reduce((sum, s) => sum + s.total, 0);

  const qrSalesTotal = salesHistory
    .filter(s => s.paymentMethod === 'QR')
    .reduce((sum, s) => sum + s.total, 0);

  const cardSalesTotal = salesHistory
    .filter(s => s.paymentMethod === 'Debito' || s.paymentMethod === 'Credito')
    .reduce((sum, s) => sum + s.total, 0);

  const totalIngresos = cashMovements
    .filter(m => m.type === 'INGRESO')
    .reduce((sum, m) => sum + m.amount, 0);

  const totalRetiros = cashMovements
    .filter(m => m.type === 'RETIRO')
    .reduce((sum, m) => sum + m.amount, 0);

  const expectedCashInDrawer = initialCashFund + cashSalesTotal + totalIngresos - totalRetiros;
  const countedCashNum = typeof countedCash === 'number' ? countedCash : 0;
  const difference = countedCash !== '' ? countedCashNum - expectedCashInDrawer : null;

  // Handlers
  const handleSaveFund = () => {
    const val = parseFloat(fundInput);
    if (!isNaN(val) && val >= 0) {
      setInitialCashFund(val);
      setIsEditingFund(false);
      notify('success', `Fondo inicial actualizado a $${val.toLocaleString('es-AR')}`);
    }
  };

  const handleAddMovement = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(movementAmount);
    if (!amt || amt <= 0 || !movementReason.trim()) {
      notify('warning', 'Completá un monto válido y el motivo del movimiento');
      return;
    }

    const mov: CashMovement = {
      id: `mov_${Date.now()}`,
      type: movementType,
      amount: amt,
      reason: movementReason.trim(),
      time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })
    };

    onAddMovement(mov);
    setMovementAmount('');
    setMovementReason('');
    playTapTone();
    onTriggerChecklist('arqueo');
    notify('info', `Registrado en base de datos: ${mov.type} de $${amt.toLocaleString('es-AR')}`);
  };

  const handleCloseShift = () => {
    if (countedCash === '') {
      notify('warning', 'Ingresá el dinero físico contado antes de cerrar el turno');
      playWarningTone();
      return;
    }

    const summary: ShiftSummary = {
      shiftId: String(Math.floor(100 + Math.random() * 900)),
      openedAt: '08:00',
      closedAt: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
      cashierName: 'Operador Principal',
      initialFund: initialCashFund,
      cashSalesTotal,
      qrSalesTotal,
      cardSalesTotal,
      totalIngresos,
      totalRetiros,
      expectedCash: expectedCashInDrawer,
      countedCash: countedCashNum,
      difference: difference ?? 0
    };

    playCashChime();
    onTriggerChecklist('arqueo');
    onOpenShiftReport(summary);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', height: '100%', overflowY: 'auto' }}>
      {/* 4 Financial KPI Cards */}
      <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
        {/* Fondo Inicial */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '1rem',
            padding: '1rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted, #64748b)' }}>
              FONDO INICIAL
            </span>
            <button
              onClick={() => setIsEditingFund(!isEditingFund)}
              style={{
                background: 'none',
                border: 'none',
                color: '#6366f1',
                cursor: 'pointer',
                padding: '2px'
              }}
              title="Modificar fondo inicial"
            >
              <Edit2 size={14} />
            </button>
          </div>

          {isEditingFund ? (
            <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem' }}>
              <input
                type="number"
                value={fundInput}
                onChange={e => setFundInput(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.35rem 0.5rem',
                  borderRadius: '0.375rem',
                  border: '1px solid #6366f1',
                  fontWeight: 800,
                  fontSize: '0.9375rem'
                }}
              />
              <button
                onClick={handleSaveFund}
                style={{
                  padding: '0.35rem 0.6rem',
                  borderRadius: '0.375rem',
                  border: 'none',
                  background: '#6366f1',
                  color: '#ffffff',
                  cursor: 'pointer'
                }}
              >
                <Check size={14} />
              </button>
            </div>
          ) : (
            <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--text-main, #0f172a)', marginTop: '0.5rem' }}>
              ${initialCashFund.toLocaleString('es-AR')}
            </div>
          )}
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
            Apertura de Turno
          </div>
        </div>

        {/* Ventas Efectivo */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '1rem',
            padding: '1rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#059669' }}>
            VENTAS EN EFECTIVO
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 900, color: '#10b981', marginTop: '0.5rem' }}>
            +${cashSalesTotal.toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
            {salesHistory.filter(s => s.paymentMethod === 'Efectivo').length} tickets cobrados
          </div>
        </div>

        {/* Entradas / Salidas Manuales */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '1rem',
            padding: '1rem'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted, #64748b)' }}>
            INGRESOS / RETIROS
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '0.5rem' }}>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#3b82f6' }}>
              +${totalIngresos.toLocaleString('es-AR')}
            </span>
            <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#ef4444' }}>
              -${totalRetiros.toLocaleString('es-AR')}
            </span>
          </div>
          <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted, #94a3b8)', marginTop: '2px' }}>
            {cashMovements.length} movimientos de caja
          </div>
        </div>

        {/* Efectivo Esperado en Cajón */}
        <div
          style={{
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
            color: '#ffffff',
            borderRadius: '1rem',
            padding: '1rem',
            boxShadow: '0 4px 15px rgba(15, 23, 42, 0.25)'
          }}
        >
          <div style={{ fontSize: '0.75rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '0.5px' }}>
            EFECTIVO ESPERADO EN CAJÓN
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: 900, color: '#34d399', marginTop: '0.5rem' }}>
            ${expectedCashInDrawer.toLocaleString('es-AR')}
          </div>
          <div style={{ fontSize: '0.6875rem', color: '#94a3b8', marginTop: '2px' }}>
            Fondo + Ventas + Ingresos - Retiros
          </div>
        </div>
      </div>

      {/* Main Grid: Left = Cash Movements, Right = Blind Audit */}
      <div className="management-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem', flex: 1 }}>
        {/* Movements Column */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            gap: '1rem'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: '0.9375rem', fontWeight: 800, color: 'var(--text-main, #0f172a)' }}>
              Registrar Movimiento de Efectivo
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted, #64748b)' }}>
              Gastos o ingreso de cambio
            </span>
          </div>

          {/* Form */}
          <form onSubmit={handleAddMovement} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '130px 1fr', gap: '0.5rem' }}>
              <select
                value={movementType}
                onChange={e => setMovementType(e.target.value as 'INGRESO' | 'RETIRO')}
                style={{
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.625rem',
                  border: '1px solid var(--border-light, #cbd5e1)',
                  fontWeight: 700,
                  fontSize: '0.8125rem',
                  background: movementType === 'RETIRO' ? '#fef2f2' : '#ecfdf5',
                  color: movementType === 'RETIRO' ? '#b91c1c' : '#047857'
                }}
              >
                <option value="RETIRO">🔻 RETIRO</option>
                <option value="INGRESO">🔺 INGRESO</option>
              </select>

              <div style={{ position: 'relative' }}>
                <span
                  style={{
                    position: 'absolute',
                    left: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    fontWeight: 700,
                    color: '#64748b'
                  }}
                >
                  $
                </span>
                <input
                  type="number"
                  placeholder="Monto..."
                  value={movementAmount}
                  onChange={e => setMovementAmount(e.target.value)}
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.75rem 0.6rem 1.75rem',
                    borderRadius: '0.625rem',
                    border: '1px solid var(--border-light, #cbd5e1)',
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    outline: 'none'
                  }}
                />
              </div>
            </div>

            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="text"
                placeholder="Motivo (ej: 'Pago repartidor panadería', 'Cambio monedas')..."
                value={movementReason}
                onChange={e => setMovementReason(e.target.value)}
                style={{
                  flex: 1,
                  padding: '0.6rem 0.75rem',
                  borderRadius: '0.625rem',
                  border: '1px solid var(--border-light, #cbd5e1)',
                  fontSize: '0.8125rem',
                  fontWeight: 500,
                  outline: 'none'
                }}
              />
              <button
                type="submit"
                style={{
                  padding: '0.6rem 1rem',
                  borderRadius: '0.625rem',
                  border: 'none',
                  background: movementType === 'RETIRO' ? '#ef4444' : '#10b981',
                  color: '#ffffff',
                  fontWeight: 800,
                  fontSize: '0.8125rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                Registrar
              </button>
            </div>
          </form>

          {/* Movements History */}
          <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted, #64748b)' }}>
              HISTORIAL DEL TURNO ({cashMovements.length})
            </div>
            {cashMovements.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', fontSize: '0.8125rem', padding: '1.5rem' }}>
                No hay movimientos registrados en este turno
              </div>
            ) : (
              cashMovements.map(mov => {
                const isRetiro = mov.type === 'RETIRO';
                return (
                  <div
                    key={mov.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '0.5rem 0.75rem',
                      borderRadius: '0.5rem',
                      background: 'var(--bg-surface-elevated, #f8fafc)',
                      border: '1px solid var(--border-light, #e2e8f0)',
                      fontSize: '0.8125rem'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span
                        style={{
                          padding: '2px 6px',
                          borderRadius: '4px',
                          fontSize: '0.6875rem',
                          fontWeight: 800,
                          background: isRetiro ? '#fef2f2' : '#ecfdf5',
                          color: isRetiro ? '#dc2626' : '#059669'
                        }}
                      >
                        {mov.type}
                      </span>
                      <span style={{ fontWeight: 600, color: 'var(--text-main, #0f172a)' }}>
                        {mov.reason}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <span style={{ color: '#94a3b8', fontSize: '0.6875rem' }}>{mov.time}</span>
                      <span
                        style={{
                          fontWeight: 800,
                          color: isRetiro ? '#dc2626' : '#059669'
                        }}
                      >
                        {isRetiro ? '-' : '+'}${mov.amount.toLocaleString('es-AR')}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Blind Audit Column */}
        <div
          style={{
            background: 'var(--bg-surface, #ffffff)',
            border: '1px solid var(--border-light, #e2e8f0)',
            borderRadius: '1.25rem',
            padding: '1.25rem',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '1rem'
          }}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <Lock size={18} style={{ color: '#f59e0b' }} />
              <span style={{ fontSize: '1rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                Arqueo Ciego de Caja
              </span>
            </div>
            <p style={{ fontSize: '0.78125rem', color: 'var(--text-muted, #64748b)', margin: 0 }}>
              El cajero cuenta físicamente el dinero en el cajón y digita el total. El sistema compara
              automáticamente con el saldo esperado.
            </p>
          </div>

          {/* Cash Counting Input */}
          <div
            style={{
              background: 'var(--bg-surface-elevated, #f8fafc)',
              borderRadius: '0.875rem',
              padding: '1rem',
              border: '1px solid var(--border-light, #cbd5e1)'
            }}
          >
            <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginBottom: '0.5rem' }}>
              Dinero Físico Contado en Cajón:
            </div>
            <div style={{ position: 'relative' }}>
              <span
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: '#4f46e5'
                }}
              >
                $
              </span>
              <input
                type="number"
                placeholder="0"
                value={countedCash}
                onChange={e => setCountedCash(e.target.value === '' ? '' : parseFloat(e.target.value))}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem 0.75rem 2.5rem',
                  borderRadius: '0.75rem',
                  border: '2px solid #6366f1',
                  fontSize: '1.5rem',
                  fontWeight: 900,
                  color: '#0f172a',
                  outline: 'none'
                }}
              />
            </div>
          </div>

          {/* Live Difference Result Box */}
          {difference !== null ? (
            <div
              style={{
                borderRadius: '0.875rem',
                padding: '1rem',
                background: Math.abs(difference) < 0.01 ? '#ecfdf5' : difference > 0 ? '#eff6ff' : '#fef2f2',
                border: `1.5px solid ${Math.abs(difference) < 0.01 ? '#a7f3d0' : difference > 0 ? '#bfdbfe' : '#fecaca'}`,
                display: 'flex',
                flexDirection: 'column',
                gap: '0.25rem'
              }}
            >
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: Math.abs(difference) < 0.01 ? '#065f46' : difference > 0 ? '#1e40af' : '#991b1b',
                  textTransform: 'uppercase'
                }}
              >
                Resultado del Cuadre Ciego
              </div>
              <div
                style={{
                  fontSize: '1.25rem',
                  fontWeight: 900,
                  color: Math.abs(difference) < 0.01 ? '#047857' : difference > 0 ? '#1d4ed8' : '#dc2626'
                }}
              >
                {Math.abs(difference) < 0.01 ? (
                  '✅ Caja Perfecta — Sin Diferencia ($0,00)'
                ) : difference > 0 ? (
                  `🟢 Sobrante de Caja: +$${difference.toLocaleString('es-AR')}`
                ) : (
                  `🔴 Faltante de Caja: -$${Math.abs(difference).toLocaleString('es-AR')}`
                )}
              </div>
              <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted, #64748b)' }}>
                Esperado: ${expectedCashInDrawer.toLocaleString('es-AR')} vs Contado: ${countedCashNum.toLocaleString('es-AR')}
              </div>
            </div>
          ) : (
            <div
              style={{
                borderRadius: '0.875rem',
                padding: '1rem',
                background: '#f1f5f9',
                color: '#64748b',
                fontSize: '0.8125rem',
                textAlign: 'center'
              }}
            >
              Ingresá el monto contado para ver el resultado de la auditoría.
            </div>
          )}

          {/* Action Close Shift */}
          <button
            onClick={handleCloseShift}
            style={{
              padding: '0.875rem',
              borderRadius: '0.75rem',
              border: 'none',
              background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
              color: '#ffffff',
              fontSize: '0.9375rem',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
            }}
          >
            <FileText size={18} /> Cerrar Turno & Generar Reporte
          </button>
        </div>
      </div>
    </div>
  );
};
