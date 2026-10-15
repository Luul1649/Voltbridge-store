
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

const SOCIAL_LINKS = [
  {
    name: 'Instagram',
    url: 'https://www.instagram.com/voltbridgetechnologies/',
    icon: faInstagram,
    className: 'instagram',
  },
  {
    name: 'TikTok',
    url: 'https://www.tiktok.com/@voltbridgetechnologies',
    icon: faTiktok,
    className: 'tiktok',
  },
  {
    name: 'Facebook',
    url: 'https://www.facebook.com/voltbridgetechnologies/',
    icon: faFacebookF,
    className: 'facebook',
  },
];

const CATEGORIES = [
  'Gaming Devices',
  'Samsung Chargers',
  'Apple Accessories',
];

function formatPrice(value) {
  return new Intl.NumberFormat('en-KE', {
    style: 'currency',
    currency: 'KES',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function getPrice(product) {
  const regularPrice = Number(product.price) || 0;
  const salePrice = Number(product.sale_price) || 0;

  return salePrice > 0 && salePrice < regularPrice
    ? salePrice
    : regularPrice;
}

function hasDiscount(product) {
  const regularPrice = Number(product.price) || 0;
  const salePrice = Number(product.sale_price) || 0;

  return salePrice > 0 && salePrice < regularPrice;
}

function whatsappLink(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
}

function SocialLinks() {
  return (
    <div className="social-links">
      {SOCIAL_LINKS.map((social) => (
        <a
          key={social.name}
          href={social.url}
          className={`social-link ${social.className}`}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`Visit ${STORE_NAME} on ${social.name}`}
          title={social.name}
        >
          <FontAwesomeIcon icon={social.icon} />
        </a>
      ))}
    </div>
  );
}

function ProductCard({ product, onView, onAddToCart }) {
  const discounted = hasDiscount(product);
  const inStock = Number(product.stock_quantity) > 0;

  return (
    <article className="product-card">
      <button
        type="button"
        className="product-image-button"
        onClick={() => onView(product)}
        aria-label={`View ${product.name}`}
      >
        {product.image_url ? (
          <img
            className="product-image"
            src={product.image_url}
            alt={product.name}
            loading="lazy"
          />
        ) : (
          <div className="image-placeholder">
            <span>No image available</span>
          </div>
        )}

        {discounted && <span className="sale-badge">SALE</span>}
      </button>

      <div className="product-card-content">
        <p className="product-category">{product.category}</p>

        <button
          type="button"
          className="product-title-button"
          onClick={() => onView(product)}
        >
          {product.name}
        </button>

        <div className="product-prices">
          <span className="product-price">
            {formatPrice(getPrice(product))}
          </span>

          {discounted && (
            <span className="old-price">
              {formatPrice(product.price)}
            </span>
          )}
        </div>

        <p className={`stock-status ${inStock ? 'in-stock' : 'out-of-stock'}`}>
          <span className="stock-dot" />
          {inStock ? 'In Stock' : 'Out of Stock'}
        </p>

        <button
          type="button"
          className="button button-primary add-to-cart-button"
          disabled={!inStock}
          onClick={() => onAddToCart(product)}
        >
          {inStock ? 'Add to Cart' : 'Out of Stock'}
        </button>
      </div>
    </article>
  );
}

function ProductDetails({ product, onClose, onAddToCart }) {
  if (!product) return null;

  const discounted = hasDiscount(product);
  const inStock = Number(product.stock_quantity) > 0;

  function handleAdd() {
    if (!inStock) return;

    onAddToCart(product);
    onClose();
  }

  return (
    <div
      className="modal-overlay"
      onClick={onClose}
      role="presentation"
    >
      <section
        className="product-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-product-title"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          className="modal-close"
          onClick={onClose}
          aria-label="Close product details"
        >
          ×
        </button>

        <div className="modal-image-wrap">
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name}
              className="modal-product-image"
            />
          ) : (
            <div className="image-placeholder">
              No image available
            </div>
          )}
        </div>

        <div className="modal-product-info">
          <p className="product-category">{product.category}</p>
          <h2 id="modal-product-title">{product.name}</h2>

          <div className="product-prices">
            <span className="product-price">
              {formatPrice(getPrice(product))}
            </span>

            {discounted && (
              <span className="old-price">
                {formatPrice(product.price)}
              </span>
            )}
          </div>

          <p className={`stock-status ${inStock ? 'in-stock' : 'out-of-stock'}`}>
            <span className="stock-dot" />
            {inStock ? 'In Stock' : 'Out of Stock'}
          </p>

          <p className="modal-description">
            {product.description ||
              'Contact us on WhatsApp for more information about this product.'}
          </p>

          <button
            type="button"
            className="button button-primary"
            disabled={!inStock}
            onClick={handleAdd}
          >
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>

          <a
            className="button button-outline modal-whatsapp"
            href={whatsappLink(`Hello ${STORE_NAME}, I would like to enquire about ${product.name}.`)}
            target="_blank"
            rel="noopener noreferrer"
          >
            Ask About This Product
          </a>
        </div>
      </section>
    </div>
  );
}

