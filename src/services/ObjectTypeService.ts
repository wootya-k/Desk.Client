import { buildUrl } from 'config';
import { ObjectType } from '@models';

export const fetchObjectTypes = async (): Promise<ObjectType[]> => {
  try {
    const url = await buildUrl('/api/Schemas/GetViewList');
    const response = await fetch(url);
    
    if (response.status === 401) {
      throw new Error('UNAUTHENTICATED');
    }
    
    if (!response.ok) { 
      throw new Error('Ошибка при загрузке типов объектов');
    }
    
    return await response.json();
    
  } catch (error) {
    console.error('Ошибка при получении типов объектов:', error);
    throw error;
  }
};


export const updateObjectTypeCategory = async (id: string, newCategory: string): Promise<boolean> => {
  const url = await buildUrl(`/api/Schemas/${id}`);
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
