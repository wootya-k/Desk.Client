import React, { useState } from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';
import DeleteIcon from '@icons/DeleteIcon';

interface DeleteButtonProps {
  size?: number;
  onClick: () => void;
  height?: string;
  width?: string;
}

const DeleteButton: React.FC<DeleteButtonProps> = ({ 
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
        additionalColor="#d3213fff"
        onClick={onClick}
        height={height}
        width={width}
      >
        {isHovered ? (
          <DeleteIcon size={size} color="#FFFFFF" />
        ) : (
          <DeleteIcon size={size} color="#d3213fff" />
        )}
      </FilledColorButton>
    </div>
  );
};

export default DeleteButton;