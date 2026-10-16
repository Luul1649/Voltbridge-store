
import { useEffect, useState } from 'react';
import {
  Routes,
  Route,
  Link,
  useParams,
  useNavigate,
} from 'react-router-dom';
import {
  ShoppingCart,
  Search,
  Menu,
  X,
  Plus,
  Minus,
  Trash2,
  ArrowRight,
  Package,
  ShieldCheck,
  Truck,
  MessageCircle,
  RefreshCw,
  ChevronRight,
} from 'lucide-react';

import Admin from './Admin';
import { supabase } from './supabase';
import { useCart } from './CartContext';
import './App.css';

const WHATSAPP_NUMBER = '254726147462';
const BUSINESS_ADDRESS = 'Bihi Tower, 4th Floor, Suite 5, Nairobi';

function formatPrice(value) {
  const price = Number(value || 0);

  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(price);
}

function getProductPrice(product) {
  const regularPrice = Number(product?.price || 0);
  const salePrice = Number(
    product?.discount_price ?? product?.sale_price ?? 0
  );

  return salePrice > 0 && salePrice < regularPrice
    ? salePrice
    : regularPrice;
}

function getProductImage(product) {
  if (product?.image_url) return product.image_url;
  if (product?.image) return product.image;
  if (product?.thumbnail) return product.thumbnail;

  if (Array.isArray(product?.images) && product.images.length > 0) {
    return product.images[0];
  }

  return '';
}

function getProductName(product) {
  return product?.name || product?.title || 'Product';
}

function getProductStock(product) {
  const stock = product?.stock_quantity ?? product?.stock;

  if (stock === null || stock === undefined || stock === '') {
    return null;
  }

  const number = Number(stock);
  return Number.isFinite(number) ? number : null;
}

