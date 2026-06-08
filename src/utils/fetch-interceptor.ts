import { getAccessToken, logout } from '@services/AuthService';

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
        credentials: 'include'
      });
      
      // Обработка 401 - сессия истекла или токен невалиден
      if (response.status === 401 && !isPublic) {
        console.warn('Обнаружена 401 ошибка');
        await handleUnauthorized();
      }
      
      // Обработка 403 - доступ запрещён или аккаунт заблокирован
      if (response.status === 403 && !isPublic) {
        console.warn('Обнаружена 403 ошибка');
        
        // Пытаемся определить тип ошибки из тела ответа
        try {
          const errorData = await response.clone().json();
          const errorMessage = errorData?.message || errorData?.title || '';
          
          // Если это блокировка аккаунта
          if (
            errorMessage.includes('заблокирован') ||
            errorMessage.includes('suspended') ||
            errorMessage.includes('AccountSuspended')
          ) {
            console.warn('Аккаунт заблокирован. Выполняем принудительный logout...');
            await handleAccountSuspended();
          } else {
            // Обычный 403 (доступ запрещён к ресурсу)
            console.warn('Доступ запрещён к ресурсу');
            // Не делаем редирект — пусть компонент сам обработает
          }
        } catch {
          // Не удалось распарсить JSON — считаем обычной ошибкой доступа
          console.warn('Доступ запрещён (не удалось прочитать ответ)');
        }
      }
      
      return response;
    } catch (error) {
      console.error('Ошибка сети:', error);
      throw error;
    }
  };

  // Обработка 401 - истечение сессии
  async function handleUnauthorized() {
    if (window.location.pathname === '/login' || isRedirecting) {
      return;
    }
    
    isRedirecting = true;
    console.warn('Сессия истекла. Перенаправляем на /login...');
    
    const currentPath = window.location.pathname + window.location.search;
    const returnUrl = encodeURIComponent(currentPath);
    
    // Очищаем сессию
    await logout();
    
    window.location.href = `/login?returnUrl=${returnUrl}`;
  }

  // Обработка 403 - блокировка аккаунта
  async function handleAccountSuspended() {
    if (window.location.pathname === '/login' || isRedirecting) {
      return;
    }
    
    isRedirecting = true;
    console.warn('Аккаунт заблокирован. Перенаправляем на /login с ошибкой...');
    
    // Очищаем сессию
    await logout();
    
    // Редиректим с параметром ошибки
    window.location.href = `/login?error=suspended`;
  }
}