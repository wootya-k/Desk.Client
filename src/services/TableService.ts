import { buildUrl } from 'config';
import { JsonSchema, MergedColumn, TableSettings } from '@models';
import $RefParser from '@apidevtools/json-schema-ref-parser';

export const fetchFieldTitlesById = async (id: string): Promise<{
  objectType: string;
  fieldTitles: { [key: string]: string };
}> => {
  try {
    const url = await buildUrl(`/api/Schemas/ValidById/${id}`);
    const response = await fetch(url
  //     , {
  //     method: 'GET', 
  //     headers: {
  //       'X-Custom-Path': '/ws'
  //     }
  // }
);
    if (!response.ok) {
      throw new Error('Ошибка при получении схемы по ID: ' + response.statusText);
    }
    const rawData = await response.json();

    const parser = new $RefParser();

    try {
      // Используем только поддерживаемые опции
      await parser.resolve(rawData as any);

      const schema = parser.schema as JsonSchema;
      const fieldTitles: { [key: string]: string } = {};

      if (schema.properties) {
        Object.entries(schema.properties).forEach(([key, value]) => {
          // Безопасное извлечение title с проверкой типа
          const propValue = value as any;
          if (propValue && typeof propValue.title === 'string') {
            fieldTitles[key] = propValue.title;
          } else if (propValue && propValue.$ref) {
            try {
              const resolved = parser.$refs.get(propValue.$ref) as any;
              if (resolved && typeof resolved.title === 'string') {
                fieldTitles[key] = resolved.title;
              } else {
                fieldTitles[key] = "Словарь недоступен";
              }
            } catch {
              fieldTitles[key] = "Словарь недоступен";
            }
          } else {
            fieldTitles[key] = "Название поля не найдено";
          }
        });
      }

      // Безопасное извлечение title из rawData
      const objectType = (rawData as any).title && typeof (rawData as any).title === 'string'
        ? (rawData as any).title
        : id;

      return {
        objectType,
        fieldTitles
      };

    } catch (resolveError) {
      console.error('Ошибка при разыменовании схемы:', resolveError);
      const fallbackFieldTitles: { [key: string]: string } = {};
      if ((rawData as any).properties) {
        Object.keys((rawData as any).properties).forEach(key => {
          fallbackFieldTitles[key] = "Ошибка загрузки поля";
        });
      }

      // Безопасное извлечение title из rawData
      const objectType = (rawData as any).title && typeof (rawData as any).title === 'string'
        ? (rawData as any).title
        : id;

      return {
        objectType,
        fieldTitles: fallbackFieldTitles
      };
    }

  } catch (error) {
    console.error('Ошибка при получении названий полей:', error);
    throw new Error(`Не удалось загрузить метаданные для типа "${id}"`);
  }
};

export const updateObjectTypeCategory = async (id: string, newCategory: string): Promise<boolean> => {
  const url = await buildUrl(`/api/object-types/${id}`);
  const response = await fetch(url, {
    method: 'PATCH',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(newCategory),
  });

  if (!response.ok) {
    throw new Error(`Не удалось обновить категорию: ${response.statusText}`);
  }

  return response.json(); // твой бэк возвращает bool
};

export async function getMergedSetting(id: string): Promise<MergedColumn[]> {
  const schemaObj = await fetchFieldTitlesById(id);
  const schema: string[] = Object.keys(schemaObj.fieldTitles);

  const response = await fetch(`/api/Setting/GetById/${id}`);
  const rawSetting: TableSettings = await response.json();

  const merged: MergedColumn[] = [];

  for (const key of schema) {
    const value = (rawSetting as any)[key];
    merged.push({
      key,
      visible: value !== 0,
      order: typeof value === 'number' ? value : Number.MAX_SAFE_INTEGER,
    });
  }

  merged.sort((a, b) => a.order - b.order);

  return merged;
}