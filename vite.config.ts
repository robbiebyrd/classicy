import tailwindcss from '@tailwindcss/vite';
import react from "@vitejs/plugin-react";
import path, { resolve } from "path";
import { defineConfig } from "vite";
import dts from 'vite-plugin-dts';
import VitePluginImageTools from 'vite-plugin-image-tools';
import richSvg from "vite-plugin-react-rich-svg";

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src/"),
            "@snd": path.resolve(__dirname, "./assets/sounds"),
            "@img": path.resolve(__dirname, "./assets/img"),
        },
    },
    plugins: [
    react(),
    dts({
        outDir: 'dist/types',
    }),
    richSvg(),
    tailwindcss(),
    VitePluginImageTools({
      quality: 100,
      enableWebp: true,
      enableDev:true,
      enableDevWebp:true
    })
    ],
    build: {
        sourcemap: true,
        lib: {
            entry: resolve(__dirname, 'src/index.ts'),
            formats: ['umd', "es"],
            name: 'classicy',
            fileName: (format) => `classicy.${format}.js`,
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'react/jsx-runtime'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                    'react/jsx-runtime': 'react/jsx-runtime'
                }
            }
        }
    }
});