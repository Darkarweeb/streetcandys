/**
 * Admin Shipping Management API
 * GET  /api/admin/shipping — full config
 * POST /api/admin/shipping — upsert method / country setting / region / rate / same_day
 */
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

async function createAdminClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
}

async function verifyAdmin(request: NextRequest) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (!profile || !['admin', 'super_admin'].includes(profile.role)) return null;
  return user;
}

export async function GET(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const supabase = await createAdminClient();

    const [methods, countrySettings, regions, rates, sameDayConfig] = await Promise.all([
      supabase.from('shipping_methods').select('*').order('display_order'),
      supabase.from('shipping_country_settings').select('*').order('country_code'),
      supabase.from('shipping_regions').select('*').order('country_code').order('name'),
      supabase.from('shipping_rates').select('*, method:shipping_methods(code,name), region:shipping_regions(name,country_code)'),
      supabase.from('shipping_same_day_config').select('*, method:shipping_methods(code,name)'),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        methods: methods.data ?? [],
        countrySettings: countrySettings.data ?? [],
        regions: regions.data ?? [],
        rates: rates.data ?? [],
        sameDayConfig: sameDayConfig.data ?? [],
      },
    });
  } catch (error) {
    console.error('[GET /api/admin/shipping]', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAdmin(request);
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 });

    const body = await request.json();
    const { type, data } = body;

    const supabase = await createAdminClient();

    if (type === 'method') {
      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase.from('shipping_methods').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipping_methods').insert(rest);
        if (error) throw error;
      }
    } else if (type === 'country_setting') {
      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase.from('shipping_country_settings').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipping_country_settings').upsert(rest, { onConflict: 'country_code' });
        if (error) throw error;
      }
    } else if (type === 'region') {
      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase.from('shipping_regions').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipping_regions').insert(rest);
        if (error) throw error;
      }
    } else if (type === 'rate') {
      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase.from('shipping_rates').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipping_rates').upsert(rest, { onConflict: 'region_id,shipping_method_id' });
        if (error) throw error;
      }
    } else if (type === 'same_day') {
      const { id, ...rest } = data;
      if (id) {
        const { error } = await supabase.from('shipping_same_day_config').update(rest).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('shipping_same_day_config').insert(rest);
        if (error) throw error;
      }
    } else {
      return NextResponse.json({ error: 'Tipo no válido' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[POST /api/admin/shipping]', error);
    return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
  }
}
