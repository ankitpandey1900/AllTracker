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
      if (!req.url.startsWith('/api/')) return next();

      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        let path = url.pathname;
        
        // Handle dynamic routes like /api/app/vault/[name]
        let filePath = '';
        let query: Record<string, string | string[]> = {};

        if (path.startsWith('/api/auth/')) {
          filePath = resolve(__dirname, 'api/auth/[...all].ts');
        } else if (path.startsWith('/api/app/vault/')) {
          const parts = path.split('/');
          const name = parts[parts.length - 1];
          filePath = resolve(__dirname, 'api/app/vault/[name].ts');
          query.name = name;
        } else {
          filePath = resolve(__dirname, `${path.slice(1)}.ts`);
        }

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
  },
  publicDir: 'public',
});
