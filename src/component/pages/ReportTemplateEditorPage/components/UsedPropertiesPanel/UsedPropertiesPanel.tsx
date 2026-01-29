import React from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import styles from './UsedPropertiesPanel.module.css';
import { FieldOption } from '@services/ReportTemplateService';

interface UsedPropertiesPanelProps {
  file: File | null;
  fileName: string | null;
  usedFields: FieldOption[];
  requiredFields: Set<string>;
  isTemplateCollapsed: boolean;
  onToggleTemplateCollapse: () => void;
  onRemoveField: (path: string) => void;
  onToggleRequired: (path: string) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFileDownload: () => void;
}

const UsedPropertiesPanel: React.FC<UsedPropertiesPanelProps> = ({
  file,
  fileName,
  usedFields,
  requiredFields,
  isTemplateCollapsed,
  onToggleTemplateCollapse,
  onRemoveField,
  onToggleRequired,
  onFileChange,
  onFileDownload
}) => {
  return (
    <div className={styles.container}>
      {/* Шаблон документа - В НАЧАЛЕ */}
      <div className={styles.templateSection}>
        <div className={styles.cardHeader} onClick={onToggleTemplateCollapse}>
          <h4>
            <span className={styles.caretIcon}>
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
                  <FilledColorButton onClick={onFileDownload}>
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
                  onChange={onFileChange}
                  style={{ display: 'none' }}
                />
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Используемые свойства - ПОД ШАБЛОНОМ ДОКУМЕНТА */}
      <div className={styles.usedFieldsSection}>
        <div className={styles.cardHeader}>
          <h3>
            Используемые свойства
            {usedFields.length > 0 && (
              <span className={styles.fieldsCount}>[{usedFields.length}]</span>
            )}
          </h3>
        </div>
        <div className={styles.cardContent}>
          {usedFields.length > 0 ? (
            <div className={styles.usedFieldsList}>
              {usedFields.map(field => (
                <div
                  key={`${field.path}-${field.source}`}
                  className={`${styles.usedFieldItem} ${
                    requiredFields.has(field.path) ? styles.required : ''
                  }`}
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
                        onChange={() => onToggleRequired(field.path)}
                      />
                      <span>Обязательное</span>
                    </label>
                    <button
                      onClick={() => onRemoveField(field.path)}
                      className={styles.removeButton}
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
  );
};

export default UsedPropertiesPanel;