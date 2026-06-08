import { buildUrl } from 'config';

export interface EmployeeChange {
  changeId: string;
  militaryCategory: string;
  sequenceNumber: number;
  fullName: string;
  yearOfBirth: number;
  militaryRank: string;
  militarySpecialty: string;
  registrationAddress: string;
  residenceAddress: string;
  changeDescription: string;
  changedAt: string;
}

// Вспомогательная функция для сборки URL с query-параметрами
const buildRequestUrl = async (path: string, params: Record<string, string | number | undefined>) => {
  const base = await buildUrl(path);
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      searchParams.append(key, String(value));
    }
  });

  const query = searchParams.toString();
  return query ? `${base}?${query}` : base;
};

export const getEmployeeChanges = async (
  dateFrom?: Date,
  dateTo?: Date,
  normalizeDays: number = 60
): Promise<EmployeeChange[]> => {
  const url = await buildRequestUrl('/api/checkpoint/json', {
    dateFrom: dateFrom?.toISOString(),
    dateTo: dateTo?.toISOString(),
    NormalizeWithDefaults: normalizeDays,
  });

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    throw new Error(`Ошибка загрузки данных: ${response.statusText}`);
  }

  return response.json();
};

export const exportEmployeeChanges = async (
  dateFrom: Date,
  dateTo: Date,
  format: 'xlsx' | 'xls' | 'ods' = 'xlsx',
  normalizeDays: number = 60
): Promise<Blob> => {
  const url = await buildRequestUrl('/api/checkpoint/export', {
    dateFrom: dateFrom.toISOString(),
    dateTo: dateTo.toISOString(),
    format,
    NormalizeWithDefaults: normalizeDays,
  });

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Ошибка экспорта: ${errorText}`);
  }

  return response.blob();
};

export const downloadFile = (blob: Blob, fileName: string) => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};

export const deleteEmployeeChange = async (changeId: string): Promise<void> => {
  const url = await buildUrl(`/api/checkpoint/${changeId}`);

  const response = await fetch(url, {
    method: 'DELETE',
    credentials: 'include',
  });

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Запись не найдена');
    }
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Ошибка удаления: ${errorText}`);
  }
};