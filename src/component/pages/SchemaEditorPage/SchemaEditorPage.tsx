import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { fetchObjectTypes } from '@services/ObjectTypeService';
import {
    createSchema,
    updateSchema,
    deleteSchema,
    fetchSchemaById,
    SchemaEditorDto
} from '@services/SchemaService';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import SchemaPreview from './SchemaPreview/SchemaPreview';
import ControlItem from './ControlItem/ControlItem';
import styles from './SchemaEditorPage.module.css';
import DeleteConfirmationModal from '@shared/DeleteConfirmationModal/DeleteConfirmationModal';
import ReactDOM from 'react-dom';

interface Dictionary {
    id: string;
    name: string;
}

interface ControlConfig {
    id: string;
    label: string;
    type: 'string' | 'number' | 'boolean' | 'object';
    dictionaryId?: string;
    required: boolean;
    metadata: boolean; // ИЗМЕНЕНО: representation → metadata
    key: string;
}

interface PageState {
    id?: string;
    objectId: string;
    objectTitle: string;
    objectViewCategory: string; // Новое свойство
    objectRestricted: boolean;
    controls: ControlConfig[];
}

const encodeState = (state: PageState): string => {
    const json = JSON.stringify(state);
    return btoa(unescape(encodeURIComponent(json)))
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
};

const decodeState = (encoded: string): PageState | null => {
    try {
        let base64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
        const padding = base64.length % 4;
        if (padding) base64 += '='.repeat(4 - padding);

        const json = decodeURIComponent(escape(atob(base64)));
        return JSON.parse(json);
    } catch (e) {
        return null;
    }
};

