import Image from 'next/image';
import type { CSSProperties } from 'react';

const sizeMap = {
  sm: 32,
  md: 56,
  lg: 96,
};

type AvatarProps = {
  avatarUrl?: string;
  size: keyof typeof sizeMap;
  alt?: string;
};

export const Avatar = ({ avatarUrl, size, alt = '' }: AvatarProps) => {
  const pixelSize = sizeMap[size];
  const style: CSSProperties = {
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
  };
  const fontSizeClass =
    pixelSize >= 96
      ? 'text-[34px]'
      : pixelSize >= 56
        ? 'text-xl'
        : 'text-[13px]';

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
          <span className={`text-muted ${fontSizeClass}`}>?</span>
        </div>
      )}
    </>
  );
};
