import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from "react";

type FieldWrapperProps = {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
};

export function FieldWrapper({ label, hint, error, required, children }: FieldWrapperProps) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1 text-[13px] font-semibold text-lava-text">
        {label}
        {required && (
          <span className="text-brand-primary" aria-hidden>*</span>
        )}
      </span>
      {children}
      {(error || hint) && (
        <span
          className={[
            "mt-1.5 block text-xs leading-[18px]",
            error ? "font-medium text-brand-red" : "text-lava-muted"
          ].join(" ")}
        >
          {error || hint}
        </span>
      )}
    </label>
  );
}

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={[
        "h-10 w-full rounded-[10px] border border-lava-borderStrong bg-lava-surface px-3.5",
        "text-sm text-lava-text",
        "shadow-sm",
        "placeholder:text-lava-muted",
        "transition-all duration-150",
        "hover:border-lava-secondary/50",
        "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/12",
        "disabled:cursor-not-allowed disabled:bg-lava-raised disabled:text-lava-muted",
        className
      ].join(" ")}
      {...props}
    />
  );
}

export function Textarea({ className = "", ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={[
        "min-h-[128px] w-full resize-y rounded-[10px] border border-lava-borderStrong bg-lava-surface px-3.5 py-3",
        "text-sm leading-[1.6] text-lava-text",
        "shadow-sm",
        "placeholder:text-lava-muted",
        "transition-all duration-150",
        "hover:border-lava-secondary/50",
        "focus:border-brand-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/12",
        "disabled:cursor-not-allowed disabled:bg-lava-raised disabled:text-lava-muted",
        className
      ].join(" ")}
      {...props}
    />
  );
}
