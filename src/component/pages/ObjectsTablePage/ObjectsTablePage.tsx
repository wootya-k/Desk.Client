import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactDOM from 'react-dom';
import ObjectEditModal from './ObjectEditModal/ObjectEditModal';
import ObjectTableComponent from './ObjectsTableComponent/ObjectsTableComponent';
import ColumnSettingsModal from './ColumnSettingsModal/ColumnSettingsModal';
import TableHeaderToolbar from './TableHeaderToolbar/TableHeaderToolbar';
import { fetchAllObjects, deleteObjectById } from '@services/ObjectService';
import { fetchFieldTitlesById } from '@services/TableService';
import DeleteConfirmationModal from '@shared/DeleteConfirmationModal/DeleteConfirmationModal';
import FavoritesModal from './FavoritesModal/FavoritesModal';
import { getFavoriteQueries, saveFavoriteQuery, deleteFavoriteQuery, SavedQuery } from '@services/QueryService';
import {
  parseSearchQuery,
  checkRowAgainstConditionGroups,
} from 'utils/searchUtils';
import { setExpiringItem, getExpiringItem } from 'utils/LocalStorageUtils';
import styles from './ObjectsTablePage.module.css';

interface FetchObjectItem {
  id: string;
  value: string;
}

export interface Row extends Record<string, unknown> {
  id: string;
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
  try {
    const existingConfigStr = localStorage.getItem(TABLE_CONFIG_KEY);
    const existingConfig: TableConfig = existingConfigStr ? JSON.parse(existingConfigStr) : {};
    
    existingConfig[tableType] = columns;
    
    localStorage.setItem(TABLE_CONFIG_KEY, JSON.stringify(existingConfig));
    
    // Дублируем в куки для совместимости
    setExpiringItem(`columnsConfig_${tableType}`, JSON.stringify(columns), 365);
    
    console.log(`💾 Конфигурация сохранена для ${tableType}:`, columns.length, 'колонок');
  } catch (error) {
    console.error('❌ Ошибка сохранения конфигурации:', error);
  }
};

