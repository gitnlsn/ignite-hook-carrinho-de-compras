import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storagedCart = localStorage.getItem('@RocketShoes:cart');

    if (storagedCart) {
      return JSON.parse(storagedCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productStock = await api
        .get(`/stock/${productId}`)
        .then(response => response.data);

      const product = await api
        .get(`/products/${productId}`)
        .then(response => response.data);

      const productOnCart = cart.find(product => product.id === productId)
      let newCart: Product[];
      if (productOnCart) {
        if (productStock.amount <= productOnCart.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }
        newCart = cart.map(existingProduct => {
          if (existingProduct.id === productId) {
            return {
              ...existingProduct,
              amount: existingProduct.amount + 1
            }
          }
          return existingProduct;
        });
      } else {
        newCart = [
          ...cart,
          {
            ...product,
            amount: 1,
          }
        ];
      }

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const existingProduct = cart.find(product => product.id === productId);

      if (existingProduct) {
        const newCart = cart.filter(product => product.id !== productId);
        localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
        setCart(newCart);
      }
      toast.error('Erro na remoção do produto');
    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const existingProduct = cart.find(product => product.id === productId);

      if (!existingProduct) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const productStock = await api
        .get(`/stock/${productId}`)
        .then(response => response.data);

      if (productStock.amount < amount || amount === 0) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const newCart = cart.map(product => {
        if (product.id === productId) {
          return {
            ...product,
            amount,
          }
        }
        return product;
      });

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
