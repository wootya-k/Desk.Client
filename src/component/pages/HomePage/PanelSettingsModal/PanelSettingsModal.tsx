import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import styles from './PanelSettingsModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface PanelConfig {
  title: string;
  visible: boolean;
  color?: string;
}

interface Props {
  initialColumns: PanelConfig[];
  onApply: (updated: PanelConfig[]) => void;
  onReset: () => PanelConfig[];
  onCancel: () => void;
}

const COLOR_PRESETS = [
  '#e74c3c', '#e67e22', '#f39c12', '#00a378', 
  '#3498db', '#699', '#9b59b6', '#1abc9c', '#2ecc71'
];

const PanelSettingsModal: React.FC<Props> = ({ 
  initialColumns, 
  onApply, 
  onReset,
  onCancel 
}) => {
  const [columns, setColumns] = useState<PanelConfig[]>([...initialColumns]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);
  const [colorPickerForIndex, setColorPickerForIndex] = useState<number | null>(null);
  const [customColor, setCustomColor] = useState<string>('#3498db');
  const listRef = useRef<HTMLUListElement>(null);
  const colorPickerRef = useRef<HTMLDivElement>(null);
  const scrollInterval = useRef<number | null>(null);

  const move = (from: number, to: number) => {
    if (from === to) return;
    
    const newColumns = [...columns];
    const [moved] = newColumns.splice(from, 1);
    newColumns.splice(to, 0, moved);
    setColumns(newColumns);
  };

  const toggleVisibility = (index: number) => {
    const newColumns = [...columns];
    newColumns[index].visible = !newColumns[index].visible;
    setColumns(newColumns);
  };

  const handleReset = () => {
    const resetCols = onReset().map(col => ({ ...col }));
    setColumns(resetCols);
    setColorPickerForIndex(null);
  };

  const handleColorSelect = (index: number, color: string) => {
    const newColumns = [...columns];
    newColumns[index].color = color;
    setColumns(newColumns);
    setColorPickerForIndex(null);
  };

  const handleColorRemove = (index: number) => {
    const newColumns = [...columns];
    delete newColumns[index].color;
    setColumns(newColumns);
  };

  const toggleColorPicker = (index: number) => {
    setColorPickerForIndex(colorPickerForIndex === index ? null : index);
  };

  // Закрываем color picker при клике вне его области
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
        setColorPickerForIndex(null);
      }
    };

    if (colorPickerForIndex !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [colorPickerForIndex]);

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
    setColorPickerForIndex(null);
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

  // Обработчик клавиш
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onApply(columns);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (colorPickerForIndex !== null) {
          setColorPickerForIndex(null);
        } else {
          onCancel();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      stopScroll();
    };
  }, [onApply, onCancel, columns, colorPickerForIndex]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onCancel();
    }
  };

  return ReactDOM.createPortal(
    <dialog 
      className={styles.modalBackdrop} 
      onMouseDown={handleMouseDown}
      data-testid="modal-backdrop"
    >
      <article className={styles.modalPanelSettings}>
        <h2 className={styles.modalTitle}>Настройка панелей</h2>

        <div className={styles.listContainer}>
          <ul 
            className={styles.columnList} 
            ref={listRef}
          >
            {columns.map((col, idx) => (
              <li 
                key={col.title} 
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
                  className={styles.checkbox}
                />
                <span className={styles.columnTitle}>{col.title}</span>
                
                {/* Кнопка выбора цвета */}
                <div className={styles.colorSection}>
                  <button
                    className={styles.colorButton}
                    style={{ backgroundColor: col.color || '#3498db' }}
                    onClick={() => toggleColorPicker(idx)}
                    title="Выбрать цвет"
                  />
                </div>

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

          {/* Color Picker - рендерится отдельно, вне списка */}
          {colorPickerForIndex !== null && (
            <div 
              ref={colorPickerRef}
              className={styles.colorPickerOverlay}
            >
              <div className={styles.colorPicker}>
                <h3 className={styles.colorPickerTitle}>
                  Выберите цвет для "{columns[colorPickerForIndex]?.title}"
                </h3>
                
                <div className={styles.colorGrid}>
                  {COLOR_PRESETS.map(color => (
                    <button
                      key={color}
                      className={styles.colorOption}
                      style={{ backgroundColor: color }}
                      onClick={() => handleColorSelect(colorPickerForIndex, color)}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className={styles.modalActions}>
          <FilledColorButton 
            width='94px'
            onClick={() => onApply(columns)}
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

export default PanelSettingsModal;