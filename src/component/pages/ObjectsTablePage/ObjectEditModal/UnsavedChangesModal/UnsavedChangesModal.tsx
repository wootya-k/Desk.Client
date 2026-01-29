// components/ObjectEditModal/UnsavedChangesModal/UnsavedChangesModal.tsx
import React, { useEffect } from 'react';
import styles from './UnsavedChangesModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface UnsavedChangesModalProps {
  onConfirm: () => void;
  onCancel: () => void;
  onReset: () => void;
  mode: 'create' | 'edit';
}

const UnsavedChangesModal: React.FC<UnsavedChangesModalProps> = ({
  onConfirm,
  onCancel,
  onReset,
  mode
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onCancel]);

  return (
    <div 
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onCancel();
        }
      }} 
      className={styles.modalBackdrop}
    >
      <article className={styles.modalContent}>
        <h2 className={styles.modalTitle}>Несохранённые изменения</h2>
        <p className={styles.modalMessage}>
          У вас есть несохранённые данные, при выходе они не пропадут и будут ожидать сброса или сохранения. 
        </p>
        <div className={styles.modalActions}>
          <FilledColorButton 
            onClick={onCancel}
            mainColor="#FFFFFF"
            additionalColor="#f39c12"
          >
            Остаться
          </FilledColorButton>
          
          <FilledColorButton 
            mainColor="#FFFFFF"
            additionalColor="#3498db"
            onClick={onReset}
          >
            Сбросить
          </FilledColorButton>
          
          <FilledColorButton 
            mainColor="#FFFFFF"
            additionalColor="#e74c3c"
            onClick={onConfirm}
          >
            {mode === 'create' ? 'Закрыть' : 'Выйти'}
          </FilledColorButton>
        </div>
      </article>
    </div>
  );
};

export default UnsavedChangesModal;