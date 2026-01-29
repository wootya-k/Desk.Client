// @pages/ReportTemplateEditorPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import {
    fetchReportTemplateById,
    fetchFieldExplorer,
    FieldExplorerData,
    FieldOption,
    ReportSchema,
    parseSchema,
    CreateReportTemplateRequest,
    saveReportTemplate,
} from '@services/ReportTemplateService';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import styles from './ReportTemplateEditorPage.module.css';

const ReportTemplateEditorPage: React.FC = () => {
    const { templateId } = useParams<{ templateId?: string }>();

    const [file, setFile] = useState<File | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [usedFields, setUsedFields] = useState<FieldOption[]>([]);
    const [fieldGroups, setFieldGroups] = useState<
        { key: string; title: string; fields: FieldOption[] }[]
    >([]);
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
    const [requiredFields, setRequiredFields] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [jsonSchema, setJsonSchema] = useState<string>('');
    const [schemaWidth, setSchemaWidth] = useState(300);
    const [previewWidth, setPreviewWidth] = useState(300);
    const [isTemplateCollapsed, setIsTemplateCollapsed] = useState(true);

    useEffect(() => {
        console.log('🔄 ReportTemplateEditorPage mounted, templateId:', templateId);

        if (templateId) {
            loadTemplate(templateId);
        } else {
            initializeNewTemplate();
        }
    }, [templateId]);

    const initializeNewTemplate = () => {
        console.log('🆕 Initializing new template');
        setFile(null);
        setFileName(null);
        setUsedFields([]);
        setRequiredFields(new Set());
        setFieldGroups([]);
        setJsonSchema('');
    };

    const loadTemplate = async (id: string) => {
        if (!id) {
            console.error('❌ Empty template ID');
            return;
        }

        setIsLoading(true);
        try {
            console.log('📥 Loading template with ID:', id);

            // 1. Загружаем шаблон
            const reportDto = await fetchReportTemplateById(id);
            console.log('✅ Template loaded:', reportDto);

            // Сохраняем JSON схему для отображения
            setJsonSchema(reportDto.schema);

            // Восстановление файла
            if (reportDto.file) {
                const byteString = atob(reportDto.file);
                const mimeString = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                const ab = new ArrayBuffer(byteString.length);
                const ia = new Uint8Array(ab);
                for (let i = 0; i < byteString.length; i++) {
                    ia[i] = byteString.charCodeAt(i);
                }
                const blob = new Blob([ab], { type: mimeString });
                const fakeFile = new File([blob], `${reportDto.title}.docx`, { type: mimeString });
                setFile(fakeFile);
                setFileName(`${reportDto.title}.docx`);
            }

            // 2. Парсим схему для usedFields
            const schema: ReportSchema = parseSchema(reportDto.schema);
            console.log('📋 Parsed schema:', schema);

            const initialRequired = new Set<string>();
            const initialUsedPaths = new Set<string>();

            if (schema && schema.fields && Array.isArray(schema.fields)) {
                schema.fields.forEach(f => {
                    if (f && f.path) {
                        initialUsedPaths.add(f.path);
                        if (f.required) initialRequired.add(f.path);
                    }
                });
                console.log('✅ Processed schema fields:', initialUsedPaths.size);
            } else {
                console.warn('⚠️ Schema fields is undefined or not an array');
            }

            setRequiredFields(initialRequired);

            // 3. Загружаем поля и сопоставляем с properties из JSON схемы
            const explorerData = await fetchFieldExplorer(id);
            console.log('🎯 Field explorer data:', explorerData);

            const flattened = flattenFieldGroups(explorerData);
            setFieldGroups(flattened);

            // 🔍 Сопоставляем поля из fieldExplorer с properties из JSON схемы
            const schemaObj = JSON.parse(reportDto.schema);
            const schemaProperties = schemaObj.properties || {};

            const allFields: FieldOption[] = [];
            flattened.forEach(g => allFields.push(...g.fields));

            // Находим поля, которые уже есть в properties схемы
            const restoredUsedFields = allFields.filter(f =>
                schemaProperties.hasOwnProperty(f.path) || initialUsedPaths.has(f.path)
            );
            setUsedFields(restoredUsedFields);
            console.log('✅ Restored used fields from schema properties:', restoredUsedFields.length);

            // Сворачиваем все группы по умолчанию
            const initialExpanded: Record<string, boolean> = {};
            flattened.forEach(g => {
                initialExpanded[g.key] = false;
            });
            setExpandedGroups(initialExpanded);

        } catch (err) {
            console.error('💥 Error loading template:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const flattenFieldGroups = (data: FieldExplorerData) => {
        const groups = [];

        if (data.userGroup && data.userGroup.fields) {
            groups.push({
                key: 'userGroup',
                title: data.userGroup.title || 'Данные пользователя',
                fields: data.userGroup.fields
            });
        }

        if (data.targetGroup && data.targetGroup.fields) {
            groups.push({
                key: 'targetGroup',
                title: data.targetGroup.title || 'Целевые данные',
                fields: data.targetGroup.fields
            });
        }

        if (data.firstLevelGroups && data.firstLevelGroups.fields) {
            groups.push({
                key: 'firstLevelGroups',
                title: data.firstLevelGroups.title || 'Группы первого уровня',
                fields: data.firstLevelGroups.fields
            });
        }

        if (data.secondLevelGroups && data.secondLevelGroups.fields) {
            groups.push({
                key: 'secondLevelGroups',
                title: data.secondLevelGroups.title || 'Группы второго уровня',
                fields: data.secondLevelGroups.fields
            });
        }

        return groups;
    };

    const handleSave = async () => {
        if (!file) {
            alert('Пожалуйста, загрузите файл шаблона');
            return;
        }

        try {
            // Формируем JSON схему на основе выбранных полей
            const schemaData = {
                $id: templateId || generateId(),
                type: "object",
                required: Array.from(requiredFields),
                properties: usedFields.reduce((acc, field) => {
                    acc[field.path] = { type: "string" };
                    return acc;
                }, {} as Record<string, any>)
            };

            const request: CreateReportTemplateRequest = {
                id: templateId || generateId(),
                title: fileName?.replace('.docx', '') || 'Новый шаблон',
                schemaReportJson: JSON.stringify(schemaData, null, 2),
                file: file
            };

            console.log('💾 Saving template:', request);
            const result = await saveReportTemplate(request);
            console.log('✅ Template saved:', result);

            // TODO: Показать уведомление об успехе
        } catch (error) {
            console.error('❌ Error saving template:', error);
            // TODO: Показать ошибку
        }
    };

    const generateId = () => {
        return 'template_' + Date.now();
    };

    const handleFileDownload = () => {
        if (!file) return;

        const url = URL.createObjectURL(file);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName || 'template.docx';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    const toggleGroup = (key: string) => {
        setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const addField = (field: FieldOption) => {
        if (!usedFields.some(f => f.path === field.path)) {
            setUsedFields([...usedFields, field]);
        }
    };

    const removeField = (path: string) => {
        setUsedFields(usedFields.filter(f => f.path !== path));
        setRequiredFields(prev => {
            const next = new Set(prev);
            next.delete(path);
            return next;
        });
    };

    const toggleRequired = (path: string) => {
        setRequiredFields(prev => {
            const next = new Set(prev);
            if (next.has(path)) {
                next.delete(path);
            } else {
                next.add(path);
            }
            return next;
        });
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (f && f.name.endsWith('.docx')) {
            setFile(f);
            setFileName(f.name);
        }
    };

    const renderFieldGroup = (group: { key: string; title: string; fields: FieldOption[] }) => (
        <div className={styles.fieldGroup} key={group.key}>
            <div
                className={styles.groupHeader}
                onClick={() => toggleGroup(group.key)}
            >
                <div className={styles.groupTitle}>
                    <span className={styles.groupIcon}>
                        {expandedGroups[group.key] ? '▼' : '▶'}
                    </span>
                    {group.title}
                    <span className={styles.fieldsCount}>[ {group.fields.length} ]</span>
                </div>
            </div>
            {expandedGroups[group.key] && (
                <div className={styles.fieldsList}>
                    {group.fields.map(field => (
                        <div
                            key={field.path}
                            className={styles.fieldItem}
                            onClick={() => addField(field)}
                        >
                            <div className={styles.fieldMain}>
                                <span className={styles.fieldLabel}>{field.label}</span>
                                <span className={styles.fieldSource}>{field.source}</span>
                            </div>
                            <div className={styles.fieldPath}>{field.path}</div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    if (isLoading) {
        return (
            <div className={styles.loadingContainer}>
                <div className={styles.loadingSpinner}></div>
                <p>Загрузка шаблона...</p>
            </div>
        );
    }

    return (
        <div className={styles.editorContainer}>
            {/* Заголовок */}
            <div className={styles.pageHeader}>
                <div className={styles.headerLeft}>
                    <FilledColorButton
                        width='150px'
                        mainColor="#FFFFFF"
                        additionalColor="#e74c3c"
                        onClick={() => window.history.back()}
                    >
                        Назад
                    </FilledColorButton>
                    <h1>{templateId ? 'Редактирование шаблона' : 'Создание нового шаблона'}</h1>
                    {templateId && <span className={styles.templateId}>ID: {templateId}</span>}
                </div>
                <div className={styles.headerRight}>
                    <FilledColorButton
                        width='150px'
                        mainColor="#ffffff"
                        additionalColor="#f39c12"
                        onClick={handleSave}
                    >
                        Сохранить
                    </FilledColorButton>
                </div>
            </div>

            <div className={styles.mainContent}>
                {/* Левая панель - JSON Schema с ресайзом */}
                <div
                    className={styles.schemaPanel}
                    style={{ width: `${schemaWidth}px` }}
                >
                    <div className={styles.panelHeader}>
                        <h3>JSON Schema</h3>
                    </div>
                    <div className={styles.panelContent}>
                        {jsonSchema ? (
                            <pre className={styles.jsonSchema}>
                                {JSON.stringify(JSON.parse(jsonSchema), null, 2)}
                            </pre>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>Схема не загружена</p>
                            </div>
                        )}
                    </div>

                    <div
                        className={styles.resizeHandle}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startWidth = schemaWidth;

                            const onMouseMove = (e: MouseEvent) => {
                                const newWidth = Math.max(200, Math.min(800, startWidth + (e.clientX - startX)));
                                setSchemaWidth(newWidth);
                            };

                            const onMouseUp = () => {
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            };

                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                        }}
                    />
                </div>

                {/* Центральная панель - доступные свойства и управление */}
                <div className={styles.centerPanel}>
                    {/* Доступные свойства */}
                    <div className={styles.availableFields}>
                        <div className={styles.panelHeader}>
                            <h3>Доступные свойства</h3>
                        </div>
                        <div className={styles.panelContent}>
                            {fieldGroups.length > 0 ? (
                                <div className={styles.fieldGroups}>
                                    {fieldGroups.map(renderFieldGroup)}
                                </div>
                            ) : (
                                <div className={styles.emptyState}>
                                    <p>Нет доступных свойств</p>
                                    <small>Загрузите шаблон чтобы увидеть доступные свойства</small>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Правая часть центральной панели - свойства печати */}
                    <div className={styles.printProperties}>
                        {/* СТАРЫЙ Шаблон документа */}


                        {/* Используемые свойства */}
                        <div className={styles.usedFieldsCard}>
                            <div className={styles.panelHeader}>
                                <h3>
                                    Используемые свойства
                                    {usedFields.length > 0 && (
                                        <span className={styles.fieldsCount}>[ {usedFields.length} ]</span>
                                    )}
                                </h3>
                            </div>
                            <div className={styles.templateCard}>


                                <div
                                    className={styles.cardHeader}
                                    onClick={() => setIsTemplateCollapsed(!isTemplateCollapsed)}
                                >
                                    <h4>
                                        <span className={styles.cardIcon}>
                                            {isTemplateCollapsed ? '▶' : '▼'}
                                        </span>
                                        Шаблон документа
                                    </h4>
                                </div>
                                {!isTemplateCollapsed && (
                                    <div className={styles.cardContent}>
                                        {file ? (
                                            <div className={styles.fileSection}>
                                                <div className={styles.filePreview}>
                                                    <div className={styles.fileIcon}>🖨️</div>
                                                    <div className={styles.fileInfo}>
                                                        <div className={styles.fileName}>{fileName}</div>
                                                        <div className={styles.fileSize}>
                                                            {(file.size / 1024 / 1024).toFixed(2)} MB
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className={styles.fileActions}>
                                                    <FilledColorButton
                                                        mainColor="#ffffff"
                                                        additionalColor="#f39c12"
                                                        onClick={() => document.getElementById('fileInput')?.click()}
                                                    >
                                                        Заменить
                                                    </FilledColorButton>
                                                    <FilledColorButton
                                                        onClick={handleFileDownload}
                                                    >
                                                        Скачать
                                                    </FilledColorButton>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className={styles.fileUpload}>
                                                <div className={styles.uploadPlaceholder}>
                                                    <div className={styles.uploadIcon}>📎</div>
                                                    <p>Перетащите .docx файл или</p>
                                                    <FilledColorButton
                                                        width='140px'
                                                        mainColor="#FFFFFF"
                                                        additionalColor="#3498db"
                                                        onClick={() => document.getElementById('fileInput')?.click()}
                                                    >
                                                        Выбрать файл
                                                    </FilledColorButton>
                                                </div>
                                                <input
                                                    id="fileInput"
                                                    type="file"
                                                    accept=".docx"
                                                    onChange={handleFileChange}
                                                    style={{ display: 'none' }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                            <div className={styles.cardContent}>
                                {usedFields.length > 0 ? (
                                    <div className={styles.usedFieldsList}>
                                        {usedFields.map(field => (
                                            <div
                                                key={field.path}
                                                className={`${styles.usedFieldItem} ${requiredFields.has(field.path) ? styles.required : ''}`}
                                            >
                                                <div className={styles.fieldInfo}>
                                                    <div className={styles.fieldLabel}>{field.label}</div>
                                                    <div className={styles.fieldPath}>{field.path}</div>
                                                </div>
                                                <div className={styles.fieldActions}>
                                                    <label className={styles.requiredToggle}>
                                                        <input
                                                            type="checkbox"
                                                            checked={requiredFields.has(field.path)}
                                                            onChange={() => toggleRequired(field.path)}
                                                        />
                                                        <span>Обязательное</span>
                                                    </label>
                                                    <button
                                                        onClick={() => removeField(field.path)}
                                                        className={styles.removeButton}
                                                        // disabled={controlsCount <= 1}
                                                        title="Удалить поле"
                                                    >
                                                        ×
                                                    </button>

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className={styles.emptyState}>
                                        <p>Нет выбранных свойств</p>
                                        <small>Добавьте свойства из левой панели</small>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Правая панель - предпросмотр с ресайзом */}
                <div
                    className={styles.previewPanel}
                    style={{ width: `${previewWidth}px` }}
                >
                    <div
                        className={styles.resizeHandle}
                        onMouseDown={(e) => {
                            e.preventDefault();
                            const startX = e.clientX;
                            const startWidth = previewWidth;

                            const onMouseMove = (e: MouseEvent) => {
                                const newWidth = Math.max(200, Math.min(800, startWidth - (e.clientX - startX)));
                                setPreviewWidth(newWidth);
                            };

                            const onMouseUp = () => {
                                document.removeEventListener('mousemove', onMouseMove);
                                document.removeEventListener('mouseup', onMouseUp);
                            };

                            document.addEventListener('mousemove', onMouseMove);
                            document.addEventListener('mouseup', onMouseUp);
                        }}
                    />

                    <div className={styles.panelHeader}>
                        <h3>Предпросмотр</h3>
                    </div>

                    <div className={styles.panelContent}>
                        {file ? (
                            <div className={styles.previewContent}>
                                <div className={styles.previewHeader}>
                                </div>
                                <div className={styles.previewPlaceholder}>
                                    <p>Не реализовано</p>
                                    <div className={styles.previewActions}>
                                        <FilledColorButton
                                            width='180px'
                                            mainColor="#FFFFFF"
                                            additionalColor="#3498db"
                                            onClick={handleFileDownload}
                                        >
                                            Зачем козе баян?
                                        </FilledColorButton>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className={styles.emptyState}>
                                <p>Нет файла для просмотра</p>
                                <small>Загрузите .docx файл</small>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReportTemplateEditorPage;