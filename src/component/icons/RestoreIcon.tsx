import React, { FC } from 'react';

interface RestoreIconProps {
    color?: string;
    size?: number;
    className?: string;
}

const RestoreIcon: FC<RestoreIconProps> = ({ color = "black", size = 24, className }) => {
    const svgStyle = {
        width: size,
        height: size,
    };

    return (
        <svg
            aria-hidden="true"
            version="1.1"
            id="Capa_1"
            xmlns="http://www.w3.org/2000/svg"
            xmlnsXlink="http://www.w3.org/1999/xlink"
            x="0px"
            y="0px"
            viewBox="0 0 24 24"
            width={size}
            height={size}
        >
            <path

                fill={color}
                d="m21,4h-3.101c-.465-2.279-2.485-4-4.899-4h-2c-2.414,0-4.435,1.721-4.899,4h-3.101c-.552,0-1,.448-1,1s.448,1,1,1h1v13c0,2.757,2.243,5,5,5h6c2.757,0,5-2.243,5-5V6h1c.552,0,1-.448,1-1s-.448-1-1-1Zm-10-2h2c1.304,0,2.415.836,2.828,2h-7.656c.413-1.164,1.524-2,2.828-2Zm7,17c0,1.654-1.346,3-3,3h-6c-1.654,0-3-1.346-3-3V6h12v13Zm-2.293-6.519c.391.391.391,1.023,0,1.414-.195.195-.451.293-.707.293s-.512-.098-.707-.293l-1.293-1.293v4.398c0,.552-.448,1-1,1s-1-.448-1-1v-4.398l-1.293,1.293c-.391.391-1.023.391-1.414,0s-.391-1.023,0-1.414l1.614-1.614c1.154-1.154,3.032-1.154,4.187,0l1.614,1.614Z" />
        </svg>
    );
};

export default RestoreIcon;