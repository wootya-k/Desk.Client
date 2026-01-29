// src/component/pages/HomePage/CategoryModal/CategoryModal.tsx
import React, { useState, useEffect } from 'react';
import styles from './CategoryModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const CategoryModal: React.FC<CategoryModalProps> = ({ isOpen, onClose, onCreate }) => {
  const [inputValue, setInputValue] = useState('');
  const [isMouseDown, setIsMouseDown] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onCreate(inputValue.trim());
      setInputValue('');
      onClose();
    }
  };

  const handleCreateClick = () => {
    if (inputValue.trim()) {
      onCreate(inputValue.trim());
      setInputValue('');
      onClose();
    }
  };

  // Обработчик клавиши Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsMouseDown(true);
    }
  };

  const handleMouseUp = (e: React.MouseEvent) => {
    if (isMouseDown && e.target === e.currentTarget) {
      onClose();
    }
    setIsMouseDown(false);
  };

  if (!isOpen) return null;

  return (
    <div 
      className={styles.overlay} 
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      data-testid="modal-backdrop"
    >
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <h3>Создать новую категорию</h3>
        <form onSubmit={handleSubmit}>
          <input
            type="text"
            value={inputValue}
            onChange={handleChange}
            placeholder="Название категории"
            autoFocus
            className={styles.input}
          />
        </form>
      </div>
    </div>
  );
};

export default CategoryModal;