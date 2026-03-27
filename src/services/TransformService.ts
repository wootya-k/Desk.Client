// services/TransformService.ts
import { buildUrl } from 'config';

// ==================== TYPES ====================

export interface TransformEntity {
  id: string;
  type: string;
  title?: string;
  sourceType?: string;
  targetType?: string;
  [key: string]: unknown;
}

export type TransformType = string;

// ==================== ERRORS ====================

export class ApiError extends Error {
  constructor(
    public status: number,
    public message: string,
    public endpoint: string,
    public details?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, endpoint: string, details?: unknown) {
    super(422, message, endpoint, details);
    this.name = 'ValidationError';
  }
}

export class NetworkError extends Error {
  constructor(message: string, public originalError?: unknown) {
    super(message);
    this.name = 'NetworkError';
  }
}

// ==================== CACHE ====================

const cache = new Map<string, { data: TransformEntity[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 минут

const getCached = (key: string): TransformEntity[] | undefined => {
  const cached = cache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  return undefined;
};

const setCached = (key: string, data: TransformEntity[]): void => {
  cache.set(key, { data, timestamp: Date.now() });
};

export const invalidateTransformCache = (type?: TransformType): void => {
  if (type) {
    cache.delete(`transforms:${type}`);
  } else {
    cache.clear();
  }
};

// ==================== HELPERS ====================

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  signal?: AbortSignal
): Promise<T> {
  const url = await buildUrl(endpoint);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      signal,
      ...options,
    });

    if (response.status === 401 || response.status === 403) {
      throw new ApiError(
        response.status,
        'Access denied. Please check your permissions.',
        endpoint
      );
    }

    if (response.status === 422) {
      throw new ValidationError(
        'Request could not be processed',
        endpoint,
        await response.text().catch(() => undefined)
      );
    }

    if (!response.ok) {
      throw new ApiError(
        response.status,
        `HTTP error! status: ${response.status}`,
        endpoint,
        await response.text().catch(() => undefined)
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('Request aborted');
    }
    throw new NetworkError(
      `Failed to connect to ${endpoint}`,
      error
    );
  }
}

// ==================== PUBLIC API ====================

/**
 * Получает все transforms или фильтрует по типу
 */
export const getTransforms = async (
  type?: TransformType,
  signal?: AbortSignal,
  useCache: boolean = true
): Promise<TransformEntity[]> => {
  const cacheKey = type ? `transforms:${type}` : 'transforms:all';
  
  if (useCache) {
    const cached = getCached(cacheKey);
    if (cached) return cached;
  }

  const url = type ? `/api/transforms?type=${encodeURIComponent(type)}` : '/api/transforms';
  const data = await request<TransformEntity[]>(url, { method: 'GET' }, signal);
  
  // Нормализуем ответ
  const normalized = (data || []).map((item: any) => ({
    id: item.id,
    title: item.title || item.type || 'Без названия',
    sourceType: item.sourceType || '',
    targetType: item.targetType || '',
    ...item,
  }));
  
  setCached(cacheKey, normalized);
  return normalized;
};

/**
 * Алиас для getTransforms с типом
 */
export const getTransformsByType = (
  type: TransformType,
  signal?: AbortSignal
): Promise<TransformEntity[]> => {
  return getTransforms(type, signal);
};

/**
 * Создаёт новый transform
 */
export const createTransform = async (
  transform: Omit<TransformEntity, 'id'>,
  signal?: AbortSignal
): Promise<string> => {
  const response = await request<Response>(
    '/api/transforms',
    {
      method: 'POST',
      body: JSON.stringify(transform),
    },
    signal
  );

  const location = response.headers?.get('Location');
  if (location) {
    return location.split('/').pop() || '';
  }
  
  throw new Error('Created but could not retrieve ID');
};

/**
 * Удаляет transform по ID
 */
export const deleteTransform = async (
  id: string,
  signal?: AbortSignal
): Promise<boolean> => {
  try {
    await request<void>(
      `/api/transforms?id=${id}`,
      { method: 'DELETE' },
      signal
    );
    invalidateTransformCache();
    return true;
  } catch (error) {
    if (error instanceof ValidationError) {
      return false;
    }
    throw error;
  }
};

/**
 * Проверяет существование transform по типу
 */
export const transformExistsByType = async (
  type: TransformType,
  signal?: AbortSignal
): Promise<boolean> => {
  try {
    const items = await getTransformsByType(type, signal);
    return items.length > 0;
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) {
      return false;
    }
    throw error;
  }
};