import { buildUrl } from 'config';

export interface EmployeeChange {
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

export const getEmployeeChanges = async (
  dateFrom?: Date,
  dateTo?: Date,
  normalizeDays: number = 60
): Promise<EmployeeChange[]> => {
  const baseUrl = await buildUrl('/api/EmployeeChangesCheckpoint/json');
  const url = new URL(baseUrl);

  // Если даты не переданы — бэкенд сам возьмёт последние normalizeDays дней
  if (dateFrom) {
    url.searchParams.append('dateFrom', dateFrom.toISOString());
  }
  if (dateTo) {
    url.searchParams.append('dateTo', dateTo.toISOString());
  }
  url.searchParams.append('NormalizeWithDefaults', normalizeDays.toString());

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
  const baseUrl = await buildUrl('/api/EmployeeChangesCheckpoint/export');
  const url = new URL(baseUrl);

  url.searchParams.append('dateFrom', dateFrom.toISOString());
  url.searchParams.append('dateTo', dateTo.toISOString());
  url.searchParams.append('format', format);
  url.searchParams.append('NormalizeWithDefaults', normalizeDays.toString());

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