// services/UserService.ts
import { buildUrl } from 'config';

// ============ TYPES ============

export type UserRole = 'Master' | 'Admin' | 'Editor' | 'Viewer';

export interface User {
  login: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  position: string;
  role: UserRole;
  organization: string;
  telephone?: string;
  city?: string;
  isSuspended?: boolean;
}

export interface CreateUserRequest {
  login: string;
  password: string;
  firstName: string;
  lastName: string;
  patronymic?: string;
  position: string;
  role: UserRole;
  organization: string;
  telephone?: string;
  city?: string;
}

export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  patronymic?: string;
  position?: string;
  role?: UserRole;
  organization?: string;
  telephone?: string;
  city?: string;
  isSuspended?: boolean;
}

// ============ ОШИБКИ ============

export class UserApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public details?: string
  ) {
    super(message);
    this.name = 'UserApiError';
  }
}

const handleApiError = async (response: Response, context: string): Promise<never> => {
  let details: string | undefined;
  try {
    details = await response.text();
  } catch {
    details = response.statusText;
  }

  switch (response.status) {
    case 400:
      throw new UserApiError(`Ошибка валидации: ${details}`, 400, details);
    case 401:
      throw new UserApiError('Нет прав доступа', 401, details);
    case 403:
      throw new UserApiError('Доступ запрещён', 403, details);
    case 404:
      throw new UserApiError(`Не найдено: ${details}`, 404, details);
    case 409:
      throw new UserApiError(`Конфликт: ${details}`, 409, details);
    default:
      throw new UserApiError(
        `${context}: ${response.status} ${response.statusText}`,
        response.status,
        details
      );
  }
};

// ============ API МЕТОДЫ ============

/**
 * Получить всех пользователей
 * GET /api/users
 */
export const fetchUsers = async (): Promise<User[]> => {
  try {
    const url = await buildUrl('/api/users');
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при получении пользователей');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[fetchUsers] Ошибка:', error);
    throw error;
  }
};

/**
 * Получить пользователя по логину
 * GET /api/users/{login}
 */
export const fetchUserByLogin = async (login: string): Promise<User> => {
  try {
    const url = await buildUrl(`/api/users/${encodeURIComponent(login)}`);
    const response = await fetch(url, {
      headers: { 'Accept': 'application/json' }
    });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при получении пользователя');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[fetchUserByLogin] Ошибка:', error);
    throw error;
  }
};

/**
 * Создать нового пользователя
 * POST /api/users
 */
export const createUser = async (request: CreateUserRequest): Promise<User> => {
  try {
    const url = await buildUrl('/api/users');
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при создании пользователя');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[createUser] Ошибка:', error);
    throw error;
  }
};

/**
 * Обновить пользователя
 * PUT /api/users/{login}
 */
export const updateUser = async (
  login: string,
  request: UpdateUserRequest
): Promise<void> => {
  try {
    const url = await buildUrl(`/api/users/${encodeURIComponent(login)}`);
    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при обновлении пользователя');
    }
    // 204 No Content — успех
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[updateUser] Ошибка:', error);
    throw error;
  }
};

/**
 * Удалить пользователя
 * DELETE /api/users/{login}
 */
export const deleteUser = async (login: string): Promise<void> => {
  try {
    const url = await buildUrl(`/api/users/${encodeURIComponent(login)}`);
    const response = await fetch(url, { method: 'DELETE' });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при удалении пользователя');
    }
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[deleteUser] Ошибка:', error);
    throw error;
  }
};

/**
 * Заморозить/разморозить пользователя
 * PATCH /api/users/{login}/suspend
 */
export const suspendUser = async (
  login: string,
  isSuspended: boolean
): Promise<void> => {
  try {
    const url = await buildUrl(`/api/users/${encodeURIComponent(login)}/suspend`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ isSuspended })
    });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при изменении статуса');
    }
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[suspendUser] Ошибка:', error);
    throw error;
  }
};

/**
 * Сменить пароль пользователя
 * PATCH /api/users/{login}/change-password
 */
export const changePassword = async (
  login: string,
  newPassword: string
): Promise<void> => {
  try {
    const url = await buildUrl(`/api/users/${encodeURIComponent(login)}/change-password`);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: newPassword })
    });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при смене пароля');
    }
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[changePassword] Ошибка:', error);
    throw error;
  }
};

/**
 * Сбросить пароль (отправка на почту)
 * POST /api/users/{login}/reset-password
 */
export const resetPassword = async (
  login: string,
  email: string
): Promise<{ message: string }> => {
  try {
    const url = await buildUrl(`/api/users/${encodeURIComponent(login)}/reset-password`);
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mail: email })
    });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при сбросе пароля');
    }

    return await response.json();
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[resetPassword] Ошибка:', error);
    throw error;
  }
};

/**
 * Сгенерировать случайный пароль на сервере
 * POST /api/users/{login}/generate-password
 */
export const generatePasswordOnServer = async (login: string): Promise<string> => {
  try {
    const url = await buildUrl(`/api/users/${encodeURIComponent(login)}/generate-password`);
    const response = await fetch(url, { method: 'POST' });

    if (!response.ok) {
      await handleApiError(response, 'Ошибка при генерации пароля');
    }

    const data = await response.json();
    return data.password;
  } catch (error) {
    if (error instanceof UserApiError) throw error;
    console.error('[generatePasswordOnServer] Ошибка:', error);
    throw error;
  }
};

// ============ КЛИЕНТСКАЯ УТИЛИТА ============

/**
 * Генерация пароля на клиенте (для формы создания/редактирования)
 * Не обращается к серверу — просто генерирует строку
 */
export const generatePasswordClient = (length: number = 12): string => {
  const lower = 'abcdefghijklmnopqrstuvwxyz';
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const digits = '0123456789';
  const special = '!@#$%^&*';
  const all = lower + upper + digits + special;

  // Гарантируем наличие символов каждого типа
  const pick = (chars: string) => chars[Math.floor(Math.random() * chars.length)];
  let password = pick(lower) + pick(upper) + pick(digits) + pick(special);

  for (let i = password.length; i < length; i++) {
    password += pick(all);
  }

  // Перемешиваем
  return password
    .split('')
    .sort(() => Math.random() - 0.5)
    .join('');
};

export interface UserFormData extends Omit<User, 'role'> {
  role: UserRole;
  password: string;
}