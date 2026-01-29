import React from 'react';
import { ObjectType } from '@models'; 
import { useNavigate } from 'react-router-dom';
import styles from './OptionsCard.module.css'; // Импортируем CSS-модуль

interface OptionsCardProps {
    objectTypes: ObjectType[];
    loading: boolean;
    error: string | null;
    handleMouseEnter: (event: React.MouseEvent<HTMLTableCellElement>, typeName: string) => void;
    handleMouseMove: (event: React.MouseEvent<HTMLTableCellElement>) => void;
    handleMouseLeave: () => void;
}

const OptionsCard: React.FC<OptionsCardProps> = ({ objectTypes, loading, error, handleMouseEnter, handleMouseMove, handleMouseLeave }) => {
    const navigate = useNavigate();

    if (loading) return <div>Загрузка...</div>;
    if (error) return <div>Ошибка: {error}</div>;

    return (
      <nav className={styles.optionsCardContainer}>
          <table className={styles.table}>
              <thead>
                  <tr className={styles.tableHeader}>
                      <th>Тип объектов</th>
                  </tr>
              </thead>
              <tbody>
                  {objectTypes.map((type) => (
                      <tr key={type.id} className={styles.tableRow} onClick={() => navigate(`/view-objects/${type.id}`)}>
                          <td 
                              className={styles.tableCell}
                              onMouseEnter={(event) => handleMouseEnter(event, type.name)} 
                              onMouseMove={handleMouseMove}
                              onMouseLeave={handleMouseLeave}
                          >
                              {type.name}
                              <div className={styles.cellAfter} />
                          </td>
                      </tr>
                  ))}
              </tbody>
          </table>
      </nav>
    );
};

export default OptionsCard;