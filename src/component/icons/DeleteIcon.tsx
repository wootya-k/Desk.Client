import React, { FC } from 'react';

interface DeleteIconProps {
    color?: string;
    size?: number;
    className?: string;
}

const DeleteIcon: FC<DeleteIconProps> = ({ color, size = 30, className }) => {
    const svgStyle = {
        width: size,
        height: size,
    };

    return (
        <>
            <svg version="1.0" xmlns="http://www.w3.org/2000/svg"
                width={size}
                height={size}
                viewBox="0 0 262.000000 267.000000"
                preserveAspectRatio="xMidYMid meet"
                style={{ transform: 'translateX(-2px) scale(0.97)' }} >

                <g transform="translate(0.000000,267.000000) scale(0.100000,-0.100000)"
                    fill={color} stroke="none">
                    <path d="M1230 2361 c-119 -19 -210 -112 -259 -263 l-13 -38 -181 0 c-162 0
-185 -2 -213 -19 -69 -42 -63 -146 10 -176 20 -8 60 -15 91 -15 l55 0 0 -559
c0 -592 5 -680 45 -767 41 -92 127 -170 230 -210 46 -18 78 -19 455 -19 377 0
409 1 455 19 146 57 239 172 265 328 6 38 10 295 10 636 l0 572 55 0 c31 0 71
7 91 15 73 30 79 134 10 176 -27 17 -51 19 -212 19 l-181 0 -18 48 c-50 132
-93 186 -185 230 -53 25 -62 26 -260 28 -113 1 -225 -1 -250 -5z m438 -217
c25 -17 54 -68 45 -78 -8 -7 -533 -8 -533 -1 0 4 7 19 15 35 30 57 41 60 255
60 161 0 199 -3 218 -16z m302 -863 c0 -330 -4 -590 -10 -620 -11 -60 -29 -87
-85 -127 l-40 -29 -362 -3 c-230 -2 -376 1 -400 7 -43 12 -94 56 -121 104 -16
29 -17 83 -20 635 l-3 602 521 0 520 0 0 -569z"/>
                    <path d="M1383 1576 l-28 -24 -3 -191 -3 -191 -26 20 c-35 27 -106 27 -133 0
-24 -24 -34 -62 -26 -96 7 -28 159 -191 220 -235 69 -51 83 -45 225 95 119
118 126 127 126 165 0 57 -34 91 -90 91 -28 0 -52 -7 -69 -21 l-26 -20 0 163
c0 177 -9 229 -43 253 -33 23 -91 19 -124 -9z"/>
                </g>
            </svg>
        </>
    );
};

export default DeleteIcon;