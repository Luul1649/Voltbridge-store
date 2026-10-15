import { Routes, Route, Navigate } from 'react-router-dom';
import Admin from './Admin';
import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInstagram,
  faTiktok,
  faFacebookF,
} from '@fortawesome/free-brands-svg-icons';
import { supabase } from './supabase';
import './App.css';

const STORE_NAME = 'VoltBridge Technologies';
const WHATSAPP_NUMBER = '254726147462';
const STORE_ADDRESS = 'Bihi Tower, 4th Floor, Suite 5, Nairobi, Kenya';

const SOCIAL_LINKS = {
  instagram: 'https://www.instagram.com/voltbridgetechnologies/',
  tiktok: 'https://www.tiktok.com/@voltbridgetechnologies',
  facebook: 'https://www.facebook.com/voltbridgetechnologies/',
};

const CATEGORIES = [
  'All Products',
  'Gaming Devices',
  'Samsung Chargers',
  'Apple Accessories',
];

function formatPrice(price) {
  return `KSh ${Number(price || 0).toLocaleString('en-KE')}`;
}

function getPrice(product) {
  const price = Number(product?.price || 0);
  const salePrice = Number(product?.sale_price || 0);

  return salePrice > 0 && salePrice < price ? salePrice : price;
}

function hasDiscount(product) {
  const price = Number(product?.price || 0);
  const salePrice = Number(product?.sale_price || 0);

  return salePrice > 0 && salePrice < price;
}

function isInStock(product) {
  return Number(product?.stock_quantity || 0) > 0;
}

function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function SocialLinks() {
  return (
    <div className="social-links">
      <a href={SOCIAL_LINKS.instagram} target="_blank" rel="noreferrer" aria-label="Instagram">
        <FontAwesomeIcon icon={faInstagram} />
      </a>
      <a href={SOCIAL_LINKS.tiktok} target="_blank" rel="noreferrer" aria-label="TikTok">
        <FontAwesomeIcon icon={faTiktok} />
      </a>
      <a href={SOCIAL_LINKS.facebook} target="_blank" rel="noreferrer" aria-label="Facebook">
        <FontAwesomeIcon icon={faFacebookF} />
      </a>
    </div>
  );
}

function ProductCard({ product, onViewDetails, onAddToCart }) {
  const discounted = hasDiscount(product);
  const available = isInStock(product);

  return (
    <article className="product-card">
      <button
        type="button"
        className="product-image-button"
        onClick={() => onViewDetails(product)}
        aria-label={`View ${product.name}`}
      >
        <div className="product-image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} loading="lazy" />
          ) : (
            <div className="product-placeholder">
              <span>VB</span>
              <small>VoltBridge</small>
            </div>
          )}
          {discounted && <span className="sale-badge">SALE</span>}
          {!available && <span className="out-of-stock-badge">Out of Stock</span>}
        </div>
      </button>

      <div className="product-info">
        <span className="product-category">{product.category || 'Accessories'}</span>
        <h3>{product.name}</h3>

        <div className="product-pricing">
          <span className="current-price">{formatPrice(getPrice(product))}</span>
          {discounted && <span className="original-price">{formatPrice(product.price)}</span>}
        </div>

        <p className={available ? 'stock-status in-stock' : 'stock-status out'}>
          {available ? 'In Stock' : 'Out of Stock'}
        </p>

        <div className="product-actions">
          <button type="button" className="details-button" onClick={() => onViewDetails(product)}>
            View Details
          </button>
          <button
            type="button"
            className="add-to-cart-button"
            disabled={!available}
            onClick={() => onAddToCart(product)}
          >
            {available ? 'Add to Cart' : 'Unavailable'}
          </button>
        </div>
      </div>
    </article>
  );
}

