import React from 'react';
import styles from './JsonSchemaPanel.module.css';

interface JsonSchemaPanelProps {
  jsonSchema: string;
}

const JsonSchemaPanel: React.FC<JsonSchemaPanelProps> = ({ jsonSchema }) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>JSON Schema</h3>
      </div>
      <div className={styles.content}>
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
    </div>
  );
};

export default JsonSchemaPanel;