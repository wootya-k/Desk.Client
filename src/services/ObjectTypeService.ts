import { buildUrl } from 'config';

// @services/ObjectTypeService.ts

export interface ObjectType {
    id: string;
    name: string;
    viewCategory: string;
    refs: string[];
}

export const fetchObjectTypes = async (): Promise<ObjectType[]> => {
  try {
    const url = await buildUrl('/api/schemas/views');
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

export const getObjectTypesMap = async (): Promise<Record<string, string>> => {
    try {
        const types = await fetchObjectTypes();
        return types.reduce((acc, type) => {
            acc[type.id] = type.name;
            return acc;
        }, {} as Record<string, string>);
    } catch (error) {
        console.error('Ошибка при создании мапы типов объектов:', error);
        return {};
    }
};

export const getObjectTypeNameById = (
    id: string | undefined, 
    typesMap: Record<string, string>
): string => {
    if (!id) return '';
    return typesMap[id] || id;
};

export const updateObjectTypeCategory = async (id: string, newCategory: string): Promise<boolean> => {
  const url = await buildUrl(`/api/schemas/${id}`);
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


