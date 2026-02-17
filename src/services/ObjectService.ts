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
  options: FetchOptions = { status: 'true' }  // 'true' по умолчанию
): Promise<ObjectRecord[]> => {
  try {
    let url = await buildUrl(`/api/Objects/type/${type}`);
    
    // Добавляем параметр статуса в URL, если он не 'all'
    if (options.status && options.status !== 'all') {
      url += `?status=${options.status}`;
    }
    // Если status = 'all' - не добавляем параметр, сервер вернет все записи
    
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка при получении всех объектов: ' + response.statusText);
    }

    const rawData = await response.json();
    return rawData.map((item: RawDataItem) => ({
      id: item.id,
      value: item.value,
      status: item.status
    }));
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
