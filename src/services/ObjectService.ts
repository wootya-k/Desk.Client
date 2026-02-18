import { buildUrl } from 'config';
import { ObjectRecord, RawDataItem, ObjectView } from '@models';
import { validate } from 'json-schema';


export interface FetchOptions {
  status?: 'all' | 'true' | 'false';  // параметр для фильтрации
}

// Использование:
// const activeObjects = await fetchAllObjects('type1'); // только true (по умолчанию)
// const allObjects = await fetchAllObjects('type1', { status: 'all' }); // все записи
// const inactiveObjects = await fetchAllObjects('type1', { status: 'false' }); // только false

export const fetchAllObjects = async (
  type: string,
  options: FetchOptions = { status: 'true' }
): Promise<ObjectRecord[]> => {
  try {
    // Всегда запрашиваем ВСЕ данные с бэкенда, фильтрацию делаем на клиенте
    const url = await buildUrl(`/api/Objects/type/${type}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка при получении всех объектов: ' + response.statusText);
    }

    const rawData = await response.json();

    // Маппим в ObjectRecord
    const allObjects: ObjectRecord[] = rawData.map((item: RawDataItem) => ({
      id: item.id,
      value: item.value,
      status: item.status
    }));

    // Клиентская фильтрация по статусу
    if (options.status === 'all') {
      return allObjects;
    }

    const expectedActive = options.status === 'true';

    return allObjects.filter(obj => {
      const objStatus = obj.status;

      // Обработка boolean
      if (typeof objStatus === 'boolean') {
        return objStatus === expectedActive;
      }

      // Обработка строки 'true'/'false'
      if (typeof objStatus === 'string') {
        if (objStatus === 'true') return expectedActive;
        if (objStatus === 'false') return !expectedActive;

        // Попытка распарсить как JSON-boolean
        // ФИКС: явное приведение к string перед toLowerCase()
        try {
          const parsed = JSON.parse((objStatus as string).toLowerCase());
          return (parsed === true) === expectedActive;
        } catch {
          return expectedActive;
        }
      }

      // Если статуса нет или null — считаем активным по умолчанию
      return expectedActive;
    });

  } catch (error) {
    console.error('Ошибка при получении всех объектов:', error);
    throw error;
  }
};

export const fetchObjectById = async (id: string): Promise<ObjectView> => {
  try {
    const url = await buildUrl(`/api/Objects/View/${id}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка при получении объекта по ID: ' + response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при получении объекта по ID:', error);
    throw error;
  }
};

export const deleteObjectById = async (id: string): Promise<void> => {
  try {
    const url = await buildUrl(`/api/objects/${id}`);
    const response = await fetch(url, { method: 'DELETE' });
    if (!response.ok) {
      throw new Error('Ошибка при удалении объекта: ' + response.statusText);
    }
  } catch (error) {
    console.error('Ошибка при удалении объекта:', error);
    throw error;
  }
};

export const createObject = async (type: string, value: object): Promise<boolean> => {
  try {
    const url = await buildUrl(`/api/Objects/${encodeURIComponent(type)}`);

    const controller = new AbortController();
    const signal = controller.signal;

    const response = await fetch(url, {
      method: 'POST',
      signal,
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    });
    signal.aborted
    if (!response.ok) {
      throw new Error('Ошибка при создании объекта: ' + response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при создании объекта:', error);
    throw error;
  }
};

export const updateObject = async (id: string, value: object): Promise<boolean> => {
  try {
    const url = await buildUrl(`/api/Objects/${encodeURIComponent(id)}`);

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(value)
    });

    if (!response.ok) {
      throw new Error('Ошибка при обновлении объекта: ' + response.statusText);
    }

    return await response.json();
  } catch (error) {
    console.error('Ошибка при обновлении объекта:', error);
    throw error;
  }
};


export interface ChangeHistory {
  stamp: string;
  userLogin: string;
  value: string;
}

interface ChangeHistoryDto {
  stamp: string;
  user: {
    login: string;
    firstName: string;
    lastName: string;
    patronymic: string;
    role: string;
  };
  value: string;
}

export const fetchHistoryById = async (id: string): Promise<ChangeHistory[]> => {
  try {
    const url = await buildUrl(`/api/Objects/History/${id}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Ошибка при получении истории: ${response.status} ${response.statusText}`);
    }

    let history = await response.json();

    let result = history.map((item: ChangeHistoryDto) => ({
      stamp: item.stamp,
      userLogin: `${item.user.firstName} ${item.user.lastName}`,
      value: item.value
    }))

    return result;
  } catch (error) {
    console.error('Ошибка при получении истории изменений:', error);
    throw error;
  }
};
