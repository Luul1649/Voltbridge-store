
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Activity,
  Boxes,
  BadgePercent,
  CircleAlert,
  ClipboardList,
  Image as ImageIcon,
  LogOut,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "./supabase";
import "./Admin.css";

const CATEGORIES = [
  "Phone Cases",
  "Chargers & Cables",
  "Power Banks",
  "Earbuds & Headphones",
  "Screen Protectors",
  "Phone Holders",
  "Other Accessories",
];

const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
];

const EMPTY_FORM = {
  name: "",
  description: "",
  category: "Chargers & Cables",
  price: "",
  sale_price: "",
  stock_quantity: "0",
  image_url: "",
  is_active: true,
};

const money = (value) =>
  `KSh ${Number(value || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 2,
  })}`;

function formatDate(value) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function getErrorMessage(error) {
  if (/row-level security|permission denied|not allowed/i.test(error?.message || "")) {
    return `${error.message}. Check your Supabase admin permissions and RLS policies.`;
  }

  return error?.message || "Something went wrong. Please try again.";
}

function ProductForm({ product, onClose, onSave, saving }) {
  const [form, setForm] = useState(() => ({
    ...EMPTY_FORM,
    ...(product || {}),
    price: product?.price == null ? "" : String(product.price),
    sale_price: product?.sale_price == null ? "" : String(product.sale_price),
    stock_quantity: String(product?.stock_quantity ?? 0),
    image_url: product?.image_url || "",
    description: product?.description || "",
    is_active: product?.is_active ?? true,
  }));

  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    setError("");

    const price = Number(form.price);
    const stock = Number(form.stock_quantity);
    const salePrice =
      form.sale_price.trim() === "" ? null : Number(form.sale_price);

    if (!form.name.trim()) {
      setError("Enter a product name.");
      return;
    }

    if (!Number.isFinite(price) || price < 0) {
      setError("Enter a valid product price.");
      return;
    }

    if (!Number.isInteger(stock) || stock < 0) {
      setError("Stock must be a whole number of zero or more.");
      return;
    }

    if (
      salePrice !== null &&
      (!Number.isFinite(salePrice) || salePrice < 0 || salePrice >= price)
    ) {
      setError("The sale price must be lower than the regular price.");
      return;
    }

    onSave({
      name: form.name.trim(),
      description: form.description.trim(),
      category: form.category,
      price,
      sale_price: salePrice,
      stock_quantity: stock,
      image_url: form.image_url.trim() || null,
      is_active: Boolean(form.is_active),
    });
  }

  return (
    <div
      className="vb-modal-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        className="vb-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vb-form-title"
      >
        <div className="vb-modal-heading">
          <div>
            <span className="vb-eyebrow">
              {product ? "UPDATE INVENTORY" : "NEW INVENTORY ITEM"}
            </span>
            <h2 id="vb-form-title">
              {product ? "Edit product" : "Add product"}
            </h2>
          </div>

          <button
            className="vb-icon-button"
            type="button"
            onClick={onClose}
            aria-label="Close form"
          >
            <X size={19} />
          </button>
        </div>

        <form className="vb-product-form" onSubmit={handleSubmit}>
          <label>
            Product name *
            <input
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
              required
              maxLength={160}
            />
          </label>

          <label>
            Category *
            <select
              value={form.category}
              onChange={(e) => update("category", e.target.value)}
              required
            >
              {CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>

          <label className="vb-form-wide">
            Description
            <textarea
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              maxLength={2000}
            />
          </label>

          <label>
            Regular price (KSh) *
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.price}
              onChange={(e) => update("price", e.target.value)}
              required
            />
          </label>

          <label>
            Sale price (KSh)
            <input
              type="number"
              min="0"
              step="0.01"
              value={form.sale_price}
              onChange={(e) => update("sale_price", e.target.value)}
              placeholder="Leave blank for no discount"
            />
            <small>Must be lower than the regular price.</small>
          </label>

          <label>
            Stock quantity *
            <input
              type="number"
              min="0"
              step="1"
              value={form.stock_quantity}
              onChange={(e) => update("stock_quantity", e.target.value)}
              required
            />
          </label>

          <label className="vb-form-wide">
            Product image URL
            <input
              type="url"
              value={form.image_url}
              onChange={(e) => update("image_url", e.target.value)}
              placeholder="https://..."
            />
          </label>

          <label className="vb-toggle-row vb-form-wide">
            <input
              type="checkbox"
              checked={Boolean(form.is_active)}
              onChange={(e) => update("is_active", e.target.checked)}
            />
            <span>
              <strong>Visible in storefront</strong>
              <small>
                Turn off to hide this product without deleting it.
              </small>
            </span>
          </label>

          {error && (
            <p className="vb-inline-error vb-form-wide">{error}</p>
          )}

          <div className="vb-form-actions vb-form-wide">
            <button
              type="button"
              className="vb-button vb-button-secondary"
              onClick={onClose}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="vb-button vb-button-primary"
              disabled={saving}
            >
              {saving ? "Saving..." : product ? "Save changes" : "Add product"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function Admin() {
  const [session, setSession] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [saving, setSaving] = useState(false);
  const [signingIn, setSigningIn] = useState(false);

  // Orders management state
  const [orders, setOrders] = useState([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersError, setOrdersError] = useState("");
  const [updatingOrderId, setUpdatingOrderId] = useState(null);
  const [orderSearch, setOrderSearch] = useState("");
  const [orderFilter, setOrderFilter] = useState("all");

  useEffect(() => {
    if (!supabase) {
      setAuthError(
        "Supabase is not configured. Check your environment variables."
      );
      setAuthLoading(false);
      return undefined;
    }

    let alive = true;

    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!alive) return;

        if (error) setAuthError(getErrorMessage(error));

        setSession(data?.session || null);
        setAuthLoading(false);
      })
      .catch((error) => {
        if (!alive) return;

        setAuthError(getErrorMessage(error));
        setAuthLoading(false);
      });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        setAuthError("");
      }
    );

    return () => {
      alive = false;
      authListener?.subscription?.unsubscribe();
    };
  }, []);

  const loadProducts = useCallback(async () => {
    if (!supabase || !session) return;

    setLoading(true);
    setLoadError("");

    try {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      setProducts(data || []);
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [session]);

  const loadOrders = useCallback(async () => {
    if (!supabase || !session) return;

    setOrdersLoading(true);
    setOrdersError("");

    try {
      // Fetch orders first.
      const { data: orderRows, error: orderError } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (orderError) throw orderError;

      const orderList = orderRows || [];

      if (orderList.length === 0) {
        setOrders([]);
        return;
      }

      // Fetch all order items for these orders.
      const orderIds = orderList.map((order) => order.id);

      const { data: itemRows, error: itemError } = await supabase
        .from("order_items")
        .select("*")
        .in("order_id", orderIds)
        .order("created_at", { ascending: true });

      if (itemError) throw itemError;

      const items = itemRows || [];

      // Attach each item's products to its matching order.
      const ordersWithItems = orderList.map((order) => ({
        ...order,
        items: items.filter(
          (item) => String(item.order_id) === String(order.id)
        ),
      }));

      setOrders(ordersWithItems);
    } catch (error) {
      setOrdersError(getErrorMessage(error));
    } finally {
      setOrdersLoading(false);
    }
  }, [session]);

  useEffect(() => {
    if (!session) return;

    loadProducts();
    loadOrders();
  }, [session, loadProducts, loadOrders]);

  const stats = useMemo(() => {
    const active = products.filter((p) => p.is_active !== false);

    return {
      total: products.length,
      out: active.filter(
        (p) => Number(p.stock_quantity ?? p.stock ?? 0) <= 0
      ).length,
      low: active.filter((p) => {
        const stock = Number(p.stock_quantity ?? p.stock ?? 0);
        return stock > 0 && stock <= 5;
      }).length,
      sale: active.filter(
        (p) =>
          p.sale_price != null &&
          Number(p.sale_price) < Number(p.price)
      ).length,
    };
  }, [products]);

  const orderStats = useMemo(
    () => ({
      total: orders.length,
      pending: orders.filter(
        (order) => String(order.status || "").toLowerCase() === "pending"
      ).length,
      processing: orders.filter((order) =>
        ["confirmed", "processing", "shipped"].includes(
          String(order.status || "").toLowerCase()
        )
      ).length,
      completed: orders.filter(
        (order) => String(order.status || "").toLowerCase() === "delivered"
      ).length,
    }),
    [orders]
  );

  const visibleProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((p) => {
      const stock = Number(p.stock_quantity ?? p.stock ?? 0);

      const matchesSearch =
        !term ||
        `${p.name || ""} ${p.category || ""} ${p.description || ""}`
          .toLowerCase()
          .includes(term);

      const matchesFilter =
        filter === "all" ||
        (filter === "in" && stock > 0) ||
        (filter === "out" && stock <= 0) ||
        (filter === "sale" &&
          p.sale_price != null &&
          Number(p.sale_price) < Number(p.price));

      return matchesSearch && matchesFilter;
    });
  }, [products, search, filter]);

  const visibleOrders = useMemo(() => {
    const term = orderSearch.trim().toLowerCase();

    return orders.filter((order) => {
      const matchesSearch =
        !term ||
        [
          order.order_number,
          order.customer_name,
          order.customer_phone,
          order.delivery_address,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(term);

      const matchesStatus =
        orderFilter === "all" ||
        String(order.status || "").toLowerCase() === orderFilter;

      return matchesSearch && matchesStatus;
    });
  }, [orders, orderSearch, orderFilter]);

  async function signIn(event) {
    event.preventDefault();

    if (!supabase) return;

    setSigningIn(true);
    setAuthError("");

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      setPassword("");
    } catch (error) {
      setAuthError(getErrorMessage(error));
    } finally {
      setSigningIn(false);
    }
  }

  async function signOut() {
    if (!supabase) return;

    const { error } = await supabase.auth.signOut();

    if (error) {
      setAuthError(getErrorMessage(error));
      return;
    }

    setSession(null);
    setProducts([]);
    setOrders([]);
    setNotice("");
  }

  async function saveProduct(values) {
    if (!supabase) return;

    setSaving(true);
    setLoadError("");
    setNotice("");

    try {
      const result = editing
        ? await supabase
            .from("products")
            .update(values)
            .eq("id", editing.id)
            .select()
            .single()
        : await supabase
            .from("products")
            .insert(values)
            .select()
            .single();

      if (result.error) throw result.error;

      setFormOpen(false);
      setEditing(null);
      setNotice(
        editing
          ? "Product updated successfully."
          : "Product added successfully."
      );

      await loadProducts();
    } catch (error) {
      setLoadError(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  }

  async function toggleVisibility(product) {
    if (!supabase) return;

    const nextActive = product.is_active === false;

    setLoadError("");
    setNotice("");

    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: nextActive })
        .eq("id", product.id);

      if (error) throw error;

      setProducts((current) =>
        current.map((item) =>
          item.id === product.id
            ? { ...item, is_active: nextActive }
            : item
        )
      );

      setNotice(
        nextActive
          ? "Product is now visible in the storefront."
          : "Product is hidden from the storefront."
      );
    } catch (error) {
      setLoadError(getErrorMessage(error));
    }
  }

  async function updateOrderStatus(order, nextStatus) {
    if (!supabase || !order?.id || !nextStatus) return;

    const currentStatus = String(order.status || "").toLowerCase();

    if (currentStatus === nextStatus.toLowerCase()) return;

    setUpdatingOrderId(order.id);
    setOrdersError("");

    try {
      const { data, error } = await supabase
        .from("orders")
        .update({
          status: nextStatus,
          updated_at: new Date().toISOString(),
        })
        .eq("id", order.id)
        .select()
        .single();

      if (error) throw error;

      setOrders((current) =>
        current.map((item) =>
          item.id === order.id ? { ...item, ...data } : item
        )
      );
    } catch (error) {
      setOrdersError(
        `Could not update order ${order.order_number || ""}: ${getErrorMessage(error)}`
      );
    } finally {
      setUpdatingOrderId(null);
    }
  }

  if (authLoading) {
    return (
      <main className="vb-admin-shell vb-state">
        <RefreshCw className="vb-spin" />
        <p>Checking admin session...</p>
      </main>
    );
  }

  if (!session) {
    return (
      <main className="vb-admin-shell vb-login-shell">
        <section className="vb-login-card">
          <div className="vb-admin-brand-mark">
            <ShieldCheck size={27} />
          </div>

          <span className="vb-eyebrow">VOLTBRIDGE TECHNOLOGIES</span>
          <h1>Admin sign in</h1>
          <p className="vb-login-intro">
            Sign in using your authorised Supabase administrator account.
          </p>

          <form className="vb-login-form" onSubmit={signIn}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>

            {authError && <p className="vb-inline-error">{authError}</p>}

            <button
              className="vb-button vb-button-primary vb-full-width"
              type="submit"
              disabled={signingIn}
            >
              {signingIn ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <p className="vb-security-note">
            <ShieldCheck size={15} />
            Database permissions must restrict inventory and order changes to authorised administrators.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="vb-admin-shell">
      <header className="vb-admin-topbar">
        <a className="vb-admin-brand" href="/">
          <span className="vb-admin-brand-mark">
            <Package size={22} />
          </span>
          <span>
            <strong>VoltBridge</strong>
            <small>TECHNOLOGIES · ADMIN</small>
          </span>
        </a>

        <div className="vb-topbar-actions">
          <span className="vb-signed-in">
            <ShieldCheck size={15} />
            {session.user?.email}
          </span>

          <a className="vb-store-link" href="/">
            View store ↗
          </a>

          <button
            className="vb-button vb-button-secondary"
            onClick={signOut}
          >
            <LogOut size={16} />
            Sign out
          </button>
        </div>
      </header>

      <div className="vb-admin-content">
        <section className="vb-page-title">
          <div>
            <span className="vb-eyebrow">STORE OPERATIONS</span>
            <h1>Inventory dashboard</h1>
            <p>Manage product availability, prices and sale offers.</p>
          </div>

          <div className="vb-title-actions">
            <button
              className="vb-button vb-button-secondary"
              onClick={() => {
                loadProducts();
                loadOrders();
              }}
              disabled={loading || ordersLoading}
            >
              <RefreshCw
                size={16}
                className={loading || ordersLoading ? "vb-spin" : ""}
              />
              Refresh all
            </button>

            <button
              className="vb-button vb-button-primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
            >
              <Plus size={17} />
              Add product
            </button>
          </div>
        </section>

        {loadError && (
          <div className="vb-alert vb-alert-error">
            <CircleAlert size={18} />
            <span>{loadError}</span>
            <button onClick={() => setLoadError("")} aria-label="Dismiss error">
              <X size={16} />
            </button>
          </div>
        )}

        {notice && (
          <div className="vb-alert vb-alert-success">
            <ShieldCheck size={18} />
            <span>{notice}</span>
            <button onClick={() => setNotice("")} aria-label="Dismiss notice">
              <X size={16} />
            </button>
          </div>
        )}

        <section className="vb-stats-grid">
          <article className="vb-stat-card">
            <span className="vb-stat-icon"><Boxes size={20} /></span>
            <span className="vb-stat-label">Total products</span>
            <strong>{stats.total}</strong>
            <small>All inventory records</small>
          </article>

          <article className="vb-stat-card">
            <span className="vb-stat-icon vb-icon-warning"><CircleAlert size={20} /></span>
            <span className="vb-stat-label">Out of stock</span>
            <strong>{stats.out}</strong>
            <small>Visible products with zero stock</small>
          </article>

          <article className="vb-stat-card">
            <span className="vb-stat-icon vb-icon-warning"><Activity size={20} /></span>
            <span className="vb-stat-label">Low stock</span>
            <strong>{stats.low}</strong>
            <small>Five units or fewer</small>
          </article>

          <article className="vb-stat-card">
            <span className="vb-stat-icon vb-icon-sale"><BadgePercent size={20} /></span>
            <span className="vb-stat-label">On sale</span>
            <strong>{stats.sale}</strong>
            <small>Products with a discount</small>
          </article>
        </section>

        {/* ORDERS MANAGEMENT */}
        <section className="vb-inventory-panel" id="orders">
          <div className="vb-panel-heading">
            <div>
              <h2><ShoppingBag size={20} /> Orders management</h2>
              <p>Customer orders and their associated products from Supabase.</p>
            </div>

            <button
              className="vb-button vb-button-secondary"
              onClick={loadOrders}
              disabled={ordersLoading}
            >
              <RefreshCw
                size={16}
                className={ordersLoading ? "vb-spin" : ""}
              />
              Refresh orders
            </button>
          </div>

          <section className="vb-stats-grid">
            <article className="vb-stat-card">
              <span className="vb-stat-icon"><ShoppingBag size={20} /></span>
              <span className="vb-stat-label">Total orders</span>
              <strong>{orderStats.total}</strong>
              <small>All recorded orders</small>
            </article>

            <article className="vb-stat-card">
              <span className="vb-stat-icon vb-icon-warning"><ClipboardList size={20} /></span>
              <span className="vb-stat-label">Pending</span>
              <strong>{orderStats.pending}</strong>
              <small>Awaiting processing</small>
            </article>

            <article className="vb-stat-card">
              <span className="vb-stat-icon"><Activity size={20} /></span>
              <span className="vb-stat-label">In progress</span>
              <strong>{orderStats.processing}</strong>
              <small>Confirmed, processing or shipped</small>
            </article>

            <article className="vb-stat-card">
              <span className="vb-stat-icon vb-icon-sale"><ShieldCheck size={20} /></span>
              <span className="vb-stat-label">Delivered</span>
              <strong>{orderStats.completed}</strong>
              <small>Completed orders</small>
            </article>
          </section>

          {ordersError && (
            <div className="vb-alert vb-alert-error">
              <CircleAlert size={18} />
              <span>{ordersError}</span>
              <button
                onClick={() => setOrdersError("")}
                aria-label="Dismiss orders error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          <div className="vb-inventory-tools">
            <label className="vb-search-box">
              <Search size={17} />
              <input
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search order number, customer or phone..."
              />
            </label>

            <select
              aria-label="Filter orders by status"
              value={orderFilter}
              onChange={(e) => setOrderFilter(e.target.value)}
            >
              <option value="all">All statuses</option>
              {ORDER_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </option>
              ))}
            </select>

            <span className="vb-result-count">
              {visibleOrders.length} orders
            </span>
          </div>

          {ordersLoading && orders.length === 0 ? (
            <div className="vb-state">
              <RefreshCw className="vb-spin" />
              <p>Loading orders...</p>
            </div>
          ) : ordersError && orders.length === 0 ? (
            <div className="vb-state">
              <CircleAlert size={27} />
              <h3>Could not load orders</h3>
              <p>
                Check your orders and order_items tables and the Supabase
                permissions for your administrator account.
              </p>
              <button
                className="vb-button vb-button-secondary"
                onClick={loadOrders}
              >
                Try again
              </button>
            </div>
          ) : visibleOrders.length === 0 ? (
            <div className="vb-state">
              <ShoppingBag size={28} />
              <h3>No orders found</h3>
              <p>
                {orders.length === 0
                  ? "No orders are currently visible to this admin account."
                  : "Try another search or status filter."}
              </p>
            </div>
          ) : (
            <div className="vb-orders-list">
              {visibleOrders.map((order) => {
                const status = String(order.status || "pending").toLowerCase();
                const items = order.items || [];

                return (
                  <article className="vb-order-card" key={order.id}>
                    <div className="vb-order-heading">
                      <div>
                        <span className="vb-eyebrow">
                          ORDER {order.order_number || String(order.id).slice(0, 8)}
                        </span>
                        <h3>{order.customer_name || "Customer name unavailable"}</h3>
                        <small>Placed {formatDate(order.created_at)}</small>
                      </div>

                      <span
                        className={`vb-status-pill ${
                          status === "delivered"
                            ? "is-active"
                            : status === "cancelled"
                              ? "is-hidden"
                              : "is-low"
                        }`}
                      >
                        {status}
                      </span>
                    </div>

                    <div className="vb-order-customer">
                      <p>
                        <UserRound size={15} />
                        <strong>Customer:</strong>{" "}
                        {order.customer_name || "—"}
                      </p>
                      <p>
                        <strong>Phone:</strong>{" "}
                        {order.customer_phone || "—"}
                      </p>
                      <p>
                        <strong>Delivery address:</strong>{" "}
                        {order.delivery_address || "—"}
                      </p>
                      {order.customer_notes && (
                        <p>
                          <strong>Customer notes:</strong>{" "}
                          {order.customer_notes}
                        </p>
                      )}
                    </div>

                    <div className="vb-order-items">
                      <h4>Products ordered ({items.length})</h4>

                      {items.length === 0 ? (
                        <p className="vb-order-no-items">
                          No items were returned for this order.
                        </p>
                      ) : (
                        <div className="vb-table-wrap">
                          <table className="vb-inventory-table">
                            <thead>
                              <tr>
                                <th>Product</th>
                                <th>Quantity</th>
                                <th>Unit price</th>
                                <th>Line total</th>
                              </tr>
                            </thead>
                            <tbody>
                              {items.map((item) => (
                                <tr key={item.id}>
                                  <td>
                                    {item.product_name ||
                                      `Product ${item.product_id || ""}`}
                                  </td>
                                  <td>{item.quantity ?? 0}</td>
                                  <td>{money(item.unit_price)}</td>
                                  <td>
                                    <strong>
                                      {money(
                                        item.line_total ??
                                          Number(item.quantity || 0) *
                                            Number(item.unit_price || 0)
                                      )}
                                    </strong>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div className="vb-order-footer">
                      <div>
                        <small>Subtotal</small>
                        <strong className="vb-order-total">
                          {money(order.subtotal)}
                        </strong>
                        <small>Updated {formatDate(order.updated_at)}</small>
                      </div>

                      <label className="vb-order-status-control">
                        <span>Update status</span>
                        <select
                          value={status}
                          disabled={updatingOrderId === order.id}
                          onChange={(event) =>
                            updateOrderStatus(order, event.target.value)
                          }
                        >
                          {!ORDER_STATUSES.includes(status) && (
                            <option value={status}>{status}</option>
                          )}
                          {ORDER_STATUSES.map((nextStatus) => (
                            <option key={nextStatus} value={nextStatus}>
                              {nextStatus.charAt(0).toUpperCase() +
                                nextStatus.slice(1)}
                            </option>
                          ))}
                        </select>
                        {updatingOrderId === order.id && (
                          <small>Saving status...</small>
                        )}
                      </label>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        {/* PRODUCT INVENTORY */}
        <section className="vb-inventory-panel">
          <div className="vb-panel-heading">
            <div>
              <h2><ClipboardList size={20} /> Product inventory</h2>
              <p>Changes are saved to your Supabase products table.</p>
            </div>
            <span className="vb-result-count">
              {visibleProducts.length} products
            </span>
          </div>

          <div className="vb-inventory-tools">
            <label className="vb-search-box">
              <Search size={17} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search name or category..."
              />
            </label>

            <select
              aria-label="Filter products"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="all">All products</option>
              <option value="in">In stock</option>
              <option value="out">Out of stock</option>
              <option value="sale">On sale</option>
            </select>
          </div>

          {loading && products.length === 0 ? (
            <div className="vb-state">
              <RefreshCw className="vb-spin" />
              <p>Loading inventory...</p>
            </div>
          ) : loadError && products.length === 0 ? (
            <div className="vb-state">
              <CircleAlert size={27} />
              <h3>Could not load inventory</h3>
              <p>Check your Supabase table, columns and database permissions.</p>
              <button
                className="vb-button vb-button-secondary"
                onClick={loadProducts}
              >
                Try again
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="vb-state">
              <Package size={28} />
              <h3>No products found</h3>
              <p>Try a different search or add a product.</p>
            </div>
          ) : (
            <div className="vb-table-wrap">
              <table className="vb-inventory-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Store status</th>
                    <th>Actions</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleProducts.map((product) => {
                    const stock = Number(
                      product.stock_quantity ?? product.stock ?? 0
                    );
                    const onSale =
                      product.sale_price != null &&
                      Number(product.sale_price) < Number(product.price);
                    const active = product.is_active !== false;

                    return (
                      <tr key={product.id}>
                        <td>
                          <div className="vb-product-cell">
                            <div className="vb-table-thumb">
                              {product.image_url ? (
                                <img
                                  src={product.image_url}
                                  alt=""
                                  loading="lazy"
                                  onError={(e) => {
                                    e.currentTarget.style.display = "none";
                                  }}
                                />
                              ) : (
                                <ImageIcon size={20} />
                              )}
                            </div>

                            <div>
                              <strong>{product.name}</strong>
                              <small>{product.category || "Uncategorised"}</small>
                              {onSale && (
                                <span className="vb-sale-tag">
                                  <BadgePercent size={12} /> SALE
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        <td>
                          <strong>
                            {money(onSale ? product.sale_price : product.price)}
                          </strong>
                          {onSale && (
                            <small className="vb-old-price">
                              {money(product.price)}
                            </small>
                          )}
                        </td>

                        <td>
                          <span
                            className={`vb-stock-pill ${
                              stock <= 0
                                ? "is-out"
                                : stock <= 5
                                  ? "is-low"
                                  : "is-in"
                            }`}
                          >
                            {stock <= 0
                              ? "Out of stock"
                              : stock <= 5
                                ? `${stock} left`
                                : `${stock} units`}
                          </span>
                        </td>

                        <td>
                          <span
                            className={`vb-status-pill ${
                              active ? "is-active" : "is-hidden"
                            }`}
                          >
                            {active ? "Visible" : "Hidden"}
                          </span>
                        </td>

                        <td>
                          <div className="vb-row-actions">
                            <button
                              className="vb-button vb-button-small vb-button-secondary"
                              onClick={() => {
                                setEditing(product);
                                setFormOpen(true);
                              }}
                            >
                              <Pencil size={14} /> Edit
                            </button>

                            <button
                              className="vb-text-action"
                              onClick={() => toggleVisibility(product)}
                            >
                              {active ? "Hide" : "Show"}
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

        <p className="vb-admin-footnote">
          <ShieldCheck size={15} />
          Only authorised administrators should be allowed to add or update products and orders in Supabase.
        </p>
      </div>

      {formOpen && (
        <ProductForm
          product={editing}
          onClose={() => {
            setFormOpen(false);
            setEditing(null);
          }}
          onSave={saveProduct}
          saving={saving}
        />
      )}
    </main>
  );
}
