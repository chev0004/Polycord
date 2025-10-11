import Image from 'next/image';
import type { CSSProperties } from 'react';

const sizeMap = {
  sm: 32,
  md: 56,
};

type AvatarProps = {
  avatarUrl?: string;
  size: keyof typeof sizeMap;
};

export const Avatar = ({ avatarUrl, size }: AvatarProps) => {
  const pixelSize = sizeMap[size];
  const style: CSSProperties = {
    width: `${pixelSize}px`,
    height: `${pixelSize}px`,
  };
  const fontSizeClass = pixelSize >= 56 ? 'text-xl' : 'text-xs';

  return (
    <>
      {avatarUrl ? (
        <Image
          src={avatarUrl}
          alt="User avatar"
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
          <span className={`text-gray-400 ${fontSizeClass}`}>?</span>
        </div>
      )}
    </>
  );
};
