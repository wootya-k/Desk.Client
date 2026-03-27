// @modals/EdictModal/TransformEditorModal.tsx
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { fetchObjectTypes } from '@services/ObjectTypeService';
import { 
    getTransforms, 
    createTransform, 
    deleteTransform, 
    invalidateTransformCache 
} from '@services/TransformService';
import type { ObjectType } from '@models';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import styles from './TransformEditorModal.module.css';

interface EdictEntity {
    id: string;
    title: string;
    sourceType: string;
    targetType: string;
}

interface TransformEditorModalProps {
    isOpen: boolean;
    onClose: () => void;
    onEdictCreated?: (edict: EdictEntity) => void;
    onEdictDeleted?: (id: string) => void;
}

interface EdictFormData {
    sourceType: string;
    targetType: string;
    title: string;
}

const TransformEditorModal: React.FC<TransformEditorModalProps> = ({
    isOpen,
    onClose,
    onEdictCreated,
    onEdictDeleted,
}) => {
    const [objectTypes, setObjectTypes] = useState<ObjectType[]>([]);
    const [edicts, setEdicts] = useState<EdictEntity[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formError, setFormError] = useState<string | null>(null);
    const [formData, setFormData] = useState<EdictFormData>({
        sourceType: '',
        targetType: '',
        title: '',
    });
    const [isCreating, setIsCreating] = useState(false);
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Мемоизируем маппинг типов для производительности
    const objectTypeMap = useMemo(() => {
        const map = new Map<string, string>();
        objectTypes.forEach((t: ObjectType) => map.set(t.id, t.name));
        return map;
    }, [objectTypes]);

    // Закрытие по Esc
    useEffect(() => {
        if (!isOpen) return;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Загрузка данных
    useEffect(() => {
        if (!isOpen) return;

        let isCancelled = false;
        
        const loadData = async () => {
            setLoading(true);
            setError(null);
            try {
                const [types, transforms] = await Promise.all([
                    fetchObjectTypes(),
                    getTransforms()
                ]);
                
                if (isCancelled) return;
                
                setObjectTypes(types);
                
                const edictsData: EdictEntity[] = transforms.map((t) => ({
                    id: t.id,
                    title: t.title || t.type || 'Без названия',
                    sourceType: typeof t.sourceType === 'string' ? t.sourceType : '',
                    targetType: typeof t.targetType === 'string' ? t.targetType : ''
                }));
                setEdicts(edictsData);
            } catch (err) {
                if (isCancelled) return;
                console.error('Ошибка загрузки данных для действий:', err);
                setError(err instanceof Error ? err.message : 'Не удалось загрузить данные');
            } finally {
                if (!isCancelled) setLoading(false);
            }
        };

        loadData();
        
        return () => {
            isCancelled = true;
        };
    }, [isOpen]);

    // Сброс формы
    useEffect(() => {
        if (!isOpen) {
            setFormData({ sourceType: '', targetType: '', title: '' });
            setFormError(null);
        }
    }, [isOpen]);

    const handleInputChange = useCallback((e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));
        if (formError) setFormError(null);
    }, [formError]);

    const handleCreateEdict = useCallback(async () => {
        if (!formData.sourceType || !formData.targetType || !formData.title) {
            setFormError('Заполните все поля формы');
            return;
        }
        if (formData.sourceType === formData.targetType) {
            setFormError('Источник и цель не могут совпадать');
            return;
        }

        setIsCreating(true);
        setFormError(null);

        try {
            const payload = {
                title: formData.title,
                sourceType: formData.sourceType,
                targetType: formData.targetType,
            };

            const createdId = await createTransform(payload);
            const newEdict: EdictEntity = { id: createdId, ...payload };
            
            setEdicts((prev) => [...prev, newEdict]);
            setFormData({ sourceType: '', targetType: '', title: '' });
            onEdictCreated?.(newEdict);
            invalidateTransformCache();
        } catch (err) {
            console.error('Ошибка создания действий:', err);
            setFormError(err instanceof Error ? err.message : 'Не удалось создать действий');
        } finally {
            setIsCreating(false);
        }
    }, [formData, onEdictCreated]);

    const handleDeleteEdict = useCallback(async (id: string) => {
        if (!confirm('Вы уверены, что хотите удалить это действие?')) return;

        setIsDeleting(id);
        try {
            const success = await deleteTransform(id);
            if (success) {
                setEdicts((prev) => prev.filter((e) => e.id !== id));
                onEdictDeleted?.(id);
                invalidateTransformCache();
            }
        } catch (err) {
            console.error('Ошибка удаления действий:', err);
            alert(err instanceof Error ? err.message : 'Не удалось удалить дейвие');
        } finally {
            setIsDeleting(null);
        }
    }, [onEdictDeleted]);

    const handleBackdropClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget) onClose();
    }, [onClose]);

    const getTypeNameById = useCallback((id: string): string => {
        return objectTypeMap.get(id) || id;
    }, [objectTypeMap]);

    if (!isOpen) return null;

    return createPortal(
        <div className={styles.modalBackdrop} onClick={handleBackdropClick} ref={modalRef}>
            <div className={styles.modalPanel}>
                <h2 className={styles.modalTitle}>Действия</h2>

                {loading ? (
                    <div className={styles.loading}>
                        <div className={styles.spinner}></div>
                        <p>Загрузка...</p>
                    </div>
                ) : error ? (
                    <div className={styles.error}>
                        <p>{error}</p>
                        <FilledColorButton onClick={() => window.location.reload()}>
                            Повторить
                        </FilledColorButton>
                    </div>
                ) : (
                    <>
                        <div className={styles.formSection}>
                            <h3 className={styles.sectionTitle}>Создать новый действие</h3>
                            <div className={styles.formGrid}>
                                <div className={styles.formGroup}>
                                    <label htmlFor="sourceType" className={styles.label}>Источник</label>
                                    <select
                                        id="sourceType"
                                        name="sourceType"
                                        value={formData.sourceType}
                                        onChange={handleInputChange}
                                        className={styles.select}
                                        disabled={isCreating}
                                    >
                                        <option value="">Выберите тип</option>
                                        {objectTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroup}>
                                    <label htmlFor="targetType" className={styles.label}>Цель</label>
                                    <select
                                        id="targetType"
                                        name="targetType"
                                        value={formData.targetType}
                                        onChange={handleInputChange}
                                        className={styles.select}
                                        disabled={isCreating}
                                    >
                                        <option value="">Выберите тип</option>
                                        {objectTypes.map((type) => (
                                            <option key={type.id} value={type.id}>
                                                {type.name}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className={styles.formGroupFull}>
                                    <label htmlFor="title" className={styles.label}>Название действий</label>
                                    <input
                                        id="title"
                                        name="title"
                                        type="text"
                                        value={formData.title}
                                        onChange={handleInputChange}
                                        placeholder="Например: Принять на работу"
                                        className={styles.input}
                                        disabled={isCreating}
                                    />
                                </div>
                            </div>

                            {formError && (
                                <div className={styles.formError}>
                                    <span>⚠️</span>
                                    {formError}
                                </div>
                            )}

                            <div className={styles.formActions}>
                                <FilledColorButton
                                    onClick={handleCreateEdict}
                                    disabled={isCreating}
                                    width="140px"
                                >
                                    {isCreating ? 'Создание...' : 'Создать действие'}
                                </FilledColorButton>
                            </div>
                        </div>

                        <div className={styles.listSection}>
                            <h3 className={styles.sectionTitle}>Существующие действия</h3>
                            <div className={styles.listContainer}>
                                {edicts.length === 0 ? (
                                    <div className={styles.emptyState}>
                                        <div className={styles.emptyIcon}>📋</div>
                                        <p>Нет созданных действий</p>
                                        <span className={styles.emptyHint}>Создайте первые действия выше</span>
                                    </div>
                                ) : (
                                    edicts.map((edict) => (
                                        <div key={edict.id} className={styles.edictCard}>
                                            <div className={styles.edictHeader}>
                                                <div className={styles.edictTitle}>{edict.title}</div>
                                                <div className={styles.edictBadge}>
                                                    {getTypeNameById(edict.sourceType)} → {getTypeNameById(edict.targetType)}
                                                </div>
                                            </div>
                                            <div className={styles.edictFooter}>
                                                <div className={styles.edictMeta}>
                                                    <span className={styles.metaLabel}>Источник:</span>
                                                    <span className={styles.metaValue}>{getTypeNameById(edict.sourceType)}</span>
                                                    <span className={styles.metaSeparator}>•</span>
                                                    <span className={styles.metaLabel}>Цель:</span>
                                                    <span className={styles.metaValue}>{getTypeNameById(edict.targetType)}</span>
                                                </div>
                                                <FilledColorButton
                                                    mainColor="#FFFFFF"
                                                    additionalColor="#e74c3c"
                                                    width="90px"
                                                    onClick={() => handleDeleteEdict(edict.id)}
                                                    disabled={isDeleting === edict.id}
                                                >
                                                    {isDeleting === edict.id ? '...' : 'Удалить'}
                                                </FilledColorButton>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.getElementById('modal-root')!
    );
};

export default TransformEditorModal;