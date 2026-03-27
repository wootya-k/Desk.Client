import React, { useState } from 'react';
import FilledColorButton from '../FilledColorButton/FilledColorButton';
import ViewIcon from '@icons/ViewIcon';

interface ViewButtonProps {
  size?: number;
  onClick: () => void;
  height?: string;
  width?: string;
}

const ViewButton: React.FC<ViewButtonProps> = ({ size = 26, onClick, height = "40px", width = "1px" }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div onMouseEnter={() => setIsHovered(true)} onMouseLeave={() => setIsHovered(false)}>
      <FilledColorButton
        mainColor="#FFFFFF"
        additionalColor="#3498db"
        onClick={onClick}
        height={height}
        width={width}
      >
        {isHovered ? (
          <ViewIcon size={size} color="#FFFFFF" />
        ) : (
          <ViewIcon size={size} color="#3498db" />
        )}
      </FilledColorButton>
    </div>
  );
};

export default ViewButton;