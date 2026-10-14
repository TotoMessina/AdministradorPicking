import React from 'react';
import { Printer, Download, X, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import type { ShiftSummary } from '../types/kiosco';

interface ShiftReportModalProps {
  summary: ShiftSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onStartNewShift: () => void;
}

export const ShiftReportModal: React.FC<ShiftReportModalProps> = ({
  summary,
  isOpen,
  onClose,
  onStartNewShift
}) => {
  if (!isOpen || !summary) return null;

  const diff = summary.difference ?? 0;
  const isPerfect = Math.abs(diff) < 0.01;
  const isSobrante = diff > 0.01;
  const isFaltante = diff < -0.01;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadTxt = () => {
    const lines = [
      '========================================',
      '        KIOSCO EXPRESS — CIERRE         ',
      '         BALANCE GENERAL TURNO          ',
      '========================================',
      `Turno N°:       ${summary.shiftId}`,
      `Cajero:         ${summary.cashierName}`,
      `Apertura:       ${summary.openedAt}`,
      `Cierre:         ${summary.closedAt || new Date().toLocaleTimeString('es-AR')}`,
      '----------------------------------------',
      `Fondo Inicial:          $${summary.initialFund.toLocaleString('es-AR')}`,
      `Ventas en Efectivo:     $${summary.cashSalesTotal.toLocaleString('es-AR')}`,
      `Ventas Mercado Pago QR: $${summary.qrSalesTotal.toLocaleString('es-AR')}`,
      `Ventas Tarjeta:         $${summary.cardSalesTotal.toLocaleString('es-AR')}`,
      '----------------------------------------',
      `Ingresos Manuales (+):  $${summary.totalIngresos.toLocaleString('es-AR')}`,
      `Retiros / Gastos  (-):  $${summary.totalRetiros.toLocaleString('es-AR')}`,
      '========================================',
      `EFECTIVO ESPERADO:      $${summary.expectedCash.toLocaleString('es-AR')}`,
      `EFECTIVO CONTADO:       $${(summary.countedCash ?? 0).toLocaleString('es-AR')}`,
      '----------------------------------------',
      `DIFERENCIA:             $${diff > 0 ? '+' : ''}${diff.toLocaleString('es-AR')}`,
      `ESTADO CAJA:            ${isPerfect ? 'PERFECTA (CUADRADA)' : isSobrante ? 'SOBRANTE' : 'FALTANTE'}`,
      '========================================',
      'Firma Cajero: __________________________'
    ];

    const element = document.createElement('a');
    const file = new Blob([lines.join('\r\n')], { type: 'text/plain;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `Cierre_Turno_${summary.shiftId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(11, 15, 25, 0.78)',
        backdropFilter: 'blur(8px)',
        zIndex: 5100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--bg-surface, #ffffff)',
          borderRadius: '1.25rem',
          maxWidth: '520px',
          width: '100%',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: '1.25rem',
            borderBottom: '1px solid var(--border-light, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated, #f8fafc)'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '0.625rem',
                background: isPerfect ? 'rgba(16, 185, 129, 0.15)' : isSobrante ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: isPerfect ? '#10b981' : isSobrante ? '#3b82f6' : '#ef4444',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {isPerfect && <CheckCircle2 size={20} />}
              {isSobrante && <AlertCircle size={20} />}
              {isFaltante && <AlertTriangle size={20} />}
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                Arqueo & Cierre de Turno #{summary.shiftId}
              </div>
              <div style={{ fontSize: '0.78125rem', color: 'var(--text-muted, #64748b)' }}>
                Auditoría Ciega Finalizada
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--text-muted, #64748b)',
              cursor: 'pointer',
              padding: '0.35rem'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div style={{ padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Status Badge */}
          <div
            style={{
              padding: '1rem',
              borderRadius: '0.75rem',
              background: isPerfect ? '#ecfdf5' : isSobrante ? '#eff6ff' : '#fef2f2',
              border: `1.5px solid ${isPerfect ? '#a7f3d0' : isSobrante ? '#bfdbfe' : '#fecaca'}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}
          >
            <div>
              <div
                style={{
                  fontSize: '0.75rem',
                  fontWeight: 800,
                  color: isPerfect ? '#065f46' : isSobrante ? '#1e40af' : '#991b1b',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Resultado del Arqueo
              </div>
              <div
                style={{
                  fontSize: '1.15rem',
                  fontWeight: 900,
                  color: isPerfect ? '#047857' : isSobrante ? '#1d4ed8' : '#dc2626',
                  marginTop: '2px'
                }}
              >
                {isPerfect ? '✅ Caja Perfecta ($0,00)' : isSobrante ? `🟢 Sobrante de Caja: +$${diff.toLocaleString('es-AR')}` : `🔴 Faltante de Caja: -$${Math.abs(diff).toLocaleString('es-AR')}`}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.71875rem', color: 'var(--text-muted, #64748b)' }}>Dinero Contado</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 900, color: 'var(--text-main, #0f172a)' }}>
                ${(summary.countedCash ?? 0).toLocaleString('es-AR')}
              </div>
            </div>
          </div>

          {/* Breakdown Table */}
          <div style={{ background: 'var(--bg-surface-elevated, #f8fafc)', borderRadius: '0.75rem', padding: '1rem', border: '1px solid var(--border-light, #e2e8f0)' }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 800, color: 'var(--text-main, #0f172a)', marginBottom: '0.75rem' }}>
              Resumen Financiero del Turno
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', fontSize: '0.8125rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Fondo Inicial de Caja:</span>
                <span style={{ fontWeight: 700 }}>${summary.initialFund.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Ventas Efectivo:</span>
                <span style={{ fontWeight: 700, color: '#10b981' }}>+${summary.cashSalesTotal.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Ingresos de Cambio (+):</span>
                <span style={{ fontWeight: 700, color: '#3b82f6' }}>+${summary.totalIngresos.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted, #64748b)' }}>Retiros a Proveedores (-):</span>
                <span style={{ fontWeight: 700, color: '#ef4444' }}>-${summary.totalRetiros.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ borderTop: '1px dashed var(--border-light, #cbd5e1)', margin: '0.35rem 0' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 900, fontSize: '0.9375rem' }}>
                <span>Efectivo Esperado en Cajón:</span>
                <span>${summary.expectedCash.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem', marginTop: '0.35rem' }}>
                <span>Ventas Mercado Pago QR:</span>
                <span>${summary.qrSalesTotal.toLocaleString('es-AR')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#64748b', fontSize: '0.75rem' }}>
                <span>Ventas Tarjeta Débito/Crédito:</span>
                <span>${summary.cardSalesTotal.toLocaleString('es-AR')}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid var(--border-light, #e2e8f0)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'var(--bg-surface-elevated, #f8fafc)',
            gap: '0.75rem'
          }}
        >
          <button
            onClick={handleDownloadTxt}
            style={{
              padding: '0.6rem 0.85rem',
              borderRadius: '0.625rem',
              border: '1px solid var(--border-light, #cbd5e1)',
              background: '#ffffff',
              color: 'var(--text-main, #0f172a)',
              fontSize: '0.8125rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}
          >
            <Download size={15} /> Exportar Reporte
          </button>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handlePrint}
              style={{
                padding: '0.6rem 0.9rem',
                borderRadius: '0.625rem',
                border: '1px solid var(--border-light, #cbd5e1)',
                background: '#ffffff',
                color: 'var(--text-main, #0f172a)',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.35rem'
              }}
            >
              <Printer size={15} /> Imprimir
            </button>
            <button
              onClick={() => {
                onStartNewShift();
                onClose();
              }}
              style={{
                padding: '0.6rem 1.25rem',
                borderRadius: '0.625rem',
                border: 'none',
                background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
                color: '#ffffff',
                fontSize: '0.8125rem',
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(79, 70, 229, 0.3)'
              }}
            >
              Abrir Siguiente Turno
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
