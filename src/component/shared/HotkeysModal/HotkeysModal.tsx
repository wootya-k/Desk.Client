// src/component/shared/HotkeysModal/HotkeysModal.tsx
import React, { useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './HotkeysModal.module.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const HotkeysModal: React.FC<Props> = ({ isOpen, onClose }) => {
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className={styles.backdrop} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button className={styles.closeButton} onClick={onClose} aria-label="Закрыть">
          ×
        </button>
        <h2 className={styles.title}>Горячие клавиши</h2>
        <ul className={styles.list}>
          <li><kbd>Ctrl</kbd> + <kbd>/</kbd> — открыть/закрыть это окно</li>
          <li><kbd>Esc</kbd> — закрыть модальное окно или вернуться назад</li>
          <li><kbd>Enter</kbd> — применить настройки (в модальных окнах)</li>
          <li><kbd>Shift</kbd> + <kbd>ЛКМ</kbd> — удалить без подтверждения</li>
        </ul>
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default HotkeysModal;