// src/services/QueryService.ts

import { buildUrl } from 'config';

export interface SavedQuery {
  id: number;
  name: string;
  body: string;
}

export const getFavoriteQueries = async (type?: string): Promise<SavedQuery[]> => {
  const baseUrl = await buildUrl('/api/queries');
  const url = new URL(baseUrl, window.location.origin);

  if (type) {
    url.searchParams.append('type', type);
  }

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Ошибка загрузки избранного: ${response.statusText}`);
  }
  return response.json();
};

// QueryService.ts
export const saveFavoriteQuery = async (
  type: string,
  name: string,
  body: string
): Promise<void> => {
  if (!body.trim()) {
    throw new Error('Запрос не может быть пустым');
  }

  const baseUrl = await buildUrl('/api/queries');
  const url = new URL(baseUrl, window.location.origin);

  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ type, name, body }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Ошибка сохранения запроса: ${errorText}`);
  }
};

// 👇 НОВОЕ: удаление по id
export const deleteFavoriteQuery = async (id: number): Promise<void> => {
  const baseUrl = await buildUrl(`/api/queries/${id}`);
  const url = new URL(baseUrl, window.location.origin);
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Ошибка удаления запроса: ${response.statusText}`);
  }
};


// services/QueryService.ts

export const updateFavoriteQuery = async (
  id: number,
  name: string,
  body: string,
  type: string  // 👈 НОВЫЙ обязательный параметр
): Promise<void> => {
  const baseUrl = await buildUrl(`/api/queries/${id}`);
  const url = new URL(baseUrl, window.location.origin);

  const response = await fetch(url, {
    method: 'PUT',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    // 👈 Отправляем все 3 поля, как ждёт CreateQueryRequest
    body: JSON.stringify({ type, name, body }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ошибка обновления запроса: ${response.statusText} ${text}`);
  }
};

export const reorderFavoriteQueries = async (
  queries: { id: number; order: number }[]
): Promise<void> => {
  const baseUrl = await buildUrl('/api/queries/reorder');
  const url = new URL(baseUrl, window.location.origin);
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ queries }),
  });
  if (!response.ok) {
    throw new Error(`Ошибка изменения порядка: ${response.statusText}`);
  }
};