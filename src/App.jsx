
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
  useLocation,
} from "react-router-dom";

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
} from "lucide-react";

import { supabase } from "./supabase";
import { useCart } from "./CartContext";
import Admin from "./Admin";
import "./App.css";

const WHATSAPP_NUMBER = "254726147462";
const SITE_URL = "https://voltbridgetechnologies.com";

const HOME_TITLE =
  "Phone Accessories in Nairobi, Kenya | VoltBridge Technologies";

const HOME_DESCRIPTION =
  "Shop phone accessories in Nairobi, Kenya, at VoltBridge Technologies. Explore chargers, cables, phone cases, power banks, earbuds and more. Retail and wholesale enquiries welcome.";

const HOME_OG_DESCRIPTION =
  "Explore phone chargers, cables, cases, power banks and more at VoltBridge Technologies in Nairobi. Retail and wholesale enquiries welcome.";

const HOME_TWITTER_DESCRIPTION =
  "Shop phone accessories in Nairobi, Kenya. Explore chargers, cables, phone cases, power banks and more.";

const CATEGORIES = [
  "All",
  "Phone Cases",
  "Chargers & Cables",
  "Power Banks",
  "Earbuds & Headphones",
  "Screen Protectors",
  "Phone Holders",
  "Other Accessories",
];

function money(value) {
  return `KSh ${Number(value || 0).toLocaleString("en-KE", {
    maximumFractionDigits: 2,
  })}`;
}

function getProductPrice(product) {
  const regularPrice = Number(product?.price ?? 0);
  const salePrice = Number(
    product?.sale_price ?? product?.discount_price
  );

  if (
    Number.isFinite(salePrice) &&
    salePrice > 0 &&
    salePrice < regularPrice
  ) {
    return salePrice;
  }

  return regularPrice;
}

function getRegularPrice(product) {
  return Number(product?.price ?? 0);
}

function isProductOnSale(product) {
  return getProductPrice(product) < getRegularPrice(product);
}

function getProductStock(product) {
  const value = product?.stock_quantity ?? product?.stock;

  if (value === null || value === undefined || value === "") {
    return null;
  }

  const stock = Number(value);
  return Number.isFinite(stock) ? stock : null;
}

function getProductAvailability(product) {
  const stock = getProductStock(product);

  if (
    product?.is_active === false ||
    (stock !== null && stock <= 0)
  ) {
    return "Out of stock";
  }

  return "Available";
}

function isAvailable(product) {
  return (
    product?.is_active !== false &&
    getProductAvailability(product) === "Available"
  );
}

function getProductImage(product) {
  return (
    product?.image_url ||
    product?.image ||
    "/placeholder-product.png"
  );
}

function getAbsoluteImageUrl(product) {
  const image = getProductImage(product);

  if (!image || image === "/placeholder-product.png") {
    return null;
  }

  try {
    return new URL(image, `${SITE_URL}/`).href;
  } catch {
    return null;
  }
}

