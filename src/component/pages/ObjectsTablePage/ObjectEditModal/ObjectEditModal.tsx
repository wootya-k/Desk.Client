// components/ObjectEditModal/ObjectEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ObjectEditForm from './ObjectEditForm/ObjectEditForm';
import styles from './ObjectEditModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import PrintOptionsModal from './PrintOptionsModal/PrintOptionsModal';
import UnsavedChangesModal from './UnsavedChangesModal/UnsavedChangesModal';
import DeleteConfirmationModal from '@shared/DeleteConfirmationModal/DeleteConfirmationModal';
import ReportTemplateSelectorModal from '@commons/ReportTemplateSelectorModal/ReportTemplateSelectorModal';
import {
    fetchDetailEntityById,
    fetchDetailEntityByType
} from '@services/DetailService';
import {
    updateObject,
    createObject,
    fetchHistoryById,
    ChangeHistory,
    deleteObjectById,
    ValidationException
} from '@services/ObjectService';
import { checkPrintable, generateReport } from '@services/ReportServices';
import { getExpiringItem, setExpiringItem, removeItem } from 'utils/LocalStorageUtils';
import { useNavigate } from 'react-router-dom';
import { getTransforms, TransformEntity, TransformType } from '@services/TransformService';
import { getObjectTypesMap, getObjectTypeNameById } from '@services/ObjectTypeService';
import { ErrorObject } from 'ajv';

