import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './ColumnSettingsModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface ColumnConfig {
  title: string;
  accessor: string;
  visible: boolean;
}

interface PaginationConfig {
  enabled: boolean;
  rowsPerPage: number;
}

interface Props {
  initialColumns: ColumnConfig[];
  defaultColumns: ColumnConfig[];
  initialPagination?: PaginationConfig;
  onApply: (updated: ColumnConfig[], pagination?: PaginationConfig) => void;
  onReset: () => ColumnConfig[];
  onCancel: () => void;
}

const ColumnSettingsModal: React.FC<Props> = ({
  initialColumns,
  defaultColumns,
  initialPagination = { enabled: true, rowsPerPage: 14 },
  onApply,
  onReset,
  onCancel
}) => {
  const [columns, setColumns] = useState<ColumnConfig[]>([...initialColumns]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const scrollInterval = useRef<number | null>(null);
  const [isMouseDown, setIsMouseDown] = useState(false);

  const [showPaginationView, setShowPaginationView] = useState(false);
  const [paginationConfig, setPaginationConfig] = useState<PaginationConfig>(initialPagination);
  const [rowsPerPageInput, setRowsPerPageInput] = useState<string>(String(initialPagination.rowsPerPage));

  const move = (from: number, to: number) => {
    if (from === to) return;
    const newColumns = [...columns];
    const [moved] = newColumns.splice(from, 1);
    newColumns.splice(to, 0, moved);
    setColumns(newColumns);
  };

  const toggleVisibility = (index: number) => {
    const oldColumns = [...columns];
    const column = oldColumns[index];
    const wasVisible = column.visible;
    oldColumns.splice(index, 1);
    column.visible = !wasVisible;

    if (!column.visible) {
      const lastVisibleIndex = oldColumns.reduce((lastIdx, col, idx) =>
        col.visible ? idx : lastIdx, -1);
      oldColumns.splice(lastVisibleIndex + 1, 0, column);
    } else {
      const firstInvisibleIndex = oldColumns.findIndex(col => !col.visible);
      const insertIndex = firstInvisibleIndex !== -1 ? firstInvisibleIndex : oldColumns.length;
      oldColumns.splice(insertIndex, 0, column);
    }
    setColumns(oldColumns);
  };

  const handleReset = () => {
    const resetCols = onReset();
    setColumns(resetCols.map(col => ({ ...col })));
    const defaultPagination: PaginationConfig = { enabled: true, rowsPerPage: 14 };
    setPaginationConfig(defaultPagination);
    setRowsPerPageInput('14');
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

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    if (listRef.current) {
      listRef.current.scrollTop += e.deltaY;
    }
  }, []);

  const handleDragStart = (index: number) => {
    setDragIndex(index);
    if (listRef.current) {
      listRef.current.addEventListener('wheel', handleWheel);
    }
  };

  const endDrag = () => {
    setDragIndex(null);
    setOverIndex(null);
    stopScroll();
    if (listRef.current) {
      listRef.current.removeEventListener('wheel', handleWheel);
    }
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setOverIndex(index);
    if (listRef.current) {
      const { top, bottom, height } = listRef.current.getBoundingClientRect();
      const cursorY = e.clientY;
      const scrollThreshold = height * 0.2;
      stopScroll();
      if (cursorY < top + scrollThreshold) {
        startScroll(-1);
      } else if (cursorY > bottom - scrollThreshold) {
        startScroll(1);
      }
    }
  };

  const handleDrop = () => {
    if (dragIndex !== null && overIndex !== null && dragIndex !== overIndex) {
      move(dragIndex, overIndex);
    }
    endDrag();
  };

  const toggleView = useCallback((): void => {
    setShowPaginationView(prev => !prev);
  }, []);

  // ✅ Исправлено: клик по всей панели переключает пагинацию
  const handleTogglePanelClick = useCallback((e: React.MouseEvent<HTMLDivElement>): void => {
    const target = e.target as HTMLElement;
    // Если клик был по чекбоксу - ничего не делаем (чекбокс сам переключится)
    if (target.tagName === 'INPUT' && (target as HTMLInputElement).type === 'checkbox') {
      return;
    }
    setPaginationConfig(prev => ({ ...prev, enabled: !prev.enabled }));
  }, []);

  const handleRowsPerPageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>): void => {
    const value = e.target.value;
    setRowsPerPageInput(value);
    
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 1000) {
      setPaginationConfig(prev => ({ ...prev, rowsPerPage: numValue }));
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onApply(columns, paginationConfig);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      stopScroll();
    };
  }, [onApply, onCancel, columns, paginationConfig]);

  useEffect(() => {
    setRowsPerPageInput(String(paginationConfig.rowsPerPage));
  }, [paginationConfig.rowsPerPage]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsMouseDown(true);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isMouseDown && e.target === e.currentTarget) {
      onCancel();
    }
    setIsMouseDown(false);
  };

  return ReactDOM.createPortal(
    <dialog
      className={styles.modalBackdrop}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      data-testid="modal-backdrop"
    >
      <article className={styles.modalColumnSettings}>
        <button
          className={styles.togglePreviewBtn}
          onClick={toggleView}
          title={showPaginationView ? 'Настройки колонок' : 'Настройки пагинации'}
          type="button"
          aria-label="Переключить просмотр"
        >
          <span className={styles.toggleIcon}>—</span>
        </button>
        <button
          className={styles.resetButton}
          onClick={onCancel}
          title="Закрыть"
          type="button"
          aria-label="Закрыть"
        >
          <span className={styles.closeIcon}>✕</span>
        </button>
        <h2 className={styles.modalTitle}>
          {showPaginationView ? 'Настройки пагинации' : 'Настройка колонок'}
        </h2>

        {showPaginationView ? (
          <div className={styles.paginationContent}>
            {/* ✅ Панель включения пагинации - клик по всей панели */}
            <div 
              className={styles.paginationTogglePanel}
              onClick={handleTogglePanelClick}
            >
              <label className={styles.paginationToggleLabel}>
                <input
                  type="checkbox"
                  checked={paginationConfig.enabled}
                  onChange={(e) => {
                    e.stopPropagation();
                    setPaginationConfig(prev => ({ ...prev, enabled: e.target.checked }));
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
                <span className={styles.toggleLabelText}>Включить пагинацию</span>
              </label>
              <div className={styles.paginationHint}>
                При отключении будут отображаться все строки сразу
              </div>
            </div>

            {/* Панель количества строк */}
            <div className={styles.paginationRowsPanel}>
              <label className={styles.paginationRowsLabel}>
                <span className={styles.rowsLabel}>Строк на странице:</span>
                <input
                  type="number"
                  className={styles.rowsPerPageInput}
                  value={rowsPerPageInput}
                  onChange={handleRowsPerPageChange}
                  min={1}
                  max={1000}
                  disabled={!paginationConfig.enabled}
                />
              </label>
              <div className={styles.paginationHint}>
                Будет отображаться по <strong>{paginationConfig.enabled && paginationConfig.rowsPerPage > 0 && paginationConfig.rowsPerPage <= 1000 ? paginationConfig.rowsPerPage : '—'}</strong> строк на странице
              </div>
            </div>
          </div>
        ) : (
          <ul
            className={styles.columnList}
            ref={listRef}
          >
            {columns.map((col, idx) => (
              <li
                key={col.accessor}
                className={`${styles.columnItem} ${dragIndex === idx ? styles.dragging : ''} ${overIndex === idx ? styles.dragOver : ''}`}
                draggable
                onDragStart={() => handleDragStart(idx)}
                onDragOver={(e) => handleDragOver(e, idx)}
                onDragLeave={() => setOverIndex(null)}
                onDrop={handleDrop}
                onDragEnd={endDrag}
              >
                <input
                  type="checkbox"
                  checked={col.visible}
                  onChange={() => toggleVisibility(idx)}
                />
                <span className={styles.columnTitle}>{col.title}</span>
                <div className={styles.moveButtons}>
                  <button
                    className={styles.moveButton}
                    disabled={idx === 0}
                    onClick={() => move(idx, idx - 1)}
                  >
                    ↑
                  </button>
                  <button
                    className={styles.moveButton}
                    disabled={idx === columns.length - 1}
                    onClick={() => move(idx, idx + 1)}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <div className={styles.modalActions}>
          <FilledColorButton
            width='94px'
            onClick={() => {
              onApply(columns, paginationConfig);
            }}
          >
            Применить
          </FilledColorButton>
          <FilledColorButton
            width='94px'
            mainColor="#FFFFFF"
            additionalColor="#f39c12"
            onClick={handleReset}
          >
            Сбросить
          </FilledColorButton>
          <FilledColorButton
            width='94px'
            mainColor="#FFFFFF"
            additionalColor="#e74c3c"
            onClick={onCancel}
          >
            Отмена
          </FilledColorButton>
        </div>
      </article>
    </dialog>,
    document.getElementById('modal-root')!
  );
};

export default ColumnSettingsModal;