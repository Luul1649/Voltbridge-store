
import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';

const CartContext = createContext(null);
const CART_STORAGE_KEY = 'voltbridge-shopping-cart';

function getProductStock(product) {
  const value = product?.stock_quantity ?? product?.stock;

  // If stock is unknown, allow adding the product.
  if (value === null || value === undefined || value === '') {
    return Infinity;
  }

  const stock = Number(value);
  return Number.isFinite(stock) ? Math.max(0, stock) : Infinity;
}

function getProductPrice(product) {
  const value = Number(product?.discount_price ?? product?.price ?? 0);
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => {
    try {
      const savedCart = localStorage.getItem(CART_STORAGE_KEY);
      const parsed = savedCart ? JSON.parse(savedCart) : [];

      if (!Array.isArray(parsed)) return [];

      return parsed
        .filter((item) => item && item.id != null)
        .map((item) => ({
          ...item,
          quantity: Math.max(1, Number(item.quantity) || 1),
        }));
    } catch (error) {
      console.error('Unable to load saved cart:', error);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
    } catch (error) {
      console.error('Unable to save cart:', error);
    }
  }, [cart]);

  function addToCart(product) {
    if (!product || product.id == null) {
      console.error('Cannot add product: missing product or product ID.', product);
      return;
    }

    const availableStock = getProductStock(product);

    if (availableStock <= 0) {
      console.warn('This product is out of stock:', product.name);
      return;
    }

    setCart((currentCart) => {
      const existing = currentCart.find(
        (item) => String(item.id) === String(product.id)
      );

      if (existing) {
        if (existing.quantity >= availableStock) {
          console.warn('Maximum available stock reached:', product.name);
          return currentCart;
        }

        return currentCart.map((item) =>
          String(item.id) === String(product.id)
            ? {
                ...item,
                ...product,
                price: getProductPrice(product),
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [
        ...currentCart,
        {
          ...product,
          price: getProductPrice(product),
          quantity: 1,
        },
      ];
    });
  }

  function increaseQuantity(productId) {
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (String(item.id) !== String(productId)) return item;

        const availableStock = getProductStock(item);

        if (item.quantity >= availableStock) return item;

        return {
          ...item,
          quantity: item.quantity + 1,
        };
      })
    );
  }

  function decreaseQuantity(productId) {
    setCart((currentCart) =>
      currentCart
        .map((item) =>
          String(item.id) === String(productId)
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(productId) {
    setCart((currentCart) =>
      currentCart.filter(
        (item) => String(item.id) !== String(productId)
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  const cartCount = cart.reduce(
    (total, item) => total + (Number(item.quantity) || 0),
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total +
      getProductPrice(item) * (Number(item.quantity) || 0),
    0
  );

  return (
    <CartContext.Provider
      value={{
        cart,
        cartItems: cart,
        setCart,
        cartCount,
        cartTotal,
        addToCart,
        increaseQuantity,
        decreaseQuantity,
        removeFromCart,
        clearCart,
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);

  if (!context) {
    throw new Error('useCart must be used inside CartProvider.');
  }

  return context;
}
