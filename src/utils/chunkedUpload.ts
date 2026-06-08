// chunkedUpload.ts
import { buildUrl } from 'config';

const CHUNK_SIZE = 800 * 1024; // 800 KB — с запасом под multipart-overhead

export interface UploadProgress {
  loadedChunks: number;
  totalChunks: number;
  percent: number;
}

/**
 * Генерирует UUID v4. Работает в любом окружении (HTTP/HTTPS).
 */
function generateUUID(): string {
  // Если доступен crypto.randomUUID (только HTTPS) — используем его
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  
  // Если доступен crypto.getRandomValues — используем его для генерации UUID v4
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    return ([1e7] as any + -1e3 + -4e3 + -8e3 + -1e11).replace(/[018]/g, (c: any) =>
      (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16)
    );
  }
  
  // Fallback: Math.random() (не криптографически стойкий, но для fileId достаточно)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Загружает файл чанками на сервер с повтором неудачных попыток
 */
export async function uploadFileInChunks(
  file: File,
  onProgress?: (p: UploadProgress) => void,
  signal?: AbortSignal
): Promise<string> {
  const fileId = generateUUID();
  const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
  const uploadedChunks = new Set<number>();
  const url = await buildUrl('/api/import/excel/upload-chunk');

  let attempt = 0;
  const MAX_ATTEMPTS = 3;

  while (uploadedChunks.size < totalChunks && attempt < MAX_ATTEMPTS) {
    attempt++;
    const pending: number[] = [];
    for (let i = 0; i < totalChunks; i++) {
      if (!uploadedChunks.has(i)) pending.push(i);
    }

    for (const chunkIndex of pending) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

      const start = chunkIndex * CHUNK_SIZE;
      const end = Math.min(start + CHUNK_SIZE, file.size);
      const blob = file.slice(start, end);

      const formData = new FormData();
      formData.append('chunk', blob, file.name);
      formData.append('fileId', fileId);
      formData.append('chunkIndex', chunkIndex.toString());
      formData.append('totalChunks', totalChunks.toString());
      formData.append('fileName', file.name);

      const response = await fetch(url, {
        method: 'POST',
        body: formData,
        signal,
      });

      if (!response.ok) {
        const err = await response.json().catch(() => null);
        throw new Error(err?.error || `Ошибка загрузки чанка ${chunkIndex}`);
      }

      uploadedChunks.add(chunkIndex);
      onProgress?.({
        loadedChunks: uploadedChunks.size,
        totalChunks,
        percent: Math.round((uploadedChunks.size / totalChunks) * 100),
      });
    }
  }

  if (uploadedChunks.size < totalChunks) {
    throw new Error('Не удалось загрузить все чанки после нескольких попыток');
  }

  return fileId;
}