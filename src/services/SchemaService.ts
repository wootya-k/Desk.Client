import { buildUrl } from 'config';

export interface UISchema {
  type: "VerticalLayout";
  elements: {
    type: "Control";
    label: string;
    scope: string;
  }[];
}

export interface JSONSchema {
  $id: string;
  type: "object";
  title: string;
  properties: Record<string, {
    type?: string;
    $ref?: string;
    title: string;
  }>;
  required: string[];
  metadata: string[]; // Используем только metadata
}

export interface SchemaEditorDto {
    id: string;
    title: string;
    restricted: boolean;
    viewCategory: string;
    schemaValid: string;
    schemaForms: string;
}

export const createSchema = async (id: string, dto: SchemaEditorDto) => {
    const url = await buildUrl(`/api/Schemas/${encodeURIComponent(id)}`);
    const requestDto = {
        ...dto,
        Id: id
    };

    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestDto)
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Ошибка создания схемы');
    }
    
    return response.json();
};

export const updateSchema = async (id: string, dto: SchemaEditorDto) => {
    const url = await buildUrl(`/api/Schemas/${encodeURIComponent(id)}`);
    const requestDto = {
        ...dto,
        Id: id
    };

    const response = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestDto)
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Ошибка обновления схемы');
    }
    
    return response.json();
};

export const deleteSchema = async (id: string) => {
    const url = await buildUrl(`/api/Schemas/${encodeURIComponent(id)}`);

    const response = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
    });
    
    if (!response.ok) {
        const error = await response.text();
        throw new Error(error || 'Ошибка удаления схемы');
    }

    return response.json();
};

export const fetchSchemaById = async (id: string) => {
    const url = await buildUrl(`/api/Schemas/${encodeURIComponent(id)}`);
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('Схема не найдена');
    }
    
    // Дожидаемся преобразования ответа в JSON
    const data: SchemaEditorDto = await response.json();
    console.log(data); // Теперь в консоль выводится значение
    return data;
};