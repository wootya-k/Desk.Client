import React, { useEffect, useState, useRef, useCallback } from 'react';
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
import ConnectionLines from './ConnectionLines/ConnectionLines';
import ColorSelectionModal from './ColorSelectionModal/ColorSelectionModal';
import ReportTemplateSelectorModal from './ReportTemplateSelectorModal/ReportTemplateSelectorModal'

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

// Константы для превью новой панели
const PANEL_PREVIEW_WIDTH = PANEL_WIDTH;
const PANEL_PREVIEW_HEIGHT = PANEL_HEADER_HEIGHT + PANEL_ITEM_HEIGHT + PANEL_RESIZER_HEIGHT;

const HomePage: React.FC = () => {
    const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
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
    const [showConnections, setShowConnections] = useState<boolean>(false);
    const [connections, setConnections] = useState<Connection[]>([]);
    const [lastClickedItem, setLastClickedItem] = useState<{ typeId: string; panelId: string; index: number } | null>(null);
    const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);
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
    const [newPanelDropPosition, setNewPanelDropPosition] = useState<{ x: number, y: number } | null>(null);
    const [isDraggingOverBackground, setIsDraggingOverBackground] = useState(false);

    const user = getCurrentUser();
    const isAdminOrMaster = user && (user.role === 'Admin' || user.role === 'Master');

    // Функция для ограничения позиции панели в пределах контейнера
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
            bottom: scrollTop + containerRect.height
        };

        const clampedX = Math.max(
            visibleArea.left,
            Math.min(newPosition.x, visibleArea.right - PANEL_WIDTH)
        );
        const clampedY = Math.max(
            visibleArea.top,
            Math.min(newPosition.y, visibleArea.bottom - PANEL_HEADER_HEIGHT)
        );

        return {
            x: clampedX,
            y: clampedY
        };
    }, []);

    // Функция для сохранения настроек панелей в cookie
    const savePanelSettingsToCookies = useCallback((visibility: Record<string, boolean>, order: string[], colors: Record<string, string>) => {
        setExpiringItem('panelVisibility', JSON.stringify(visibility), 30);
        setExpiringItem('panelOrder', JSON.stringify(order), 30);
        setExpiringItem('panelColors', JSON.stringify(colors), 30);
    }, []);

    // Восстановление видимости панелей из куки
    const restorePanelVisibility = (categories: string[]): Record<string, boolean> => {
        const visibility: Record<string, boolean> = {};
        const savedVisibility = getExpiringItem('panelVisibility');

        if (savedVisibility) {
            try {
                const parsed = JSON.parse(savedVisibility);
                categories.forEach(category => {
                    visibility[category] = parsed[category] !== false;
                });
            } catch (e) {
                console.error('Ошибка парсинга видимости панелей из куки', e);
            }
        }

        categories.forEach(category => {
            if (visibility[category] === undefined) {
                visibility[category] = true;
            }
        });

        return visibility;
    };

    // Восстановление цветов панелей из куки
    const restorePanelColors = (categories: string[]): Record<string, string> => {
        const colors: Record<string, string> = {};
        const savedColors = getExpiringItem('panelColors');

        if (savedColors) {
            try {
                const parsed = JSON.parse(savedColors);
                categories.forEach(category => {
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

    // Восстановление порядка панелей из куки
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

    // Восстановление порядка элементов из куки
    const restorePanelItemOrder = (types: ObjectType[]): Record<string, ObjectType[]> => {
        const grouped = types.reduce((acc, type) => {
            const category = type.viewCategory;
            if (!acc[category]) {
                acc[category] = [];
            }
            acc[category].push(type);
            return acc;
        }, {} as Record<string, ObjectType[]>);

        Object.keys(grouped).forEach(category => {
            const cookieKeyOrder = `categoryPanelOrder_${category}`;
            const savedOrder = getExpiringItem(cookieKeyOrder);

            if (savedOrder) {
                try {
                    const orderArray: string[] = JSON.parse(savedOrder);
                    const currentTypes = grouped[category];

                    const orderedTypes = orderArray
                        .map(id => currentTypes.find(type => type.id === id))
                        .filter((type): type is ObjectType => type !== undefined);

                    const newTypes = currentTypes.filter(type => !orderArray.includes(type.id));

                    grouped[category] = [...orderedTypes, ...newTypes];
                } catch (error) {
                    console.error('Error parsing saved order:', error);
                }
            }
        });

        return grouped;
    };

    // Обработчик клика по элементу с модификаторами
    const handleItemClick = (typeId: string, panelId: string, index: number, e: React.MouseEvent) => {
        e.stopPropagation();

        if (e.ctrlKey || e.metaKey) {
            // Ctrl+click - добавить/убрать из выделения
            setSelectedTypes(prev => {
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
            // Shift+click - выделить диапазон в той же панели
            if (panelId === lastClickedItem.panelId) {
                const panelTypes = groupedTypes[panelId] || [];
                const lastIndex = panelTypes.findIndex(t => t.id === lastClickedItem.typeId);
                const currentIndex = index;

                if (lastIndex !== -1 && currentIndex !== -1) {
                    const start = Math.min(lastIndex, currentIndex);
                    const end = Math.max(lastIndex, currentIndex);
                    const rangeIds = panelTypes.slice(start, end + 1).map(t => t.id);

                    setSelectedTypes(prev => {
                        const newSet = new Set(prev);
                        rangeIds.forEach(id => newSet.add(id));
                        return newSet;
                    });
                }
            }
        } else {
            // Обычный клик - сброс выделения и навигация
            if (selectedTypes.size === 0) {
                navigate(`/view-objects/${typeId}`);
            } else {
                setSelectedTypes(new Set([typeId]));
            }
            setLastClickedItem({ typeId, panelId, index });
        }
    };

    // Сброс выделения по Escape
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

    // Функция для построения связей
    const buildConnections = useCallback(() => {
        if (!showConnections) {
            setConnections([]);
            return;
        }

        const newConnections: Connection[] = [];

        objectTypes.forEach(type => {
            type.refs?.forEach(refId => {
                const targetType = objectTypes.find(t => t.id === refId);
                if (targetType) {
                    newConnections.push({
                        from: type.id,
                        to: refId,
                        fromPanel: type.viewCategory,
                        toPanel: targetType.viewCategory
                    });
                }
            });
        });

        setConnections(newConnections);
    }, [showConnections, objectTypes]);

    useEffect(() => {
        buildConnections();
    }, [buildConnections]);

    // Функция для создания новой панели из выделенных элементов
    const createPanelFromSelection = useCallback(async (categoryName: string, color?: string) => {
        if (selectedTypes.size === 0) return;

        const selectedItems = objectTypes.filter(t => selectedTypes.has(t.id));

        // Находим элемент с наибольшим количеством refs
        const richestItem = selectedItems.reduce((richest, current) => {
            const currentRefs = current.refs?.length || 0;
            const richestRefs = richest?.refs?.length || 0;
            return currentRefs > richestRefs ? current : richest;
        }, selectedItems[0]);

        const targetCategory = categoryName || richestItem.name;

        try {
            // Обновляем категории для всех выбранных элементов
            const updatePromises = selectedItems.map(item =>
                updateObjectTypeCategory(item.id, targetCategory)
            );

            await Promise.all(updatePromises);

            // Обновляем локальное состояние
            const updatedObjectTypes = objectTypes.map(t =>
                selectedTypes.has(t.id) ? { ...t, viewCategory: targetCategory } : t
            );

            setObjectTypes(updatedObjectTypes);

            // Перегруппируем типы
            const newGrouped = updatedObjectTypes.reduce((acc, type) => {
                const category = type.viewCategory;
                if (!acc[category]) acc[category] = [];
                acc[category].push(type);
                return acc;
            }, {} as Record<string, ObjectType[]>);

            setGroupedTypes(newGrouped);

            // Обновляем настройки панелей
            const newVisibility = {
                ...panelVisibility,
                [targetCategory]: true
            };
            const newOrder = [...panelOrder, targetCategory];
            const newColors = color ? { ...panelColors, [targetCategory]: color } : panelColors;

            setPanelVisibility(newVisibility);
            setPanelOrder(newOrder);
            setPanelColors(newColors);

            savePanelSettingsToCookies(newVisibility, newOrder, newColors);

            // Устанавливаем позицию для новой панели
            const containerRect = containerRef.current?.getBoundingClientRect();
            const newPosition = {
                x: (containerRect?.width || 800) / 2 - PANEL_WIDTH / 2,
                y: (containerRect?.height || 600) / 2 - PANEL_HEADER_HEIGHT / 2
            };

            const clampedPosition = clampPanelPosition(newPosition);
            const allPositions = {
                ...panelPositions,
                [targetCategory]: clampedPosition
            };
            setPanelPositions(allPositions);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allPositions));

            // Сохраняем начальную высоту для новой панели
            setExpiringItem(`categoryPanelHeight_${targetCategory}`,
                (PANEL_HEADER_HEIGHT + PANEL_ITEM_HEIGHT + PANEL_RESIZER_HEIGHT).toString(),
                365 * 10
            );

            // Сбрасываем выделение
            setSelectedTypes(new Set());
            setLastClickedItem(null);

        } catch (err) {
            console.error('Ошибка при создании панели из выделения:', err);
            alert('Ошибка при создании панели из выделения');
        }
    }, [selectedTypes, objectTypes, panelVisibility, panelOrder, panelColors, panelPositions, clampPanelPosition, savePanelSettingsToCookies]);

    // Обработчик создания панели из выделения с выбором цвета
    const handleCreatePanelFromSelection = () => {
        if (selectedTypes.size === 0) return;

        const selectedItems = objectTypes.filter(t => selectedTypes.has(t.id));
        const richestItem = selectedItems.reduce((richest, current) => {
            const currentRefs = current.refs?.length || 0;
            const richestRefs = richest?.refs?.length || 0;
            return currentRefs > richestRefs ? current : richest;
        }, selectedItems[0]);

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
                        console.error(`Error checking printable for type ${type.id}:`, error);
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
            let positions: Record<string, PanelPosition> = {};

            if (savedPositions) {
                positions = JSON.parse(savedPositions);
                Object.keys(positions).forEach(category => {
                    positions[category] = clampPanelPosition(positions[category]);
                });
            } else {
                const containerRect = containerRef.current.getBoundingClientRect();
                const categories = panelOrder.length > 0 ? panelOrder : Object.keys(groupedTypes);
                const totalWidth = categories.length * PANEL_WIDTH +
                    (categories.length - 1) * PANEL_MARGIN;

                let startX = Math.max(0, (containerRect.width - totalWidth) / 2);
                const centerY = Math.max(PANEL_HEADER_HEIGHT, containerRect.height / 2 - 100);

                categories.forEach(category => {
                    positions[category] = clampPanelPosition({
                        x: startX,
                        y: centerY
                    });
                    startX += PANEL_WIDTH + PANEL_MARGIN;
                });
            }

            setPanelPositions(positions);
        }
    }, [groupedTypes, panelOrder, clampPanelPosition]);

    const handleNavigation = (typeId: string) => {
        navigate(`/view-objects/${typeId}`);
    };

    const handlePositionChange = (category: string, newPosition: PanelPosition) => {
        const clampedPosition = clampPanelPosition(newPosition);
        const updatedPositions = {
            ...panelPositions,
            [category]: clampedPosition
        };
        setPanelPositions(updatedPositions);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedPositions));
    };

    const handleItemDragStart = (item: ObjectType, fromPanel: string, index: number) => {
        setCurrentDragItem({
            itemId: item.id,
            fromPanel,
            index
        });
    };

    const handleItemDragOver = (e: React.DragEvent, toIndex: number, toPanel: string) => {
        e.preventDefault();
    };

    const handleItemDrop = async (e: React.DragEvent, toIndex: number, toPanel: string) => {
        e.preventDefault();
        if (!currentDragItem) return;

        const { itemId, fromPanel, index: fromIndex } = currentDragItem;

        if (fromPanel === toPanel) {
            const panelTypes = [...groupedTypes[fromPanel]];
            const [movedItem] = panelTypes.splice(fromIndex, 1);
            panelTypes.splice(toIndex, 0, movedItem);

            setGroupedTypes(prev => ({
                ...prev,
                [fromPanel]: panelTypes
            }));
            savePanelOrderToCookie(fromPanel, panelTypes);
        } else {
            try {
                const success = await updateObjectTypeCategory(itemId, toPanel);
                if (!success) {
                    throw new Error('Failed to update category');
                }

                const fromTypes = [...groupedTypes[fromPanel]].filter(t => t.id !== itemId);
                const toTypes = [...groupedTypes[toPanel]];
                const item = [...groupedTypes[fromPanel]].find(t => t.id === itemId);
                if (!item) return;

                toTypes.splice(toIndex, 0, { ...item, viewCategory: toPanel });

                const updatedGroupedTypes = {
                    ...groupedTypes,
                    [fromPanel]: fromTypes,
                    [toPanel]: toTypes
                };

                setGroupedTypes(updatedGroupedTypes);
                savePanelOrderToCookie(fromPanel, fromTypes);
                savePanelOrderToCookie(toPanel, toTypes);

                setObjectTypes(prev => prev.map(t =>
                    t.id === itemId ? { ...t, viewCategory: toPanel } : t
                ));

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
        const ids = types.map(t => t.id);
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

        updatedPanels.forEach(panel => {
            newVisibility[panel.title] = panel.visible;
            newOrder.push(panel.title);
            if (panel.color) {
                newColors[panel.title] = panel.color;
            }
        });

        setPanelVisibility(newVisibility);
        setPanelOrder(newOrder);
        setPanelColors(newColors);

        savePanelSettingsToCookies(newVisibility, newOrder, newColors);
        setIsPanelSettingsModalOpen(false);
    };

    const handleResetPanelSettings = (): PanelConfig[] => {
        const allCategories = Object.keys(groupedTypes);
        return allCategories.map(category => ({
            title: category,
            visible: true,
            color: undefined
        }));
    };

    const getPanelConfigs = (): PanelConfig[] => {
        const order = panelOrder.length > 0 ? panelOrder : Object.keys(groupedTypes);

        return order.map(category => ({
            title: category,
            visible: panelVisibility[category] !== false,
            color: panelColors[category]
        }));
    };

    // Обработчики для перетаскивания на фон
    const handleDragOverBackground = (e: React.DragEvent) => {
        e.preventDefault();
        if (currentDragItem) {
            setIsDraggingOverBackground(true);
            const containerRect = containerRef.current?.getBoundingClientRect();
            if (containerRect) {
                const x = e.clientX - containerRect.left - PANEL_PREVIEW_WIDTH / 2;
                const y = e.clientY - containerRect.top - PANEL_HEADER_HEIGHT / 2;
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
            const draggedType = objectTypes.find(t => t.id === currentDragItem.itemId);
            if (draggedType) {
                setDraggedItemForNewCategory({
                    item: draggedType,
                    fromPanel: currentDragItem.fromPanel
                });
                const containerRect = containerRef.current?.getBoundingClientRect();
                if (containerRect) {
                    const x = e.clientX - containerRect.left - PANEL_PREVIEW_WIDTH / 2;
                    const y = e.clientY - containerRect.top - PANEL_HEADER_HEIGHT / 2;
                    setNewPanelDropPosition({ x, y });
                }
                setIsModalOpen(true);
            }
        }
        setCurrentDragItem(null);
        setIsDraggingOverBackground(false);
    };

    // Обработчик создания новой панели
    const handleCreateNewPanel = async (newCategoryName: string) => {
        if (!draggedItemForNewCategory) return;

        const { item, fromPanel } = draggedItemForNewCategory;

        try {
            const success = await updateObjectTypeCategory(item.id, newCategoryName);
            if (!success) {
                alert('Не удалось сохранить категорию на сервере');
                return;
            }

            const updatedFromPanelTypes = groupedTypes[fromPanel].filter(t => t.id !== item.id);
            const updatedItem = { ...item, viewCategory: newCategoryName };

            const updatedGroupedTypes = {
                ...groupedTypes,
                [fromPanel]: updatedFromPanelTypes,
                [newCategoryName]: [updatedItem]
            };

            setGroupedTypes(updatedGroupedTypes);
            setObjectTypes(prev => prev.map(t =>
                t.id === item.id ? updatedItem : t
            ));

            const newVisibility = {
                ...panelVisibility,
                [newCategoryName]: true
            };
            const newOrder = [...panelOrder, newCategoryName];
            const newColors = { ...panelColors };

            setPanelVisibility(newVisibility);
            setPanelOrder(newOrder);
            setPanelColors(newColors);

            savePanelSettingsToCookies(newVisibility, newOrder, newColors);

            savePanelOrderToCookie(fromPanel, updatedFromPanelTypes);
            savePanelOrderToCookie(newCategoryName, [updatedItem]);

            const newPosition = newPanelDropPosition || {
                x: (containerRef.current?.getBoundingClientRect().width || 800) / 2 - PANEL_PREVIEW_WIDTH / 2,
                y: (containerRef.current?.getBoundingClientRect().height || 600) / 2 - PANEL_PREVIEW_HEIGHT / 2
            };

            const clampedPosition = clampPanelPosition(newPosition);
            const allPositions = {
                ...panelPositions,
                [newCategoryName]: clampedPosition
            };
            setPanelPositions(allPositions);
            localStorage.setItem(STORAGE_KEY, JSON.stringify(allPositions));

            setExpiringItem(`categoryPanelHeight_${newCategoryName}`,
                (PANEL_HEADER_HEIGHT + PANEL_ITEM_HEIGHT + PANEL_RESIZER_HEIGHT).toString(),
                365 * 10
            );

            const isPrintable = await checkPrintable(item.id);
            setPrintableTypes(prev => ({
                ...prev,
                [item.id]: isPrintable
            }));

        } catch (err) {
            console.error('Ошибка при создании категории:', err);
            alert('Ошибка при создании категории');
        }
    };

    // Получаем название перетаскиваемого элемента для превью
    const getDraggedItemName = () => {
        if (!currentDragItem) return 'Элемент';
        const item = objectTypes.find(t => t.id === currentDragItem.itemId);
        return item?.name || 'Элемент';
    };

    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>Ошибка: {error}</div>;
    if (needsRedirect) return null;

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
            <div className={styles.createButtonContainer}>
                <FilledColorButton
                    onClick={() => navigate(`/schema-editor`)}
                    disabled={!isAdminOrMaster}
                    width="100px"
                >
                    Создать
                </FilledColorButton>

                <FilledColorButton
                    onClick={() => setIsTemplateSelectorOpen(true)}
                    disabled={!isAdminOrMaster}
                    width="100px"
                >
                    Печать
                </FilledColorButton>

                {/* Кнопка для показа связей */}
                <FilledColorButton
                    onClick={() => setShowConnections(!showConnections)}
                    mainColor={showConnections ? "#ffffff" : "#ffffff"}
                    additionalColor={showConnections ? "rgba(144, 160, 160, 1)" : "#699"}
                    width="100px"
                >
                    Связи
                </FilledColorButton>

                {/* Кнопка для создания панели из выделения */}
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

                <GearButton
                    strokeWidth={4}
                    height="42px"
                    width="100px"
                    onClick={handlePanelSettingsClick}
                />
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

                {/* Компонент для отрисовки связей */}
                {showConnections && (
                    <ConnectionLines
                        connections={connections}
                        panelPositions={panelPositions}
                        groupedTypes={groupedTypes}
                        containerRef={containerRef}
                    />
                )}

                <div ref={containerRef} className={styles.panelsArea}>
                    {getPanelConfigs()
                        .filter(panel => panel.visible && groupedTypes[panel.title]?.length > 0)
                        .map(panel => (
                            <DraggableCategoryPanel
                                key={panel.title}
                                category={panel.title}
                                types={groupedTypes[panel.title] || []}
                                printableTypes={printableTypes}
                                position={panelPositions[panel.title] || { x: 100, y: 100 }}
                                onPositionChange={(newPosition) => handlePositionChange(panel.title, newPosition)}
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

            {/* Модальное окно для выбора цвета при создании панели из выделения */}
            <ColorSelectionModal
                isOpen={isColorModalOpen}
                onClose={() => setIsColorModalOpen(false)}
                onColorSelect={(color) => {
                    const selectedItems = objectTypes.filter(t => selectedTypes.has(t.id));
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
        </div>
    );
};

export default HomePage;