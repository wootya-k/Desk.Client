import React, { useState } from 'react';
import FilledColorButton from '../FilledColorButton/FilledColorButton';
import GearIcon from '@icons/GearIcon';

interface GearButtonProps {
    size?: number;
    onClick: () => void;
    height?: string;
    width?: string;
    strokeWidth?: number;
    mainColor?: string;
    additionalColor?: string;
    disabled?: boolean;
}

const GearButton: React.FC<GearButtonProps> = ({
    size = 25,
    onClick,
    height = "50px",
    width = "50px",
    mainColor = "#FFFFFF",
    additionalColor = "#699",
    strokeWidth = 3,
    disabled = false
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
                mainColor={mainColor}
                additionalColor={additionalColor}
                onClick={onClick}
                height={height}
                width={width}
                disabled={disabled}
            >
                {isHovered ? (
                    <GearIcon size={size} strokeWidth={strokeWidth} color={mainColor} />
                ) : (
                    <GearIcon size={size} strokeWidth={strokeWidth} color={additionalColor} />
                )}
            </FilledColorButton>
        </div>
    );
};

export default GearButton;