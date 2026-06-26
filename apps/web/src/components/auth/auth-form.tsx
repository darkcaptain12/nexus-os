'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';

interface AuthFormProps {
  title: string;
  subtitle?: string;
  action: (formData: FormData) => Promise<{ error?: string; success?: boolean; message?: string }>;
  submitLabel: string;
  children: ReactNode;
  footer?: ReactNode;
}

export function AuthForm({ title, subtitle, action, submitLabel, children, footer }: AuthFormProps) {
  const [error, setError] = useState<string>();
  const [success, setSuccess] = useState<string>();
  const [loading, setLoading] = useState(false);

  async function handleSubmit(formData: FormData) {
    setError(undefined);
    setSuccess(undefined);
    setLoading(true);
    try {
      const result = await action(formData);
      if (result?.error) {
        setError(result.error);
      } else if (result?.message) {
        setSuccess(result.message);
      }
    } catch {
      setError('Beklenmeyen bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-8 shadow-lg">
      <div className="mb-6 text-center">
        <Link href="/" className="text-2xl font-bold tracking-tight text-foreground">
          NEXUS OS
        </Link>
        <h1 className="mt-4 text-xl font-semibold text-foreground">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>}
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive-foreground">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 rounded-lg border border-green-500/50 bg-green-500/10 p-3 text-sm text-green-400">
          {success}
        </div>
      )}

      <form action={handleSubmit} className="space-y-4">
        {children}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? 'İşleniyor...' : submitLabel}
        </button>
      </form>

      {footer && <div className="mt-6 text-center text-sm text-muted-foreground">{footer}</div>}
    </div>
  );
}

export function AuthInput({
  name,
  type = 'text',
  label,
  placeholder,
  required = true,
}: {
  name: string;
  type?: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}) {
  return (
    <div>
      <label htmlFor={name} className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
    </div>
  );
}
