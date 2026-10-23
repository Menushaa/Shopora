import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { meApi } from '../../api/endpoints';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { applyServerErrors } from '../../lib/forms';
import { profileSchema, type ProfileForm } from '../../lib/validation';
import AccountPage from '../../components/AccountPage';
import { TextField } from '../../components/Fields';
import { Alert } from '../../components/Feedback';

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema), defaultValues: { fullName: user?.fullName ?? '', address: user?.address ?? '' },
  });

  useEffect(() => { if (user) reset({ fullName: user.fullName, address: user.address }); }, [user, reset]);

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await meApi.update(v.fullName, v.address);
      await refreshUser();
      toast.success('Your profile has been updated');
    } catch (e) {
      setFormError(applyServerErrors(e, setError, ['fullName', 'address']));
    }
  });

  return (
    <AccountPage title="My profile" subtitle="Keep your details up to date.">
      <div className="two-col">
        <section className="card" aria-labelledby="profile-title">
          <h2 id="profile-title">Your details</h2>
          {formError && <Alert kind="error" testId="profile-error">{formError}</Alert>}
          <form onSubmit={onSubmit} noValidate aria-label="Profile">
            <TextField label="Full name" autoComplete="name" error={errors.fullName?.message} {...register('fullName')} />
            <TextField label="Address" autoComplete="street-address" error={errors.address?.message} {...register('address')} />
            <TextField label="Email address" name="email" value={user?.email ?? ''} readOnly hint="Your email address is your login and cannot be changed." />
            <button type="submit" className="btn btn--primary" disabled={isSubmitting || !isDirty} data-testid="profile-save">
              {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Saving' : 'Save changes'}
            </button>
          </form>
        </section>
        <section className="card card--tint" aria-labelledby="more-title">
          <h2 id="more-title">More account settings</h2>
          <ul className="info-list">
            <li><div><strong><Link to="/addresses">Delivery addresses</Link></strong>Add, edit or remove where we deliver, and choose a default.</div></li>
            <li><div><strong><Link to="/change-password">Change password</Link></strong>Choose a new password for your account.</div></li>
            <li><div><strong><Link to="/orders">Order history</Link></strong>See and track the orders you have placed.</div></li>
          </ul>
        </section>
      </div>
    </AccountPage>
  );
}
