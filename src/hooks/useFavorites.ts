'use client';

import { useState, useEffect, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface FavoriteItem {
  id: string;
  product_id: string;
  created_at: string;
}

interface UseFavoritesReturn {
  favoriteIds: Set<string>;
  loading: boolean;
  toggling: Set<string>;
  isFavorite: (productId: string) => boolean;
  toggleFavorite: (productId: string) => Promise<void>;
  addFavorite: (productId: string) => Promise<void>;
  removeFavorite: (productId: string) => Promise<void>;
}

export function useFavorites(): UseFavoritesReturn {
  const { user } = useAuth();
  const supabase = createClient();
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [toggling, setToggling] = useState<Set<string>>(new Set());

  const loadFavorites = useCallback(async () => {
    if (!user) {
      setFavoriteIds(new Set());
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('wishlist')
        .select('product_id')
        .eq('profile_id', user.id);

      if (error) throw error;
      setFavoriteIds(new Set((data || []).map((r: { product_id: string }) => r.product_id)));
    } catch {
      // Silently fail — favorites are non-critical
    } finally {
      setLoading(false);
    }
  }, [user, supabase]);

  useEffect(() => {
    loadFavorites();
  }, [loadFavorites]);

  const isFavorite = useCallback(
    (productId: string) => favoriteIds.has(productId),
    [favoriteIds],
  );

  const addFavorite = useCallback(
    async (productId: string) => {
      if (!user) return;
      setToggling((prev) => new Set(prev).add(productId));
      try {
        const { error } = await supabase
          .from('wishlist')
          .insert({ profile_id: user.id, product_id: productId });

        if (error && error.code !== '23505') throw error; // 23505 = unique_violation (already exists)
        setFavoriteIds((prev) => new Set(prev).add(productId));
      } catch {
        // Silently fail
      } finally {
        setToggling((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [user, supabase],
  );

  const removeFavorite = useCallback(
    async (productId: string) => {
      if (!user) return;
      setToggling((prev) => new Set(prev).add(productId));
      try {
        const { error } = await supabase
          .from('wishlist')
          .delete()
          .eq('profile_id', user.id)
          .eq('product_id', productId);

        if (error) throw error;
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      } catch {
        // Silently fail
      } finally {
        setToggling((prev) => {
          const next = new Set(prev);
          next.delete(productId);
          return next;
        });
      }
    },
    [user, supabase],
  );

  const toggleFavorite = useCallback(
    async (productId: string) => {
      if (favoriteIds.has(productId)) {
        await removeFavorite(productId);
      } else {
        await addFavorite(productId);
      }
    },
    [favoriteIds, addFavorite, removeFavorite],
  );

  return {
    favoriteIds,
    loading,
    toggling,
    isFavorite,
    toggleFavorite,
    addFavorite,
    removeFavorite,
  };
}
