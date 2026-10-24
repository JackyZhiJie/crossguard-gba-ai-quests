import { defineConfig } from 'vite';

// React and three.js are loaded from cdnjs in the published page, so the bundle treats them as globals.
export default defineConfig(({ command }) => ({
  esbuild: { jsx: 'transform', jsxFactory: 'React.createElement', jsxFragment: 'React.Fragment' },
  build:
    command === 'build'
      ? {
          outDir: 'dist',
          emptyOutDir: true,
          cssCodeSplit: false,
          lib: { entry: 'src/main.tsx', formats: ['iife'], name: 'GbaQuests', fileName: () => 'app.js' },
          rollupOptions: {
            external: ['react', 'react-dom', 'react-dom/client', 'three'],
            output: {
              globals: { react: 'React', 'react-dom': 'ReactDOM', 'react-dom/client': 'ReactDOM', three: 'THREE' },
              assetFileNames: 'app.[ext]',
            },
          },
        }
      : undefined,
}));
