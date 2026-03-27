import React, { useState } from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import RestoreIcon from '@icons/RestoreIcon';
import styles from './StatusFilterButton.module.css';

interface RestoreButtonProps {
  size?: number;
  onClick: () => void;
  height?: string;
  width?: string;
}

const RestoreButton: React.FC<RestoreButtonProps> = ({ 
  size = 26, 
  onClick, 
  height = "40px", 
  width = "40px" 
}) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      onMouseEnter={() => setIsHovered(true)} 
      onMouseLeave={() => setIsHovered(false)}
    >
      <FilledColorButton
        mainColor="#FFFFFF"
        additionalColor="#ee7300ff"
        onClick={onClick}
        height={height}
        width={width}
      >
        {isHovered ? (
          <RestoreIcon size={size} color="#FFFFFF" />
        ) : (
          <RestoreIcon size={size} color="#ee7300ff" />
        )}
      </FilledColorButton>
    </div>
  );
};

export default RestoreButton;