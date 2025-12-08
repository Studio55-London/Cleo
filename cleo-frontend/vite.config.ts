import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load environment variables
  const env = loadEnv(mode, process.cwd(), '')

  // API URL for production (Azure) or development (local)
  const apiUrl = env.VITE_API_URL || 'http://localhost:8080'

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    // Define environment variables for the app
    define: {
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
    server: {
      port: 3000,
      proxy: {
        '/api': {
          target: apiUrl,
          changeOrigin: true,
          // Don't proxy in production mode
          bypass: () => {
            if (mode === 'production') {
              return null
            }
          },
        },
      },
    },
    build: {
      // Production build settings
      outDir: 'dist',
      sourcemap: mode !== 'production',
      minify: mode === 'production',
      // Optimize chunk splitting for Azure Static Web Apps
      rollupOptions: {
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom', 'react-router-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          },
        },
      },
    },
    // Preview server settings (for testing production builds locally)
    preview: {
      port: 3000,
    },
  }
})
