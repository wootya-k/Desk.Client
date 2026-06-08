import { buildUrl } from 'config';
import $RefParser from '@apidevtools/json-schema-ref-parser';

// ✅ Явно определяем интерфейс с сырой схемой
export interface DetailEntityWithRaw {
    id: string;
    type: string;
    schema: any;
    uiSchema: any;
    data: Record<string, unknown>;
    rawSchema: string; // Сырая JSON-строка схемы (до dereference)
}

export const fetchDetailEntityById = async (
    id: string,
    newType?: string
): Promise<DetailEntityWithRaw> => {
    try {
        const queryParams = newType ? `?newType=${encodeURIComponent(newType)}` : '';
        const url = await buildUrl(`/api/schemas/form/${id}${queryParams}`);

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Ошибка при получении FormEntity по ID: ' + response.statusText);
        }

        const rawData = await response.json();
        const rawSchemaString = rawData.schema;

        return {
            id: rawData.id,
            type: newType || rawData.type,
            schema: await $RefParser.dereference(JSON.parse(rawSchemaString)),
            uiSchema: JSON.parse(rawData.uiSchema),
            data: JSON.parse(rawData.data) as Record<string, unknown>,
            rawSchema: rawSchemaString
        };
    } catch (error) {
        console.error('Ошибка при получении FormEntity по ID:', error);
        throw error;
    }
};

export const fetchDetailEntityByType = async (type: string): Promise<DetailEntityWithRaw> => {
    try {
        const url = await buildUrl(`/api/schemas/new-form/${type}`);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error('Ошибка при получении FormEntity по типу: ' + response.statusText);
        }

        const rawData = await response.json();
        const rawSchemaString = rawData.schema;

        return {
            id: rawData.id,
            type: rawData.type,
            schema: await $RefParser.dereference(JSON.parse(rawSchemaString)),
            uiSchema: JSON.parse(rawData.uiSchema),
            data: JSON.parse(rawData.data) as Record<string, unknown>,
            rawSchema: rawSchemaString
        };
    } catch (error) {
        console.error('Ошибка при получении FormEntity по типу:', error);
        throw error;
    }
};