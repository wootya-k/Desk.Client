// @services/ReportTemplateService.ts
import { buildUrl } from 'config';

export interface FieldOption {
  path: string;
  label: string;
  source: string;
}

export interface FieldGroup {
  title: string;        // обязательно string (Title из FieldGroupDto)
  fields: FieldOption[]; // обязательно массив
}

// СТРУКТУРА ТОЧНО КАК В ТВОЁМ API:
// userGroup — объект
// targetGroup — опциональный объект
// firstLevelGroups — объект (НЕ массив!)
// secondLevelGroups — объект (НЕ массив!)
export interface FieldExplorerData {
  userGroup: FieldGroup;
  targetGroup?: FieldGroup;
  firstLevelGroups: FieldGroup;
  secondLevelGroups: FieldGroup;
}

// DTO из /api/Reports/{id}
export interface ReportTemplateDto {
  id: string;
  title: string;
  schema: string; // JSON-строка
  file: string;   // base64
  targetType: string;
}

export interface CreateReportTemplateRequest {
  id: string;
  title: string;
  schemaReportJson: string;
  file: File;
}

export interface GenerateReportRequest {
  templateId: string;
  data: Record<string, unknown>;
}

// Схема для парсинга
export interface ReportSchema {
  fields: { path: string; required: boolean }[];
}

// Получение шаблона по ID → /api/Reports/{id}
export const fetchReportTemplateById = async (id: string): Promise<ReportTemplateDto> => {
  const url = await buildUrl(`/api/Reports/${encodeURIComponent(id)}`);
  const response = await fetch(url);

  if (!response.ok) {
    let errorMessage = `Не удалось загрузить шаблон "${id}"`;
    switch (response.status) {
      case 404:
        errorMessage = 'Шаблон не найден';
        break;
      case 500:
        errorMessage = 'Ошибка сервера при загрузке шаблона';
        break;
      default:
        errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const data: ReportTemplateDto = await response.json();
  return data;
};

// Получение структуры полей → /api/ReportTemplates/{id}
export const fetchFieldExplorer = async (id: string): Promise<FieldExplorerData> => {
  const url = await buildUrl(`/api/ReportTemplates/${encodeURIComponent(id)}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Не удалось загрузить структуру полей: ${response.status} ${response.statusText}`);
  }

   let result = await response.json();

   return result;
};

// Создание/обновление шаблона
export const saveReportTemplate = async (request: CreateReportTemplateRequest): Promise<{ id: string; title: string }> => {
  const url = await buildUrl(`/api/Reports/${encodeURIComponent(request.id)}`);

  const formData = new FormData();
  formData.append('title', request.title);
  formData.append('schemaReportJson', request.schemaReportJson);
  formData.append('file', request.file);

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    let errorMessage = 'Не удалось сохранить шаблон';
    let errorDetail = '';
    try {
      const errorJson = await response.json();
      if (errorJson.Message) {
        errorDetail = errorJson.Message;
      } else if (typeof errorJson === 'string') {
        errorDetail = errorJson;
      }
    } catch {
      // ignore
    }

    switch (response.status) {
      case 400:
        errorMessage = errorDetail || 'Некорректные данные шаблона';
        break;
      case 500:
        errorMessage = 'Ошибка сервера при сохранении шаблона';
        break;
      default:
        errorMessage = `Ошибка ${response.status}: ${errorDetail || response.statusText}`;
    }

    throw new Error(errorMessage);
  }

  const result: { id: string; title: string } = await response.json();
  return result;
};

// Генерация отчёта
export const generateReport = async (request: GenerateReportRequest): Promise<Blob> => {
  const url = await buildUrl(`/api/Reports/${encodeURIComponent(request.templateId)}/Generate`);

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(request.data),
  });

  if (!response.ok) {
    let errorMessage = 'Не удалось сгенерировать отчёт';
    switch (response.status) {
      case 400:
        errorMessage = 'Некорректные данные для генерации';
        break;
      case 404:
        errorMessage = 'Шаблон не найден';
        break;
      case 500:
        errorMessage = 'Ошибка сервера при генерации печати';
        break;
      default:
        errorMessage = `Ошибка ${response.status}: ${response.statusText}`;
    }
    throw new Error(errorMessage);
  }

  const blob = await response.blob();
  return blob;
};

// Парсинг схемы
export const parseSchema = (schemaJson: string): ReportSchema => {
  try {
    return JSON.parse(schemaJson);
  } catch {
    return { fields: [] };
  }
};