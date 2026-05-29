import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type FieldWrapperProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  children: ReactNode;
};

export function FieldWrapper({ label, hint, error, children }: FieldWrapperProps) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm font-bold text-lava-text">{label}</span>
      {children}
      <span className={`mt-1.5 block min-h-[18px] text-xs leading-[18px] ${error ? "font-semibold text-brand-red" : "text-lava-muted"}`}>
        {error || hint}
      </span>
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-lg border border-lava-borderStrong bg-white px-3.5 text-sm text-lava-text shadow-sm transition-colors placeholder:text-lava-muted hover:border-lava-secondary/50 focus:border-brand-primary focus:bg-white ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-36 w-full resize-y rounded-lg border border-lava-borderStrong bg-white px-3.5 py-3 text-sm leading-6 text-lava-text shadow-sm transition-colors placeholder:text-lava-muted hover:border-lava-secondary/50 focus:border-brand-primary focus:bg-white ${className}`}
      {...props}
    />
  );
}
