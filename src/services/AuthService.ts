import { buildUrl } from 'config';

export interface UserDto {
  login: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  position: string;
  positionPreview: string;
  role: string;
}

interface AuthResponse {
  accessToken: string;
  user: UserDto;
}

interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
}

// Access token храним в памяти (не в sessionStorage/localStorage)
let authState: AuthState = {
  accessToken: null,
  user: JSON.parse(sessionStorage.getItem('user') || 'null')
};

let tokenRefreshTimer: number | null = null;
const subscribers = new Set<() => void>();

const notifySubscribers = () => subscribers.forEach(cb => cb());

export const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

const updateAuthState = (newState: Partial<AuthState>) => {
  authState = { ...authState, ...newState };

  if (newState.user) {
    sessionStorage.setItem('user', JSON.stringify(newState.user));
  }

  notifySubscribers();
};

export const login = async (loginStr: string, password: string): Promise<UserDto> => {
  const url = await buildUrl(`/api/auth/login`);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include', // ВАЖНО: для работы с cookies
      body: JSON.stringify({ login: loginStr, password }),
    });

    if (!response.ok) {
      let errorMessage = 'Ошибка авторизации';
      let errorBody = '';

      try {
        errorBody = await response.text();
      } catch (e) {
        // Не удалось прочитать тело ошибки
      }

      switch (response.status) {
        case 404:
          errorMessage = 'Пользователь не найден';
          break;
        case 401:
          errorMessage = 'Неверный пароль';
          break;
        case 400:
          errorMessage = 'Ошибка валидации: ' + (errorBody || 'некорректные данные');
          break;
        case 500:
          errorMessage = 'Ошибка сервера';
          break;
        default:
          errorMessage = `Ошибка ${response.status}: ${errorBody || 'неизвестная ошибка'}`;
      }

      throw new Error(errorMessage);
    }

    const data: AuthResponse = await response.json();

    updateAuthState({
      accessToken: data.accessToken,
      user: data.user
    });

    scheduleTokenRefresh(data.accessToken);

    return data.user;

  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Сетевая ошибка: проверьте подключение');
    }

    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    const url = await buildUrl(`/api/auth/logout`);
    await fetch(url, {
      method: 'POST',
      credentials: 'include', // ВАЖНО
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Ошибка при выходе:', error);
  } finally {
    sessionStorage.clear();
    updateAuthState({ accessToken: null, user: null });

    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
      tokenRefreshTimer = null;
    }
  }
};

export const refreshAccessToken = async (): Promise<string> => {
  const url = await buildUrl(`/api/auth/refresh`);

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`Ошибка обновления токена: ${response.status}`);
  }

  const newAccessToken = await response.text();
  const cleanToken = newAccessToken.replace(/^"|"$/g, '');

  updateAuthState({ accessToken: cleanToken });
  scheduleTokenRefresh(cleanToken);

  return cleanToken;
};

export const scheduleTokenRefresh = (token: string): void => {
  if (tokenRefreshTimer) {
    clearTimeout(tokenRefreshTimer);
  }

  try {
    const decoded = JSON.parse(atob(token.split('.')[1]));
    const expiresIn = decoded.exp * 1000 - Date.now();
    const refreshTime = Math.max(expiresIn - 60000, 0);

    tokenRefreshTimer = window.setTimeout(async () => {
      try {
        await refreshAccessToken();
      } catch (error) {
        console.error('Не удалось обновить токен:', error);
        await logout();
      }
    }, refreshTime);
  } catch (error) {
    console.error('Ошибка при планировании обновления токена:', error);
  }
};

export const initAuth = async (): Promise<boolean> => {
  console.log('[Auth] Инициализация сессии...');
  
  // Если access token уже есть в памяти
  if (authState.accessToken) {
    scheduleTokenRefresh(authState.accessToken);
    
    // Если user есть в sessionStorage — всё ок
    if (authState.user) {
      return true;
    }
    
    // Иначе получаем user с сервера
    await fetchUser();
    return true;
  }

  // Пытаемся восстановить сессию через refresh token
  try {
    const token = await refreshAccessToken();
    
    // После refresh получаем user с сервера
    await fetchUser();
    
    return !!token;
  } catch (error) {
    console.error('[Auth] Не удалось восстановить сессию:', error);
    return false;
  }
};


const fetchUser = async (): Promise<void> => {
  if (!authState.accessToken) return;
  
  try {
    const url = await buildUrl('/api/auth/me');
    const response = await fetch(url, {
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`
      }
    });
    
    if (response.ok) {
      const user = await response.json();
      updateAuthState({ user });
    }
  } catch (error) {
    console.error('[Auth] Не удалось получить данные пользователя:', error);
  }
};


export const getCurrentUser = (): UserDto | null => authState.user;
export const getAccessToken = (): string | null => authState.accessToken;
export const isAuthenticated = (): boolean => !!authState.accessToken;

if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).AuthService = {
    getCurrentUser,
    getAccessToken,
    isAuthenticated,
    initAuth
  };
}