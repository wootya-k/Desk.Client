import { buildUrl } from 'config';
import { JsonSchema, MergedColumn, TableSettings } from '@models';
import $RefParser from '@apidevtools/json-schema-ref-parser';

export const fetchFieldTitlesById = async (id: string): Promise<{
  objectType: string;
  fieldTitles: { [key: string]: string };
}> => {
  try {
    const url = await buildUrl(`/api/schemas/${id}/validation`);
    const response = await fetch(url);
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