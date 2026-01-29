// components/ObjectEditModal/ObjectEditModal.tsx
import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';
import ObjectEditForm from './ObjectEditForm/ObjectEditForm';
import styles from './ObjectEditModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import PrintOptionsModal from './PrintOptionsModal/PrintOptionsModal';
import UnsavedChangesModal from './UnsavedChangesModal/UnsavedChangesModal';

import {
    fetchDetailEntityById,
    fetchDetailEntityByType
} from '@services/DetailService';
import {
    updateObject,
    createObject,
    fetchHistoryById,
    ChangeHistory
} from '@services/ObjectService';
import { checkPrintable, generateReport } from '@services/ReportServices';
import { getExpiringItem, setExpiringItem, removeItem } from 'utils/LocalStorageUtils';

interface ObjectEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    type: string;
    id?: string;
    title?: string;
    onSaveSuccess?: () => void;
}

type FormData = Record<string, unknown>;

const ObjectEditModal: React.FC<ObjectEditModalProps> = ({
    isOpen,
    onClose,
    type,
    id,
    title,
    onSaveSuccess
}) => {
    const [formEntity, setFormEntity] = useState<any>(null);
    const [formData, setFormData] = useState<FormData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(false);
    const [isPrintable, setIsPrintable] = useState(false);

    const [history, setHistory] = useState<ChangeHistory[]>([]);
    const [showHistory, setShowHistory] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [isMouseDown, setIsMouseDown] = useState(false);
    const [showPrintModal, setShowPrintModal] = useState(false);
    const [showUnsavedModal, setShowUnsavedModal] = useState(false);

    const [originalData, setOriginalData] = useState<FormData | null>(null);
    const cookieKey = id ? `currentVersion_${type}_${id}` : `currentVersion_${type}_new`;

    // Определяем есть ли несохраненные изменения
    const hasUnsavedChanges = useCallback((): boolean => {
        if (!originalData || !formData) return false;
        return JSON.stringify(formData) !== JSON.stringify(originalData);
    }, [formData, originalData]);

    // Сохраняем текущую сессию в куки
    const saveCurrentSession = useCallback((data: FormData): void => {
        setExpiringItem(cookieKey, JSON.stringify(data), 1);
    }, [cookieKey]);

    // Очищаем сессию
    const clearCurrentSession = useCallback((): void => {
        removeItem(cookieKey);
    }, [cookieKey]);

    // Восстанавливаем из сессии
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

    // Загрузка данных при открытии
    useEffect(() => {
        if (!isOpen) return;

        const fetchData = async (): Promise<void> => {
            setIsLoading(true);
            setError(false);
            setIsPrintable(false);

            try {
                let entity: any;
                let entityType = type;

                // КРИТИЧЕСКИЙ МОМЕНТ: разделяем логику создания и редактирования
                if (id) {
                    // РЕДАКТИРОВАНИЕ - загружаем по ID
                    entity = await fetchDetailEntityById(id);
                    entityType = entity.type;
                } else {
                    // СОЗДАНИЕ - загружаем по типу
                    entity = await fetchDetailEntityByType(type);
                }

                // Восстанавливаем из куки или используем исходные данные
                const sessionData = restoreFromSession();
                const initialData = sessionData || entity.data;
                
                setOriginalData(entity.data);
                setFormData(initialData);
                setFormEntity(entity);

                // КРИТИЧЕСКИЙ МОМЕНТ: для создания объекта ДОЛЖНЫ сохранять сессию сразу
                // если это создание И есть сессия - сохраняем её
                if (sessionData) {
                    saveCurrentSession(sessionData);
                } else if (!id) {
                    // Если это создание и нет сессии - сохраняем исходные данные как сессию
                    saveCurrentSession(entity.data);
                }

                // Проверяем печать только для существующих объектов
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

    // Сброс состояний при закрытии
    useEffect(() => {
        if (!isOpen) {
            setHistory([]);
            setShowHistory(false);
            setIsPrintable(false);
            setShowUnsavedModal(false);
            setShowPrintModal(false);
        }
    }, [isOpen]);

    // КРИТИЧЕСКИЙ МОМЕНТ: Автосохранение в куки при ЛЮБОМ изменении формы
    // Убрал проверку hasUnsavedChanges - сохраняем ВСЕГДА при изменении формы
    useEffect(() => {
        if (isOpen && !isLoading && formData) {
            console.log('Auto-saving to cookies:', { cookieKey, formData });
            saveCurrentSession(formData);
        }
    }, [formData, isLoading, isOpen, saveCurrentSession]);

    const handleClose = useCallback((): void => {
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
                await updateObject(id, formData);
            } else {
                await createObject(type, formData);
            }

            clearCurrentSession();
            if (onSaveSuccess) onSaveSuccess();
            onClose();
        } catch (err) {
            console.error('Ошибка сохранения:', err);
            setError(true);
        }
    }, [formEntity, formData, type, id, onSaveSuccess, onClose, clearCurrentSession]);

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
            
            // КРИТИЧЕСКИЙ МОМЕНТ: При выборе из истории сохраняем В КУКИ текущие несохраненные изменения
            // перед тем как переключиться на историческую версию
            if (formData && hasUnsavedChanges()) {
                saveCurrentSession(formData);
            }
            
            setFormData(parsedData);
            // НЕ сохраняем историческую версию в куки - оставляем текущие несохраненные изменения
        } catch (err) {
            console.error('Ошибка парсинга данных истории:', err);
        }
    };

    const handleRestoreOriginal = (): void => {
        const sessionData = restoreFromSession();
        if (sessionData) {
            setFormData(sessionData);
        }
    };

    const handleReset = (): void => {
        if (originalData) {
            setFormData(originalData);
        }
        clearCurrentSession();
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
        setShowPrintModal(true);
    };

    const handlePrintOption = async (): Promise<void> => {
        try {
            const blob = await generateReport(id!);
            const downloadUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = downloadUrl;
            link.setAttribute('download', `report_${id}.docx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            window.URL.revokeObjectURL(downloadUrl);
        } catch (err) {
            console.error('Ошибка при печати:', err);
        } finally {
            setShowPrintModal(false);
        }
    };

    // Обработчик клавиш - УПРОЩЕННЫЙ И ИСПРАВЛЕННЫЙ
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent): void => {
            if (e.key === 'Escape') {
                if (showPrintModal) {
                    e.preventDefault();
                    setShowPrintModal(false);
                } else if (showHistory) {
                    e.preventDefault();
                    setShowHistory(false);
                } else if (showUnsavedModal) {
                    e.preventDefault();
                    setShowUnsavedModal(false);
                } else if (isOpen) {
                    e.preventDefault();
                    handleClose();
                }
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, showPrintModal, showHistory, showUnsavedModal, handleClose]);

    if (!isOpen) return null;

    const hasChanges = hasUnsavedChanges();
    const hasSession = !!getExpiringItem(cookieKey);
    const showCurrentVersionInHistory = hasSession && hasChanges;

    return ReactDOM.createPortal(
        <>
            <div 
                className={styles.modalOverlay}
                onMouseDown={handleMouseDown}
                onMouseUp={handleMouseUp}
            >
                <div className={styles.modalContainer}>
                    <div className={styles.modalHeader}>
                        <h2>{title || (id ? 'Редактирование объекта' : 'Создание объекта')}</h2>
                    </div>

                    <div className={styles.modalContent}>
                        <ObjectEditForm
                            formEntity={formEntity}
                            formData={formData}
                            isLoading={isLoading}
                            error={error}
                            onChange={setFormData}
                        />
                    </div>

                    <div className={styles.modalFooter}>
                        <FilledColorButton
                            width="120px"
                            onClick={handleSubmit}
                            mainColor="#FFFFFF"
                            additionalColor="#f39c12"
                        >
                            {id ? 'Сохранить' : 'Создать'}
                        </FilledColorButton>
                        
                        {isPrintable && id && !hasChanges && (
                            <FilledColorButton
                                width="120px"
                                onClick={handlePrint}
                                mainColor="#FFFFFF"
                                additionalColor="#699"
                            >
                                Печать
                            </FilledColorButton>
                        )}

                        {hasChanges && (
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

                        <FilledColorButton
                            width="120px"
                            onClick={handleClose}
                            mainColor="#FFFFFF"
                            additionalColor="#e74c3c"
                        >
                            Отмена
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
                                        onClick={handleRestoreOriginal}
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
            </div>

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