// ============================================================================
// Утилита: конвертация серверных ошибок в формат AJV для JsonForms
// ============================================================================
const convertServerErrorsToAjv = (
    serverErrors: Record<string, string[]>
): ErrorObject[] => {
    return Object.entries(serverErrors).flatMap(([instancePath, messages]) => {
        return messages.map((message): ErrorObject => {
            let keyword: string = 'custom';
            let params: Record<string, unknown> = {};

            if (message.includes('перечислении') || message.includes('enum')) {
                keyword = 'enum';
                params = { allowedValues: [] };
            } else if (message.includes('null') && message.includes('string')) {
                keyword = 'type';
                params = { type: 'string' };
            } else if (message.includes('null') && message.includes('number')) {
                keyword = 'type';
                params = { type: 'number' };
            } else if (message.includes('обязательно') || message.includes('required')) {
                keyword = 'required';
                params = { missingProperty: instancePath.replace(/^\//, '') };
            } else if (message.includes('минимум') || message.includes('minimum')) {
                keyword = 'minimum';
                params = { limit: 0 };
            } else if (message.includes('максимум') || message.includes('maximum')) {
                keyword = 'maximum';
                params = { limit: 100 };
            } else if (message.includes('формат') || message.includes('pattern')) {
                keyword = 'pattern';
                params = { pattern: '' };
            }

            return {
                instancePath,
                schemaPath: `#/${keyword}`,
                keyword,
                message,
                params,
            };
        });
    });
};

// ============================================================================
// Интерфейсы
// ============================================================================
interface ObjectEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: string;
    id?: string;
    title?: string;
    onSaveSuccess?: () => void;
    isDeadObject?: boolean;
}

type FormData = Record<string, unknown>;

// ============================================================================
// Компонент
// ============================================================================
const ObjectEditModal: React.FC<ObjectEditModalProps> = ({
    isOpen,
    onClose,
    type,
    id,
    title,
    onSaveSuccess,
    isDeadObject: externalIsDeadObject = false,
}) => {
    const [formEntity, setFormEntity] = useState<any>(null);
    const [formData, setFormData] = useState<FormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isPrintable, setIsPrintable] = useState(false);
    const [hasTransformsForType, setHasTransformsForType] = useState<boolean | null>(null);
    const [history, setHistory] = useState<ChangeHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);
    const [isTemplateSelectorOpen, setIsTemplateSelectorOpen] = useState(false);
    const [originalData, setOriginalData] = useState<FormData | null>(null);
    const [showEdictsModal, setShowEdictsModal] = useState(false);
    const [transforms, setTransforms] = useState<TransformEntity[]>([]);
    const [edictsLoading, setEdictsLoading] = useState(false);
    const [edictsError, setEdictsError] = useState<string | null>(null);
    const [objectTypesMap, setObjectTypesMap] = useState<Record<string, string>>({});
    const [currentType, setCurrentType] = useState<string>(type);

    // ✅ Состояние для мёртвого объекта и хард-удаления
    const [isDeadObject, setIsDeadObject] = useState(externalIsDeadObject);
    const [isHardDeleteModalOpen, setIsHardDeleteModalOpen] = useState(false);

    // ✅ Состояние для серверных ошибок валидации (AJV format)
    const [serverValidationErrors, setServerValidationErrors] = useState<ErrorObject[]>([]);

    const cookieKey = id ? `currentVersion_${type}_${id}` : `currentVersion_${type}_new`;
    const navigate = useNavigate();

    const [showJsonPreview, setShowJsonPreview] = useState(false);
    const [jsonCopied, setJsonCopied] = useState(false);


    const toggleJsonPreview = useCallback((): void => {
        setShowJsonPreview(prev => !prev);
    }, []);

    // ✅ Копирование JSON в буфер обмена
    const handleCopyJson = useCallback(async (): Promise<void> => {
        if (!formData) return;
        try {
            await navigator.clipboard.writeText(JSON.stringify(formData, null, 2));
            setJsonCopied(true);
            setTimeout(() => setJsonCopied(false), 2000);
        } catch (err) {
            console.error('Не удалось скопировать JSON:', err);
        }
    }, [formData]);

    const transformsCache = new Map<string, TransformEntity[]>();

    const loadTransformsForType = async (objectType: string): Promise<boolean> => {
        if (transformsCache.has(objectType)) {
            const cached = transformsCache.get(objectType)!;
            return cached.length > 0;
        }

        try {
            const data = await getTransforms(objectType as TransformType, undefined, true);
            transformsCache.set(objectType, data);
            return data.length > 0;
        } catch (err) {
            console.error(`Ошибка загрузки трансформов для типа ${objectType}:`, err);
            return false;
        }
    };

    const loadTransforms = async () => {
        setEdictsLoading(true);
        setEdictsError(null);
        try {
            const data = await getTransforms(type);
            setTransforms(data);
        } catch (err) {
            console.error('Ошибка загрузки трансформов:', err);
            setEdictsError('Не удалось загрузить действия');
        } finally {
            setEdictsLoading(false);
        }
    };

    const loadObjectTypes = async () => {
        try {
            const map = await getObjectTypesMap();
            setObjectTypesMap(map);
        } catch (err) {
            console.error('Ошибка загрузки типов объектов:', err);
        }
    };

    const handleEdictsClick = useCallback((): void => {
        if (!type) {
            console.warn('Тип объекта не указан');
            return;
        }

        if (showEdictsModal) {
            setShowEdictsModal(false);
            return;
        }

        setShowEdictsModal(true);
        loadTransforms();
        loadObjectTypes();
    }, [type, showEdictsModal]);

    const hasUnsavedChanges = useCallback((): boolean => {
        if (!originalData || !formData) return false;
        return JSON.stringify(formData) !== JSON.stringify(originalData);
    }, [formData, originalData]);

    const saveCurrentSession = useCallback((data: FormData): void => {
        setExpiringItem(cookieKey, JSON.stringify(data), 1);
    }, [cookieKey]);

    const clearCurrentSession = useCallback((): void => {
        removeItem(cookieKey);
    }, [cookieKey]);

    const restoreFromSession = useCallback((): FormData | null => {
        const cached = getExpiringItem(cookieKey);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('Ошибка восстановления из сессии:', e);
                clearCurrentSession();
            }
        }
        return null;
    }, [cookieKey, clearCurrentSession]);

    const handleRestoreOriginal = (): void => {
        const sessionData = restoreFromSession();
        if (sessionData) {
            setFormData(sessionData);
        }
    };

    useEffect(() => {
        setIsDeadObject(externalIsDeadObject);
    }, [externalIsDeadObject]);

    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async (): Promise<void> => {
            setIsLoading(true);
            setError(false);
            setIsPrintable(false);
            setHasTransformsForType(null);
            setServerValidationErrors([]); // ✅ Сброс ошибок при открытии

            try {
                let entity: any;
                let entityType = type;

                if (id) {
                    entity = await fetchDetailEntityById(id);
                    entityType = entity.type;
                } else {
                    entity = await fetchDetailEntityByType(type);
                }

                if (entityType) {
                    loadTransformsForType(entityType).then(setHasTransformsForType);
                }

                const sessionData = restoreFromSession();
                const initialData = sessionData || entity.data;

                setOriginalData(entity.data);
                setFormData(initialData);
                setFormEntity(entity);

                if (sessionData) {
                    saveCurrentSession(sessionData);
                } else if (!id) {
                    saveCurrentSession(entity.data);
                }

                if (id) {
                    try {
                        const printable = await checkPrintable(entityType);
                        setIsPrintable(printable);
                    } catch (err) {
                        console.error('Ошибка при проверке печати:', err);
                        setIsPrintable(false);
                    }
                }
            } catch (err) {
                console.error('Ошибка при получении FormEntity:', err);
                setError(true);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [isOpen, id, type, restoreFromSession, saveCurrentSession]);

    useEffect(() => {
        if (!isOpen) {
            setHistory([]);
            setShowHistory(false);
            setIsPrintable(false);
            setShowUnsavedModal(false);
            setShowPrintModal(false);
            setShowEdictsModal(false);
            setTransforms([]);
            setEdictsError(null);
            setIsHardDeleteModalOpen(false);
            setServerValidationErrors([]); // ✅ Сброс при закрытии
        }
    }, [isOpen]);

    useEffect(() => {
        if (isOpen && !isLoading && formData) {
            saveCurrentSession(formData);
        }
    }, [formData, isLoading, isOpen, saveCurrentSession]);

    // ✅ Очищаем серверные ошибки, когда пользователь начал редактировать
    useEffect(() => {
        if (serverValidationErrors.length > 0) {
            setServerValidationErrors([]);
        }
    }, [formData]);

    const handleClose = useCallback((): void => {
        setServerValidationErrors([]); // ✅ Сброс ошибок при закрытии
        if (hasUnsavedChanges()) {
            setShowUnsavedModal(true);
        } else {
            onClose();
        }
    }, [hasUnsavedChanges, onClose]);

    const handleConfirmClose = useCallback((): void => {
        setShowUnsavedModal(false);
        onClose();
    }, [onClose]);

    const handleSubmit = useCallback(async (): Promise<void> => {
        if (!formEntity || !formData || !type) return;

        try {
            if (id) {
                await updateObject(id, formData, currentType !== type ? currentType : undefined);
            } else {
                await createObject(currentType, formData);
            }

            clearCurrentSession();
            setServerValidationErrors([]); // ✅ Успех — очищаем ошибки
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (err) {
            // ✅ Обрабатываем валидационные ошибки с бэкенда (422)
            if (err instanceof ValidationException) {
                const ajvErrors = convertServerErrorsToAjv(err.errors);
                setServerValidationErrors(ajvErrors);

                // 🔔 Скролл к первому полю с ошибкой (опционально)
                setTimeout(() => {
                    const firstErrorPath = Object.keys(err.errors)[0];
                    if (firstErrorPath) {
                        const fieldName = firstErrorPath.replace(/^\//, '').split('/')[0];
                        const element = document.querySelector(`[data-jsonforms-field="${fieldName}"]`);
                        element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    }
                }, 100);

                return; // ❗ Не закрываем модалку — даём пользователю исправить
            }

            // ❌ Другие ошибки
            console.error('Ошибка сохранения:', err);
            setError(true);
        }
    }, [formEntity, formData, type, id, currentType, onSaveSuccess, onClose, clearCurrentSession]);

    // ✅ Обработчики для хард-удаления
    const handleHardDeleteClick = useCallback((): void => {
        setIsHardDeleteModalOpen(true);
    }, []);

    const handleConfirmHardDelete = useCallback(async (): Promise<void> => {
        if (!id) return;

        try {
            await deleteObjectById(id, 'hard');
            clearCurrentSession();
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (err) {
            console.error('Ошибка при безвозвратном удалении:', err);
            alert('Не удалось удалить объект. Попробуйте ещё раз.');
        } finally {
            setIsHardDeleteModalOpen(false);
        }
    }, [id, onSaveSuccess, onClose, clearCurrentSession]);

    const handleCancelHardDelete = useCallback((): void => {
        setIsHardDeleteModalOpen(false);
    }, []);

    const handleHistoryClick = async (): Promise<void> => {
        if (!id) {
            console.warn('История недоступна для новых объектов');
            return;
        }

        if (showHistory) {
            setShowHistory(false);
            return;
        }

        setHistoryLoading(true);
        try {
            if (history.length === 0) {
                const historyData = await fetchHistoryById(id);
                setHistory(historyData);
            }
            setShowHistory(true);
        } catch (err) {
            console.error('Ошибка загрузки истории:', err);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleSelectHistory = (value: string): void => {
        try {
            if (!value) return;
            const parsedData: FormData = JSON.parse(value);

            if (formData && hasUnsavedChanges()) {
                saveCurrentSession(formData);
            }

            setFormData(parsedData);
        } catch (err) {
            console.error('Ошибка парсинга данных истории:', err);
        }
    };

    const handleApplyEdict = async (targetType: string): Promise<void> => {
        if (!formEntity || !targetType || !id) return;

        try {
            const targetEntity = await fetchDetailEntityById(id, targetType);

            const currentValues = formData || {};
            const targetData = targetEntity.data || {};

            const schemaAny = targetEntity.schema as any;
            const targetProperties = schemaAny?.properties && typeof schemaAny.properties === 'object'
                ? schemaAny.properties
                : {};

            const mergedData: FormData = {
                ...targetData,
                ...Object.fromEntries(
                    Object.entries(currentValues).filter(([key]) =>
                        !!key && targetProperties && key in targetProperties
                    )
                ),
            };

            setFormEntity(targetEntity);
            setFormData(mergedData);
            setCurrentType(targetType);

            saveCurrentSession(mergedData);
            setShowEdictsModal(false);

        } catch (err) {
            console.error('Ошибка применения действия:', err);
            setError(true);
            setEdictsError('Не удалось применить трансформацию');
        }
    };

    const handleReset = (): void => {
        if (originalData) {
            setFormData(originalData);
        }
        clearCurrentSession();
        setServerValidationErrors([]); // ✅ Сброс ошибок при сбросе формы
    };

    const handleResetAndClose = (): void => {
        handleReset();
        setShowUnsavedModal(false);
        onClose();
    };

    const handleMouseDown = (e: React.MouseEvent): void => {
        if (e.target === e.currentTarget) {
            setIsMouseDown(true);
        }
    };

    const handleMouseUp = (e: React.MouseEvent): void => {
        if (isMouseDown && e.target === e.currentTarget) {
            handleClose();
        }
        setIsMouseDown(false);
    };

    const handlePrint = (): void => {
        if (!id) {
            console.warn('Печать недоступна для новых объектов');
            return;
        }
        setIsTemplateSelectorOpen(true);
    };

    const handlePrintOption = async (): Promise<void> => {
        try {
            await generateReport(id!, 'Forma10');
        } catch (err) {
            console.error('Ошибка при печати:', err);
        } finally {
            setShowPrintModal(false);
        }
    };

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                e.preventDefault();
                if (showPrintModal) {
                    setShowPrintModal(false);
                } else if (showHistory) {
                    setShowHistory(false);
                } else if (showEdictsModal) {
                    setShowEdictsModal(false);
                } else if (showUnsavedModal) {
                    setShowUnsavedModal(false);
                } else if (isHardDeleteModalOpen) {
                    setIsHardDeleteModalOpen(false);
                } else if (isOpen) {
                    handleClose();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, showPrintModal, showHistory, showEdictsModal, showUnsavedModal, isHardDeleteModalOpen, handleClose]);

    if (!isOpen) return null;

    const hasChanges = hasUnsavedChanges();
    const hasSession = !!getExpiringItem(cookieKey);
    const showCurrentVersionInHistory = hasSession && hasChanges;

    return ReactDOM.createPortal(
        <>
            {isTemplateSelectorOpen && (
                <ReportTemplateSelectorModal
                    isOpen={true}
                    onClose={() => setIsTemplateSelectorOpen(false)}
                    onSelect={(metaTitle: string) => {
                        setIsTemplateSelectorOpen(false);

                        if (metaTitle === 'new' || metaTitle.startsWith('editor:')) {
                            const templateName = metaTitle.replace('editor:', '');
                            navigate(`/report-template-editor/${templateName}`);
                            return;
                        }

                        if (!id) {
                            console.error('ID объекта обязателен для генерации отчёта');
                            return;
                        }

                        generateReport(id, metaTitle)
                            .then(() => { })
                            .catch(err => {
                                console.error('Ошибка при генерации отчёта:', err);
                            });
                    }}
                />
            )}

            <div
                className={styles.modalOverlay}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                <div className={styles.modalContainer}>
                    <button
                        className={`${styles.togglePreviewBtn} ${showJsonPreview ? styles.active : ''}`}
                        onClick={toggleJsonPreview}
                        title={showJsonPreview ? 'Показать форму' : 'Показать JSON'}
                        type="button"
                        aria-label="Переключить просмотр"
                    >
                        <span className={styles.toggleIcon}>—</span>
                    </button>
                    <button
                        className={styles.resetButton}
                        onClick={handleClose}
                        title="Закрыть"
                        type="button"
                        aria-label="Закрыть"
                    >
                        <span className={styles.closeIcon}>✕</span>
                    </button>
                    <div className={styles.modalHeader}>
                        <h2>{title || (id ? 'Редактирование объекта' : 'Создание объекта')}</h2>
                    </div>

                    <div className={styles.modalContent}>
                        {showJsonPreview ? (
                            // 📄 JSON Preview Panel
                            <div className={styles.jsonPreviewPanel}>
                                <button
                                    className={styles.copyJsonBtn}
                                    onClick={handleCopyJson}
                                    disabled={!formData}
                                    title="Скопировать JSON"
                                    type="button"
                                >
                                    {jsonCopied ? '✓ Успешно' : 'Копировать'}
                                </button>
                                <pre className={styles.jsonPre}>
                                    {formData
                                        ? JSON.stringify(formData, null, 2)
                                        : '// Загрузка данных...'}
                                </pre>
                            </div>
                        ) : (
                            // 📝 Обычная форма
                            <ObjectEditForm
                                formEntity={formEntity}
                                formData={formData}
                                isLoading={isLoading}
                                error={error}
                                onChange={setFormData}
                                serverValidationErrors={serverValidationErrors}
                            />
                        )}
                    </div>

                    {currentType !== type && (
                        <span className={styles.typeChangedBadge}>
                            Тип изменён: {getObjectTypeNameById(type, objectTypesMap)} → {getObjectTypeNameById(currentType, objectTypesMap)}
                        </span>
                    )}

                    {/* ✅ Футер с кнопками */}
                    <div className={styles.modalFooter}>
                        {isDeadObject && id && (
                            <FilledColorButton
                                width="120px"
                                onClick={handleHardDeleteClick}
                                mainColor="#FFFFFF"
                                additionalColor="#e74c3c"
                            >
                                Удалить навсегда
                            </FilledColorButton>
                        )}

                        {!isDeadObject && (
                            <FilledColorButton
                                width="120px"
                                onClick={handleSubmit}
                                mainColor="#FFFFFF"
                                additionalColor="#f39c12"
                            >
                                {id ? 'Сохранить' : 'Создать'}
                            </FilledColorButton>
                        )}

                        {!isDeadObject && isPrintable && id && !hasChanges && (
                            <FilledColorButton
                                width="120px"
                                onClick={handlePrint}
                                mainColor="#FFFFFF"
                                additionalColor="#699"
                            >
                                Печать
                            </FilledColorButton>
                        )}

                        {id && hasTransformsForType === true && (
                            <FilledColorButton
                                width="120px"
                                onClick={handleEdictsClick}
                            >
                                Действия
                            </FilledColorButton>
                        )}

                        {!isDeadObject && hasChanges && (
                            <FilledColorButton
                                width="120px"
                                onClick={handleReset}
                                mainColor="#FFFFFF"
                                additionalColor="#3498db"
                            >
                                Сбросить
                            </FilledColorButton>
                        )}

                        <FilledColorButton
                            width="120px"
                            onClick={handleHistoryClick}
                            disabled={!id}
                        >
                            История
                        </FilledColorButton>
                    </div>

                    {showPrintModal && (
                        <PrintOptionsModal
                            onOption1={handlePrintOption}
                            onOption2={handlePrintOption}
                            onCancel={() => setShowPrintModal(false)}
                        />
                    )}
                </div>

                {/* Панель истории */}
                <div className={`${styles.historyPanelContainer} ${showHistory ? styles.visible : ''}`}>
                    <div className={styles.historyPanel}>
                        <div className={styles.historyHeader}>
                            <h3>История изменений</h3>
                            <button
                                className={styles.closeHistoryBtn}
                                onClick={() => setShowHistory(false)}
                            >
                                ×
                            </button>
                        </div>

                        {historyLoading ? (
                            <div className={styles.historyLoading}>
                                <div className={styles.spinner} />
                                <p>Загрузка истории...</p>
                            </div>
                        ) : (
                            <div className={styles.historyList}>
                                {showCurrentVersionInHistory && (
                                    <button
                                        className={styles.historyItem}
                                        onClick={handleReset}
                                    >
                                        <div className={styles.historyUser}>Текущая версия</div>
                                        <div className={styles.historyDate}>Несохранённые изменения</div>
                                    </button>
                                )}

                                {history.map((record, index) => (
                                    <button
                                        key={index}
                                        className={styles.historyItem}
                                        onClick={() => handleSelectHistory(record.value)}
                                    >
                                        <div className={styles.historyUser}>
                                            {record.userLogin || 'Неизвестный пользователь'}
                                        </div>
                                        <div className={styles.historyDate}>
                                            {record.stamp ? new Date(record.stamp).toLocaleString() : 'Нет данных'}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Панель действий (трансформы) */}
                <div className={`${styles.edictsPanelContainer} ${showEdictsModal ? styles.visible : ''}`}>
                    <div className={styles.edictsPanel}>
                        <div className={styles.edictsHeader}>
                            <h3>Действия</h3>
                            <button
                                className={styles.closeEdictsBtn}
                                onClick={() => setShowEdictsModal(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className={styles.edictsBody}>
                            {edictsLoading ? (
                                <div className={styles.edictsLoading}>
                                    <div className={styles.spinner} />
                                    <p>Загрузка...</p>
                                </div>
                            ) : edictsError ? (
                                <div className={styles.edictsError}>
                                    <p>{edictsError}</p>
                                    <button onClick={loadTransforms}>Повторить</button>
                                </div>
                            ) : transforms.length === 0 ? (
                                <div className={styles.edictsEmpty}>
                                    <p>Действия не найдены</p>
                                </div>
                            ) : (
                                <div className={styles.edictsList}>
                                    {transforms.map((item, index) => {
                                        const sourceName = getObjectTypeNameById(item.sourceType, objectTypesMap);
                                        const targetName = getObjectTypeNameById(item.targetType, objectTypesMap);

                                        return (
                                            <button
                                                key={item.id || `${item.sourceType}-${item.targetType}-${index}`}
                                                className={styles.historyItem}
                                                onClick={() => item.targetType && handleApplyEdict(item.targetType)}
                                                disabled={!item.targetType}
                                            >
                                                <div className={styles.edictTitle}>{item.title}</div>
                                                <div className={styles.edictMeta}>
                                                    <div className={styles.edictBadge}>
                                                        {item.sourceType && (
                                                            <span title={item.sourceType}>{sourceName}</span>
                                                        )} → {item.targetType && (
                                                            <span title={item.targetType}>{targetName}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Модалка подтверждения хард-удаления */}
            {isHardDeleteModalOpen &&
                ReactDOM.createPortal(
                    <DeleteConfirmationModal
                        preview="⚠️ Вы уверены, что хотите удалить этот объект НАВСЕГДА? Это действие нельзя отменить."
                        onConfirm={handleConfirmHardDelete}
                        onCancel={handleCancelHardDelete}
                    />,
                    document.getElementById('modal-root')!
                )
            }

            {showUnsavedModal && (
                <UnsavedChangesModal
                    onConfirm={handleConfirmClose}
                    onCancel={() => setShowUnsavedModal(false)}
                    onReset={handleResetAndClose}
                    mode={id ? 'edit' : 'create'}
                />
            )}
        </>,
        document.getElementById('modal-root')!
    );
};

export default ObjectEditModal;