function ShoppingCart({ cart, products, onUpdateQuantity, onRemove, onClear }) {
  const subtotal = cart.reduce(
    (total, item) => total + getPrice(item) * item.quantity,
    0
  );

  function checkoutOnWhatsApp() {
    if (cart.length === 0) return;

    const productLines = cart.map((item) => {
      const lineTotal = getPrice(item) * item.quantity;

      return [
        `• ${item.name}`,
        `  Quantity: ${item.quantity}`,
        `  Unit price: ${formatPrice(getPrice(item))}`,
        `  Line total: ${formatPrice(lineTotal)}`,
      ].join('\n');
    });

    const message = [
      `Hello ${STORE_NAME}, I would like to place an order:`,
      '',
      ...productLines,
      '',
      `Subtotal: ${formatPrice(subtotal)}`,
      '',
      'Please confirm availability, delivery charges, and payment options.',
    ].join('\n');

    window.open(whatsappLink(message), '_blank', 'noopener,noreferrer');
  }

  return (
    <section id="cart" className="cart-section section">
      <div className="section-heading">
        <p className="eyebrow">YOUR SELECTION</p>
        <h2>Shopping Cart</h2>
        <p>Review your items before ordering through WhatsApp.</p>
      </div>

      {cart.length === 0 ? (
        <div className="empty-cart">
          <div className="empty-cart-icon">🛒</div>
          <h3>Your cart is waiting</h3>
          <p>Add a few products to get started.</p>
          <a className="button button-primary" href="#shop">
            Browse Products
          </a>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cart.map((item) => {
              const currentProduct = products.find(
                (product) => product.id === item.id
              );

              const availableStock = Number(
                currentProduct?.stock_quantity ?? item.stock_quantity
              );

              return (
                <article className="cart-item" key={item.id}>
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="cart-item-image"
                    />
                  ) : (
                    <div className="cart-item-image image-placeholder">
                      No image
                    </div>
                  )}

                  <div className="cart-item-info">
                    <p className="product-category">{item.category}</p>
                    <h3>{item.name}</h3>

                    <p className="cart-unit-price">
                      {formatPrice(getPrice(item))} each
                    </p>

                    <div className="cart-item-bottom">
                      <div className="quantity-controls">
                        <button
                          type="button"
                          aria-label={`Decrease quantity of ${item.name}`}
                          disabled={item.quantity <= 1}
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity - 1)
                          }
                        >
                          −
                        </button>

                        <span>{item.quantity}</span>

                        <button
                          type="button"
                          aria-label={`Increase quantity of ${item.name}`}
                          disabled={item.quantity >= availableStock}
                          onClick={() =>
                            onUpdateQuantity(item.id, item.quantity + 1)
                          }
                        >
                          +
                        </button>
                      </div>

                      <button
                        type="button"
                        className="remove-item-button"
                        onClick={() => onRemove(item.id)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>

                  <strong className="cart-line-total">
                    {formatPrice(getPrice(item) * item.quantity)}
                  </strong>
                </article>
              );
            })}
          </div>

          <aside className="cart-summary">
            <h3>Order Summary</h3>

            <div className="summary-row">
              <span>Items</span>
              <span>
                {cart.reduce((total, item) => total + item.quantity, 0)}
              </span>
            </div>

            <div className="summary-row summary-total">
              <span>Subtotal</span>
              <strong>{formatPrice(subtotal)}</strong>
            </div>

            <p className="delivery-note">
              Delivery charges and final availability will be confirmed
              on WhatsApp.
            </p>

            <button
              type="button"
              className="button button-whatsapp checkout-button"
              onClick={checkoutOnWhatsApp}
            >
              Order on WhatsApp
            </button>

            <button
              type="button"
              className="clear-cart-button"
              onClick={onClear}
            >
              Clear Cart
            </button>
          </aside>
        </div>
      )}
    </section>
  );
}

