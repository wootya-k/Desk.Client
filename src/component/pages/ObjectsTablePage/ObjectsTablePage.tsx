import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import ObjectEditModal from './ObjectEditModal/ObjectEditModal';
import ObjectTableComponent from './ObjectsTableComponent/ObjectsTableComponent';
import ColumnSettingsModal from './ColumnSettingsModal/ColumnSettingsModal';
import TableHeaderToolbar from './TableHeaderToolbar/TableHeaderToolbar';
import { fetchAllObjects, restoreObjectById, deleteObjectById } from '@services/ObjectService';
import { fetchFieldTitlesById } from '@services/TableService';
import DeleteConfirmationModal from '@shared/DeleteConfirmationModal/DeleteConfirmationModal';
import FavoritesModal from './FavoritesModal/FavoritesModal';
import { updateFavoriteQuery, getFavoriteQueries, saveFavoriteQuery, deleteFavoriteQuery, SavedQuery } from '@services/QueryService';
import {
  parseSearchQuery,
  checkRowAgainstConditionGroups,
} from 'utils/searchUtils';
import { setExpiringItem, getExpiringItem } from 'utils/LocalStorageUtils';
import styles from './ObjectsTablePage.module.css';
import RestoreConfirmationModal from '@shared/RestoreConfirmationModal/RestoreConfirmationModal'
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import SaveQueryModal from './SaveQueryModal/SaveQueryModal';

interface FetchObjectItem {
  id: string;
  value: string;
  status: boolean;
}

export interface Row extends Record<string, unknown> {
  id: string;
  status: boolean;
}

export interface ColumnConfig {
  title: string;
  accessor: string;
  visible: boolean;
}

// === УЛУЧШЕННАЯ СИСТЕМА ХРАНЕНИЯ ===
const TABLE_CONFIG_KEY = 'tableColumnsConfig';

interface TableConfig {
  [tableType: string]: ColumnConfig[];
}

const saveTableConfig = (tableType: string, columns: ColumnConfig[]): void => {
  const existingConfigStr = localStorage.getItem(TABLE_CONFIG_KEY);
  const existingConfig: TableConfig = existingConfigStr ? JSON.parse(existingConfigStr) : {};

  existingConfig[tableType] = columns;

  localStorage.setItem(TABLE_CONFIG_KEY, JSON.stringify(existingConfig));

  setExpiringItem(`columnsConfig_${tableType}`, JSON.stringify(columns), 365);
};

const loadTableConfig = (tableType: string): ColumnConfig[] | null => {
  try {
    const configStr = localStorage.getItem(TABLE_CONFIG_KEY);
    if (configStr) {
      const config: TableConfig = JSON.parse(configStr);
      if (config[tableType]) {
        return config[tableType];
      }
    }

    const cookieConfig = getExpiringItem(`columnsConfig_${tableType}`);
    if (cookieConfig) {
      const columns = JSON.parse(cookieConfig);
      return columns;
    }

    return null;
  } catch (error) {
    console.error('❌ Ошибка загрузки конфигурации:', error);
    return null;
  }
};

