import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// POST /api/admin/anuncios — send system-wide announcement
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'staff'].includes(profile.role)) {
    return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
  }

  const body = await request.json();
  const { title, message, action_url, target } = body;

  if (!title?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'Título y mensaje son requeridos' }, { status: 400 });
  }

  const validTargets = ['all', 'co', 'cr'];
  const safeTarget = validTargets.includes(target) ? target : 'all';

  const { data, error } = await supabase.rpc('send_admin_announcement', {
    p_title: title.trim(),
    p_body: message.trim(),
    p_action_url: action_url?.trim() || null,
    p_target: safeTarget,
    p_data: { sent_by: user.id },
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ success: true, recipients: data });
}
