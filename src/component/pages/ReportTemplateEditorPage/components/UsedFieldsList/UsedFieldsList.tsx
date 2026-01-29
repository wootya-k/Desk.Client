import React from 'react';
import { FieldOption } from '@services/ReportTemplateService';
import styles from './UsedFieldsList.module.css';

interface UsedFieldsListProps {
  usedFields: FieldOption[];
  requiredFields: Set<string>;
  onRemoveField: (path: string) => void;
  onToggleRequired: (path: string) => void;
}

const UsedFieldsList: React.FC<UsedFieldsListProps> = ({
  usedFields,
  requiredFields,
  onRemoveField,
  onToggleRequired
}) => {
  return (
    <div className={styles.list}>
      {usedFields.length > 0 ? (
        usedFields.map(field => (
          <div
            key={field.path}
            className={`${styles.fieldItem} ${
              requiredFields.has(field.path) ? styles.required : ''
            }`}
          >
            <div className={styles.fieldInfo}>
              <div className={styles.fieldLabel}>{field.label}</div>
              <div className={styles.fieldPath}>{field.path}</div>
            </div>
            <div className={styles.fieldActions}>
              <label className={styles.requiredToggle}>
                <input
                  type="checkbox"
                  checked={requiredFields.has(field.path)}
                  onChange={() => onToggleRequired(field.path)}
                />
                <span>Обязательное</span>
              </label>
              <button
                onClick={() => onRemoveField(field.path)}
                className={styles.removeButton}
                title="Удалить поле"
              >
                ×
              </button>
            </div>
          </div>
        ))
      ) : (
        <div className={styles.emptyState}>
          <p>Нет выбранных свойств</p>
          <small>Добавьте свойства из левой панели</small>
        </div>
      )}
    </div>
  );
};

export default UsedFieldsList;