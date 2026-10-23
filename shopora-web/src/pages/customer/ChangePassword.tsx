import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { meApi } from '../../api/endpoints';
import { useToast } from '../../context/ToastContext';
import { applyServerErrors } from '../../lib/forms';
import { changePasswordSchema, type ChangePasswordForm } from '../../lib/validation';
import AccountPage from '../../components/AccountPage';
import { PasswordChecklist, PasswordField } from '../../components/Fields';
import { Alert } from '../../components/Feedback';

export default function ChangePassword() {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting } } = useForm<ChangePasswordForm>({
    resolver: zodResolver(changePasswordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });
  const newPassword = watch('newPassword');

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await meApi.changePassword(v);
      toast.success('Your password has been changed');
      reset();
    } catch (e) {
      setFormError(applyServerErrors(e, setError, ['currentPassword', 'newPassword', 'confirmPassword']));
    }
  });

  return (
    <AccountPage title="Change password" subtitle="Choose a strong password you do not use anywhere else.">
      <section className="card narrow" aria-labelledby="pw-title">
        <h2 id="pw-title">Update your password</h2>
        {formError && <Alert kind="error" testId="password-error">{formError}</Alert>}
        <form onSubmit={onSubmit} noValidate aria-label="Change password">
          <PasswordField label="Current password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
          <PasswordField label="New password" autoComplete="new-password" error={errors.newPassword?.message} {...register('newPassword')} />
          <PasswordChecklist value={newPassword ?? ''} />
          <PasswordField label="Confirm new password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
          <button type="submit" className="btn btn--primary" disabled={isSubmitting} data-testid="password-save">
            {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Saving' : 'Change password'}
          </button>
        </form>
      </section>
    </AccountPage>
  );
}
