// AuthService.ts
import { buildUrl } from 'config';
interface AuthState {
  accessToken: string | null;
  user: UserDto | null;
}
interface AuthResponse {
  accessToken: string;
  refreshToken: RefreshTokenDto;
  user: UserDto;
}
export interface UserDto {
  login: string;
  firstName: string;
  lastName: string;
  patronymic: string;
  position: string;
  positionPreview: string;
  role: string;
}

interface RefreshTokenDto {
  tokenId: string;
  refreshToken: string;
}

let authState: AuthState = {
  accessToken: sessionStorage.getItem('accessToken'),
  user: JSON.parse(sessionStorage.getItem('user') || 'null')
};

let refreshToken: RefreshTokenDto | null = JSON.parse(
  localStorage.getItem('refreshToken') || 'null'
);

let tokenRefreshTimer: number | null = null;
const subscribers = new Set<() => void>();

// Система подписчиков для обновления UI
const notifySubscribers = () => subscribers.forEach(cb => cb());
export const subscribe = (callback: () => void) => {
  subscribers.add(callback);
  return () => subscribers.delete(callback);
};

const updateAuthState = (newState: Partial<AuthState>) => {
  authState = { ...authState, ...newState };

  if (newState.accessToken) {
    sessionStorage.setItem('accessToken', newState.accessToken);
  }

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
      body: JSON.stringify({ login: loginStr, password }),
    });

    // Обрабатываем ошибки HTTP
    if (!response.ok) {
      let errorMessage = 'Ошибка авторизации';
      
      // Парсим тело ошибки, если оно есть
      let errorBody = '';
      try {
        errorBody = await response.text();
      } catch (e) {
        // Не удалось прочитать тело ошибки
      }

      // Специфичные сообщения на основе статуса
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

    // Успешный ответ
    const data: AuthResponse = await response.json();

    updateAuthState({
      accessToken: data.accessToken,
      user: data.user
    });

    localStorage.setItem('refreshToken', JSON.stringify(data.refreshToken));
    refreshToken = data.refreshToken;
    scheduleTokenRefresh(data.accessToken);

    return data.user;
    
  } catch (error) {
    // Обрабатываем сетевые ошибки
    if (error instanceof TypeError) {
      throw new Error('Сетевая ошибка: проверьте подключение');
    }
    
    // Пробрасываем уже обработанные ошибки
    throw error;
  }
};

export const logout = async (): Promise<void> => {
  try {
    const url = await buildUrl(`/api/auth/logout/${refreshToken?.tokenId}`);
    await fetch(url, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${authState.accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } finally {
    sessionStorage.clear();
    localStorage.removeItem('refreshToken');
    refreshToken = null;
    updateAuthState({ accessToken: null, user: null });

    if (tokenRefreshTimer) {
      clearTimeout(tokenRefreshTimer);
    }
  }
};

export const refreshAccessToken = async (): Promise<string> => {
  if (!refreshToken) throw new Error('Сессия истекла');

  const url = await buildUrl(`/api/auth/refresh`);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tokenId: refreshToken.tokenId,
      refreshToken: refreshToken.refreshToken
    }),
  });

  const newAccessToken = await response.text();
  updateAuthState({ accessToken: newAccessToken });
  scheduleTokenRefresh(newAccessToken);

  return newAccessToken;
};

export const scheduleTokenRefresh = (token: string): void => {
  if (tokenRefreshTimer) clearTimeout(tokenRefreshTimer);

  const decoded = JSON.parse(atob(token.split('.')[1]));
  const expiresIn = decoded.exp * 1000 - Date.now();
  const refreshTime = Math.max(expiresIn - 60000, 0);

  tokenRefreshTimer = setTimeout(async () => {
    try {
      await refreshAccessToken();
    } catch {
      logout();
    }
  }, refreshTime);
};

export const getCurrentUser = (): UserDto | null => authState.user;
export const getAccessToken = (): string | null => authState.accessToken;
export const isAuthenticated = (): boolean => !!refreshToken && !!authState.accessToken;


if (import.meta.env.DEV) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).AuthService = {
    getCurrentUser,
    getAccessToken,
    isAuthenticated
  };
}
