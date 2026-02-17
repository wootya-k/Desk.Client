import { fetchAllObjects } from '@services/ObjectService';
import { ObjectRecord } from '@models';

/**
 * Интерфейс распарсенных данных из одного объекта
 */
export interface ParsedObjectData {
  id: string;
  class: string;
  direction: string;
  military_rank: string;
  rawValue: Record<string, unknown>;
}

/**
 * Типы строк таблицы (категории по должности/классу)
 * Убрал "Прочие" — только 3 основные категории
 */
export type RowCategory = 'Руководители' | 'Специалисты' | 'Рабочие';

/**
 * Типы колонок таблицы (категории по званию/направлению)
 * Убрал "Служащие" — только военные категории + призывники
 */
export type ColCategory = 'Офицеры' | 'Рядовые' | 'Призывники';

/**
 * Интерфейс полной матрицы статистики
 */
export interface StatsMatrix {
  rows: RowCategory[];
  cols: ColCategory[];
  data: Record<RowCategory, Record<ColCategory, number>>;
  rowTotals: Record<RowCategory, number>;
  colTotals: Record<ColCategory, number>;
  total: number;
}

/**
 * Список офицерских званий
 */
const OFFICER_RANKS = [
  'Младший лейтенант', 'Лейтенант', 'Старший лейтенант', 'Капитан',
  'Майор', 'Подполковник', 'Полковник',
  'Генерал-майор', 'Генерал-лейтенант', 'Генерал-полковник', 'Генерал армии', 'Маршал',
  'Адмирал', 'Вице-адмирал', 'Контр-адмирал'
];

/**
 * Список званий рядового и сержантского состава
 */
const PRIVATE_RANKS = [
  'Рядовой', 'Ефрейтор',
  'Младший сержант', 'Сержант', 'Старший сержант', 'Старшина',
  'Прапорщик', 'Старший прапорщик', 'Мичман', 'Старший мичман'
];

/**
 * Парсит JSON-строку из поля value
 */
export const parseObjectValue = (valueStr: string): Record<string, unknown> => {
  try {
    return JSON.parse(valueStr);
  } catch (e) {
    console.error('Failed to parse object value:', e);
    return {};
  }
};

/**
 * Классифицирует человека по строке и колонке
 * 
 * @param data - Распарсенные данные объекта
 * @returns Объект с категориями { row, col }
 */
export const categorizePerson = (data: ParsedObjectData): { row: RowCategory; col: ColCategory } => {
  // === Определение строки (Class) ===
  let row: RowCategory = 'Рабочие'; // По умолчанию
  const cls = (data.class || '').toLowerCase();
  
  if (cls.includes('рук')) {
    row = 'Руководители';
  } else if (cls.includes('спец')) {
    row = 'Специалисты';
  } else if (cls.includes('раб')) {
    row = 'Рабочие';
  }

  // === Определение колонки (Rank / Direction) ===
  let col: ColCategory = 'Рядовые'; // По умолчанию
  const direction = (data.direction || '').toLowerCase();
  const rank = data.military_rank || '';

  // Призывники определяются по direction (приоритет)
  if (direction.includes('призывник')) {
    col = 'Призывники';
  } else {
    // Проверка офицерских званий
    const isOfficer = OFFICER_RANKS.some(r => rank.includes(r));
    // Проверка рядовых/сержантских званий
    const isPrivate = PRIVATE_RANKS.some(r => rank.includes(r));

    if (isOfficer) {
      col = 'Офицеры';
    } else if (isPrivate) {
      col = 'Рядовые';
    } else {
      // Если звание не определено — считаем рядовым по умолчанию
      col = 'Рядовые';
    }
  }

  return { row, col };
};

/**
 * Рассчитывает полную матрицу статистики
 */
export const calculateStatsMatrix = (objects: ParsedObjectData[]): StatsMatrix => {
  const rows: RowCategory[] = ['Руководители', 'Специалисты', 'Рабочие'];
  const cols: ColCategory[] = ['Офицеры', 'Рядовые', 'Призывники'];

  // Инициализация матрицы
  const data: Record<RowCategory, Record<ColCategory, number>> = {
    'Руководители': { 'Офицеры': 0, 'Рядовые': 0, 'Призывники': 0 },
    'Специалисты': { 'Офицеры': 0, 'Рядовые': 0, 'Призывники': 0 },
    'Рабочие': { 'Офицеры': 0, 'Рядовые': 0, 'Призывники': 0 },
  };

  // Распределение объектов по ячейкам
  objects.forEach(obj => {
    const { row, col } = categorizePerson(obj);
    if (data[row] && data[row][col] !== undefined) {
      data[row][col]++;
    }
  });

  // Подсчёт итогов
  const rowTotals: Record<RowCategory, number> = { 
    'Руководители': 0, 
    'Специалисты': 0, 
    'Рабочие': 0 
  };
  const colTotals: Record<ColCategory, number> = { 
    'Офицеры': 0, 
    'Рядовые': 0, 
    'Призывники': 0 
  };
  let total = 0;

  rows.forEach(r => {
    cols.forEach(c => {
      const count = data[r][c];
      rowTotals[r] += count;
      colTotals[c] += count;
      total += count;
    });
  });

  return { rows, cols, data, rowTotals, colTotals, total };
};

/**
 * Основная функция — загружает данные и рассчитывает статистику
 */
export const getStatsForType = async (type: string): Promise<StatsMatrix> => {
  const records: ObjectRecord[] = await fetchAllObjects(type);
  
  const parsedData: ParsedObjectData[] = records.map(record => {
    const parsedValue = parseObjectValue(record.value);
    return {
      id: record.id,
      class: String(parsedValue['class'] || ''),
      direction: String(parsedValue['direction'] || ''),
      military_rank: String(parsedValue['military_rank'] || ''),
      rawValue: parsedValue
    };
  });

  return calculateStatsMatrix(parsedData);
};