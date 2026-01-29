import React, { useState, useMemo, useRef, useCallback } from 'react';
import styles from './ObjectsTableComponent.module.css';
import DeleteButton from '@commons/DeleteButton/DeleteButton';
import ViewButton from '@commons/ViewButton/ViewButton';

interface Row {
  id: string;
  [key: string]: unknown;
}

interface Column {
  title: string;
  accessor: string;
  visible: boolean;
}

interface ObjectTableComponentProps {
  rows: Row[];
  columns: Column[];
  onEdit: (id: string) => void;
  onDelete: (id: string, originalRow: Row) => void;
  onColumnOrderChange?: (newColumns: Column[]) => void;
}

const ObjectTableComponent: React.FC<ObjectTableComponentProps> = ({
  rows,
  columns,
  onEdit,
  onDelete,
  onColumnOrderChange,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  
  // === НОВАЯ D&D СИСТЕМА ===
  const [dragState, setDragState] = useState<{
    isDragging: boolean;
    draggedAccessor: string | null;
    insertionIndex: number | null;
    startX: number;
    startScrollLeft: number;
  }>({
    isDragging: false,
    draggedAccessor: null,
    insertionIndex: null,
    startX: 0,
    startScrollLeft: 0
  });

  const tooltipTimeoutRef = useRef<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const autoScrollRef = useRef<number | null>(null);
  const clickThreshold = 5;

  const visibleColumns = useMemo(() => 
    columns.filter(column => column.visible), 
  [columns]);

  const isNarrowTable = visibleColumns.length <= 3;

  const columnAlignment = useMemo(() => {
    const alignment: Record<string, 'center' | 'left'> = {};
    visibleColumns.forEach(column => {
      const accessor = column.accessor;
      if (isNarrowTable) {
        alignment[accessor] = 'center';
      } else {
        const sampleValues = rows.slice(0, 10).map(row => row[accessor]);
        const hasBoolean = sampleValues.some(val => typeof val === 'boolean');
        const allShort = sampleValues.every(val => {
          const strVal = String(val ?? '');
          return strVal.length <= 5;
        });
        alignment[accessor] = (hasBoolean || allShort) ? 'center' : 'left';
      }
    });
    return alignment;
  }, [visibleColumns, rows, isNarrowTable]);

  const getColumnWidth = (accessor: string): number => {
    return columnWidths[accessor] || (isNarrowTable ? 200 : 130);
  };

  const handleResizeStart = (accessor: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setResizingColumn(accessor);
    const startX = e.clientX;
    const startWidth = getColumnWidth(accessor);
    const handleMouseMove = (moveEvent: MouseEvent) => {
      const newWidth = Math.max(80, startWidth + (moveEvent.clientX - startX));
      setColumnWidths(prev => ({ ...prev, [accessor]: newWidth }));
    };
    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      setResizingColumn(null);
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleSort = (accessor: string) => {
    if (sortColumn === accessor) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(accessor);
      setSortDirection('asc');
    }
  };

  const sortedRows = useMemo(() => {
    if (!sortColumn) return rows;
    return [...rows].sort((a, b) => {
      const aVal = String(a[sortColumn] ?? '');
      const bVal = String(b[sortColumn] ?? '');
      return sortDirection === 'asc'
        ? aVal.localeCompare(bVal)
        : bVal.localeCompare(aVal);
    });
  }, [rows, sortColumn, sortDirection]);

  const getSortIndicator = (accessor: string) => {
    if (sortColumn !== accessor) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const handleCellMouseEnter = (e: React.MouseEvent, value: unknown, accessor: string) => {
    const target = e.currentTarget as HTMLTableCellElement;
    const isTextTruncated = target.scrollWidth > target.clientWidth;
    if (isTextTruncated) {
      const content = renderTooltipContent(value, accessor);
      if (content) {
        tooltipTimeoutRef.current = window.setTimeout(() => {
          setTooltip({
            content,
            x: e.clientX,
            y: e.clientY
          });
        }, 300);
      }
    }
  };

  const handleCellMouseLeave = () => {
    if (tooltipTimeoutRef.current !== null) {
      clearTimeout(tooltipTimeoutRef.current);
      tooltipTimeoutRef.current = null;
    }
    setTooltip(null);
  };

  const renderTooltipContent = (value: unknown, accessor: string): string => {
    if (typeof value === 'boolean') {
      return value ? 'Да' : 'Нет';
    }
    if (typeof value === 'string') {
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (isoDateRegex.test(value)) {
        const [year, month, day] = value.split('-');
        return `${day}.${month}.${year}`;
      }
    }
    return String(value ?? '');
  };

  const renderCellContent = (value: unknown, accessor: string) => {
    const strValue = String(value ?? '');
    if (typeof value === 'boolean') {
      return (
        <div className={styles.booleanContainer}>
          <span className={value ? styles.booleanTrue : styles.booleanFalse}>
            {value ? '✓' : '✕'}
          </span>
        </div>
      );
    }
    if (typeof value === 'string') {
      const isoDateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (isoDateRegex.test(value)) {
        const [year, month, day] = value.split('-');
        return `${day}.${month}.${year}`;
      }
    }
    return strValue;
  };

  // === НОВАЯ D&D СИСТЕМА - ПРОСТАЯ И РАБОЧАЯ ===
  const startColumnDrag = (accessor: string, e: React.MouseEvent) => {
    e.preventDefault();
    
    const container = containerRef.current;
    if (!container || !tableRef.current) return;

    const startX = e.clientX;
    const startScrollLeft = container.scrollLeft;
    
    setDragState({
      isDragging: true,
      draggedAccessor: accessor,
      insertionIndex: null,
      startX,
      startScrollLeft
    });

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragState.isDragging) return;

      // Автоскролл при подходе к краям
      const rect = container.getBoundingClientRect();
      const edgeMargin = 50;
      const speed = 15;
      
      if (autoScrollRef.current) clearInterval(autoScrollRef.current);
      
      if (moveEvent.clientX < rect.left + edgeMargin) {
        autoScrollRef.current = window.setInterval(() => {
          container.scrollLeft -= speed;
        }, 20);
      } else if (moveEvent.clientX > rect.right - edgeMargin) {
        autoScrollRef.current = window.setInterval(() => {
          container.scrollLeft += speed;
        }, 20);
      }

      // Обновляем позицию линии вставки
      updateInsertionLine(moveEvent.clientX);
    };

    const handleMouseUp = () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      if (autoScrollRef.current) {
        clearInterval(autoScrollRef.current);
        autoScrollRef.current = null;
      }

      // Применяем изменения порядка колонок
      applyColumnReorder();
      
      setDragState({
        isDragging: false,
        draggedAccessor: null,
        insertionIndex: null,
        startX: 0,
        startScrollLeft: 0
      });
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const updateInsertionLine = (clientX: number) => {
    if (!tableRef.current || !dragState.draggedAccessor) return;

    const tableRect = tableRef.current.getBoundingClientRect();
    const headers = Array.from(tableRef.current.querySelectorAll('thead th:not(.actionsHeader)')) as HTMLElement[];
    
    let newInsertionIndex = headers.length;
    
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i];
      const headerRect = header.getBoundingClientRect();
      const headerCenter = headerRect.left + headerRect.width / 2;
      
      if (clientX < headerCenter) {
        newInsertionIndex = i;
        break;
      }
    }
    
    setDragState(prev => ({
      ...prev,
      insertionIndex: newInsertionIndex
    }));
  };

  const applyColumnReorder = () => {
    const { draggedAccessor, insertionIndex } = dragState;
    
    if (!draggedAccessor || insertionIndex === null) return;

    const oldIndex = visibleColumns.findIndex(col => col.accessor === draggedAccessor);
    if (oldIndex === -1 || oldIndex === insertionIndex) return;

    console.log('🔄 Перемещение колонки:', {
      from: oldIndex,
      to: insertionIndex,
      column: draggedAccessor
    });

    // Создаем новый порядок ВИДИМЫХ колонок
    const newVisibleColumns = [...visibleColumns];
    const [movedColumn] = newVisibleColumns.splice(oldIndex, 1);
    newVisibleColumns.splice(insertionIndex, 0, movedColumn);

    // Создаем полный массив колонок с учетом невидимых
    const invisibleColumns = columns.filter(col => !col.visible);
    const newAllColumns = [...newVisibleColumns, ...invisibleColumns];

    // Вызываем колбэк для сохранения
    onColumnOrderChange?.(newAllColumns);
  };

  const getInsertionLinePosition = (): number | null => {
    const { insertionIndex } = dragState;
    if (insertionIndex === null || !tableRef.current) return null;

    const headers = Array.from(tableRef.current.querySelectorAll('thead th:not(.actionsHeader)')) as HTMLElement[];
    
    if (insertionIndex === 0) {
      return 0;
    } else if (insertionIndex >= headers.length) {
      const lastHeader = headers[headers.length - 1];
      return lastHeader.offsetLeft + lastHeader.offsetWidth;
    } else {
      const targetHeader = headers[insertionIndex];
      return targetHeader.offsetLeft;
    }
  };

  const insertionLinePosition = getInsertionLinePosition();

  return (
    <>
      <section 
        className={styles.container} 
        ref={containerRef}
        onMouseMove={(e) => {
          if (dragState.isDragging) {
            updateInsertionLine(e.clientX);
          }
        }}
      >
        <table 
          className={`${styles.table} ${isNarrowTable ? styles.narrowTable : styles.wideTable}`}
          ref={tableRef}
        >
          <thead>
            <tr>
              {visibleColumns.map((column, index) => {
                const width = getColumnWidth(column.accessor);
                const alignment = columnAlignment[column.accessor];
                const isBeingDragged = dragState.draggedAccessor === column.accessor;
                
                return (
                  <th
                    key={column.accessor}
                    className={`${styles.headerCell} ${hoveredColumn === column.accessor ? styles.columnHovered : ''} ${alignment === 'center' ? styles.centeredHeader : styles.leftAlignedHeader} ${isBeingDragged ? styles.draggingColumn : ''}`}
                    style={{ 
                      width: `${width}px`,
                      opacity: isBeingDragged ? 0.5 : 1
                    }}
                    onMouseEnter={() => setHoveredColumn(column.accessor)}
                    onMouseLeave={() => setHoveredColumn(null)}
                    onMouseDown={(e) => {
                      if (e.button === 0) {
                        // ЛКМ - начинаем перетаскивание
                        startColumnDrag(column.accessor, e);
                      }
                    }}
                    onClick={(e) => {
                      // Сортировка только по клику, если не было перетаскивания
                      if (!dragState.isDragging) {
                        handleSort(column.accessor);
                      }
                    }}
                  >
                    <div className={alignment === 'center' ? styles.centeredContent : styles.leftAlignedContent}>
                      {column.title}
                      <span className={styles.sortIndicator}>
                        {getSortIndicator(column.accessor)}
                      </span>
                    </div>
                    <div 
                      className={styles.columnResizer}
                      onMouseDown={(e) => handleResizeStart(column.accessor, e)}
                    />
                  </th>
                );
              })}
              <th className={`${styles.actionsHeader} ${styles.headerCell}`}>
                <div className={styles.centeredContent}>
                  Действия
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {sortedRows.map(row => (
              <tr key={row.id} className={styles.row}>
                {visibleColumns.map(column => {
                  const width = getColumnWidth(column.accessor);
                  const alignment = columnAlignment[column.accessor];
                  const isBeingDragged = dragState.draggedAccessor === column.accessor;
                  
                  return (
                    <td 
                      key={column.accessor}
                      className={`${styles.cell} ${hoveredColumn === column.accessor ? styles.columnHovered : ''} ${alignment === 'center' ? styles.centeredCell : styles.leftAlignedCell}`}
                      style={{ 
                        width: `${width}px`,
                        opacity: isBeingDragged ? 0.3 : 1
                      }}
                      onMouseEnter={(e) => {
                        setHoveredColumn(column.accessor);
                        handleCellMouseEnter(e, row[column.accessor], column.accessor);
                      }}
                      onMouseLeave={() => {
                        setHoveredColumn(null);
                        handleCellMouseLeave();
                      }}
                    >
                      {renderCellContent(row[column.accessor], column.accessor)}
                    </td>
                  );
                })}
                <td className={styles.actionsCell}>
                  <div className={styles.actionsContainer}>
                    <ViewButton onClick={() => onEdit(row.id)} />
                    <DeleteButton onClick={() => onDelete(row.id, row)} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Линия вставки - ВО ВСЮ ВЫСОТУ ТАБЛИЦЫ */}
        {dragState.isDragging && insertionLinePosition !== null && (
          <div
            className={styles.insertionLine}
            style={{ 
              left: `${insertionLinePosition}px`,
              height: tableRef.current ? `${tableRef.current.offsetHeight}px` : '100%'
            }}
          />
        )}
      </section>

      {tooltip && (
        <div 
          className={styles.tooltip}
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </>
  );
};

export default ObjectTableComponent;