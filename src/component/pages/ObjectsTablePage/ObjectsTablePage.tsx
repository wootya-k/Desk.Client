import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom';
import { useParams, useNavigate } from 'react-router-dom';
import ObjectEditModal from './ObjectEditModal/ObjectEditModal';
import ObjectTableComponent from './ObjectsTableComponent/ObjectsTableComponent';
import ColumnSettingsModal from './ColumnSettingsModal/ColumnSettingsModal';
import TableHeaderToolbar from './TableHeaderToolbar/TableHeaderToolbar';
import { fetchAllObjects, restoreObjectById, deleteObjectById } from '@services/ObjectService';
import { fetchFieldTitlesById } from '@services/TableService';
import DeleteConfirmationModal from '@shared/DeleteConfirmationModal/DeleteConfirmationModal';
import FavoritesModal from './FavoritesModal/FavoritesModal';
import { getFavoriteQueries, saveFavoriteQuery, deleteFavoriteQuery, SavedQuery } from '@services/QueryService';
import { parseSearchQuery, checkRowAgainstConditionGroups } from 'utils/searchUtils';
import { setExpiringItem, getExpiringItem } from 'utils/LocalStorageUtils';
import { calculateAge, getRetirementAge } from 'utils/employeeUtils';
import styles from './ObjectsTablePage.module.css';
import RestoreConfirmationModal from '@shared/RestoreConfirmationModal/RestoreConfirmationModal';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface FetchObjectItem {
  id: string;
  value: string | Record<string, unknown>;
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
  isComputed?: boolean;
  computeType?: 'age' | 'surname' | 'militaryCommission';
}

export interface PaginationConfig {
  enabled: boolean;
  rowsPerPage: number;
}

const TABLE_CONFIG_KEY = 'tableColumnsConfig';
const PAGINATION_CONFIG_KEY = 'tablePaginationConfig';

const getDefaultPagination = (isNarrowTable: boolean): PaginationConfig => ({
  enabled: true,
  rowsPerPage: isNarrowTable ? 50 : 15
});

interface TableConfig { [tableType: string]: ColumnConfig[]; }
interface PaginationConfigMap { [tableType: string]: PaginationConfig; }

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
      if (config[tableType]) return config[tableType];
    }
    const cookieConfig = getExpiringItem(`columnsConfig_${tableType}`);
    if (cookieConfig) return JSON.parse(cookieConfig);
    return null;
  } catch (error) {
    console.error('❌ Ошибка загрузки конфигурации:', error);
    return null;
  }
};

const savePaginationConfig = (tableType: string, config: PaginationConfig): void => {
  const existingConfigStr = localStorage.getItem(PAGINATION_CONFIG_KEY);
  const existingConfig: PaginationConfigMap = existingConfigStr ? JSON.parse(existingConfigStr) : {};
  existingConfig[tableType] = config;
  localStorage.setItem(PAGINATION_CONFIG_KEY, JSON.stringify(existingConfig));
  setExpiringItem(`paginationConfig_${tableType}`, JSON.stringify(config), 365);
};

const loadPaginationConfig = (tableType: string): PaginationConfig | null => {
  try {
    const configStr = localStorage.getItem(PAGINATION_CONFIG_KEY);
    if (configStr) {
      const config: PaginationConfigMap = JSON.parse(configStr);
      if (config[tableType]) return config[tableType];
    }
    const cookieConfig = getExpiringItem(`paginationConfig_${tableType}`);
    if (cookieConfig) return JSON.parse(cookieConfig);
    return null;
  } catch (error) {
    console.error('❌ Ошибка загрузки настроек пагинации:', error);
    return null;
  }
};

