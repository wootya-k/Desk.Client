import React, { FC } from 'react';

interface TrashIconProps {
  color?: string;
  size?: number;
  className?: string;
}

const TrashIcon: FC<TrashIconProps> = ({ color = "black", size = 24, className }) => {
  const svgStyle = {
    width: size,
    height: size,
  };

  const STROKE_WIDTH = 50; // Определяем константу для толщины контура

  return (
    <svg
      aria-hidden="true"
      version="1.1"
      id="Capa_1"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
      x="0px"
      y="0px"
      width={size}
      height={size}
      viewBox="0 0 750 750"
      xmlSpace="preserve"
      style={svgStyle}
      className={className}
    >
      <g>
        <g>
          <g>
            {/* Основание корзины */}
            <path
              d="M188.162,210.636 L188.162,669.516 C188.162,688.83,204.084,704.752,223.4,704.752 L526.6,704.752 C545.916,704.752,561.838,688.83,561.838,669.516 L561.838,210.636"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Левая стойка */}
            <path
              d="M279.866,224.986 L279.866,630.056"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Центральная стойка */}
            <path
              d="M376.323,224.986 L376.323,630.056"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Правая стойка */}
            <path
              d="M472.803,224.986 L472.803,630.056"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Крышка корзины */}
            <path
              d="M261.806,70.323 C261.806,51.009,277.728,35.087,297.042,35.087 L452.958,35.087 C472.272,35.087,488.194,51.009,488.194,70.323"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
            {/* Верхняя планка */}
            <path
              d="M99.782,131.238 L658.876,131.238"
              stroke={color}
              strokeWidth={STROKE_WIDTH}
              fill="none"
            />
          </g>
        </g>
      </g>
    </svg>
  );
};

export default TrashIcon;
