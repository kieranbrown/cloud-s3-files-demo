import { destroy as destroyDirectory } from '@/actions/App/Http/Controllers/DirectoryController';
import { index as explorerIndex } from '@/actions/App/Http/Controllers/ExplorerController';
import { destroy as destroyFile } from '@/actions/App/Http/Controllers/FileController';
import UploadController from '@/actions/App/Http/Controllers/UploadController';
import { Breadcrumbs } from '@/components/explorer/breadcrumbs';
import {
    ConfirmDialog,
    NewFileDialog,
    NewFolderDialog,
} from '@/components/explorer/dialogs';
import { DirectoryTree } from '@/components/explorer/directory-tree';
import { DiskSwitcher } from '@/components/explorer/disk-switcher';
import { FileList } from '@/components/explorer/file-list';
import { FilePreview } from '@/components/explorer/file-preview';
import { LaravelMark } from '@/components/explorer/laravel-mark';
import { Toasts } from '@/components/explorer/toasts';
import { Button } from '@/components/ui/button';
import { useToasts } from '@/hooks/use-toasts';
import { cn, parentPath } from '@/lib/utils';
import type { Entry, ExplorerPageProps } from '@/types/explorer';
import { Head, router, useForm } from '@inertiajs/react';
import {
    ArrowUp,
    CloudUpload,
    FilePlus,
    FolderPlus,
    Loader2,
    RefreshCw,
    Search,
    Upload,
    X,
} from 'lucide-react';
import {
    useCallback,
    useEffect,
    useRef,
    useState,
    type ChangeEvent,
    type DragEvent,
} from 'react';

