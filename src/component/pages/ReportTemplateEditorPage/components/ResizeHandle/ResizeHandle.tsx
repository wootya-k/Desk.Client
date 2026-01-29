import React from 'react';
import styles from './ResizeHandle.module.css';

interface ResizeHandleProps {
  onMouseDown: (e: React.MouseEvent) => void;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onMouseDown }) => {
  return (
    <div 
      className={styles.resizeHandle}
      onMouseDown={onMouseDown}
    />
  );
};

export default ResizeHandle;