import { store as storeDirectory } from '@/actions/App/Http/Controllers/DirectoryController';
import { store as storeFile } from '@/actions/App/Http/Controllers/FileController';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useForm } from '@inertiajs/react';
import { AlertTriangle, FilePlus, FolderPlus, Loader2 } from 'lucide-react';
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

function DialogError({ message }: { message?: string }) {
    if (!message) {
        return null;
    }

    return (
        <p className="mr-auto text-xs text-red-600 dark:text-red-400">
            {message}
        </p>
    );
}

interface NewFolderDialogProps {
    path: string;
    onClose: () => void;
    onCreated: (name: string) => void;
}

export function NewFolderDialog({
    path,
    onClose,
    onCreated,
}: NewFolderDialogProps) {
    const form = useForm({ path, name: '' });

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
        <Dialog open onClose={onClose}>
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
                    <DialogError message={form.errors.name} />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <DialogError message={form.errors.path} />
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

interface NewFileDialogProps {
    path: string;
    onClose: () => void;
    onCreated: (path: string, name: string) => void;
}

export function NewFileDialog({
    path,
    onClose,
    onCreated,
}: NewFileDialogProps) {
    const form = useForm({ path, name: '', content: '' });

    const submit = (event: FormEvent) => {
        event.preventDefault();

        const name = form.data.name.trim();

        if (name === '') {
            form.setError('name', 'Give the file a name.');

            return;
        }

        form.post(storeFile.url(), {
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                onCreated(path === '' ? name : `${path}/${name}`, name);
                onClose();
            },
        });
    };

    return (
        <Dialog open onClose={onClose} className="max-w-2xl">
            <form onSubmit={submit} className="space-y-5">
                <div className="flex items-start gap-3">
                    <span className="bg-laravel/10 text-laravel flex size-10 shrink-0 items-center justify-center rounded-xl">
                        <FilePlus className="size-5" />
                    </span>
                    <div>
                        <h2 className="text-base font-semibold text-neutral-900 dark:text-white">
                            New file
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
                        htmlFor="new-file-name"
                        className="text-xs font-medium text-neutral-600 dark:text-neutral-300"
                    >
                        File name
                    </label>
                    <input
                        id="new-file-name"
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                        value={form.data.name}
                        onChange={(event) =>
                            form.setData('name', event.target.value)
                        }
                        placeholder="notes.md"
                        className={cn(
                            'h-10 w-full rounded-lg border bg-white px-3 text-sm text-neutral-900 outline-none placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-950 dark:text-white',
                            form.errors.name
                                ? 'border-red-400 focus:ring-red-500/30'
                                : 'focus:border-laravel focus:ring-laravel/25 border-neutral-200 dark:border-white/10',
                        )}
                    />
                    <DialogError message={form.errors.name} />
                </div>
                <div className="space-y-1.5">
                    <label
                        htmlFor="new-file-content"
                        className="text-xs font-medium text-neutral-600 dark:text-neutral-300"
                    >
                        Contents
                    </label>
                    <textarea
                        id="new-file-content"
                        rows={12}
                        spellCheck={false}
                        value={form.data.content}
                        onChange={(event) =>
                            form.setData('content', event.target.value)
                        }
                        onKeyDown={(event) => {
                            if (
                                (event.metaKey || event.ctrlKey) &&
                                event.key === 'Enter'
                            ) {
                                event.preventDefault();
                                submit(event);
                            }
                        }}
                        placeholder="Type anything. Leave it empty for an empty file."
                        className={cn(
                            'block w-full resize-y rounded-lg border bg-white p-3 font-mono text-[0.8125rem] leading-[1.65] text-neutral-800 outline-none placeholder:font-sans placeholder:text-neutral-400 focus:ring-2 dark:bg-neutral-950 dark:text-neutral-200',
                            form.errors.content
                                ? 'border-red-400 focus:ring-red-500/30'
                                : 'focus:border-laravel focus:ring-laravel/25 border-neutral-200 dark:border-white/10',
                        )}
                    />
                    <DialogError message={form.errors.content} />
                </div>
                <div className="flex items-center justify-end gap-2">
                    <DialogError message={form.errors.path} />
                    <Button variant="ghost" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        variant="primary"
                        disabled={form.processing}
                        title="Create file (⌘↵)"
                    >
                        {form.processing && (
                            <Loader2 className="animate-spin" />
                        )}
                        Create file
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
