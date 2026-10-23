import { forwardRef, useId, useState, type InputHTMLAttributes, type TextareaHTMLAttributes } from 'react';
import { Check, Eye, EyeOff, Circle } from 'lucide-react';
import { passwordRules } from '../lib/validation';

interface BaseProps { label: string; error?: string; hint?: string }

function describedBy(id: string, error?: string, hint?: string) {
  const ids = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ');
  return ids || undefined;
}

function Messages({ id, error, hint }: { id: string; error?: string; hint?: string }) {
  return (
    <>
      {hint && !error && <p id={`${id}-hint`} className="field__hint">{hint}</p>}
      {error && <p id={`${id}-error`} className="field__error" role="alert" data-testid={`error-${id}`}>{error}</p>}
    </>
  );
}

/** Text input with a visible label, hint and error. Works with react-hook-form's register(). */
export const TextField = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, hint, className, ...rest }, ref) => {
    const auto = useId();
    const id = rest.id ?? rest.name ?? auto;
    return (
      <div className={`field${error ? ' field--invalid' : ''}${className ? ` ${className}` : ''}`}>
        <label htmlFor={id}>{label}</label>
        <input ref={ref} id={id} data-testid={`field-${rest.name ?? id}`} aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)} {...rest} />
        <Messages id={id} error={error} hint={hint} />
      </div>
    );
  },
);
TextField.displayName = 'TextField';

export const TextAreaField = forwardRef<HTMLTextAreaElement, BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, error, hint, className, ...rest }, ref) => {
    const auto = useId();
    const id = rest.id ?? rest.name ?? auto;
    return (
      <div className={`field${error ? ' field--invalid' : ''}${className ? ` ${className}` : ''}`}>
        <label htmlFor={id}>{label}</label>
        <textarea ref={ref} id={id} data-testid={`field-${rest.name ?? id}`} aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(id, error, hint)} {...rest} />
        <Messages id={id} error={error} hint={hint} />
      </div>
    );
  },
);
TextAreaField.displayName = 'TextAreaField';

/** Password input with a show/hide button. */
export const PasswordField = forwardRef<HTMLInputElement, BaseProps & InputHTMLAttributes<HTMLInputElement>>(
  ({ label, error, hint, className, ...rest }, ref) => {
    const auto = useId();
    const id = rest.id ?? rest.name ?? auto;
    const [visible, setVisible] = useState(false);
    return (
      <div className={`field${error ? ' field--invalid' : ''}${className ? ` ${className}` : ''}`}>
        <label htmlFor={id}>{label}</label>
        <div className="field__control">
          <input ref={ref} id={id} type={visible ? 'text' : 'password'} data-testid={`field-${rest.name ?? id}`}
            aria-invalid={error ? true : undefined} aria-describedby={describedBy(id, error, hint)} {...rest} />
          <button type="button" className="field__toggle" onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'} aria-pressed={visible}>
            {visible ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
          </button>
        </div>
        <Messages id={id} error={error} hint={hint} />
      </div>
    );
  },
);
PasswordField.displayName = 'PasswordField';

/** Live checklist that ticks off password rules as the shopper types. */
export function PasswordChecklist({ value }: { value: string }) {
  return (
    <ul className="checklist" aria-label="Password requirements" data-testid="password-rules">
      {passwordRules.map((rule) => {
        const ok = rule.test(value);
        return (
          <li key={rule.id} className={ok ? 'is-met' : ''} data-testid={`rule-${rule.id}`}>
            {ok ? <Check size={15} aria-hidden="true" /> : <Circle size={15} aria-hidden="true" />}
            <span>{rule.label}</span>
            <span className="sr-only">{ok ? ' (done)' : ' (not yet)'}</span>
          </li>
        );
      })}
    </ul>
  );
}