const addComputedColumns = (columns: ColumnConfig[], tableType: string): ColumnConfig[] => {
  if (tableType !== 'employee') return columns;

  const hasAgeColumn = columns.some(col => col.accessor === 'computed_age');

  const result = [...columns];

  if (!hasAgeColumn) {
    const birthDateIndex = result.findIndex(col =>
      col.accessor === 'date_of_birth' || col.title.toLowerCase().includes('дата рождения')
    );
    const ageColumn: ColumnConfig = {
      title: 'Возраст',
      accessor: 'computed_age',
      visible: true,
      isComputed: true,
      computeType: 'age'
    };
    if (birthDateIndex !== -1) {
      result.splice(birthDateIndex + 1, 0, ageColumn);
    } else {
      result.unshift(ageColumn);
    }
  }

  const surnameIndex = result.findIndex(col => col.accessor === 'last_name');
  if (surnameIndex !== -1 && !result[surnameIndex].computeType) {
    result[surnameIndex] = { ...result[surnameIndex], isComputed: true, computeType: 'surname' };
  }

  const milCommIndex = result.findIndex(col => col.accessor === 'military_commissariat');
  if (milCommIndex !== -1 && !result[milCommIndex].computeType) {
    result[milCommIndex] = { ...result[milCommIndex], isComputed: true, computeType: 'militaryCommission' };
  }

  return result;
};

// ✅ ИЗВЛЕЧЕНИЕ ВСЕХ УНИКАЛЬНЫХ КЛЮЧЕЙ ИЗ ДАННЫХ
const extractKeysFromData = (rows: Row[]): string[] => {
  const keysSet = new Set<string>();
  rows.forEach(row => {
    Object.keys(row).forEach(key => {
      if (key !== 'id' && key !== 'status' && key !== 'computed_age') {
        keysSet.add(key);
      }
    });
  });
  return Array.from(keysSet);
};

// ✅ ОБНОВЛЕНИЕ НАЗВАНИЙ КОЛОНОК ИЗ FIELDTITLES
const updateColumnsWithFieldTitles = (
  columns: ColumnConfig[], 
  fieldTitles: Record<string, string>
): ColumnConfig[] => {
  return columns.map(col => ({
    ...col,
    title: fieldTitles[col.accessor] || col.title
  }));
};

// ✅ ДОБАВЛЕНИЕ НОВЫХ КОЛОНОК ИЗ ДАННЫХ
const addMissingColumnsFromData = (
  columns: ColumnConfig[], 
  dataKeys: string[], 
  fieldTitles: Record<string, string>
): ColumnConfig[] => {
  const existingAccessors = new Set(columns.map(col => col.accessor));
  
  const missingColumns: ColumnConfig[] = dataKeys
    .filter(key => !existingAccessors.has(key))
    .map(key => ({
      title: fieldTitles[key] || key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, ' '),
      accessor: key,
      visible: true
    }));

  if (missingColumns.length > 0) {
    console.log('➕ Добавляю недостающие колонки:', missingColumns);
    return [...columns, ...missingColumns];
  }
  
  return columns;
};

