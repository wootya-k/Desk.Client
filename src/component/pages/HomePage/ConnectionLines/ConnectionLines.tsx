import React, { useRef, useEffect, useState } from 'react';
import { Connection } from '@models';

interface ConnectionLinesProps {
    connections: Connection[];
    panelPositions: Record<string, { x: number; y: number }>;
    groupedTypes: Record<string, any[]>;
    containerRef: React.RefObject<HTMLDivElement>;
}

const ConnectionLines: React.FC<ConnectionLinesProps> = ({
    connections,
    panelPositions,
    groupedTypes,
    containerRef
}) => {
    const svgRef = useRef<SVGSVGElement>(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: rect.width,
                    height: rect.height
                });
            }
        };

        updateDimensions();
        window.addEventListener('resize', updateDimensions);
        return () => window.removeEventListener('resize', updateDimensions);
    }, [containerRef]);

    const getElementPosition = (typeId: string, panelId: string) => {
        const panelPosition = panelPositions[panelId];
        if (!panelPosition) return null;

        const panelTypes = groupedTypes[panelId] || [];
        const typeIndex = panelTypes.findIndex(t => t.id === typeId);
        
        if (typeIndex === -1) return null;

        const itemTop = panelPosition.y + 44 + typeIndex * 44;
        const itemBottom = itemTop + 44;
        const itemLeft = panelPosition.x;
        const itemRight = panelPosition.x + 250;

        return {
            top: itemTop,
            bottom: itemBottom,
            left: itemLeft,
            right: itemRight,
            centerX: panelPosition.x + 125,
            centerY: itemTop + 22
        };
    };

    // Функция для создания пути с гарантированными горизонтальными сегментами по 50px
    const createPathWithGuaranteedHorizontal = (
        startX: number, 
        startY: number, 
        endX: number, 
        endY: number,
        startSide: 'left' | 'right',
        endSide: 'left' | 'right'
    ) => {
        const HORIZONTAL_MIN = 50; // Гарантированные 50px горизонтальных сегментов
        
        // Точки выхода с гарантированными 50px горизонтально
        const startExitX = startSide === 'right' ? startX + HORIZONTAL_MIN : startX - HORIZONTAL_MIN;
        
        // Точки входа с гарантированными 50px горизонтально
        const endEntryX = endSide === 'right' ? endX + HORIZONTAL_MIN : endX - HORIZONTAL_MIN;

        // Вычисляем промежуточные точки для обхода
        const verticalClearance = 100; // Отступ по вертикали чтобы линии не перекрывали панели
        
        // Определяем направление вертикального смещения
        const shouldGoDown = startY < endY ? startY + verticalClearance < endY : true;
        const midY = shouldGoDown ? 
            Math.max(startY, endY) + verticalClearance : 
            Math.min(startY, endY) - verticalClearance;

        // Строим путь с гарантированными горизонтальными сегментами
        if (startSide === 'right' && endSide === 'left') {
            // Соединение справа-налево
            if (startExitX <= endEntryX) {
                // Нормальный случай - достаточно места
                return `M ${startX} ${startY} 
                        H ${startExitX} 
                        V ${midY} 
                        H ${endEntryX}
                        V ${endY}
                        H ${endX}`;
            } else {
                // Недостаточно места - увеличиваем вертикальное смещение
                const extraVertical = 50;
                return `M ${startX} ${startY} 
                        H ${startExitX} 
                        V ${midY + extraVertical} 
                        H ${endEntryX}
                        V ${endY}
                        H ${endX}`;
            }
        } else if (startSide === 'left' && endSide === 'right') {
            // Соединение слева-направо
            if (startExitX >= endEntryX) {
                return `M ${startX} ${startY} 
                        H ${startExitX} 
                        V ${midY} 
                        H ${endEntryX}
                        V ${endY}
                        H ${endX}`;
            } else {
                const extraVertical = 50;
                return `M ${startX} ${startY} 
                        H ${startExitX} 
                        V ${midY + extraVertical} 
                        H ${endEntryX}
                        V ${endY}
                        H ${endX}`;
            }
        } else if (startSide === 'right' && endSide === 'right') {
            // Обе линии выходят справа
            return `M ${startX} ${startY} 
                    H ${startExitX} 
                    V ${midY} 
                    H ${endEntryX}
                    V ${endY}
                    H ${endX}`;
        } else {
            // Обе линии выходят слева
            return `M ${startX} ${startY} 
                    H ${startExitX} 
                    V ${midY} 
                    H ${endEntryX}
                    V ${endY}
                    H ${endX}`;
        }
    };

    return (
        <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{
                position: 'absolute',
                top: 0,
                left: 0,
                pointerEvents: 'none',
                zIndex: 5 // Под панелями
            }}
        >
            <defs>
                <marker
                    id="arrowhead"
                    markerWidth="10"
                    markerHeight="7"
                    refX="9"
                    refY="3.5"
                    orient="auto"
                >
                    <polygon
                        points="0 0, 10 3.5, 0 7"
                        fill="#3498db"
                    />
                </marker>
            </defs>
            
            {connections.map((connection, index) => {
                const startElement = getElementPosition(connection.from, connection.fromPanel);
                const endElement = getElementPosition(connection.to, connection.toPanel);

                if (!startElement || !endElement) return null;

                // Определяем стороны выхода и входа
                let startSide: 'left' | 'right' = 'right';
                let endSide: 'left' | 'right' = 'left';

                // Упрощенная логика определения сторон
                if (startElement.right < endElement.left) {
                    startSide = 'right';
                    endSide = 'left';
                } else if (startElement.left > endElement.right) {
                    startSide = 'left';
                    endSide = 'right';
                } else {
                    // Панели перекрываются - используем правую сторону для обеих
                    startSide = 'right';
                    endSide = 'right';
                }

                const startX = startSide === 'right' ? startElement.right : startElement.left;
                const startY = startElement.centerY;
                const endX = endSide === 'right' ? endElement.right : endElement.left;
                const endY = endElement.centerY;

                const path = createPathWithGuaranteedHorizontal(startX, startY, endX, endY, startSide, endSide);

                return (
                    <path
                        key={index}
                        d={path}
                        stroke="#3498db"
                        strokeWidth="2"
                        fill="none"
                        markerEnd="url(#arrowhead)"
                    />
                );
            })}
        </svg>
    );
};

export default ConnectionLines;