import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './ColumnSettingsModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface ColumnConfig {
  title: string;
  accessor: string;
  visible: boolean;
}

interface Props {
  initialColumns: ColumnConfig[];
  defaultColumns: ColumnConfig[];
  onApply: (updated: ColumnConfig[]) => void;
  onReset: () => ColumnConfig[];
  onCancel: () => void;
}

const ColumnSettingsModal: React.FC<Props> = ({ 
  initialColumns, 
  defaultColumns,
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
    console.log('🔄 Сброс настроек в модальном окне:', resetCols);
    setColumns(resetCols.map(col => ({ ...col })));
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        console.log('💾 Применение настроек из модального окна:', columns);
        onApply(columns);
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
  }, [onApply, onCancel, columns]);

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

  return (
    <dialog 
      className={styles.modalBackdrop} 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      data-testid="modal-backdrop"
    >
      <article className={styles.modalColumnSettings}>
        <h2 className={styles.modalTitle}>Настройка колонок</h2>

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

        <div className={styles.modalActions}>
          <FilledColorButton 
            width='94px'
            onClick={() => {
              console.log('💾 Применение настроек из модального окна:', columns);
              onApply(columns);
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
    </dialog>
  );
};

export default ColumnSettingsModal;