function makeWhatsAppUrl(message) {
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    message
  )}`;
}

/**
 * Update or create a meta tag.
 */
function setMeta(attribute, key, content) {
  let element = document.head.querySelector(
    `meta[${attribute}="${key}"]`
  );

  if (!element) {
    element = document.createElement("meta");
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }

  element.setAttribute("content", content);
}

/**
 * Update the canonical URL.
 */
function setCanonical(url) {
  let canonical = document.head.querySelector(
    'link[rel="canonical"]'
  );

  if (!canonical) {
    canonical = document.createElement("link");
    canonical.setAttribute("rel", "canonical");
    document.head.appendChild(canonical);
  }

  canonical.setAttribute("href", url);
}

/**
 * Restore the default site metadata.
 */
function restoreHomeMetadata() {
  document.title = HOME_TITLE;

  setMeta("name", "description", HOME_DESCRIPTION);
  setMeta("name", "robots", "index, follow");

  setMeta("property", "og:type", "website");
  setMeta("property", "og:site_name", "VoltBridge Technologies");
  setMeta("property", "og:title", HOME_TITLE);
  setMeta("property", "og:description", HOME_OG_DESCRIPTION);
  setMeta("property", "og:url", `${SITE_URL}/`);

  setMeta("name", "twitter:card", "summary");
  setMeta("name", "twitter:title", HOME_TITLE);
  setMeta(
    "name",
    "twitter:description",
    HOME_TWITTER_DESCRIPTION
  );

  setCanonical(`${SITE_URL}/`);
}

/**
 * Update the SEO metadata for an individual product.
 */
function updateProductMetadata(product) {
  const productUrl = `${SITE_URL}/product/${product.id}`;
  const productName = String(
    product.name || "Phone Accessory"
  ).trim();

  const title =
    `${productName} in Nairobi, Kenya | VoltBridge Technologies`;

  const descriptionSource =
    product.description ||
    `Shop ${productName} at VoltBridge Technologies in Nairobi, Kenya. Contact us for product availability and orders.`;

  const description = String(descriptionSource)
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 155);

  const imageUrl = getAbsoluteImageUrl(product);

  document.title = title;

  setMeta("name", "description", description);
  setMeta("name", "robots", "index, follow");

  setMeta("property", "og:type", "product");
  setMeta("property", "og:site_name", "VoltBridge Technologies");
  setMeta("property", "og:title", title);
  setMeta("property", "og:description", description);
  setMeta("property", "og:url", productUrl);

  if (imageUrl) {
    setMeta("property", "og:image", imageUrl);
    setMeta("name", "twitter:image", imageUrl);
  }

  setMeta("name", "twitter:card", "summary_large_image");
  setMeta("name", "twitter:title", title);
  setMeta("name", "twitter:description", description);

  setCanonical(productUrl);
}

/**
 * Create or update Product JSON-LD structured data.
 *
 * The schema uses the actual product data loaded from Supabase.
 * Price reflects the active sale price when one exists.
 * Availability uses the same logic as the storefront.
 */
function updateProductStructuredData(product) {
  if (!product?.id || !product?.name) {
    removeProductStructuredData();
    return;
  }

  const productUrl = `${SITE_URL}/product/${product.id}`;
  const imageUrl = getAbsoluteImageUrl(product);
  const price = getProductPrice(product);
  const available = isAvailable(product);

  const description = String(
    product.description ||
      `Shop ${product.name} at VoltBridge Technologies in Nairobi, Kenya.`
  )
    .replace(/\s+/g, " ")
    .trim();

  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${productUrl}#product`,
    name: String(product.name).trim(),
    description,
    url: productUrl,
    brand: {
      "@type": "Brand",
      name: "VoltBridge Technologies",
    },
    ...(product.category
      ? { category: String(product.category) }
      : {}),
    ...(imageUrl ? { image: [imageUrl] } : {}),
    offers: {
      "@type": "Offer",
      url: productUrl,
      priceCurrency: "KES",
      ...(Number.isFinite(price) && price >= 0
        ? { price: price.toFixed(2) }
        : {}),
      availability: available
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition: "https://schema.org/NewCondition",
      seller: {
        "@type": "Organization",
        name: "VoltBridge Technologies",
        url: SITE_URL,
      },
    },
  };

  let script = document.getElementById("product-jsonld");

  if (!script) {
    script = document.createElement("script");
    script.id = "product-jsonld";
    script.type = "application/ld+json";
    document.head.appendChild(script);
  }

  script.textContent = JSON.stringify(structuredData);
}

/**
 * Remove product JSON-LD when leaving the product page.
 */
function removeProductStructuredData() {
  document.getElementById("product-jsonld")?.remove();
}

function Availability({ product }) {
  const available = isAvailable(product);

  return (
    <span
      className={`availability ${
        available ? "available" : "unavailable"
      }`}
      aria-label={`Product availability: ${
        available ? "Available" : "Out of stock"
      }`}
    >
      {available ? "Available" : "Out of stock"}
    </span>
  );
}

