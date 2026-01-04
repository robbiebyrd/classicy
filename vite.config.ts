import react from "@vitejs/plugin-react";
import path, { resolve } from "path";
import { defineConfig } from "vite";
import dts from 'vite-plugin-dts';
import richSvg from "vite-plugin-react-rich-svg";
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
    resolve: {
        alias: {
            "@": path.resolve(__dirname, "./src/"),
            "@snd": path.resolve(__dirname, "./assets/sounds"),
            "@img": path.resolve(__dirname, "./assets/img"),
        },
    },
    plugins: [react(),
    dts({
        outDir: 'dist/types',
    }),
    richSvg(),
    tailwindcss(),
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