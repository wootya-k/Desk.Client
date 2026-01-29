import { getAccessToken } from '@services/AuthService';

export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;
  
  const originalFetch = window.fetch;
  let isRedirecting = false;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    // Преобразуем input в строку URL
    const url = input instanceof URL ? input.toString() : 
                typeof input === 'string' ? input : input.url;

    const publicEndpoints = [
      '/auth/login',
      '/auth/refresh',
      '/public',
      '/login'
    ];
    
    const isPublic = publicEndpoints.some(endpoint => url?.includes(endpoint));
    const headers = new Headers(init?.headers);
    
    if (!isPublic) {
      const token = getAccessToken();
      if (token) {
        headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    try {
      // Преобразуем URL обратно в нужный формат
      const finalInput = input instanceof URL ? input : input;
      
      const response = await originalFetch(finalInput, {
        ...init,
        headers
      });
      
      if (response.status === 401) {
        console.warn('Обнаружена 401 ошибка. Проверяем необходимость перенаправления...');
        
        if (!isPublic && 
            window.location.pathname !== '/login' && 
            !isRedirecting) {
          
          isRedirecting = true;
          console.warn('Сессия истекла. Перенаправляем на /login...');
          window.location.href = '/login';
        }
        return response;
      }
      
      return response;
    } catch (error) {
      console.error('Ошибка сети:', error);
      throw error;
    }
  };
}