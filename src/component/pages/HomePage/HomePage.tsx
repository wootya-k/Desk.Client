// src/component/pages/HomePage/HomePage.tsx

import React, { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import { fetchObjectTypes, updateObjectTypeCategory } from '@services/ObjectTypeService';
import { getCurrentUser } from '@services/AuthService';
import { checkPrintable } from '@services/ReportServices';
import { ObjectType } from '@models';
import { useNavigate } from 'react-router-dom';
import styles from './HomePage.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import DraggableCategoryPanel from './DraggableCategoryPanel/DraggableCategoryPanel';
import { setExpiringItem, getExpiringItem } from 'utils/LocalStorageUtils';
import CategoryModal from './CategoryModal/CategoryModal';
import PanelSettingsModal from './PanelSettingsModal/PanelSettingsModal';
import GearButton from '@commons/GearButton/GearButton';
import DependenciesButton from '@commons/DependenciesButton/DependenciesButton';
import PrintButton from '@commons/PrintButton/PrintButton';
import ColorSelectionModal from './ColorSelectionModal/ColorSelectionModal';
import ReportTemplateSelectorModal from '@commons/ReportTemplateSelectorModal/ReportTemplateSelectorModal';
import {
  ArcherContainer,
  ArcherElement,
} from 'react-archer';
import {
  calculateInitialPositions,
  PanelDimensions,
} from 'utils/panelLayoutUtils';
import TransformEditorModal from './TransformEditorModal/TransformEditorModal';
import CorporationStatsModal from './CorporationStatsModal/CorporationStatsModal';
interface ArcherRelation {
  sourceId: string;
  targetId: string;
  sourceAnchor: 'top' | 'bottom' | 'left' | 'right' | 'middle';
  targetAnchor: 'top' | 'bottom' | 'left' | 'right' | 'middle';
  label?: React.ReactNode;
  style?: {
    strokeColor?: string;
    strokeWidth?: number;
    strokeDasharray?: string;
  };
}


interface PanelPosition {
  x: number;
  y: number;
}

interface PanelConfig {
  title: string;
  visible: boolean;
  color?: string;
}

interface Connection {
  from: string;
  to: string;
  fromPanel: string;
  toPanel: string;
}

const PANEL_WIDTH = 250;
const PANEL_HEIGHT = 400;
const PANEL_HEADER_HEIGHT = 44;
const PANEL_ITEM_HEIGHT = 44;
const PANEL_RESIZER_HEIGHT = 6;
const PANEL_MARGIN = 20;
const STORAGE_KEY = 'panelPositions';
const SHOW_CONNECTIONS_KEY = 'showConnections';

const PANEL_PREVIEW_WIDTH = PANEL_WIDTH;
const PANEL_PREVIEW_HEIGHT = PANEL_HEADER_HEIGHT + PANEL_ITEM_HEIGHT + PANEL_RESIZER_HEIGHT;

const PANEL_DIMENSIONS: PanelDimensions = {
  width: PANEL_WIDTH,
  height: PANEL_HEIGHT,
  headerHeight: PANEL_HEADER_HEIGHT,
  margin: PANEL_MARGIN,
};

const HomePage: React.FC = () => {
  const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
  const [statsType, setStatsType] = useState<string>('employee');

  const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
  const [isEdictModalOpen, setIsEdictModalOpen] = useState(false);
  const [groupedTypes, setGroupedTypes] = useState<Record<string, ObjectType[]>>({});
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(new Set());
  const [printableTypes, setPrintableTypes] = useState<Record<string, boolean>>({});
  const [panelPositions, setPanelPositions] = useState<Record<string, PanelPosition>>({});
  const [panelVisibility, setPanelVisibility] = useState<Record<string, boolean>>({});
  const [panelColors, setPanelColors] = useState<Record<string, string>>({});
  const [panelOrder, setPanelOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [needsRedirect, setNeedsRedirect] = useState<boolean>(false);
  const [showConnections, setShowConnections] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(SHOW_CONNECTIONS_KEY);
      return saved !== null ? saved === 'true' : false;
    } catch {
      return false;
    }
  });
  const [connections, setConnections] = useState<Connection[]>([]);
  const [lastClickedItem, setLastClickedItem] = useState<{
    typeId: string;
    panelId: string;
    index: number;
  } | null>(null);
  const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const archerContainerRef = useRef<any>(null);
  const [lastActivePanel, setLastActivePanel] = useState<string | null>(null);
  const [currentDragItem, setCurrentDragItem] = useState<{
    itemId: string;
    fromPanel: string;
    index: number;
  } | null>(null);
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isPanelSettingsModalOpen, setIsPanelSettingsModalOpen] = useState(false);
  const [isColorModalOpen, setIsColorModalOpen] = useState(false);
  const [draggedItemForNewCategory, setDraggedItemForNewCategory] = useState<{
    item: ObjectType;
    fromPanel: string;
  } | null>(null);
  const [newPanelDropPosition, setNewPanelDropPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [isDraggingOverBackground, setIsDraggingOverBackground] = useState(false);

  const user = getCurrentUser();
  const isAdminOrMaster = user && (user.role === 'Admin' || user.role === 'Master');
  const isMaster = user && user.role === 'Master';

  useEffect(() => {
    try {
      localStorage.setItem(SHOW_CONNECTIONS_KEY, showConnections.toString());
    } catch (e) {
      console.error('Failed to save showConnections:', e);
    }
  }, [showConnections]);

  // Сохранение состояния showConnections в localStorage
  useEffect(() => {
    localStorage.setItem(SHOW_CONNECTIONS_KEY, showConnections.toString());
  }, [showConnections]);

  const clampPanelPosition = useCallback((newPosition: PanelPosition): PanelPosition => {
    if (!containerRef.current) return newPosition;
    const containerRect = containerRef.current.getBoundingClientRect();
    const containerScroll = containerRef.current;
    const scrollLeft = containerScroll.scrollLeft || 0;
    const scrollTop = containerScroll.scrollTop || 0;
    const visibleArea = {
      left: scrollLeft,
      top: scrollTop,
      right: scrollLeft + containerRect.width,
      bottom: scrollTop + containerRect.height,
    };
    const clampedX = Math.max(
      visibleArea.left,
      Math.min(newPosition.x, visibleArea.right - PANEL_WIDTH)
    );
    const clampedY = Math.max(
      visibleArea.top,
      Math.min(newPosition.y, visibleArea.bottom - PANEL_HEADER_HEIGHT)
    );
    return { x: clampedX, y: clampedY };
  }, []);

  const savePanelSettingsToCookies = useCallback(
    (
      visibility: Record<string, boolean>,
      order: string[],
      colors: Record<string, string>
    ) => {
      setExpiringItem('panelVisibility', JSON.stringify(visibility), 30);
      setExpiringItem('panelOrder', JSON.stringify(order), 30);
      setExpiringItem('panelColors', JSON.stringify(colors), 30);
    },
    []
  );

  const restorePanelVisibility = (categories: string[]): Record<string, boolean> => {
    const visibility: Record<string, boolean> = {};
    const savedVisibility = getExpiringItem('panelVisibility');
    if (savedVisibility) {
      try {
        const parsed = JSON.parse(savedVisibility);
        categories.forEach((category) => {
          visibility[category] = parsed[category] !== false;
        });
      } catch (e) {
        console.error('Ошибка парсинга видимости панелей из куки', e);
      }
    }
    categories.forEach((category) => {
      if (visibility[category] === undefined) {
        visibility[category] = true;
      }
    });
    return visibility;
  };

  const restorePanelColors = (categories: string[]): Record<string, string> => {
    const colors: Record<string, string> = {};
    const savedColors = getExpiringItem('panelColors');
    if (savedColors) {
      try {
        const parsed = JSON.parse(savedColors);
        categories.forEach((category) => {
          if (parsed[category]) {
            colors[category] = parsed[category];
          }
        });
      } catch (e) {
        console.error('Ошибка парсинга цветов панелей из куки', e);
      }
    }
    return colors;
  };

  const restorePanelOrder = (categories: string[]): string[] => {
    const savedOrder = getExpiringItem('panelOrder');
    if (savedOrder) {
      try {
        const parsed = JSON.parse(savedOrder);
        return parsed.filter((category: string) => categories.includes(category));
      } catch (e) {
        console.error('Ошибка парсинга порядка панелей из куки', e);
      }
    }
    return categories;
  };

  const restorePanelItemOrder = (types: ObjectType[]): Record<string, ObjectType[]> => {
    const grouped = types.reduce((acc, type) => {
      const category = type.viewCategory;
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(type);
      return acc;
    }, {} as Record<string, ObjectType[]>);

    Object.keys(grouped).forEach((category) => {
      const cookieKeyOrder = `categoryPanelOrder_${category}`;
      const savedOrder = getExpiringItem(cookieKeyOrder);
      if (savedOrder) {
        try {
          const orderArray: string[] = JSON.parse(savedOrder);
          const currentTypes = grouped[category];
          const orderedTypes = orderArray
            .map((id) => currentTypes.find((type) => type.id === id))
            .filter((type): type is ObjectType => type !== undefined);
          const newTypes = currentTypes.filter(
            (type) => !orderArray.includes(type.id)
          );
          grouped[category] = [...orderedTypes, ...newTypes];
        } catch (error) {
          console.error('Error parsing saved order:', error);
        }
      }
    });
    return grouped;
  };

  const handleItemClick = (
    typeId: string,
    panelId: string,
    index: number,
    e: React.MouseEvent
  ) => {
    e.stopPropagation();
    if (e.ctrlKey || e.metaKey) {
      setSelectedTypes((prev) => {
        const newSet = new Set(prev);
        if (newSet.has(typeId)) {
          newSet.delete(typeId);
        } else {
          newSet.add(typeId);
        }
        return newSet;
      });
      setLastClickedItem({ typeId, panelId, index });
    } else if (e.shiftKey && lastClickedItem) {
      if (panelId === lastClickedItem.panelId) {
        const panelTypes = groupedTypes[panelId] || [];
        const lastIndex = panelTypes.findIndex(
          (t) => t.id === lastClickedItem.typeId
        );
        const currentIndex = index;
        if (lastIndex !== -1 && currentIndex !== -1) {
          const start = Math.min(lastIndex, currentIndex);
          const end = Math.max(lastIndex, currentIndex);
          const rangeIds = panelTypes.slice(start, end + 1).map((t) => t.id);
          setSelectedTypes((prev) => {
            const newSet = new Set(prev);
            rangeIds.forEach((id) => newSet.add(id));
            return newSet;
          });
        }
      }
    } else {
      if (selectedTypes.size === 0) {
        navigate(`/view-objects/${typeId}`);
      } else {
        setSelectedTypes(new Set([typeId]));
      }
      setLastClickedItem({ typeId, panelId, index });
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedTypes(new Set());
        setLastClickedItem(null);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Исправленная функция с дедупликацией
  const buildPanelRelations = useCallback((panelCategory: string): ArcherRelation[] => {
    if (!showConnections) return [];

    const relationsMap = new Map<string, ArcherRelation>();
    const panelTypes = groupedTypes[panelCategory] || [];
    const sourcePanelPos = panelPositions[panelCategory];

    panelTypes.forEach((type) => {
      type.refs?.forEach((refId) => {
        const targetType = objectTypes.find((t) => t.id === refId);
        if (targetType && targetType.viewCategory !== panelCategory) {
          const targetPanelPos = panelPositions[targetType.viewCategory];

          // Определяем якоря на основе границ панелей
          let sourceAnchor: 'top' | 'bottom' | 'left' | 'right' = 'right';
          let targetAnchor: 'top' | 'bottom' | 'left' | 'right' = 'left';

          if (sourcePanelPos && targetPanelPos) {
            const sourceRight = sourcePanelPos.x + PANEL_WIDTH;
            const sourceBottom = sourcePanelPos.y + PANEL_HEIGHT;
            const targetRight = targetPanelPos.x + PANEL_WIDTH;
            const targetBottom = targetPanelPos.y + PANEL_HEIGHT;

            // Проверяем горизонтальное перекрытие
            const horizontalOverlap =
              sourcePanelPos.x < targetRight &&
              sourceRight > targetPanelPos.x;

            // Проверяем вертикальное перекрытие
            const verticalOverlap =
              sourcePanelPos.y < targetBottom &&
              sourceBottom > targetPanelPos.y;

            if (!horizontalOverlap) {
              // Панели не перекрываются по горизонтали
              if (sourceRight <= targetPanelPos.x) {
                // Source слева от target
                sourceAnchor = 'right';
                targetAnchor = 'left';
              } else {
                // Source справа от target
                sourceAnchor = 'left';
                targetAnchor = 'right';
              }
            } else if (!verticalOverlap) {
              // Панели перекрываются по горизонтали, но не по вертикали
              if (sourceBottom <= targetPanelPos.y) {
                // Source выше target
                sourceAnchor = 'bottom';
                targetAnchor = 'top';
              } else {
                // Source ниже target
                sourceAnchor = 'top';
                targetAnchor = 'bottom';
              }
            } else {
              // Панели перекрываются и по горизонтали, и по вертикали
              // Выбираем ближайшую сторону на основе расстояний до границ
              const distToLeft = Math.abs(sourcePanelPos.x - targetRight);
              const distToRight = Math.abs(sourceRight - targetPanelPos.x);
              const distToTop = Math.abs(sourcePanelPos.y - targetBottom);
              const distToBottom = Math.abs(sourceBottom - targetPanelPos.y);

              const minDist = Math.min(distToLeft, distToRight, distToTop, distToBottom);

              if (minDist === distToLeft) {
                sourceAnchor = 'left';
                targetAnchor = 'right';
              } else if (minDist === distToRight) {
                sourceAnchor = 'right';
                targetAnchor = 'left';
              } else if (minDist === distToTop) {
                sourceAnchor = 'top';
                targetAnchor = 'bottom';
              } else {
                sourceAnchor = 'bottom';
                targetAnchor = 'top';
              }
            }
          }

          // Уникальный ключ для дедупликации
          const relationKey = `${panelCategory}-${targetType.viewCategory}-${sourceAnchor}-${targetAnchor}`;

          if (!relationsMap.has(relationKey)) {
            relationsMap.set(relationKey, {
              sourceId: `panel-${panelCategory}`,
              targetId: `panel-${targetType.viewCategory}`,
              sourceAnchor: sourceAnchor,
              targetAnchor: targetAnchor,
              style: { strokeColor: '#3498db', strokeWidth: 2 },
            });
          }
        }
      });
    });

    return Array.from(relationsMap.values());
  }, [showConnections, groupedTypes, objectTypes, panelPositions]);

  const createPanelFromSelection = useCallback(
    async (categoryName: string, color?: string) => {
      if (selectedTypes.size === 0) return;
      const selectedItems = objectTypes.filter((t) => selectedTypes.has(t.id));
      const richestItem = selectedItems.reduce((richest, current) => {
        const currentRefs = current.refs?.length || 0;
        const richestRefs = richest?.refs?.length || 0;
        return currentRefs > richestRefs ? current : richest;
      }, selectedItems[0]);
      const targetCategory = categoryName || richestItem.name;

      try {
        const updatePromises = selectedItems.map((item) =>
          updateObjectTypeCategory(item.id, targetCategory)
        );
        await Promise.all(updatePromises);

        const updatedObjectTypes = objectTypes.map((t) =>
          selectedTypes.has(t.id) ? { ...t, viewCategory: targetCategory } : t
        );
        setObjectTypes(updatedObjectTypes);

        const newGrouped = updatedObjectTypes.reduce((acc, type) => {
          const category = type.viewCategory;
          if (!acc[category]) acc[category] = [];
          acc[category].push(type);
          return acc;
        }, {} as Record<string, ObjectType[]>);
        setGroupedTypes(newGrouped);

        const newVisibility = { ...panelVisibility, [targetCategory]: true };
        const newOrder = [...panelOrder, targetCategory];
        const newColors = color
          ? { ...panelColors, [targetCategory]: color }
          : panelColors;
        setPanelVisibility(newVisibility);
        setPanelOrder(newOrder);
        setPanelColors(newColors);
        savePanelSettingsToCookies(newVisibility, newOrder, newColors);

        if (containerRef.current) {
          const containerRect = containerRef.current.getBoundingClientRect();
          const containerScroll = containerRef.current;
          const allCategories = Object.keys(newGrouped);
          const existingPositions = { ...panelPositions };

          const newPosition = calculateInitialPositions(
            [targetCategory],
            containerRect,
            {
              scrollLeft: containerScroll.scrollLeft || 0,
              scrollTop: containerScroll.scrollTop || 0,
            },
            PANEL_DIMENSIONS,
            existingPositions
          )[targetCategory];

          const allPositions = { ...panelPositions, [targetCategory]: newPosition };
          setPanelPositions(allPositions);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(allPositions));
        }

        setExpiringItem(
          `categoryPanelHeight_${targetCategory}`,
          (
            PANEL_HEADER_HEIGHT +
            PANEL_ITEM_HEIGHT +
            PANEL_RESIZER_HEIGHT
          ).toString(),
          365 * 10
        );

        setSelectedTypes(new Set());
        setLastClickedItem(null);
      } catch (err) {
        console.error('Ошибка при создании панели из выделения:', err);
        alert('Ошибка при создании панели из выделения');
      }
    },
    [
      selectedTypes,
      objectTypes,
      panelVisibility,
      panelOrder,
      panelColors,
      panelPositions,
      savePanelSettingsToCookies,
    ]
  );

  const handleCreatePanelFromSelection = () => {
    if (selectedTypes.size === 0) return;
    setIsColorModalOpen(true);
  };

  useEffect(() => {
    const shouldShowMessage = sessionStorage.getItem('showForbiddenMessage');
    if (shouldShowMessage) {
      alert('У вас нет прав для доступа к этой странице!');
      sessionStorage.removeItem('showForbiddenMessage');
    }
  }, []);

  useEffect(() => {
    const loadObjectTypes = async () => {
      setLoading(true);
      try {
        const data = await fetchObjectTypes();
        setObjectTypes(data);

        const printableStatuses: Record<string, boolean> = {};
        for (const type of data) {
          try {
            printableStatuses[type.id] = await checkPrintable(type.id);
          } catch (error) {
            console.error(
              `Error checking printable for type ${type.id}:`,
              error
            );
            printableStatuses[type.id] = false;
          }
        }
        setPrintableTypes(printableStatuses);

        const grouped = restorePanelItemOrder(data);
        setGroupedTypes(grouped);

        const categories = Object.keys(grouped);
        const visibility = restorePanelVisibility(categories);
        setPanelVisibility(visibility);
        const colors = restorePanelColors(categories);
        setPanelColors(colors);
        const order = restorePanelOrder(categories);
        setPanelOrder(order);
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'UNAUTHENTICATED') {
            setNeedsRedirect(true);
          } else {
            setError(error.message);
          }
        } else {
          setError('Неизвестная ошибка');
        }
      } finally {
        setLoading(false);
      }
    };
    loadObjectTypes();
  }, []);

  useEffect(() => {
    if (Object.keys(groupedTypes).length > 0 && containerRef.current) {
      const savedPositions = localStorage.getItem(STORAGE_KEY);
      let parsedSaved: Record<string, PanelPosition> | undefined;
      if (savedPositions) {
        try {
          parsedSaved = JSON.parse(savedPositions);
        } catch (e) {
          console.error('Failed to parse saved positions', e);
        }
      }

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerScroll = containerRef.current;
      const categories =
        panelOrder.length > 0 ? panelOrder : Object.keys(groupedTypes);

      const positions = calculateInitialPositions(
        categories,
        containerRect,
        {
          scrollLeft: containerScroll.scrollLeft || 0,
          scrollTop: containerScroll.scrollTop || 0,
        },
        PANEL_DIMENSIONS,
        parsedSaved
      );

      const clampedPositions: Record<string, PanelPosition> = {};
      Object.entries(positions).forEach(([category, pos]) => {
        clampedPositions[category] = clampPanelPosition(pos);
      });

      setPanelPositions(clampedPositions);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(clampedPositions));
    }
  }, [groupedTypes, panelOrder, clampPanelPosition]);

  // Перерисовка только при изменении позиций, а не при каждом рендере
  useEffect(() => {
    if (showConnections && archerContainerRef.current?.refreshScreen) {
      const timeoutId = setTimeout(() => {
        archerContainerRef.current?.refreshScreen();
      }, 50);
      return () => clearTimeout(timeoutId);
    }
  }, [panelPositions, showConnections]);

  const handlePositionChange = (category: string, newPosition: PanelPosition) => {
    const clampedPosition = clampPanelPosition(newPosition);
    const updatedPositions = { ...panelPositions, [category]: clampedPosition };
    setPanelPositions(updatedPositions);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPositions));

    if (showConnections && archerContainerRef.current?.refreshScreen) {
      setTimeout(() => archerContainerRef.current.refreshScreen(), 50);
    }
  };

  const handleItemDragStart = (
    item: ObjectType,
    fromPanel: string,
    index: number
  ) => {
    setCurrentDragItem({ itemId: item.id, fromPanel, index });
  };

  const handleItemDragOver = (
    e: React.DragEvent,
    toIndex: number,
    toPanel: string
  ) => {
    e.preventDefault();
  };

  const handleItemDrop = async (
    e: React.DragEvent,
    toIndex: number,
    toPanel: string
  ) => {
    e.preventDefault();
    if (!currentDragItem) return;
    const { itemId, fromPanel, index: fromIndex } = currentDragItem;

    if (fromPanel === toPanel) {
      const panelTypes = [...groupedTypes[fromPanel]];
      const [movedItem] = panelTypes.splice(fromIndex, 1);
      panelTypes.splice(toIndex, 0, movedItem);
      setGroupedTypes((prev) => ({ ...prev, [fromPanel]: panelTypes }));
      savePanelOrderToCookie(fromPanel, panelTypes);
    } else {
      try {
        const success = await updateObjectTypeCategory(itemId, toPanel);
        if (!success) throw new Error('Failed to update category');

        const fromTypes = [...groupedTypes[fromPanel]].filter(
          (t) => t.id !== itemId
        );
        const toTypes = [...groupedTypes[toPanel]];
        const item = [...groupedTypes[fromPanel]].find((t) => t.id === itemId);
        if (!item) return;

        toTypes.splice(toIndex, 0, { ...item, viewCategory: toPanel });
        const updatedGroupedTypes = {
          ...groupedTypes,
          [fromPanel]: fromTypes,
          [toPanel]: toTypes,
        };
        setGroupedTypes(updatedGroupedTypes);
        savePanelOrderToCookie(fromPanel, fromTypes);
        savePanelOrderToCookie(toPanel, toTypes);
        setObjectTypes((prev) =>
          prev.map((t) =>
            t.id === itemId ? { ...t, viewCategory: toPanel } : t
          )
        );
      } catch (error) {
        console.error('Error moving item between panels:', error);
        alert('Не удалось переместить элемент между панелями');
      }
    }
    setCurrentDragItem(null);
  };

  const handleItemDragEnd = () => {
    setCurrentDragItem(null);
  };

  const savePanelOrderToCookie = (panelId: string, types: ObjectType[]) => {
    const cookieKeyOrder = `categoryPanelOrder_${panelId}`;
    const ids = types.map((t) => t.id);
    setExpiringItem(cookieKeyOrder, JSON.stringify(ids), 365 * 10);
  };

  const handleActivatePanel = (category: string) => {
    setLastActivePanel(category);
  };

  const handlePanelSettingsClick = () => {
    setIsPanelSettingsModalOpen(true);
  };

  const handleApplyPanelSettings = (updatedPanels: PanelConfig[]) => {
    const newVisibility: Record<string, boolean> = {};
    const newOrder: string[] = [];
    const newColors: Record<string, string> = {};
    updatedPanels.forEach((panel) => {
      newVisibility[panel.title] = panel.visible;
      newOrder.push(panel.title);
      if (panel.color) newColors[panel.title] = panel.color;
    });
    setPanelVisibility(newVisibility);
    setPanelOrder(newOrder);
    setPanelColors(newColors);
    savePanelSettingsToCookies(newVisibility, newOrder, newColors);
    setIsPanelSettingsModalOpen(false);
  };

  const handleResetPanelSettings = (): PanelConfig[] => {
    const allCategories = Object.keys(groupedTypes);
    return allCategories.map((category) => ({
      title: category,
      visible: true,
      color: undefined,
    }));
  };

  const getPanelConfigs = (): PanelConfig[] => {
    const order = panelOrder.length > 0 ? panelOrder : Object.keys(groupedTypes);
    return order.map((category) => ({
      title: category,
      visible: panelVisibility[category] !== false,
      color: panelColors[category],
    }));
  };

  const handleDragOverBackground = (e: React.DragEvent) => {
    e.preventDefault();
    if (currentDragItem) {
      setIsDraggingOverBackground(true);
      const containerRect = containerRef.current?.getBoundingClientRect();
      if (containerRect) {
        const x =
          e.clientX -
          containerRect.left -
          PANEL_PREVIEW_WIDTH / 2;
        const y =
          e.clientY -
          containerRect.top -
          PANEL_HEADER_HEIGHT / 2;
        setNewPanelDropPosition({ x, y });
      }
    }
  };

  const handleDragLeaveBackground = () => {
    setIsDraggingOverBackground(false);
  };

  const handleDropOnBackground = (e: React.DragEvent) => {
    e.preventDefault();
    if (currentDragItem) {
      const draggedType = objectTypes.find(
        (t) => t.id === currentDragItem.itemId
      );
      if (draggedType) {
        setDraggedItemForNewCategory({
          item: draggedType,
          fromPanel: currentDragItem.fromPanel,
        });
        const containerRect = containerRef.current?.getBoundingClientRect();
        if (containerRect) {
          const x =
            e.clientX -
            containerRect.left -
            PANEL_PREVIEW_WIDTH / 2;
          const y =
            e.clientY -
            containerRect.top -
            PANEL_HEADER_HEIGHT / 2;
          setNewPanelDropPosition({ x, y });
        }
        setIsModalOpen(true);
      }
    }
    setCurrentDragItem(null);
    setIsDraggingOverBackground(false);
  };

  const handleCreateNewPanel = async (newCategoryName: string) => {
    if (!draggedItemForNewCategory) return;
    const { item, fromPanel } = draggedItemForNewCategory;

    try {
      const success = await updateObjectTypeCategory(
        item.id,
        newCategoryName
      );
      if (!success) {
        alert('Не удалось сохранить категорию на сервере');
        return;
      }

      const updatedFromPanelTypes = groupedTypes[fromPanel].filter(
        (t) => t.id !== item.id
      );
      const updatedItem = { ...item, viewCategory: newCategoryName };
      const updatedGroupedTypes = {
        ...groupedTypes,
        [fromPanel]: updatedFromPanelTypes,
        [newCategoryName]: [updatedItem],
      };
      setGroupedTypes(updatedGroupedTypes);
      setObjectTypes((prev) =>
        prev.map((t) =>
          t.id === item.id ? updatedItem : t
        )
      );

      const newVisibility = { ...panelVisibility, [newCategoryName]: true };
      const newOrder = [...panelOrder, newCategoryName];
      const newColors = { ...panelColors };
      setPanelVisibility(newVisibility);
      setPanelOrder(newOrder);
      setPanelColors(newColors);
      savePanelSettingsToCookies(newVisibility, newOrder, newColors);
      savePanelOrderToCookie(fromPanel, updatedFromPanelTypes);
      savePanelOrderToCookie(newCategoryName, [updatedItem]);

      if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const containerScroll = containerRef.current;
        const allCategories = Object.keys(updatedGroupedTypes);
        const existingPositions = { ...panelPositions };

        const newPosition = calculateInitialPositions(
          [newCategoryName],
          containerRect,
          {
            scrollLeft: containerScroll.scrollLeft || 0,
            scrollTop: containerScroll.scrollTop || 0,
          },
          PANEL_DIMENSIONS,
          existingPositions
        )[newCategoryName];

        const clampedPosition = clampPanelPosition(newPosition);
        const allPositions = {
          ...panelPositions,
          [newCategoryName]: clampedPosition,
        };
        setPanelPositions(allPositions);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(allPositions));
      }

      setExpiringItem(
        `categoryPanelHeight_${newCategoryName}`,
        (
          PANEL_HEADER_HEIGHT +
          PANEL_ITEM_HEIGHT +
          PANEL_RESIZER_HEIGHT
        ).toString(),
        365 * 10
      );

      const isPrintable = await checkPrintable(item.id);
      setPrintableTypes((prev) => ({ ...prev, [item.id]: isPrintable }));
    } catch (err) {
      console.error('Ошибка при создании категории:', err);
      alert('Ошибка при создании категории');
    }
  };

  const getDraggedItemName = () => {
    if (!currentDragItem) return 'Элемент';
    const item = objectTypes.find((t) => t.id === currentDragItem.itemId);
    return item?.name || 'Элемент';
  };

  if (loading) return <div>Загрузка...</div>;
  if (error) return <div>Ошибка: {error}</div>;
  if (needsRedirect) return null;

  const visiblePanels = getPanelConfigs().filter(
    (panel) => panel.visible && groupedTypes[panel.title]?.length > 0
  );

  return (
    <div className={styles.homePageContainer}>
      {isTemplateSelectorOpen && (
        <ReportTemplateSelectorModal
          isOpen={true}
          onClose={() => setIsTemplateSelectorOpen(false)}
          onSelect={(metaTitle) => {
            setIsTemplateSelectorOpen(false);
            navigate(`/report-template-editor/${metaTitle}`);
          }}
        />
      )}

      <div className={styles.bottomControlPanel}>
        <div className={styles.controlPanelContent}>

          <GearButton
            strokeWidth={4}
            size={24}
            width='10px'
            onClick={handlePanelSettingsClick}
            mainColor="#FFFFFF"
            additionalColor="rgba(100, 116, 139, 1)"
          />

          <DependenciesButton
            onClick={() => setShowConnections(!showConnections)}
            size={24}
            width='10px'
            mainColor="#FFFFFF"
            additionalColor={showConnections ? 'rgba(100, 116, 139, 1)' : '#a83232'}
          />

          {/* <PrintButton
          width='10px'
          scale={1}
          onClick={() => setIsTemplateSelectorOpen(true)}
          mainColor="#FFFFFF" 
          additionalColor="rgba(100, 116, 139, 1)"
        /> */}
          {/* Сюда в будущем можно легко добавить другие кнопки через FilledColorButton */}

        </div>
      </div>

      <div className={styles.createButtonContainer}>
        {/* Создать */}
        <a
          href="/schema-editor"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            if (isAdminOrMaster) navigate('/schema-editor');
          }}
        >
          <FilledColorButton disabled={!isAdminOrMaster} width="100px" onClick={() => {}} >
            Создать
          </FilledColorButton>
        </a>

        {/* Печать (модальное окно — не ссылка) */}
        <FilledColorButton
          onClick={() => setIsTemplateSelectorOpen(true)}
          disabled={!isAdminOrMaster}
          width="100px"
        >
          Печать
        </FilledColorButton>

        {/* Действия (модальное окно — не ссылка) */}
        <FilledColorButton
          onClick={() => setIsEdictModalOpen(true)}
          disabled={!isAdminOrMaster}
          width="100px"
        >
          Действия
        </FilledColorButton>

        {/* Статистика (модальное окно — не ссылка) */}
        <FilledColorButton
          onClick={() => {
            setStatsType('employee');
            setIsStatsModalOpen(true);
          }}
          disabled={!isAdminOrMaster}
          width="100px"
        >
          Статистика
        </FilledColorButton>

        {/* Сведения */}
        <a
          href="/checkpoint"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            if (isAdminOrMaster) navigate('/checkpoint');
          }}
        >
          <FilledColorButton disabled={!isAdminOrMaster} width="100px" onClick={() => {}} >
            Сведения
          </FilledColorButton>
        </a>

        {/* Админка */}
        <a
          href="/admin"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            if (isMaster) navigate('/admin');
          }}
        >
          <FilledColorButton disabled={!isMaster} width="100px" onClick={() => {}} >
            Админка
          </FilledColorButton>
        </a>

        {/* Импорт */}
        <a
          href="/import"
          style={{ textDecoration: 'none', color: 'inherit' }}
          onClick={(e) => {
            if (e.ctrlKey || e.metaKey) return;
            e.preventDefault();
            if (isAdminOrMaster) navigate('/import');
          }}
        >
          <FilledColorButton
            disabled={!isAdminOrMaster}
            mainColor="#ffffff"
            additionalColor="#f39c12"
            width="100px"
            onClick={() => {}} 
          >
            Импорт
          </FilledColorButton>
        </a>

        {selectedTypes.size > 0 && (
          <FilledColorButton
            onClick={handleCreatePanelFromSelection}
            mainColor="#ffffff"
            additionalColor="#f39c12"
            width="100px"
          >
            Создать панель [{selectedTypes.size}]
          </FilledColorButton>
        )}
      </div>

      <div
        className={styles.dragDropBackground}
        onDragOver={handleDragOverBackground}
        onDragLeave={handleDragLeaveBackground}
        onDrop={handleDropOnBackground}
      >
        {isDraggingOverBackground && newPanelDropPosition && (
          <div
            className={styles.panelPreview}
            style={{
              left: newPanelDropPosition.x,
              top: newPanelDropPosition.y,
              width: PANEL_PREVIEW_WIDTH,
              height: PANEL_PREVIEW_HEIGHT,
            }}
          >
            <div className={styles.panelPreviewHeader}>Новая категория</div>
            <div className={styles.panelPreviewContent}>
              <div className={styles.panelPreviewItem}>
                {getDraggedItemName()}
              </div>
            </div>
            <div className={styles.panelPreviewResizer} />
          </div>
        )}

        {showConnections && (
          <ArcherContainer
            ref={archerContainerRef}
            strokeColor="#3498db"
            strokeWidth={2}
            svgContainerStyle={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: '100%',
              height: '100%',
              zIndex: 5,
              pointerEvents: 'none',
            }}
            className={styles.connectionsContainer}
          >
            <div ref={containerRef} className={styles.panelsArea}>
              {visiblePanels.map((panel) => {
                // Мемоизируем relations для каждой панели
                const relations = buildPanelRelations(panel.title);

                return (
                  <ArcherElement
                    key={`archer-panel-${panel.title}`}
                    id={`panel-${panel.title}`}
                    relations={relations}
                  >
                    <DraggableCategoryPanel
                      category={panel.title}
                      types={groupedTypes[panel.title] || []}
                      printableTypes={printableTypes}
                      position={
                        panelPositions[panel.title] || { x: 100, y: 100 }
                      }
                      onPositionChange={(newPosition) =>
                        handlePositionChange(panel.title, newPosition)
                      }
                      onItemClick={handleItemClick}
                      isActive={lastActivePanel === panel.title}
                      onActivate={() => handleActivatePanel(panel.title)}
                      onItemDragStart={handleItemDragStart}
                      onItemDragOver={handleItemDragOver}
                      onItemDrop={handleItemDrop}
                      onItemDragEnd={handleItemDragEnd}
                      currentDragItem={currentDragItem}
                      selectedTypes={selectedTypes}
                      color={panel.color}
                      containerRef={containerRef}
                    />
                  </ArcherElement>
                );
              })}
            </div>
          </ArcherContainer>
        )}

        {!showConnections && (
          <div ref={containerRef} className={styles.panelsArea}>
            {visiblePanels.map((panel) => (
              <DraggableCategoryPanel
                key={panel.title}
                category={panel.title}
                types={groupedTypes[panel.title] || []}
                printableTypes={printableTypes}
                position={
                  panelPositions[panel.title] || { x: 100, y: 100 }
                }
                onPositionChange={(newPosition) =>
                  handlePositionChange(panel.title, newPosition)
                }
                onItemClick={handleItemClick}
                isActive={lastActivePanel === panel.title}
                onActivate={() => handleActivatePanel(panel.title)}
                onItemDragStart={handleItemDragStart}
                onItemDragOver={handleItemDragOver}
                onItemDrop={handleItemDrop}
                onItemDragEnd={handleItemDragEnd}
                currentDragItem={currentDragItem}
                selectedTypes={selectedTypes}
                color={panel.color}
                containerRef={containerRef}
              />
            ))}
          </div>
        )}
      </div>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setDraggedItemForNewCategory(null);
          setCurrentDragItem(null);
          setNewPanelDropPosition(null);
        }}
        onCreate={handleCreateNewPanel}
      />

      <TransformEditorModal
        isOpen={isEdictModalOpen}
        onClose={() => setIsEdictModalOpen(false)}
        onEdictCreated={(edict) => {
          console.log('Действие создано:', edict);
          // При необходимости: обновить UI или показать уведомление
        }}
        onEdictDeleted={(id) => {
          console.log('Действие удалено:', id);
          // При необходимости: обновить UI или показать уведомление
        }}
      />

      <ColorSelectionModal
        isOpen={isColorModalOpen}
        onClose={() => setIsColorModalOpen(false)}
        onColorSelect={(color) => {
          const selectedItems = objectTypes.filter((t) =>
            selectedTypes.has(t.id)
          );
          const richestItem = selectedItems.reduce((richest, current) => {
            const currentRefs = current.refs?.length || 0;
            const richestRefs = richest?.refs?.length || 0;
            return currentRefs > richestRefs ? current : richest;
          }, selectedItems[0]);
          createPanelFromSelection(richestItem.name, color);
          setIsColorModalOpen(false);
        }}
      />

      {isPanelSettingsModalOpen && (
        <PanelSettingsModal
          initialColumns={getPanelConfigs()}
          onApply={handleApplyPanelSettings}
          onReset={handleResetPanelSettings}
          onCancel={() => setIsPanelSettingsModalOpen(false)}
        />
      )}
      <CorporationStatsModal
        isOpen={isStatsModalOpen}
        onClose={() => setIsStatsModalOpen(false)}
        type={statsType}
      />
    </div>
  );
};

export default HomePage;