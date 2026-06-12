import Image from 'next/image';
import type { CSSProperties } from 'react';

const sizeMap = {
  sm: { pixels: 32, textClassName: 'text-[13px]' },
  md: { pixels: 56, textClassName: 'text-xl' },
  lg: { pixels: 96, textClassName: 'text-[34px]' },
};

type AvatarProps = {
  avatarUrl?: string;
  size: keyof typeof sizeMap;
  alt?: string;
};

export const Avatar = ({ avatarUrl, size, alt = '' }: AvatarProps) => {
  const { pixels: pixelSize, textClassName } = sizeMap[size];
  const style: CSSProperties = {
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
  };

  return (
    <>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt={alt}
          className="flex-shrink-0 rounded-full object-cover"
          style={style}
          width={pixelSize}
          height={pixelSize}
          draggable={false}
          onDragStart={(e) => e.preventDefault()}
        />
      ) : (
        <div
          className="flex flex-shrink-0 select-none items-center justify-center rounded-full bg-primary-dark"
          style={style}
        >
          <span className={`font-semibold text-gray-400 ${textClassName}`}>
            ?
          </span>
        </div>
      )}
    </>
  );
};
