import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {resolve} from 'path';
import {fileURLToPath} from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/artifacts',
    emptyOutDir: false,
    lib: {
      entry: {
        'easy-code-editor': resolve(__dirname, 'src/main.ts'),
        'easy-code-editor-react': resolve(__dirname, 'src/component/language/react/index.tsx'),
        'easy-code-editor-vue': resolve(__dirname, 'src/component/language/vue/index.ts'),
        'easy-code-editor-angular': resolve(__dirname, 'src/component/language/angular/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      external: [
        'react',
        'react/jsx-runtime',
        'vue',
        '@angular/core',
        '@angular/forms',
      ],
    },
  },
  publicDir: false,
});
