import React, { useState, FormEvent } from 'react';
import ReactDOM from 'react-dom';
import styles from './SaveQueryModal.module.css';

interface SaveQueryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (name: string) => void;
  preview: string;
}

const SaveQueryModal: React.FC<SaveQueryModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  preview 
}) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSave(name.trim());
      setName('');
    }
  };

  const handleBackdropClick = () => {
    onClose();
    setName('');
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div 
      className={styles.modalBackdrop} 
      onClick={handleBackdropClick}
    >
      <div 
        className={styles.modalContent} 
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className={styles.closeButton}
          onClick={handleBackdropClick}
          type="button"
          aria-label="Закрыть"
        >
          <span className={styles.closeIcon}>✕</span>
        </button>

        <h2 className={styles.modalTitle}>Сохранить запрос</h2>
        
        <p className={styles.preview}>«{preview}»</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Введите название..."
            autoFocus
            className={styles.input}
            maxLength={100}
          />
          <div className={styles.buttons}>
            <button 
              type="submit" 
              disabled={!name.trim()}
              className={styles.saveButton}
            >
              Сохранить
            </button>
            <button 
              type="button" 
              onClick={handleBackdropClick}
              className={styles.cancelButton}
            >
              Отмена
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default SaveQueryModal;