function Header() {
  const { cartItems } = useCart();
  const [menuOpen, setMenuOpen] = useState(false);

  const cartCount = cartItems.reduce(
    (total, item) => total + Number(item.quantity || 0),
    0
  );

  return (
    <header className="site-header">
      <div className="container header-inner">
        <Link
          to="/"
          className="brand"
          onClick={() => setMenuOpen(false)}
        >
          <span className="brand-icon">
            <Package size={25} />
          </span>
          <span className="brand-text">
            <strong>VoltBridge</strong>
            <small>TECHNOLOGIES</small>
          </span>
        </Link>

        <button
          type="button"
          className="mobile-menu-button"
          onClick={() => setMenuOpen((open) => !open)}
          aria-label={menuOpen ? "Close menu" : "Open menu"}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>

        <nav className={`main-nav ${menuOpen ? "open" : ""}`}>
          <Link to="/" onClick={() => setMenuOpen(false)}>
            Home
          </Link>

          <a href="/#products" onClick={() => setMenuOpen(false)}>
            Shop
          </a>

          <a href="/#about" onClick={() => setMenuOpen(false)}>
            About
          </a>

          <a href="/#contact" onClick={() => setMenuOpen(false)}>
            Contact
          </a>

          <Link
            to="/cart"
            className="header-cart"
            onClick={() => setMenuOpen(false)}
          >
            <ShoppingCart size={19} />
            Cart
            {cartCount > 0 && (
              <span className="cart-count">{cartCount}</span>
            )}
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Footer() {
  return (
    <footer className="site-footer" id="contact">
      <div className="container footer-content">
        <div>
          <Link to="/" className="brand footer-brand">
            <span className="brand-icon">
              <Package size={24} />
            </span>
            <span className="brand-text">
              <strong>VoltBridge</strong>
              <small>TECHNOLOGIES</small>
            </span>
          </Link>

          <p>
            Your destination for phone accessories and everyday
            technology essentials.
          </p>
        </div>

        <div>
          <h3>Customer support</h3>
          <p>Bihi Tower, 4th Floor, Suite 5, Nairobi</p>

          <a
            href={makeWhatsAppUrl(
              "Hello VoltBridge Technologies. I need assistance."
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={17} />
            Chat with us on WhatsApp
          </a>
        </div>

        <div>
          <h3>Shopping with us</h3>
          <p>Retail and wholesale enquiries welcome.</p>
          <p>Nairobi delivery and countrywide shipping.</p>
        </div>
      </div>

      <div className="footer-bottom">
        <div className="container">
          © {new Date().getFullYear()} VoltBridge Technologies.
          All rights reserved.
        </div>
      </div>
    </footer>
  );
}

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const available = isAvailable(product);
  const onSale = isProductOnSale(product);

  return (
    <article className="product-card">
      <Link
        to={`/product/${product.id}`}
        className="product-image-link"
      >
        <div className="product-image">
          <img
            src={getProductImage(product)}
            alt={product.name}
            loading="lazy"
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />

          {onSale && <span className="sale-badge">SALE</span>}
        </div>
      </Link>

      <div className="product-card-content">
        <span className="product-category">
          {product.category || "Accessories"}
        </span>

        <h3>
          <Link to={`/product/${product.id}`}>
            {product.name}
          </Link>
        </h3>

        <div className="product-price">
          <strong>{money(getProductPrice(product))}</strong>
          {onSale && <del>{money(getRegularPrice(product))}</del>}
        </div>

        <Availability product={product} />

        <button
          type="button"
          className="button button-primary add-to-cart-button"
          disabled={!available}
          onClick={() => addToCart(product)}
        >
          <ShoppingCart size={17} />
          {available ? "Add to cart" : "Out of stock"}
        </button>
      </div>
    </article>
  );
}

function HomePage() {
  const navigate = useNavigate();
  const location = useLocation();

  const orderPlaced = location.state?.orderPlaced;
  const orderNumber = location.state?.orderNumber;

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");

  useEffect(() => {
    removeProductStructuredData();
    restoreHomeMetadata();
  }, []);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      if (!supabase) {
        throw new Error(
          "The store is not connected to Supabase. Check your environment variables."
        );
      }

      const { data, error: queryError } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (queryError) throw queryError;

      setProducts(data || []);
    } catch (err) {
      setError(
        err?.message || "Could not load products. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filteredProducts = useMemo(() => {
    const term = search.trim().toLowerCase();

    return products.filter((product) => {
      const matchesSearch =
        !term ||
        `${product.name || ""} ${product.category || ""} ${
          product.description || ""
        }`
          .toLowerCase()
          .includes(term);

      const matchesCategory =
        category === "All" || product.category === category;

      return matchesSearch && matchesCategory;
    });
  }, [products, search, category]);

  const saleProducts = products.filter(isProductOnSale);

  return (
    <>
      {orderPlaced && (
        <section className="container page-state" role="status">
          <ShieldCheck size={35} />
          <h2>Order submitted successfully!</h2>

          {orderNumber && (
            <p>Your order reference is: {orderNumber}</p>
          )}

          <p>
            Your order is pending confirmation. Payment has not been
            verified by this website. Please follow the instructions
            provided by VoltBridge Technologies.
          </p>

          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              navigate("/", { replace: true, state: null });
            }}
          >
            Continue shopping
          </button>
        </section>
      )}

      <section className="hero">
        <div className="container hero-content">
          <div className="hero-copy">
            <span className="eyebrow">
              WELCOME TO VOLTBRIDGE TECHNOLOGIES
            </span>

            <h1>
              Power your world with
              <span> the right accessories.</span>
            </h1>

            <p>
              Shop phone accessories for everyday charging,
              protection, entertainment and convenience.
            </p>

            <div className="hero-actions">
              <a href="#products" className="button button-primary">
                Shop products <ArrowRight size={18} />
              </a>

              <a
                href={makeWhatsAppUrl(
                  "Hello VoltBridge Technologies. I would like to enquire about your products."
                )}
                target="_blank"
                rel="noreferrer"
                className="button button-secondary"
              >
                <MessageCircle size={18} />
                WhatsApp us
              </a>
            </div>

            <div className="hero-trust">
              <span>
                <ShieldCheck size={18} /> Trusted shopping
              </span>
              <span>
                <Truck size={18} /> Delivery available
              </span>
            </div>
          </div>
        </div>
      </section>

      <section className="benefits-section" id="about">
        <div className="container benefits-grid">
          <article>
            <ShieldCheck size={26} />
            <div>
              <h3>Quality accessories</h3>
              <p>Products selected for everyday use.</p>
            </div>
          </article>

          <article>
            <Truck size={26} />
            <div>
              <h3>Delivery available</h3>
              <p>Nairobi delivery and countrywide shipping.</p>
            </div>
          </article>

          <article>
            <MessageCircle size={26} />
            <div>
              <h3>Easy enquiries</h3>
              <p>Contact us directly through WhatsApp.</p>
            </div>
          </article>

          <article>
            <RefreshCw size={26} />
            <div>
              <h3>Availability updates</h3>
              <p>
                Check whether a product is available before ordering.
              </p>
            </div>
          </article>
        </div>
      </section>

      {saleProducts.length > 0 && (
        <section className="container sale-section">
          <div className="section-heading">
            <div>
              <span className="eyebrow">SPECIAL OFFERS</span>
              <h2>Products on sale</h2>
            </div>
          </div>

          <div className="product-grid">
            {saleProducts.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}

      <section className="container products-section" id="products">
        <div className="section-heading">
          <div>
            <span className="eyebrow">EXPLORE OUR STORE</span>
            <h2>Shop our products</h2>
            <p>
              Find accessories for your everyday technology needs.
            </p>
          </div>
        </div>

        <div className="product-toolbar">
          <label className="product-search">
            <Search size={19} />
            <input
              type="search"
              placeholder="Search products..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>

          <label className="category-filter">
            <span>Category</span>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
            >
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
          </label>
        </div>

        {loading ? (
          <div className="page-state">
            <RefreshCw className="spin" size={28} />
            <p>Loading products...</p>
          </div>
        ) : error ? (
          <div className="page-state error-state">
            <p>{error}</p>
            <button
              type="button"
              className="button button-primary"
              onClick={loadProducts}
            >
              Try again
            </button>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="page-state">
            <Package size={32} />
            <h3>No products found</h3>
            <p>Try a different search or category.</p>
          </div>
        ) : (
          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>
    </>
  );
}

function ProductDetailPage() {
  const { productId } = useParams();
  const { addToCart } = useCart();

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadProduct() {
      setLoading(true);
      setError("");
      setProduct(null);

      try {
        if (!supabase) {
          throw new Error("Supabase is not configured.");
        }

        const { data, error: queryError } = await supabase
          .from("products")
          .select("*")
          .eq("id", productId)
          .maybeSingle();

        if (queryError) throw queryError;

        if (!data || data.is_active === false) {
          throw new Error("This product is not currently available.");
        }

        if (!cancelled) {
          setProduct(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err?.message || "Could not load this product.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadProduct();

    return () => {
      cancelled = true;
    };
  }, [productId]);

  // Update product metadata and structured data after loading.
  useEffect(() => {
    if (!product) return undefined;

    updateProductMetadata(product);
    updateProductStructuredData(product);

    return () => {
      removeProductStructuredData();
      restoreHomeMetadata();
    };
  }, [product]);

  if (loading) {
    return (
      <div className="container page-state">
        <RefreshCw className="spin" size={28} />
        <p>Loading product...</p>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="container page-state">
        <h2>Product unavailable</h2>
        <p>{error || "This product could not be found."}</p>
        <Link to="/" className="button button-primary">
          Return to shop
        </Link>
      </div>
    );
  }

  const available = isAvailable(product);
  const onSale = isProductOnSale(product);

  return (
    <section className="container product-detail-section">
      <div className="breadcrumbs">
        <Link to="/">Home</Link>
        <ChevronRight size={15} />
        <span>{product.name}</span>
      </div>

      <div className="product-detail">
        <div className="product-detail-image">
          <img
            src={getProductImage(product)}
            alt={product.name}
            onError={(event) => {
              event.currentTarget.style.display = "none";
            }}
          />
          {onSale && <span className="sale-badge">SALE</span>}
        </div>

        <div className="product-detail-info">
          <span className="product-category">
            {product.category || "Accessories"}
          </span>

          <h1>{product.name}</h1>

          <div className="product-price detail-price">
            <strong>{money(getProductPrice(product))}</strong>
            {onSale && <del>{money(getRegularPrice(product))}</del>}
          </div>

          <Availability product={product} />

          <p className="product-description">
            {product.description ||
              "Contact us for more information about this product."}
          </p>

          <button
            type="button"
            className="button button-primary"
            disabled={!available}
            onClick={() => addToCart(product)}
          >
            <ShoppingCart size={18} />
            {available ? "Add to cart" : "Out of stock"}
          </button>

          <a
            className="button button-secondary"
            href={makeWhatsAppUrl(
              `Hello VoltBridge Technologies. I would like to enquire about ${product.name}.`
            )}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={18} />
            Ask on WhatsApp
          </a>
        </div>
      </div>
    </section>
  );
}

function CartPage() {
  const {
    cartItems,
    increaseQuantity,
    decreaseQuantity,
    removeFromCart,
    cartTotal,
  } = useCart();

  const navigate = useNavigate();

  return (
    <section className="container cart-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">YOUR SHOPPING</span>
          <h1>Your cart</h1>
        </div>
      </div>

      {cartItems.length === 0 ? (
        <div className="page-state">
          <ShoppingCart size={35} />
          <h2>Your cart is empty</h2>
          <p>Explore our store and add products to your cart.</p>
          <Link to="/" className="button button-primary">
            Continue shopping
          </Link>
        </div>
      ) : (
        <div className="cart-layout">
          <div className="cart-items">
            {cartItems.map((item) => {
              const available = isAvailable(item);
              const stock = getProductStock(item);
              const quantityLimit =
                stock === null ? Infinity : stock;

              return (
                <article className="cart-item" key={item.id}>
                  <img
                    src={getProductImage(item)}
                    alt={item.name}
                    className="cart-item-image"
                  />

                  <div className="cart-item-details">
                    <Link to={`/product/${item.id}`}>
                      <h3>{item.name}</h3>
                    </Link>

                    <strong>{money(getProductPrice(item))}</strong>
                    <Availability product={item} />

                    <div className="quantity-control">
                      <button
                        type="button"
                        aria-label="Decrease quantity"
                        onClick={() => decreaseQuantity(item.id)}
                      >
                        <Minus size={15} />
                      </button>

                      <span>{item.quantity}</span>

                      <button
                        type="button"
                        aria-label="Increase quantity"
                        disabled={
                          !available ||
                          item.quantity >= quantityLimit
                        }
                        onClick={() => increaseQuantity(item.id)}
                      >
                        <Plus size={15} />
                      </button>
                    </div>

                    <button
                      type="button"
                      className="remove-item"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <Trash2 size={15} /> Remove
                    </button>
                  </div>

                  <strong className="cart-line-total">
                    {money(
                      getProductPrice(item) * item.quantity
                    )}
                  </strong>
                </article>
              );
            })}
          </div>

          <aside className="cart-summary">
            <h2>Order summary</h2>

            <div className="summary-row">
              <span>Subtotal</span>
              <strong>{money(cartTotal)}</strong>
            </div>

            <p className="summary-note">
              Delivery costs can be confirmed when your order is arranged.
            </p>

            <button
              type="button"
              className="button button-primary full-width"
              disabled={cartItems.some(
                (item) => !isAvailable(item)
              )}
              onClick={() => navigate("/checkout")}
            >
              Proceed to checkout <ArrowRight size={17} />
            </button>

            <Link to="/" className="continue-shopping">
              Continue shopping
            </Link>
          </aside>
        </div>
      )}
    </section>
  );
}

function CheckoutPage() {
  const { cartItems, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    customerName: "",
    phone: "",
    email: "",
    address: "",
    notes: "",
    paymentMethod: "M-Pesa",
  });

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function update(field, value) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");

    if (!cartItems.length) {
      setError("Your cart is empty.");
      return;
    }

    if (cartItems.some((item) => !isAvailable(item))) {
      setError(
        "One or more products are unavailable. Please update your cart."
      );
      return;
    }

    if (!supabase) {
      setError("The store is not connected to Supabase.");
      return;
    }

    setSubmitting(true);

    try {
      const orderItems = cartItems.map((item) => ({
        product_id: item.id,
        product_name: item.name,
        quantity: Number(item.quantity),
        unit_price: getProductPrice(item),
      }));

      const { data, error: orderError } = await supabase.rpc(
        "place_store_order",
        {
          p_customer_name: form.customerName.trim(),
          p_phone: form.phone.trim(),
          p_email: form.email.trim() || null,
          p_delivery_address: form.address.trim(),
          p_notes: form.notes.trim() || null,
          p_payment_method: form.paymentMethod,
          p_items: orderItems,
        }
      );

      if (orderError) throw orderError;

      const orderNumber =
        typeof data === "string"
          ? data
          : data?.order_number || data?.order_id || "";

      const message = [
        "Hello VoltBridge Technologies!",
        "",
        "I have placed an order through the website.",
        orderNumber ? `Order reference: ${orderNumber}` : "",
        `Name: ${form.customerName.trim()}`,
        `Phone: ${form.phone.trim()}`,
        `Delivery address: ${form.address.trim()}`,
        `Payment method: ${form.paymentMethod}`,
        "",
        "Items:",
        ...cartItems.map(
          (item) =>
            `- ${item.name} x ${item.quantity} — ${money(
              getProductPrice(item) * item.quantity
            )}`
        ),
        "",
        `Order subtotal: ${money(
          Number(data?.subtotal ?? cartTotal)
        )}`,
        form.notes.trim() ? `Notes: ${form.notes.trim()}` : "",
      ]
        .filter(Boolean)
        .join("\n");

      clearCart();

      window.open(
        makeWhatsAppUrl(message),
        "_blank",
        "noopener,noreferrer"
      );

      navigate("/", {
        replace: true,
        state: {
          orderPlaced: true,
          orderNumber,
        },
      });
    } catch (err) {
      setError(
        err?.message ||
          "Your order could not be submitted. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  if (!cartItems.length) {
    return (
      <section className="container page-state">
        <ShoppingCart size={35} />
        <h2>Your cart is empty</h2>
        <Link to="/" className="button button-primary">
          Return to shop
        </Link>
      </section>
    );
  }

  return (
    <section className="container checkout-section">
      <div className="section-heading">
        <div>
          <span className="eyebrow">ALMOST THERE</span>
          <h1>Checkout</h1>
          <p>Enter your contact and delivery details.</p>
        </div>
      </div>

      <div className="checkout-layout">
        <form className="checkout-form" onSubmit={handleSubmit}>
          <h2>Customer information</h2>

          <label>
            Full name *
            <input
              type="text"
              value={form.customerName}
              onChange={(event) =>
                update("customerName", event.target.value)
              }
              required
              maxLength={160}
            />
          </label>

          <label>
            Phone number *
            <input
              type="tel"
              value={form.phone}
              onChange={(event) =>
                update("phone", event.target.value)
              }
              required
              maxLength={30}
            />
          </label>

          <label>
            Email address
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                update("email", event.target.value)
              }
            />
          </label>

          <label>
            Delivery address *
            <textarea
              rows={3}
              value={form.address}
              onChange={(event) =>
                update("address", event.target.value)
              }
              required
              maxLength={1000}
            />
          </label>

          <label>
            Payment method *
            <select
              value={form.paymentMethod}
              onChange={(event) =>
                update("paymentMethod", event.target.value)
              }
              required
            >
              <option value="M-Pesa">M-Pesa</option>
              <option value="Cash on Delivery">
                Cash on Delivery
              </option>
              <option value="Bank Transfer">Bank Transfer</option>
            </select>
          </label>

          <label>
            Additional notes
            <textarea
              rows={3}
              value={form.notes}
              onChange={(event) =>
                update("notes", event.target.value)
              }
              maxLength={1000}
              placeholder="Optional delivery instructions"
            />
          </label>

          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}

          <button
            type="submit"
            className="button button-primary full-width"
            disabled={
              submitting ||
              cartItems.some((item) => !isAvailable(item))
            }
          >
            {submitting ? "Placing order..." : "Place order"}
            {!submitting && <ArrowRight size={17} />}
          </button>

          <p className="checkout-whatsapp-note">
            After your order is submitted, WhatsApp will open so you can
            communicate with VoltBridge Technologies about the order.
          </p>
        </form>

        <aside className="checkout-summary">
          <h2>Your order</h2>

          {cartItems.map((item) => (
            <div className="checkout-item" key={item.id}>
              <img src={getProductImage(item)} alt={item.name} />

              <div>
                <strong>{item.name}</strong>
                <small>Quantity: {item.quantity}</small>
                <Availability product={item} />
              </div>

              <strong>
                {money(getProductPrice(item) * item.quantity)}
              </strong>
            </div>
          ))}

          <div className="summary-row">
            <span>Subtotal</span>
            <strong>{money(cartTotal)}</strong>
          </div>

          <p className="summary-note">
            Delivery fees, where applicable, will be confirmed with you.
          </p>
        </aside>
      </div>
    </section>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/admin/*" element={<Admin />} />

      <Route
        path="/"
        element={
          <>
            <Header />
            <HomePage />
            <Footer />
          </>
        }
      />

      <Route
        path="/product/:productId"
        element={
          <>
            <Header />
            <ProductDetailPage />
            <Footer />
          </>
        }
      />

      <Route
        path="/cart"
        element={
          <>
            <Header />
            <CartPage />
            <Footer />
          </>
        }
      />

      <Route
        path="/checkout"
        element={
          <>
            <Header />
            <CheckoutPage />
            <Footer />
          </>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  // BrowserRouter is already provided by main.jsx.
  return <AppRoutes />;
}
