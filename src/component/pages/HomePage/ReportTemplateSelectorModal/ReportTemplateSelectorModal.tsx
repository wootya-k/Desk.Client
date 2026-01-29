// @modals/ReportTemplateSelectorModal.tsx
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import styles from './ReportTemplateSelectorModal.module.css';
import { buildUrl } from 'config';

interface ReportTemplateInfo {
  title: string;
  metaTitle: string;
  target: string;
  metaTarget: string;
}

interface ReportTemplateSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (metaTitle: string) => void;
}

const ReportTemplateSelectorModal: React.FC<ReportTemplateSelectorModalProps> = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [templates, setTemplates] = useState<ReportTemplateInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const dragStartPos = useRef<{ x: number; y: number } | null>(null);
  const draggedIndex = useRef<number | null>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Закрытие по Esc
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
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

  useEffect(() => {
    if (!isOpen) return;

    const fetchTemplates = async () => {
      try {
        const url = await buildUrl(`/api/Reports`);
        const response = await fetch(url);
        if (!response.ok) throw new Error('Не удалось загрузить список шаблонов');
        const data: ReportTemplateInfo[] = await response.json();
        setTemplates(data);
      } catch (err) {
        console.error(err);
        setError('Ошибка при загрузке шаблонов');
      } finally {
        setLoading(false);
      }
    };

    fetchTemplates();
  }, [isOpen]);

  const handleMouseDown = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    dragStartPos.current = { x: e.clientX, y: e.clientY };
    draggedIndex.current = index;
  };

  const handleMouseUp = (index: number, e: React.MouseEvent<HTMLButtonElement>) => {
    if (draggedIndex.current !== index) return;

    const start = dragStartPos.current;
    if (!start) return;

    const dx = Math.abs(e.clientX - start.x);
    const dy = Math.abs(e.clientY - start.y);

    if (dx < 30 && dy < 30) {
      onSelect(templates[index].metaTitle);
    }

    dragStartPos.current = null;
    draggedIndex.current = null;
  };

  const handleDragStart = (index: number, e: React.DragEvent<HTMLButtonElement>) => {
    e.dataTransfer.setData('text/plain', index.toString());
    (e.target as HTMLElement).classList.add(styles.dragging);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (toIndex: number, e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const fromIndexStr = e.dataTransfer.getData('text/plain');
    const fromIndex = parseInt(fromIndexStr, 10);
    if (isNaN(fromIndex) || fromIndex === toIndex) return;

    const newTemplates = [...templates];
    const [moved] = newTemplates.splice(fromIndex, 1);
    newTemplates.splice(toIndex, 0, moved);
    setTemplates(newTemplates);
  };

  const handleDragEnd = (e: React.DragEvent<HTMLButtonElement>) => {
    (e.target as HTMLElement).classList.remove(styles.dragging);
  };

  const handleCreateNew = () => {
    onSelect('new');
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    // Закрываем ТОЛЬКО если кликнули прямо на фон (не на modalPanel)
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className={styles.modalBackdrop} onClick={handleBackdropClick} ref={modalRef}>
      <div
        className={styles.modalPanel}
        onDragOver={handleDragOver}
      >
        <h2 className={styles.modalTitle}>Выберите шаблон печати</h2>

        {loading ? (
          <div className={styles.loading}>
            <div className={styles.spinner}></div>
            <p>Загрузка...</p>
          </div>
        ) : error ? (
          <div className={styles.error}>
            <p>{error}</p>
            <FilledColorButton onClick={() => window.location.reload()}>
              Повторить
            </FilledColorButton>
          </div>
        ) : (
          <>
            <div className={styles.listContainer}>
              {templates.map((tpl, idx) => (
                <button
                  key={tpl.metaTitle}
                  className={styles.templateItem}
                  draggable
                  onMouseDown={(e) => handleMouseDown(idx, e)}
                  onMouseUp={(e) => handleMouseUp(idx, e)}
                  onDragStart={(e) => handleDragStart(idx, e)}
                  onDragEnd={handleDragEnd}
                  onDrop={(e) => handleDrop(idx, e as unknown as React.DragEvent<HTMLDivElement>)}
                >
                  <div className={styles.templateTitle}>{tpl.title}</div>
                  <div className={styles.templateTarget}>{tpl.target}</div>
                </button>
              ))}
              {templates.length === 0 && (
                <p className={styles.emptyMessage}>Нет доступных шаблонов</p>
              )}
            </div>

            <div className={styles.modalActions}>
              <FilledColorButton width="120px" onClick={handleCreateNew}>
                Создать
              </FilledColorButton>
              <FilledColorButton
                width="120px"
                mainColor="#FFFFFF"
                additionalColor="#e74c3c"
                onClick={onClose}
              >
                Отмена
              </FilledColorButton>
            </div>
          </>
        )}
      </div>
    </div>,
    document.getElementById('modal-root')!
  );
};

export default ReportTemplateSelectorModal;