import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Gift, PackageCheck, ShieldCheck } from 'lucide-react';
import { homeFor, useAuth } from '../../context/AuthContext';
import { ApiError } from '../../api/client';
import { applyServerErrors } from '../../lib/forms';
import { registerSchema, type RegisterForm } from '../../lib/validation';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { PasswordChecklist, PasswordField, TextField } from '../../components/Fields';
import { Alert } from '../../components/Feedback';
import { LogoMark } from '../../components/Logo';

export default function Register() {
  useDocumentTitle('Create account');
  const { user, register: registerUser } = useAuth();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const { register, handleSubmit, setError, watch, formState: { errors, isSubmitting } } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: { fullName: '', address: '', email: '', password: '', confirmPassword: '' },
  });
  const password = watch('password');

  if (user) return <Navigate to={homeFor(user)} replace />;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await registerUser(values); // values are already trimmed by the form schema
      navigate('/login', {
        replace: true,
        state: { registered: true, email: values.email, message: 'Your account has been created. Log in to start shopping.' },
      });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'EMAIL_EXISTS') {
        setError('email', { type: 'server', message: 'An account with this email already exists.' });
        return;
      }
      setFormError(applyServerErrors(e, setError, ['fullName', 'address', 'email', 'password', 'confirmPassword']));
    }
  });

  return (
    <div className="auth auth--register">
      <aside className="auth__aside" aria-hidden="true">
        <LogoMark size={64} />
        <h2>Join Shopora in a minute</h2>
        <p>One account for your cart, wishlist and orders.</p>
        <ul>
          <li><Gift size={20} /> Save products you love for later</li>
          <li><PackageCheck size={20} /> Follow each order from Pending to Delivered</li>
          <li><ShieldCheck size={20} /> Your password is stored securely, never as plain text</li>
        </ul>
      </aside>

      <div className="auth__main">
        <div className="auth__card">
          <h1>Create your account</h1>
          <p>All fields are required.</p>
          {formError && <Alert kind="error" testId="register-error">{formError}</Alert>}

          <form onSubmit={onSubmit} noValidate aria-label="Create account">
            <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
            <TextField label="Address" autoComplete="street-address" error={errors.address?.message} {...register('address')} />
            <TextField label="Email address" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
            <PasswordField label="Password" autoComplete="new-password" error={errors.password?.message} {...register('password')} />
            <PasswordChecklist value={password ?? ''} />
            <PasswordField label="Confirm password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
            <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={isSubmitting} data-testid="register-submit">
              {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Creating account' : 'Create account'}
            </button>
          </form>
          <p className="auth__switch">Already have an account? <Link to="/login">Log in</Link></p>
        </div>
      </div>
    </div>
  );
}