function ProductImage({ product, className = '' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const image = getProductImage(product);

  useEffect(() => {
    setImageFailed(false);
  }, [image]);

  if (!image || imageFailed) {
    return (
      <div className={`product-image-placeholder ${className}`}>
        <Package size={42} strokeWidth={1.4} />
        <span>VoltBridge</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={image}
      alt={getProductName(product)}
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

function LoadingState() {
  return (
    <div className="state-container" role="status">
      <RefreshCw className="loading-icon" size={30} />
      <h3>Loading products...</h3>
      <p>Please wait while we fetch our products.</p>
    </div>
  );
}

function ErrorState({ message, onRetry }) {
  return (
    <div className="state-container error-state">
      <Package size={36} />
      <h3>Products could not be loaded</h3>
      <p>{message}</p>
      <button
        type="button"
        className="btn btn-primary"
        onClick={onRetry}
      >
        <RefreshCw size={16} />
        Try again
      </button>
    </div>
  );
}

function EmptyProducts() {
  return (
    <div className="state-container">
      <Package size={38} />
      <h3>No products available yet</h3>
      <p>Please check back soon for our latest products.</p>
    </div>
  );
}

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const price = getProductPrice(product);
  const regularPrice = Number(product?.price || 0);
  const stock = getProductStock(product);
  const outOfStock = stock !== null && stock <= 0;
  const discounted = price < regularPrice;

  function handleAddToCart() {
    addToCart(product);
  }

  return (
    <article className="product-card">
      <Link
        to={`/product/${product.id}`}
        className="product-card-image-link"
        aria-label={`View ${getProductName(product)}`}
      >
        <div className="product-card-image">
          <ProductImage product={product} />

          {discounted && <span className="sale-badge">Sale</span>}

          {outOfStock && (
            <span className="stock-badge">Out of stock</span>
          )}
        </div>
      </Link>

      <div className="product-card-content">
        <Link
          to={`/product/${product.id}`}
          className="product-card-title"
        >
          {getProductName(product)}
        </Link>

        {product?.category && (
          <p className="product-category">{product.category}</p>
        )}

        <div className="product-price-row">
          <strong>{formatPrice(price)}</strong>

          {discounted && (
            <span className="old-price">
              {formatPrice(regularPrice)}
            </span>
          )}
        </div>

        {stock !== null && (
          <p
            className={`stock-status ${
              outOfStock ? 'out-of-stock' : ''
            }`}
          >
            {outOfStock ? 'Currently unavailable' : `${stock} in stock`}
          </p>
        )}

        <button
          type="button"
          className="btn btn-primary product-add-button"
          disabled={outOfStock}
          onClick={handleAddToCart}
        >
          <ShoppingCart size={16} />
          {outOfStock ? 'Out of stock' : 'Add to cart'}
        </button>
      </div>
    </article>
  );
}

function Header() {
  const { cartItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const items = Array.isArray(cartItems) ? cartItems : [];

  const cartCount = items.reduce(
    (total, item) => total + Number(item.quantity || 1),
    0
  );

  function handleSearch(event) {
    event.preventDefault();

    const query = searchTerm.trim();

    if (query) {
      navigate(`/?search=${encodeURIComponent(query)}#products`);
      setSearchOpen(false);
      setMenuOpen(false);
    }
  }

  return (
    <>
      <div className="announcement-bar">
        Original Samsung and Apple chargers &amp; phone accessories.
        <span> Free Nairobi delivery on eligible orders.</span>
      </div>

      <header className="site-header">
        <div className="header-inner">
          <button
            type="button"
            className="icon-button mobile-menu-button"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>

          <Link
            to="/"
            className="brand-logo"
            onClick={() => setMenuOpen(false)}
          >
            <span className="brand-mark">
              <Package size={25} />
            </span>
            <span className="brand-name">
              VoltBridge
              <small>TECHNOLOGIES</small>
            </span>
          </Link>

          <nav className={`main-nav ${menuOpen ? 'nav-open' : ''}`}>
            <Link to="/" onClick={() => setMenuOpen(false)}>
              Home
            </Link>
            <Link
              to="/#products"
              onClick={() => setMenuOpen(false)}
            >
              Shop
            </Link>
            <Link
              to="/#about"
              onClick={() => setMenuOpen(false)}
            >
              About us
            </Link>
            <Link
              to="/#contact"
              onClick={() => setMenuOpen(false)}
            >
              Contact
            </Link>
          </nav>

          <div className="header-actions">
            <button
              type="button"
              className="icon-button"
              aria-label="Search products"
              onClick={() => setSearchOpen(!searchOpen)}
            >
              <Search size={21} />
            </button>

            <Link to="/cart" className="cart-link" aria-label="Shopping cart">
              <ShoppingCart size={21} />
              <span>Cart</span>
              <span className="cart-count">{cartCount}</span>
            </Link>
          </div>
        </div>

        {searchOpen && (
          <form className="search-form" onSubmit={handleSearch}>
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search phone accessories..."
              aria-label="Search products"
              autoFocus
            />
            <button className="btn btn-primary" type="submit">
              Search
            </button>
          </form>
        )}
      </header>
    </>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="footer-inner">
        <div className="footer-brand">
          <Link to="/" className="brand-logo footer-logo">
            <span className="brand-mark">
              <Package size={24} />
            </span>
            <span className="brand-name">
              VoltBridge
              <small>TECHNOLOGIES</small>
            </span>
          </Link>

          <p>
            Quality phone accessories, dependable service, and convenient
            shopping in Nairobi and across Kenya.
          </p>
        </div>

        <div className="footer-column">
          <h4>Shop</h4>
          <Link to="/#products">All products</Link>
          <Link to="/cart">Shopping cart</Link>
        </div>

        <div className="footer-column">
          <h4>Customer service</h4>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}`}
            target="_blank"
            rel="noreferrer"
          >
            WhatsApp enquiries
          </a>
          <p>{BUSINESS_ADDRESS}</p>
        </div>
      </div>

      <div className="footer-bottom">
        <p>
          © {new Date().getFullYear()} VoltBridge Technologies. All rights
          reserved.
        </p>
      </div>
    </footer>
  );
}

function HomePage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  async function loadProducts() {
    setLoading(true);
    setError('');

    try {
      if (!supabase) {
        throw new Error(
          'Supabase is not configured. Check your project .env file and restart the development server.'
        );
      }

      const { data, error: queryError } = await supabase
        .from('products')
        .select('*');

      if (queryError) throw queryError;

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Product loading error:', err);
      setError(
        err?.message ||
          'Unable to load products. Check your Supabase connection and products table.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    function syncSearchFromUrl() {
      const params = new URLSearchParams(window.location.search);
      setSearchTerm(params.get('search') || '');
    }

    syncSearchFromUrl();
    window.addEventListener('popstate', syncSearchFromUrl);

    return () => {
      window.removeEventListener('popstate', syncSearchFromUrl);
    };
  }, []);

  const filteredProducts = products.filter((product) => {
    const query = searchTerm.trim().toLowerCase();

    if (!query) return true;

    const name = getProductName(product).toLowerCase();
    const category = String(product?.category || '').toLowerCase();
    const description = String(product?.description || '').toLowerCase();

    return (
      name.includes(query) ||
      category.includes(query) ||
      description.includes(query)
    );
  });

  return (
    <>
      <main>
        <section className="hero-section">
          <div className="hero-content">
            <span className="eyebrow">WELCOME TO VOLTBRIDGE</span>
            <h1>
              Power your world.
              <br />
              <span>Connect with confidence.</span>
            </h1>
            <p>
              Discover quality phone accessories, reliable chargers, power
              banks, audio essentials, and more.
            </p>

            <div className="hero-actions">
              <a href="#products" className="btn btn-primary">
                Shop products <ArrowRight size={18} />
              </a>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                  'Hello VoltBridge Technologies, I would like to make an enquiry.'
                )}`}
                target="_blank"
                rel="noreferrer"
                className="btn btn-secondary"
              >
                <MessageCircle size={18} />
                Contact us
              </a>
            </div>

            <div className="hero-trust">
              <span><ShieldCheck size={17} /> Quality products</span>
              <span><Truck size={17} /> Kenya-wide shipping</span>
            </div>
          </div>
        </section>

        <section className="benefits-section">
          <div className="benefit-item">
            <ShieldCheck size={27} />
            <div>
              <h3>Quality you can trust</h3>
              <p>Carefully selected accessories</p>
            </div>
          </div>

          <div className="benefit-item">
            <Truck size={27} />
            <div>
              <h3>Convenient delivery</h3>
              <p>Nairobi and countrywide shipping</p>
            </div>
          </div>

          <div className="benefit-item">
            <MessageCircle size={27} />
            <div>
              <h3>Easy ordering</h3>
              <p>Get help through WhatsApp</p>
            </div>
          </div>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <div>
              <span className="eyebrow">OUR COLLECTION</span>
              <h2>Explore our products</h2>
              <p>Find the accessories you need for everyday connection.</p>
            </div>

            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="text-link"
            >
              Need help? <ChevronRight size={17} />
            </a>
          </div>

          {searchTerm && (
            <div className="search-results-heading">
              <p>
                Results for <strong>“{searchTerm}”</strong>
              </p>
              <button
                type="button"
                className="text-link"
                onClick={() => {
                  setSearchTerm('');
                  window.history.replaceState({}, '', '/#products');
                }}
              >
                Clear search
              </button>
            </div>
          )}

          {loading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState message={error} onRetry={loadProducts} />
          ) : filteredProducts.length === 0 ? (
            searchTerm ? (
              <div className="state-container">
                <Search size={36} />
                <h3>No matching products found</h3>
                <p>Try another product name or category.</p>
              </div>
            ) : (
              <EmptyProducts />
            )
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
        </section>

        <section className="about-section" id="about">
          <div className="about-content">
            <span className="eyebrow">WHY VOLTBRIDGE?</span>
            <h2>Accessories for your everyday connections.</h2>
            <p>
              We make shopping for phone accessories straightforward, with
              convenient ordering, helpful customer support, and delivery
              options for customers in Nairobi and beyond.
            </p>
            <a
              className="btn btn-primary"
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                'Hello, I would like to enquire about your products.'
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              Talk to our team <ArrowRight size={18} />
            </a>
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}

function ProductPage() {
  const { productId } = useParams();
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError('');
      setProduct(null);

      try {
        if (!supabase) {
          throw new Error('Supabase is not configured. Check your .env file.');
        }

        const { data, error: queryError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .maybeSingle();

        if (queryError) throw queryError;

        if (!data) {
          throw new Error('This product could not be found.');
        }

        if (!cancelled) setProduct(data);
      } catch (err) {
        console.error('Product detail loading error:', err);

        if (!cancelled) {
          setError(err?.message || 'Unable to load this product.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  if (loading) return <LoadingState />;

  if (error) {
    return (
      <ErrorState
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const price = getProductPrice(product);
  const regularPrice = Number(product?.price || 0);
  const stock = getProductStock(product);
  const outOfStock = stock !== null && stock <= 0;

  return (
    <>
      <main className="product-detail-page">
        <div className="breadcrumb">
          <Link to="/">Home</Link>
          <ChevronRight size={15} />
          <span>{getProductName(product)}</span>
        </div>

        <div className="product-detail-layout">
          <div className="product-detail-image">
            <ProductImage product={product} />
          </div>

          <div className="product-detail-info">
            {product?.category && (
              <span className="eyebrow">{product.category}</span>
            )}

            <h1>{getProductName(product)}</h1>

            <div className="product-detail-price">
              <strong>{formatPrice(price)}</strong>
              {price < regularPrice && (
                <span className="old-price">
                  {formatPrice(regularPrice)}
                </span>
              )}
            </div>

            {product?.description && (
              <p className="product-description">{product.description}</p>
            )}

            {stock !== null && (
              <p className={`stock-status ${outOfStock ? 'out-of-stock' : ''}`}>
                {outOfStock ? 'Out of stock' : `${stock} available`}
              </p>
            )}

            <button
              type="button"
              className="btn btn-primary detail-add-button"
              disabled={outOfStock}
              onClick={() => addToCart(product)}
            >
              <ShoppingCart size={18} />
              {outOfStock ? 'Out of stock' : 'Add to cart'}
            </button>

            <a
              className="btn btn-secondary detail-whatsapp-button"
              href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
                `Hello VoltBridge Technologies, I would like to enquire about ${getProductName(product)}.`
              )}`}
              target="_blank"
              rel="noreferrer"
            >
              <MessageCircle size={18} />
              Ask on WhatsApp
            </a>

            <div className="detail-benefits">
              <p><ShieldCheck size={18} /> Quality accessories</p>
              <p><Truck size={18} /> Delivery options available</p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </>
  );
}

function CartPage() {
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
  } = useCart();

  const items = Array.isArray(cartItems) ? cartItems : [];

  const subtotal = items.reduce(
    (total, item) =>
      total + getProductPrice(item) * Number(item.quantity || 1),
    0
  );

  if (items.length === 0) {
    return (
      <>
        <main className="cart-page">
          <div className="section-heading">
            <div>
              <span className="eyebrow">YOUR SELECTION</span>
              <h1>Your shopping cart</h1>
            </div>
          </div>

          <div className="state-container">
            <ShoppingCart size={42} />
            <h3>Your cart is empty</h3>
            <p>Explore our products and add something you need.</p>
            <Link to="/" className="btn btn-primary">
              Continue shopping <ArrowRight size={17} />
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="cart-page">
        <div className="section-heading">
          <div>
            <span className="eyebrow">YOUR SELECTION</span>
            <h1>Your shopping cart</h1>
            <p>Review your items before checking out.</p>
          </div>
        </div>

        <div className="cart-layout">
          <div className="cart-items-list">
            {items.map((item) => (
              <article className="cart-item" key={item.id}>
                <Link to={`/product/${item.id}`} className="cart-item-image">
                  <ProductImage product={item} />
                </Link>

                <div className="cart-item-info">
                  <Link to={`/product/${item.id}`} className="cart-item-name">
                    {getProductName(item)}
                  </Link>
                  <p>{formatPrice(getProductPrice(item))}</p>

                  <div className="quantity-controls">
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.id)}
                      aria-label="Decrease quantity"
                    >
                      <Minus size={15} />
                    </button>
                    <span>{item.quantity || 1}</span>
                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.id)}
                      aria-label="Increase quantity"
                    >
                      <Plus size={15} />
                    </button>
                  </div>
                </div>

                <div className="cart-item-end">
                  <strong>
                    {formatPrice(
                      getProductPrice(item) * Number(item.quantity || 1)
                    )}
                  </strong>
                  <button
                    type="button"
                    className="remove-item-button"
                    onClick={() => removeFromCart(item.id)}
                    aria-label={`Remove ${getProductName(item)}`}
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}

            <Link to="/" className="text-link continue-shopping">
              <ArrowRight size={17} />
              Continue shopping
            </Link>
          </div>

          <aside className="order-summary">
            <h2>Order summary</h2>
            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>
            <p className="summary-note">
              Delivery charges, if applicable, will be confirmed during order
              processing.
            </p>
            <Link to="/checkout" className="btn btn-primary checkout-button">
              Proceed to checkout <ArrowRight size={17} />
            </Link>
            <a
              href={`https://wa.me/${WHATSAPP_NUMBER}`}
              target="_blank"
              rel="noreferrer"
              className="text-link summary-whatsapp"
            >
              <MessageCircle size={17} /> Need help?
            </a>
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}

function CheckoutPage() {
  const { cartItems, clearCart } = useCart();
  const navigate = useNavigate();
  const items = Array.isArray(cartItems) ? cartItems : [];

  const [form, setForm] = useState({
    customer_name: '',
    phone: '',
    email: '',
    delivery_address: '',
    notes: '',
    payment_method: 'mpesa',
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [successOrder, setSuccessOrder] = useState(null);

  const subtotal = items.reduce(
    (total, item) =>
      total + getProductPrice(item) * Number(item.quantity || 1),
    0
  );

  function updateField(event) {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }

    if (!supabase) {
      setError('Supabase is not configured. Please check your .env file.');
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = items.map((item) => ({
        product_id: item.id,
        product_name: getProductName(item),
        quantity: Number(item.quantity || 1),
        unit_price: getProductPrice(item),
      }));

      const { data, error: orderError } = await supabase.rpc(
        'place_store_order',
        {
          p_customer_name: form.customer_name.trim(),
          p_phone: form.phone.trim(),
          p_email: form.email.trim() || null,
          p_delivery_address: form.delivery_address.trim(),
          p_notes: form.notes.trim() || null,
          p_payment_method: form.payment_method,
          p_items: orderItems,
        }
      );

      if (orderError) throw orderError;

      const order = Array.isArray(data) ? data[0] : data;

      setSuccessOrder(order || { id: 'received' });

      const message = [
        'Hello VoltBridge Technologies, I have placed an order.',
        `Order reference: ${order?.order_number || order?.id || 'Received'}`,
        `Name: ${form.customer_name}`,
        `Phone: ${form.phone}`,
        `Delivery address: ${form.delivery_address}`,
        `Payment method: ${form.payment_method}`,
        '',
        ...items.map(
          (item) =>
            `${getProductName(item)} x${item.quantity || 1} — ${formatPrice(
              getProductPrice(item) * Number(item.quantity || 1)
            )}`
        ),
        '',
        `Subtotal: ${formatPrice(subtotal)}`,
      ].join('\n');

      clearCart();

      const whatsappUrl =
        `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

      const whatsappWindow = window.open(
        whatsappUrl,
        '_blank',
        'noopener,noreferrer'
      );

      if (!whatsappWindow) {
        console.info('WhatsApp could not be opened automatically.');
      }
    } catch (err) {
      console.error('Order submission error:', err);

      setError(
        err?.message ||
          'We could not submit your order. Please try again or contact us on WhatsApp.'
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (successOrder) {
    return (
      <>
        <main className="checkout-page">
          <div className="state-container success-state">
            <ShieldCheck size={44} />
            <h1>Thank you for your order!</h1>
            <p>Your order has been submitted.</p>
            <p>
              Reference:{' '}
              <strong>
                {successOrder.order_number || successOrder.id}
              </strong>
            </p>
            <p>Contact us on WhatsApp if you need assistance.</p>
            <Link to="/" className="btn btn-primary">
              Continue shopping
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <main className="checkout-page">
          <div className="state-container">
            <ShoppingCart size={40} />
            <h2>Your cart is empty</h2>
            <p>Add products before proceeding to checkout.</p>
            <Link to="/" className="btn btn-primary">
              Browse products
            </Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <main className="checkout-page">
        <div className="section-heading">
          <div>
            <span className="eyebrow">ALMOST THERE</span>
            <h1>Checkout</h1>
            <p>Enter your contact and delivery information.</p>
          </div>
        </div>

        <div className="checkout-layout">
          <form className="checkout-form" onSubmit={handleSubmit}>
            <h2>Delivery information</h2>

            <label>
              Full name *
              <input
                name="customer_name"
                value={form.customer_name}
                onChange={updateField}
                required
                autoComplete="name"
              />
            </label>

            <label>
              Phone number *
              <input
                name="phone"
                type="tel"
                value={form.phone}
                onChange={updateField}
                required
                autoComplete="tel"
              />
            </label>

            <label>
              Email address (optional)
              <input
                name="email"
                type="email"
                value={form.email}
                onChange={updateField}
                autoComplete="email"
              />
            </label>

            <label>
              Delivery address *
              <textarea
                name="delivery_address"
                value={form.delivery_address}
                onChange={updateField}
                required
                rows={3}
                placeholder="Estate, building, town, and other directions"
              />
            </label>

            <label>
              Payment method *
              <select
                name="payment_method"
                value={form.payment_method}
                onChange={updateField}
                required
              >
                <option value="mpesa">M-Pesa</option>
                <option value="cash_on_delivery">Pay on delivery</option>
                <option value="bank_transfer">Bank transfer</option>
              </select>
            </label>

            <label>
              Additional notes (optional)
              <textarea
                name="notes"
                value={form.notes}
                onChange={updateField}
                rows={3}
                placeholder="Any extra delivery instructions?"
              />
            </label>

            {error && <p className="form-error" role="alert">{error}</p>}

            <button
              className="btn btn-primary checkout-submit"
              type="submit"
              disabled={submitting}
            >
              {submitting ? 'Submitting order...' : 'Place order'}
              {!submitting && <ArrowRight size={17} />}
            </button>

            <p className="checkout-help">
              Need assistance?{' '}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noreferrer"
              >
                Contact us on WhatsApp
              </a>
            </p>
          </form>

          <aside className="order-summary">
            <h2>Your order</h2>

            {items.map((item) => (
              <div className="checkout-summary-item" key={item.id}>
                <span>
                  {getProductName(item)} × {item.quantity || 1}
                </span>
                <strong>
                  {formatPrice(
                    getProductPrice(item) * Number(item.quantity || 1)
                  )}
                </strong>
              </div>
            ))}

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <p className="summary-note">
              Delivery charges and final payment arrangements will be confirmed
              with you.
            </p>
          </aside>
        </div>
      </main>

      <Footer />
    </>
  );
}

function NotFoundPage() {
  return (
    <>
      <main className="state-container not-found-page">
        <h1>Page not found</h1>
        <p>The page you are looking for does not exist.</p>
        <Link to="/" className="btn btn-primary">
          Return to home <ArrowRight size={17} />
        </Link>
      </main>
      <Footer />
    </>
  );
}

function StoreLayout() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/product/:productId" element={<ProductPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Admin />} />
      <Route path="/*" element={<StoreLayout />} />
    </Routes>
  );
}
