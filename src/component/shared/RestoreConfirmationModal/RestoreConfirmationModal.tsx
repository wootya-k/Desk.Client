// @shared/RestoreConfirmationModal/RestoreConfirmationModal.tsx
import React from 'react';
import styles from './RestoreConfirmationModal.module.css'; // опционально

interface RestoreConfirmationModalProps {
  objectName?: string; // например: "Сотрудник Иванов"
  onConfirm: () => void;
  onCancel: () => void;
}

const RestoreConfirmationModal: React.FC<RestoreConfirmationModalProps> = ({
  objectName,
  onConfirm,
  onCancel
}) => {
  return (
    <div className={styles.modalOverlay} onClick={onCancel}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <h3 className={styles.title}>Восстановить объект?</h3>
        
        <p className={styles.preview}>
          {objectName 
            ? `Вы уверены, что хотите восстановить "${objectName}"?`
            : 'Вы уверены, что хотите восстановить этот объект?'
          }
        </p>
        
        <p className={styles.hint}>
          Объект вернётся в активный список с сохранением всех данных.
        </p>

        <div className={styles.actions}>
          <button 
            className={styles.cancelButton}
            onClick={onCancel}
            type="button"
          >
            Отмена
          </button>
          <button 
            className={styles.confirmButton}
            onClick={onConfirm}
            type="button"
            autoFocus
          >
            Восстановить
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestoreConfirmationModal;