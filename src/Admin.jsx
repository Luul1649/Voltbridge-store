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

const ORDER_STATUSES = [
  'pending',
  'confirmed',
  'shipped',
  'delivered',
  'cancelled',
];

function formatPrice(value) {
  return `KSh ${Number(value || 0).toLocaleString('en-KE')}`;
}

function getSalePrice(product) {
  const price = Number(product.price || 0);
  const salePrice = Number(product.sale_price || 0);

  return salePrice > 0 && salePrice < price ? salePrice : price;
}

function formatDate(value) {
  if (!value) return 'Unknown date';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unknown date';

  return date.toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function getOrderReference(order) {
  return `VB-${order.order_number}`;
}

export default function Admin() {
  const navigate = useNavigate();

  // Authentication
  const [session, setSession] = useState(null);
  const [authorized, setAuthorized] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loggingIn, setLoggingIn] = useState(false);

  // General messages
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Inventory
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_PRODUCT);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [saving, setSaving] = useState(false);

  // Orders
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState('');
  const [ordersNotice, setOrdersNotice] = useState('');
  const [orderFilter, setOrderFilter] = useState('all');
  const [orderSearch, setOrderSearch] = useState('');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [updatingOrderId, setUpdatingOrderId] = useState(null);

  // Verify the signed-in user is an authorized administrator.
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

  // Load products.
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

  // Load orders together with their order items.
  const loadOrders = useCallback(async () => {
    setOrdersLoading(true);
    setOrdersError('');

    try {
      const { data, error: fetchError } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          customer_name,
          customer_phone,
          delivery_address,
          customer_notes,
          status,
          subtotal,
          created_at,
          updated_at,
          order_items (
            id,
            product_name,
            quantity,
            unit_price,
            line_total
          )
        `)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setOrders(data || []);
    } catch (err) {
      console.error('Order loading failed:', err);
      setOrdersError(
        err.message ||
          'Could not load orders. Check your Supabase database permissions.'
      );
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  // Initialize authentication and listen for login/logout changes.
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

  // Load dashboard data after administrator authorization.
  useEffect(() => {
    if (authorized) {
      loadProducts();
      loadOrders();
    }
  }, [authorized, loadProducts, loadOrders]);

  // Product form helpers.
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

    setImagePreview((previousPreview) => {
      if (previousPreview.startsWith('blob:')) {
        URL.revokeObjectURL(previousPreview);
      }

      return URL.createObjectURL(file);
    });
  }

  // Administrator login.
  async function handleLogin(event) {
    event.preventDefault();
    setError('');
    setNotice('');
    setLoggingIn(true);

    try {
      const { data, error: loginError } =
        await supabase.auth.signInWithPassword({
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

  // Administrator logout.
  async function handleLogout() {
    setError('');

    const { error: logoutError } = await supabase.auth.signOut();

    if (logoutError) {
      setError(logoutError.message);
      return;
    }

    resetForm();
    setProducts([]);
    setOrders([]);
    setAuthorized(false);
    setSession(null);
  }

  // Upload a product image to Supabase Storage.
  async function uploadImage() {
    if (!imageFile) return form.image_url || null;

    const extension =
      imageFile.name.split('.').pop()?.toLowerCase() || 'jpg';

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

  // Add or update a product.
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
      (!Number.isFinite(salePrice) ||
        salePrice <= 0 ||
        salePrice >= price)
    ) {
      setError(
        'The sale price must be greater than zero and lower than the original price.'
      );
      return;
    }

    if (!Number.isInteger(stockQuantity) || stockQuantity < 0) {
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

      setNotice(
        editingId
          ? 'Product updated successfully.'
          : 'Product added successfully.'
      );

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

  // Delete a product.
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

  // Show or hide a product.
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

  // Update an order's status.
  async function updateOrderStatus(order, newStatus) {
    if (!ORDER_STATUSES.includes(newStatus)) {
      setOrdersError('Invalid order status selected.');
      return;
    }

    if (newStatus === order.status) return;

    setOrdersError('');
    setOrdersNotice('');
    setUpdatingOrderId(order.id);

    try {
      const { error: updateError } = await supabase
        .from('orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString(),
        })
        .eq('id', order.id);

      if (updateError) throw updateError;

      setOrders((currentOrders) =>
        currentOrders.map((currentOrder) =>
          currentOrder.id === order.id
            ? { ...currentOrder, status: newStatus }
            : currentOrder
        )
      );

      setOrdersNotice(
        `${getOrderReference(order)} updated to ${newStatus}.`
      );
    } catch (err) {
      console.error('Order status update failed:', err);
      setOrdersError(
        err.message ||
          'Could not update the order. Check your Supabase permissions.'
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  // Open WhatsApp to contact a customer.
  function contactOrderCustomer(order) {
    const digits = String(order.customer_phone || '').replace(/\D/g, '');

    if (!digits) {
      setOrdersError('This order has no customer phone number.');
      return;
    }

    let phone = digits;

    // Convert Kenyan local numbers to international format.
    if (phone.startsWith('0') && phone.length === 10) {
      phone = `254${phone.slice(1)}`;
    } else if (phone.startsWith('254')) {
      // Already in Kenyan international format.
    } else if (phone.length === 9) {
      phone = `254${phone}`;
    }

    const message = [
      `Hello ${order.customer_name},`,
      `I am contacting you from VoltBridge Technologies about order ${getOrderReference(order)}.`,
      `Order status: ${order.status}.`,
      `Order total: ${formatPrice(order.subtotal)}.`,
    ].join('\n');

    window.open(
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`,
      '_blank',
      'noopener,noreferrer'
    );
  }

  // Inventory filtering.
  const visibleProducts = products.filter((product) => {
    const searchTerm = search.trim().toLowerCase();

    const matchesSearch =
      !searchTerm ||
      product.name?.toLowerCase().includes(searchTerm) ||
      product.category?.toLowerCase().includes(searchTerm);

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

  // Order filtering and searching.
  const visibleOrders = orders.filter((order) => {
    const matchesStatus =
      orderFilter === 'all' || order.status === orderFilter;

    const searchTerm = orderSearch.trim().toLowerCase();

    const matchesSearch =
      !searchTerm ||
      getOrderReference(order).toLowerCase().includes(searchTerm) ||
      order.customer_name?.toLowerCase().includes(searchTerm) ||
      order.customer_phone?.toLowerCase().includes(searchTerm) ||
      order.delivery_address?.toLowerCase().includes(searchTerm);

    return matchesStatus && matchesSearch;
  });

  const pendingOrders = orders.filter(
    (order) => order.status === 'pending'
  ).length;

  const confirmedOrders = orders.filter(
    (order) => order.status === 'confirmed'
  ).length;

  const completedOrders = orders.filter(
    (order) => order.status === 'delivered'
  ).length;

  // Authentication loading screen.
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

  // Login screen.
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

          <button
            className="admin-primary-button"
            disabled={loggingIn}
          >
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

  // Main administrator dashboard.
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
            <p>Manage products, stock, pricing, discounts and customer orders.</p>
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

        {/* Inventory statistics */}
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

        {/* Product form */}
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
                <label htmlFor="product-sale-price">Sale Price (KSh)</label>
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
                      {formatPrice(
                        Number(form.price) - Number(form.sale_price)
                      )}
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

        {/* Product inventory */}
        <section className="admin-panel" id="inventory">
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

        {/* Order statistics */}
        <section className="admin-stats" id="orders">
          <article className="admin-stat-card">
            <span>Total Orders</span>
            <strong>{orders.length}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Pending Orders</span>
            <strong>{pendingOrders}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Confirmed Orders</span>
            <strong>{confirmedOrders}</strong>
          </article>

          <article className="admin-stat-card">
            <span>Delivered Orders</span>
            <strong>{completedOrders}</strong>
          </article>
        </section>

        {/* Customer orders */}
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <h2>Customer Orders</h2>
              <p>Review purchases and manage order fulfilment.</p>
            </div>

            <button
              type="button"
              className="admin-secondary-button"
              onClick={loadOrders}
              disabled={ordersLoading}
            >
              {ordersLoading ? 'Refreshing...' : 'Refresh Orders'}
            </button>
          </div>

          {ordersError && (
            <div className="admin-alert error">
              <span>{ordersError}</span>
              <button
                type="button"
                onClick={() => setOrdersError('')}
              >
                Dismiss
              </button>
            </div>
          )}

          {ordersNotice && (
            <div className="admin-alert success">
              <span>{ordersNotice}</span>
              <button
                type="button"
                onClick={() => setOrdersNotice('')}
              >
                Dismiss
              </button>
            </div>
          )}

          <div className="admin-inventory-toolbar">
            <input
              type="search"
              value={orderSearch}
              onChange={(event) => setOrderSearch(event.target.value)}
              placeholder="Search order, customer or phone..."
              aria-label="Search customer orders"
            />

            <select
              value={orderFilter}
              onChange={(event) => setOrderFilter(event.target.value)}
              aria-label="Filter orders by status"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <p>
            {visibleOrders.length} order(s) shown
          </p>

          {ordersLoading && orders.length === 0 ? (
            <div className="admin-empty-state">Loading orders...</div>
          ) : visibleOrders.length === 0 ? (
            <div className="admin-empty-state">
              <h3>No orders found</h3>
              <p>
                Orders saved through your store checkout will appear here.
              </p>
            </div>
          ) : (
            <div className="admin-table-wrapper">
              <table className="admin-inventory-table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleOrders.map((order) => (
                    <tr key={order.id}>
                      <td>
                        <strong>{getOrderReference(order)}</strong>
                      </td>

                      <td>
                        <strong>{order.customer_name}</strong>
                        <br />
                        <small>{order.customer_phone}</small>
                      </td>

                      <td>
                        <strong>{formatPrice(order.subtotal)}</strong>
                      </td>

                      <td>
                        <select
                          value={order.status}
                          disabled={updatingOrderId === order.id}
                          aria-label={`Status for ${getOrderReference(order)}`}
                          onChange={(event) =>
                            updateOrderStatus(order, event.target.value)
                          }
                        >
                          {ORDER_STATUSES.map((status) => (
                            <option key={status} value={status}>
                              {status.charAt(0).toUpperCase() +
                                status.slice(1)}
                            </option>
                          ))}
                        </select>

                        {updatingOrderId === order.id && (
                          <small>Saving...</small>
                        )}
                      </td>

                      <td>{formatDate(order.created_at)}</td>

                      <td>
                        <div className="admin-row-actions">
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedOrder(
                                expandedOrder === order.id ? null : order.id
                              )
                            }
                          >
                            {expandedOrder === order.id
                              ? 'Hide Details'
                              : 'Details'}
                          </button>

                          <button
                            type="button"
                            onClick={() => contactOrderCustomer(order)}
                          >
                            WhatsApp
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {visibleOrders
                .filter((order) => expandedOrder === order.id)
                .map((order) => (
                  <div
                    key={`details-${order.id}`}
                    className="admin-empty-state"
                  >
                    <h3>{getOrderReference(order)} — Order Details</h3>

                    <p>
                      <strong>Customer:</strong> {order.customer_name}
                    </p>

                    <p>
                      <strong>Phone:</strong> {order.customer_phone}
                    </p>

                    <p>
                      <strong>Delivery address:</strong>{' '}
                      {order.delivery_address || 'Not provided'}
                    </p>

                    <p>
                      <strong>Customer notes:</strong>{' '}
                      {order.customer_notes || 'None'}
                    </p>

                    <h4>Items Ordered</h4>

                    {order.order_items?.length ? (
                      <div className="admin-table-wrapper">
                        <table className="admin-inventory-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Quantity</th>
                              <th>Unit Price</th>
                              <th>Line Total</th>
                            </tr>
                          </thead>

                          <tbody>
                            {order.order_items.map((item) => (
                              <tr key={item.id}>
                                <td>{item.product_name}</td>
                                <td>{item.quantity}</td>
                                <td>{formatPrice(item.unit_price)}</td>
                                <td>{formatPrice(item.line_total)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p>No item details were found for this order.</p>
                    )}

                    <p>
                      <strong>
                        Order total: {formatPrice(order.subtotal)}
                      </strong>
                    </p>

                    <button
                      type="button"
                      className="admin-secondary-button"
                      onClick={() => setExpandedOrder(null)}
                    >
                      Close Details
                    </button>
                  </div>
                ))}
            </div>
          )}
        </section>

        <p className="admin-security-note">
          Inventory and order changes are restricted by your Supabase
          database policies. Keep your administrator password private.
        </p>
      </div>
    </main>
  );
}