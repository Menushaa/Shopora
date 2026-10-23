import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { adminApi } from '../../api/endpoints';
import { ApiError } from '../../api/client';
import type { ProductInput } from '../../api/types';
import { useToast } from '../../context/ToastContext';
import { useAsync } from '../../lib/useAsync';
import { applyServerErrors } from '../../lib/forms';
import { productSchema, type ProductFormValues } from '../../lib/validation';
import AdminPage from '../../components/admin/AdminPage';
import { TextAreaField, TextField } from '../../components/Fields';
import { Alert, LoadError, PageSpinner } from '../../components/Feedback';
import NotFound from '../public/NotFound';

const BLANK: ProductFormValues = {
  name: '', sku: '', description: '', price: '', discountPercent: '0', categoryId: '', imageUrl: '', stock: '', isActive: true, isFeatured: false,
};

export default function ProductForm() {
  const { id } = useParams();
  const editing = id !== undefined;
  const productId = Number(id);
  const navigate = useNavigate();
  const toast = useToast();
  const [formError, setFormError] = useState<string | null>(null);

  const categories = useAsync(() => adminApi.categories(), []);
  const product = useAsync(() => (editing ? adminApi.product(productId) : Promise.resolve(null)), [id]);

  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting } } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema), defaultValues: BLANK,
  });

  useEffect(() => {
    const p = product.data;
    if (!p) return;
    reset({
      name: p.name, sku: p.sku, description: p.description ?? '', price: String(p.price), discountPercent: String(p.discountPercent),
      categoryId: String(p.categoryId), imageUrl: p.imageUrl ?? '', stock: String(p.stock), isActive: p.isActive, isFeatured: p.isFeatured,
    });
  }, [product.data, reset]);

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    const input: ProductInput = {
      name: v.name, sku: v.sku || null, description: v.description || null, price: Number(v.price),
      discountPercent: v.discountPercent === '' ? 0 : Number(v.discountPercent), categoryId: Number(v.categoryId),
      imageUrl: v.imageUrl || null, stock: Number(v.stock), isActive: v.isActive, isFeatured: v.isFeatured,
    };
    try {
      if (editing) await adminApi.updateProduct(productId, input); else await adminApi.createProduct(input);
      toast.success(editing ? 'Product updated' : 'Product created');
      navigate('/admin/products');
    } catch (e) {
      if (e instanceof ApiError && e.code === 'DUPLICATE_SKU') { setError('sku', { type: 'server', message: e.message }); return; }
      setFormError(applyServerErrors(e, setError, ['name', 'sku', 'description', 'price', 'discountPercent', 'categoryId', 'imageUrl', 'stock']));
    }
  });

  if (editing && product.loading) return <AdminPage title="Edit product"><PageSpinner label="Loading product" /></AdminPage>;
  if (editing && product.error?.toLowerCase().includes('not found')) return <NotFound title="We could not find that product" backTo="/admin/products" backLabel="Back to products" />;
  if (editing && product.error) return <AdminPage title="Edit product"><LoadError message={product.error} onRetry={product.reload} /></AdminPage>;

  const activeCategories = (categories.data ?? []).filter((c) => c.isActive);

  return (
    <AdminPage title={editing ? 'Edit product' : 'Add product'} subtitle={editing ? product.data?.name : 'Fill in the details to add a product to the shop.'}
      back={{ to: '/admin/products', label: 'Back to products' }}>
      <section className="card form-card">
        {formError && <Alert kind="error" testId="product-error">{formError}</Alert>}
        <form onSubmit={onSubmit} noValidate aria-label={editing ? 'Edit product' : 'Add product'}>
          <TextField label="Product name" error={errors.name?.message} {...register('name')} />
          <div className="form-row form-row--2">
            <TextField label="SKU (optional)" hint="Leave blank to create one automatically." error={errors.sku?.message} {...register('sku')} />
            <div className={`field${errors.categoryId ? ' field--invalid' : ''}`}>
              <label htmlFor="categoryId">Category</label>
              <select id="categoryId" data-testid="field-categoryId" aria-invalid={errors.categoryId ? true : undefined} {...register('categoryId')}>
                <option value="">Select a category</option>
                {activeCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
              {errors.categoryId && <p className="field__error" role="alert" data-testid="error-categoryId">{errors.categoryId.message}</p>}
              {editing && product.data && !activeCategories.some((c) => c.id === product.data!.categoryId) && (
                <p className="field__hint">The current category is inactive. Choose an active one to save.</p>
              )}
            </div>
          </div>
          <TextAreaField label="Description" error={errors.description?.message} {...register('description')} />
          <div className="form-row form-row--3">
            <TextField label="Price (Rs.)" inputMode="decimal" error={errors.price?.message} {...register('price')} />
            <TextField label="Discount (%)" inputMode="decimal" hint="0 to 100" error={errors.discountPercent?.message} {...register('discountPercent')} />
            <TextField label="Stock" inputMode="numeric" hint="Units available" error={errors.stock?.message} {...register('stock')} />
          </div>
          <TextField label="Image URL (optional)" type="url" placeholder="https://" error={errors.imageUrl?.message} {...register('imageUrl')} />
          <div className="checks">
            <label className="check"><input type="checkbox" data-testid="field-isActive" {...register('isActive')} /> Active (visible to shoppers)</label>
            <label className="check"><input type="checkbox" data-testid="field-isFeatured" {...register('isFeatured')} /> Featured on the home page</label>
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={isSubmitting} data-testid="product-save">
              {isSubmitting && <span className="spinner" aria-hidden="true" />} {isSubmitting ? 'Saving' : editing ? 'Save changes' : 'Create product'}
            </button>
            <button type="button" className="btn btn--outline" onClick={() => navigate('/admin/products')}>Cancel</button>
          </div>
        </form>
      </section>
    </AdminPage>
  );
}
