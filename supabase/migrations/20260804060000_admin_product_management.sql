-- ============================================================
-- Admin Product Management Migration
-- Storage bucket for product images + admin RLS policies
-- ============================================================

-- ─── Storage Bucket for Product Images ───────────────────────
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS policies
DROP POLICY IF EXISTS "product_images_public_read" ON storage.objects;
CREATE POLICY "product_images_public_read"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');

DROP POLICY IF EXISTS "product_images_admin_insert" ON storage.objects;
CREATE POLICY "product_images_admin_insert"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "product_images_admin_delete" ON storage.objects;
CREATE POLICY "product_images_admin_delete"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'product-images'
  AND EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);

-- ─── Products RLS: Admin full access ─────────────────────────
DROP POLICY IF EXISTS "admin_manage_products" ON public.products;
CREATE POLICY "admin_manage_products"
ON public.products FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);

-- ─── Product Variants RLS: Admin full access ─────────────────
DROP POLICY IF EXISTS "admin_manage_product_variants" ON public.product_variants;
CREATE POLICY "admin_manage_product_variants"
ON public.product_variants FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);

-- ─── Inventory RLS: Admin full access ────────────────────────
DROP POLICY IF EXISTS "admin_manage_inventory" ON public.inventory;
CREATE POLICY "admin_manage_inventory"
ON public.inventory FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'staff')
  )
);

-- ─── Function: Get product with full details for admin ────────
CREATE OR REPLACE FUNCTION public.get_admin_product_detail(p_slug TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'product', row_to_json(p.*),
    'inventory', (
      SELECT row_to_json(i.*)
      FROM public.inventory i
      WHERE i.product_id = p.id AND i.variant_id IS NULL
      LIMIT 1
    ),
    'variants', (
      SELECT jsonb_agg(
        jsonb_build_object(
          'variant', row_to_json(v.*),
          'inventory', (
            SELECT row_to_json(inv.*)
            FROM public.inventory inv
            WHERE inv.variant_id = v.id
            LIMIT 1
          )
        )
      )
      FROM public.product_variants v
      WHERE v.product_id = p.id
      ORDER BY v.sort_order
    ),
    'category', (
      SELECT row_to_json(c.*)
      FROM public.categories c
      WHERE c.id = p.category_id
      LIMIT 1
    )
  )
  INTO v_result
  FROM public.products p
  WHERE p.slug = p_slug;

  RETURN v_result;
END;
$$;

-- ─── Function: Upsert inventory for product ───────────────────
CREATE OR REPLACE FUNCTION public.upsert_product_inventory(
  p_product_id UUID,
  p_quantity INTEGER,
  p_low_stock_threshold INTEGER DEFAULT 5,
  p_allow_backorder BOOLEAN DEFAULT false,
  p_variant_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_inv_id UUID;
BEGIN
  -- Validate quantity
  IF p_quantity < 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'Quantity cannot be negative');
  END IF;

  IF p_variant_id IS NOT NULL THEN
    INSERT INTO public.inventory (product_id, variant_id, quantity, low_stock_threshold, allow_backorder)
    VALUES (p_product_id, p_variant_id, p_quantity, p_low_stock_threshold, p_allow_backorder)
    ON CONFLICT (product_id, variant_id) DO UPDATE
      SET quantity = EXCLUDED.quantity,
          low_stock_threshold = EXCLUDED.low_stock_threshold,
          allow_backorder = EXCLUDED.allow_backorder,
          updated_at = now()
    RETURNING id INTO v_inv_id;
  ELSE
    INSERT INTO public.inventory (product_id, quantity, low_stock_threshold, allow_backorder)
    VALUES (p_product_id, p_quantity, p_low_stock_threshold, p_allow_backorder)
    ON CONFLICT (product_id) WHERE variant_id IS NULL DO UPDATE
      SET quantity = EXCLUDED.quantity,
          low_stock_threshold = EXCLUDED.low_stock_threshold,
          allow_backorder = EXCLUDED.allow_backorder,
          updated_at = now()
    RETURNING id INTO v_inv_id;
  END IF;

  RETURN jsonb_build_object('success', true, 'inventory_id', v_inv_id);
EXCEPTION
  WHEN OTHERS THEN
    RETURN jsonb_build_object('success', false, 'error', SQLERRM);
END;
$$;

-- ─── Indexes for admin queries ────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_products_is_active ON public.products(is_active);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_category_id ON public.products(category_id);
CREATE INDEX IF NOT EXISTS idx_products_sku ON public.products(sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inventory_product_id ON public.inventory(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_low_stock ON public.inventory(product_id) WHERE quantity <= low_stock_threshold AND quantity > 0;
CREATE INDEX IF NOT EXISTS idx_product_variants_product_id ON public.product_variants(product_id);