const ObjectsTablePage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
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
  const [statusFilter, setStatusFilter] = useState<'true' | 'false' | 'all'>('true');
  const [isRestoreModalOpen, setIsRestoreModalOpen] = useState(false);
  const [objectToRestore, setObjectToRestore] = useState<{ id: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [paginationConfig, setPaginationConfig] = useState<PaginationConfig>({ enabled: true, rowsPerPage: 15 });
  const [currentPage, setCurrentPage] = useState(1);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  const handleBrokenRefClick = useCallback((uuid: string) => {
    navigator.clipboard.writeText(uuid).then(() => showToast(`Ссылка скопирована: ${uuid}`, 'success'))
      .catch(() => showToast('Не удалось скопировать ссылку', 'error'));
  }, [showToast]);

  const openRestoreModal = useCallback((id: string) => { setObjectToRestore({ id }); setIsRestoreModalOpen(true); }, []);
  
  const handleConfirmRestore = useCallback(async () => {
    if (!objectToRestore) return;
    try {
      await restoreObjectById(objectToRestore.id);
      setRows(prev => prev.map(row => row.id === objectToRestore.id ? { ...row, status: true } : row));
    } catch (err) { console.error('Ошибка восстановления:', err); }
    finally { setIsRestoreModalOpen(false); setObjectToRestore(null); }
  }, [objectToRestore]);
  
  const handleCancelRestore = useCallback(() => { setIsRestoreModalOpen(false); setObjectToRestore(null); }, []);

  const handleUpdateFavoriteQuery = useCallback((id: number, name: string, body: string) => {
    setSavedQueries(prev => prev.map(q => q.id === id ? { ...q, name, body } : q));
  }, []);
  
  const handleReorderFavoriteQuery = useCallback(async (id: number, newIndex: number) => {
    try {
      setSavedQueries(prev => {
        const newQueries: SavedQuery[] = [...prev];
        const index = newQueries.findIndex(q => q.id === id);
        const [removed] = newQueries.splice(index, 1);
        newQueries.splice(newIndex, 0, removed);
        return newQueries;
      });
    } catch (err) { console.error('Ошибка изменения порядка:', err); }
  }, []);

  const filteredRows = useMemo(() => {
    const raw = searchTerm.trim();
    if (!raw) return rows;

    const groups = parseSearchQuery(raw.toLowerCase());

    if (!groups.length) {
      const words: string[] = [];
      const regex = /"([^"]+)"|(\S+)/g;
      let match;
      const lowerRaw = raw.toLowerCase();

      while ((match = regex.exec(lowerRaw)) !== null) {
        words.push(match[1] || match[2]);
      }

      if (words.length === 0) return rows;

      return rows.filter(row =>
        words.every(word =>
          Object.values(row).some(val => {
            if (val === null || val === undefined) return false;
            return String(val).toLowerCase().includes(word);
          })
        )
      );
    }

    return rows.filter(r => checkRowAgainstConditionGroups(r, groups, ruToEnMap));
  }, [searchTerm, rows, ruToEnMap]);

  const sortedRows = useMemo(() => {
    if (!sortColumn) return filteredRows;

    if (sortColumn === 'computed_age') {
      return [...filteredRows].sort((a, b) => {
        const ageA = a['computed_age'] as number | null | undefined;
        const ageB = b['computed_age'] as number | null | undefined;
        if (ageA === null || ageA === undefined) return sortDirection === 'asc' ? 1 : -1;
        if (ageB === null || ageB === undefined) return sortDirection === 'asc' ? -1 : 1;
        return sortDirection === 'asc' ? ageA - ageB : ageB - ageA;
      });
    }

    return [...filteredRows].sort((a, b) => {
      const aVal = a[sortColumn], bVal = b[sortColumn];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
      if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
      const aStr = String(aVal), bStr = String(bVal);
      return sortDirection === 'asc' ? aStr.localeCompare(bStr, 'ru', { numeric: true }) : bStr.localeCompare(aStr, 'ru', { numeric: true });
    });
  }, [filteredRows, sortColumn, sortDirection]);

  useEffect(() => { setCurrentPage(1); }, [searchTerm, statusFilter, paginationConfig]);

  const paginatedRows = useMemo(() => {
    if (!paginationConfig.enabled) return sortedRows;
    const start = (currentPage - 1) * paginationConfig.rowsPerPage;
    return sortedRows.slice(start, start + paginationConfig.rowsPerPage);
  }, [sortedRows, currentPage, paginationConfig]);

  const totalPages = useMemo(() => {
    if (!paginationConfig.enabled) return 1;
    return Math.max(1, Math.ceil(sortedRows.length / paginationConfig.rowsPerPage));
  }, [sortedRows, paginationConfig]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(true); };
    const handleKeyUp = (e: KeyboardEvent) => { if (e.key === 'Shift') setIsShiftPressed(false); };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => { window.removeEventListener('keydown', handleKeyDown); window.removeEventListener('keyup', handleKeyUp); };
  }, []);

  useEffect(() => {
    const tableContainer = tableContainerRef.current;
    const fixedScroll = fixedScrollRef.current;
    if (!tableContainer || !fixedScroll) return;

    const updateTableWidth = () => {
      const table = tableContainer.querySelector('table');
      if (table) {
        const width = table.scrollWidth;
        setTableWidth(width);
        const scrollContent = fixedScroll.querySelector(`.${styles.fixedHorizontalScrollContent}`);
        if (scrollContent) (scrollContent as HTMLElement).style.width = `${width}px`;
      }
    };

    const handleFixedScroll = () => { tableContainer.scrollLeft = fixedScroll.scrollLeft; };
    const handleTableScroll = () => { if (fixedScroll.scrollLeft !== tableContainer.scrollLeft) fixedScroll.scrollLeft = tableContainer.scrollLeft; };

    fixedScroll.addEventListener('scroll', handleFixedScroll, { passive: true });
    tableContainer.addEventListener('scroll', handleTableScroll, { passive: true });
    const resizeObserver = new ResizeObserver(updateTableWidth);
    resizeObserver.observe(tableContainer);
    updateTableWidth();

    return () => {
      fixedScroll.removeEventListener('scroll', handleFixedScroll);
      tableContainer.removeEventListener('scroll', handleTableScroll);
      resizeObserver.disconnect();
    };
  }, [filteredRows, isLoading, error, paginationConfig]);

  const handleFavoritesClick = useCallback(async () => {
    try { 
      const queries = await getFavoriteQueries(type); 
      setSavedQueries(queries); 
      setIsFavoritesModalOpen(true); 
    } catch (err) { 
      console.error('Ошибка загрузки избранного:', err); 
    }
  }, [type]);
  
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

  const handleSaveNewFavoriteQuery = useCallback(async (name: string, body: string) => {
    if (!type) return;
    try {
      await saveFavoriteQuery(type, name, body);
      const queries = await getFavoriteQueries(type);
      setSavedQueries(queries);
      showToast('Запрос сохранён', 'success');
    } catch (err) {
      console.error('Ошибка сохранения запроса:', err);
      showToast('Не удалось сохранить запрос', 'error');
      throw err;
    }
  }, [type, showToast]);

  const createDefaultColumns = useCallback((fieldTitles: Record<string, string>): ColumnConfig[] =>
    Object.entries(fieldTitles).map(([eng, rus]) => ({ title: rus, accessor: eng, visible: true })), []);

  const mergeColumns = useCallback((savedColumns: ColumnConfig[], defaultColumns: ColumnConfig[]): ColumnConfig[] => {
    if (!savedColumns?.length) return defaultColumns.map(col => ({ ...col }));
    const merged: ColumnConfig[] = [...savedColumns.map(col => ({ ...col }))];
    const savedAccessors = new Set(savedColumns.map(col => col.accessor));
    defaultColumns.forEach(col => { if (!savedAccessors.has(col.accessor)) merged.push({ ...col }); });
    return merged;
  }, []);

  const handleRetry = useCallback(() => setRetryCount(prev => prev + 1), []);

  useEffect(() => {
    const loadData = async () => {
      if (!type) { setIsLoading(false); return; }
      setIsLoading(true); setError(null);
      try {
        const [data, schemaResponse] = await Promise.all([fetchAllObjects(type, { status: statusFilter }), fetchFieldTitlesById(type)]);
        const { objectType, fieldTitles } = schemaResponse;
        setObjectType(objectType);
        const newMap: Record<string, string> = {};
        Object.entries(fieldTitles).forEach(([en, ru]) => { newMap[ru.toLowerCase()] = en; });
        setRuToEnMap(newMap);

        const defaultCols = createDefaultColumns(fieldTitles);
        setDefaultColumns(defaultCols);
        
        const savedConfig = loadTableConfig(type);
        let initialColumns = savedConfig?.length ? mergeColumns(savedConfig, defaultCols) : defaultColumns.map(col => ({ ...col }));

        // ✅ ОБНОВЛЯЕМ ВСЕ НАЗВАНИЯ КОЛОНОК ИЗ АКТУАЛЬНОЙ СХЕМЫ
        initialColumns = updateColumnsWithFieldTitles(initialColumns, fieldTitles);

        initialColumns = addComputedColumns(initialColumns, type);

        // ✅ БЕЗОПАСНЫЙ ПАРСИНГ ДАННЫХ
        const parsedRows: Row[] = (data as FetchObjectItem[]).map(item => {
          let parsed: Record<string, unknown>;
          
          try {
            if (typeof item.value === 'object' && item.value !== null) {
              parsed = item.value as Record<string, unknown>;
            } else if (typeof item.value === 'string') {
              parsed = JSON.parse(item.value);
            } else {
              console.warn('⚠️ Неизвестный формат value:', item.value);
              parsed = {};
            }
          } catch (error) {
            console.error('❌ Ошибка парсинга value:', error, 'для item:', item);
            parsed = {};
          }
          
          const age = calculateAge(String(parsed['date_of_birth'] || ''));
          
          return {
            ...parsed,
            id: item.id,
            status: item.status,
            computed_age: age
          };
        });

        // ✅ ДОБАВЛЯЕМ КОЛОНКИ ДЛЯ ПОЛЕЙ, КОТОРЫХ НЕТ В СХЕМЕ
        const dataKeys = extractKeysFromData(parsedRows);
        initialColumns = addMissingColumnsFromData(initialColumns, dataKeys, fieldTitles);

        const isNarrow = initialColumns.filter(col => col.visible).length <= 12;
        const dynamicDefaultPagination = getDefaultPagination(isNarrow);

        const savedPagination = loadPaginationConfig(type);

        if (savedPagination) {
          setPaginationConfig(savedPagination);
        } else {
          setPaginationConfig(dynamicDefaultPagination);
        }

        console.log('📊 Итоговые колонки:', initialColumns);
        console.log('📋 Первая строка:', parsedRows[0]);
        console.log('📝 fieldTitles:', fieldTitles);

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
      setRows(prev => prev.filter((r: Row) => r.id !== id));
      await deleteObjectById(id);
    } catch (err) { console.error('Ошибка удаления:', err); setRows(prev => [...prev, row]); }
  }, []);
  
  const openDeleteModal = useCallback((id: string, row: Row) => {
    if (isShiftPressed) { performImmediateDelete(id, row); return; }
    setObjectToDelete({ id, row }); setIsDeleteModalOpen(true);
  }, [isShiftPressed, performImmediateDelete]);
  
  const handleConfirmDelete = useCallback(async () => {
    if (!objectToDelete) return;
    try {
      setRows(prev => prev.filter((row: Row) => row.id !== objectToDelete.id));
      await deleteObjectById(objectToDelete.id);
    } catch (err) { console.error('Ошибка удаления:', err); setRows(prev => [...prev, objectToDelete.row]); }
    finally { setIsDeleteModalOpen(false); setObjectToDelete(null); }
  }, [objectToDelete]);
  
  const handleCancelDelete = useCallback(() => { setIsDeleteModalOpen(false); setObjectToDelete(null); }, []);
  
  const handleEdit = useCallback((rowId: string) => { setEditingObjectId(rowId); setIsEditModalOpen(true); }, []);
  
  const closeEditModal = useCallback(() => { setIsEditModalOpen(false); setEditingObjectId(null); }, []);
  
  const handleBackClick = useCallback(() => navigate('/'), [navigate]);
  
  const handleCreateClick = useCallback(() => setIsNewObjectModalOpen(true), []);
  
  const handleGearClick = useCallback(() => setIsModalOpen(true), []);

  const handleApplySettings = useCallback((updatedColumns: ColumnConfig[], pagination?: PaginationConfig) => {
    if (!type) return;
    saveTableConfig(type, updatedColumns); setColumns(updatedColumns);
    if (pagination) { savePaginationConfig(type, pagination); setPaginationConfig(pagination); }
    setIsModalOpen(false);
  }, [type]);

  const handleResetSettings = useCallback(() => {
    const resetColumns = defaultColumns.map(col => ({ ...col }));
    if (type) {
      saveTableConfig(type, resetColumns);
      const isNarrow = resetColumns.filter(col => col.visible).length <= 12;
      const resetPagination = getDefaultPagination(isNarrow);
      savePaginationConfig(type, resetPagination);
      setPaginationConfig(resetPagination);
    }
    return resetColumns;
  }, [defaultColumns, type]);

  const handleColumnOrderChange = useCallback((newColumns: ColumnConfig[]) => {
    if (!type) return;
    saveTableConfig(type, newColumns); setColumns(newColumns);
  }, [type]);

  const ruFields = useMemo(() => {
    const fields = Object.keys(ruToEnMap);
    if (type === 'employee' && !fields.some(f => f.toLowerCase() === 'возраст')) {
      fields.unshift('Возраст');
    }
    return fields;
  }, [ruToEnMap, type]);

  const handleSaveSuccess = useCallback(() => {
    closeEditModal();
    const reloadData = async () => {
      if (!type) return;
      setIsLoading(true); setError(null);
      try {
        const [data, schemaResponse] = await Promise.all([fetchAllObjects(type, { status: statusFilter }), fetchFieldTitlesById(type)]);
        const { objectType, fieldTitles } = schemaResponse;
        setObjectType(objectType);
        const newMap: Record<string, string> = {};
        Object.entries(fieldTitles).forEach(([en, ru]) => { newMap[ru.toLowerCase()] = en; });
        setRuToEnMap(newMap);
        const defaultCols = createDefaultColumns(fieldTitles);
        setDefaultColumns(defaultCols);
        const savedConfig = loadTableConfig(type);
        let initialColumns = savedConfig?.length ? mergeColumns(savedConfig, defaultCols) : defaultColumns.map(col => ({ ...col }));
        
        initialColumns = updateColumnsWithFieldTitles(initialColumns, fieldTitles);
        initialColumns = addComputedColumns(initialColumns, type);
        
        const parsedRows: Row[] = (data as FetchObjectItem[]).map(item => {
          let parsed: Record<string, unknown>;
          
          try {
            if (typeof item.value === 'object' && item.value !== null) {
              parsed = item.value as Record<string, unknown>;
            } else if (typeof item.value === 'string') {
              parsed = JSON.parse(item.value);
            } else {
              parsed = {};
            }
          } catch (error) {
            parsed = {};
          }
          
          const age = calculateAge(String(parsed['date_of_birth'] || ''));
          
          return {
            ...parsed,
            id: item.id,
            status: item.status,
            computed_age: age
          };
        });

        const dataKeys = extractKeysFromData(parsedRows);
        initialColumns = addMissingColumnsFromData(initialColumns, dataKeys, fieldTitles);

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

  const isEmptyState = !isLoading && !error && filteredRows.length === 0;
  const isEmptyDueToSearch = isEmptyState && searchTerm.trim() !== '';

  return (
    <div className={styles.pageContainer}>
      <div className={styles.toolbarWrapper}>
        <TableHeaderToolbar
          objectType={objectType} type={type} searchTerm={searchTerm} onSearchChange={setSearchTerm}
          onBackClick={handleBackClick} onCreateClick={handleCreateClick} onGearClick={handleGearClick}
          onFavoritesClick={handleFavoritesClick}
          ruFields={ruFields} rowsData={rows} ruToEnMap={ruToEnMap} statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter} filteredRowsCount={filteredRows.length}
          error={error != null || isLoading} currentPage={currentPage} totalPages={totalPages}
          onPageChange={setCurrentPage} itemsPerPage={paginationConfig.enabled ? paginationConfig.rowsPerPage : sortedRows.length}
          totalItems={sortedRows.length} paginationEnabled={paginationConfig.enabled}
          savedQueries={savedQueries.map(q => ({ name: q.name, body: q.body }))}
        />
      </div>

      <main className={styles.contentLayout}>
        <div className={styles.tableScrollContainer} ref={tableContainerRef}>
          {isLoading ? (
            <div className={styles.loadingContainer}>
              <div className={styles.spinner} /><div className={styles.loadingText}>Загрузка данных...</div>
            </div>
          ) : error ? (
            <div className={styles.errorContainer}>
              <div className={styles.errorIcon}>⚠️</div>
              <h3 className={styles.errorTitle}>Не удалось загрузить данные</h3>
              <p className={styles.errorMessage}>{error}</p>
              <FilledColorButton onClick={handleRetry}>Повторить попытку</FilledColorButton>
            </div>
          ) : isEmptyState ? (
            <div className={styles.emptyState}>
              <div className={styles.emptyIcon}>{isEmptyDueToSearch ? '🔍' : '📄'}</div>
              <h3 className={styles.emptyTitle}>{isEmptyDueToSearch ? 'Ничего не найдено' : 'Здесь пока пусто'}</h3>
              <p className={styles.emptyDescription}>
                {isEmptyDueToSearch ? 'Попробуйте изменить условия поиска или сбросить фильтры' : `В этом разделе ещё нет записей`}
              </p>
            </div>
          ) : (
            <ObjectTableComponent
              rows={paginatedRows} columns={columns} onEdit={handleEdit} onDelete={openDeleteModal}
              onRestore={openRestoreModal} onColumnOrderChange={handleColumnOrderChange}
              onBrokenRefClick={handleBrokenRefClick} sortColumn={sortColumn} sortDirection={sortDirection}
              onSort={(accessor: string) => {
                if (sortColumn === accessor) setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                else { setSortColumn(accessor); setSortDirection('asc'); }
              }}
              paginationEnabled={paginationConfig.enabled}
              tableType={type}
            />
          )}
        </div>
      </main>

      {!isLoading && !error && filteredRows.length > 0 && (
        <div className={styles.fixedHorizontalScroll} ref={fixedScrollRef}>
          <div className={styles.fixedHorizontalScrollContent} style={{ width: `${tableWidth}px` }} />
        </div>
      )}

      {isDeleteModalOpen && ReactDOM.createPortal(<DeleteConfirmationModal preview="Вы уверены, что хотите удалить этот объект?" onConfirm={handleConfirmDelete} onCancel={handleCancelDelete} />, document.getElementById('modal-root')!)}
      {isModalOpen && ReactDOM.createPortal(<ColumnSettingsModal initialColumns={columns} defaultColumns={defaultColumns} initialPagination={paginationConfig} onApply={handleApplySettings} onReset={handleResetSettings} onCancel={() => setIsModalOpen(false)} />, document.getElementById('modal-root')!)}
      
      {isFavoritesModalOpen && ReactDOM.createPortal(
        <FavoritesModal 
          isOpen={isFavoritesModalOpen} 
          onClose={() => setIsFavoritesModalOpen(false)} 
          favorites={savedQueries} 
          onSelect={handleSelectFavoriteQuery} 
          onDelete={handleDeleteFavoriteQuery} 
          onUpdate={handleUpdateFavoriteQuery}
          title={objectType} 
          type={type}
          currentQuery={searchTerm}
          onSaveNewQuery={handleSaveNewFavoriteQuery}
        />, 
        document.getElementById('modal-root')!
      )}
      
      {isEditModalOpen && type && editingObjectId && <ObjectEditModal isOpen={isEditModalOpen} onClose={closeEditModal} type={type} id={editingObjectId} onSaveSuccess={handleSaveSuccess} title="Редактирование объекта" isDeadObject={rows.find(r => r.id === editingObjectId)?.status === false} />}
      {isNewObjectModalOpen && type && <ObjectEditModal isOpen={isNewObjectModalOpen} onClose={() => setIsNewObjectModalOpen(false)} type={type} onSaveSuccess={handleSaveSuccess} title="Создание нового объекта" />}
      {isRestoreModalOpen && ReactDOM.createPortal(<RestoreConfirmationModal onConfirm={handleConfirmRestore} onCancel={handleCancelRestore} />, document.getElementById('modal-root')!)}
      
      {toast && <div className={`${styles.toast} ${styles[toast.type]}`}><span className={styles.toastIcon}>{toast.type === 'success' ? '✓' : '✕'}</span><span className={styles.toastMessage}>{toast.message}</span></div>}
    </div>
  );
};

export default ObjectsTablePage;