function App() {
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      setLoading(true);
      setError('');

      const { data, error: fetchError } = await supabase
        .from('products')
        .select(
          'id, name, description, category, price, sale_price, stock_quantity, image_url, created_at'
        )
        .eq('is_active', true)
        .gt('price', 0)
        .order('created_at', { ascending: false });

      if (!isMounted) return;

      if (fetchError) {
        console.error('Error loading products:', fetchError);
        setError('We could not load products. Please try again.');
        setProducts([]);
      } else {
        setProducts(data || []);
      }

      setLoading(false);
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, []);

  function addToCart(product) {
    const stock = Number(product.stock_quantity) || 0;

    if (stock <= 0) {
      window.alert('Sorry, this product is currently out of stock.');
      return;
    }

    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem && existingItem.quantity >= stock) {
      window.alert('You have reached the available stock for this product.');
      return;
    }

    setCart((currentCart) => {
      const itemAlreadyAdded = currentCart.find(
        (item) => item.id === product.id
      );

      if (itemAlreadyAdded) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...currentCart, { ...product, quantity: 1 }];
    });
  }

  function updateQuantity(productId, newQuantity) {
    if (newQuantity < 1) return;

    const product = products.find((item) => item.id === productId);
    if (!product) return;

    const stock = Number(product.stock_quantity) || 0;

    if (newQuantity > stock) {
      window.alert('You have reached the available stock for this product.');
      return;
    }

    setCart((currentCart) =>
      currentCart.map((item) =>
        item.id === productId
          ? { ...item, ...product, quantity: newQuantity }
          : item
      )
    );
  }

  function removeFromCart(productId) {
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  }

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const visibleProducts =
    activeCategory === 'All'
      ? products
      : products.filter(
          (product) => product.category === activeCategory
        );

  return (
    <div className="app">
      <div className="announcement-bar">
        Quality accessories for your everyday connections
      </div>

      <header className="site-header">
        <div className="header-inner">
          <a href="#home" className="brand-logo" aria-label={STORE_NAME}>
            <span className="brand-symbol">V</span>
            <span className="brand-text">
              <strong>VoltBridge</strong>
              <small>TECHNOLOGIES</small>
            </span>
          </a>

          <nav className="main-navigation" aria-label="Main navigation">
            <a href="#home">Home</a>
            <a href="#categories">Categories</a>
            <a href="#shop">Shop</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>

          <div className="header-actions">
            <a href="#cart" className="header-cart">
              <span aria-hidden="true">🛒</span>
              Cart <span className="cart-count">{cartCount}</span>
            </a>

            <a
              className="button button-whatsapp header-whatsapp"
              href={whatsappLink(`Hello ${STORE_NAME}!`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
      </header>

      <main>
        <section id="home" className="hero-section">
          <div className="hero-background-shape shape-one" />
          <div className="hero-background-shape shape-two" />

          <div className="hero-inner">
            <div className="hero-content">
              <p className="eyebrow hero-eyebrow">
                POWERING YOUR DIGITAL LIFESTYLE
              </p>

              <h1>
                The right connection.
                <br />
                <span>The right technology.</span>
              </h1>

              <p className="hero-description">
                Shop quality Apple and Samsung chargers, cables, gaming
                devices, and technology accessories at VoltBridge Technologies.
              </p>

              <div className="hero-actions">
                <a href="#shop" className="button button-primary">
                  Explore Products <span aria-hidden="true">→</span>
                </a>

                <a href="#about" className="button button-outline hero-outline">
                  Discover VoltBridge
                </a>
              </div>

              <div className="hero-benefits">
                <div>
                  <span className="benefit-check">✓</span>
                  <span>Retail & wholesale</span>
                </div>
                <div>
                  <span className="benefit-check">✓</span>
                  <span>Nairobi, Kenya</span>
                </div>
                <div>
                  <span className="benefit-check">✓</span>
                  <span>WhatsApp ordering</span>
                </div>
              </div>
            </div>

            <div className="hero-visual" aria-label="Shop technology accessories">
              <div className="hero-orbit orbit-one" />
              <div className="hero-orbit orbit-two" />

              <div className="hero-product-tile tile-charger">
                <span className="hero-tile-icon">ϟ</span>
                <span>Power</span>
              </div>

              <div className="hero-product-tile tile-cable">
                <span className="hero-tile-icon">⌁</span>
                <span>Connect</span>
              </div>

              <div className="hero-product-tile tile-device">
                <span className="hero-tile-icon">▣</span>
                <span>Play</span>
              </div>

              <div className="hero-center-mark">
                <span>V</span>
                <small>VOLTBRIDGE</small>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip" aria-label="Store highlights">
          <div>
            <span className="trust-icon">✦</span>
            <span>Quality Technology Accessories</span>
          </div>
          <div>
            <span className="trust-icon">↗</span>
            <span>Retail & Wholesale Enquiries</span>
          </div>
          <div>
            <span className="trust-icon">⌖</span>
            <span>Nairobi, Kenya</span>
          </div>
        </section>

        <section id="categories" className="section categories-section">
          <div className="section-heading">
            <p className="eyebrow">FIND WHAT YOU NEED</p>
            <h2>Shop by Category</h2>
            <p>Explore our collection of everyday tech essentials.</p>
          </div>

          <div className="category-grid">
            {CATEGORIES.map((category, index) => (
              <button
                type="button"
                key={category}
                className={`category-card category-card-${index + 1}`}
                onClick={() => {
                  setActiveCategory(category);
                  document.getElementById('shop')?.scrollIntoView({
                    behavior: 'smooth',
                  });
                }}
              >
                <span className="category-number">
                  0{index + 1}
                </span>
                <span className="category-card-title">{category}</span>
                <span className="category-card-action">
                  Explore category <span aria-hidden="true">→</span>
                </span>
              </button>
            ))}
          </div>
        </section>

        <section id="shop" className="section shop-section">
          <div className="section-heading shop-heading">
            <p className="eyebrow">THE VOLTBRIDGE COLLECTION</p>
            <h2>Featured Products</h2>
            <p>
              Browse our current range. Sale prices appear when an offer
              is active.
            </p>
          </div>

          <div className="category-filters" aria-label="Filter products">
            {['All', ...CATEGORIES].map((category) => (
              <button
                type="button"
                key={category}
                className={`category-filter ${
                  activeCategory === category ? 'active' : ''
                }`}
                aria-pressed={activeCategory === category}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="products-message">
              <span className="loading-spinner" />
              <p>Loading our products...</p>
            </div>
          ) : error ? (
            <div className="products-message error-message">
              <h3>Products unavailable</h3>
              <p>{error}</p>
              <button
                type="button"
                className="button button-primary"
                onClick={() => window.location.reload()}
              >
                Try Again
              </button>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="products-message">
              <h3>No products found</h3>
              <p>Try another category or check back soon.</p>
              {activeCategory !== 'All' && (
                <button
                  type="button"
                  className="button button-outline"
                  onClick={() => setActiveCategory('All')}
                >
                  View All Products
                </button>
              )}
            </div>
          ) : (
            <div className="product-grid">
              {visibleProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={setSelectedProduct}
                  onAddToCart={addToCart}
                />
              ))}
            </div>
          )}
        </section>

        <ShoppingCart
          cart={cart}
          products={products}
          onUpdateQuantity={updateQuantity}
          onRemove={removeFromCart}
          onClear={() => setCart([])}
        />

        <section id="about" className="section about-section">
          <div className="about-decoration" aria-hidden="true">
            <span>V</span>
          </div>

          <div className="about-content">
            <p className="eyebrow">THE VOLTBRIDGE DIFFERENCE</p>
            <h2>Technology that keeps you connected.</h2>

            <p>
              VoltBridge Technologies supplies chargers, cables, gaming
              devices, and technology accessories for everyday life.
              We serve customers in Nairobi and welcome enquiries from
              across Kenya.
            </p>

            <p>
              Whether you are shopping for yourself or sourcing products
              for your business, contact us to discuss available items,
              wholesale enquiries, and delivery arrangements.
            </p>

            <a href="#contact" className="button button-primary">
              Talk to Our Team <span aria-hidden="true">→</span>
            </a>
          </div>
        </section>

        <section id="contact" className="section contact-section">
          <div className="section-heading">
            <p className="eyebrow">LET'S CONNECT</p>
            <h2>We're Here to Help</h2>
            <p>
              Have a question about a product? Contact us or connect
              with us on social media.
            </p>
          </div>

          <div className="contact-grid">
            <article className="contact-card">
              <span className="contact-card-icon">⌖</span>
              <h3>Visit Us</h3>
              <p>Bihi Tower, 4th Floor, Suite 5</p>
              <p>Nairobi, Kenya</p>
            </article>

            <article className="contact-card">
              <span className="contact-card-icon">↗</span>
              <h3>WhatsApp Us</h3>
              <p>+254 726 147 462</p>
              <a
                href={whatsappLink(`Hello ${STORE_NAME}! I have a question.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-link"
              >
                Start a conversation →
              </a>
            </article>

            <article className="contact-card social-contact-card">
              <span className="contact-card-icon">◎</span>
              <h3>Follow Our Journey</h3>
              <p>Connect with VoltBridge on social media.</p>
              <SocialLinks />
            </article>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-main">
          <div className="footer-brand">
            <a href="#home" className="brand-logo footer-logo">
              <span className="brand-symbol">V</span>
              <span className="brand-text">
                <strong>VoltBridge</strong>
                <small>TECHNOLOGIES</small>
              </span>
            </a>

            <p>
              Your connection to quality technology accessories.
            </p>

            <SocialLinks />
          </div>

          <div className="footer-column">
            <h3>Explore</h3>
            <a href="#home">Home</a>
            <a href="#categories">Categories</a>
            <a href="#shop">Shop Products</a>
            <a href="#about">About Us</a>
          </div>

          <div className="footer-column">
            <h3>Customer Care</h3>
            <a href="#contact">Contact Us</a>
            <a href="#cart">Shopping Cart</a>
            <a
              href={whatsappLink(`Hello ${STORE_NAME}!`)}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp Enquiries
            </a>
          </div>

          <div className="footer-column footer-address">
            <h3>Find Us</h3>
            <p>Bihi Tower, 4th Floor, Suite 5</p>
            <p>Nairobi, Kenya</p>
            <a href="tel:+254726147462">+254 726 147 462</a>
          </div>
        </div>

        <div className="footer-bottom">
          <p>
            © {new Date().getFullYear()} {STORE_NAME}. All rights reserved.
          </p>
          <a href="#home">Back to top ↑</a>
        </div>
      </footer>

      <ProductDetails
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={addToCart}
      />

      <a
        className="floating-whatsapp"
        href={whatsappLink(`Hello ${STORE_NAME}!`)}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Chat with VoltBridge on WhatsApp"
        title="Chat on WhatsApp"
      >
        <span aria-hidden="true">✆</span>
      </a>
    </div>
  );
}

export default App;
