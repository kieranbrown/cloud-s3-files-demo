import { cn } from '@/lib/utils';
import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'icon' | 'icon-sm';

const VARIANTS: Record<ButtonVariant, string> = {
    primary:
        'bg-laravel text-white shadow-sm hover:bg-laravel-hover focus-visible:ring-laravel/40',
    secondary:
        'border border-neutral-200 bg-white text-neutral-800 shadow-sm hover:bg-neutral-50 focus-visible:ring-neutral-300 dark:border-white/10 dark:bg-white/5 dark:text-neutral-100 dark:hover:bg-white/10 dark:focus-visible:ring-white/20',
    ghost: 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900 focus-visible:ring-neutral-300 dark:text-neutral-400 dark:hover:bg-white/5 dark:hover:text-neutral-100 dark:focus-visible:ring-white/20',
    danger: 'bg-red-600 text-white shadow-sm hover:bg-red-700 focus-visible:ring-red-500/40',
};

const SIZES: Record<ButtonSize, string> = {
    sm: 'h-8 gap-1.5 px-2.5 text-xs',
    md: 'h-9 gap-2 px-3.5 text-sm',
    icon: 'size-9 p-0',
    'icon-sm': 'size-7 p-0',
};

export function buttonClasses(
    variant: ButtonVariant = 'secondary',
    size: ButtonSize = 'md',
    className?: string,
): string {
    return cn(
        'inline-flex shrink-0 cursor-pointer items-center justify-center rounded-lg font-medium whitespace-nowrap transition-colors outline-none select-none focus-visible:ring-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        VARIANTS[variant],
        SIZES[size],
        className,
    );
}

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: ButtonVariant;
    size?: ButtonSize;
}

export function Button({
    variant = 'secondary',
    size = 'md',
    className,
    type = 'button',
    ...props
}: ButtonProps) {
    return (
        <button
            type={type}
            className={buttonClasses(variant, size, className)}
            {...props}
        />
    );
}
