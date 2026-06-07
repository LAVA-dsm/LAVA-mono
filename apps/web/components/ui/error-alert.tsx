"use client";

import { AlertCircle, ChevronDown, RefreshCw } from "lucide-react";
import { useState } from "react";

interface ErrorAlertProps {
  message: string;
  onRetry?: () => void;
  details?: string;
  className?: string;
}

export function ErrorAlert({ message, onRetry, details, className = "" }: ErrorAlertProps) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div
      role="alert"
      className={[
        "mb-5 rounded-xl border border-[rgb(var(--c-red)/0.22)] bg-[rgb(var(--c-red)/0.10)] p-4",
        "transition-all duration-300",
        className
      ].join(" ")}
    >
      <div className="flex items-start gap-3">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-red" aria-hidden="true" />

        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-relaxed text-brand-red">
            {message}
          </p>

          {details && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-lava-secondary transition-colors hover:text-brand-red focus:outline-none"
              >
                상세 정보
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`}
                />
              </button>

              {showDetails && (
                <pre className="mt-2 max-h-28 overflow-y-auto rounded-lg border border-lava-border bg-lava-surface p-3 font-mono text-[11px] leading-relaxed text-lava-secondary">
                  {details}
                </pre>
              )}
            </div>
          )}
        </div>

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[rgb(var(--c-red)/0.30)] bg-lava-surface px-2.5 py-1.5 text-xs font-semibold text-brand-red shadow-xs transition-colors hover:border-[rgb(var(--c-red)/0.40)] hover:bg-[rgb(var(--c-red)/0.12)] focus:outline-none"
          >
            <RefreshCw className="h-3 w-3" />
            재시도
          </button>
        )}
      </div>
    </div>
  );
}
