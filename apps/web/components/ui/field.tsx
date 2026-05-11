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
      <span className="mb-2 block text-sm font-semibold text-lava-text">{label}</span>
      {children}
      <span className={`mt-1 block text-xs ${error ? "text-brand-red" : "text-lava-muted"}`}>
        {error || hint}
      </span>
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`h-11 w-full rounded-md border border-lava-borderStrong bg-white px-3 text-sm text-lava-text placeholder:text-lava-muted ${className}`}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={`min-h-36 w-full resize-y rounded-md border border-lava-borderStrong bg-white px-3 py-3 text-sm leading-6 text-lava-text placeholder:text-lava-muted ${className}`}
      {...props}
    />
  );
}
