import { buildUrl } from 'config'; // Укажите правильный путь к функции buildUrl
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { DetailEntity } from '@models';

export const fetchDetailEntityById = async (
  id: string, 
  newType?: string
): Promise<DetailEntity> => {
  try {
    // ✅ Добавляем query-параметр, если newType передан
    const queryParams = newType ? `?newType=${encodeURIComponent(newType)}` : '';
    const url = await buildUrl(`/api/schemas/form/${id}${queryParams}`);
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка при получении FormEntity по ID: ' + response.statusText);
    }

    const rawData = await response.json();
    
    return {
      id: rawData.id,
      type: newType || rawData.type,
      schema: await $RefParser.dereference(JSON.parse(rawData.schema)),
      uiSchema: JSON.parse(rawData.uiSchema),
      data: JSON.parse(rawData.data)  // ✅ Вот тут было: пропущено "data:"
    };
  } catch (error) {
    console.error('Ошибка при получении FormEntity по ID:', error);
    throw error;
  }
};

// ✅ Добавь эту функцию в файл или в сервис
const fetchDetailEntityByIdWithNewType = async (
  id: string, 
  newType: string,
  signal?: AbortSignal
): Promise<any> => {
  try {
    const url = await buildUrl(`/api/schemas/form/${id}?newType=${encodeURIComponent(newType)}`);
    const response = await fetch(url, { signal });
    
    if (!response.ok) {
      throw new Error('Ошибка при получении формы с newType: ' + response.statusText);
    }

    const rawData = await response.json();
    return {
      id: rawData.id,
      type: newType, // 🔥 Переопределяем тип на новый
      schema: await $RefParser.dereference(JSON.parse(rawData.schema)),
      uiSchema: JSON.parse(rawData.uiSchema),
      data: JSON.parse(rawData.data)
    };
  } catch (error) {
    console.error('Ошибка при получении формы с newType:', error);
    throw error;
  }
};


export const fetchDetailEntityByType = async (type: string): Promise<DetailEntity> => {
  try {
    const url = await buildUrl(`/api/schemas/new-form/${type}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка при получении FormEntity по типу: ' + response.statusText);
    }

    const rawData = await response.json();

    return {
      id: rawData.id,
      type: rawData.type,
      schema: await $RefParser.dereference(JSON.parse(rawData.schema)),
      uiSchema: JSON.parse(rawData.uiSchema),
      data: JSON.parse(rawData.data)
    };
  } catch (error) {
    console.error('Ошибка при получении FormEntity по типу:', error);
    throw error;
  }
};
