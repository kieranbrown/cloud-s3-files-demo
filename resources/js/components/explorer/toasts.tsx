import type { Toast } from '@/hooks/use-toasts';
import { cn } from '@/lib/utils';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';

interface ToastsProps {
    toasts: Toast[];
    onDismiss: (id: number) => void;
}

const TONES = {
    success: {
        icon: CheckCircle2,
        classes: 'text-emerald-600 dark:text-emerald-400',
    },
    error: { icon: AlertCircle, classes: 'text-red-600 dark:text-red-400' },
    info: { icon: Info, classes: 'text-sky-600 dark:text-sky-400' },
} as const;

export function Toasts({ toasts, onDismiss }: ToastsProps) {
    if (toasts.length === 0) {
        return null;
    }

    return (
        <div
            aria-live="polite"
            className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-80 flex-col gap-2"
        >
            {toasts.map((toast) => {
                const { icon: Icon, classes } = TONES[toast.tone];

                return (
                    <div
                        key={toast.id}
                        role="status"
                        className="pointer-events-auto flex items-start gap-3 rounded-xl border border-neutral-200 bg-white/95 p-3 text-sm shadow-lg backdrop-blur dark:border-white/10 dark:bg-neutral-900/95"
                    >
                        <Icon
                            className={cn('mt-0.5 size-4 shrink-0', classes)}
                        />
                        <p className="min-w-0 flex-1 text-neutral-800 dark:text-neutral-100">
                            {toast.message}
                        </p>
                        <button
                            type="button"
                            aria-label="Dismiss"
                            onClick={() => onDismiss(toast.id)}
                            className="cursor-pointer rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                        >
                            <X className="size-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}