const ObjectsTablePage: React.FC = () => {
  const { type } = useParams<{ type?: string }>();
  const navigate = useNavigate();
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const fixedScrollRef = useRef<HTMLDivElement>(null);
  const [isNewObjectModalOpen, setIsNewObjectModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingObjectId, setEditingObjectId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [objectToDelete, setObjectToDelete] = useState<{ id: string; row: Row } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [objectType, setObjectType] = useState('');
  const [columns, setColumns] = useState<ColumnConfig[]>([]);
  const [defaultColumns, setDefaultColumns] = useState<ColumnConfig[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [ruToEnMap, setRuToEnMap] = useState<Record<string, string>>({});
  const [isFavoritesModalOpen, setIsFavoritesModalOpen] = useState(false);
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [tableWidth, setTableWidth] = useState(0);
  const [hasVerticalScroll, setHasVerticalScroll] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('true');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [objectToRestore, setObjectToRestore] = useState<{ id: string } | null>(null);

  // ✅ НОВЫЕ СОСТОЯНИЯ ДЛЯ ЗАГРУЗКИ И ОШИБОК
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

  const handleSaveClick = useCallback(() => {
    if (!searchTerm.trim()) return;
    setIsSaveModalOpen(true);
  }, [searchTerm]);

  const handleConfirmSave = useCallback(async (name: string) => {
    if (!type) {
      console.error('Type не определён');
      return;
    }

    try {
      // ← 3 аргумента: type, name, body
      await saveFavoriteQuery(type, name, searchTerm);
      setIsSaveModalOpen(false);

      // Обновляем список избранного
      const queries = await getFavoriteQueries(type);
      setSavedQueries(queries);
    } catch (err) {
      console.error('Ошибка сохранения запроса:', err);
      alert('Не удалось сохранить запрос');
    }
  }, [type, searchTerm]);

  const openRestoreModal = useCallback((id: string) => {
    setObjectToRestore({ id });
    setIsRestoreModalOpen(true);
  }, []);

  const handleConfirmRestore = useCallback(async () => {
    if (!objectToRestore) return;

    try {
      await restoreObjectById(objectToRestore.id);

      setRows(prev => prev.map(row =>
        row.id === objectToRestore.id ? { ...row, status: true } : row
      ));

      console.log('Объект восстановлен:', objectToRestore.id);
    } catch (err) {
      console.error('Ошибка восстановления:', err);
    } finally {
      setIsRestoreModalOpen(false);
      setObjectToRestore(null);
    }
  }, [objectToRestore]);

  const handleCancelRestore = useCallback(() => {
    setIsRestoreModalOpen(false);
    setObjectToRestore(null);
  }, []);

  const handleUpdateFavoriteQuery = useCallback((id: number, name: string, body: string) => {
    // 👈 ТОЛЬКО локальное обновление — без вызова API!
    setSavedQueries(prev => prev.map(q =>
      q.id === id ? { ...q, name, body } : q
    ));
  }, []);

  const handleReorderFavoriteQuery = useCallback(async (id: number, newIndex: number) => {
    try {
      // Пересортировываем локально
      setSavedQueries(prev => {
        const newQueries = [...prev];
        const index = newQueries.findIndex(q => q.id === id);
        const [removed] = newQueries.splice(index, 1);
        newQueries.splice(newIndex, 0, removed);
        return newQueries;
      });
    } catch (err) {
      console.error('Ошибка изменения порядка:', err);
    }
  }, []);


  const filteredRows = useMemo(() => {
    const raw = searchTerm.trim();
    if (!raw) return rows;
    const groups = parseSearchQuery(raw.toLowerCase());
    if (!groups.length) {
      return rows.filter(r =>
        Object.values(r).some(val => String(val).toLowerCase().includes(raw.toLowerCase()))
      );
    }
    return rows.filter(r => checkRowAgainstConditionGroups(r, groups, ruToEnMap));
  }, [searchTerm, rows, ruToEnMap]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const fixedScroll = fixedScrollRef.current;
    if (tableContainer && fixedScroll) {
      const updateScrollState = () => {
        setHasVerticalScroll(tableContainer.scrollHeight > tableContainer.clientHeight);
        const table = tableContainer.querySelector('table');
        if (table) {
          setTableWidth(table.scrollWidth);
        }
      };
      const handleTableScroll = () => {
        if (fixedScroll) {
          fixedScroll.scrollLeft = tableContainer.scrollLeft;
        }
      };
      const handleFixedScroll = () => {
        if (tableContainer) {
          tableContainer.scrollLeft = fixedScroll.scrollLeft;
        }
      };
      tableContainer.addEventListener('scroll', handleTableScroll);
      fixedScroll.addEventListener('scroll', handleFixedScroll);
      const resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(tableContainer);
      updateScrollState();
      return () => {
        tableContainer.removeEventListener('scroll', handleTableScroll);
        fixedScroll.removeEventListener('scroll', handleFixedScroll);
        resizeObserver.disconnect();
      };
    }
  }, [filteredRows, isLoading, error]);

  const handleFavoritesClick = useCallback(async () => {
    try {
      const queries = await getFavoriteQueries(type);
      setSavedQueries(queries);
      setIsFavoritesModalOpen(true);
    } catch (err) {
      console.error('Ошибка загрузки избранного:', err);
    }
  }, []);

  const handleSelectFavoriteQuery = useCallback((query: string) => {
    setSearchTerm(query);
    setIsFavoritesModalOpen(false);
  }, []);

  const handleDeleteFavoriteQuery = useCallback(async (id: number) => {
    try {
      await deleteFavoriteQuery(id);
      setSavedQueries(prev => prev.filter(q => q.id !== id));
    } catch (err) {
      console.error('Ошибка удаления запроса:', err);
    }
  }, []);

  const createDefaultColumns = useCallback((fieldTitles: Record<string, string>): ColumnConfig[] => {
    return Object.entries(fieldTitles).map(([eng, rus]) => ({
      title: rus,
      accessor: eng,
      visible: true,
    }));
  }, []);

  const mergeColumns = useCallback(
    (savedColumns: ColumnConfig[], defaultColumns: ColumnConfig[]): ColumnConfig[] => {
      if (!savedColumns || savedColumns.length === 0) {
        return defaultColumns.map(col => ({ ...col }));
      }

      const mergedColumns: ColumnConfig[] = [];
      const savedAccessors = new Set(savedColumns.map(col => col.accessor));

      mergedColumns.push(...savedColumns.map(col => ({ ...col })));

      defaultColumns.forEach(defaultCol => {
        if (!savedAccessors.has(defaultCol.accessor)) {
          mergedColumns.push({ ...defaultCol });
        }
      });

      return mergedColumns;
    },
    []
  );

  // ✅ ФУНКЦИЯ ДЛЯ ПОВТОРНОЙ ПОПЫТКИ
  const handleRetry = useCallback(() => {
    setRetryCount(prev => prev + 1);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (!type) {
        console.log('❌ Type не определён, пропускаем загрузку');
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const [data, schemaResponse] = await Promise.all([
          fetchAllObjects(type, { status: statusFilter }),
          fetchFieldTitlesById(type),
        ]);

        const { objectType, fieldTitles } = schemaResponse;
        setObjectType(objectType);

        const newMap: Record<string, string> = {};
        Object.entries(fieldTitles).forEach(([en, ru]) => {
          newMap[ru.toLowerCase()] = en;
        });
        setRuToEnMap(newMap);

        const defaultCols = createDefaultColumns(fieldTitles);
        setDefaultColumns(defaultCols);

        const savedConfig = loadTableConfig(type);
        let initialColumns: ColumnConfig[];

        if (savedConfig && savedConfig.length > 0) {
          initialColumns = mergeColumns(savedConfig, defaultCols);
        } else {
          initialColumns = defaultCols.map(col => ({ ...col }));
        }

        const parsedRows: Row[] = (data as FetchObjectItem[]).map((item) => {
          const obj = JSON.parse(item.value);
          return {
            ...obj,
            id: item.id,
            status: item.status
          };
        });

        setColumns(initialColumns);
        setRows(parsedRows);
        setIsLoading(false);
      } catch (err) {
        console.error('❌ Ошибка загрузки:', err);
        setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
        setIsLoading(false);
      }
    };

    loadData();
  }, [type, statusFilter, retryCount, createDefaultColumns, mergeColumns]);

  const performImmediateDelete = useCallback(async (id: string, row: Row) => {
    try {
      setRows(prev => prev.filter(row => row.id !== id));
      await deleteObjectById(id);
      console.log('Объект удалён без подтверждения (Shift+ЛКМ)');
    } catch (err) {
      console.error('Ошибка удаления:', err);
      setRows(prev => [...prev, row]);
    }
  }, []);

  const openDeleteModal = useCallback((id: string, row: Row) => {
    if (isShiftPressed) {
      performImmediateDelete(id, row);
      return;
    }
    setObjectToDelete({ id, row });
    setIsDeleteModalOpen(true);
  }, [isShiftPressed, performImmediateDelete]);

  const handleConfirmDelete = useCallback(async () => {
    if (objectToDelete) {
      try {
        setRows(prev => prev.filter(row => row.id !== objectToDelete.id));
        await deleteObjectById(objectToDelete.id);
      } catch (err) {
        console.error('Ошибка удаления:', err);
        setRows(prev => [...prev, objectToDelete.row]);
      } finally {
        setIsDeleteModalOpen(false);
        setObjectToDelete(null);
      }
    }
  }, [objectToDelete]);

  const handleCancelDelete = useCallback(() => {
    setIsDeleteModalOpen(false);
    setObjectToDelete(null);
  }, []);

  const handleEdit = useCallback((rowId: string) => {
    setEditingObjectId(rowId);
    setIsEditModalOpen(true);
  }, []);

  const closeEditModal = useCallback(() => {
    setIsEditModalOpen(false);
    setEditingObjectId(null);
  }, []);

  const handleBackClick = useCallback(() => {
    navigate('/');
  }, [navigate]);

  const handleCreateClick = useCallback(() => {
    setIsNewObjectModalOpen(true);
  }, []);

  const handleGearClick = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleApplySettings = useCallback((updatedColumns: ColumnConfig[]) => {
    if (!type) {
      console.error('❌ Не удалось сохранить конфигурацию: type не определён');
      return;
    }
    saveTableConfig(type, updatedColumns);
    setColumns(updatedColumns);
    setIsModalOpen(false);
  }, [type]);

  const handleResetSettings = useCallback(() => {
    const resetColumns = defaultColumns.map(col => ({ ...col }));
    if (type) {
      saveTableConfig(type, resetColumns);
    }
    return resetColumns;
  }, [defaultColumns, type]);

  const handleColumnOrderChange = useCallback((newColumns: ColumnConfig[]) => {
    if (!type) {
      return;
    }
    saveTableConfig(type, newColumns);
    setColumns(newColumns);
  }, [type]);

  const conditionGroups = useMemo(() => parseSearchQuery(searchTerm.trim().toLowerCase()), [searchTerm]);
  const isSaveDisabled = !(conditionGroups.length > 0 && filteredRows.length > 0);
  const ruFields = useMemo(() => Object.keys(ruToEnMap), [ruToEnMap]);

  const handleSaveSuccess = useCallback(() => {
    closeEditModal();
    const reloadData = async () => {
      if (!type) return;

      setIsLoading(true);
      setError(null);

      try {
        const [data, schemaResponse] = await Promise.all([
          fetchAllObjects(type, { status: statusFilter }),
          fetchFieldTitlesById(type),
        ]);
        const { objectType, fieldTitles } = schemaResponse;
        setObjectType(objectType);

        const newMap: Record<string, string> = {};
        Object.entries(fieldTitles).forEach(([en, ru]) => {
          newMap[ru.toLowerCase()] = en;
        });
        setRuToEnMap(newMap);

        const defaultCols = createDefaultColumns(fieldTitles);
        setDefaultColumns(defaultCols);

        const savedConfig = loadTableConfig(type);
        let initialColumns: ColumnConfig[];

        if (savedConfig && savedConfig.length > 0) {
          initialColumns = mergeColumns(savedConfig, defaultCols);
        } else {
          initialColumns = defaultCols.map(col => ({ ...col }));
        }

        const parsedRows: Row[] = (data as FetchObjectItem[]).map((item) => {
          const obj = JSON.parse(item.value);
          return {
            ...obj,
            id: item.id,
            status: item.status
          };
        });

        setColumns(initialColumns);
        setRows(parsedRows);
        setIsLoading(false);
      } catch (err) {
        console.error('Ошибка перезагрузки данных:', err);
        setError(err instanceof Error ? err.message : 'Не удалось обновить данные');
        setIsLoading(false);
      }
    };
    reloadData();
  }, [type, statusFilter, closeEditModal, createDefaultColumns, mergeColumns]);

  const hasOpenModal =
    isNewObjectModalOpen ||
    isEditModalOpen ||
    isModalOpen ||
    isDeleteModalOpen ||
    isFavoritesModalOpen;


  return (
    <div className={styles.pageContainer}>
      <TableHeaderToolbar
        objectType={objectType}
        type={type}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onBackClick={handleBackClick}
        onCreateClick={handleCreateClick}
        onGearClick={handleGearClick}
        onFavoritesClick={handleFavoritesClick}
        onSaveClick={handleSaveClick}
        isSaveDisabled={isSaveDisabled}
        ruFields={ruFields}
        rowsData={rows}
        ruToEnMap={ruToEnMap}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        filteredRowsCount={filteredRows.length}
        error={error != null || isLoading}
        savedQueries={savedQueries.map(q => ({ name: q.name, body: q.body }))}
      />
      <main className={styles.contentLayout} ref={tableContainerRef}>
        {/* ✅ СОСТОЯНИЕ ЗАГРУЗКИ */}
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <div className={styles.loadingText}>
              Загрузка данных...
            </div>
          </div>
        ) : error ? (
          /* ✅ СОСТОЯНИЕ ОШИБКИ */
          <div className={styles.errorContainer}>
            <h3 className={styles.errorTitle}>Не удалось загрузить данные</h3>
            <p className={styles.errorMessage}>
              {error}
            </p>
            <FilledColorButton
              onClick={handleRetry}
            >
              Повторить попытку
            </FilledColorButton>
          </div>
        ) : (
          /* ✅ ТАБЛИЦА С ДАННЫМИ */
          <ObjectTableComponent
            rows={filteredRows}
            columns={columns}
            onEdit={handleEdit}
            onDelete={openDeleteModal}
            onRestore={openRestoreModal}
            onColumnOrderChange={handleColumnOrderChange}
          />
        )}

        {hasVerticalScroll && !isLoading && !error && filteredRows.length > 0 && (
          <div
            className={styles.fixedHorizontalScroll}
            ref={fixedScrollRef}
          >
            <div
              className={styles.fixedHorizontalScrollContent}
              style={{ width: `${tableWidth}px` }}
            />
          </div>
        )}
      </main>
      {isDeleteModalOpen &&
        ReactDOM.createPortal(
          <DeleteConfirmationModal
            preview="Вы уверены, что хотите удалить этот объект?"
            onConfirm={handleConfirmDelete}
            onCancel={handleCancelDelete}
          />,
          document.getElementById('modal-root')!
        )}
      {isModalOpen &&
        ReactDOM.createPortal(
          <ColumnSettingsModal
            initialColumns={columns}
            defaultColumns={defaultColumns}
            onApply={handleApplySettings}
            onReset={handleResetSettings}
            onCancel={() => setIsModalOpen(false)}
          />,
          document.getElementById('modal-root')!
        )}
      {isFavoritesModalOpen &&
        ReactDOM.createPortal(
          <FavoritesModal
            isOpen={isFavoritesModalOpen}
            onClose={() => setIsFavoritesModalOpen(false)}
            favorites={savedQueries}
            onSelect={handleSelectFavoriteQuery}
            onDelete={handleDeleteFavoriteQuery}
            title={objectType}
            type={type}
          />,
          document.getElementById('modal-root')!
        )}
      {isEditModalOpen && type && editingObjectId && (
        <ObjectEditModal
          isOpen={isEditModalOpen}
          onClose={closeEditModal}
          type={type}
          id={editingObjectId}
          onSaveSuccess={handleSaveSuccess}
          title="Редактирование объекта"
          // ✅ Передаём точный статус из rows
          isDeadObject={rows.find(r => r.id === editingObjectId)?.status === false}
        />
      )}
      {isNewObjectModalOpen && type && (
        <ObjectEditModal
          isOpen={isNewObjectModalOpen}
          onClose={() => setIsNewObjectModalOpen(false)}
          type={type}
          onSaveSuccess={handleSaveSuccess}
          title="Создание нового объекта"
        />
      )}
      {isRestoreModalOpen &&
        ReactDOM.createPortal(
          <RestoreConfirmationModal
            onConfirm={handleConfirmRestore}
            onCancel={handleCancelRestore}
          />,
          document.getElementById('modal-root')!
        )}
      <SaveQueryModal
        isOpen={isSaveModalOpen}
        onClose={() => setIsSaveModalOpen(false)}
        onSave={handleConfirmSave}
        preview={searchTerm}
      />
    </div>
  );
};

export default ObjectsTablePage;