import React, { useState, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import JsonSchemaPanel from './components/JsonSchemaPanel/JsonSchemaPanel';
import FieldExplorerPanel from './components/FieldExplorerPanel/FieldExplorerPanel';
import UsedPropertiesPanel from './components/UsedPropertiesPanel/UsedPropertiesPanel';
import PreviewPanel from './components/PreviewPanel/PreviewPanel';
import { useTemplateEditor } from './hooks/useTemplateEditor';
import styles from './ReportTemplateEditorPage.module.css';

const ReportTemplateEditorPage: React.FC = () => {
  const { templateId } = useParams<{ templateId?: string }>();
  const {
    file,
    fileName,
    usedFields,
    fieldGroups,
    expandedGroups,
    requiredFields,
    jsonSchema,
    isLoading,
    addField,
    removeField,
    toggleRequired,
    toggleGroup,
    handleFileChange,
    handleSave,
  } = useTemplateEditor({ templateId });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [isTemplateCollapsed, setIsTemplateCollapsed] = useState(true);
  
  // Состояние ширины панелей
  const [widths, setWidths] = useState({
    schema: 300,
    available: 300,
    used: 300,
    preview: 300
  });
  
  // Состояние видимости панелей
  const [visiblePanels, setVisiblePanels] = useState({
    schema: true,
    preview: true
  });
  
  // Минимальные ширин
  const MIN_WIDTHS = {
    schema: 250,
    available: 250,
    used: 250,
    preview: 320
  };
  
  // Адаптивность
  useEffect(() => {
    const handleResize = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const totalMinWidth = MIN_WIDTHS.schema + MIN_WIDTHS.available + MIN_WIDTHS.used + MIN_WIDTHS.preview;
      
      // Если места не хватает для всех панелей
      if (containerWidth < totalMinWidth) {
        // Сначала скрываем preview
        if (containerWidth < MIN_WIDTHS.schema + MIN_WIDTHS.available + MIN_WIDTHS.used + MIN_WIDTHS.preview) {
          setVisiblePanels(prev => ({ ...prev, preview: false }));
        }
        // Затем скрываем schema
        if (containerWidth < MIN_WIDTHS.available + MIN_WIDTHS.used + MIN_WIDTHS.preview) {
          setVisiblePanels(prev => ({ ...prev, schema: false }));
        }
      } else {
        // Если места достаточно, показываем все панели
        setVisiblePanels({ schema: true, preview: true });
      }
      
      // Перераспределяем ширину между видимыми панелями
      const visibleCount = 2 + (visiblePanels.schema ? 1 : 0) + (visiblePanels.preview ? 1 : 0);
      if (visibleCount > 0) {
        const newWidth = containerWidth / visibleCount;
        setWidths(prev => ({
          schema: visiblePanels.schema ? Math.min(400, Math.max(MIN_WIDTHS.schema, newWidth)) : prev.schema,
          available: Math.min(400, Math.max(MIN_WIDTHS.available, newWidth)),
          used: Math.min(400, Math.max(MIN_WIDTHS.used, newWidth)),
          preview: visiblePanels.preview ? Math.min(400, Math.max(MIN_WIDTHS.preview, newWidth)) : prev.preview
        }));
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();
    return () => window.removeEventListener('resize', handleResize);
  }, [visiblePanels]);
  
  const handleFileDownload = () => {
    if (file) {
      const url = URL.createObjectURL(file);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName || 'template.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };
  
  // Функция для ресайзинга
  const startResize = (panel: 'schema' | 'available' | 'used', direction: 'left' | 'right') => {
    return (e: React.MouseEvent) => {
      e.preventDefault();
      const startX = e.clientX;
      const startWidths = { ...widths };
      
      const onMouseMove = (e: MouseEvent) => {
        const deltaX = e.clientX - startX;
        let newWidths = { ...widths };
        
        switch (panel) {
          case 'schema':
            // Ресайз между 1 и 2 панелями
            newWidths.schema = Math.max(MIN_WIDTHS.schema, Math.min(400, startWidths.schema + deltaX));
            break;
          case 'available':
            // Ресайз между 2 и 3 панелями
            newWidths.available = Math.max(MIN_WIDTHS.available, Math.min(400, startWidths.available + deltaX));
            break;
          case 'used':
            // Ресайз между 3 и 4 панелями
            newWidths.used = Math.max(MIN_WIDTHS.used, Math.min(400, startWidths.used + deltaX));
            newWidths.preview = Math.max(MIN_WIDTHS.preview, Math.min(400, startWidths.preview - deltaX));
            break;
        }
        
        setWidths(newWidths);
      };
      
      const onMouseUp = () => {
        document.removeEventListener('mousemove', onMouseMove);
        document.removeEventListener('mouseup', onMouseUp);
      };
      
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    };
  };
  
  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Загрузка шаблона...</p>
      </div>
    );
  }
  
  // Вычисляем реальные ширины с учетом видимости
  const actualWidths = {
    schema: visiblePanels.schema ? widths.schema : 0,
    available: widths.available,
    used: widths.used,
    preview: visiblePanels.preview ? widths.preview : 0
  };
  
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
      
      {/* Основной контент с CSS Grid */}
      <div 
        ref={containerRef}
        className={styles.gridContainer}
        style={{
          gridTemplateColumns: `
            ${visiblePanels.schema ? `${actualWidths.schema}px` : '0px'}
            ${actualWidths.available}px
            ${actualWidths.used}px
            ${visiblePanels.preview ? `${actualWidths.preview}px` : '0px'}
          `
        }}
      >
        {/* 1. JSON Schema */}
        {visiblePanels.schema && (
          <div className={`${styles.panel} ${styles.schemaPanel}`}>
            <JsonSchemaPanel jsonSchema={jsonSchema} />
          </div>
        )}
        
        {/* Разделитель между 1 и 2 колонками */}
        {visiblePanels.schema && (
          <div 
            className={styles.resizeHandle}
            onMouseDown={startResize('schema', 'right')}
          />
        )}
        
        {/* 2. Доступные свойства */}
        <div className={`${styles.panel} ${styles.availablePanel}`}>
          <FieldExplorerPanel
            fieldGroups={fieldGroups}
            expandedGroups={expandedGroups}
            onToggleGroup={toggleGroup}
            onAddField={addField}
          />
        </div>
        
        {/* Разделитель между 2 и 3 колонками */}
        <div 
          className={styles.resizeHandle}
          onMouseDown={startResize('available', 'right')}
        />
        
        {/* 3. Используемые свойства с шаблоном документа */}
        <div className={`${styles.panel} ${styles.usedPanel}`}>
          <UsedPropertiesPanel
            file={file}
            fileName={fileName}
            usedFields={usedFields}
            requiredFields={requiredFields}
            isTemplateCollapsed={isTemplateCollapsed}
            onToggleTemplateCollapse={() => setIsTemplateCollapsed(!isTemplateCollapsed)}
            onRemoveField={removeField}
            onToggleRequired={toggleRequired}
            onFileChange={handleFileChange}
            onFileDownload={handleFileDownload}
          />
        </div>
        
        {/* Разделитель между 3 и 4 колонками */}
        {visiblePanels.preview && (
          <div 
            className={styles.resizeHandle}
            onMouseDown={startResize('used', 'right')}
          />
        )}
        
        {/* 4. Предпросмотр */}
        {visiblePanels.preview && (
          <div className={`${styles.panel} ${styles.previewPanel}`}>
            <PreviewPanel file={file} onFileDownload={handleFileDownload} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportTemplateEditorPage;