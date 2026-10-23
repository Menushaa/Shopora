import { useState } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Heart, PackageCheck, ShoppingBag } from 'lucide-react';
import { homeFor, useAuth } from '../../context/AuthContext';
import { messageOf } from '../../api/client';
import { loginSchema, type LoginForm } from '../../lib/validation';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PasswordField, TextField } from '../../components/Fields';
import { Alert } from '../../components/Feedback';
import { LogoMark } from '../../components/Logo';

interface LoginState { from?: string; message?: string; email?: string; registered?: boolean }

export default function Login() {
  useDocumentTitle('Log in');
  const { user, login } = useAuth();
  const state = (useLocation().state ?? {}) as LoginState;
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: state.email ?? '', password: '', rememberMe: false },
  });

  // Already signed in (or just signed in): go to the page you wanted, or to your own dashboard.
  if (user) return <Navigate to={state.from && user.role === 'Customer' ? state.from : homeFor(user)} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await login(values.email, values.password, values.rememberMe);
    } catch (e) {
      setFormError(messageOf(e));
    }
  });

  return (
    <div className="auth">
      <aside className="auth__aside" aria-hidden="true">
        <LogoMark size={64} />
        <h2>Good to see you again</h2>
        <p>Pick up where you left off.</p>
        <ul>
          <li><ShoppingBag size={20} /> Your cart is waiting for you</li>
          <li><Heart size={20} /> Your wishlist is saved</li>
          <li><PackageCheck size={20} /> Track the orders you have placed</li>
        </ul>
      </aside>

      <div className="auth__main">
        <div className="auth__card">
          <h1>Log in</h1>
          <p>Welcome back to Shopora.</p>

          {state.registered && <Alert kind="success" testId="registered-notice">{state.message ?? 'Your account is ready. Log in to start shopping.'}</Alert>}
          {!state.registered && state.message && <Alert kind="info" testId="login-notice">{state.message}</Alert>}
          {formError && <Alert kind="error" testId="login-error">{formError}</Alert>}

          <form onSubmit={onSubmit} noValidate aria-label="Log in">
            <TextField label="Email address" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
            <PasswordField label="Password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
            <div className="auth__row">
              <label className="check">
                <input type="checkbox" data-testid="field-rememberMe" {...register('rememberMe')} /> Remember me
              </label>
              <Link to="/forgot-password">Forgot password?</Link>
            </div>
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={isSubmitting} data-testid="login-submit">
              {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Logging in' : 'Log in'}
            </button>
          </form>
          <p className="auth__switch">New to Shopora? <Link to="/register">Create an account</Link></p>
        </div>
      </div>
    </div>
  );
}