const loadTableConfig = (tableType: string): ColumnConfig[] | null => {
  try {
    // Сначала пробуем localStorage
    const configStr = localStorage.getItem(TABLE_CONFIG_KEY);
    if (configStr) {
      const config: TableConfig = JSON.parse(configStr);
      if (config[tableType]) {
        console.log(`📂 Конфигурация загружена из localStorage для ${tableType}`);
        return config[tableType];
      }
    }
    
    // Потом пробуем куки для обратной совместимости
    const cookieConfig = getExpiringItem(`columnsConfig_${tableType}`);
    if (cookieConfig) {
      const columns = JSON.parse(cookieConfig);
      console.log(`📂 Конфигурация загружена из куки для ${tableType}`);
      return columns;
    }
    
    console.log(`❌ Конфигурация не найдена для ${tableType}`);
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

  // === ОТЛАДОЧНЫЕ ЛОГИ ===
  useEffect(() => {
    console.group(`🔧 ObjectsTablePage Debug - ${type}`);
    console.log('📊 Columns state:', columns);
    console.log('📋 Default columns:', defaultColumns);
    console.log('🔍 Type:', type);
    console.groupEnd();
  }, [columns, defaultColumns, type]);

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
  }, [filteredRows]);

  const handleFavoritesClick = useCallback(async () => {
    try {
      const queries = await getFavoriteQueries();
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
      console.log('Запрос удалён из избранного');
    } catch (err) {
      console.error('Ошибка удаления запроса:', err);
    }
  }, []);

  const handleSaveClick = useCallback(async () => {
    if (!searchTerm.trim()) {
      console.log('Нельзя сохранить пустой поисковый запрос');
      return;
    }
    try {
      await saveFavoriteQuery(searchTerm);
      console.log('Поисковый запрос успешно сохранён в избранное!');
    } catch (err) {
      console.error('Ошибка сохранения запроса:', err);
    }
  }, [searchTerm]);

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
        console.log('🔄 Используем колонки по умолчанию');
        return defaultColumns.map(col => ({ ...col }));
      }

      console.log('🔄 Объединяем сохраненные колонки с дефолтными');
      
      const mergedColumns: ColumnConfig[] = [];
      const savedAccessors = new Set(savedColumns.map(col => col.accessor));
      
      // Добавляем сохраненные колонки
      mergedColumns.push(...savedColumns.map(col => ({ ...col })));
      
      // Добавляем недостающие колонки из дефолтных
      defaultColumns.forEach(defaultCol => {
        if (!savedAccessors.has(defaultCol.accessor)) {
          mergedColumns.push({ ...defaultCol });
        }
      });
      
      return mergedColumns;
    },
    []
  );

  useEffect(() => {
    const loadData = async () => {
      if (!type) {
        console.log('❌ Type не определён, пропускаем загрузку');
        return;
      }
      
      console.log(`🔄 Загрузка данных для типа: ${type}`);
      
      try {
        const [data, schemaResponse] = await Promise.all([
          fetchAllObjects(type),
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
        
        // Загружаем сохраненную конфигурацию
        const savedConfig = loadTableConfig(type);
        let initialColumns: ColumnConfig[];
        
        if (savedConfig && savedConfig.length > 0) {
          console.log('✅ Используем сохраненную конфигурацию колонок');
          initialColumns = mergeColumns(savedConfig, defaultCols);
        } else {
          console.log('ℹ️ Используем колонки по умолчанию');
          initialColumns = defaultCols.map(col => ({ ...col }));
        }
        
        const parsedRows: Row[] = (data as FetchObjectItem[]).map((item) => {
          const obj = JSON.parse(item.value);
          return { ...obj, id: item.id };
        });
        
        setColumns(initialColumns);
        setRows(parsedRows);
        
        console.log('✅ Данные успешно загружены:', {
          objectType,
          columnsCount: initialColumns.length,
          rowsCount: parsedRows.length,
          hasSavedConfig: !!savedConfig
        });
        
      } catch (err) {
        console.error('❌ Ошибка загрузки:', err);
      }
    };
    
    loadData();
  }, [type, createDefaultColumns, mergeColumns]);

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

  // === ИСПРАВЛЕННЫЙ ОБРАБОТЧИК ПРИМЕНЕНИЯ НАСТРОЕК ===
  const handleApplySettings = useCallback((updatedColumns: ColumnConfig[]) => {
    if (!type) {
      console.error('❌ Не удалось сохранить конфигурацию: type не определён');
      return;
    }
    
    console.log('💾 Применение настроек колонок:', updatedColumns);
    
    // Сохраняем конфигурацию
    saveTableConfig(type, updatedColumns);
    
    // Обновляем состояние
    setColumns(updatedColumns);
    setIsModalOpen(false);
    
    console.log('✅ Настройки успешно применены и сохранены');
  }, [type]);

  const handleResetSettings = useCallback(() => {
    console.log('🔄 Сброс настроек к значениям по умолчанию');
    const resetColumns = defaultColumns.map(col => ({ ...col }));
    
    // Сохраняем сброшенные настройки
    if (type) {
      saveTableConfig(type, resetColumns);
    }
    
    return resetColumns;
  }, [defaultColumns, type]);

  // === ИСПРАВЛЕННЫЙ ОБРАБОТЧИК ИЗМЕНЕНИЯ ПОРЯДКА КОЛОНОК ===
  const handleColumnOrderChange = useCallback((newColumns: ColumnConfig[]) => {
    console.log('🔄 Изменение порядка колонок через D&D:', newColumns);
    
    if (!type) {
      console.error('❌ Не удалось сохранить порядок колонок: type не определён');
      return;
    }
    
    // Сохраняем новую конфигурацию
    saveTableConfig(type, newColumns);
    
    // Обновляем состояние
    setColumns(newColumns);
    
    console.log('✅ Порядок колонок успешно сохранен');
  }, [type]);

  const conditionGroups = useMemo(() => parseSearchQuery(searchTerm.trim().toLowerCase()), [searchTerm]);
  const isSaveDisabled = !(conditionGroups.length > 0 && filteredRows.length > 0);
  const ruFields = useMemo(() => Object.keys(ruToEnMap), [ruToEnMap]);

  const handleSaveSuccess = useCallback(() => {
    closeEditModal();
    const reloadData = async () => {
      if (!type) return;
      try {
        const [data, schemaResponse] = await Promise.all([
          fetchAllObjects(type),
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
        
        // Загружаем сохраненную конфигурацию
        const savedConfig = loadTableConfig(type);
        let initialColumns: ColumnConfig[];
        
        if (savedConfig && savedConfig.length > 0) {
          initialColumns = mergeColumns(savedConfig, defaultCols);
        } else {
          initialColumns = defaultCols.map(col => ({ ...col }));
        }
        
        const parsedRows: Row[] = (data as FetchObjectItem[]).map((item) => {
          const obj = JSON.parse(item.value);
          return { ...obj, id: item.id };
        });
        
        setColumns(initialColumns);
        setRows(parsedRows);
      } catch (err) {
        console.error('Ошибка перезагрузки данных:', err);
      }
    };
    reloadData();
  }, [type, closeEditModal, createDefaultColumns, mergeColumns]);

  const hasOpenModal = 
    isNewObjectModalOpen ||
    isEditModalOpen ||
    isModalOpen ||
    isDeleteModalOpen ||
    isFavoritesModalOpen;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !hasOpenModal) {
        handleBackClick();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [hasOpenModal, handleBackClick]);

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
      />
      <main className={styles.contentLayout} ref={tableContainerRef}>
        <ObjectTableComponent
          rows={filteredRows}
          columns={columns}
          onEdit={handleEdit}
          onDelete={openDeleteModal}
          onColumnOrderChange={handleColumnOrderChange}
        />
        {hasVerticalScroll && (
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
            title="Избранное"
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
    </div>
  );
};

export default ObjectsTablePage;