import React, { useState, MouseEvent } from 'react';
import ReactDOM from 'react-dom';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import DeleteButton from '@commons/DeleteButton/DeleteButton';
import DeleteConfirmationModal from '@shared/DeleteConfirmationModal/DeleteConfirmationModal';
import styles from './FavoritesModal.module.css';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: { id: number; body: string }[];
  onSelect: (query: string) => void;
  onDelete: (id: number) => void;
  title?: string;
}

const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  onSelect,
  onDelete,
  title = 'Избранное',
}) => {
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<number | null>(null);

  const handleDeleteClick = (id: number) => {
    setDeleteConfirmationId(id);
  };

  const handleConfirmDelete = () => {
    if (deleteConfirmationId !== null) {
      onDelete(deleteConfirmationId);
      setDeleteConfirmationId(null);
    }
  };

  const handleCancelDelete = () => {
    setDeleteConfirmationId(null);
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <>
      <div className={styles.modalBackdrop} onClick={onClose}>
        <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <h2 className={styles.modalTitle}>{title}</h2>

          <div className={styles.favoritesList}>
            {favorites.length === 0 ? (
              <div className={styles.noFavorites}>Нет сохранённых запросов</div>
            ) : (
              favorites.map((item) => (
                <div key={item.id} className={styles.favoriteItemContainer}>
                  <div
                    className={styles.favoriteItemText}
                    onClick={() => onSelect(item.body)}
                  >
                    {item.body}
                  </div>
                  <div className={styles.deleteButtonWrapper}>
                    <DeleteButton
                      size={20}
                      height="32px"
                      width="32px"
                      onClick={() => handleDeleteClick(item.id)} // ← без e, как ожидает DeleteButton
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {deleteConfirmationId !== null &&
        ReactDOM.createPortal(
          <DeleteConfirmationModal
            preview="Вы уверены, что хотите удалить этот сохранённый запрос?"
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />,
          document.getElementById('modal-root')!
        )}
    </>,
    document.getElementById('modal-root')!
  );
};

export default FavoritesModal;