import { buildUrl } from 'config';
import { uploadFileInChunks, UploadProgress } from 'utils/chunkedUpload';

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
  fileId: string; // 🔥 новое поле
  employees: ImportPreviewItem[];
  candidates: ImportPreviewItem[];
  subdivisions: ImportPreviewItem[];
  totalRows: number;
  validRows: number;
}

export interface ImportResultError {
  message?: string;
  [key: string]: any;
}

export interface ImportResult {
  errors: ImportResultError[];
  [key: string]: any;
}

/**
 * Загружает файл чанками и получает превью данных без записи в БД
 */
export const previewImport = async (
  file: File,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal
): Promise<ImportPreviewResponse> => {
  // 1. Загружаем чанками
  const fileId = await uploadFileInChunks(file, onProgress, signal);

  // 2. Просим сервер собрать файл и распарсить
  const url = await buildUrl('/api/import/excel/complete');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId, fileName: file.name }),
    signal,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error || `Ошибка: ${response.statusText}`);
  }

  return await response.json();
};

/**
 * Подтверждает импорт по fileId (данные уже на сервере в кэше)
 */
export const confirmImport = async (fileId: string): Promise<ImportResult> => {
  const url = await buildUrl('/api/import/excel/confirm');
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  });

  if (response.status === 200 || response.status === 207) {
    return await response.json();
  }

  const errorData = await response.json().catch(() => null);
  throw new Error(errorData?.error || `Ошибка подтверждения: ${response.statusText}`);
};