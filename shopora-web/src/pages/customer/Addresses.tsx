import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MapPin, Pencil, Plus, Star, Trash2 } from 'lucide-react';
import { meApi } from '../../api/endpoints';
import { messageOf } from '../../api/client';
import type { Address } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { applyServerErrors } from '../../lib/forms';
import { addressSchema, emptyAddress, type AddressForm } from '../../lib/validation';
import AccountPage from '../../components/AccountPage';
import AddressFields from '../../components/AddressFields';
import ConfirmDialog from '../../components/ConfirmDialog';
import { Alert, EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

const FIELDS = ['label', 'fullName', 'line1', 'line2', 'city', 'postalCode', 'phone'];

/** Add or edit one address. `address` null means "new". */
function AddressEditor({ address, hasAny, onDone, onCancel }: { address: Address | null; hasAny: boolean; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const [makeDefault, setMakeDefault] = useState(address?.isDefault ?? !hasAny);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<AddressForm>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? { label: address.label, fullName: address.fullName, line1: address.line1, line2: address.line2 ?? '', city: address.city, postalCode: address.postalCode, phone: address.phone }
      : emptyAddress,
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const input = { ...v, line2: v.line2 === '' ? null : v.line2, isDefault: makeDefault };
    try {
      if (address) await meApi.updateAddress(address.id, input); else await meApi.addAddress(input);
      toast.success(address ? 'Address updated' : 'Address added');
      onDone();
    } catch (e) {
      setFormError(applyServerErrors(e, setError, FIELDS));
    }
  });

  return (
    <section className="card" aria-labelledby="editor-title" data-testid="address-editor">
      <h2 id="editor-title">{address ? 'Edit address' : 'Add a new address'}</h2>
      {formError && <Alert kind="error" testId="address-error">{formError}</Alert>}
      <form onSubmit={onSubmit} noValidate aria-label={address ? 'Edit address' : 'Add address'}>
        <AddressFields register={register} errors={errors} />
        <label className="check" style={{ marginBottom: 18 }}>
          <input type="checkbox" checked={makeDefault} disabled={address?.isDefault} onChange={(e) => setMakeDefault(e.target.checked)} data-testid="field-isDefault" />
          Use as my default address
        </label>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={isSubmitting} data-testid="address-save">
            {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Saving' : 'Save address'}
          </button>
          <button type="button" className="btn btn--outline" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

export default function Addresses() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => meApi.addresses(), []);
  const [editing, setEditing] = useState<Address | 'new' | null>(null);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [busy, setBusy] = useState(false);

  const finish = () => { setEditing(null); reload(); };

  const setDefault = async (a: Address) => {
    try { await meApi.setDefaultAddress(a.id); toast.success('Default address updated'); reload(); }
    catch (e) { toast.error(messageOf(e)); }
  };

  const confirmDelete = async () => {
    if (!deleting) return;
    setBusy(true);
    try { await meApi.deleteAddress(deleting.id); toast.success('Address deleted'); reload(); }
    catch (e) { toast.error(messageOf(e)); }   // e.g. the default address cannot be deleted while others exist
    finally { setBusy(false); setDeleting(null); }
  };

  return (
    <AccountPage title="My addresses" subtitle="Where should we deliver your orders?"
      actions={editing === null && data ? (
        <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditing('new')} data-testid="add-address">
          <Plus size={16} aria-hidden="true" /> Add address
        </button>) : undefined}>
      {loading && <PageSpinner label="Loading your addresses" />}
      {error && <LoadError message={error} onRetry={reload} />}

      {editing !== null && data && (
        <div style={{ marginBottom: 24 }}>
          <AddressEditor address={editing === 'new' ? null : editing} hasAny={data.length > 0} onDone={finish} onCancel={() => setEditing(null)} />
        </div>
      )}

      {data && data.length === 0 && editing === null && (
        <EmptyState title="No saved addresses" action={<button type="button" className="btn btn--primary" onClick={() => setEditing('new')}>Add your first address</button>}>
          Save an address to check out faster.
        </EmptyState>
      )}

      {data && data.length > 0 && (
        <ul className="addr-grid" data-testid="address-list">
          {data.map((a) => (
            <li key={a.id} className={`card addr${a.isDefault ? ' addr--default' : ''}`} data-testid="address-card">
              <div className="addr__head">
                <h2><MapPin size={18} aria-hidden="true" /> {a.label}</h2>
                {a.isDefault && <span className="status status--brand" data-testid="default-badge">Default</span>}
              </div>
              <address>{a.fullName}<br />{a.line1}{a.line2 && <><br />{a.line2}</>}<br />{a.city} {a.postalCode}<br />{a.phone}</address>
              <div className="addr__actions">
                <button type="button" className="btn btn--outline btn--sm" onClick={() => setEditing(a)} aria-label={`Edit ${a.label} address`}><Pencil size={15} aria-hidden="true" /> Edit</button>
                {!a.isDefault && <button type="button" className="btn btn--outline btn--sm" onClick={() => setDefault(a)} aria-label={`Make ${a.label} address the default`} data-testid="make-default"><Star size={15} aria-hidden="true" /> Make default</button>}
                <button type="button" className="btn btn--ghost btn--sm btn--danger-text" onClick={() => setDeleting(a)} aria-label={`Delete ${a.label} address`} data-testid="delete-address"><Trash2 size={15} aria-hidden="true" /> Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDialog open={!!deleting} title="Delete this address?" confirmLabel="Delete address" danger busy={busy}
        message={deleting ? <>The <strong>{deleting.label}</strong> address ({deleting.line1}, {deleting.city}) will be removed. Your past orders keep their own copy of the address.</> : ''}
        onCancel={() => setDeleting(null)} onConfirm={confirmDelete} />
    </AccountPage>
  );
}
