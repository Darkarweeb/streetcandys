import { imageHosts } from './image-hosts.config.mjs';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// All Capacitor packages that must NEVER be bundled into the web/SSR runtime.
// These are native-only modules — webpack must treat them as externals.
const CAPACITOR_EXTERNALS = [
  '@capacitor/core',
  '@capacitor/cli',
  '@capacitor/app',
  '@capacitor/android',
  '@capacitor/ios',
  '@capacitor/browser',
  '@capacitor/camera',
  '@capacitor/filesystem',
  '@capacitor/haptics',
  '@capacitor/keyboard',
  '@capacitor/network',
  '@capacitor/push-notifications',
  '@capacitor/splash-screen',
  '@capacitor/status-bar',
  '@capacitor/local-notifications',
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  productionBrowserSourceMaps: false,
  distDir: process.env.DIST_DIR || '.next',
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  compress: true,
  poweredByHeader: false,
  // Ensure server-only modules (next/headers, @supabase/ssr server internals,
  // and ALL Capacitor packages) are never bundled into the server-side webpack graph.
  serverExternalPackages: ['@supabase/ssr', ...CAPACITOR_EXTERNALS],
  images: {
    remotePatterns: imageHosts,
    minimumCacheTTL: 31536000,
    formats: ['image/avif', 'image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384],
    dangerouslyAllowSVG: false,
  },
  experimental: {
    optimizePackageImports: ['@heroicons/react', 'recharts'],
  },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
        ],
      },
      {
        // HTML pages — must revalidate so browsers always get fresh chunk references
        source: '/:path((?!_next/static|_next/image|assets|favicon\\.ico).*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/favicon.ico',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/assets/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/_next/image(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, must-revalidate',
          },
        ],
      },
      {
        // webpack runtime chunk — must come LAST to override the _next/static immutable rule above
        // Prevents stale chunk errors when a new build is deployed
        source: '/_next/static/chunks/webpack.js',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
  webpack(
    config,
    {
      dev,
      isServer,
    }
  ) {
    if (!dev) {
      config.optimization = {
        ...config.optimization,
        moduleIds: 'deterministic',
        chunkIds: 'deterministic',
      };
    }

    if (dev) {
      config.module.rules.push({
        test: /\.(jsx|tsx)$/,
        exclude: [/node_modules/],
        use: [{
          loader: '@dhiwise/component-tagger/nextLoader',
        }],
      });
      const ignoredPaths = (process.env.WATCH_IGNORED_PATHS || '')
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean);
      config.watchOptions = {
        ignored: ignoredPaths.length
          ? ignoredPaths.map((p) => `**/${p.replace(/^\/+|\/+$/g, '')}/**`)
          : undefined,
      };
    }

    // ── Capacitor isolation ────────────────────────────────────────────────
    // Capacitor packages are native-only. They must NEVER be bundled into
    // the web client or SSR bundles — doing so causes the
    // "undefined is not an object (evaluating 'originalFactory.call')"
    // error in Preview/web environments because the native module factories
    // don't exist in a browser/Node webpack context.
    //
    // Strategy: mark every @capacitor/* package as an external so webpack
    // emits a no-op stub instead of trying to resolve/bundle the module.
    if (!isServer) {
      // Client bundle: return an empty object for every Capacitor import
      const existingExternals = config.externals || [];
      config.externals = [
        ...(Array.isArray(existingExternals) ? existingExternals : [existingExternals]),
        ({ request }, callback) => {
          if (request && CAPACITOR_EXTERNALS.some((pkg) => request === pkg || request.startsWith(pkg + '/'))) {
            // Use 'var' format so webpack emits a browser-safe stub (an empty object literal)
            // rather than a require() call which does not exist in the browser and causes
            // "undefined is not an object (evaluating 'originalFactory.call')".
            return callback(null, 'var {}');
          }
          callback();
        },
      ];
    }

    // Prevent capacitor.config.ts from being processed by webpack.
    // It imports @capacitor/cli which is a CLI-only Node tool and has no
    // browser/SSR equivalent. Aliasing it to false drops it from the bundle.
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      // Drop capacitor.config from all webpack graphs
      [path.resolve(__dirname, './capacitor.config.ts')]: false,
    };

    return config;
  },
};
export default nextConfig;