function ProductDetails({ product, onClose, onAddToCart }) {
  if (!product) return null;

  const discounted = hasDiscount(product);
  const available = isInStock(product);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <section
        className="product-details-modal"
        role="dialog"
        aria-modal="true"
        aria-label={product.name}
        onClick={(event) => event.stopPropagation()}
      >
        <button type="button" className="modal-close" onClick={onClose} aria-label="Close product details">
          ×
        </button>

        <div className="details-image">
          {product.image_url ? (
            <img src={product.image_url} alt={product.name} />
          ) : (
            <div className="product-placeholder">
              <span>VB</span>
              <small>VoltBridge</small>
            </div>
          )}
        </div>

        <div className="details-content">
          <span className="product-category">{product.category || 'Accessories'}</span>
          <h2>{product.name}</h2>

          <div className="product-pricing details-pricing">
            <span className="current-price">{formatPrice(getPrice(product))}</span>
            {discounted && <span className="original-price">{formatPrice(product.price)}</span>}
          </div>

          {discounted && <p className="discount-message">Special offer available!</p>}

          <p className={available ? 'stock-status in-stock' : 'stock-status out'}>
            {available ? 'In Stock' : 'Out of Stock'}
          </p>

          <p className="product-description">
            {product.description || 'Contact us for more product information.'}
          </p>

          {available && (
            <button
              type="button"
              className="add-to-cart-button details-add-button"
              onClick={() => {
                onAddToCart(product);
                onClose();
              }}
            >
              Add to Cart
            </button>
          )}

          <a
            className="whatsapp-product-link"
            href={whatsappLink(`Hello ${STORE_NAME}, I would like to enquire about ${product.name}.`)}
            target="_blank"
            rel="noreferrer"
          >
            Ask about this product on WhatsApp
          </a>
        </div>
      </section>
    </div>
  );
}

