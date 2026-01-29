// @commons/ControlItem/ControlItem.tsx

import React from 'react';
import styles from './ControlItem.module.css';

export interface FieldOption {
  path: string;
  label: string;
  source: string;
}

export interface ControlItemProps {
  id: string;
  label: string;
  path: string;
  required: boolean;
  metadata: boolean;
  fieldOptions: FieldOption[];
  onChange: (updates: Partial<{ id: string; label: string; path: string; required: boolean; metadata: boolean }>) => void;
  onRemove: () => void;
  moveUp: () => void;
  moveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
}

const ControlItem: React.FC<ControlItemProps> = ({
  id,
  label,
  path,
  required,
  metadata,
  fieldOptions,
  onChange,
  onRemove,
  moveUp,
  moveDown,
  isFirst,
  isLast,
}) => {
  return (
    <div className={styles.item}>
      <div className={styles.header}>
        <div className={styles.actions}>
          <button
            className={styles.moveBtn}
            onClick={moveUp}
            disabled={isFirst}
            title="Вверх"
          >
            ↑
          </button>
          <button
            className={styles.moveBtn}
            onClick={moveDown}
            disabled={isLast}
            title="Вниз"
          >
            ↓
          </button>
          <button
            className={styles.removeBtn}
            onClick={onRemove}
            title="Удалить"
          >
            ×
          </button>
        </div>
        <div className={styles.checks}>
          <label>
            <input
              type="checkbox"
              checked={required}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ required: e.target.checked })
              }
            />
            <span>Обязательное</span>
          </label>
          <label>
            <input
              type="checkbox"
              checked={metadata}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                onChange({ metadata: e.target.checked })
              }
            />
            <span>Представление</span>
          </label>
        </div>
      </div>

      <div className={styles.fields}>
        <div className={styles.field}>
          <label>Идентификатор</label>
          <input
            type="text"
            value={id}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ id: e.target.value.replace(/[^a-zA-Z0-9_]/g, '') })
            }
            placeholder="field_id"
          />
        </div>
        <div className={styles.field}>
          <label>Название</label>
          <input
            type="text"
            value={label}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              onChange({ label: e.target.value })
            }
            placeholder="Фамилия"
          />
        </div>
        <div className={styles.field}>
          <label>Поле из данных</label>
          <select
            value={path}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              onChange({ path: e.target.value })
            }
          >
            {fieldOptions.map((opt) => (
              <option key={opt.path} value={opt.path}>
                {opt.label} ({opt.path})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default ControlItem;