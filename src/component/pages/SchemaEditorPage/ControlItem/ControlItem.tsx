import React from 'react';
import styles from './ControlItem.module.css';

interface Dictionary {
  id: string;
  name: string;
}

interface ControlConfig {
  id: string;
  label: string;
  type: 'string' | 'number' | 'boolean' | 'object';
  dictionaryId?: string;
  required: boolean;
  metadata: boolean;
  key: string;
}

interface ControlItemProps {
  control: ControlConfig;
  index: number;
  dictionaries: Dictionary[];
  isDictionariesLoading: boolean;
  dragIndex: number | null;
  overIndex: number | null;
  controlsCount: number;
  onControlChange: (index: number, field: keyof ControlConfig, value: string | boolean) => void;
  onRemoveControl: (index: number) => void;
  onMoveControl: (fromIndex: number, toIndex: number) => void;
  onDragStart: (index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragLeave: () => void;
  onDrop: () => void;
  onDragEnd: () => void;
}

// 🔍 Хелпер: проверяет, был ли клик по интерактивному элементу
const isInteractiveElement = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement;
  if (!element) return false;
  
  // Проверяем сам элемент и его родителей
  return (
    element.tagName === 'INPUT' ||
    element.tagName === 'SELECT' ||
    element.tagName === 'TEXTAREA' ||
    element.tagName === 'BUTTON' ||
    element.closest('input, select, textarea, button, a, [contenteditable]') !== null
  );
};

// ControlItem.tsx

// ... интерфейсы без изменений ...

const ControlItem: React.FC<ControlItemProps> = ({
  control,
  index,
  dictionaries,
  isDictionariesLoading,
  dragIndex,
  overIndex,
  controlsCount,
  onControlChange,
  onRemoveControl,
  onMoveControl,
  onDragStart,
  onDragOver,
  onDragLeave,
  onDrop,
  onDragEnd
}) => {
  return (
    <li 
      className={`${styles.controlItem} ${dragIndex === index ? styles.dragging : ''} ${overIndex === index ? styles.dragOver : ''}`}
      
      // ✅ li теперь drop-зона: разрешаем дроп и передаём индекс
      onDragOver={(e) => {
        e.preventDefault(); // ← КРИТИЧНО: без этого onDrop не сработает!
        e.stopPropagation();
        onDragOver(e, index);
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onDrop();
      }}
      onDragLeave={(e) => {
        e.stopPropagation();
        onDragLeave();
      }}
    >
      <div className={styles.controlHeader}>
        <div className={styles.controlActions}>
          {/* ✅ Хендл — только источник драга */}
          <div 
            className={styles.dragHandle} 
            title="Перетащите для изменения порядка"
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              
              // 🔥 КРИТИЧНО: передаём индекс через dataTransfer
              e.dataTransfer.effectAllowed = 'move';
              e.dataTransfer.setData('text/plain', index.toString());
              
              onDragStart(index);
            }}
            onDragEnd={(e) => {
              e.stopPropagation();
              onDragEnd();
            }}
          >
            ⋮⋮
          </div>
          
          {/* ... кнопки и чекбоксы без изменений ... */}
          <div className={styles.moveButtons}>
            <button
              className={styles.moveButton}
              disabled={index === 0}
              onClick={() => onMoveControl(index, index - 1)}
              title="Переместить вверх"
            >
              ↑
            </button>
            <button
              className={styles.moveButton}
              disabled={index === controlsCount - 1}
              onClick={() => onMoveControl(index, index + 1)}
              title="Переместить вниз"
            >
              ↓
            </button>
          </div>
          <button 
            onClick={() => onRemoveControl(index)}
            className={styles.removeButton}
            disabled={controlsCount <= 1}
            title="Удалить поле"
          >
            ×
          </button>
        </div>
        
        <div className={styles.controlCheckboxes}>
          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={control.required}
              onChange={e => onControlChange(index, 'required', e.currentTarget.checked)}
              className={styles.customCheckbox}
            />
            <span className={styles.checkboxLabel}>Обязательное</span>
          </label>
          
          <label className={styles.checkboxContainer}>
            <input
              type="checkbox"
              checked={control.metadata}
              onChange={e => onControlChange(index, 'metadata', e.currentTarget.checked)}
              className={styles.customCheckbox}
            />
            <span className={styles.checkboxLabel}>Представление</span>
          </label>
        </div>
      </div>
      
      {/* ... поля ввода без изменений ... */}
      <div className={styles.controlFields}>
        <div className={styles.fieldGroup}>
          <label className={styles.fieldWithLabel}>
            <span className={styles.fieldLabel}>Идентификатор</span>
            <input
              type="text"
              value={control.id}
              onChange={e => {
                    const value = e.currentTarget.value.replace(/[^a-zA-Z0-9\-_.]/g, '');
                    onControlChange(index, 'id', value);
                }}
              placeholder="field-id"
              className={styles.compactInput}
            />
          </label>
          
          <label className={styles.fieldWithLabel}>
            <span className={styles.fieldLabel}>Название</span>
            <input
              type="text"
              value={control.label}
              onChange={e => onControlChange(index, 'label', e.currentTarget.value)}
              placeholder="Название поля"
              className={styles.compactInput}
            />
          </label>
        </div>
        
        <div className={styles.fieldGroup}>
          <label className={styles.fieldWithLabel}>
            <span className={styles.fieldLabel}>Тип данных</span>
            <select
              value={control.type}
              onChange={e => onControlChange(index, 'type', e.currentTarget.value as any)}
              disabled={isDictionariesLoading}
              className={styles.compactSelect}
            >
              <option value="string">Строка</option>
              <option value="number">Число</option>
              <option value="boolean">Логический</option>
              <option value="object">Справочник</option>
            </select>
          </label>
          
          <label className={styles.fieldWithLabel}>
            <span className={styles.fieldLabel}>Справочник</span>
            <select
              value={control.dictionaryId || ''}
              onChange={e => onControlChange(index, 'dictionaryId', e.currentTarget.value)}
              className={`${styles.compactSelect} ${control.type !== 'object' ? styles.disabledSelect : ''}`}
              disabled={control.type !== 'object'}
            >
              <option value="">Выберите справочник</option>
              {dictionaries.map(dict => (
                <option key={dict.id} value={dict.id}>
                  {dict.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>
    </li>
  );
};

export default ControlItem;