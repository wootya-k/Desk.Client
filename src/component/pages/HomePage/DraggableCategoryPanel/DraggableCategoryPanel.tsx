// src/component/pages/HomePage/DraggableCategoryPanel/DraggableCategoryPanel.tsx

import React, { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from 'react';
import { ObjectType } from '@models';
import panelStyles from './DraggableCategoryPanel.module.css';
import { setExpiringItem, getExpiringItem } from 'utils/LocalStorageUtils';
import ContextMenu from '@commons/ContextMenu/ContextMenu';

interface DraggableCategoryPanelProps {
    category: string;
    types: ObjectType[];
    printableTypes: Record<string, boolean>;
    position: { x: number; y: number };
    onPositionChange: (newPosition: { x: number; y: number }) => void;
    onItemClick: (typeId: string, panelId: string, index: number, e: React.MouseEvent) => void;
    isActive: boolean;
    onActivate: () => void;
    onItemDragStart: (item: ObjectType, fromPanel: string, index: number) => void;
    onItemDragOver: (e: React.DragEvent, toIndex: number, toPanel: string) => void;
    onItemDrop: (e: React.DragEvent, toIndex: number, toPanel: string) => void;
    onItemDragEnd: () => void;
    currentDragItem: { itemId: string; fromPanel: string; index: number } | null;
    selectedTypes: Set<string>;
    color?: string;
    containerRef: React.RefObject<HTMLDivElement>;
}

interface ContextMenuState {
    x: number;
    y: number;
    typeId: string;
    index: number;
}

const DraggableCategoryPanel = forwardRef<HTMLDivElement, DraggableCategoryPanelProps>(({
    category,
    types,
    printableTypes,
    position,
    onPositionChange,
    onItemClick,
    isActive,
    onActivate,
    onItemDragStart,
    onItemDragOver,
    onItemDrop,
    onItemDragEnd,
    currentDragItem,
    selectedTypes,
    color,
    containerRef,
}, ref) => {
    const [isDragging, setIsDragging] = useState(false);
    const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
    const [isResizing, setIsResizing] = useState(false);
    const [resizeStart, setResizeStart] = useState({ y: 0, panelHeight: 0 });
    const [listMaxHeight, setListMaxHeight] = useState<number | null>(null);
    const [isAtBoundary, setIsAtBoundary] = useState({ top: false, bottom: false, left: false, right: false });
    const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

    const internalPanelRef = useRef<HTMLDivElement>(null);
    const listRef = useRef<HTMLUListElement>(null);
    const scrollInterval = useRef<number | null>(null);

    const ITEM_HEIGHT = 44;
    const HEADER_HEIGHT = 44;
    const DEFAULT_MAX_HEIGHT = 800 - HEADER_HEIGHT;
    const RESIZER_HEIGHT = 6;
    const PANEL_WIDTH = 250;
    const PANEL_HEADER_HEIGHT = 44;

    const cookieKeyHeight = `categoryPanelHeight_${category}`;
    const maxContentHeight = types.length * ITEM_HEIGHT;

    useImperativeHandle(ref, () => {
        if (internalPanelRef.current) {
            return internalPanelRef.current;
        }
        return document.createElement('div');
    }, []);

    useEffect(() => {
        const savedHeight = getExpiringItem(cookieKeyHeight);
        let initialHeight: number;

        if (savedHeight) {
            try {
                initialHeight = parseInt(savedHeight, 10);
            } catch (e) {
                initialHeight = DEFAULT_MAX_HEIGHT;
            }
        } else {
            initialHeight = DEFAULT_MAX_HEIGHT;
        }

        setListMaxHeight(initialHeight);
    }, [cookieKeyHeight, DEFAULT_MAX_HEIGHT]);

    const saveHeightToCookie = useCallback((height: number) => {
        setExpiringItem(cookieKeyHeight, height.toString(), 365 * 10);
    }, [cookieKeyHeight]);

    const checkBoundaries = useCallback((newPosition: { x: number; y: number }) => {
        const panelEl = internalPanelRef.current;
        if (!containerRef.current || !panelEl) return;

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

        const boundaries = {
            top: newPosition.y <= visibleArea.top,
            bottom: newPosition.y >= visibleArea.bottom - PANEL_HEADER_HEIGHT,
            left: newPosition.x <= visibleArea.left,
            right: newPosition.x >= visibleArea.right - PANEL_WIDTH
        };

        setIsAtBoundary(boundaries);
    }, [containerRef]);

    const handleHeaderMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onActivate();
        setIsDragging(true);
        setDragOffset({
            x: e.clientX - position.x,
            y: e.clientY - position.y
        });
    };

    const handlePanelClick = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button') ||
            (e.target as HTMLElement).closest('.' + panelStyles.navItem)) {
            return;
        }
        onActivate();
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (isDragging && internalPanelRef.current) {
            const newPosition = {
                x: e.clientX - dragOffset.x,
                y: e.clientY - dragOffset.y
            };
            checkBoundaries(newPosition);
            onPositionChange(newPosition);
        }
    }, [isDragging, dragOffset, onPositionChange, checkBoundaries]);

    const handleMouseUp = useCallback(() => {
        if (isResizing && listMaxHeight !== null) {
            saveHeightToCookie(listMaxHeight);
        }
        setIsDragging(false);
        setIsResizing(false);
        setTimeout(() => setIsAtBoundary({ top: false, bottom: false, left: false, right: false }), 300);
    }, [isResizing, listMaxHeight, saveHeightToCookie]);

    const handleResizerMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        onActivate();
        setIsResizing(true);
        if (internalPanelRef.current) {
            setResizeStart({
                y: e.clientY,
                panelHeight: internalPanelRef.current.offsetHeight
            });
        }
    };

    const handleResizeMove = useCallback((e: MouseEvent) => {
        if (!isResizing || !internalPanelRef.current) return;
        const deltaY = e.clientY - resizeStart.y;
        const newPanelHeight = resizeStart.panelHeight + deltaY;
        const minHeight = HEADER_HEIGHT + ITEM_HEIGHT + RESIZER_HEIGHT;
        if (newPanelHeight < minHeight) return;
        const contentHeight = newPanelHeight - HEADER_HEIGHT - RESIZER_HEIGHT - 2;
        setListMaxHeight(contentHeight);
    }, [isResizing, resizeStart, HEADER_HEIGHT, ITEM_HEIGHT, RESIZER_HEIGHT]);

    const handleDragStart = (type: ObjectType, index: number, e: React.DragEvent) => {
        e.stopPropagation();
        onItemDragStart(type, category, index);
        if (listRef.current) {
            listRef.current.addEventListener('wheel', handleWheel, { passive: false });
        }
    };

    const handleDragEnd = (e: React.DragEvent) => {
        e.stopPropagation();
        onItemDragEnd();
        if (listRef.current) {
            listRef.current.removeEventListener('wheel', handleWheel);
        }
    };

    const handleWheel = useCallback((e: WheelEvent) => {
        e.preventDefault();
        if (listRef.current) {
            listRef.current.scrollTop += e.deltaY;
        }
    }, []);

    const handleKeyDown = (typeId: string, panelId: string, index: number, e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            const syntheticEvent = {
                stopPropagation: () => { },
                ctrlKey: e.ctrlKey,
                shiftKey: e.shiftKey,
                metaKey: e.metaKey,
            } as unknown as React.MouseEvent;
            onItemClick(typeId, panelId, index, syntheticEvent);
        }
    };

    const startScroll = (direction: number) => {
        if (scrollInterval.current) return;
        scrollInterval.current = window.setInterval(() => {
            if (listRef.current) {
                listRef.current.scrollTop += direction * 10;
            }
        }, 20);
    };

    const stopScroll = () => {
        if (scrollInterval.current) {
            clearInterval(scrollInterval.current);
            scrollInterval.current = null;
        }
    };

    useEffect(() => {
        if (isDragging || isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, isResizing, handleMouseMove, handleMouseUp]);

    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResizeMove);
        }
        return () => {
            document.removeEventListener('mousemove', handleResizeMove);
            stopScroll();
        };
    }, [isResizing, handleResizeMove]);

    // Скрываем контекстное меню при скролле и прокрутке панели
    useEffect(() => {
        if (!contextMenu) return;

        const hideMenu = () => setContextMenu(null);
        const handleWheelEvent = () => hideMenu();

        window.addEventListener('resize', hideMenu);
        window.addEventListener('scroll', hideMenu, true);
        if (listRef.current) {
            listRef.current.addEventListener('scroll', handleWheelEvent);
        }

        return () => {
            window.removeEventListener('resize', hideMenu);
            window.removeEventListener('scroll', hideMenu, true);
            if (listRef.current) {
                listRef.current.removeEventListener('scroll', handleWheelEvent);
            }
        };
    }, [contextMenu]);

    const handleContextMenu = (typeId: string, index: number, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setContextMenu({
            x: e.clientX,
            y: e.clientY,
            typeId,
            index,
        });
    };

    const handleItemClickDirect = (
        typeId: string,
        panelId: string,
        index: number,
        e: React.MouseEvent
    ) => {
        // Если открыто контекстное меню — закрываем его перед кликом
        if (contextMenu) {
            setContextMenu(null);
        }
        onItemClick(typeId, panelId, index, e);
    };

    const hideScrollbar = listMaxHeight !== null && listMaxHeight >= maxContentHeight;

    const handleListDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleListDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!listRef.current || !currentDragItem) return;
        const rect = listRef.current.getBoundingClientRect();
        const y = e.clientY - rect.top;
        const index = Math.floor(y / ITEM_HEIGHT);
        const safeIndex = Math.max(0, Math.min(index, types.length));
        onItemDrop(e, safeIndex, category);
    };

    const boundaryClass = Object.values(isAtBoundary).some(Boolean) ? panelStyles.atBoundary : '';

    return (
        <div
            ref={internalPanelRef}
            className={`${panelStyles.categoryPanel} ${boundaryClass}`}
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                zIndex: isActive ? 1000 : 1,
                userSelect: isResizing ? 'none' : undefined,
                pointerEvents: 'auto',
            }}
            onClick={handlePanelClick}
            onContextMenu={(e) => e.preventDefault()}
        >
            {isAtBoundary.top && <div className={`${panelStyles.boundaryIndicator} ${panelStyles.topBoundary}`} />}
            {isAtBoundary.bottom && <div className={`${panelStyles.boundaryIndicator} ${panelStyles.bottomBoundary}`} />}
            {isAtBoundary.left && <div className={`${panelStyles.boundaryIndicator} ${panelStyles.leftBoundary}`} />}
            {isAtBoundary.right && <div className={`${panelStyles.boundaryIndicator} ${panelStyles.rightBoundary}`} />}

            <div
                className={panelStyles.panelHeader}
                onMouseDown={handleHeaderMouseDown}
                style={{
                    cursor: isDragging ? 'grabbing' : 'grab',
                    backgroundColor: color || '#3498db'
                }}
            >
                {category}
            </div>

            <ul
                ref={listRef}
                className={panelStyles.panelList}
                style={{
                    maxHeight: listMaxHeight !== null ? `${listMaxHeight}px` : '800px',
                    overflowY: hideScrollbar ? 'hidden' : 'auto',
                }}
                onDragOver={handleListDragOver}
                onDrop={handleListDrop}
            >
                {types.map((type, index) => (
                    <li
                        key={type.id}
                        className={`${panelStyles.navItem} ${currentDragItem?.itemId === type.id ? panelStyles.dragging : ''} ${selectedTypes.has(type.id) ? panelStyles.selected : ''}`}
                        onClick={(e) => handleItemClickDirect(type.id, category, index, e)}
                        onContextMenu={(e) => handleContextMenu(type.id, index, e)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => handleKeyDown(type.id, category, index, e)}
                        draggable
                        onDragStart={(e) => handleDragStart(type, index, e)}
                        onDragEnd={handleDragEnd}
                    >
                        <span className={panelStyles.typeName}>{type.name}</span>
                        <div className={panelStyles.icons}>
                            {printableTypes[type.id] && <span className={panelStyles.printIcon}>🖨️</span>}
                        </div>
                    </li>
                ))}
            </ul>

            <div className={panelStyles.resizeHandle} onMouseDown={handleResizerMouseDown} />

            {contextMenu && (
                <ContextMenu
                    x={contextMenu.x}
                    y={contextMenu.y}
                    items={[
                        {
                            label: 'Открыть в новой вкладке',
                            onClick: () => {
                                window.open(
                                    `/view-objects/${contextMenu.typeId}`,
                                    '_blank',
                                    'noopener,noreferrer'
                                );
                            },
                        },
                        {
                            label: 'Открыть в этой вкладке',
                            onClick: () => {
                                const syntheticEvent = {
                                    stopPropagation: () => { },
                                    ctrlKey: false,
                                    shiftKey: false,
                                    metaKey: false,
                                } as unknown as React.MouseEvent;
                                onItemClick(
                                    contextMenu.typeId,
                                    category,
                                    contextMenu.index,
                                    syntheticEvent
                                );
                            },
                        },
                        {
                            label: 'Копировать название',
                            onClick: () => {
                                const type = types[contextMenu.index];
                                if (type) {
                                    navigator.clipboard.writeText(type.name);
                                }
                            },
                        },
                        {
                            label: 'Копировать ссылку',
                            onClick: () => {
                                const url = `${window.location.origin}/view-objects/${contextMenu.typeId}`;
                                navigator.clipboard.writeText(url);
                            },
                        },
                    ]}
                    onClose={() => setContextMenu(null)}
                />
            )}
        </div>
    );
});

DraggableCategoryPanel.displayName = 'DraggableCategoryPanel';

export default DraggableCategoryPanel;