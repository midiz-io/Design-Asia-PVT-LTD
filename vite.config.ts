import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import compression from "vite-plugin-compression";
import { ViteImageOptimizer } from 'vite-plugin-image-optimizer';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    // Handle SPA routing - serve index.html for all routes
    historyApiFallback: true,
  },
  plugins: [
    react(),
    compression({ algorithm: 'gzip' }),
    compression({ algorithm: 'brotliCompress', ext: '.br' }),
    ViteImageOptimizer({
      png: { quality: 80 },
      jpeg: { quality: 80 },
      jpg: { quality: 80 },
      webp: { lossless: true },
    }),
    mode === "development" && componentTagger(),
    mode === "development" && {
      name: 'whatsapp-local-proxy',
      configureServer(server) {
        server.middlewares.use(async (req, res, next) => {
          if (req.url?.startsWith('/api/whatsapp') && req.method === 'POST') {
            let body = '';
            req.on('data', (chunk) => {
              body += chunk;
            });
            req.on('end', async () => {
              try {
                const { number, type, message, mediaUrl } = JSON.parse(body);
                
                // Construct GET URL for the external WhatsApp API
                const url = new URL('http://api.geekhirusha.com/designasia.php');
                url.searchParams.append('number', number);
                url.searchParams.append('type', type);
                if (message) url.searchParams.append('message', message);
                if (mediaUrl) url.searchParams.append('mediaUrl', mediaUrl);

                console.log(`[Vite Local WhatsApp Proxy] Proxying to: ${url.toString()}`);
                
                const response = await fetch(url.toString(), {
                  method: 'GET',
                  headers: {
                    'Accept': 'application/json, text/plain, */*',
                  }
                });

                if (!response.ok) {
                  console.error(`[Vite Local WhatsApp Proxy] Error response: ${response.status}`);
                  res.writeHead(response.status, { 'Content-Type': 'application/json' });
                  res.end(JSON.stringify({ error: 'External API error', status: response.status }));
                  return;
                }

                const text = await response.text();
                let result;
                try {
                  result = JSON.parse(text);
                } catch (e) {
                  result = { status: text.trim() };
                }

                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, data: result }));
              } catch (err: any) {
                console.error('[Vite Local WhatsApp Proxy] Error processing request:', err);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: err.message || 'Internal proxy error' }));
              }
            });
            return;
          }
          next();
        });
      }
    }
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    // PWA optimization
    target: 'esnext',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          router: ['react-router-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select'],
          utils: ['@tanstack/react-query', 'lucide-react'],
          maps: ['leaflet', 'react-leaflet', 'maplibre-gl'],
          charts: ['recharts'],
          reports: ['jspdf', 'jspdf-autotable', 'exceljs']
        }
      }
    },
    // Optimize for PWA
    chunkSizeWarningLimit: 1000,
    assetsInlineLimit: 4096
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  // PWA specific optimizations
  define: {
    __PWA_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0')
  },
  // Handle base path for deployment
  base: '/'
}));
