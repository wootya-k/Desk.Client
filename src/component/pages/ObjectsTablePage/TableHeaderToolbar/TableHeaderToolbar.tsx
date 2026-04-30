// TableHeaderToolbar.tsx — ПОЛНЫЙ ФАЙЛ С ПАГИНАЦИЕЙ
import React, { FC, useEffect, useState, useCallback, useRef } from 'react';
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
  // === ПАГИНАЦИЯ ===
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  itemsPerPage?: number;
  totalItems?: number;
  // ✅ НОВОЕ: флаг включения/отключения пагинации
  paginationEnabled?: boolean;
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
  // === ДЕСТРУКТУРИЗАЦИЯ ПАГИНАЦИИ ===
  currentPage = 1,
  totalPages = 1,
  onPageChange,
  itemsPerPage,
  totalItems,
  paginationEnabled = true,
}) => {
  const navigate = useNavigate();
  const user = getCurrentUser();
  const isAdminOrMaster = user && (user.role === 'Admin' || user.role === 'Master');

  const [isCtrlPressed, setIsCtrlPressed] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const helpButtonRef = useRef<HTMLButtonElement>(null);

  // Закрытие справки при клике вне
  useEffect(() => {
    if (!isHelpOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      if (helpButtonRef.current && !helpButtonRef.current.contains(e.target as Node)) {
        const tooltip = document.querySelector(`.${styles.helpTooltip}`);
        if (tooltip && !tooltip.contains(e.target as Node)) {
          setIsHelpOpen(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isHelpOpen]);

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

      if ((e.ctrlKey || e.metaKey) && /^[1-8]$/.test(e.key)) {
        e.preventDefault();
        const index = parseInt(e.key, 10) - 1;
        const item = toolbarMeta[index];

        if (item && !item.disabled) {
          if (item.isInput && item.onFocus) {
            item.onFocus();
          } else {
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

  const renderHelpContent = useCallback(() => (
    <div className={styles.helpTooltip}>
      <button
        className={styles.helpTooltipClose}
        onClick={() => setIsHelpOpen(false)}
        aria-label="Закрыть справку"
        type="button"
      >
        ×
      </button>

      <h3>Поисковая строка </h3>

      <div className={styles.helpSection}>
        <p style={{ margin: 0, color: '#4a5568' }}>
          Поисковая строка — это умное поле поиска, которое может как искать введёные значения, так и работать с языком запросов с автодополнением для фильтрации данных в таблицах.
          Поддерживает сложные логические выражения, подсказки по полям и значениям, а также пользовательско-ориентированный интерактивное взаимодействие через клавиатуру.
        </p>
      </div>

      <div className={styles.helpSection}>
        <h4>🧩 Синтаксис поисковых запросов</h4>

        <p><strong>Базовые операторы:</strong></p>
        <table className={styles.helpTable}>
          <thead>
            <tr><th>Оператор</th><th>Описание</th><th>Пример</th></tr>
          </thead>
          <tbody>
            <tr><td><code>=</code></td><td>Равно (частичное совпадение)</td><td><code>Класс=Специалист</code></td></tr>
            <tr><td><code>!=</code></td><td>Не равно (точное совпадение)</td><td><code>Пол!=Женский</code></td></tr>
            <tr><td><code>&gt;</code></td><td>Больше (числовое)</td><td><code>Возраст&gt;18</code></td></tr>
            <tr><td><code>&lt;</code></td><td>Меньше (числовое)</td><td><code>Стаж&lt;5</code></td></tr>
          </tbody>
        </table>

        <p><strong>Логические связки:</strong></p>
        <table className={styles.helpTable}>
          <thead>
            <tr><th>Связка</th><th>Символ</th><th>Описание</th></tr>
          </thead>
          <tbody>
            <tr><td>И</td><td><code>&amp;</code> или <code>и</code></td><td>Все условия в группе должны выполняться</td></tr>
            <tr><td>ИЛИ</td><td><code>||</code> или <code>или</code></td><td>Достаточно одного условия</td></tr>
          </tbody>
        </table>
      </div>

      <div className={styles.helpSection}>
        <h4>💡 Автодополнение (Autocomplete)</h4>
        <table className={styles.helpTable}>
          <thead>
            <tr><th>Ситуация</th><th>Что предлагается</th></tr>
          </thead>
          <tbody>
            <tr><td>Пустой ввод / после <code>(</code> / <code>и</code> / <code>или</code></td><td>Список полей</td></tr>
            <tr><td>Введено имя поля + оператор (<code>Класс=</code>)</td><td>Уникальные значения поля</td></tr>
            <tr><td>Введено полное условие (<code>Класс=Раб</code>)</td><td>Коннекторы: <code>и</code>, <code>или</code>, <code>)</code></td></tr>
            <tr><td>Частичное значение (<code>Фамилия=Си</code>)</td><td>Значения, содержащие подстроку, надйёт: ВаСИльев и СИдоров</td></tr>
          </tbody>
        </table>
      </div>

      <div className={styles.helpSection}>
        <h4>⌨️ Горячие клавиши</h4>

        <p><strong>Внутри поля поиска:</strong></p>
        <div className={styles.hotkeysGrid}>
          <div className={styles.hotkeyItem}><kbd>↓</kbd> <kbd>↑</kbd> Навигация по подсказкам</div>
          <div className={styles.hotkeyItem}><kbd>Enter</kbd> выбрать подсказку</div>
          <div className={styles.hotkeyItem}><kbd>Escape</kbd> Закрыть список</div>
        </div>
      </div>

      <div className={styles.helpSection}>
        <h4>🧪 Примеры запросов</h4>
        <div style={{ display: 'grid', gap: 4, fontFamily: 'ui-monospace, monospace', fontSize: '11px' }}>
          <code>Класс=Специалист</code>
          <code>Возраст&gt;18 и Пол=Мужской</code>
          <code>Класс=Специалист или Класс=Руководитель</code>
          <code>(Класс=Специалист и Пол=Мужской) или (Класс=Рабочий и Забронирован=Да)</code>
        </div>
      </div>
    </div>
  ), []);

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
        <div className={styles.toolbarItemWrapper} style={{ position: 'relative' }}>
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

          {/* 🔘 Info-кнопка */}
          <button
            ref={helpButtonRef}
            className={styles.infoButton}
            onClick={() => setIsHelpOpen(prev => !prev)}
            title="Справка по поиску"
            aria-label="Показать справку по поиску"
            aria-expanded={isHelpOpen}
            type="button"
          >
            i
          </button>

          {/* 📚 Всплывающая справка */}
          {isHelpOpen && renderHelpContent()}

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
              additionalColor="#f39c12"
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

        {/* ✅ Пагинация — стильные стрелки */}
        {paginationEnabled && totalPages > 1 && onPageChange && (
          <div className={styles.paginationContainer}>
            <button
              onClick={() => onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className={`${styles.paginate} ${styles.left}`}
              aria-label="Предыдущая страница"
              type="button"
            >
              <i></i><i></i>
            </button>
            <span className={styles.counter}>
              {currentPage}/{totalPages}
            </span>
            <button
              onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className={`${styles.paginate} ${styles.right}`}
              aria-label="Следующая страница"
              type="button"
            >
              <i></i><i></i>
            </button>
          </div>
        )}

      </div>
      {isCtrlPressed && (
        <div className={styles.shortcutHint}>
          <div className={styles.hintRow}>
            <span className={styles.hintKey}>Ctrl</span> + <span className={styles.hintKey}>1–8</span> — выбрать
          </div>
          <div className={styles.hintRow}>
            <span className={styles.hintKey}>Ctrl</span> + <span className={styles.hintKey}>/</span> — смотреть список горячих клавиш
          </div>
        </div>
      )}
    </div>
  );
};

export default TableHeaderToolbar;