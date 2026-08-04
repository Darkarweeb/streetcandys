import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

// GET /api/admin/setup — check if setup is available
export async function GET() {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc('admin_exists');

    if (error) {
      return NextResponse.json({ exito: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ exito: true, adminExists: data === true });
  } catch (err) {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST /api/admin/setup — create the first admin account
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verify no admin exists yet
    const { data: adminExists, error: checkError } = await supabase.rpc('admin_exists');
    if (checkError) {
      return NextResponse.json({ exito: false, error: checkError.message }, { status: 500 });
    }
    if (adminExists === true) {
      return NextResponse.json(
        { exito: false, error: 'Acceso denegado. Ya existe un administrador.' },
        { status: 403 }
      );
    }

    // 2. Parse body
    const body = await request.json();
    const { email, password, fullName } = body as {
      email?: string;
      password?: string;
      fullName?: string;
    };

    if (!email || !password || !fullName) {
      return NextResponse.json(
        { exito: false, error: 'Todos los campos son requeridos.' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { exito: false, error: 'La contraseña debe tener al menos 8 caracteres.' },
        { status: 400 }
      );
    }

    // 3. Create the auth user via Supabase Auth (sign up)
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: 'admin',
        },
      },
    });

    if (signUpError) {
      return NextResponse.json({ exito: false, error: signUpError.message }, { status: 400 });
    }

    if (!signUpData.user) {
      return NextResponse.json(
        { exito: false, error: 'No se pudo crear el usuario.' },
        { status: 500 }
      );
    }

    const userId = signUpData.user.id;

    // 3b. Auto-confirm the email using the admin client so login works immediately
    try {
      const adminClient = createAdminClient();
      await adminClient.auth.admin.updateUserById(userId, { email_confirm: true });
    } catch {
      // Non-fatal: if service role key is missing, setup still succeeds but email confirmation is needed manually
    }

    // 4. Ensure profile exists (upsert in case trigger didn't fire yet)
    await supabase.from('profiles').upsert(
      {
        id: userId,
        email,
        full_name: fullName,
        role: 'customer', // will be promoted next
        age_verified: true,
        is_active: true,
      },
      { onConflict: 'id' }
    );

    // 5. Promote to admin using the security-definer function
    const { data: promoted, error: promoteError } = await supabase.rpc('setup_first_admin', {
      user_id: userId,
    });

    if (promoteError) {
      return NextResponse.json({ exito: false, error: promoteError.message }, { status: 500 });
    }

    if (!promoted) {
      return NextResponse.json(
        { exito: false, error: 'No se pudo asignar el rol de administrador.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      exito: true,
      mensaje: 'Cuenta de Super Admin creada exitosamente.',
      userId,
    });
  } catch (err) {
    return NextResponse.json({ exito: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
