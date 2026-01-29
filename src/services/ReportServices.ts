// services/ReportServices.ts
import { buildUrl } from 'config';

export interface ReportView {
  title: string;
  metaTitle: string;
  target: string;
  metaTarget: string;
}

export const reportListView = async (): Promise<ReportView[]> => {
    const url = await buildUrl(`/api/Reports/ReportListView`);
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
};

/**
 * Проверка доступности печати для типа объекта
 * @param id Тип объекта
 * @returns {Promise<boolean>} Доступна ли печать
 */
export const checkPrintable = async (id: string): Promise<boolean> => {
    const url = await buildUrl(`/api/Reports/${id}/Check`);
    const response = await fetch(url);
    
    if (response.status === 204) {
        // 204 No Content - возвращаем false
        return false;
    }
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    // Для статуса 200 читаем ответ как текст
    const text = await response.text();
    console.log('Ответ сервера:', text);

    // Если есть любой текст (непустой) - возвращаем true
    return text.length > 0;
};


/**
 * Генерация отчета
 * @param id ID объекта
 * @returns {Promise<Blob>} Сгенерированный отчет
 */
export const generateReport = async (id: string): Promise<Blob> => {
    const url = await buildUrl(`/api/Reports/${id}/Generate`);
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
        throw new Error('Ошибка генерации отчета');
    }
    
    return await response.blob();
};

/**
 * Получение списка типов отчетов
 * @returns {Promise<ReportType[]>} Список типов отчетов
 */
export const fetchReportTypes = async (): Promise<ReportType[]> => {
    const url = await buildUrl('/api/Reports/Types');
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('Ошибка получения типов отчетов');
    }
    
    return await response.json();
};


export interface ReportType {
  id: string;
  name: string;
  intervalDays: number;
  objectTypeId: string;
}
/**
 * Создание нового типа отчета
 * @param data Данные для создания
 * @returns {Promise<ReportType>} Созданный тип отчета
 */
export const createReportType = async (data: Omit<ReportType, 'id'>): Promise<ReportType> => {
    const url = await buildUrl('/api/Reports/Types');
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    if (!response.ok) {
        throw new Error('Ошибка создания типа отчета');
    }
    
    return await response.json();
};

/**
 * Получение просроченных отчетов
 * @returns {Promise<Report[]>} Список просроченных отчетов
 */
export const fetchOverdueReports = async (): Promise<Report[]> => {
    const url = await buildUrl('/api/Reports/Overdue');
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error('Ошибка получения отчетов');
    }
    
    return await response.json();
};

/**
 * Печать отчета
 * @param id ID отчета
 * @returns {Promise<Blob>} PDF-документ
 */
export const printReport = async (id: string): Promise<Blob> => {
    const url = await buildUrl(`/api/Reports/Print/${id}`);
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
        throw new Error('Ошибка печати отчета');
    }
    
    return await response.blob();
};