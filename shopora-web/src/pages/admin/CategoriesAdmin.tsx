import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Pencil, Plus, Power } from 'lucide-react';
import { adminApi } from '../../api/endpoints';
import { ApiError, messageOf } from '../../api/client';
import type { Category } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { applyServerErrors } from '../../lib/forms';
import { categorySchema, type CategoryFormValues } from '../../lib/validation';
import AdminPage, { ActiveBadge } from '../../components/admin/AdminPage';
import ConfirmDialog from '../../components/ConfirmDialog';
import { TextAreaField, TextField } from '../../components/Fields';
import { Alert, EmptyState, LoadError, PageSpinner } from '../../components/Feedback';

function CategoryEditor({ category, onDone, onCancel }: { category: Category | null; onDone: () => void; onCancel: () => void }) {
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } = useForm<CategoryFormValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: { name: category?.name ?? '', description: category?.description ?? '', isActive: category?.isActive ?? true },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const input = { name: v.name, description: v.description || null, isActive: v.isActive };
    try {
      if (category) await adminApi.updateCategory(category.id, input); else await adminApi.createCategory(input);
      toast.success(category ? 'Category updated' : 'Category created');
      onDone();
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_CATEGORY') { setError('name', { type: 'server', message: e.message }); return; }
      setFormError(applyServerErrors(e, setError, ['name', 'description']));
    }
  });

  return (
    <section className="card form-card" aria-labelledby="cat-editor-title" data-testid="category-editor">
      <h2 id="cat-editor-title">{category ? `Edit ${category.name}` : 'Add a category'}</h2>
      {formError && <Alert kind="error" testId="category-error">{formError}</Alert>}
      <form onSubmit={onSubmit} noValidate aria-label={category ? 'Edit category' : 'Add category'}>
        <TextField label="Category name" error={errors.name?.message} {...register('name')} />
        <TextAreaField label="Description (optional)" error={errors.description?.message} {...register('description')} style={{ minHeight: 90 }} />
        <label className="check" style={{ marginBottom: 18 }}><input type="checkbox" data-testid="field-isActive" {...register('isActive')} /> Active (visible to shoppers)</label>
        <div className="form-actions">
          <button type="submit" className="btn btn--primary" disabled={isSubmitting} data-testid="category-save">
            {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Saving' : 'Save category'}
          </button>
          <button type="button" className="btn btn--outline" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}

export default function CategoriesAdmin() {
  const toast = useToast();
  const { data, loading, error, reload } = useAsync(() => adminApi.categories(), []);
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [toggling, setToggling] = useState<Category | null>(null);
  const [busy, setBusy] = useState(false);

  const toggle = async () => {
    if (!toggling) return;
    setBusy(true);
    try {
      await adminApi.setCategoryStatus(toggling.id, !toggling.isActive);
      toast.success(toggling.isActive ? `${toggling.name} has been deactivated` : `${toggling.name} is active again`);
      reload();
    } catch (e) { toast.error(messageOf(e)); } finally { setBusy(false); setToggling(null); }
  };

  return (
    <AdminPage title="Categories" subtitle="Group products so shoppers can find them."
      actions={editing === null ? <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditing('new')} data-testid="add-category"><Plus size={16} aria-hidden="true" /> Add category</button> : undefined}>
      {editing !== null && (
        <div style={{ marginBottom: 24 }}>
          <CategoryEditor key={editing === 'new' ? 'new' : editing.id} category={editing === 'new' ? null : editing}
            onDone={() => { setEditing(null); reload(); }} onCancel={() => setEditing(null)} />
        </div>
      )}
      {loading && <PageSpinner label="Loading categories" />}
      {error && <LoadError message={error} onRetry={reload} />}
      {data && data.length === 0 && <EmptyState title="No categories yet">Add your first category to start organising products.</EmptyState>}
      {data && data.length > 0 && (
        <div className="table-wrap">
          <table className="table" data-testid="categories-table">
            <caption className="sr-only">Categories</caption>
            <thead><tr><th scope="col">Name</th><th scope="col">Description</th><th scope="col" className="num">Products</th><th scope="col">Status</th><th scope="col"><span className="sr-only">Actions</span></th></tr></thead>
            <tbody>
              {data.map((c) => (
                <tr key={c.id} data-testid="category-row">
                  <td><strong>{c.name}</strong></td>
                  <td className="muted">{c.description ?? 'None'}</td>
                  <td className="num">{c.productCount}</td>
                  <td><ActiveBadge active={c.isActive} /></td>
                  <td className="actions">
                    <button type="button" className="btn btn--outline btn--xs" onClick={() => setEditing(c)} aria-label={`Edit ${c.name}`}><Pencil size={14} aria-hidden="true" /> Edit</button>
                    <button type="button" className={`btn btn--xs ${c.isActive ? 'btn--danger-outline' : 'btn--outline'}`} onClick={() => setToggling(c)}
                      aria-label={`${c.isActive ? 'Deactivate' : 'Activate'} ${c.name}`} data-testid="toggle-status"><Power size={14} aria-hidden="true" /> {c.isActive ? 'Deactivate' : 'Activate'}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmDialog open={!!toggling} busy={busy} danger={!!toggling?.isActive}
        title={toggling?.isActive ? 'Deactivate this category?' : 'Activate this category?'}
        confirmLabel={toggling?.isActive ? 'Deactivate' : 'Activate'}
        message={toggling?.isActive
          ? <><strong>{toggling.name}</strong> and its {toggling.productCount} {toggling.productCount === 1 ? 'product' : 'products'} will be hidden from shoppers, and those products cannot be bought until the category is active again.</>
          : <><strong>{toggling?.name}</strong> and its active products will appear in the shop again.</>}
        onCancel={() => setToggling(null)} onConfirm={toggle} />
    </AdminPage>
  );
}
