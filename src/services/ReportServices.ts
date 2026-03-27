// services/ReportServices.ts
import { buildUrl } from 'config';

export interface ReportView {
  title: string;
  metaTitle: string;
  target: string;
  metaTarget: string;
}

/**
 * Проверка доступности печати для типа объекта
 * @param id Тип объекта
 * @returns {Promise<boolean>} Доступна ли печать
 */
export const checkPrintable = async (id: string): Promise<boolean> => {
    const url = await buildUrl(`/api/reports/${id}/check`);
    const response = await fetch(url);
    
    if (response.status === 204) {
        return false;
    }
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    return text.length > 0;
};

/**
 * Генерация и скачивание отчета
 * @param id ID объекта
 * @param type Тип отчета (шаблона)
 * @returns {Promise<void>} Файл скачивается автоматически с именем из заголовка
 */
export const generateReport = async (id: string, type: string): Promise<void> => {
    const url = await buildUrl(`/api/reports/${id}/generate/${type}`);
    const response = await fetch(url, { method: 'POST' });
    
    if (!response.ok) {
        const errorText = await response.text().catch(() => 'Неизвестная ошибка');
        throw new Error(`Ошибка генерации отчета: ${errorText}`);
    }
    
    // ✅ Извлекаем имя файла — пробуем несколько вариантов заголовка
    const contentDisposition = 
        response.headers.get('Content-Disposition') || 
        response.headers.get('content-disposition');
    
    let fileName = `report_${type}.docx`; // fallback
    
    if (contentDisposition) {
        // Вариант 1: filename*=UTF-8''encoded_name (RFC 5987)
        const utf8Match = contentDisposition.match(/filename\*=UTF-8''([^;\s"]+)/i);
        if (utf8Match?.[1]) {
            fileName = decodeURIComponent(utf8Match[1]);
        } 
        // Вариант 2: filename="name" или filename=name
        else {
            const regularMatch = contentDisposition.match(/filename=["']?([^;"'\s]+)["']?/i);
            if (regularMatch?.[1]) {
                fileName = regularMatch[1];
            }
        }
    }
    
    // Скачивание
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.setAttribute('download', fileName);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
};
