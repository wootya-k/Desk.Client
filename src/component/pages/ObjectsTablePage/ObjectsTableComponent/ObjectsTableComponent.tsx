import React, { useState, useMemo, useRef, useCallback } from 'react';
import styles from './ObjectsTableComponent.module.css';
import DeleteButton from '@commons/DeleteButton/DeleteButton';
import RestoreButton from '@commons/RestoreButton/RestoreButton';
import ViewButton from '@commons/ViewButton/ViewButton';

interface Row {
  id: string;
  status: boolean; // ✅ Добавили поле status
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
  onRestore: (id: string) => void;
  onColumnOrderChange?: (newColumns: Column[]) => void;
}

const ObjectTableComponent: React.FC<ObjectTableComponentProps> = ({
  rows,
  columns,
  onEdit,
  onDelete,
  onRestore,
  onColumnOrderChange,
}) => {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});

  const tooltipTimeoutRef = useRef<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
      return (
        <span className={styles.emptyCell}>[нет данных]</span>
      );
    }

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

  // ✅ Функция для рендера кнопки в зависимости от статуса
  const renderActionButton = (row: Row) => {
    if (row.status === true) {
      // Активный объект — показываем кнопку удаления
      return (
        <DeleteButton
          onClick={() => onDelete(row.id, row)}
          size={38}
          width='1px'
        />
      );
    } else {
      // Неактивный объект — показываем кнопку восстановления
      return (
        <RestoreButton
          onClick={() => onRestore(row.id)}
          size={30}
          width='1px'
        />
      );
    }
  };

  return (
    <>
      <section
        className={styles.container}
        ref={containerRef}
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

                return (
                  <th
                    key={column.accessor}
                    className={`${styles.headerCell} ${hoveredColumn === column.accessor ? styles.columnHovered : ''} ${alignment === 'center' ? styles.centeredHeader : styles.leftAlignedHeader}`}
                    style={{
                      width: `${width}px`,
                    }}
                    onMouseEnter={() => setHoveredColumn(column.accessor)}
                    onMouseLeave={() => setHoveredColumn(null)}
                    onClick={() => handleSort(column.accessor)}
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

                  return (
                    <td
                      key={column.accessor}
                      className={`${styles.cell} ${hoveredColumn === column.accessor ? styles.columnHovered : ''} ${alignment === 'center' ? styles.centeredCell : styles.leftAlignedCell}`}
                      style={{
                        width: `${width}px`,
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
                    <ViewButton
                      onClick={() => onEdit(row.id)}
                      size={26}
                    />
                    {/* ✅ Условный рендер кнопки в зависимости от статуса */}
                    {renderActionButton(row)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
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