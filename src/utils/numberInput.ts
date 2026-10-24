/** Canonical values use a decimal point; the editable presentation uses es-AR. */
export function canonicalNumber(value: string | number | readonly string[] | undefined): string {
  if (value == null || value === '' || !Number.isFinite(Number(value))) return '';
  const text = String(value);
  const match = /^(-?)(\d+)(?:\.(\d*))?e([+-]?\d+)$/i.exec(text);
  if (!match) return text;
  const [, sign, integer, fraction = '', exponent] = match;
  const digits = integer + fraction;
  const position = integer.length + Number(exponent);
  return sign + (position <= 0 ? '0.' + '0'.repeat(-position) + digits
    : position >= digits.length ? digits + '0'.repeat(position - digits.length)
      : digits.slice(0, position) + '.' + digits.slice(position));
}

export const completeNumber = (value: string) => /^-?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value) && Number.isFinite(Number(value));

export function formatInputNumber(value: string): string {
  const [integer, fraction] = value.split('.');
  return integer.replace(/\B(?=(\d{3})+(?!\d))/g, '.') + (fraction !== undefined ? ',' + fraction : '');
}

/** During editing every dot is a grouping separator already shown by the control. */
export function parseInputNumber(text: string): string | null {
  if (text.includes(',') && text.slice(text.indexOf(',') + 1).includes('.')) return null;
  const value = text.replace(/\s/g, '').replace(/\./g, '').replace(',', '.');
  return /^-?\d*(?:\.\d*)?$/.test(value) ? value : null;
}

/** Also accept pasted ungrouped decimal values, such as 1234.50. */
export function parsePastedNumber(text: string): string | null {
  const value = text.trim().replace(/\s/g, '').replace(/^\$/, '');
  if (value.includes(',') || /^-?[1-9]\d{0,2}(?:\.\d{3})+$/.test(value)) return parseInputNumber(value);
  return /^-?\d*(?:\.\d*)?$/.test(value) ? value : null;
}
