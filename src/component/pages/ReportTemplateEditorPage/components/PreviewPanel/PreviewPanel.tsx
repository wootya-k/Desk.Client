import React from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import styles from './PreviewPanel.module.css';

interface PreviewPanelProps {
  file: File | null;
  onFileDownload: () => void;
}

const PreviewPanel: React.FC<PreviewPanelProps> = ({ file, onFileDownload }) => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3>Предпросмотр</h3>
      </div>
      <div className={styles.content}>
        {file ? (
          <div className={styles.previewContent}>
            <div className={styles.previewPlaceholder}>
              <p>Предпросмотр документа в разработке</p>
              <div className={styles.previewActions}>
                <FilledColorButton
                  width='180px'
                  mainColor="#FFFFFF"
                  additionalColor="#3498db"
                  onClick={onFileDownload}
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
  );
};

export default PreviewPanel;