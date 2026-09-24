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
  type = 'button',
  ...props
}: ButtonProps) => {
  const baseClasses = `flex select-none items-center justify-center gap-2 rounded-lg px-4 py-2 font-${font} font-${weight} text-sm transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] focus:outline-none active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50`;

  const variants = {
    primary:
      'bg-primary text-on-primary hover:bg-primary-light focus-visible:bg-primary-light',
    outline:
      'border border-primary-dark bg-transparent text-primary-light hover:bg-primary-darker focus-visible:bg-primary-darker',
    discord:
      'bg-discord-blue text-white hover:bg-discord-blue-light focus-visible:bg-discord-blue-light',
    white: 'bg-white text-black hover:bg-gray-200 focus-visible:bg-gray-200',
  };

  return (
    <button
      {...props}
      type={type}
      onClick={onClick}
      className={`${baseClasses} ${variants[variant]} ${props.className ?? ''}`}
    >
      {Icon && <Icon size={18} />}
      {children}
    </button>
  );
};
