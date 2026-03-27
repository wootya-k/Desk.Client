import { buildUrl } from 'config';
import { ObjectRecord, RawDataItem, ObjectView } from '@models';
export interface FetchOptions {
  status?: 'all' | 'true' | 'false';  // параметр для фильтрации
}

export const fetchAllObjects = async (
  type: string,
  options: FetchOptions = { status: 'true' }
): Promise<ObjectRecord[]> => {
  try {
    // Всегда запрашиваем ВСЕ данные с бэкенда, фильтрацию делаем на клиенте
    const url = await buildUrl(`/api/objects/type/${type}`);

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Ошибка при получении всех объектов: ' + response.statusText);
    }

    const rawData = await response.json();

    // Маппим в ObjectRecord
    const allObjects: ObjectRecord[] = rawData.map((item: RawDataItem) => ({
      id: item.id,
      value: item.value,
      status: item.status
    }));

    // Клиентская фильтрация по статусу
    if (options.status === 'all') {
      return allObjects;
    }

    const expectedActive = options.status === 'true';

    return allObjects.filter(obj => {
      const objStatus = obj.status;

      // Обработка boolean
      if (typeof objStatus === 'boolean') {
        return objStatus === expectedActive;
      }

      // Обработка строки 'true'/'false'
      if (typeof objStatus === 'string') {
        if (objStatus === 'true') return expectedActive;
        if (objStatus === 'false') return !expectedActive;

        // Попытка распарсить как JSON-boolean
        // ФИКС: явное приведение к string перед toLowerCase()
        try {
          const parsed = JSON.parse((objStatus as string).toLowerCase());
          return (parsed === true) === expectedActive;
        } catch {
          return expectedActive;
        }
      }

      // Если статуса нет или null — считаем активным по умолчанию
      return expectedActive;
    });

  } catch (error) {
    console.error('Ошибка при получении всех объектов:', error);
    throw error;
  }
};


export const restoreObjectById = async (id: string): Promise<void> => {
  try {
    const url = await buildUrl(`/api/objects/${id}`);
    
    // ✅ Тело под ваш UpdateObjectRequest: { "isRestored": true }
    const payload = { isRestored: true };

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      // 404 — объект не найден или уже активен
      if (response.status === 404) {
        throw new Error('Объект не найден или уже восстановлен');
      }
      throw new Error(`Ошибка при восстановлении: ${response.status} ${response.statusText}`);
    }
    // 204 No Content — успех
  } catch (error) {
    console.error('Ошибка при восстановлении объекта:', error);
    throw error;
  }
};

