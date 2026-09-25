import { defineConfig, loadEnv } from 'vite';
import { resolve } from 'path';
import tailwindcss from '@tailwindcss/vite';

// --- API Dev Middleware ---
// This allows Vite to handle /api routes during development by 
// dynamically executing the TS files in the /api directory.
const apiMiddleware = () => ({
  name: 'api-middleware',
  configureServer(server: any) {
    // Load env variables into process.env so the API handlers can see them
    const env = loadEnv(server.config.mode, process.cwd(), '');
    Object.assign(process.env, env);

    server.middlewares.use(async (req: any, res: any, next: any) => {
      // Dev mode rewrite for /ankit to match Vercel behavior
      if (req.url === '/ankit' || req.url === '/ankit/') {
        req.url = '/src/admin/ankit.html';
        return next();
      }

      // Clean URL redirects: Strip .html so users only see clean paths or root domain
      const parsedUrl = new URL(req.url, 'http://localhost');
      const pathname = parsedUrl.pathname;

      if (pathname === '/landing.html') {
        res.writeHead(302, { Location: '/' + (parsedUrl.search || '') });
        return res.end();
      }

      if (pathname === '/index.html') {
        res.writeHead(302, { Location: '/app' + (parsedUrl.search || '') });
        return res.end();
      }

      // Root domain / serves landing.html cleanly (e.g. localhost:5173/ or alltracker.online)
      if (pathname === '/' || pathname === '') {
        req.url = '/landing.html' + parsedUrl.search;
        return next();
      }

      // Vanity clean routes: /landing or /home
      if (pathname === '/landing' || pathname === '/landing/' || pathname === '/home' || pathname === '/home/') {
        req.url = '/landing.html' + parsedUrl.search;
        return next();
      }

      // Main application route: /app
      if (pathname === '/app' || pathname.startsWith('/app/')) {
        req.url = '/index.html' + parsedUrl.search;
        return next();
      }

      // Extension-less clean routes for documentation & legal pages
      if (pathname === '/manual' || pathname === '/manual/') {
        req.url = '/manual.html' + parsedUrl.search;
        return next();
      }
      if (pathname === '/privacy' || pathname === '/privacy/') {
        req.url = '/privacy.html' + parsedUrl.search;
        return next();
      }
      if (pathname === '/terms' || pathname === '/terms/') {
        req.url = '/terms.html' + parsedUrl.search;
        return next();
      }

      if (!req.url.startsWith('/api/')) return next();

      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        let path = url.pathname;
        
        // Handle dynamic routes
        let filePath = '';
        let query: Record<string, string | string[]> = {};

        if (path.startsWith('/api/auth/')) {
          filePath = resolve(__dirname, 'api/auth/[...auth].ts');
        } else if (path.startsWith('/api/app/')) {
          filePath = resolve(__dirname, 'api/main.ts');
        } else {
          filePath = resolve(__dirname, `${path.slice(1)}.ts`);
        }

        // Force Vite to handle the module execution
        // Note: For SSR, we need to pass the module path.
        // If the module has .js imports for .ts files, the Vite SSR runner
        // usually handles them if they are part of the dependency graph.
        const mod = await server.ssrLoadModule(filePath);
        const handler = mod.default;

        if (typeof handler === 'function') {
          // Attach query to req for consistency with Vercel/Next behavior
          req.query = { ...query };
          url.searchParams.forEach((val, key) => {
            req.query[key] = val;
          });
          
          await handler(req, res);
        } else {
          next();
        }
      } catch (err) {
        console.error('API Middleware Error:', err);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Internal Server Error', details: String(err) }));
      }
    });
  }
});

export default defineConfig({
  plugins: [tailwindcss(), apiMiddleware()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
    // This allows .js imports in our code to resolve to .ts files locally
    // It's essential for keeping code Vercel-ready while developing locally.
    extensions: ['.ts', '.js', '.json'],
  },
  publicDir: 'public',
  build: {
    // SECURITY: Explicitly disable sourcemaps so raw TypeScript code is never exposed in production DevTools
    sourcemap: false,
    // Minify output to make it unreadable
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        landing: resolve(__dirname, 'landing.html'),
        manual: resolve(__dirname, 'manual.html'),
        privacy: resolve(__dirname, 'privacy.html'),
        terms: resolve(__dirname, 'terms.html'),
        ankit: resolve(__dirname, 'src/admin/ankit.html')
      }
    }
  }
});
