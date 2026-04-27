import React, { useState, useMemo, useRef, useCallback } from 'react';
import styles from './ObjectsTableComponent.module.css';
import DeleteButton from '@commons/DeleteButton/DeleteButton';
import RestoreButton from '@commons/RestoreButton/RestoreButton';
import ViewButton from '@commons/ViewButton/ViewButton';

interface Row { id: string; status: boolean; [key: string]: unknown; }
interface Column { title: string; accessor: string; visible: boolean; }

interface ObjectTableComponentProps {
  rows: Row[]; columns: Column[]; onEdit: (id: string) => void;
  onDelete: (id: string, originalRow: Row) => void; onRestore: (id: string) => void;
  onColumnOrderChange?: (newColumns: Column[]) => void; onBrokenRefClick?: (uuid: string) => void;
  sortColumn: string | null; sortDirection: 'asc' | 'desc'; onSort: (accessor: string) => void;
  paginationEnabled?: boolean;
}

const ObjectTableComponent: React.FC<ObjectTableComponentProps> = ({
  rows, columns, onEdit, onDelete, onRestore, onBrokenRefClick, onColumnOrderChange,
  sortColumn, sortDirection, onSort, paginationEnabled = true,
}) => {
  const [tooltip, setTooltip] = useState<{ content: string; x: number; y: number } | null>(null);
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);
  const [resizingColumn, setResizingColumn] = useState<string | null>(null);
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({});
  const tooltipTimeoutRef = useRef<number | null>(null);
  const tableRef = useRef<HTMLTableElement>(null);

  const visibleColumns = useMemo(() => columns.filter(col => col.visible), [columns]);
  const isNarrowTable = visibleColumns.length <= 12;

  const columnAlignment = useMemo(() => {
    const alignment: Record<string, 'center' | 'left'> = {};
    visibleColumns.forEach(column => {
      const accessor = column.accessor;
      if (isNarrowTable) { alignment[accessor] = 'center'; return; }
      const sampleValues = rows.slice(0, 10).map(row => row[accessor]);
      const hasBoolean = sampleValues.some(val => typeof val === 'boolean');
      const allShort = sampleValues.every(val => String(val ?? '').length <= 5);
      alignment[accessor] = (hasBoolean || allShort) ? 'center' : 'left';
    });
    return alignment;
  }, [visibleColumns, rows, isNarrowTable]);

  
  const getColumnWidth = (accessor: string): number => columnWidths[accessor] || (isNarrowTable ? 200 : 130);

  const handleResizeStart = (accessor: string, e: React.MouseEvent) => {
    e.preventDefault(); e.stopPropagation(); setResizingColumn(accessor);
    const startX = e.clientX; const startWidth = getColumnWidth(accessor);
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

  const getSortIndicator = (accessor: string) => {
    if (sortColumn !== accessor) return '';
    return sortDirection === 'asc' ? ' ▲' : ' ▼';
  };

  const handleCellMouseEnter = (e: React.MouseEvent, value: unknown, accessor: string) => {
    const target = e.currentTarget as HTMLTableCellElement;
    if (typeof value === 'string') {
      const refRegex = /^ref\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i;
      const match = value.match(refRegex);
      if (match) {
        tooltipTimeoutRef.current = window.setTimeout(() => setTooltip({ content: match[1], x: e.clientX, y: e.clientY }), 300);
        return;
      }
    }
    if (target.scrollWidth > target.clientWidth) {
      const content = renderTooltipContent(value, accessor);
      if (content) tooltipTimeoutRef.current = window.setTimeout(() => setTooltip({ content, x: e.clientX, y: e.clientY }), 300);
    }
  };
  const handleCellMouseLeave = () => {
    if (tooltipTimeoutRef.current !== null) clearTimeout(tooltipTimeoutRef.current);
    tooltipTimeoutRef.current = null; setTooltip(null);
  };

  const renderTooltipContent = (value: unknown, accessor: string): string => {
    if (typeof value === 'string') {
      const refRegex = /^ref\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i;
      const match = value.match(refRegex); if (match) return match[1];
    }
    if (typeof value === 'boolean') return value ? 'Да' : 'Нет';
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-'); return `${day}.${month}.${year}`;
    }
    return String(value ?? '');
  };

  const renderCellContent = (value: unknown, accessor: string) => {
    if (typeof value === 'string') {
      const refRegex = /^ref\(([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\)$/i;
      const match = value.match(refRegex);
      if (match) {
        const uuid = match[1];
        return <span className={styles.brokenRef} onClick={(e) => { e.stopPropagation(); onBrokenRefClick?.(uuid); }} title="Нажмите для копирования ссылки">[битая ссылка]</span>;
      }
    }
    if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) return <span className={styles.emptyCell}>[нет данных]</span>;
    if (typeof value === 'boolean') return <div className={styles.booleanContainer}><span className={value ? styles.booleanTrue : styles.booleanFalse}>{value ? '✓' : '✕'}</span></div>;
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
      const [year, month, day] = value.split('-'); return `${day}.${month}.${year}`;
    }
    return String(value ?? '');
  };

  const renderActionButton = (row: Row) => row.status === true ? <DeleteButton onClick={() => onDelete(row.id, row)} size={38} width='1px' /> : <RestoreButton onClick={() => onRestore(row.id)} size={30} width='1px' />;

  return (
  <>
    <section className={styles.container}>
      <table className={`${styles.table} ${isNarrowTable ? styles.narrowTable : styles.wideTable}`} ref={tableRef}>
        <thead>
          <tr>
            {visibleColumns.map(column => {
              const width = getColumnWidth(column.accessor);
              const alignment = columnAlignment[column.accessor];
              return (
                <th 
                  key={column.accessor} 
                  className={`${styles.headerCell} ${styles[alignment === 'center' ? 'centeredHeader' : 'leftAlignedHeader']}`} 
                  style={{ width: `${width}px` }}
                  onClick={() => onSort(column.accessor)}
                >
                  <div className={alignment === 'center' ? styles.centeredContent : styles.leftAlignedContent}>
                    {column.title}
                    <span className={styles.sortIndicator}>{getSortIndicator(column.accessor)}</span>
                  </div>
                  <div className={styles.columnResizer} onMouseDown={(e) => handleResizeStart(column.accessor, e)} />
                </th>
              );
            })}
            <th className={`${styles.actionsHeader} ${styles.headerCell}`}>
              <div className={styles.centeredContent}>Действия</div>
            </th>
          </tr>
        </thead>
          <tbody>
            {rows.map((row: Row) => (
              <tr key={row.id} className={styles.row}>
                {visibleColumns.map(column => {
                  const width = getColumnWidth(column.accessor);
                  const alignment = columnAlignment[column.accessor];
                  return (
                    <td key={column.accessor} className={`${styles.cell} ${hoveredColumn === column.accessor ? styles.columnHovered : ''} ${alignment === 'center' ? styles.centeredCell : styles.leftAlignedCell}`} style={{ width: `${width}px` }} onMouseEnter={(e) => { setHoveredColumn(column.accessor); handleCellMouseEnter(e, row[column.accessor], column.accessor); }} onMouseLeave={() => { setHoveredColumn(null); handleCellMouseLeave(); }}>
                      {renderCellContent(row[column.accessor], column.accessor)}
                    </td>
                  );
                })}
                <td className={styles.actionsCell}>
                  <div className={styles.actionsContainer}>
                    <ViewButton onClick={() => onEdit(row.id)} size={26} />
                    {renderActionButton(row)}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
      {tooltip && <div className={styles.tooltip} style={{ left: tooltip.x + 10, top: tooltip.y + 10 }}>{tooltip.content}</div>}
    </>
  );
};

export default ObjectTableComponent;