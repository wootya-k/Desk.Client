import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path'; // Импортируем модуль path для работы с путями
import { copyFileSync } from 'fs';

export default defineConfig(({ mode, command }) => {
    const env = loadEnv(mode, process.cwd(), '');

    const pluginsConfig = [
        react(),
        tsconfigPaths(),
        // Копируем правильный config.json в зависимости от режима
        {
            name: 'copy-config',
            closeBundle() {
                const configSource = mode === 'production' 
                    ? 'public/config.production.json'
                    : mode === 'staging'
                    ? 'public/config.staging.json'
                    : 'public/config.json';
                
                try {
                    copyFileSync(configSource, 'dist/config.json');
                    console.log(`Copied ${configSource} to dist/config.json`);
                } catch (error) {
                    console.error('Failed to copy config.json:', error);
                }
            }
        }
    ];

    const defineConfig = {
        'process.env': env, // Определяем process.env для использования в приложении
    };

    const resolveConfig = {
        alias: {
            '@': path.resolve(__dirname, './src'), // Алиас для src
            '@jsdevtools/ono': '@jsdevtools/ono/cjs/index.js', // Алиас для jsdevtools
            path: 'path-browserify', // Добавляем алиас для path
        },
    };

    const serverConfig = command === 'serve'
        ? {
        open: '/',
        proxy: {
            '/api': {
                target: env.PROXY_URL,
                changeOrigin: true,
                secure: false,
                ws: true
            }
        }
    }
        : undefined;

    const mainConfig = {
        plugins: pluginsConfig,
        define: defineConfig,
        resolve: resolveConfig,
        server: serverConfig,
    };

    return mainConfig;
});
