import { store as storeDirectory } from '@/actions/App/Http/Controllers/DirectoryController';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, FolderPlus, Loader2 } from 'lucide-react';
import { useEffect, type FormEvent, type ReactNode } from 'react';

interface DialogProps {
    open: boolean;
    onClose: () => void;
    children: ReactNode;
    className?: string;
}

export function Dialog({ open, onClose, children, className }: DialogProps) {
    useEffect(() => {
        if (!open) {
            return;
        }

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) {
        return null;
    }

    return (
        <div
            role="dialog"
            aria-modal="true"
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
        >
            <button
                type="button"
                aria-label="Close dialog"
                onClick={onClose}
                className="absolute inset-0 cursor-default bg-neutral-950/40 backdrop-blur-sm"
            />
            <div
                className={cn(
                    'relative w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-2xl dark:border-white/10 dark:bg-neutral-900',
                    className,
                )}
            >
                {children}
            </div>
        </div>
    );
}

interface NewFolderDialogProps {
    open: boolean;
    path: string;
    onClose: () => void;
    onCreated: (name: string) => void;
}

export function NewFolderDialog({
    open,
    path,
    onClose,
    onCreated,
}: NewFolderDialogProps) {
    const form = useForm({ path, name: '' });

    useEffect(() => {
        if (open) {
            form.setData({ path, name: '' });
            form.clearErrors();
        }
        // The form helper is stable; only re-run when the dialog opens.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, path]);

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const name = form.data.name.trim();

        if (name === '') {
            form.setError('name', 'Give the folder a name.');

            return;
        }

        form.post(storeDirectory.url(), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                onCreated(name);
                onClose();
            },
        });
    };

    return (
        <Dialog open={open} onClose={onClose}>
            <form onSubmit={submit} className="space-y-5">
                <div className="flex items-start gap-3">
                    <span className="bg-laravel/10 text-laravel flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <FolderPlus className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                            New folder
                        </h2>
                        <p className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                            Inside{' '}
                            <code className="rounded bg-neutral-100 px-1 py-0.5 font-mono text-xs dark:bg-white/10">
                                /{path}
                            </code>
                        </p>
                    </div>
                </div>
                <div className="space-y-1.5">
                    <label
                        htmlFor="new-folder-name"
                        className="text-xs font-medium text-neutral-600 dark:text-neutral-300"
                    >
                        Folder name
                    </label>
                    <input
                        id="new-folder-name"
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        placeholder="reports"
                        className={cn(
                            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-950 dark:text-white',
                            form.errors.name
                                ? 'border-red-400 focus:ring-red-500/30'
                                : 'focus:border-laravel focus:ring-laravel/25 border-neutral-200 dark:border-white/10',
                        )}
                    />
                    {form.errors.name && (
                        <p className="text-xs text-red-600 dark:text-red-400">
                            {form.errors.name}
                        </p>
                    )}
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={form.processing}
                    >
                        {form.processing && (
                            <Loader2 className="animate-spin" />
                        )}
                        Create folder
                    </Button>
                </div>
            </form>
        </Dialog>
    );
}

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    description: ReactNode;
    confirmLabel: string;
    processing?: boolean;
    onConfirm: () => void;
    onClose: () => void;
}

export function ConfirmDialog({
    open,
    title,
    description,
    confirmLabel,
    processing = false,
    onConfirm,
    onClose,
}: ConfirmDialogProps) {
    return (
        <Dialog open={open} onClose={onClose}>
            <div className="space-y-5">
                <div className="flex items-start gap-3">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-red-500/10 text-red-600 dark:text-red-400">
                        <AlertTriangle className="size-5" />
                    </span>
                    <div className="min-w-0">
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                            {title}
                        </h2>
                        <div className="mt-0.5 text-sm text-neutral-500 dark:text-neutral-400">
                            {description}
                        </div>
                    </div>
                </div>
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        variant="danger"
                        onClick={onConfirm}
                        disabled={processing}
                        autoFocus
                    >
                        {processing && <Loader2 className="animate-spin" />}
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Dialog>
    );
}