export default function Explorer({
    disk,
    disks,
    path,
    breadcrumbs,
    entries,
    roots,
}: ExplorerPageProps) {
    const [selectedPath, setSelectedPath] = useState<string | null>(null);
    const [previewExpanded, setPreviewExpanded] = useState(false);
    const [filter, setFilter] = useState('');
    const [creatingFolder, setCreatingFolder] = useState(false);
    const [creatingFile, setCreatingFile] = useState(false);
    const [pendingDelete, setPendingDelete] = useState<Entry | null>(null);
    const [deleting, setDeleting] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const dragDepth = useRef(0);
    const fileInput = useRef<HTMLInputElement>(null);
    const { toasts, notify, dismiss } = useToasts();

    const upload = useForm<{ path: string; files: File[] }>({
        path,
        files: [],
    });

    const navigate = useCallback((target: string) => {
        router.get(
            explorerIndex.url(target ? { query: { path: target } } : undefined),
            {},
            {
                preserveState: true,
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedPath(null);
                    setFilter('');
                },
            },
        );
    }, []);

    const refresh = () => {
        setRefreshing(true);
        router.reload({
            only: ['entries', 'breadcrumbs'],
            onFinish: () => setRefreshing(false),
        });
    };

    const sendFiles = (files: File[]) => {
        if (files.length === 0 || upload.processing) {
            return;
        }

        upload.setData({ path, files });
        upload.post(UploadController.url(), {
            forceFormData: true,
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                notify(
                    'success',
                    files.length === 1
                        ? `Uploaded ${files[0].name}`
                        : `Uploaded ${files.length} files`,
                );
            },
            onError: (errors) => {
                notify(
                    'error',
                    Object.values(errors)[0] ?? 'The upload failed.',
                );
            },
            onFinish: () => upload.reset('files'),
        });
    };

    const onFilesPicked = (event: ChangeEvent<HTMLInputElement>) => {
        sendFiles(Array.from(event.target.files ?? []));
        event.target.value = '';
    };

    const hasFiles = (event: DragEvent) =>
        Array.from(event.dataTransfer.types).includes('Files');

    const onDragEnter = (event: DragEvent) => {
        if (!hasFiles(event)) {
            return;
        }

        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
    };

    const onDragLeave = (event: DragEvent) => {
        if (!hasFiles(event)) {
            return;
        }

        dragDepth.current = Math.max(0, dragDepth.current - 1);

        if (dragDepth.current === 0) {
            setDragging(false);
        }
    };

    const onDragOver = (event: DragEvent) => {
        if (hasFiles(event)) {
            event.preventDefault();
        }
    };

    const onDrop = (event: DragEvent) => {
        if (!hasFiles(event)) {
            return;
        }

        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        sendFiles(Array.from(event.dataTransfer.files));
    };

    const confirmDelete = () => {
        if (!pendingDelete) {
            return;
        }

        const entry = pendingDelete;
        const url =
            entry.type === 'directory'
                ? destroyDirectory.url()
                : destroyFile.url();

        setDeleting(true);
        router.delete(url, {
            data: { path: entry.path },
            preserveState: true,
            preserveScroll: true,
            onSuccess: () => {
                notify('success', `Deleted ${entry.name}`);
                setPendingDelete(null);

                if (selectedPath === entry.path) {
                    setSelectedPath(null);
                }
            },
            onError: (errors) => {
                notify(
                    'error',
                    Object.values(errors)[0] ??
                        `Couldn't delete ${entry.name}.`,
                );
            },
            onFinish: () => setDeleting(false),
        });
    };

    useEffect(() => {
        const onKeyDown = (event: KeyboardEvent) => {
            if (
                event.key === 'Escape' &&
                selectedPath &&
                !creatingFolder &&
                !creatingFile &&
                !pendingDelete
            ) {
                setSelectedPath(null);
            }
        };

        window.addEventListener('keydown', onKeyDown);

        return () => window.removeEventListener('keydown', onKeyDown);
    }, [selectedPath, creatingFolder, creatingFile, pendingDelete]);

    const title = path ? (path.split('/').pop() ?? path) : 'Files';
    const progress = upload.progress?.percentage ?? null;
    const showList = !(selectedPath && previewExpanded);

    return (
        <>
            <Head title={title} />

            {upload.processing && (
                <div
                    role="progressbar"
                    aria-label="Upload progress"
                    aria-valuenow={progress ?? undefined}
                    className="bg-laravel/20 fixed inset-x-0 top-0 z-50 h-0.5"
                >
                    <div
                        className="bg-laravel h-full transition-[width] duration-200"
                        style={{ width: `${progress ?? 10}%` }}
                    />
                </div>
            )}

            <div className="flex h-screen flex-col overflow-hidden bg-white text-neutral-900 antialiased dark:bg-neutral-950 dark:text-neutral-100">
                <header className="flex h-14 shrink-0 items-center gap-3 border-b border-neutral-200 px-4 dark:border-white/10">
                    <div className="flex items-center gap-2.5">
                        <LaravelMark className="text-laravel size-6" />
                        <span className="text-[15px] font-semibold tracking-tight">
                            Files
                        </span>
                    </div>

                    <span className="hidden h-5 w-px bg-neutral-200 sm:block dark:bg-white/10" />

                    <DiskSwitcher disk={disk} disks={disks} />

                    <div className="flex-1" />

                    <label className="relative hidden md:block">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-neutral-400" />
                        <input
                            type="search"
                            value={filter}
                            onChange={(event) => setFilter(event.target.value)}
                            placeholder="Filter this folder"
                            aria-label="Filter this folder"
                            className="focus:border-laravel focus:ring-laravel/20 h-9 w-56 rounded-lg border border-neutral-200 bg-neutral-50 pr-8 pl-9 text-sm text-neutral-900 transition-[width,box-shadow] outline-none placeholder:text-neutral-400 focus:w-72 focus:bg-white focus:ring-2 dark:border-white/10 dark:bg-white/5 dark:text-white dark:focus:bg-neutral-900"
                        />
                        {filter && (
                            <button
                                type="button"
                                aria-label="Clear filter"
                                onClick={() => setFilter('')}
                                className="absolute top-1/2 right-2 -translate-y-1/2 cursor-pointer rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200"
                            >
                                <X className="size-4" />
                            </button>
                        )}
                    </label>

                    <Button
                        variant="ghost"
                        size="icon"
                        title="Refresh"
                        aria-label="Refresh"
                        onClick={refresh}
                        disabled={refreshing}
                    >
                        <RefreshCw
                            className={cn(refreshing && 'animate-spin')}
                        />
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setCreatingFolder(true)}
                    >
                        <FolderPlus />
                        <span className="hidden sm:inline">New folder</span>
                    </Button>
                    <Button
                        variant="secondary"
                        onClick={() => setCreatingFile(true)}
                    >
                        <FilePlus />
                        <span className="hidden sm:inline">New file</span>
                    </Button>
                    <Button
                        variant="primary"
                        onClick={() => fileInput.current?.click()}
                        disabled={upload.processing}
                    >
                        {upload.processing ? (
                            <Loader2 className="animate-spin" />
                        ) : (
                            <Upload />
                        )}
                        <span className="hidden sm:inline">
                            {upload.processing && progress !== null
                                ? `Uploading ${Math.round(progress)}%`
                                : 'Upload'}
                        </span>
                    </Button>
                    <input
                        ref={fileInput}
                        type="file"
                        multiple
                        className="hidden"
                        onChange={onFilesPicked}
                    />
                </header>

                <div className="flex min-h-0 flex-1">
                    <aside className="hidden w-64 shrink-0 flex-col border-r border-neutral-200 bg-neutral-50 lg:flex dark:border-white/10 dark:bg-neutral-900/40">
                        <div className="px-4 pt-4 pb-2 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase dark:text-neutral-500">
                            Folders
                        </div>
                        <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto px-2 pb-4">
                            <DirectoryTree
                                roots={roots}
                                currentPath={path}
                                entries={entries}
                                diskName={disk.name}
                                onNavigate={navigate}
                            />
                        </div>
                        <div className="border-t border-neutral-200 p-3 dark:border-white/10">
                            <div className="rounded-xl border border-neutral-200 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
                                <div className="flex items-center gap-2">
                                    <span className="size-1.5 rounded-full bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.2)]" />
                                    <span className="text-xs font-medium">
                                        Storage::disk(&lsquo;{disk.name}&rsquo;)
                                    </span>
                                </div>
                                <dl className="mt-2 space-y-1 text-[11px]">
                                    <div className="flex justify-between gap-3">
                                        <dt className="text-neutral-400 dark:text-neutral-500">
                                            Driver
                                        </dt>
                                        <dd className="font-mono">
                                            {disk.driver}
                                        </dd>
                                    </div>
                                    {disk.root && (
                                        <div className="flex justify-between gap-3">
                                            <dt className="text-neutral-400 dark:text-neutral-500">
                                                Root
                                            </dt>
                                            <dd
                                                className="truncate font-mono"
                                                title={disk.root}
                                            >
                                                {disk.root}
                                            </dd>
                                        </div>
                                    )}
                                </dl>
                            </div>
                        </div>
                    </aside>

                    <main
                        className="relative flex min-w-0 flex-1 flex-col"
                        onDragEnter={onDragEnter}
                        onDragLeave={onDragLeave}
                        onDragOver={onDragOver}
                        onDrop={onDrop}
                    >
                        <div className="flex h-11 shrink-0 items-center gap-2 border-b border-neutral-200 px-3 dark:border-white/10">
                            <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Up one level"
                                aria-label="Up one level"
                                disabled={path === ''}
                                onClick={() => navigate(parentPath(path))}
                            >
                                <ArrowUp />
                            </Button>
                            <Breadcrumbs
                                diskName={disk.name}
                                crumbs={breadcrumbs}
                                onNavigate={navigate}
                            />
                        </div>

                        <div className="flex min-h-0 flex-1">
                            {showList && (
                                <FileList
                                    entries={entries}
                                    filter={filter}
                                    selectedPath={selectedPath}
                                    onOpenDirectory={navigate}
                                    onSelectFile={(entry) =>
                                        setSelectedPath(entry.path)
                                    }
                                    onDelete={setPendingDelete}
                                    onUpload={() => fileInput.current?.click()}
                                    className="min-w-0 flex-1"
                                />
                            )}
                            {selectedPath && (
                                <FilePreview
                                    path={selectedPath}
                                    expanded={previewExpanded}
                                    onToggleExpanded={() =>
                                        setPreviewExpanded(
                                            (current) => !current,
                                        )
                                    }
                                    onClose={() => setSelectedPath(null)}
                                    onDelete={setPendingDelete}
                                    notify={notify}
                                    className={cn(
                                        previewExpanded
                                            ? 'flex-1'
                                            : 'w-[46%] max-w-3xl shrink-0 border-l border-neutral-200 dark:border-white/10',
                                    )}
                                />
                            )}
                        </div>

                        {dragging && (
                            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-3">
                                <div className="border-laravel bg-laravel/5 flex size-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed backdrop-blur-[2px]">
                                    <span className="bg-laravel shadow-laravel/30 flex size-14 items-center justify-center rounded-2xl text-white shadow-lg">
                                        <CloudUpload className="size-7" />
                                    </span>
                                    <p className="text-sm font-medium">
                                        Drop to upload into{' '}
                                        <span className="font-mono">
                                            /{path}
                                        </span>
                                    </p>
                                </div>
                            </div>
                        )}
                    </main>
                </div>
            </div>

            {creatingFolder && (
                <NewFolderDialog
                    path={path}
                    onClose={() => setCreatingFolder(false)}
                    onCreated={(name) => notify('success', `Created ${name}`)}
                />
            )}

            {creatingFile && (
                <NewFileDialog
                    path={path}
                    onClose={() => setCreatingFile(false)}
                    onCreated={(createdPath, name) => {
                        notify('success', `Created ${name}`);
                        setSelectedPath(createdPath);
                    }}
                />
            )}

            <ConfirmDialog
                open={pendingDelete !== null}
                title={`Delete ${pendingDelete?.type === 'directory' ? 'folder' : 'file'}?`}
                description={
                    <>
                        <span className="font-mono text-neutral-800 dark:text-neutral-200">
                            {pendingDelete?.name}
                        </span>{' '}
                        will be removed from the disk
                        {pendingDelete?.type === 'directory' &&
                            ', along with everything inside it'}
                        . This can&rsquo;t be undone.
                    </>
                }
                confirmLabel="Delete"
                processing={deleting}
                onConfirm={confirmDelete}
                onClose={() => setPendingDelete(null)}
            />

            <Toasts toasts={toasts} onDismiss={dismiss} />
        </>
    );
}
