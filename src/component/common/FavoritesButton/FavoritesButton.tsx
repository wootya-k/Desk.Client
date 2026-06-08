import React, { useState } from 'react';
import FilledColorButton from '@commons/FilledColorButton/FilledColorButton';

interface FavoritesButtonProps {
  size?: number;
  onClick?: () => void;
  height?: string;
  width?: string;
  mainColor?: string;
  additionalColor?: string;
  strokeWidth?: number;
  disabled?: boolean;
}

const FavoritesButton: React.FC<FavoritesButtonProps> = ({
  size = 25,
  onClick,
  height = "40px",
  width = "40px",
  mainColor = "#FFFFFF",
  additionalColor = "#f39c12",
  strokeWidth = 3,
  disabled = false,
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
        onClick={onClick || (() => {})}
        height={height}
        width={width}
        disabled={disabled}
      >
        <svg
          viewBox="0 0 48 48"
          width={size}
          height={size}
        >
          {/* Градиент оставляем как есть, он создает эффект "золотой" звезды */}
          <linearGradient id="SVGID_1_" x1="38.074" x2="9.629" y1="9.752" y2="38.198" gradientUnits="userSpaceOnUse">

          </linearGradient>
          <path fill="url(#SVGID_1_)" d="M41.826,26.846l2.5-4.89l-4.957-1.432l-2.87-4.786V8.946c0-1.062-0.914-1.93-2.031-1.93H13.271	c-1.117,0-2.031,0.868-2.031,1.93v30.108c0,1.544,1.92,2.509,3.233,1.544l8.791-6.079c0.404-0.289,0.909-0.289,1.213,0l8.791,5.983	c1.415,0.965,3.233,0,3.233-1.544v-8.914l5.877,0.283L41.826,26.846z"/>
          <path fill="none" stroke={isHovered ? mainColor : additionalColor} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth={strokeWidth} d="M11.5,14.83V8.4c0-1.1,0.9-2,2-2h21c1.1,0,2,0.9,2,2v3.366"/>
          <path fill="none" stroke={isHovered ? mainColor : additionalColor} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth={strokeWidth} d="M36.5,35.596V39.5c0,1.6-1.8,2.6-3.2,1.6l-8.7-6.2c-0.3-0.3-0.8-0.3-1.2,0l-8.7,6.3c-1.3,1-3.2,0-3.2-1.6	l0-19.076"/>
          <path fill="none" stroke={isHovered ? mainColor : additionalColor} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth={strokeWidth} d="M35.726,30.259l-3.104,1.574c-1.085,0.55-2.353-0.331-2.167-1.506l0.551-3.48 c0.072-0.457-0.083-0.92-0.421-1.247l-2.398-2.329c-0.865-0.84-0.381-2.279,0.829-2.459l1.921-0.287"/>
          <path fill="none" stroke={isHovered ? mainColor : additionalColor} strokeLinecap="round" strokeLinejoin="round" strokeMiterlimit="10" strokeWidth={strokeWidth} d="M35.081,16.802c0.551-1.07,2.121-1.07,2.671,0l1.385,2.69c0.217,0.421,0.63,0.713,1.109,0.785l3.57,0.534 c1.209,0.181,1.694,1.619,0.829,2.459L42.247,25.6c-0.336,0.327-0.493,0.79-0.421,1.247l0.551,3.48"/>
        </svg>
      </FilledColorButton>
    </div>
  );
};

export default FavoritesButton;