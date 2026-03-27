// src/utils/panelLayoutUtils.ts

export interface PanelDimensions {
  width: number;
  height: number;
  headerHeight: number;
  margin: number;
}

export interface PanelPosition {
  x: number;
  y: number;
}

/**
 * Проверяет пересечение двух прямоугольников с учётом отступов
 */
export const checkOverlap = (
  pos1: PanelPosition,
  pos2: PanelPosition,
  dimensions: PanelDimensions
): boolean => {
  const { width, height, margin } = dimensions;

  const left1 = pos1.x - margin;
  const right1 = pos1.x + width + margin;
  const top1 = pos1.y - margin;
  const bottom1 = pos1.y + height + margin;

  const left2 = pos2.x - margin;
  const right2 = pos2.x + width + margin;
  const top2 = pos2.y - margin;
  const bottom2 = pos2.y + height + margin;

  // Если нет пересечения по любой оси — значит не пересекаются
  const noOverlap =
    right1 <= left2 ||
    right2 <= left1 ||
    bottom1 <= top2 ||
    bottom2 <= top1;

  return !noOverlap;
};

/**
 * Находит свободную позицию методом "спирального поиска"
 */
export const findNonOverlappingPosition = (
  targetPosition: PanelPosition,
  existingPositions: Record<string, PanelPosition>,
  dimensions: PanelDimensions,
  containerBounds: { width: number; height: number; scrollLeft: number; scrollTop: number }
): PanelPosition => {
  const { width, height } = dimensions;
  const { scrollLeft, scrollTop } = containerBounds;
  const visibleRight = scrollLeft + containerBounds.width;
  const visibleBottom = scrollTop + containerBounds.height;

  // Сначала пробуем целевую позицию
  if (
    !Object.values(existingPositions).some((pos) =>
      checkOverlap(targetPosition, pos, dimensions)
    ) &&
    targetPosition.x >= scrollLeft &&
    targetPosition.x + width <= visibleRight &&
    targetPosition.y >= scrollTop &&
    targetPosition.y + height <= visibleBottom
  ) {
    return targetPosition;
  }

  // Спиральный поиск: перебираем смещения по возрастающему радиусу
  const maxAttempts = 100;
  const step = dimensions.width + dimensions.margin;

  for (let attempt = 1; attempt < maxAttempts; attempt++) {
    const radius = Math.ceil(Math.sqrt(attempt));
    for (let dx = -radius; dx <= radius; dx++) {
      for (let dy = -radius; dy <= radius; dy++) {
        if (Math.abs(dx) + Math.abs(dy) !== radius) continue;

        const newX = targetPosition.x + dx * step;
        const newY = targetPosition.y + dy * step;
        const candidate: PanelPosition = { x: newX, y: newY };

        // Проверяем границы видимой области
        if (
          candidate.x < scrollLeft ||
          candidate.x + width > visibleRight ||
          candidate.y < scrollTop ||
          candidate.y + height > visibleBottom
        ) {
          continue;
        }

        // Проверяем наложения
        const hasOverlap = Object.values(existingPositions).some((pos) =>
          checkOverlap(candidate, pos, dimensions)
        );

        if (!hasOverlap) {
          return candidate;
        }
      }
    }
  }

  // Фоллбэк: просто сдвигаем вправо
  return {
    x: targetPosition.x + Object.keys(existingPositions).length * 20,
    y: targetPosition.y,
  };
};

/**
 * Рассчитывает начальные позиции для всех панелей
 */
export const calculateInitialPositions = (
  categories: string[],
  containerRect: DOMRect,
  containerScroll: { scrollLeft: number; scrollTop: number },
  dimensions: PanelDimensions,
  savedPositions?: Record<string, PanelPosition>
): Record<string, PanelPosition> => {
  const positions: Record<string, PanelPosition> = {};
  const containerBounds = {
    width: containerRect.width,
    height: containerRect.height,
    scrollLeft: containerScroll.scrollLeft,
    scrollTop: containerScroll.scrollTop,
  };

  // Если есть сохранённые позиции — проверяем их на наложения
  if (savedPositions) {
    const validPositions: Record<string, PanelPosition> = {};
    const processed = new Set<string>();

    // Сначала копируем валидные сохранённые позиции
    categories.forEach((category) => {
      if (savedPositions[category]) {
        // Проверяем, не пересекается ли с уже принятыми
        const hasConflict = Object.values(validPositions).some((pos) =>
          checkOverlap(savedPositions[category], pos, dimensions)
        );
        if (!hasConflict) {
          validPositions[category] = savedPositions[category];
          processed.add(category);
        }
      }
    });

    // Для категорий с конфликтами или без сохранённых позиций — ищем новые
    categories.forEach((category) => {
      if (processed.has(category)) return;

      const startX =
        containerRect.width / 2 - dimensions.width / 2 + containerScroll.scrollLeft;
      const startY =
        Math.max(dimensions.headerHeight, containerRect.height / 2 - 100) +
        containerScroll.scrollTop;

      const targetPosition: PanelPosition = {
        x: startX + processed.size * (dimensions.width + dimensions.margin),
        y: startY,
      };

      validPositions[category] = findNonOverlappingPosition(
        targetPosition,
        validPositions,
        dimensions,
        containerBounds
      );
    });

    return validPositions;
  }

  // Если сохранённых позиций нет — раскидываем с нуля
  const startX =
    containerRect.width / 2 - dimensions.width / 2 + containerScroll.scrollLeft;
  const startY =
    Math.max(dimensions.headerHeight, containerRect.height / 2 - 100) +
    containerScroll.scrollTop;

  categories.forEach((category, index) => {
    const row = Math.floor(index / 4); // 4 панели в ряду
    const col = index % 4;
    const targetPosition: PanelPosition = {
      x: startX + col * (dimensions.width + dimensions.margin),
      y: startY + row * (dimensions.height + dimensions.margin),
    };

    positions[category] = findNonOverlappingPosition(
      targetPosition,
      positions,
      dimensions,
      containerBounds
    );
  });

  return positions;
};