import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from './supabase';
import './Admin.css';

const EMPTY_PRODUCT = {
  name: '',
  description: '',
  category: 'Gaming Devices',
  price: '',
  sale_price: '',
  stock_quantity: '0',
  image_url: '',
  is_active: true,
};

const CATEGORIES = [
  'Gaming Devices',
  'Samsung Chargers',
  'Apple Accessories',
];

function formatPrice(value) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`;
}

function getSalePrice(product) {
  const price = Number(product.price || 0);
  const salePrice = Number(product.sale_price || 0);

  return salePrice > 0 && salePrice < price ? salePrice : price;
}

export default function Admin() {
  const navigate = useNavigate();

  const [session, setSession] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  const verifyAdmin = useCallback(async (currentSession) => {
    if (!currentSession?.user) {
      setSession(null);
      setAuthorized(false);
      setCheckingAuth(false);
      return false;
    }

    setCheckingAuth(true);
    setError('');

    try {
      const { data, error: adminError } = await supabase
        .from('admin_users')
        .select('user_id')
        .eq('user_id', currentSession.user.id)
        .maybeSingle();

      if (adminError) throw adminError;

      if (!data) {
        setSession(currentSession);
        setAuthorized(false);
        setError(
          'This account is not authorized to manage inventory. Check the admin_users table in Supabase.'
        );
        return false;
      }

      setSession(currentSession);
      setAuthorized(true);
      return true;
    } catch (err) {
      console.error('Administrator verification failed:', err);
      setSession(currentSession);
      setAuthorized(false);
      setError(
        err.message ||
          'Could not verify administrator permissions. Check your Supabase policies.'
      );
      return false;
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('products')
        .select(
          'id, name, description, category, price, sale_price, stock_quantity, image_url, is_active, created_at'
        )
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setProducts(data || []);
    } catch (err) {
      console.error('Product loading failed:', err);
      setError(err.message || 'Could not load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      const { data, error: authError } = await supabase.auth.getSession();

      if (!mounted) return;

      if (authError) {
        setError(authError.message);
        setCheckingAuth(false);
        return;
      }

      await verifyAdmin(data.session);
    }

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      if (mounted) {
        verifyAdmin(newSession);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [verifyAdmin]);

  useEffect(() => {
    if (authorized) {
      loadProducts();
    }
  }, [authorized, loadProducts]);

  function updateField(event) {
    const { name, value, type, checked } = event.target;

    setForm((current) => ({
      ...current,
      [name]: type === 'checkbox' ? checked : value,
    }));
  }

  function resetForm() {
    setEditingId(null);
    setForm(EMPTY_PRODUCT);
    setImageFile(null);
    setImagePreview('');
  }

  function startEditing(product) {
    setEditingId(product.id);

    setForm({
      name: product.name || '',
      description: product.description || '',
      category: product.category || 'Gaming Devices',
      price: String(product.price ?? ''),
      sale_price:
        product.sale_price == null ? '' : String(product.sale_price),
      stock_quantity: String(product.stock_quantity ?? 0),
      image_url: product.image_url || '',
      is_active: product.is_active !== false,
    });

    setImageFile(null);
    setImagePreview(product.image_url || '');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function handleImageChange(event) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please select an image file.');
      event.target.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('The image must be 5 MB or smaller.');
      event.target.value = '';
      return;
    }

    setError('');
    setImageFile(file);

    const previewUrl = URL.createObjectURL(file);
    setImagePreview(previewUrl);
  }

  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoggingIn(true);

    try {
      const { data, error: loginError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (loginError) throw loginError;

      const isAdmin = await verifyAdmin(data.session);

      if (!isAdmin) {
        await supabase.auth.signOut();
        setSession(null);
        setAuthorized(false);
        return;
      }

      setPassword('');
      setNotice('Successfully signed in.');
    } catch (err) {
      setError(err.message || 'Unable to sign in.');
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleLogout() {
    setError('');

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    resetForm();
    setProducts([]);
    setAuthorized(false);
    setSession(null);
  }

  async function uploadImage() {
    if (!imageFile) return form.image_url || null;

    const extension = imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';
    const filePath = `${crypto.randomUUID()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from('products-images')
      .upload(filePath, imageFile, {
        cacheControl: '3600',
        upsert: false,
        contentType: imageFile.type,
      });

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from('products-images')
      .getPublicUrl(filePath);

    return data.publicUrl;
  }

  async function handleSaveProduct(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    const price = Number(form.price);
    const salePrice =
      form.sale_price.trim() === '' ? null : Number(form.sale_price);
    const stockQuantity = Number(form.stock_quantity);

    if (!form.name.trim()) {
      setError('Enter a product name.');
      return;
    }

    if (!Number.isFinite(price) || price <= 0) {
      setError('Enter a valid price greater than zero.');
      return;
    }

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice <= 0 || salePrice >= price)
    ) {
      setError('The sale price must be greater than zero and lower than the original price.');
      return;
    }

    if (
      !Number.isInteger(stockQuantity) ||
      stockQuantity < 0
    ) {
      setError('Stock quantity must be a whole number of zero or more.');
      return;
    }

    setSaving(true);

    try {
      const imageUrl = await uploadImage();

      const productData = {
        name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        price,
        sale_price: salePrice,
        stock_quantity: stockQuantity,
        image_url: imageUrl || null,
        is_active: form.is_active,
        updated_at: new Date().toISOString(),
      };

      let result;

      if (editingId) {
        result = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingId)
          .select()
          .single();
      } else {
        result = await supabase
          .from('products')
          .insert(productData)
          .select()
          .single();
      }

      if (result.error) throw result.error;

      setNotice(editingId ? 'Product updated successfully.' : 'Product added successfully.');
      resetForm();
      await loadProducts();
    } catch (err) {
      console.error('Product save failed:', err);
      setError(
        err.message ||
          'Could not save the product. Check your database and storage policies.'
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(product) {
    const confirmed = window.confirm(
      `Delete "${product.name}"? This cannot be undone.`
    );

    if (!confirmed) return;

    setError('');
    setNotice('');

    try {
      const { error: deleteError } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (deleteError) throw deleteError;

      if (editingId === product.id) resetForm();

      setNotice(`"${product.name}" has been deleted.`);
      await loadProducts();
    } catch (err) {
      console.error('Product deletion failed:', err);
      setError(err.message || 'Could not delete the product.');
    }
  }

  async function toggleActive(product) {
    setError('');
    setNotice('');

    try {
      const { error: updateError } = await supabase
        .from('products')
        .update({
          is_active: !product.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', product.id);

      if (updateError) throw updateError;

      setNotice(
        product.is_active
          ? 'Product hidden from the storefront.'
          : 'Product is now visible on the storefront.'
      );

      await loadProducts();
    } catch (err) {
      setError(err.message || 'Could not update product visibility.');
    }
  }

  const visibleProducts = products.filter((product) => {
    const matchesSearch =
      !search.trim() ||
      product.name?.toLowerCase().includes(search.toLowerCase()) ||
      product.category?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'in-stock' && Number(product.stock_quantity) > 0) ||
      (filter === 'out-of-stock' && Number(product.stock_quantity) <= 0) ||
      (filter === 'sale' &&
        Number(product.sale_price) > 0 &&
        Number(product.sale_price) < Number(product.price)) ||
      (filter === 'hidden' && product.is_active === false);

    return matchesSearch && matchesFilter;
  });

  const totalProducts = products.length;
  const inStockCount = products.filter(
    (product) => Number(product.stock_quantity) > 0
  ).length;
  const outOfStockCount = products.filter(
    (product) => Number(product.stock_quantity) <= 0
  ).length;
  const saleCount = products.filter(
    (product) =>
      Number(product.sale_price) > 0 &&
      Number(product.sale_price) < Number(product.price)
  ).length;

  if (checkingAuth) {
    return (
      <main className="admin-page">
        <div className="admin-loading">
          <div className="admin-spinner" />
          <p>Checking administrator access...</p>
        </div>
      </main>
    );
  }

  if (!session || !authorized) {
    return (
      <main className="admin-page admin-login-page">
        <form className="admin-login-card" onSubmit={handleLogin}>
          <div className="admin-brand-mark">VB</div>
          <h1>VoltBridge Technologies</h1>
          <h2>Inventory Administration</h2>
          <p>Sign in using your authorized administrator account.</p>

          {error && <div className="admin-alert error">{error}</div>}

          <label htmlFor="admin-email">Email address</label>
          <input
            id="admin-email"
            type="email"
            autoComplete="username"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Your administrator email"
            required
          />

          <label htmlFor="admin-password">Password</label>
          <input
            id="admin-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Your password"
            required
          />

          <button className="admin-primary-button" disabled={loggingIn}>
            {loggingIn ? 'Signing in...' : 'Sign In'}
          </button>

          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => navigate('/')}
          >
            Back to Store
          </button>
        </form>
      </main>
    );
  }

  return (
    <main className="admin-page">
      <header className="admin-topbar">
        <a className="admin-brand" href="/admin">
          <span className="admin-brand-mark">VB</span>
          <span>
            <strong>VoltBridge</strong>
            <small>INVENTORY MANAGEMENT</small>
          </span>
        </a>

        <div className="admin-top-actions">
          <span className="admin-user-email">{session.user.email}</span>
          <button
            type="button"
            className="admin-secondary-button"
            onClick={() => navigate('/')}
          >
            View Store
          </button>
          <button
            type="button"
            className="admin-logout-button"
            onClick={handleLogout}
          >
            Sign Out
          </button>
        </div>
      </header>

      <div className="admin-content">
        <div className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">STORE MANAGEMENT</span>
            <h1>Inventory Dashboard</h1>
            <p>Manage your products, stock, pricing and sale offers.</p>
          </div>

          <button
            type="button"
            className="admin-primary-button"
            onClick={() => {
              resetForm();
              document
                .getElementById('product-form')
                ?.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            + Add Product
          </button>
        </div>

        {error && (
          <div className="admin-alert error">
            <span>{error}</span>
            <button type="button" onClick={() => setError('')}>
              Dismiss
            </button>
          </div>
        )}

        {notice && (
          <div className="admin-alert success">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')}>
              Dismiss
            </button>
          </div>
        )}

        <section className="admin-stats">
          <article className="admin-stat-card">
            <span>Total Products</span>
            <strong>{totalProducts}</strong>
          </article>

          <article className="admin-stat-card">
            <span>In Stock</span>
            <strong>{inStockCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Out of Stock</span>
            <strong>{outOfStockCount}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Products on Sale</span>
            <strong>{saleCount}</strong>
          </article>
        </section>

        <section className="admin-panel" id="product-form">
          <div className="admin-panel-heading">
            <div>
              <h2>{editingId ? 'Edit Product' : 'Add New Product'}</h2>
              <p>
                Enter the product information below. Fields marked with *
                are required.
              </p>
            </div>

            {editingId && (
              <button
                type="button"
                className="admin-secondary-button"
                onClick={resetForm}
              >
                Cancel Edit
              </button>
            )}
          </div>

          <form onSubmit={handleSaveProduct}>
            <div className="admin-form-grid">
              <div className="admin-field">
                <label htmlFor="product-name">Product Name *</label>
                <input
                  id="product-name"
                  name="name"
                  value={form.name}
                  onChange={updateField}
                  placeholder="e.g. Samsung Fast Charger"
                  required
                />
              </div>

              <div className="admin-field">
                <label htmlFor="product-category">Category *</label>
                <select
                  id="product-category"
                  name="category"
                  value={form.category}
                  onChange={updateField}
                  required
                >
                  {CATEGORIES.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="admin-field">
                <label htmlFor="product-price">Original Price (KSh) *</label>
                <input
                  id="product-price"
                  name="price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.price}
                  onChange={updateField}
                  placeholder="e.g. 2500"
                  required
                />
              </div>

              <div className="admin-field">
                <label htmlFor="product-sale-price">
                  Sale Price (KSh)
                </label>
                <input
                  id="product-sale-price"
                  name="sale_price"
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.sale_price}
                  onChange={updateField}
                  placeholder="Leave empty if not on sale"
                />
                <small>
                  Enter a price lower than the original price to apply a
                  discount.
                </small>
              </div>

              <div className="admin-field">
                <label htmlFor="product-stock">Stock Quantity *</label>
                <input
                  id="product-stock"
                  name="stock_quantity"
                  type="number"
                  min="0"
                  step="1"
                  value={form.stock_quantity}
                  onChange={updateField}
                  required
                />
                <small>
                  Zero automatically means Out of Stock on the storefront.
                </small>
              </div>

              <div className="admin-field">
                <label htmlFor="product-image">Product Image</label>
                <input
                  id="product-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                />
                <small>Maximum file size: 5 MB.</small>
              </div>

              <div className="admin-field admin-field-full">
                <label htmlFor="product-description">Description</label>
                <textarea
                  id="product-description"
                  name="description"
                  value={form.description}
                  onChange={updateField}
                  rows="4"
                  placeholder="Describe the product, compatibility and features..."
                />
              </div>

              <div className="admin-field admin-field-full">
                <label htmlFor="product-image-url">
                  Or use an existing image URL
                </label>
                <input
                  id="product-image-url"
                  name="image_url"
                  type="url"
                  value={form.image_url}
                  onChange={(event) => {
                    updateField(event);
                    setImageFile(null);
                    setImagePreview(event.target.value);
                  }}
                  placeholder="https://example.com/product-image.jpg"
                />
                <small>
                  Selecting a new image file takes priority over this URL.
                </small>
              </div>

              {imagePreview && (
                <div className="admin-field admin-field-full">
                  <label>Image Preview</label>
                  <div className="admin-image-preview">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      onError={(event) => {
                        event.currentTarget.style.display = 'none';
                      }}
                    />
                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() => {
                        setImageFile(null);
                        setImagePreview('');
                        setForm((current) => ({
                          ...current,
                          image_url: '',
                        }));
                      }}
                    >
                      Remove Image
                    </button>
                  </div>
                </div>
              )}

              <div className="admin-field admin-field-full">
                <label className="admin-checkbox-label">
                  <input
                    name="is_active"
                    type="checkbox"
                    checked={form.is_active}
                    onChange={updateField}
                  />
                  Show this product on the public storefront
                </label>
              </div>
            </div>

            {form.price && (
              <div className="admin-price-preview">
                <span>Storefront price preview</span>
                <strong>
                  {formatPrice(
                    form.sale_price &&
                      Number(form.sale_price) > 0 &&
                      Number(form.sale_price) < Number(form.price)
                      ? form.sale_price
                      : form.price
                  )}
                </strong>

                {form.sale_price &&
                  Number(form.sale_price) > 0 &&
                  Number(form.sale_price) < Number(form.price) && (
                    <span className="admin-sale-label">
                      Sale: save{' '}
                      {formatPrice(Number(form.price) - Number(form.sale_price))}
                    </span>
                  )}
              </div>
            )}

            <div className="admin-form-actions">
              <button
                type="submit"
                className="admin-primary-button"
                disabled={saving}
              >
                {saving
                  ? 'Saving Product...'
                  : editingId
                    ? 'Save Changes'
                    : 'Add Product'}
              </button>

              <button
                type="button"
                className="admin-secondary-button"
                onClick={resetForm}
              >
                Clear Form
              </button>
            </div>
          </form>
        </section>

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Product Inventory</h2>
              <p>{visibleProducts.length} product(s) shown</p>
            </div>

            <button
              type="button"
              className="admin-secondary-button"
              onClick={loadProducts}
              disabled={loading}
            >
              {loading ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          <div className="admin-inventory-toolbar">
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search products..."
              aria-label="Search inventory"
            />

            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter inventory"
            >
              <option value="all">All Products</option>
              <option value="in-stock">In Stock</option>
              <option value="out-of-stock">Out of Stock</option>
              <option value="sale">On Sale</option>
              <option value="hidden">Hidden Products</option>
            </select>
          </div>

          {loading ? (
            <div className="admin-empty-state">Loading inventory...</div>
          ) : visibleProducts.length === 0 ? (
            <div className="admin-empty-state">
              <h3>No products found</h3>
              <p>Add a product above or change your search and filters.</p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Visibility</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleProducts.map((product) => {
                    const discounted =
                      Number(product.sale_price) > 0 &&
                      Number(product.sale_price) < Number(product.price);

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="admin-product-cell">
                            {product.image_url ? (
                              <img
                                src={product.image_url}
                                alt={product.name}
                              />
                            ) : (
                              <div className="admin-table-placeholder">
                                VB
                              </div>
                            )}

                            <div>
                              <strong>{product.name}</strong>
                              {discounted && (
                                <small className="admin-sale-label">
                                  On Sale
                                </small>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>{product.category || 'Uncategorized'}</td>

                        <td>
                          <strong>
                            {formatPrice(getSalePrice(product))}
                          </strong>
                          {discounted && (
                            <small className="admin-original-price">
                              {formatPrice(product.price)}
                            </small>
                          )}
                        </td>

                        <td>
                          <span
                            className={
                              Number(product.stock_quantity) > 0
                                ? 'admin-stock-badge available'
                                : 'admin-stock-badge unavailable'
                            }
                          >
                            {Number(product.stock_quantity) > 0
                              ? `${product.stock_quantity} available`
                              : 'Out of Stock'}
                          </span>
                        </td>

                        <td>
                          <span
                            className={
                              product.is_active
                                ? 'admin-visibility visible'
                                : 'admin-visibility hidden'
                            }
                          >
                            {product.is_active ? 'Visible' : 'Hidden'}
                          </span>
                        </td>

                        <td>
                          <div className="admin-row-actions">
                            <button
                              type="button"
                              onClick={() => startEditing(product)}
                            >
                              Edit
                            </button>

                            <button
                              type="button"
                              onClick={() => toggleActive(product)}
                            >
                              {product.is_active ? 'Hide' : 'Show'}
                            </button>

                            <button
                              type="button"
                              className="admin-delete-button"
                              onClick={() => handleDelete(product)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <p className="admin-security-note">
          Inventory changes are restricted by your Supabase database policies.
          Keep your administrator password private.
        </p>
      </div>
    </main>
  );
}