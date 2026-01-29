// @commons/JsonSchemaPreview/JsonSchemaPreview.tsx

import React from 'react';
import styles from './JsonSchemaPreview.module.css';

interface JsonSchemaPreviewProps {
  schema: Record<string, unknown> | null;
}

const JsonSchemaPreview: React.FC<JsonSchemaPreviewProps> = ({ schema }) => {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>JSON Schema</h3>
      <pre className={styles.code}>
        {schema ? JSON.stringify(schema, null, 2) : '{}'}
      </pre>
    </div>
  );
};

export default JsonSchemaPreview;