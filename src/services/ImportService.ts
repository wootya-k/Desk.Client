import { buildUrl } from 'config';

// Типы данных, возвращаемых эндпоинтом preview
export interface ImportPreviewItem {
  sheetName: string;
  rowIndex: number;
  targetType: string;
  data: Record<string, any>;
  isValid: boolean;
  validationErrors: string[];
}

export interface ImportPreviewResponse {
  employees: ImportPreviewItem[];
  candidates: ImportPreviewItem[];
  subdivisions: ImportPreviewItem[];
  totalRows: number;
  validRows: number;
}

// Тип запроса для подтверждения (структура может немного отличаться в зависимости от вашего DTO на бэке)
export interface ImportConfirmRequest {
  employees: ImportPreviewItem[];
  candidates: ImportPreviewItem[];
  subdivisions: ImportPreviewItem[];
}

export interface ImportResultError {
  // Замените на реальную структуру ошибки с бэкенда, если она отличается
  message?: string;
  [key: string]: any; 
}

export interface ImportResult {
  errors: ImportResultError[];
  // Добавьте другие поля, если бэкенд их возвращает (например, createdCount, updatedCount)
  [key: string]: any;
}

/**
 * Загружает файл и получает превью данных без записи в БД
 */
export const previewImport = async (file: File): Promise<ImportPreviewResponse> => {
  const url = await buildUrl('/api/import/excel/preview');
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `Ошибка превью: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Подтверждает импорт и записывает данные в БД
 */
export const confirmImport = async (request: ImportConfirmRequest): Promise<ImportResult> => {
  const url = await buildUrl('/api/import/excel/confirm');

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  // 200 OK или 207 MultiStatus считаются успешными ответами от этого эндпоинта
  if (response.status === 200 || response.status === 207) {
    return await response.json();
  }

  const errorData = await response.json().catch(() => null);
  throw new Error(errorData?.error || `Ошибка подтверждения: ${response.statusText}`);
};