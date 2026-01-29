// src/services/QueryService.ts

import { buildUrl } from 'config';

export interface SavedQuery {
  id: number;
  body: string;
}

export const getFavoriteQueries = async (): Promise<SavedQuery[]> => {
  const url = await buildUrl('/api/Auth/Queries');
  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Ошибка загрузки избранного: ${response.statusText}`);
  }
  return response.json();
};

export const saveFavoriteQuery = async (query: string): Promise<void> => {
  if (!query.trim()) {
    throw new Error('Запрос не может быть пустым');
  }
  const encodedQuery = encodeURIComponent(query);
  const url = await buildUrl(`/api/Auth/?query=${encodedQuery}`);
  const response = await fetch(url, {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Ошибка сохранения запроса: ${response.statusText}`);
  }
};

// 👇 НОВОЕ: удаление по id
export const deleteFavoriteQuery = async (id: number): Promise<void> => {
  const url = await buildUrl(`/api/Auth/?id=${id}`);
  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });
  if (!response.ok) {
    throw new Error(`Ошибка удаления запроса: ${response.statusText}`);
  }
};