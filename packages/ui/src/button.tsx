import type { ButtonHTMLAttributes, PropsWithChildren } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
}

const variantClass: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--nx-accent)] text-white hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--nx-accent)]',
  secondary:
    'bg-[var(--nx-bg-elevated)] text-[var(--nx-ink)] border border-[var(--nx-border)] hover:bg-[var(--nx-accent-soft)]',
  ghost: 'bg-transparent text-[var(--nx-ink)] hover:bg-[var(--nx-accent-soft)]',
};

/**
 * Shared button primitive used by web marketing and app shells.
 */
export function Button({
  variant = 'primary',
  className = '',
  children,
  type = 'button',
  ...rest
}: PropsWithChildren<ButtonProps>) {
  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-[var(--nx-radius-md)] px-4 py-2 text-sm font-medium transition-opacity disabled:opacity-50 ${variantClass[variant]} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
