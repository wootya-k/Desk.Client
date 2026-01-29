import React from 'react';
import { FieldOption } from '@services/ReportTemplateService';
import { FieldGroup } from '../../types';
import styles from './FieldExplorerPanel.module.css';

interface FieldExplorerPanelProps {
  fieldGroups: FieldGroup[];
  expandedGroups: Record<string, boolean>;
  onToggleGroup: (key: string) => void;
  onAddField: (field: FieldOption) => void;
}

const FieldExplorerPanel: React.FC<FieldExplorerPanelProps> = ({
  fieldGroups,
  expandedGroups,
  onToggleGroup,
  onAddField
}) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Доступные свойства</h3>
      </div>
      <div className={styles.content}>
        {fieldGroups.length > 0 ? (
          <div className={styles.fieldGroups}>
            {fieldGroups.map(group => (
              <div className={styles.fieldGroup} key={group.key}>
                <div 
                  className={styles.groupHeader} 
                  onClick={() => onToggleGroup(group.key)}
                >
                  <div className={styles.groupTitle}>
                    <span className={styles.groupIcon}>
                      {expandedGroups[group.key] ? '▼' : '▶'}
                    </span>
                    {group.title}
                    <span className={styles.fieldsCount}>[{group.fields.length}]</span>
                  </div>
                </div>
                {expandedGroups[group.key] && (
                  <div className={styles.fieldsList}>
                    {group.fields.map(field => (
                      <div
                        key={field.path}
                        className={styles.fieldItem}
                        onClick={() => onAddField(field)}
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
            ))}
          </div>
        ) : (
          <div className={styles.emptyState}>
            <p>Нет доступных свойств</p>
            <small>Загрузите шаблон чтобы увидеть доступные свойства</small>
          </div>
        )}
      </div>
    </div>
  );
};

export default FieldExplorerPanel;