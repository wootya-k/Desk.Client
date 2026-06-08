import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import FavoriteQueryItem, { FavoriteQuery } from './FavoriteQueryItem/FavoriteQueryItem';
import DeleteConfirmationModal from '@shared/DeleteConfirmationModal/DeleteConfirmationModal';
import { updateFavoriteQuery } from '@services/QueryService';
import { setExpiringItem, getExpiringItem } from 'utils/LocalStorageUtils';
import styles from './FavoritesModal.module.css';

interface FavoritesModalProps {
  isOpen: boolean;
  onClose: () => void;
  favorites: FavoriteQuery[];
  title?: string;
  type?: string;
  onSelect: (query: string) => void;
  onDelete: (id: number) => Promise<void>;
  onUpdate?: (id: number, name: string, body: string) => void;
  // ✅ НОВОЕ: текущий запрос из поисковой строки
  currentQuery?: string;
  // ✅ НОВОЕ: функция сохранения нового запроса
  onSaveNewQuery?: (name: string, body: string) => Promise<void>;
}

const ORDER_STORAGE_KEY = 'favorites_order';

const FavoritesModal: React.FC<FavoritesModalProps> = ({
  isOpen,
  onClose,
  favorites,
  title,
  type,
  onSelect,
  onDelete,
  onUpdate,
  currentQuery = '',
  onSaveNewQuery,
}) => {
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirmationId, setDeleteConfirmationId] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mousedownTarget, setMousedownTarget] = useState<'backdrop' | 'content' | null>(null);
  
  // ✅ НОВОЕ: состояние для имени нового запроса
  const [newQueryName, setNewQueryName] = useState('');

  // Загрузка порядка из localStorage
  useEffect(() => {
    if (isOpen && type) {
      const saved = getExpiringItem(`${ORDER_STORAGE_KEY}_${type}`);
      if (saved) {
        // Можно добавить логику применения порядка, если нужно
      }
    }
  }, [isOpen, type]);

  useEffect(() => {
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
  }, [onClose]);

  // Сохранение порядка
  const saveOrder = (updatedFavorites: FavoriteQuery[]) => {
    if (!type) return;
    const order = updatedFavorites.map(f => f.id);
    setExpiringItem(`${ORDER_STORAGE_KEY}_${type}`, JSON.stringify(order), 365);
  };

  const handleEdit = (id: number) => setEditingId(id);
  const handleCancelEdit = () => setEditingId(null);

  const handleSave = async (id: number, name: string, body: string) => {
    if (!type) {
      console.error('Type не передан в модальное окно');
      return;
    }

    setIsLoading(true);
    try {
      await updateFavoriteQuery(id, name, body, type);
      
      if (onUpdate) {
        onUpdate(id, name, body);
      }
      
      setEditingId(null);
    } catch (error) {
      console.error('Ошибка сохранения:', error);
      alert('Не удалось сохранить изменения');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // ✅ НОВОЕ: сохранение нового запроса
  const handleSaveNewQuery = async () => {
    if (!newQueryName.trim() || !currentQuery.trim() || !onSaveNewQuery) return;

    setIsLoading(true);
    try {
      await onSaveNewQuery(newQueryName.trim(), currentQuery.trim());
      setNewQueryName(''); // Очищаем поле после сохранения
    } catch (error) {
      console.error('Ошибка сохранения нового запроса:', error);
      alert('Не удалось сохранить запрос');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (id: number) => setDeleteConfirmationId(id);

  const handleConfirmDelete = async () => {
    if (deleteConfirmationId !== null) {
      setIsLoading(true);
      try {
        await onDelete(deleteConfirmationId);
      } catch (error) {
        console.error('Ошибка удаления:', error);
        alert('Не удалось удалить запрос');
      } finally {
        setIsLoading(false);
        setDeleteConfirmationId(null);
      }
    }
  };

  const handleCancelDelete = () => setDeleteConfirmationId(null);

  const handleMove = async (fromIndex: number, toIndex: number) => {
    if (!type) return;
    const newFavorites = [...favorites];
    const [moved] = newFavorites.splice(fromIndex, 1);
    newFavorites.splice(toIndex, 0, moved);

    setIsLoading(true);
    try {
      saveOrder(newFavorites);
      if (onUpdate) {
        // Можно отправить обновлённый список, если бэк поддерживает
      }
    } catch (error) {
      console.error('Ошибка перемещения:', error);
      alert('Не удалось переместить запрос');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveUp = (index: number) => {
    if (index === 0) return;
    handleMove(index, index - 1);
  };

  const handleMoveDown = (index: number) => {
    if (index === favorites.length - 1) return;
    handleMove(index, index + 1);
  };

  // === ФИКС ЗАКРЫТИЯ МОДАЛКИ ===
  const handleBackdropMouseDown = () => {
    setMousedownTarget('backdrop');
  };

  const handleBackdropMouseUp = () => {
    if (mousedownTarget === 'backdrop') {
      onClose();
    }
    setMousedownTarget(null);
  };

  const handleContentMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMousedownTarget('content');
  };

  const handleContentMouseUp = (e: React.MouseEvent) => {
    e.stopPropagation();
    setMousedownTarget(null);
  };

  if (!isOpen) return null;

  // ✅ Проверяем, есть ли текущий запрос для отображения блока сохранения
  const hasCurrentQuery = currentQuery.trim().length > 0;

  return ReactDOM.createPortal(
    <>
      <div
        className={styles.modalBackdrop}
        onMouseDown={handleBackdropMouseDown}
        onMouseUp={handleBackdropMouseUp}
      >
        <div
          className={styles.modalContent}
          onMouseDown={handleContentMouseDown}
          onMouseUp={handleContentMouseUp}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className={styles.resetButton}
            onClick={onClose}
            disabled={isLoading}
            title="Закрыть"
            type="button"
            aria-label="Закрыть"
          >
            <span className={styles.closeIcon}>✕</span>
          </button>

          <h2 className={styles.modalTitle}>
            {`Избранное${title ? `: ${title}` : ''}`}
          </h2>

          {/* ✅ НОВОЕ: Блок сохранения текущего запроса */}
          {hasCurrentQuery && onSaveNewQuery && (
            <div className={styles.saveNewQuerySection}>
              <h3 className={styles.saveNewQueryTitle}>Сохранить текущий запрос</h3>
              <div className={styles.saveNewQueryPreview}>
                <span className={styles.previewLabel}>Запрос:</span>
                <span className={styles.previewText}>«{currentQuery}»</span>
              </div>
              <div className={styles.saveNewQueryForm}>
                <input
                  type="text"
                  value={newQueryName}
                  onChange={(e) => setNewQueryName(e.target.value)}
                  placeholder="Введите название..."
                  className={styles.saveNewQueryInput}
                  maxLength={100}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handleSaveNewQuery}
                  disabled={!newQueryName.trim() || isLoading}
                  className={styles.saveNewQueryButton}
                >
                  {isLoading ? 'Сохранение...' : 'Сохранить'}
                </button>
              </div>
            </div>
          )}

          <div className={styles.favoritesList}>
            {favorites.length === 0 ? (
              <div className={styles.noFavorites}>Нет сохранённых запросов</div>
            ) : (
              favorites.map((item, index) => (
                <FavoriteQueryItem
                  key={item.id}
                  query={item}
                  index={index}
                  totalItems={favorites.length}
                  isEditing={editingId === item.id}
                  onEdit={() => handleEdit(item.id)}
                  onSave={(name, body) => handleSave(item.id, name, body)}
                  onCancel={handleCancelEdit}
                  onDelete={() => handleDeleteClick(item.id)}
                  onMoveUp={() => handleMoveUp(index)}
                  onMoveDown={() => handleMoveDown(index)}
                  onSelect={() => onSelect(item.body)}
                />
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