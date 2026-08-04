import { createBrowserClient } from '@supabase/ssr';

const PFX = 'sb_';

const canUseCookies = (() => {
  let cache: boolean | null = null;
  return () => {
    if (typeof document === 'undefined') return false;
    if (cache !== null) return cache;
    // Use a simple SameSite=Lax test — no Partitioned attribute which can fail in iframes
    const k = '__sb_test__';
    try {
      document.cookie = `${k}=1; Path=/; SameSite=Lax`;
      cache = document.cookie.includes(k);
      document.cookie = `${k}=; Path=/; Max-Age=0; SameSite=Lax`;
    } catch {
      cache = false;
    }
    return cache;
  };
})();

const fromCookies = () =>
  typeof document === 'undefined'
    ? []
    : document.cookie
        .split(';')
        .filter(Boolean)
        .map((c) => {
          const trimmed = c.trim();
          const eqIdx = trimmed.indexOf('=');
          const name = eqIdx >= 0 ? trimmed.slice(0, eqIdx) : trimmed;
          const value = eqIdx >= 0 ? decodeURIComponent(trimmed.slice(eqIdx + 1)) : '';
          return { name: name.trim(), value };
        })
        .filter((c) => c.name);

const fromStorage = () => {
  try {
    return Object.keys(localStorage)
      .filter((k) => k.startsWith(PFX))
      .map((k) => ({ name: k.slice(PFX.length), value: localStorage.getItem(k) || '' }));
  } catch {
    return [];
  }
};

const setCookie = (name: string, value: string, options?: Record<string, unknown>) => {
  // Use SameSite=Lax for broad compatibility; avoid Partitioned which breaks in iframes
  let s = `${name}=${encodeURIComponent(value)}; Path=${options?.path || '/'}; SameSite=Lax`;
  if (options?.maxAge) s += `; Max-Age=${options.maxAge}`;
  if (options?.domain) s += `; Domain=${options.domain}`;
  if (options?.expires) s += `; Expires=${new Date(options.expires as string).toUTCString()}`;
  document.cookie = s;
};

const deleteCookie = (name: string) => {
  if (typeof document === 'undefined') return;
  const host = typeof window !== 'undefined' ? window.location.hostname : '';
  const domains = ['', host, host ? `.${host}` : ''].filter(Boolean);
  const variants = [
    'Path=/; SameSite=Lax',
    'Path=/; SameSite=None; Secure',
  ];
  variants.forEach((attrs) => {
    document.cookie = `${name}=; Max-Age=0; ${attrs}`;
    domains.forEach((domain) => {
      document.cookie = `${name}=; Max-Age=0; Domain=${domain}; ${attrs}`;
    });
  });
};

const getToken = () =>
  (canUseCookies() ? fromCookies() : fromStorage()).find((c) =>
    c.name.includes('auth-token'),
  )?.value ?? null;

export function createClient() {
  // Patch fetch once per browser session, inside the function to avoid SSR/module-init issues
  if (typeof window !== 'undefined' && !(window as Window & { __sb_patched__?: boolean }).__sb_patched__) {
    (window as Window & { __sb_patched__?: boolean }).__sb_patched__ = true;
    const orig = window.fetch.bind(window);
    window.fetch = (input, init) => {
      const token = getToken();
      const url =
        typeof input === 'string'
          ? input
          : input instanceof URL
            ? input.href
            : (input as Request).url;
      if (token && (url.startsWith('/') || url.startsWith(window.location.origin))) {
        init = { ...(init || {}), headers: { ...(init?.headers || {}), 'x-sb-token': token } };
      }
      return orig(input, init);
    };
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => (canUseCookies() ? fromCookies() : fromStorage()),
        setAll(cookiesToSet) {
          if (typeof document === 'undefined') return;
          if (canUseCookies()) {
            cookiesToSet.forEach(({ name, value, options }) =>
              value
                ? setCookie(name, value, options as Record<string, unknown>)
                : deleteCookie(name),
            );
          } else {
            cookiesToSet.forEach(({ name, value, options }) => {
              try {
                value
                  ? localStorage.setItem(`${PFX}${name}`, value)
                  : localStorage.removeItem(`${PFX}${name}`);
              } catch {}
              if (value) setCookie(name, value, options as Record<string, unknown>);
            });
          }
        },
      },
    },
  );
}
