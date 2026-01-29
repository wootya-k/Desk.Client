import React, { useState } from 'react';
import FilledColorButton from '../FilledColorButton/FilledColorButton';
import GearIcon from '@icons/GearIcon';

interface GearButtonProps {
    size?: number;
    onClick: () => void;
    height?: string;
    width?: string;
    strokeWidth?: number;
  }
  
  const GearButton: React.FC<GearButtonProps> = ({
    size = 25,
    onClick,
    height = "40px",
    width = "40px",
    strokeWidth = 3,
  }) => {
  const [isHovered, setIsHovered] = useState(false);
  const handleMouseEnter = () => {
    setIsHovered(true);
};

const handleMouseLeave = () => {
    setIsHovered(false);
};

return (
    <div onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <FilledColorButton
            mainColor="#FFFFFF"
            additionalColor="#699"
            onClick={onClick}
            height={height}
            width={width}
        >
            {isHovered ? (
                <GearIcon size={size} strokeWidth={strokeWidth} color="#FFFFFF" />
            ) : (
                <GearIcon size={size} strokeWidth={strokeWidth} color="#699" />
            )}
        </FilledColorButton>
    </div>
  );
};

export default GearButton;