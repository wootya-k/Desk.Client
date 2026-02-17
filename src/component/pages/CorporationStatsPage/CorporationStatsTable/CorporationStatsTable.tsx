import React from 'react';
import styles from './CorporationStatsTable.module.css';
import { StatsMatrix } from '@services/CorporationStatsService';

interface CorporationStatsTableProps {
  stats: StatsMatrix;
  isLoading?: boolean;
}

const CorporationStatsTable: React.FC<CorporationStatsTableProps> = ({ stats, isLoading }) => {
  if (isLoading) {
    return <div className={styles.loading}>Загрузка данных...</div>;
  }

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th className={`${styles.headerCell} ${styles.firstColumn}`}>
            <div className={styles.headerContent}>КАТЕГОРИЯ</div>
          </th>
          {stats.cols.map(col => (
            <th key={col} className={styles.headerCell}>
              <div className={styles.headerContent}>{col}</div>
            </th>
          ))}
          <th className={`${styles.headerCell} ${styles.totalHeader}`}>
            <div className={styles.headerContent}>ВСЕГО</div>
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
              <td key={`${row}-${col}`} className={styles.cell}>
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
        <tr className={`${styles.row} ${styles.totalRow}`}>
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
  );
};

export default CorporationStatsTable;