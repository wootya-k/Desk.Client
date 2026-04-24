// utils/i18n.ts
import type { ErrorObject } from 'ajv';
import type { JsonFormsI18nState, Translator, UISchemaElement } from '@jsonforms/core';

const ruMessages: Record<string, string | ((params: any) => string)> = {
  required: 'обязательно для заполнения',
  minLength: (p: any) => `должно содержать не менее ${p.limit} символов`,
  maxLength: (p: any) => `должно содержать не более ${p.limit} символов`,
  pattern: 'не соответствует требуемому формату',
  minimum: (p: any) => `должно быть не меньше ${p.limit}`,
  maximum: (p: any) => `должно быть не больше ${p.limit}`,
  exclusiveMinimum: (p: any) => `должно быть больше ${p.limit}`,
  exclusiveMaximum: (p: any) => `должно быть меньше ${p.limit}`,
  multipleOf: (p: any) => `должно быть кратно ${p.multipleOf}`,
  type: (p: any) => {
    const map: Record<string, string> = {
      string: 'текстом', number: 'числом', integer: 'целым числом',
      boolean: 'значением да/нет', array: 'списком', object: 'объектом'
    };
    return `должно быть ${map[p.type] || p.type}`;
  },
  format: (p: any) => {
    const map: Record<string, string> = {
      email: 'корректным email-адресом',
      uri: 'корректным URL-адресом',
      date: 'датой в формате ГГГГ-ММ-ДД',
      'date-time': 'датой и временем в формате ISO'
    };
    return `должно быть ${map[p.format] || 'в правильном формате'}`;
  },
  minItems: (p: any) => `должно содержать не менее ${p.limit} элементов`,
  maxItems: (p: any) => `должно содержать не более ${p.limit} элементов`,
  uniqueItems: 'не должно содержать дубликатов',
  enum: 'должно быть одним из разрешённых значений',
  const: 'имеет недопустимое значение',
  not: 'не должно соответствовать условию',
  anyOf: 'не соответствует ни одному из допустимых вариантов',
  oneOf: 'должно соответствовать ровно одному из вариантов',
};

// ✅ ПРАВИЛЬНАЯ сигнатура: третий параметр — uischema?: UISchemaElement
export const translateError = (
  error: ErrorObject,
  _translate: Translator,
  _uischema?: UISchemaElement
): string => {
  const keyword = error.keyword;
  if (!keyword) return error.message || 'Ошибка валидации';

  const rule = ruMessages[keyword];
  if (!rule) return error.message || 'Ошибка валидации';

  if (typeof rule === 'function') {
    try {
      return rule(error.params || {});
    } catch {
      return error.message || 'Ошибка валидации';
    }
  }

  const field = error.instancePath?.replace(/^\//, '').replace(/\//g, '.');
  const prefix = field ? `"${field}" ` : '';
  return `${prefix}${rule}`.trim();
};

export const i18nRu: JsonFormsI18nState = {
  locale: 'ru',
  translateError,
};