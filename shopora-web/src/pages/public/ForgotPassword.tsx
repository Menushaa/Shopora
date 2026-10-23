import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { authApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import { forgotSchema, type ForgotForm } from '../../lib/validation';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { TextField } from '../../components/Fields';
import { Alert } from '../../components/Feedback';

export default function ForgotPassword() {
  useDocumentTitle('Forgot password');
  const [done, setDone] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema), defaultValues: { email: '' },
  });

  const onSubmit = handleSubmit(async ({ email }) => {
    setFormError(null);
    try {
      const res = await authApi.forgotPassword(email);
      setDone(res.message); // the API gives the same answer whether or not the email has an account
    } catch (e) {
      setFormError(messageOf(e));
    }
  });

  return (
    <div className="auth">
      <div className="auth__main" style={{ gridColumn: '1 / -1' }}>
        <div className="auth__card">
          <h1>Forgot your password?</h1>
          <p>Enter your email address and we will send you a link to choose a new one.</p>
          {formError && <Alert kind="error" testId="forgot-error">{formError}</Alert>}
          {done ? (
            <>
              <Alert kind="success" testId="forgot-success">{done}</Alert>
              <p className="muted">
                In this test environment no real email is sent. The reset token is written to the API log, or you can read it from the
                Test endpoint, then enter it on the <Link to="/reset-password">reset page</Link>.
              </p>
              <Link to="/login" className="btn btn--outline btn--block">Back to log in</Link>
            </>
          ) : (
            <form onSubmit={onSubmit} noValidate aria-label="Request password reset">
              <TextField label="Email address" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
              <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={isSubmitting} data-testid="forgot-submit">
                {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Sending' : 'Send reset link'}
              </button>
              <p className="auth__switch"><Link to="/login">Back to log in</Link></p>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
