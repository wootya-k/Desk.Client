import React, { FC } from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import GearButton from '@commons/GearButton/GearButton';
import FavoritesButton from '@commons/FavoritesButton/FavoritesButton';
import AutocompleteInput from './AutocompleteInput/AutocompleteInput';
import styles from './TableHeaderToolbar.module.css';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@services/AuthService';

interface TableHeaderToolbarProps {
  objectType?: string;
  type?: string;
  searchTerm: string;
  onSearchChange: (value: string) => void;
  onBackClick: () => void;
  onCreateClick: () => void;
  onGearClick: () => void;
  onFavoritesClick: () => void;
  onSaveClick: () => void;
  isSaveDisabled?: boolean;
  ruFields: string[];
  rowsData: Record<string, unknown>[];
  ruToEnMap: Record<string, string>;
  isLoading?: boolean;
  statusFilter: 'true' | 'false' | 'all';
  onStatusFilterChange: (value: 'true' | 'false' | 'all') => void;
}

const TableHeaderToolbar: FC<TableHeaderToolbarProps> = ({
  objectType,
  type,
  searchTerm,
  onSearchChange,
  onBackClick,
  onCreateClick,
  onGearClick,
  onFavoritesClick,
  onSaveClick,
  isSaveDisabled = true,
  ruFields,
  rowsData,
  ruToEnMap,
  isLoading = false,
  statusFilter,
  onStatusFilterChange,
}) => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdminOrMaster = user && (user.role === 'Admin' || user.role === 'Master');

  return (
    <div className={styles.toolbarContainer}>
      <div className={styles.toolbarButtons}>
        <FilledColorButton onClick={onBackClick}>Назад</FilledColorButton>

        <GearButton
          strokeWidth={4}
          height="42px"
          width="42px"
          onClick={onGearClick}
        />

        <FavoritesButton
          strokeWidth={4}
          height="42px"
          width="42px"
          onClick={onFavoritesClick}
        />

        <AutocompleteInput
          value={searchTerm}
          onChange={onSearchChange}
          placeholder="Поиск..."
          ruFields={ruFields}
          operators={['>', '<', '=', '!=']}
          rowsData={rowsData}
          ruToEnMap={ruToEnMap}
          width="400px"
        />

        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as 'true' | 'false' | 'all')}
          className={styles.statusSelect}
          title="Фильтр по статусу объекта"
        >
          <option value="true">✅ Активные</option>
          <option value="all">📋 Все</option>
          <option value="false">❌ Неактивные</option>
        </select>

        <FilledColorButton
          onClick={onSaveClick}
          disabled={isSaveDisabled}
          mainColor="#ffffff"
          additionalColor="#f39c12"
        >
          Сохранить
        </FilledColorButton>

        <FilledColorButton
          onClick={() => {
            navigate(`/schema-editor/${type}`);
          }}
          mainColor="#ffffff"
          additionalColor="#699"
          width="150px"
          disabled={!isAdminOrMaster}
        >
          {objectType}
        </FilledColorButton>

        <FilledColorButton onClick={onCreateClick}>Создать</FilledColorButton>
      </div>
    </div>
  );
};

export default TableHeaderToolbar;