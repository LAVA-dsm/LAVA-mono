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
      className={`mb-6 rounded-xl border border-red-100 bg-red-50/50 p-4 shadow-sm transition-all duration-300 ${className}`}
    >
      <div className="flex items-start gap-3">
        {/* 에러 경고 아이콘 - 색상에만 의존하지 않는 명확한 경고 시각화 */}
        <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-brand-red" aria-hidden="true" />
        
        {/* 에러 메시지 본문 */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-brand-red leading-relaxed break-keep">
            {message}
          </p>
          
          {/* 상세 정보 토글 (개발자 디버깅 보조용 접이식 아코디언) */}
          {details && (
            <div className="mt-2">
              <button
                type="button"
                onClick={() => setShowDetails(!showDetails)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-lava-secondary hover:text-brand-red transition-colors focus:outline-none"
              >
                <span>상세 정보 보기</span>
                <ChevronDown
                  className={`h-3 w-3 transition-transform duration-200 ${showDetails ? "rotate-180" : ""}`}
                />
              </button>
              
              {showDetails && (
                <pre className="mt-2 max-h-32 overflow-y-auto rounded-md bg-white border border-lava-border p-3 text-[11px] font-mono text-lava-secondary leading-relaxed whitespace-pre-wrap break-all shadow-inner">
                  {details}
                </pre>
              )}
            </div>
          )}
        </div>

        {/* 다시 시도 액션 버튼 */}
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 shrink-0 rounded-lg bg-white border border-red-200 px-3 py-1.5 text-xs font-bold text-brand-red shadow-sm transition-all hover:bg-red-50 hover:border-red-300 focus:outline-none"
          >
            <RefreshCw className="h-3 w-3" />
            <span>다시 시도</span>
          </button>
        )}
      </div>
    </div>
  );
}
