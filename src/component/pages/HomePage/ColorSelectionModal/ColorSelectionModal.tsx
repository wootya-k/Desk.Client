import React, { useState } from 'react';
import styles from './ColorSelectionModal.module.css';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface ColorSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onColorSelect: (color: string) => void;
}

const DEFAULT_COLORS = [
    '#3498db', '#e74c3c', '#2ecc71', '#f39c12', 
    '#9b59b6', '#1abc9c', '#34495e', '#d35400',
    '#27ae60', '#8e44ad', '#c0392b', '#f1c40f',
    '#16a085', '#2980b9', '#e67e22', '#7f8c8d'
];

const ColorSelectionModal: React.FC<ColorSelectionModalProps> = ({ 
    isOpen, 
    onClose, 
    onColorSelect 
}) => {
    const [selectedColor, setSelectedColor] = useState(DEFAULT_COLORS[0]);

    if (!isOpen) return null;

    const handleSubmit = () => {
        onColorSelect(selectedColor);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h3>Выберите цвет для новой панели</h3>
                
                <div className={styles.colorGrid}>
                    {DEFAULT_COLORS.map(color => (
                        <button
                            key={color}
                            type="button"
                            className={`${styles.colorOption} ${
                                selectedColor === color ? styles.selected : ''
                            }`}
                            style={{ backgroundColor: color }}
                            onClick={() => setSelectedColor(color)}
                        />
                    ))}
                </div>

                <div className={styles.selectedColorPreview}>
                    <div 
                        className={styles.previewColor}
                        style={{ backgroundColor: selectedColor }}
                    />
                    <span>Выбранный цвет: {selectedColor}</span>
                </div>

                <div className={styles.buttons}>
                    <FilledColorButton
                        onClick={handleSubmit}
                        width="120px"
                    >
                        Создать
                    </FilledColorButton>
                    <FilledColorButton
                        onClick={onClose}
                        mainColor="#e0e0e0"
                        additionalColor="#b0b0b0"
                        width="120px"
                    >
                        Отмена
                    </FilledColorButton>
                </div>
            </div>
        </div>
    );
};

export default ColorSelectionModal;