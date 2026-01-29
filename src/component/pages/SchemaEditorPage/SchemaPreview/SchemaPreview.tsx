import React from 'react';
import styles from './SchemaPreview.module.css';

interface SchemaPreviewProps {
    title: string;
    schema: any;
    isValid: boolean | null;
}

const SchemaPreview: React.FC<SchemaPreviewProps> = ({
    schema,
    isValid
}) => {
    return (
         <div className={styles.previewPanel}>
            <pre className={`${styles.previewPre} ${isValid === false ? styles.invalid : ''}`}>{JSON.stringify(schema, null, 2)}</pre>
        </div>
    );
};

export default SchemaPreview;