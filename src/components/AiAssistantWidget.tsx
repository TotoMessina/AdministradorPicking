import { useAiAssistantWidget, type AiAssistantWidgetProps } from './aiWidget/useAiAssistantWidget';
import { AiWidgetHeader } from './aiWidget/AiWidgetHeader';
import { AiWidgetChips } from './aiWidget/AiWidgetChips';
import { AiWidgetBody } from './aiWidget/AiWidgetBody';
import { AiWidgetInput } from './aiWidget/AiWidgetInput';

export function AiAssistantWidget(props: AiAssistantWidgetProps) {
  const state = useAiAssistantWidget(props);
  const { isOpen, onToggle } = state;
  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          className="ai-omni-backdrop"
          onClick={() => onToggle(false)}
          aria-hidden="true"
        />
      )}

      {/* Floating Copilot Window / Drawer */}
      {isOpen && (
        <aside
          className="ai-omni-drawer"
          aria-label="Panel del asistente IA"
          role="dialog"
          aria-modal="true"
          onKeyDown={e => {
            e.stopPropagation();
            if (e.key === 'Escape') { e.preventDefault(); onToggle(false); }
            if (e.key === 'Tab') {
              const controls = Array.from(e.currentTarget.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), a[href], [tabindex="0"]'));
              const first = controls[0]; const last = controls[controls.length - 1];
              if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
              else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
            }
          }}
        >
          <div className="ai-omni-drag-handle" aria-hidden="true" />
          <AiWidgetHeader state={state} />

          <AiWidgetChips state={state} />

          <AiWidgetBody state={state} />

          <AiWidgetInput state={state} />
        </aside>
      )}
    </>
  );
}
