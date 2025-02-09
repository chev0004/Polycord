import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { IconType } from 'react-icons';

type ButtonProps = {
  children: ReactNode;
  variant?: 'discord' | 'primary' | 'white';
  font?: string;
  weight?: 'light' | 'regular' | 'medium' | 'semibold' | 'bold' | 'black';
  icon?: IconType;
  onClick?: () => void;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export const Button = ({
  children,
  variant = 'primary',
  font = 'figtree',
  weight = 'light',
  icon: Icon,
  onClick,
  ...props
}: ButtonProps) => {
  const baseClasses = `flex items-center gap-2 rounded-3xl px-4 py-2 font-${weight} font-${font} text-sm transition-all`;

  const variants = {
    primary:
      'bg-primary text-black hover:bg-primary-light transition-all duration-200',
    discord:
      'bg-discord-blue text-white hover:bg-discord-blue-light transition-all duration-200',
    white: 'bg-white text-black hover:bg-gray-200 transition-all duration-200',
  };

  return (
    <button
      {...props}
      type="button"
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]}`}
    >
      {Icon && <Icon />}
      {children}
    </button>
  );
};
