import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import 'index.css';
import App from 'component/App';
import { initializeConfig } from 'config';
import { setupFetchInterceptor } from 'utils/fetch-interceptor';

const startApp = async () => {
  await initializeConfig();

  setupFetchInterceptor();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <App />
    </StrictMode>
  );
};



startApp();