export const fetchObjectById = async (id: string): Promise<ObjectView> => {
  try {
    const url = await buildUrl(`/api/objects/views/${id}`);
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

export type DeleteMode = 'soft' | 'hard';

export const deleteObjectById = async (
  id: string, 
  mode: DeleteMode = 'soft'
): Promise<void> => {
  try {
    // Добавляем query-параметр mode
    const url = await buildUrl(`/api/objects/${id}?mode=${mode}`);
    const response = await fetch(url, { 
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text().catch(() => response.statusText);
      throw new Error(`Ошибка при удалении объекта: ${errorText}`);
    }
  } catch (error) {
    console.error('Ошибка при удалении объекта:', error);
    throw error;
  }
};

// types/validation.ts
export interface ValidationError {
  path: string;      // например: "name", "address.city"
  message: string;   // текст ошибки
}

export class ValidationException extends Error {
  constructor(
    message: string,
    public errors: Record<string, string[]> 
  ) {
    super(message);
    this.name = 'ValidationException';
  }
}


export type ApiSuccessResponse = { success: true; id?: string };
export type ApiErrorResponse = { success: false; errors: Record<string, string[]> };
export type ApiResponse = ApiSuccessResponse | ApiErrorResponse;

/**
 * Создает новый объект.
 * @param type Тип объекта (обязательно, например "employee")
 * @param value Данные объекта (JSON объект)
 */
export const createObject = async (
  type: string, 
  value: object
): Promise<ApiResponse> => {
  try {
    const url = await buildUrl(`/api/objects`); // Твоя функция построения URL
    
    // ✅ Формируем тело запроса строго под CreateObjectRequest
    const payload = {
      type: type,
      value: value
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    // ✅ 201 Created - Успех
    if (response.status === 201) {
      // Можно получить ID нового объекта из заголовка Location, если нужно
      const locationHeader = response.headers.get('Location');
      const newId = locationHeader ? locationHeader.split('/').pop() : undefined;
      
      return { success: true, id: newId };
    }

    // ✅ 422 Unprocessable Entity - Ошибка валидации схемы
    if (response.status === 422) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.errors) {
        throw new ValidationException(
          'Данные не соответствуют схеме типа',
          errorData.errors as Record<string, string[]>
        );
      }
    }

    // ✅ 400 Bad Request - Ошибка формата (нет type и т.д.)
    if (response.status === 400) {
      const errorData = await response.json().catch(() => null);
      // Проблема может быть в поле 'errors' или просто в 'detail'
      const errors = errorData?.errors || { _: [errorData?.detail || 'Неверный формат запроса'] };
      throw new ValidationException(
        'Ошибка формата запроса',
        errors as Record<string, string[]>
      );
    }

    // ✅ 401 / 403 - Проблемы с правами
    if (response.status === 401 || response.status === 403) {
      throw new Error('Нет прав доступа к операции');
    }

    // ✅ Любые другие ошибки (500 и т.д.)
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Ошибка сервера (${response.status}): ${errorText}`);

  } catch (error) {
    // Пробрасываем нашу красивую ошибку валидации дальше
    if (error instanceof ValidationException) {
      // Возвращаем объект с ошибкой, а не throw, если хочешь обрабатывать в UI через результат
      // Но обычно валидацию лучше выбрасывать (throw), чтобы ловить в глобальном обработчике.
      // Здесь я оставил throw, как в твоем оригинале.
      throw error;
    }
    
    console.error('[createObject] Критическая ошибка:', error);
    throw error;
  }
};

export const updateObject = async (
  id: string, 
  value: object,
  newType?: string // Опционально: передаем, если хотим сменить тип или создаем новый
): Promise<{ success: true; id?: string; created?: boolean } | { success: false; errors: Record<string, string[]> }> => {
  try {
    const url = await buildUrl(`/api/objects/${encodeURIComponent(id)}`);

    // ✅ Формируем тело под UpdateObjectRequest
    const payload: any = {
      value: value
    };

    // Добавляем type только если он передан
    if (newType) {
      payload.type = newType;
    }

    const response = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    // ✅ 204 No Content - Успешно ОБНОВЛЕН существующий
    if (response.status === 204) {
      return { success: true, created: false };
    }

    // ✅ 201 Created - Объекта не было, он был СОЗДАН (Upsert)
    if (response.status === 201) {
      const location = response.headers.get('Location');
      const newId = location ? location.split('/').pop() : undefined;
      // Возвращаем флаг created: true, чтобы UI понял, что это новый объект
      return { success: true, id: newId, created: true };
    }

    // ✅ 422 - Ошибка валидации
    if (response.status === 422) {
      const errorData = await response.json().catch(() => null);
      if (errorData?.errors) {
        throw new ValidationException('Ошибка валидации данных', errorData.errors);
      }
    }

    // ✅ 400 - Ошибка (например, пытаемся создать без type)
    if (response.status === 400) {
      const errorData = await response.json().catch(() => null);
      const errors = errorData?.errors || { _: [errorData?.detail || 'Неверный запрос'] };
      throw new ValidationException('Ошибка формата запроса', errors);
    }

    // ✅ Остальные ошибки
    const errorText = await response.text().catch(() => response.statusText);
    throw new Error(`Ошибка ${response.status}: ${errorText}`);

  } catch (error) {
    if (error instanceof ValidationException) throw error;
    console.error('[updateObject] Ошибка:', error);
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
    const url = await buildUrl(`/api/objects/history/${id}`);
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
