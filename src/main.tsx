import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'index.css';
import App from 'component/App';
import { initializeConfig } from 'config';
import { setupFetchInterceptor } from 'utils/fetch-interceptor';
import { initAuth } from '@services/AuthService';

const startApp = async () => {
  // 1. Инициализация конфигурации
  await initializeConfig();

  // 2. Настройка интерцептора
  setupFetchInterceptor();

  // 3. Восстановление сессии (если есть refresh token в cookie)
  await initAuth();

  // 4. Рендеринг приложения
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};

startApp();