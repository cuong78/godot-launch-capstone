import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'secondary-flat' | 'outline' | 'ghost' | 'active-primary';
  size?: 'sm' | 'md' | 'lg';
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
  className?: string;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'left',
  className = '',
  ...props
}) => {
  const baseStyle = "inline-flex items-center justify-center font-display font-semibold rounded-lg shadow-sm active:scale-95 transition-studio duration-150 cursor-pointer disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
  
  const variants = {
    primary: "bg-amber-400 text-slate-900 border border-amber-300 hover:bg-amber-300 shadow-[0_4px_0_0_#9a7d00] hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none hover:shadow-[0_3px_0_0_#9a7d00]",
    secondary: "bg-sky-500 text-white border border-sky-400 hover:bg-sky-400 shadow-[0_4px_0_0_#025272] hover:translate-y-[1px] active:translate-y-[3px] active:shadow-none hover:shadow-[0_3px_0_0_#025272]",
    'secondary-flat': "bg-sky-100 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border border-sky-200/50 dark:border-sky-800/50 hover:bg-sky-200 dark:hover:bg-slate-800/80 active:translate-y-0 shadow-none",
    outline: "bg-transparent text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 active:translate-y-0",
    ghost: "bg-transparent text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white active:translate-y-0 shadow-none",
    'active-primary': "bg-sky-500/20 text-sky-600 dark:text-sky-400 hover:bg-sky-500/30 font-bold active:translate-y-0 border border-sky-500/30"
  };

  const sizes = {
    sm: "px-3 py-1.5 text-sm font-medium",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-3.5 text-base"
  };

  return (
    <button
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {icon && iconPosition === 'left' && <span className="mr-2 inline-flex items-center">{icon}</span>}
      {children}
      {icon && iconPosition === 'right' && <span className="ml-2 inline-flex items-center">{icon}</span>}
    </button>
  );
};
