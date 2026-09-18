import { useCallback, useState } from 'react';

export type ToastTone = 'success' | 'error' | 'info';

export interface Toast {
    id: number;
    tone: ToastTone;
    message: string;
}

let nextId = 1;

export function useToasts(timeout = 4000) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const dismiss = useCallback((id: number) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const notify = useCallback(
        (tone: ToastTone, message: string) => {
            const id = nextId++;

            setToasts((current) => [...current, { id, tone, message }]);
            window.setTimeout(() => dismiss(id), timeout);
        },
        [dismiss, timeout],
    );

    return { toasts, notify, dismiss };
}
