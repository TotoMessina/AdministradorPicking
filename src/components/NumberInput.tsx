import { forwardRef, useEffect, useImperativeHandle, useLayoutEffect, useRef, useState, type InputHTMLAttributes } from 'react';
import { canonicalNumber, completeNumber, formatInputNumber, parseInputNumber, parsePastedNumber } from '../utils/numberInput';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange' | 'pattern'> & {
  type?: 'number';
  /** Receives an ungrouped value, compatible with Number(), parseFloat() and existing drafts. */
  onValueChange?: (value: string) => void;
};

/** One visible, labelled control; only its canonical value is submitted through FormData. */
export const NumberInput = forwardRef<HTMLInputElement, Props>(function NumberInput({
  value, defaultValue, onValueChange, name, disabled, readOnly, required, min, max, step,
  inputMode, onKeyDown, onBlur, onPaste, placeholder, type: _type, ...props
}, forwardedRef) {
  const controlled = value !== undefined;
  const external = canonicalNumber(value);
  const [raw, setRaw] = useState(() => canonicalNumber(value ?? defaultValue));
  const input = useRef<HTMLInputElement>(null);
  const validator = useRef<HTMLInputElement | null>(null);
  const lastExternal = useRef(external);
  const caret = useRef<number | null>(null);
  const display = formatInputNumber(raw);
  const decimal = step === 'any' || (step != null && !Number.isInteger(Number(step)));
  useImperativeHandle(forwardedRef, () => input.current!, []);

  useLayoutEffect(() => {
    // Keep unfinished decimals when a numeric parent converts "1234.0" back to 1234.
    const equivalent = completeNumber(raw) && completeNumber(external) && Number(raw) === Number(external);
    const unfinished = raw !== '' && !completeNumber(raw) && external === lastExternal.current;
    lastExternal.current = external;
    if (controlled && raw !== external && !equivalent && !unfinished) {
      setRaw(external);
      return;
    }
    const field = input.current;
    if (!field) return;
    const probe = validator.current ??= document.createElement('input');
    probe.type = 'number';
    probe.min = min == null ? '' : String(min);
    probe.max = max == null ? '' : String(max);
    probe.step = step == null ? '1' : String(step);
    probe.defaultValue = canonicalNumber(defaultValue ?? value);
    probe.required = !!required;
    probe.value = completeNumber(raw) ? String(Number(raw)) : '';
    const validity = probe.validity;
    field.setCustomValidity(raw && !completeNumber(raw) ? 'Ingresá un número válido.'
      : validity.valueMissing ? 'Completá este campo.'
        : validity.rangeUnderflow ? `Ingresá un valor mayor o igual a ${formatInputNumber(String(min))}.`
          : validity.rangeOverflow ? `Ingresá un valor menor o igual a ${formatInputNumber(String(max))}.`
            : validity.stepMismatch ? `Usá incrementos de ${formatInputNumber(String(step ?? 1))}.`
              : '');
    if (caret.current !== null && document.activeElement === field) {
      let position = 0;
      let remaining = caret.current;
      while (position < display.length && remaining > 0) {
        if (display[position] !== '.') remaining--;
        position++;
      }
      field.setSelectionRange(position, position);
    }
    caret.current = null;
  }, [controlled, raw, external, defaultValue, required, min, max, step, display]);

  useEffect(() => {
    const form = input.current?.form;
    if (!form || controlled) return;
    const reset = () => { setRaw(canonicalNumber(defaultValue)); caret.current = null; };
    form.addEventListener('reset', reset);
    return () => form.removeEventListener('reset', reset);
  }, [controlled, defaultValue, props.form]);

  const commit = (next: string) => {
    setRaw(next);
    onValueChange?.(completeNumber(next) ? next : '');
  };

  const edit = (text: string, position: number) => {
    const next = parseInputNumber(text);
    if (next === null) { if (input.current) input.current.value = display; return; }
    caret.current = text.slice(0, position).replace(/\./g, '').length;
    commit(next);
    // React may skip rendering when only a grouping dot was removed.
    if (input.current) {
      input.current.value = formatInputNumber(next);
      let index = 0;
      let remaining = caret.current;
      while (index < input.current.value.length && remaining > 0) {
        if (input.current.value[index] !== '.') remaining--;
        index++;
      }
      input.current.setSelectionRange(index, index);
    }
    if (next === raw) caret.current = null;
  };

  return <>
    <input {...props} ref={input} type="text" value={display} disabled={disabled} readOnly={readOnly} required={required}
      placeholder={placeholder && completeNumber(placeholder) ? formatInputNumber(placeholder) : placeholder}
      inputMode={inputMode ?? (decimal ? 'decimal' : 'numeric')} role={props.role ?? 'spinbutton'}
      aria-valuemin={min == null ? undefined : Number(min)} aria-valuemax={max == null ? undefined : Number(max)}
      aria-valuenow={completeNumber(raw) ? Number(raw) : undefined} aria-valuetext={display || undefined}
      onChange={event => {
        let text = event.currentTarget.value;
        const position = event.currentTarget.selectionStart ?? text.length;
        const native = event.nativeEvent as InputEvent;
        // Some mobile decimal keyboards emit a dot without a keydown event.
        if (decimal && native.inputType === 'insertText' && native.data === '.' && !text.includes(','))
          text = text.slice(0, position - 1) + ',' + text.slice(position);
        edit(text, position);
      }}
      onPaste={event => {
        onPaste?.(event);
        if (event.defaultPrevented || disabled || readOnly) return;
        event.preventDefault();
        const pasted = parsePastedNumber(event.clipboardData.getData('text'));
        if (pasted === null) return;
        const field = event.currentTarget;
        const start = field.selectionStart ?? 0;
        const end = field.selectionEnd ?? start;
        const fragment = formatInputNumber(pasted);
        edit(display.slice(0, start) + fragment + display.slice(end), start + fragment.length);
      }}
      onKeyDown={event => {
        onKeyDown?.(event);
        if (event.defaultPrevented || disabled || readOnly || event.ctrlKey || event.metaKey || event.altKey) return;
        const field = event.currentTarget;
        const start = field.selectionStart ?? 0;
        const end = field.selectionEnd ?? start;
        if (event.key === '.' && decimal) {
          event.preventDefault();
          edit(display.slice(0, start) + ',' + display.slice(end), start + 1);
        } else if (start === end && event.key === 'Backspace' && display[start - 1] === '.') {
          event.preventDefault();
          edit(display.slice(0, start - 2) + display.slice(end), Math.max(0, start - 2));
        } else if (start === end && event.key === 'Delete' && display[start] === '.') {
          event.preventDefault();
          edit(display.slice(0, start) + display.slice(end + 2), start);
        } else if ((event.key === 'ArrowUp' || event.key === 'ArrowDown') && step !== 'any' && validator.current) {
          event.preventDefault();
          const probe = validator.current;
          probe.value = completeNumber(raw) ? String(Number(raw)) : '';
          if (event.key === 'ArrowUp') probe.stepUp(); else probe.stepDown();
          commit(probe.value);
        }
      }}
      onBlur={event => {
        caret.current = null;
        onBlur?.(event);
      }} />
    {name && <input type="hidden" name={name} form={props.form} value={completeNumber(raw) ? raw : ''} disabled={disabled} style={{ display: 'none' }} />}
  </>;
});
