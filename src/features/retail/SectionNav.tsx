import type { KeyboardEvent, ReactNode } from 'react';

interface Section { id: string; label: string; description?: string; icon?: ReactNode }
export function SectionNav({ name, label, value, sections, onChange, disabled = false }: {
  name: string; label: string; value: string; sections: Section[];
  onChange: (value: string) => void; disabled?: boolean;
}) {
  const navigate = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const next = event.key === 'ArrowRight' ? (index + 1) % sections.length
      : event.key === 'ArrowLeft' ? (index + sections.length - 1) % sections.length
      : event.key === 'Home' ? 0 : event.key === 'End' ? sections.length - 1 : -1;
    if (next < 0 || disabled) return;
    event.preventDefault();
    onChange(sections[next].id);
    document.getElementById(`${name}-tab-${sections[next].id}`)?.focus();
  };
  return <div className="section-nav" role="tablist" aria-label={label}>
    {sections.map((section, index) => <button type="button" role="tab" key={section.id}
      id={`${name}-tab-${section.id}`} aria-controls={`${name}-panel-${section.id}`}
      aria-selected={value === section.id} tabIndex={value === section.id ? 0 : -1}
      disabled={disabled} onClick={() => onChange(section.id)} onKeyDown={e => navigate(e, index)}>
      {section.icon && <span className="section-tab-icon" aria-hidden="true">{section.icon}</span>}
      <span>{section.label}</span>
      {section.description && <small>{section.description}</small>}
    </button>)}
  </div>;
}
