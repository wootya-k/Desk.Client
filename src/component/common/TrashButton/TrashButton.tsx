import React, { useState } from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import TrashIcon from '@icons/TrashIcon';

interface TrashButtonProps {
  size?: number;
  onClick: () => void;
  height?: string;
  width?: string;
}

const TrashButton: React.FC<TrashButtonProps> = ({ size = 26, onClick, height = "40px", width = "1px" }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <FilledColorButton
        mainColor="#FFFFFF"
        additionalColor="#e74c3c"
        onClick={onClick}
        height={height}
        width={width}
      >
        {isHovered ? (
          <TrashIcon size={size} color="#FFFFFF" />
        ) : (
          <TrashIcon size={size} color="#e74c3c" />
        )}
      </FilledColorButton>
    </div>
  );
};

export default TrashButton;