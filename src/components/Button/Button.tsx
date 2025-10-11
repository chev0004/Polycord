import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { IconType } from 'react-icons';

type ButtonProps = {
  children?: ReactNode;
  variant?: 'discord' | 'primary' | 'white' | 'outline';
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
  const baseClasses = `flex select-none items-center justify-center gap-2 rounded-lg px-4 py-2 font-${font} font-${weight} text-sm transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-background-dark active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed`;

  const variants = {
    primary:
      'bg-primary text-black hover:bg-primary-light focus-visible:ring-primary',
    outline:
      'border border-primary-dark bg-transparent text-primary-light hover:bg-primary-darker focus-visible:ring-primary-dark',
    discord:
      'bg-discord-blue text-white hover:bg-discord-blue-light focus-visible:ring-discord-blue',
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
