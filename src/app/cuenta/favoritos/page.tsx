'use client';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import CuentaLayout from '@/components/cuenta/CuentaLayout';
import { createClient } from '@/lib/supabase/client';

interface WishlistItem {
  id: string;
  product_id: string;
  created_at: string;
  product: {
    id: string;
    name: string;
    slug: string;
    thumbnail_url: string | null;
    base_price: number;
    price_crc: number | null;
    currency_code: string;
    is_active: boolean;
    inventory?: { quantity: number; reserved_quantity: number } | null;
  } | null;
}

function formatCurrency(amount: number, currency: string) {
  const symbol = currency === 'CRC' ? '₡' : '$';
  return `${symbol}${amount.toLocaleString('es-CO')}`;
}

function WishlistSkeleton() {
  return (
    <div className="bg-white border border-sc-border rounded-card overflow-hidden animate-pulse">
      <div className="aspect-square bg-sc-beige" />
      <div className="p-4 space-y-2">
        <div className="h-4 bg-sc-beige rounded w-3/4" />
        <div className="h-4 bg-sc-beige rounded w-1/2" />
        <div className="h-8 bg-sc-beige rounded-pill w-full mt-3" />
      </div>
    </div>
  );
}

export default function FavoritosPage() {
  const { user } = useAuth();
  const supabase = useRef(createClient()).current;
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);
  const [cartFeedback, setCartFeedback] = useState<string | null>(null);

  const loadWishlist = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: dbError } = await supabase
        .from('wishlist')
        .select(`
          id,
          product_id,
          created_at,
          product:products(id, name, slug, thumbnail_url, base_price, price_crc, currency_code, is_active)
        `)
        .eq('profile_id', user.id)
        .order('created_at', { ascending: false });

      if (dbError) throw new Error(dbError.message);
      setItems((data as unknown as WishlistItem[]) || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error cargando favoritos');
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => { loadWishlist(); }, [loadWishlist]);

  const handleRemove = async (wishlistId: string, productId: string) => {
    setRemovingId(wishlistId);
    try {
      const { error: delError } = await supabase
        .from('wishlist')
        .delete()
        .eq('id', wishlistId)
        .eq('profile_id', user!.id);
      if (delError) throw new Error(delError.message);
      setItems(prev => prev.filter(i => i.id !== wishlistId));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error eliminando favorito');
    } finally {
      setRemovingId(null);
    }
  };

  const handleAddToCart = async (item: WishlistItem) => {
    if (!item.product) return;
    setAddingToCart(item.product_id);
    setCartFeedback(null);
    try {
      const response = await fetch('/api/carrito/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product_id: item.product_id, quantity: 1 }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Error al agregar al carrito');
      }
      setCartFeedback(item.product_id);
      setTimeout(() => setCartFeedback(null), 2000);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Error al agregar al carrito');
    } finally {
      setAddingToCart(null);
    }
  };

  return (
    <CuentaLayout>
      <div className="animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-sc-forest tracking-tight">Mis Favoritos</h1>
          <p className="text-sc-muted text-sm mt-1">
            {!loading && items.length > 0
              ? `${items.length} producto${items.length !== 1 ? 's' : ''} guardado${items.length !== 1 ? 's' : ''}`
              : 'Productos que te interesan'}
          </p>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[...Array(6)].map((_, i) => <WishlistSkeleton key={i} />)}
          </div>
        ) : error ? (
          <div className="bg-red-50 border border-red-200 rounded-card p-5 text-red-700 text-sm">
            {error}
            <button onClick={loadWishlist} className="ml-3 text-sc-periwinkle hover:underline">Reintentar</button>
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white border border-sc-border rounded-card py-16 text-center">
            <p className="text-5xl mb-4">❤️</p>
            <p className="text-sc-forest font-semibold text-lg mb-2">Tu lista de favoritos está vacía</p>
            <p className="text-sc-muted text-sm mb-6">Guarda los productos que te gustan para comprarlos después</p>
            <Link
              href="/productos"
              className="inline-block bg-sc-forest text-sc-cream px-6 py-2.5 rounded-pill text-sm font-medium hover:bg-sc-darkforest transition-colors"
            >
              Explorar productos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {items.map((item) => {
              const addedToCart = cartFeedback === item.product_id;
              const isAdding = addingToCart === item.product_id;
              return (
                <div key={item.id} className="bg-white border border-sc-border rounded-card overflow-hidden group hover:border-sc-forest transition-colors flex flex-col">
                  <Link href={`/productos/${item.product?.slug || ''}`} className="block relative">
                    <div className="aspect-square bg-sc-beige overflow-hidden">
                      {item.product?.thumbnail_url ? (
                        <img
                          src={item.product.thumbnail_url}
                          alt={item.product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-3xl">🌿</div>
                      )}
                    </div>
                    {/* Remove from favorites overlay button */}
                    <button
                      onClick={(e) => { e.preventDefault(); handleRemove(item.id, item.product_id); }}
                      disabled={removingId === item.id}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 border border-red-200 text-red-500 flex items-center justify-center hover:bg-red-50 transition-colors disabled:opacity-60"
                      aria-label="Quitar de favoritos"
                    >
                      {removingId === item.id ? (
                        <span className="w-3 h-3 border-2 border-red-400 border-t-transparent rounded-full animate-spin block" />
                      ) : (
                        <svg width="12" height="12" viewBox="0 0 18 18" fill="currentColor" aria-hidden="true">
                          <path d="M9 15s-7-4.5-7-9a4 4 0 018 0 4 4 0 018 0c0 4.5-7 9-7 9z" />
                        </svg>
                      )}
                    </button>
                  </Link>

                  <div className="p-3 flex flex-col flex-1">
                    <Link href={`/productos/${item.product?.slug || ''}`}>
                      <p className="text-sc-forest text-sm font-semibold leading-tight mb-1 hover:underline line-clamp-2">
                        {item.product?.name || 'Producto'}
                      </p>
                    </Link>
                    {item.product?.base_price != null && (
                      <p className="text-sc-forest text-sm font-bold mb-3">
                        {formatCurrency(item.product.base_price, item.product.currency_code || 'COP')}
                      </p>
                    )}

                    {/* Add to Cart */}
                    <button
                      onClick={() => handleAddToCart(item)}
                      disabled={isAdding || addedToCart}
                      className={`mt-auto w-full text-xs font-bold py-2.5 rounded-pill transition-all duration-200 active:scale-95 flex items-center justify-center gap-1.5 ${
                        addedToCart
                          ? 'bg-green-600 text-white cursor-default' :'bg-sc-forest text-sc-cream hover:bg-sc-darkforest disabled:opacity-60 disabled:cursor-not-allowed'
                      }`}
                      aria-label={addedToCart ? 'Agregado al carrito' : `Agregar ${item.product?.name || ''} al carrito`}
                    >
                      {isAdding ? (
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : addedToCart ? (
                        <>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                            <path d="M2 6.5l3.5 3.5 5.5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          Agregado
                        </>
                      ) : (
                        <>
                          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
                            <path d="M1 1h2l1.5 7h6l1.5-5H4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            <circle cx="6" cy="11.5" r="0.75" fill="currentColor"/>
                            <circle cx="10" cy="11.5" r="0.75" fill="currentColor"/>
                          </svg>
                          Agregar al carrito
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </CuentaLayout>
  );
}
