import React, { useState, useEffect } from 'react';
import styles from './FavoriteQueryItem.module.css';

export interface FavoriteQuery {
  id: number;
  name: string;
  body: string;
}

interface FavoriteQueryItemProps {
  query: FavoriteQuery;
  index: number;
  totalItems: number;
  isEditing: boolean;
  onEdit?: () => void;
  onSave: (name: string, body: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSelect?: () => void;
}

const FavoriteQueryItem: React.FC<FavoriteQueryItemProps> = ({
  query,
  index,
  totalItems,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onMoveUp,
  onMoveDown,
  onSelect,
}) => {
  const [localName, setLocalName] = useState(query.name);
  const [localBody, setLocalBody] = useState(query.body);

  useEffect(() => {
    if (!isEditing) {
      setLocalName(query.name);
      setLocalBody(query.body);
    }
  }, [isEditing, query.name, query.body]);

  const handleSave = () => {
    if (localName.trim() && localBody.trim()) {
      onSave(localName.trim(), localBody.trim());
    }
  };

  const handleCancel = () => {
    setLocalName(query.name);
    setLocalBody(query.body);
    onCancel();
  };

  if (isEditing) {
    return (
      <div className={`${styles.queryItem} ${styles.editing}`}>
        <div className={styles.editForm}>
          <div className={styles.formRow}>
            <div className={styles.formField}>
              <label className={styles.fieldLabel}>Название</label>
              <input
                type="text"
                value={localName}
                onChange={(e) => setLocalName(e.target.value)}
                className={styles.input}
                placeholder="Введите название"
                autoFocus
              />
            </div>
            <div className={styles.editActions}>
              <button onClick={handleSave} className={styles.saveButton} disabled={!localName.trim() || !localBody.trim()}>✓</button>
              <button onClick={handleCancel} className={`${styles.actionButton} ${styles.deleteButton}`}>✕</button>
            </div>
          </div>
          <div className={styles.formField}>
            <label className={styles.fieldLabel}>Запрос</label>
            <textarea
              value={localBody}
              onChange={(e) => setLocalBody(e.target.value)}
              className={styles.textarea}
              placeholder="Введите запрос"
              rows={3}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.queryItem}>
      <div className={styles.queryContent} onClick={onSelect}>
        <div className={styles.queryHeader}>
          <input
            type="text"
            value={localName}
            onChange={(e) => setLocalName(e.target.value)}
            className={styles.nameInput}
            disabled={!isEditing}
            placeholder="Без названия"
            onClick={(e) => e.stopPropagation()}
          />
          <div className={styles.actions}>
            {onMoveUp && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveUp(); }}
                disabled={index === 0}
                className={styles.actionButton}
                title="Вверх"
                type="button"
              >
                ↑
              </button>
            )}
            {onMoveDown && (
              <button
                onClick={(e) => { e.stopPropagation(); onMoveDown(); }}
                disabled={index === totalItems - 1}
                className={styles.actionButton}
                title="Вниз"
                type="button"
              >
                ↓
              </button>
            )}
            {onEdit && (
              <button
                onClick={(e) => { e.stopPropagation(); onEdit(); }}
                className={`${styles.actionButton} ${styles.editButton}`}
                title="Редактировать"
                type="button"
              >
                ✎
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className={`${styles.actionButton} ${styles.deleteButton}`}
              title="Удалить"
              type="button"
            >
              ✕
            </button>
          </div>
        </div>
        <div className={styles.queryBody}>{localBody}</div>
      </div>
    </div>
  );
};

export default FavoriteQueryItem;