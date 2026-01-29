import { buildUrl } from 'config';
import { ObjectRecord, RawDataItem, ObjectView } from '@models';
import { validate } from 'json-schema';

export const fetchAllObjects = async (type: string): Promise<ObjectRecord[]> => {
  try {
    const url = await buildUrl(`/api/Objects/type/${type}`);
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка при получении всех объектов: ' + response.statusText);
    }

    const rawData = await response.json();
    const objects: ObjectRecord[] = rawData.map((item: RawDataItem) => ({
      id: item.id,
      value: item.value,
    }));
    
    return objects;
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
