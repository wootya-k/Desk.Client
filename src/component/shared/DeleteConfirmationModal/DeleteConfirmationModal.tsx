import React, { useEffect } from 'react';
import styles from './DeleteConfirmationModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface DeleteConfirmationModalProps {
  preview: string;
  onConfirm: () => void;
  onCancel: () => void;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
  preview,
  onConfirm,
  onCancel
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        onConfirm();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onCancel();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onConfirm, onCancel]);

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
        <h2 className={styles.modalTitle}>Подтверждение удаления</h2>
        <p className={styles.modalMessage}>{preview}</p>
        
        <div className={styles.modalActions}>
          <FilledColorButton 
            onClick={onCancel}
          >
            Отмена
          </FilledColorButton>
          <FilledColorButton 
            mainColor="#FFFFFF"
            additionalColor="#e74c3c"
            onClick={onConfirm}
          >
            Удалить
          </FilledColorButton>
        </div>
      </article>
    </div>
  );
};

export default DeleteConfirmationModal;