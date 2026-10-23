import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';

interface Props {
  value: number;
  max: number;
  min?: number;
  disabled?: boolean;
  label: string;
  onChange: (value: number) => void;
}

/** Minus / number / plus control. Typed values are applied on blur or Enter and kept within min..max. */
export default function QuantityStepper({ value, max, min = 1, disabled, label, onChange }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = (raw: string) => {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n) || n < min) { setText(String(value)); return; }
    const next = Math.min(n, max);
    setText(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className="qty" role="group" aria-label={label}>
      <button type="button" disabled={disabled || value <= min} onClick={() => onChange(value - 1)} aria-label={`Decrease quantity of ${label}`} data-testid="qty-decrease">
        <Minus size={16} aria-hidden="true" />
      </button>
      <input type="text" inputMode="numeric" value={text} disabled={disabled} aria-label={`Quantity of ${label}`} data-testid="qty-input"
        onChange={(e) => setText(e.target.value.replace(/[^\d]/g, ''))}
        onBlur={() => commit(text)}
        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); commit(text); } }} />
      <button type="button" disabled={disabled || value >= max} onClick={() => onChange(value + 1)} aria-label={`Increase quantity of ${label}`} data-testid="qty-increase">
        <Plus size={16} aria-hidden="true" />
      </button>
    </div>
  );
}
