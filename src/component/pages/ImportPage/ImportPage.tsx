import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import {
    previewImport,
    confirmImport,
    ImportPreviewResponse,
    ImportResult,
} from '@services/ImportService';
import { fetchFieldTitlesById } from '@services/TableService';
import AutocompleteInput from '../ObjectsTablePage/TableHeaderToolbar/AutocompleteInput/AutocompleteInput';
import { parseSearchQuery, checkRowAgainstConditionGroups } from 'utils/searchUtils';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import styles from './ImportPage.module.css';

type TabType = 'employees' | 'candidates' | 'subdivisions';

const ImportPage: React.FC = () => {
    const [file, setFile] = useState<File | null>(null);
    const [preview, setPreview] = useState<ImportPreviewResponse | null>(null);
    const [activeTab, setActiveTab] = useState<TabType>('employees');
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);
    const [isLoadingConfirm, setIsLoadingConfirm] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<ImportResult | null>(null);
    const [schemas, setSchemas] = useState<Record<string, { objectType: string; fieldTitles: Record<string, string> }>>({});
    const [searchTerm, setSearchTerm] = useState('');
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
    const [isDragActive, setIsDragActive] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);
    const dropZoneRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!preview) return;

        const fetchAndSet = async (type: string) => {
            try {
                const schema = await fetchFieldTitlesById(type);
                setSchemas(prev => prev[type] ? prev : { ...prev, [type]: schema });
            } catch (err) {
                console.error(`Не удалось загрузить схему для ${type}:`, err);
            }
        };

        if (preview.employees.length > 0) fetchAndSet('employee');
        if (preview.candidates.length > 0) fetchAndSet('candidate');
        if (preview.subdivisions.length > 0) fetchAndSet('subdivision');
    }, [preview]);

    const handleDragEnter = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragActive(true);
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
        if (dropZoneRef.current && !dropZoneRef.current.contains(e.relatedTarget as Node)) {
            setIsDragActive(false);
        }
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation();
    }, []);

    const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault(); e.stopPropagation(); setIsDragActive(false);
        const droppedFiles = e.dataTransfer?.files;
        if (droppedFiles && droppedFiles.length > 0) handleFile(droppedFiles[0]);
    }, []);

    const handleFile = (selectedFile: File) => {
        const ext = selectedFile.name.split('.').pop()?.toLowerCase();
        if (ext !== 'xlsx' && ext !== 'xls') {
            setError('Поддерживаются только файлы .xls и .xlsx');
            return;
        }

        setFile(selectedFile);
        setError(null);
        setResult(null);
        setPreview(null);
        setSchemas({});
        setSearchTerm('');
        setSortColumn(null);
        setIsLoadingPreview(true);

        previewImport(selectedFile)
            .then(data => {
                setPreview(data);
                if (data.employees.length > 0) setActiveTab('employees');
                else if (data.candidates.length > 0) setActiveTab('candidates');
                else if (data.subdivisions.length > 0) setActiveTab('subdivisions');
            })
            .catch(err => {
                setError(err instanceof Error ? err.message : 'Ошибка при загрузке файла');
            })
            .finally(() => {
                setIsLoadingPreview(false);
            });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) handleFile(selectedFile);
    };

    const handleConfirm = async () => {
        if (!preview) return;
        setIsLoadingConfirm(true);
        setError(null);
        setResult(null);

        try {
            const request = {
                employees: preview.employees,
                candidates: preview.candidates,
                subdivisions: preview.subdivisions,
            };
            const res = await confirmImport(request);
            setResult(res);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Ошибка при подтверждении импорта');
        } finally {
            setIsLoadingConfirm(false);
        }
    };

    const getSchemaType = (tab: TabType) => {
        switch (tab) {
            case 'employees': return 'employee';
            case 'candidates': return 'candidate';
            case 'subdivisions': return 'subdivision';
        }
    };

    const handleTabChange = (tab: TabType) => {
        setActiveTab(tab);
        setSearchTerm('');
        setSortColumn(null);
        setSortDirection('asc');
    };

    const currentData = useMemo(() => preview ? preview[activeTab] : [], [preview, activeTab]);
    const currentSchema = schemas[getSchemaType(activeTab)];

    // 🔥 КЛЮЧЕВОЕ ИСПРАВЛЕНИЕ: AutocompleteInput ожидает АНГЛИЙСКИЕ ключи в rowsData
    // Компонент сам делает маппинг через ruToEnMap внутри fieldValuesCache
    const autocompleteRowsData = useMemo(() => {
        return currentData.map(item => item.data);
    }, [currentData]);

    const ruFields = useMemo(() => {
        if (!currentSchema) return [];
        return Object.values(currentSchema.fieldTitles).map(f => f.charAt(0).toUpperCase() + f.slice(1));
    }, [currentSchema]);

    const ruToEnMap = useMemo(() => {
        if (!currentSchema) return {};
        return Object.entries(currentSchema.fieldTitles).reduce((acc, [en, ru]) => {
            acc[ru.toLowerCase()] = en;
            return acc;
        }, {} as Record<string, string>);
    }, [currentSchema]);

    const columns = useMemo(() => {
        if (currentData.length === 0) return [];
        const keysSet = new Set<string>();
        currentData.forEach(item => Object.keys(item.data).forEach(key => keysSet.add(key)));
        return Array.from(keysSet);
    }, [currentData]);

    const processedData = useMemo(() => {
        let result = [...currentData];

        const raw = searchTerm.trim();
        if (raw) {
            try {
                const groups = parseSearchQuery(raw.toLowerCase());
                if (groups.length) {
                    result = result.filter(item => checkRowAgainstConditionGroups(item.data, groups, ruToEnMap));
                } else {
                    result = result.filter(item =>
                        Object.values(item.data).some(val => String(val ?? '').toLowerCase().includes(raw.toLowerCase()))
                    );
                }
            } catch (e) {
                result = result.filter(item =>
                    Object.values(item.data).some(val => String(val ?? '').toLowerCase().includes(raw.toLowerCase()))
                );
            }
        }

        if (sortColumn) {
            result.sort((a, b) => {
                const aVal = a.data[sortColumn];
                const bVal = b.data[sortColumn];
                if (aVal == null && bVal == null) return 0;
                if (aVal == null) return sortDirection === 'asc' ? 1 : -1;
                if (bVal == null) return sortDirection === 'asc' ? -1 : 1;
                const aStr = String(aVal), bStr = String(bVal);
                return sortDirection === 'asc'
                    ? aStr.localeCompare(bStr, 'ru', { numeric: true })
                    : bStr.localeCompare(aStr, 'ru', { numeric: true });
            });
        }

        return result;
    }, [currentData, searchTerm, sortColumn, sortDirection, ruToEnMap]);

    const handleSort = (accessor: string) => {
        if (sortColumn === accessor) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortColumn(accessor);
            setSortDirection('asc');
        }
    };

    const getTabLabel = (tab: TabType) => {
        if (!preview) return '';
        switch (tab) {
            case 'employees': return `Сотрудники (${preview.employees.length})`;
            case 'candidates': return `Кандидаты (${preview.candidates.length})`;
            case 'subdivisions': return `Подразделения (${preview.subdivisions.length})`;
        }
    };

    // 🔥 Форматирование значений ячеек: даты + boolean
    const renderCellValue = (value: unknown) => {
        if (value === null || value === undefined || (typeof value === 'string' && value.trim() === '')) {
            return '';
        }
        if (typeof value === 'boolean') {
            return (
                <div className={styles.booleanContainer}>
                    <span className={value ? styles.booleanTrue : styles.booleanFalse}>
                        {value ? '✓' : '✕'}
                    </span>
                </div>
            );
        }
        if (typeof value === 'string') {
            // Формат даты: YYYY-MM-DD или YYYY-MM-DDTHH:mm:ss
            const dateMatch = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
            if (dateMatch) {
                return `${dateMatch[3]}.${dateMatch[2]}.${dateMatch[1]}`;
            }
        }
        return String(value);
    };

    const renderTable = () => {
        if (processedData.length === 0) {
            return <div className={styles.emptyTable}>Нет данных для отображения{searchTerm ? ' по вашему запросу' : ''}</div>;
        }

        return (
            <div className={styles.tableContainer}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.headerCell}>Статус</th>
                            <th className={styles.headerCell}>Лист</th>
                            <th className={styles.headerCell}>Строка</th>
                            {columns.map(col => (
                                <th
                                    key={col}
                                    className={styles.headerCell}
                                    onClick={() => handleSort(col)}
                                >
                                    <div className={styles.headerContent}>
                                        <span>{currentSchema?.fieldTitles[col] || col}</span>
                                        {sortColumn === col && (
                                            <span className={styles.sortIndicator}>
                                                {sortDirection === 'asc' ? '▲' : '▼'}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {processedData.map((item, idx) => (
                            <tr key={idx} className={`${styles.row} ${!item.isValid ? styles.rowInvalid : ''}`}>
                                <td className={styles.cell}>
                                    {item.isValid ? (
                                        <span className={styles.statusValid} title="Валидно">✓</span>
                                    ) : (
                                        <span className={styles.statusInvalid} title={item.validationErrors.join('\n')}>✕</span>
                                    )}
                                </td>
                                <td className={styles.cell}>{item.sheetName}</td>
                                <td className={styles.cell}>{item.rowIndex}</td>
                                {columns.map(col => (
                                    <td key={col} className={styles.cell} title={String(item.data[col] ?? '')}>
                                        {renderCellValue(item.data[col])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className={styles.pageContainer}>
            {/* 🔥 Шапка: заголовок и счётчик на одной линии */}
            <div className={styles.header}>
                <h1 className={styles.title}>Импорт данных из Excel</h1>
                {preview && !result && (
                    <div className={styles.summaryInline}>
                        Корректных строк для импорта: <strong className={styles.highlightGreen}>{preview.validRows}</strong><strong className={styles.highlightMain}>/{preview.totalRows}</strong>
                    </div>
                )}
            </div>

            {!preview && (
                <div
                    ref={dropZoneRef}
                    className={`${styles.dropZone} ${isDragActive ? styles.dropZoneActive : ''}`}
                    onDragEnter={handleDragEnter}
                    onDragLeave={handleDragLeave}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                >
                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        accept=".xls,.xlsx"
                        className={styles.fileInput}
                        disabled={isLoadingPreview}
                    />

                    <div className={styles.dropZoneContent}>
                        <div className={styles.dropIcon}>📁</div>
                        <h3 className={styles.dropTitle}>
                            {isDragActive ? 'Отпустите файл здесь' : 'Перетащите файл в область или щёлкните, чтобы открыть проводник'}
                        </h3>
                        <p className={styles.dropHint}>xls  •  xlsx</p>
                    </div>
                </div>
            )}

            {error && <div className={styles.errorMessage}>{error}</div>}

            {result && (
                <div className={styles.resultSection}>
                    {result.errors && result.errors.length > 0 ? (
                        <div className={styles.resultError}>
                            <h3>⚠️ Импорт завершен с ошибками:</h3>
                            <ul>
                                {result.errors.map((err, idx) => (
                                    <li key={idx}>{err.message || JSON.stringify(err)}</li>
                                ))}
                            </ul>
                        </div>
                    ) : (
                        <div className={styles.resultSuccess}>
                            <h3>✅ Данные успешно импортированы в базу!</h3>
                        </div>
                    )}
                </div>
            )}

            {preview && !result && (
                <>
                    <div className={styles.controlRow}>
                        <div className={styles.searchWrapper}>
                            <AutocompleteInput
                                value={searchTerm}
                                onChange={setSearchTerm}
                                placeholder="Поиск по таблице..."
                                ruFields={ruFields}
                                rowsData={autocompleteRowsData}
                                ruToEnMap={ruToEnMap}
                                resultsCount={processedData.length}
                                width="100%"
                                minWidth="300px"
                            />
                        </div>
                        <div className={styles.actions}>
                            <span className={styles.fileNameLarge}>
                                {file?.name}
                            </span>
                            <FilledColorButton
                                onClick={() => fileInputRef.current?.click()}
                            >
                                Другой файл
                            </FilledColorButton>
                            <FilledColorButton
                                onClick={handleConfirm}
                                disabled={isLoadingConfirm || preview.validRows === 0}
                                mainColor="#ffffff"
                                additionalColor="#f39c12"
                            >
                                {isLoadingConfirm ? 'Сохранение...' : 'Импортировать'}
                            </FilledColorButton>
                        </div>
                    </div>

                    <div className={styles.tabs}>
                        {(['employees', 'candidates', 'subdivisions'] as TabType[]).map(tab => (
                            <button
                                key={tab}
                                className={`${styles.tab} ${activeTab === tab ? styles.tabActive : ''}`}
                                onClick={() => handleTabChange(tab)}
                                disabled={preview[tab].length === 0}
                            >
                                {getTabLabel(tab)}
                            </button>
                        ))}
                    </div>

                    {renderTable()}
                </>
            )}
        </div>
    );
};

export default ImportPage;