import { buildUrl } from 'config'; // Укажите правильный путь к функции buildUrl
import $RefParser from '@apidevtools/json-schema-ref-parser';
import { DetailEntity } from '@models';

export const fetchDetailEntityById = async (id: string): Promise<DetailEntity> => {
  try {
    const url = await buildUrl(`/api/Schemas/form/${id}`);
    const response = await fetch(url
      // , {
      // method: 'GET', 
      // headers: {
      //   'X-Custom-Path': '/ws'
      // }}
    );
    if (!response.ok) {
      throw new Error('Ошибка при получении FormEntity по ID: ' + response.statusText);
    }

    const rawData = await response.json();
    console.log('1--------------------------------------------------------------');
    console.log(JSON.parse(rawData.schema));
    console.log('1--------------------------------------------------------------');
    console.log('0--------------------------------------------------------------');
    console.log(await $RefParser.dereference(JSON.parse(rawData.schema)));
    console.log('0--------------------------------------------------------------');
    return {
      id: rawData.id,
      type: rawData.type,
      schema: await $RefParser.dereference(JSON.parse(rawData.schema)),
      uiSchema: JSON.parse(rawData.uiSchema),
      data: JSON.parse(rawData.data)
    };
  } catch (error) {
    console.error('Ошибка при получении FormEntity по ID:', error);
    throw error;
  }
};

export const fetchDetailEntityByType = async (type: string): Promise<DetailEntity> => {
  try {
    const url = await buildUrl(`/api/Schemas/newform/${type}`);
    const response = await fetch(url
      // , {
      // method: 'GET', 
      // headers: {
      //   'X-Custom-Path': '/ws'
      // }}
    );
    if (!response.ok) {
      throw new Error('Ошибка при получении FormEntity по типу: ' + response.statusText);
    }

    const rawData = await response.json();

    console.log('--------------------------------------------------------------');
    console.log(JSON.parse(rawData.schema));
    console.log('--------------------------------------------------------------');
    console.log(await $RefParser.dereference(JSON.parse(rawData.schema)));
    console.log('--------------------------------------------------------------');

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
