import React, { FC, useEffect, useState, useCallback } from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import GearButton from '@commons/GearButton/GearButton';
import FavoritesButton from '@commons/FavoritesButton/FavoritesButton';
import AutocompleteInput from './AutocompleteInput/AutocompleteInput';
import styles from './TableHeaderToolbar.module.css';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '@services/AuthService';
import StatusFilterButton from '@commons/StatusFilterButton/StatusFilterButton';

interface SavedQuery {
  name: string;
  body: string;
}

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
  error?: boolean;
  statusFilter: 'true' | 'false' | 'all';
  onStatusFilterChange: (value: 'true' | 'false' | 'all') => void;
  filteredRowsCount?: number;
  savedQueries?: SavedQuery[];
}

interface ToolbarItemMeta {
  id: number;
  label: string;
  disabled?: boolean;
  isInput?: boolean;
  onFocus?: () => void;
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
  error: isLoading = false,
  statusFilter,
  onStatusFilterChange,
  filteredRowsCount,
  savedQueries = [],
}) => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdminOrMaster = user && (user.role === 'Admin' || user.role === 'Master');

  const [isCtrlPressed, setIsCtrlPressed] = useState(false);

  const toolbarMeta: ToolbarItemMeta[] = [
    { id: 1, label: 'Назад', disabled: isLoading, isInput: false },
    { id: 2, label: 'Настройки', disabled: isLoading, isInput: false },
    { id: 3, label: 'Избранное', disabled: isLoading, isInput: false },
    {
      id: 4,
      label: 'Поиск',
      disabled: false,
      isInput: true,
      onFocus: () => {
        const input = document.querySelector<HTMLInputElement>('input[placeholder="Поиск..."]');
        input?.focus();
      }
    },
    { id: 5, label: 'Сохранить', disabled: isSaveDisabled || isLoading, isInput: false },
    {
      id: 6,
      label: 'Фильтр статуса',
      disabled: false,
      isInput: false,
      onFocus: () => {
        const next: Record<'true' | 'false' | 'all', 'true' | 'false' | 'all'> = {
          'true': 'false',
          'false': 'all',
          'all': 'true',
        };
        onStatusFilterChange(next[statusFilter]);
      }
    },
    { id: 7, label: objectType || 'Схема', disabled: !isAdminOrMaster || isLoading, isInput: false },
    { id: 8, label: 'Создать', disabled: isLoading, isInput: false },
  ].filter((_, index) => {
    if (index === 6 && !objectType) return false;
    return true;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(true);
        return;
      }

      // Ctrl + цифра 1-8 — СРАЗУ выполняем действие, без подсветки и Enter
      if ((e.ctrlKey || e.metaKey) && /^[1-8]$/.test(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const item = toolbarMeta[index];

        if (item && !item.disabled) {
          // Если инпут — просто фокус
          if (item.isInput && item.onFocus) {
            item.onFocus();
          } else {
            // Иначе — сразу вызываем действие через switch
            switch (index) {
              case 0: onBackClick(); break;
              case 1: onGearClick(); break;
              case 2: onFavoritesClick(); break;
              case 4: onSaveClick(); break;
              case 5: {
                const next: Record<'true' | 'false' | 'all', 'true' | 'false' | 'all'> = {
                  'true': 'false', 'false': 'all', 'all': 'true',
                };
                onStatusFilterChange(next[statusFilter]);
                break;
              }
              case 6: if (isAdminOrMaster) navigate(`/schema-editor/${type}`); break;
              case 7: onCreateClick(); break;
            }
          }
        }
        return;
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.key === 'Meta') {
        setIsCtrlPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [toolbarMeta, isLoading, isSaveDisabled, statusFilter, onStatusFilterChange, onSaveClick, onBackClick, onGearClick, onFavoritesClick, onCreateClick, navigate, type, isAdminOrMaster]);

  const renderShortcutBadge = useCallback((itemIndex: number, item: ToolbarItemMeta) => {
    if (!isCtrlPressed) return null;
    return (
      <div className={styles.shortcutBadge} title={item.label}>
        {item.id}
      </div>
    );
  }, [isCtrlPressed]);

  return (
    <div className={styles.toolbarContainer}>
      <div className={styles.toolbarButtons}>
        
        {/* 1. Назад */}
        <div className={styles.toolbarItemWrapper}>
          <FilledColorButton onClick={onBackClick} disabled={isLoading}>Назад</FilledColorButton>
          {renderShortcutBadge(0, toolbarMeta[0])}
        </div>

        {/* 2. Настройки */}
        <div className={styles.toolbarItemWrapper}>
          <GearButton strokeWidth={4} height="44px" width="44px" onClick={onGearClick} disabled={isLoading} />
          {renderShortcutBadge(1, toolbarMeta[1])}
        </div>

        {/* 3. Избранное */}
        <div className={styles.toolbarItemWrapper}>
          <FavoritesButton strokeWidth={4} height="44px" width="44px" onClick={onFavoritesClick} disabled={isLoading} />
          {renderShortcutBadge(2, toolbarMeta[2])}
        </div>

        {/* 4. Поиск */}
        <div className={styles.toolbarItemWrapper}>
          <AutocompleteInput
            value={searchTerm}
            onChange={onSearchChange}
            placeholder="Поиск..."
            ruFields={ruFields}
            operators={['>', '<', '=', '!=']}
            rowsData={rowsData}
            ruToEnMap={ruToEnMap}
            resultsCount={filteredRowsCount}
            width="400px"
            minWidth="220px"
            savedQueries={savedQueries}
            onCycleSavedQuery={(query: SavedQuery, index: number, total: number) => {
              console.log(`🔄 ${query.name} (${index + 1}/${total})`);
            }}
          />
          {renderShortcutBadge(3, toolbarMeta[3])}
        </div>

        {/* 5. Сохранить */}
        <div className={styles.toolbarItemWrapper}>
          <FilledColorButton
            onClick={onSaveClick}
            disabled={isSaveDisabled || isLoading}
            mainColor="#ffffff"
            additionalColor="#f39c12"
          >
            Сохранить
          </FilledColorButton>
          {renderShortcutBadge(4, toolbarMeta[4])}
        </div>

        {/* 6. Фильтр статуса */}
        <div className={styles.toolbarItemWrapper}>
          <StatusFilterButton
            value={statusFilter}
            onChange={onStatusFilterChange}
            mainColor="#ffffff"
            additionalColor="#3498db"
          />
          {renderShortcutBadge(5, toolbarMeta[5])}
        </div>

        {/* 7. Schema Editor */}
        {objectType && (
          <div className={styles.toolbarItemWrapper}>
            <FilledColorButton
              onClick={() => navigate(`/schema-editor/${type}`)}
              disabled={!isAdminOrMaster || isLoading}
              mainColor="#ffffff"
              additionalColor="#699"
              width="150px"
            >
              {objectType}
            </FilledColorButton>
            {renderShortcutBadge(6, toolbarMeta[6])}
          </div>
        )}

        {/* 8. Создать */}
        <div className={styles.toolbarItemWrapper}>
          <FilledColorButton onClick={onCreateClick} disabled={isLoading}>Создать</FilledColorButton>
          {renderShortcutBadge(objectType ? 7 : 6, toolbarMeta[objectType ? 7 : 6])}
        </div>

      </div>

      {/* 💡 Подсказка внизу */}
      {isCtrlPressed && (
        <div className={styles.shortcutHint}>
          <div className={styles.hintRow}>
            <span className={styles.hintKey}>Ctrl</span> + <span className={styles.hintKey}>1–8</span> — выбрать
          </div>
          <div className={styles.hintRow}>
            <span className={styles.hintKey}>Ctrl</span> + <span className={styles.hintKey}>/</span> — смотреть список горячих клавиш
          </div>
          {savedQueries.length > 0 && (
            <div className={styles.hintRow}>
              <span className={styles.hintKey}>Ctrl</span> + <span className={styles.hintKey}>Tab</span> — цикл по сохранённым запросам
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TableHeaderToolbar;