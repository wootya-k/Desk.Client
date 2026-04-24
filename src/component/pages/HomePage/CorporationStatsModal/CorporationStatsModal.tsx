// src/components/modals/CorporationStatsModal/CorporationStatsModal.tsx
import React, { useEffect, useCallback } from 'react';
import { getStatsForType, StatsMatrix } from '@services/CorporationStatsService';
import styles from './CorporationStatsModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface CorporationStatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: string;
}

const CorporationStatsModal: React.FC<CorporationStatsModalProps> = ({ 
  isOpen, 
  onClose, 
  type 
}) => {
  const [stats, setStats] = React.useState<StatsMatrix | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
useEffect(() => {
  if (!isOpen) return;
  
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();      // 🔹 Предотвращаем дефолтное поведение
      e.stopPropagation();     // 🔹 Останавливаем всплытие
      onClose();
    }
  };
  
  document.addEventListener('keydown', handleEscape, { capture: true }); // 🔹 Перехват на этапе capture
  document.body.style.overflow = 'hidden';
  
  // 🔹 Фокусируем модалку для надёжного перехвата клавиш
  const modalContent = document.querySelector(`.${styles.modalContent}`);
  if (modalContent instanceof HTMLElement) {
    modalContent.tabIndex = -1;
    modalContent.focus();
  }
  
  return () => {
    document.removeEventListener('keydown', handleEscape, { capture: true });
    document.body.style.overflow = '';
  };
}, [isOpen, onClose]);
  // Закрытие по ESC
  useEffect(() => {
    if (!isOpen) return;
    
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    document.addEventListener('keydown', handleEscape);
    // Блокируем скролл страницы
    document.body.style.overflow = 'hidden';
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // Загрузка данных
  useEffect(() => {
    if (!isOpen || !type) return;
    
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const matrix = await getStatsForType(type);
        setStats(matrix);
      } catch (err) {
        console.error('Ошибка загрузки статистики:', err);
        setError('Не удалось загрузить данные');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [isOpen, type]);

  // Закрытие по клику на фон
  const handleBackdropClick = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }, [onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className={styles.modalBackdrop}
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
    >
        <div className={styles.modalBody}>
          {error && (
            <div className={styles.error}>
              <span className={styles.errorIcon}>⚠️</span>
              {error}
            </div>
          )}
          
          {isLoading && !stats ? (
            <div className={styles.loading}>
              <div className={styles.spinner} />
              Загрузка данных...
            </div>
          ) : stats ? (
            <div className={styles.tableContainer}>
              <table className={styles.statsTable}>
                <colgroup>
                  <col className={styles.colLabel} />
                  {stats.cols.map((_, idx) => (
                    <col key={idx} className={styles.colData} />
                  ))}
                  <col className={styles.colTotal} />
                </colgroup>
                <thead>
                  <tr>
                    <th className={`${styles.headerCell} ${styles.firstColumn}`}>
                      <div className={styles.headerContent}>КАТЕГОРИЯ</div>
                    </th>
                    {stats.cols.map(col => (
                      <th key={col} className={`${styles.headerCell} ${styles.lastColumn}`}>
                        <div className={styles.headerContent}>{col}</div>
                      </th>
                    ))}
                    <th className={`${styles.headerCell} ${styles.totalHeader}`}>
                      <div className={styles.headerContent}>Всего</div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {stats.rows.map(row => (
                    <tr key={row} className={styles.row}>
                      <td className={`${styles.cell} ${styles.rowLabel}`}>
                        <div className={styles.cellContent}>{row}</div>
                      </td>
                      {stats.cols.map(col => (
                        <td key={`${row}-${col}`} className={`${styles.cell} ${styles.dataCell}`}>
                          <div className={styles.cellContent}>
                            {stats.data[row][col]}
                          </div>
                        </td>
                      ))}
                      <td className={`${styles.cell} ${styles.totalCell}`}>
                        <div className={styles.cellContent}>
                          <strong>{stats.rowTotals[row]}</strong>
                        </div>
                      </td>
                    </tr>
                  ))}
                  <tr className={`${styles.row}`}>
                    <td className={`${styles.cell} ${styles.rowLabel} ${styles.totalLabel}`}>
                      <div className={styles.cellContent}><strong>Всего</strong></div>
                    </td>
                    {stats.cols.map(col => (
                      <td key={`total-${col}`} className={`${styles.cell} ${styles.totalCell}`}>
                        <div className={styles.cellContent}>
                          <strong>{stats.colTotals[col]}</strong>
                        </div>
                      </td>
                    ))}
                    <td className={`${styles.cell} ${styles.totalCell} ${styles.grandTotal}`}>
                      <div className={styles.cellContent}>
                        <strong>{stats.total}</strong>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          ) : null}
        </div>

    </div>
  );
};

export default CorporationStatsModal;