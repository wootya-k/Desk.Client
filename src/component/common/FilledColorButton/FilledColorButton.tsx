import React, { FC, useState } from 'react';
import styles from './FilledColorButton.module.css';

interface FilledColorButtonProps {
  height?: string;
  width?: string;
  mainColor?: string;
  additionalColor?: string;
  disabledColor?: string;
  onClick: () => void;
  children: React.ReactNode;
  disabled?: boolean;
}

const FilledColorButton: FC<FilledColorButtonProps> = ({
  height = '44px',
  width = '130px',
  mainColor = '#ffffff',
  additionalColor = '#3498db',
  disabledColor = '#f1f1f1ff',
  onClick,
  children,
  disabled = false,
}) => {
  const [tooltip, setTooltip] = useState<{ x: number; y: number; content: string } | null>(null);

  const handleClick = () => {
    if (!disabled) {
      onClick();
    }
  };

  const handleMouseEnter = (e: React.MouseEvent) => {
    if (typeof children === 'string' && children.length > 20) {
      setTooltip({
        x: e.clientX,
        y: e.clientY,
        content: children,
      });
    }
  };

  const handleMouseLeave = () => {
    setTooltip(null);
  };

  const displayText = typeof children === 'string' 
    ? children.length > 20 
      ? children.slice(0, 20)
      : children
    : children;

  const isTextLong = typeof children === 'string' && children.length > 20;

  return (
    <>
      <button
        className={`${styles.button} ${isTextLong ? styles.textLong : ''}`}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        disabled={disabled}
        style={{
          ['--main-color' as string]: disabled ? disabledColor : mainColor,
          ['--hover-color' as string]: additionalColor,
          height,
          width,
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <span className={styles.textContent}>
          {displayText}
        </span>
        {isTextLong && <div className={styles.fadeOverlay} />}
      </button>

      {tooltip && (
        <div 
          className={styles.tooltip}
          style={{
            left: tooltip.x + 10,
            top: tooltip.y + 10,
          }}
        >
          {tooltip.content}
        </div>
      )}
    </>
  );
};

export default FilledColorButton;