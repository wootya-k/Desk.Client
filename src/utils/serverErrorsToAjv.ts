// utils/serverErrorsToAjv.ts
import { ErrorObject } from 'ajv';

/**
 * Конвертирует ошибки валидации с бэкенда в формат AJV ErrorObject[],
 * который понимает JsonForms.
 * 
 * Backend format: { "/field": ["msg1", "msg2"] }
 * AJV format: { instancePath, schemaPath, keyword, message, params }
 */
export const convertServerErrorsToAjv = (
  serverErrors: Record<string, string[]>
): ErrorObject[] => {
  return Object.entries(serverErrors).flatMap(([instancePath, messages]) => {
    // instancePath уже приходит как "/military_rank" — оставляем как есть
    return messages.map((message): ErrorObject => {
      // 🎯 Определяем keyword по тексту ошибки (можно расширять)
      let keyword: string = 'custom';
      let params: Record<string, unknown> = {};

      if (message.includes('перечислении') || message.includes('enum')) {
        keyword = 'enum';
        params = { allowedValues: [] };
      } else if (message.includes('null') && message.includes('string')) {
        keyword = 'type';
        params = { type: 'string' };
      } else if (message.includes('null') && message.includes('number')) {
        keyword = 'type';
        params = { type: 'number' };
      } else if (message.includes('обязательно') || message.includes('required')) {
        keyword = 'required';
        params = { missingProperty: instancePath.replace(/^\//, '') };
      } else if (message.includes('минимум') || message.includes('minimum')) {
        keyword = 'minimum';
        params = { limit: 0 };
      } else if (message.includes('максимум') || message.includes('maximum')) {
        keyword = 'maximum';
        params = { limit: 100 };
      } else if (message.includes('формат') || message.includes('pattern')) {
        keyword = 'pattern';
        params = { pattern: '' };
      }

      return {
        instancePath,           // "/military_rank" — JsonForms сам найдёт поле
        schemaPath: `#/${keyword}`, // заглушка, JsonForms часто не использует
        keyword,
        message,                // показываем оригинальное сообщение с бэка
        params,
        // Опционально:
        // parentSchema: {},
        // data: undefined,
      };
    });
  });
};