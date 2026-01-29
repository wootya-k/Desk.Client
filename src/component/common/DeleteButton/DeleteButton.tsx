import React, { useState } from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import TrashIcon from '@icons/TrashIcon';

interface DeleteButtonProps {
  size?: number;
  onClick: () => void;
  height?: string;
  width?: string;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ size = 25, onClick, height = "40px", width = "40px" }) => {
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

export default DeleteButton;