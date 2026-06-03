import { getAccessToken } from '@services/AuthService';

export function setupFetchInterceptor() {
  if (typeof window === 'undefined') return;
  
  const originalFetch = window.fetch;
  let isRedirecting = false;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = input instanceof URL ? input.toString() : 
                typeof input === 'string' ? input : input.url;

    const publicEndpoints = [
      '/auth/login',
      '/auth/refresh',
      '/public'
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
      const response = await originalFetch(input, {
        ...init,
        headers,
        credentials: 'include' // ВАЖНО: отправляем cookies с каждым запросом
      });
      
      if (response.status === 401 && !isPublic) {
        console.warn('Обнаружена 401 ошибка');
        
        if (window.location.pathname !== '/login' && !isRedirecting) {
          isRedirecting = true;
          console.warn('Сессия истекла. Перенаправляем на /login...');
          window.location.href = '/login';
        }
      }
      
      return response;
    } catch (error) {
      console.error('Ошибка сети:', error);
      throw error;
    }
  };
}