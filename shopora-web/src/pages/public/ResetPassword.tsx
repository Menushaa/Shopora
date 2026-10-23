import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../../api/endpoints';
import { applyServerErrors } from '../../lib/forms';
import { ApiError } from '../../api/client';
import { resetSchema, type ResetForm } from '../../lib/validation';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PasswordChecklist, PasswordField, TextField } from '../../components/Fields';
import { Alert } from '../../components/Feedback';

export default function ResetPassword() {
  useDocumentTitle('Reset password');
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
    defaultValues: { token: params.get('token') ?? '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = watch('newPassword');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await authApi.resetPassword(values.token, values.newPassword, values.confirmPassword);
      navigate('/login', { replace: true, state: { registered: true, message: 'Your password has been reset. Log in with your new password.' } });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'INVALID_RESET_TOKEN') {
        setFormError('This reset link is invalid, has already been used, or has expired. Request a new one.');
        return;
      }
      setFormError(applyServerErrors(e, setError, ['token', 'newPassword', 'confirmPassword']));
    }
  });

  return (
    <div className="auth">
      <div className="auth__main" style={{ gridColumn: '1 / -1' }}>
        <div className="auth__card">
          <h1>Choose a new password</h1>
          <p>Paste your reset token and pick a new password.</p>
          {formError && (
            <Alert kind="error" testId="reset-error">
              {formError} {formError.includes('Request a new one') && <Link to="/forgot-password">Request a new link</Link>}
            </Alert>
          )}
          <form onSubmit={onSubmit} noValidate aria-label="Reset password">
            <TextField label="Reset token" autoComplete="off" error={errors.token?.message} {...register('token')} />
            <PasswordField label="New password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
            <PasswordChecklist value={newPassword ?? ''} />
            <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={isSubmitting} data-testid="reset-submit">
              {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Saving' : 'Save new password'}
            </button>
          </form>
          <p className="auth__switch"><Link to="/login">Back to log in</Link></p>
        </div>
      </div>
    </div>
  );
}
