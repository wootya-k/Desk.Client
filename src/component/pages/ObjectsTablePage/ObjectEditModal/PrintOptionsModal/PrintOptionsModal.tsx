import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import styles from './ObjectEditModal.module.css';
import printStyles from './PrintOptionsModal.module.css'; // Новый файл стилей
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';


interface PrintOptionsModalProps {
    onOption1: () => void;
    onOption2: () => void;
    onCancel: () => void;
}

const PrintOptionsModal: React.FC<PrintOptionsModalProps> = ({
    onOption1,
    onOption2,
    onCancel
}) => {
    return (
        <div className={printStyles.modalBackdrop} onClick={onCancel}>
            <article className={printStyles.modalContent} onClick={(e) => e.stopPropagation()}>
                <h2 className={printStyles.modalTitle}>Зафиксировать печать печати в системе контроля</h2>

                <div className={printStyles.modalActions}>
                    <FilledColorButton onClick={onOption1}
                        mainColor="#FFFFFF"
                        additionalColor="#699"
                    >
                        Зафиксировать
                    </FilledColorButton>

                    <FilledColorButton onClick={onOption2}>
                        Отладка
                    </FilledColorButton>

                    <FilledColorButton
                        onClick={onCancel}
                        mainColor="#FFFFFF"
                        additionalColor="#e74c3c"
                    >
                        Отмена
                    </FilledColorButton>
                </div>

            </article>
        </div>
    );
};

export default PrintOptionsModal;