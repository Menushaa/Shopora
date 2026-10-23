import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Clock, Mail, MapPin, Phone } from 'lucide-react';
import { contactApi } from '../../api/endpoints';
import { applyServerErrors } from '../../lib/forms';
import { contactSchema, type ContactForm } from '../../lib/validation';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { TextAreaField, TextField } from '../../components/Fields';
import { Alert } from '../../components/Feedback';

export default function Contact() {
  useDocumentTitle('Contact us');
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, reset, setError, watch, formState: { errors, isSubmitting } } = useForm<ContactForm>({
    resolver: zodResolver(contactSchema), defaultValues: { name: '', email: '', message: '' },
  });
  const length = (watch('message') ?? '').trim().length;

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const res = await contactApi.send(values);
      setSent(res.message);
      reset();
    } catch (e) {
      setFormError(applyServerErrors(e, setError, ['name', 'email', 'message']));
    }
  });

  return (
    <div className="container page">
      <div className="page__head">
        <h1>Contact us</h1>
        <p>Questions about a product or an order? Send us a message and we will reply by email.</p>
      </div>
      <div className="two-col">
        <div className="card">
          {sent && (
            <>
              <Alert kind="success" testId="contact-success">{sent}</Alert>
              <button type="button" className="btn btn--outline" onClick={() => setSent(null)}>Send another message</button>
            </>
          )}
          {!sent && (
            <>
              {formError && <Alert kind="error" testId="contact-error">{formError}</Alert>}
              <form onSubmit={onSubmit} noValidate aria-label="Contact us">
                <TextField label="Your name" autoComplete="name" error={errors.name?.message} {...register('name')} />
                <TextField label="Email address" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
                <TextAreaField label="Message" hint={`${length} of 1000 characters (at least 10)`} error={errors.message?.message} {...register('message')} />
                <button type="submit" className="btn btn--primary btn--lg" disabled={isSubmitting} data-testid="contact-submit">
                  {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Sending' : 'Send message'}
                </button>
              </form>
            </>
          )}
        </div>
        <div className="card card--tint">
          <h2>Other ways to reach us</h2>
          <ul className="info-list">
            <li><Mail size={20} aria-hidden="true" /><div><strong>Email</strong>support@shopora.example</div></li>
            <li><Phone size={20} aria-hidden="true" /><div><strong>Phone</strong>+94 11 234 5678</div></li>
            <li><MapPin size={20} aria-hidden="true" /><div><strong>Visit</strong>25 Galle Road, Colombo 03</div></li>
            <li><Clock size={20} aria-hidden="true" /><div><strong>Hours</strong>Monday to Saturday, 9:00 am to 6:00 pm</div></li>
          </ul>
        </div>
      </div>
    </div>
  );
}
