import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path'; // Импортируем модуль path для работы с путями

export default defineConfig(({ mode, command }) => {
    // Загружаем переменные окружения в зависимости от режима
    const env = loadEnv(mode, process.cwd(), '');

    const pluginsConfig = [
            react(),
            tsconfigPaths()
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
            open: '/',          // Автооткрытие браузера
            proxy: {            // Прокси-настройки
                // Прокси для API-запросов
                '/api': {
                    target: env.PROXY_URL,
                    changeOrigin: true,
                    rewrite: (path) => path.replace(/^\/api/, ''),
                    secure: false,  // Для HTTPS с самоподписанными сертификатами
                },
                
                // Прокси для WebSockets (если нужно)
                '/socket.io': {
                    target: env.PROXY_URL,
                    ws: true,
                    changeOrigin: true,
                }
            }
        } 
        : undefined;

    const mainConfig = {
        plugins: pluginsConfig,
        define:  defineConfig,
        resolve: resolveConfig,
        server:  serverConfig,
    };

    return mainConfig;
});
