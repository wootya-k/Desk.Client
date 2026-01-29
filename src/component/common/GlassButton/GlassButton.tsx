import React, { FC } from 'react';
import styles from './GlassButton.module.css';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  isLoading?: boolean;
  children: React.ReactNode;
}

const GlassButton: FC<GlassButtonProps> = ({ 
  isLoading = false, 
  children, 
  disabled, 
  className,
  ...props 
}) => {
  return (
    <button
      className={`${styles.glassBtn} ${className || ''}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? (
        <span className={styles.loaderWrapper}>
          <span className={styles.spinner}></span>
          Вход...
        </span>
      ) : (
        children
      )}
    </button>
  );
};

export default GlassButton;
