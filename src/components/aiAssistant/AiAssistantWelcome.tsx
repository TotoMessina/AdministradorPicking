import { AiIcon } from '../AiIcon';
import { MarginSummary } from '../../features/retail/MarginSummary';
import { INITIAL_CAPABILITY_CHIPS } from './capabilityChips';
import type { AiAssistantState } from './useAiAssistant';

/** Bienvenida con preguntas sugeridas. */
export function AiAssistantWelcome({ state }: { state: AiAssistantState }) {
  const { isStreaming, analytics, handleSend } = state;
  return (
    <>
      <div className="ai-welcome-card">
        <div className="ai-welcome-avatar">
          <AiIcon size={28} />
        </div>
        <h2 className="ai-welcome-title">
          ¿En qué te ayudo?
        </h2>
        <p className="ai-welcome-description">
          Consultá tu stock, revisá ventas o prepará una reposición.
        </p>

        {/* Quick Metrics Row */}
        <div className="ai-welcome-stats-row">
          <div className="ai-welcome-stat-pill">
            <span className="ai-welcome-stat-value">
              ${analytics.hoy.facturado.toLocaleString("es-AR")}
            </span>
            <span className="ai-welcome-stat-label">
              Hoy sin bajo margen ({analytics.hoy.tickets} v.)
            </span>
          </div>
          <div className="ai-welcome-stat-pill">
            <span className="ai-welcome-stat-value">
              ${analytics.estaSemana.facturado.toLocaleString("es-AR")}
            </span>
            <span className="ai-welcome-stat-label">
              Semana sin bajo margen ({analytics.estaSemana.tickets} v.)
            </span>
          </div>
          <div className="ai-welcome-stat-pill">
            <span className="ai-welcome-stat-value">
              ${analytics.esteMes.facturado.toLocaleString("es-AR")}
            </span>
            <span className="ai-welcome-stat-label">
              Mes sin bajo margen ({analytics.esteMes.tickets} v.)
            </span>
          </div>
          <div className="ai-welcome-stat-pill">
            <span
              className="ai-welcome-stat-value"
              style={{ color: "var(--tone-accent, #10b981)" }}
            >
              {analytics.esteMes.margenPct !== null
                ? `${analytics.esteMes.margenPct}%`
                : "—"}
            </span>
            <span className="ai-welcome-stat-label">Margen bruto est.</span>
          </div>
          <div className="ai-welcome-stat-pill">
            <span
              className="ai-welcome-stat-value"
              style={{
                color:
                  analytics.criticalStock > 0
                    ? "var(--tone-danger)"
                    : "var(--tone-accent)",
              }}
            >
              {analytics.criticalStock}
            </span>
            <span className="ai-welcome-stat-label">Stock crítico</span>
          </div>
          <div className="ai-welcome-stat-pill">
            <span className="ai-welcome-stat-value">
              {analytics.totalProductos}
            </span>
            <span className="ai-welcome-stat-label">Productos catálogo</span>
          </div>
        </div>

        {/* Capability Chips */}
        <MarginSummary summary={analytics.esteMes.separation} />
        <div className="ai-chips-section">
          <span className="ai-chips-title">Consultas rápidas sugeridas:</span>
          <div className="ai-chips-grid">
            {INITIAL_CAPABILITY_CHIPS.map(({ label, icon: Icon }) => (
              <button
                key={label}
                type="button"
                className="ai-chip-btn ai-action"
                onClick={() => handleSend(label)}
                disabled={isStreaming}
              >
                <Icon size={14} />
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}
