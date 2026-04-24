import React, { useState } from 'react';
import styles from './SchemaPreview.module.css';

interface SchemaPreviewProps {
    title: string;
    schema: any;
    isValid: boolean | null;
}

const SchemaPreview: React.FC<SchemaPreviewProps> = ({ schema, isValid }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = async () => {
        const jsonText = JSON.stringify(schema, null, 2);
        try {
            await navigator.clipboard.writeText(jsonText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Не удалось скопировать:', err);
        }
    };

    return (
        <div className={styles.previewPanel}>
            <button
                className={styles.copyBtn}
                onClick={handleCopy}
                title="Скопировать JSON"
            >
                {copied ? '✓ Успешно' : 'Копировать'}
            </button>
            
            <pre className={`${styles.previewPre} ${isValid === false ? styles.invalid : ''}`}>
                {JSON.stringify(schema, null, 2)}
            </pre>
        </div>
    );
};

export default SchemaPreview;