const SchemaEditorPage: React.FC = () => {

const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const navigate = useNavigate();
    const { schemaId: urlSchemaId, type } = useParams<{
        schemaId?: string;
        type?: string
    }>();
    const [searchParams] = useSearchParams();

    const [dictionaries, setDictionaries] = useState<Dictionary[]>([]);
    const [pageState, setPageState] = useState<PageState | null>(null);
    const [isDictionariesLoading, setIsDictionariesLoading] = useState(true);
    const [dictionaryError, setDictionaryError] = useState<string | null>(null);
    const [validationResult, setValidationResult] = useState<{
        uiValid: boolean;
        jsonValid: boolean
    } | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const [dragIndex, setDragIndex] = useState<number | null>(null);
    const [overIndex, setOverIndex] = useState<number | null>(null);

    const listRef = useRef<HTMLUListElement>(null);
    const scrollInterval = useRef<number | null>(null);
    const isMounted = useRef(false);

    const isFormValid = useMemo(() => {
        if (!pageState) return false;

        // Проверка основных полей
        if (!pageState.objectId || !pageState.objectTitle) return false;

        // Проверка всех контролов
        return pageState.controls.every(control => {
            // Проверка идентификатора и названия
            if (!control.id || !control.label) return false;

            // Проверка справочника если тип object
            if (control.type === 'object' && !control.dictionaryId) return false;

            return true;
        });
    }, [pageState]);

    useEffect(() => {
        isMounted.current = true;

        const loadDictionaries = async () => {
            try {
                setIsDictionariesLoading(true);
                const data = await fetchObjectTypes();
                setDictionaries(data);
            } catch (error) {
                console.error('Ошибка загрузки словарей:', error);
                setDictionaryError('Не удалось загрузить справочники');
            } finally {
                setIsDictionariesLoading(false);
            }
        };

        loadDictionaries();

        return () => {
            isMounted.current = false;
        };
    }, []);

    useEffect(() => {
        const loadInitialState = async () => {
            const stateParam = searchParams.get('state');
            if (stateParam) {
                const decoded = decodeState(stateParam);
                if (decoded) {
                    setPageState({
                        ...decoded,
                        controls: decoded.controls.map(control => ({
                            ...control,
                            key: `field_${Date.now()}_${Math.random()}`
                        }))
                    });
                    return;
                }
            }

            if (urlSchemaId && urlSchemaId !== 'new') {
                try {
                    const schemaData = await fetchSchemaById(urlSchemaId);

                    const jsonSchema = JSON.parse(schemaData.schemaValid);
                    const uiSchema = JSON.parse(schemaData.schemaForms);

                    const controls = uiSchema.elements.map((element: any) => {
                        const propName = element.scope.split('/').pop()!;
                        const prop = jsonSchema.properties[propName];

                        return {
                            id: propName,
                            label: element.label,
                            type: prop.$ref ? 'object' : (prop.type || 'string'),
                            dictionaryId: prop.$ref?.split('/').pop(),
                            required: jsonSchema.required?.includes(propName) || false,
                            metadata: jsonSchema.metadata?.includes(propName) || false,
                            key: `field_${Date.now()}_${Math.random()}`
                        };
                    });

                    setPageState({
                        id: schemaData.id,
                        objectId: jsonSchema.$id,
                        objectTitle: jsonSchema.title,
                        objectViewCategory: schemaData.viewCategory,
                        objectRestricted: schemaData.restricted,
                        controls
                    });
                } catch (error) {
                    console.error('Ошибка загрузки схемы', error);
                    navigate('/schemas', { replace: true });
                }
            } else {
                setPageState({
                    objectId: type || '',
                    objectTitle: '',
                    objectViewCategory: '', // Новое свойство
                    objectRestricted: false,
                    controls: [{
                        id: `field_${Date.now()}`,
                        label: 'Новое поле',
                        type: 'string',
                        required: false,
                        metadata: false,
                        key: `field_${Date.now()}`
                    }]
                });
            }
        };

        loadInitialState();
    }, [urlSchemaId, type, navigate, searchParams]);


    const generateUISchema = useCallback((): any => {
        if (!pageState) return { type: "VerticalLayout", elements: [] };

        return {
            type: "VerticalLayout",
            elements: pageState.controls.map(control => ({
                type: "Control",
                label: control.label,
                scope: `#/properties/${control.id}`
            }))
        };
    }, [pageState]);

    const generateJSONSchema = useCallback((): any => {
        if (!pageState) return {
            $id: '',
            type: "object",
            title: '',
            properties: {},
            required: [],
            metadata: [] // ИЗМЕНЕНО: representation → metadata
        };

        return {
            $id: pageState.objectId,
            type: "object",
            title: pageState.objectTitle,
            properties: pageState.controls.reduce((acc, control) => {
                acc[control.id] = control.type === 'object' && control.dictionaryId
                    ? { $ref: `dictionaries/${control.dictionaryId}`, title: control.label }
                    : { type: control.type, title: control.label };
                return acc;
            }, {} as Record<string, any>),
            required: pageState.controls.filter(c => c.required).map(c => c.id),
            metadata: pageState.controls.filter(c => c.metadata).map(c => c.id) // ИЗМЕНЕНО: representation → metadata
        };
    }, [pageState]);


    const handleCancelDelete = () => {
        setIsDeleteModalOpen(false);
    };

    const handleObjectViewCategoryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!pageState) return;
        setPageState({
            ...pageState,
            objectViewCategory: e.currentTarget.value
        });
    };

    const handleObjectIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!pageState) return;
        // Разрешаем только латинские буквы, цифры и символы -_.
        const value = e.currentTarget.value.replace(/[^a-zA-Z0-9\-_.]/g, '');
        setPageState({
            ...pageState,
            objectId: value
        });
    };

    const handleObjectTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!pageState) return;
        setPageState({
            ...pageState,
            objectTitle: e.currentTarget.value
        });
    };

    const handleObjectRestrictedChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!pageState) return;
        setPageState({
            ...pageState,
            objectRestricted: e.currentTarget.checked
        });
    };

    // Обработчики изменений
    const handleAddControl = () => {
        if (!pageState) return;

        setPageState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                controls: [
                    ...prev.controls,
                    {
                        id: `field${Date.now()}`,
                        label: 'Новое поле',
                        type: 'string',
                        required: false,
                        metadata: false, // ИЗМЕНЕНО: representation → metadata
                        key: `field_${Date.now()}`
                    }
                ]
            };
        });
    };

    const handleRemoveControl = (index: number) => {
        if (!pageState || pageState.controls.length <= 1) return;

        setPageState(prev => {
            if (!prev) return prev;
            return {
                ...prev,
                controls: prev.controls.filter((_, i) => i !== index)
            };
        });
    };

    const handleControlChange = (
        index: number,
        field: keyof ControlConfig,
        value: string | boolean
    ) => {
        if (!pageState) return;

        setPageState(prev => {
            if (!prev) return prev;
            const newControls = [...prev.controls];

            if (typeof value === 'string') {
                if (field === 'id') {
                    value = value.replace(/\s+/g, '');
                }
                newControls[index] = { ...newControls[index], [field]: value };
            } else {
                newControls[index] = { ...newControls[index], [field]: value };
            }

            if (field === 'type' && value !== 'object') {
                newControls[index].dictionaryId = undefined;
            }

            return { ...prev, controls: newControls };
        });
    };

    const handleMoveControl = (fromIndex: number, toIndex: number) => {
        if (!pageState || toIndex < 0 || toIndex >= pageState.controls.length) return;

        setPageState(prev => {
            if (!prev) return prev;
            const newControls = [...prev.controls];
            const [moved] = newControls.splice(fromIndex, 1);
            newControls.splice(toIndex, 0, moved);
            return { ...prev, controls: newControls };
        });
    };

    // Drag & Drop handlers
    const handleDragStart = (index: number) => {
        setDragIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragIndex === null || dragIndex === index || !pageState) return;
        setOverIndex(index);
    };

    const handleDragLeave = () => {
        setOverIndex(null);
    };

    const handleDrop = () => {
        if (dragIndex !== null && overIndex !== null &&
            dragIndex !== overIndex && pageState) {
            handleMoveControl(dragIndex, overIndex);
        }
        setDragIndex(null);
        setOverIndex(null);
    };

    const handleDragEnd = () => {
        setDragIndex(null);
        setOverIndex(null);
    };

    const openDeleteModal = () => {
        setIsDeleteModalOpen(true);
    };

    const handleDelete = async () => {
        if (pageState && pageState.id) {
            try {
                await deleteSchema(pageState.id);
                navigate('/');
            }
            catch (error) {
                navigate(`/view-objects/${pageState.objectId}`)
                console.log('Не удалось удалить схему, у неё есть объекты');
            }
        }
    };

    const handleSave = async () => {
        if (!pageState) return;

        const uiSchema = generateUISchema();
        const jsonSchema = generateJSONSchema();

        const dto: SchemaEditorDto = {
            id: pageState.id || '',
            title: pageState.objectTitle,
            restricted: pageState.objectRestricted,
            viewCategory: pageState.objectViewCategory, // Новое свойство
            schemaValid: JSON.stringify(jsonSchema),
            schemaForms: JSON.stringify(uiSchema)

        };

        try {
            let result;
            if (pageState.id) {
                result = await updateSchema(pageState.id, dto);
            } else {
                result = await createSchema(pageState.objectId, dto);
            }
            navigate(`/view-objects/${urlSchemaId}`, { replace: true });
        } catch (error) {
            console.error('Ошибка сохранения:', error);
        }
    };

    const handleCancel = () => {
        if (pageState && pageState.id) {
            navigate(`/view-objects/${pageState.objectId}`)
        } else {
            navigate(-1);
        }
    };

    if (!pageState) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Загрузка схемы...</p>
            </div>
        );
    }

    return (
        <div className={styles.pageContainer}>
            <div className={styles.layoutContainer}>
                <div className={styles.sidePanel}>
                    <SchemaPreview
                        title="UI Schema"
                        schema={generateUISchema()}
                        isValid={validationResult?.uiValid ?? null}
                    />
                </div>

                <div className={styles.mainPanel}>
                    <div className={styles.schemaConfig}>
                        <div className={styles.objectConfig}>
                            <div className={styles.objectRow}>
                                <label className={styles.objectField}>
                                    <span className={styles.fieldLabel}>Идентификатор объекта</span>
                                    <input
                                        type="text"
                                        value={pageState?.objectId || ''}
                                        onChange={handleObjectIdChange}
                                        className={styles.titleInput}
                                        placeholder="object-id"
                                        disabled={!!pageState?.id}
                                        title="Только английские буквы и цифры"
                                    />
                                </label>

                                <label className={styles.objectField}>
                                    <span className={styles.fieldLabel}>Название объекта</span>
                                    <input
                                        type="text"
                                        value={pageState?.objectTitle || ''}
                                        onChange={handleObjectTitleChange}
                                        className={styles.titleInput}
                                        placeholder="Название объекта"
                                        title={!pageState.objectTitle ? "Обязательное поле" : ""}
                                    />
                                </label>

                                <label className={styles.objectField}>
                                    <span className={styles.fieldLabel}>Категория представления</span>
                                    <input
                                        type="text"
                                        value={pageState?.objectViewCategory || ''}
                                        onChange={handleObjectViewCategoryChange}
                                        className={styles.titleInput}
                                        placeholder="Категория представления"
                                        title={!pageState.objectTitle ? "Обязательное поле" : ""}
                                    />
                                </label>

                                <label className={styles.restrictedCheckbox}>
                                    <input
                                        type="checkbox"
                                        checked={pageState?.objectRestricted || false}
                                        onChange={handleObjectRestrictedChange}
                                        className={styles.customCheckbox}
                                    />
                                    <span>
                                        <div>Ограниченное</div>
                                        <div> количество</div>
                                    </span>
                                </label>
                            </div>
                        </div>

                        <div className={styles.controlsHeader}>
                            <FilledColorButton
                                width='150px'
                                mainColor="#FFFFFF"
                                additionalColor="#e74c3c"
                                onClick={openDeleteModal}
                                disabled={!urlSchemaId}
                            >
                                Удалить
                            </FilledColorButton>
                            <FilledColorButton
                                width='150px'
                                mainColor="#FFFFFF"
                                additionalColor="#f39c12"
                                onClick={handleSave}
                            >
                                Сохранить
                            </FilledColorButton>

                            <FilledColorButton
                                width='170px'
                                mainColor="#FFFFFF"
                                additionalColor="#e74c3c"
                                onClick={handleCancel}
                            >
                                Отмена
                            </FilledColorButton>

                            <FilledColorButton
                                width='150px'
                                onClick={handleAddControl}
                                disabled={isDictionariesLoading}
                            >
                                + Добавить поле
                            </FilledColorButton>
                        </div>

                        <ul
                            className={styles.columnList}
                            ref={listRef}
                        >
                            {pageState.controls.map((control, index) => (
                                <ControlItem
                                    key={control.key}
                                    control={control}
                                    index={index}
                                    dictionaries={dictionaries}
                                    isDictionariesLoading={isDictionariesLoading}
                                    dragIndex={dragIndex}
                                    overIndex={overIndex}
                                    onRemoveControl={handleRemoveControl}
                                    onMoveControl={handleMoveControl}
                                    onControlChange={handleControlChange}
                                    onDragStart={handleDragStart}
                                    onDragOver={handleDragOver}
                                    onDragLeave={handleDragLeave}
                                    onDrop={handleDrop}
                                    onDragEnd={handleDragEnd}
                                    controlsCount={pageState.controls.length}
                                />
                            ))}
                        </ul>
                    </div>
                </div>
                {isDeleteModalOpen && ReactDOM.createPortal(
                    <DeleteConfirmationModal
                        preview='Вы уверены, что хотите удалить этот тип?'
                        onConfirm={handleDelete}
                        onCancel={handleCancelDelete}
                    />,
                    document.getElementById('modal-root')!
                )}
                <div className={styles.sidePanel}>
                    <SchemaPreview
                        title="JSON Schema"
                        schema={generateJSONSchema()}
                        isValid={validationResult?.jsonValid ?? null}
                    />
                </div>
            </div>
        </div>
    );
};

export default SchemaEditorPage;