function ShoppingCart({
  isOpen,
  onClose,
  cart,
  onIncrease,
  onDecrease,
  onRemove,
}) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerNotes, setCustomerNotes] = useState('');
  const [savingOrder, setSavingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState('');
  const [savedOrder, setSavedOrder] = useState(null);

  useEffect(() => {
    if (!isOpen) {
      setCheckoutError('');
      setSavedOrder(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const total = cart.reduce(
    (sum, item) => sum + getPrice(item) * item.quantity,
    0
  );

  async function submitOrder(event) {
    event.preventDefault();
    setCheckoutError('');

    if (!cart.length) {
      setCheckoutError('Your cart is empty.');
      return;
    }

    if (!customerName.trim() || !customerPhone.trim()) {
      setCheckoutError('Please enter your name and phone number.');
      return;
    }

    setSavingOrder(true);

    try {
      const { data, error } = await supabase.rpc('place_store_order', {
        p_customer_name: customerName.trim(),
        p_customer_phone: customerPhone.trim(),
        p_delivery_address: deliveryAddress.trim(),
        p_customer_notes: customerNotes.trim(),
        p_items: cart.map((item) => ({
          product_id: item.id,
          quantity: item.quantity,
        })),
      });

      if (error) throw error;

      if (!data?.order_number || !data?.order_id) {
        throw new Error('The order was not confirmed by the database. Please contact us before trying again.');
      }

      setSavedOrder(data);

      const message = [
        `Hello ${STORE_NAME}, I have placed an order on the website.`,
        '',
        `Order number: VB-${data.order_number}`,
        `Customer: ${customerName.trim()}`,
        `Phone: ${customerPhone.trim()}`,
        ...(deliveryAddress.trim() ? [`Delivery address: ${deliveryAddress.trim()}`] : []),
        '',
        ...cart.map(
          (item) =>
            `${item.name} x ${item.quantity} - ${formatPrice(
              getPrice(item) * item.quantity
            )}`
        ),
        '',
        `Order total: ${formatPrice(data.subtotal)}`,
        ...(customerNotes.trim() ? ['', `Notes: ${customerNotes.trim()}`] : []),
        '',
        'Please confirm my order and delivery details.',
      ].join('\n');

      // Open WhatsApp only after Supabase confirms the order was saved.
      window.location.assign(whatsappLink(message));
    } catch (error) {
      console.error('Unable to save order:', error);
      setCheckoutError(
        error?.message ||
          'We could not save your order. Please try again or contact us on WhatsApp.'
      );
    } finally {
      setSavingOrder(false);
    }
  }

  return (
    <div className="cart-overlay" onClick={onClose}>
      <aside
        className="shopping-cart"
        role="dialog"
        aria-modal="true"
        aria-label="Shopping cart"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="cart-header">
          <h2>Your Cart</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close cart">
            ×
          </button>
        </div>

        {cart.length === 0 ? (
          <div className="empty-cart">
            <p>Your cart is empty.</p>
            <button type="button" onClick={onClose}>Continue Shopping</button>
          </div>
        ) : (
          <>
            <div className="cart-items">
              {cart.map((item) => (
                <div className="cart-item" key={item.id}>
                  <div className="cart-item-image">
                    {item.image_url ? <img src={item.image_url} alt={item.name} /> : <span>VB</span>}
                  </div>

                  <div className="cart-item-info">
                    <h3>{item.name}</h3>
                    <p>{formatPrice(getPrice(item))}</p>

                    <div className="quantity-controls">
                      <button
                        type="button"
                        onClick={() => onDecrease(item.id)}
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        −
                      </button>
                      <span>{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => onIncrease(item.id)}
                        aria-label={`Increase quantity of ${item.name}`}
                        disabled={item.quantity >= Number(item.stock_quantity || 0)}
                      >
                        +
                      </button>
                    </div>

                    <button type="button" className="remove-item" onClick={() => onRemove(item.id)}>
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <form className="cart-footer" onSubmit={submitOrder}>
              <div className="cart-total">
                <span>Estimated total</span>
                <strong>{formatPrice(total)}</strong>
              </div>

              <p className="checkout-note">
                Enter your details. We will save your order before opening WhatsApp.
                Final prices and availability are verified when you submit.
              </p>

              <label htmlFor="order-customer-name">Full name *</label>
              <input
                id="order-customer-name"
                name="customerName"
                type="text"
                autoComplete="name"
                maxLength={120}
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
                required
              />

              <label htmlFor="order-customer-phone">Phone number *</label>
              <input
                id="order-customer-phone"
                name="customerPhone"
                type="tel"
                autoComplete="tel"
                maxLength={40}
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
                required
              />

              <label htmlFor="order-delivery-address">Delivery address (optional)</label>
              <textarea
                id="order-delivery-address"
                name="deliveryAddress"
                autoComplete="street-address"
                maxLength={500}
                rows={2}
                value={deliveryAddress}
                onChange={(event) => setDeliveryAddress(event.target.value)}
              />

              <label htmlFor="order-customer-notes">Order notes (optional)</label>
              <textarea
                id="order-customer-notes"
                name="customerNotes"
                maxLength={1000}
                rows={2}
                value={customerNotes}
                onChange={(event) => setCustomerNotes(event.target.value)}
              />

              {checkoutError && (
                <p className="error-message" role="alert">{checkoutError}</p>
              )}

              {savedOrder && (
                <p role="status">
                  Order VB-{savedOrder.order_number} saved successfully.
                </p>
              )}

              <button type="submit" className="checkout-button" disabled={savingOrder}>
                {savingOrder ? 'Saving Order...' : 'Save Order & Continue to WhatsApp'}
              </button>

              <p className="checkout-note">
                Submitting creates an order record. Your order is not confirmed until
                VoltBridge contacts you.
              </p>
            </form>
          </>
        )}
      </aside>
    </div>
  );
}

function Storefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Products');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [cart, setCart] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setLoading(true);
      setFetchError('');

      try {
        const { data, error } = await supabase
          .from('products')
          .select(
            'id, name, description, category, price, sale_price, stock_quantity, image_url, created_at'
          )
          .eq('is_active', true)
          .gt('price', 0)
          .order('created_at', { ascending: false });

        if (error) throw error;
        if (isMounted) setProducts(data || []);
      } catch (error) {
        console.error('Unable to load products:', error);
        if (isMounted) {
          setFetchError(
            'We could not load products right now. Please refresh the page or contact us on WhatsApp.'
          );
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadProducts();
    return () => { isMounted = false; };
  }, []);

  function addToCart(product) {
    if (!isInStock(product)) return;

    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.id === product.id);

      if (existing) {
        if (existing.quantity >= Number(product.stock_quantity || 0)) return currentCart;

        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });

    setCartOpen(true);
  }

  function increaseQuantity(productId) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id !== productId) return item;
        if (item.quantity >= Number(item.stock_quantity || 0)) return item;
        return { ...item, quantity: item.quantity + 1 };
      })
    );
  }

  function decreaseQuantity(productId) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity - 1 } : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setCart((currentCart) => currentCart.filter((item) => item.id !== productId));
  }

  const filteredProducts = products.filter((product) => {
    const matchesCategory =
      selectedCategory === 'All Products' || product.category === selectedCategory;
    const search = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !search ||
      product.name?.toLowerCase().includes(search) ||
      product.description?.toLowerCase().includes(search) ||
      product.category?.toLowerCase().includes(search);

    return matchesCategory && matchesSearch;
  });

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="storefront">
      <div className="announcement-bar">
        <p>Original accessories • Nairobi delivery • Countrywide shipping</p>
      </div>

      <header className="site-header">
        <a href="/" className="brand-logo" aria-label="VoltBridge home">
          <span className="brand-symbol">VB</span>
          <span className="brand-text">
            <strong>VoltBridge</strong>
            <small>TECHNOLOGIES</small>
          </span>
        </a>

        <button
          type="button"
          className="mobile-menu-toggle"
          onClick={() => setMobileMenuOpen((open) => !open)}
          aria-label="Toggle navigation"
        >
          ☰
        </button>

        <nav className={mobileMenuOpen ? 'main-nav open' : 'main-nav'}>
          <a href="#home" onClick={() => setMobileMenuOpen(false)}>Home</a>
          <a href="#products" onClick={() => setMobileMenuOpen(false)}>Products</a>
          <a href="#about" onClick={() => setMobileMenuOpen(false)}>About Us</a>
          <a href="#contact" onClick={() => setMobileMenuOpen(false)}>Contact</a>
        </nav>

        <button type="button" className="header-cart-button" onClick={() => setCartOpen(true)}>
          Cart <span>{cartCount}</span>
        </button>
      </header>

      <main>
        <section className="hero-section" id="home">
          <div className="hero-content">
            <span className="hero-eyebrow">YOUR TECH. YOUR CONNECTION.</span>
            <h1>Power Your World with <span>VoltBridge</span></h1>
            <p>
              Discover quality phone accessories, Samsung chargers, Apple
              accessories and gaming devices at VoltBridge Technologies.
            </p>
            <div className="hero-actions">
              <a href="#products" className="primary-button">Shop Products</a>
              <a
                href={whatsappLink(`Hello ${STORE_NAME}, I would like to make an enquiry.`)}
                target="_blank"
                rel="noreferrer"
                className="secondary-button"
              >
                Chat with Us
              </a>
            </div>
            <div className="hero-benefits">
              <span>✓ Quality accessories</span>
              <span>✓ Retail and wholesale</span>
              <span>✓ Nairobi delivery</span>
            </div>
          </div>

          <div className="hero-visual" aria-label="VoltBridge technology">
            <div className="hero-circle">
              <div className="hero-device">
                <span>VB</span>
                <strong>VOLTBRIDGE</strong>
                <small>TECHNOLOGIES</small>
              </div>
              <div className="floating-label label-one">POWER</div>
              <div className="floating-label label-two">CONNECT</div>
              <div className="floating-label label-three">PLAY</div>
            </div>
          </div>
        </section>

        <section className="benefits-strip">
          <div><span className="benefit-icon">✓</span><div><strong>Quality Products</strong><p>Accessories for everyday use</p></div></div>
          <div><span className="benefit-icon">↗</span><div><strong>Countrywide Shipping</strong><p>Contact us for delivery options</p></div></div>
          <div><span className="benefit-icon">▣</span><div><strong>WhatsApp Orders</strong><p>Easy ordering and enquiries</p></div></div>
          <div><span className="benefit-icon">◇</span><div><strong>Retail & Wholesale</strong><p>Ask us about bulk orders</p></div></div>
        </section>

        <section className="products-section" id="products">
          <div className="section-heading">
            <span className="section-eyebrow">OUR COLLECTION</span>
            <h2>Explore Our Products</h2>
            <p>Find accessories that keep your devices connected and ready.</p>
          </div>

          <div className="product-toolbar">
            <div className="category-filters">
              {CATEGORIES.map((category) => (
                <button
                  type="button"
                  key={category}
                  className={selectedCategory === category ? 'category-active' : ''}
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </button>
              ))}
            </div>

            <input
              type="search"
              className="product-search"
              placeholder="Search products..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              aria-label="Search products"
            />
          </div>

          {loading ? (
            <div className="products-message"><div className="loading-spinner" /><p>Loading products...</p></div>
          ) : fetchError ? (
            <div className="products-message error-message">
              <p>{fetchError}</p>
              <button type="button" onClick={() => window.location.reload()}>Try Again</button>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="products-message">
              <h3>No products found</h3>
              <p>Try another search or category, or contact us for assistance.</p>
              <a
                href={whatsappLink(`Hello ${STORE_NAME}, I would like to enquire about your available products.`)}
                target="_blank"
                rel="noreferrer"
                className="primary-button"
              >
                Ask on WhatsApp
              </a>
            </div>
          ) : (
            <div className="products-grid">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onViewDetails={setSelectedProduct}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </section>

        <section className="wholesale-banner">
          <div>
            <span className="section-eyebrow">BUSINESS CUSTOMERS</span>
            <h2>Buying in Bulk?</h2>
            <p>
              Contact VoltBridge Technologies to enquire about wholesale
              orders, product availability and bulk pricing.
            </p>
          </div>
          <a
            href={whatsappLink(`Hello ${STORE_NAME}, I am interested in wholesale prices and bulk orders.`)}
            target="_blank"
            rel="noreferrer"
            className="wholesale-button"
          >
            Enquire About Wholesale
          </a>
        </section>

        <section className="about-section" id="about">
          <div className="about-content">
            <span className="section-eyebrow">ABOUT VOLTBRIDGE</span>
            <h2>Your Connection to Quality Technology</h2>
            <p>
              VoltBridge Technologies provides phone accessories, charging
              solutions and technology products for customers in Nairobi and
              across Kenya.
            </p>
            <p>
              Whether you are shopping for yourself or sourcing products for
              your business, contact our team for product information,
              availability and ordering assistance.
            </p>
            <a
              href={whatsappLink(`Hello ${STORE_NAME}, I would like to know more about your products.`)}
              target="_blank"
              rel="noreferrer"
              className="primary-button"
            >
              Contact Our Team
            </a>
          </div>
        </section>

        <section className="contact-section" id="contact">
          <div className="section-heading">
            <span className="section-eyebrow">GET IN TOUCH</span>
            <h2>We're Here to Help</h2>
            <p>Contact us about products, orders, delivery or wholesale.</p>
          </div>

          <div className="contact-grid">
            <div className="contact-card">
              <span className="contact-icon">☎</span>
              <h3>Call or WhatsApp</h3>
              <p>0794 546 686</p>
              <a href="tel:+254794546686">Call Us</a>
              <a href={whatsappLink(`Hello ${STORE_NAME}, I need assistance.`)} target="_blank" rel="noreferrer">WhatsApp Us</a>
            </div>

            <div className="contact-card">
              <span className="contact-icon">⌖</span>
              <h3>Visit Us</h3>
              <p>{STORE_ADDRESS}</p>
              <a href="https://www.google.com/maps/search/?api=1&query=Bihi+Tower+Nairobi+Kenya" target="_blank" rel="noreferrer">
                Find Our Location
              </a>
            </div>

            <div className="contact-card">
              <span className="contact-icon">◷</span>
              <h3>Ordering</h3>
              <p>Contact us to confirm availability and delivery options.</p>
              <a href={whatsappLink(`Hello ${STORE_NAME}, I would like to place an order.`)} target="_blank" rel="noreferrer">
                Start an Order
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="#home" className="brand-logo">
              <span className="brand-symbol">VB</span>
              <span className="brand-text"><strong>VoltBridge</strong><small>TECHNOLOGIES</small></span>
            </a>
            <p>Your connection to quality phone accessories and technology products in Kenya.</p>
            <SocialLinks />
          </div>

          <div className="footer-column">
            <h3>Quick Links</h3>
            <a href="#home">Home</a>
            <a href="#products">Products</a>
            <a href="#about">About Us</a>
            <a href="#contact">Contact</a>
          </div>

          <div className="footer-column">
            <h3>Customer Support</h3>
            <a href={whatsappLink(`Hello ${STORE_NAME}, I need help with an order.`)} target="_blank" rel="noreferrer">Orders & Enquiries</a>
            <a href={whatsappLink(`Hello ${STORE_NAME}, I would like to ask about wholesale orders.`)} target="_blank" rel="noreferrer">Wholesale</a>
            <a href="#contact">Delivery Information</a>
          </div>

          <div className="footer-column">
            <h3>Our Location</h3>
            <p>{STORE_ADDRESS}</p>
            <p>Kenya</p>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© {new Date().getFullYear()} {STORE_NAME}. All rights reserved.</p>
          <p>Quality. Connection. Technology.</p>
        </div>
      </footer>

      <ProductDetails
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
      />

      <ShoppingCart
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        cart={cart}
        onIncrease={increaseQuantity}
        onDecrease={decreaseQuantity}
        onRemove={removeFromCart}
      />

      <a
        className="floating-whatsapp"
        href={whatsappLink(`Hello ${STORE_NAME}, I would like to make an enquiry.`)}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with VoltBridge on WhatsApp"
      >
        WhatsApp
      </a>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Storefront />} />
      <Route path="/admin" element={<Admin />} />
      <Route path="/admin/dashboard" element={<Navigate to="/admin" replace />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;