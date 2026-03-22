// // import tailwindcss from '@tailwindcss/vite';
// import react from '@vitejs/plugin-react';
// import path from 'path';
// import { fileURLToPath } from 'url';

// const __dirname = path.dirname(fileURLToPath(import.meta.url));

// import {defineConfig, loadEnv} from 'vite';


// export default defineConfig(({mode}) => {
//   const env = loadEnv(mode, '.', '');
//   return {
//     plugins: [react()],
//     define: {
//       'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
//     },
//     resolve: {
//       alias: {
//         '@': path.resolve(__dirname, '.'),
//       },
//     },
//     server: {
//        hmr: import.meta.env.VITE_DISABLE_HMR !== 'true',
      
//     },
//   };
// });


import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
});