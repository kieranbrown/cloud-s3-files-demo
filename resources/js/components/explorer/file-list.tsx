import { download as downloadFile } from '@/actions/App/Http/Controllers/FileController';
import { FileIcon } from '@/components/explorer/file-icon';
import { Button, buttonClasses } from '@/components/ui/button';
import { cn, formatBytes, formatRelative } from '@/lib/utils';
import type { Entry } from '@/types/explorer';
import {
    CloudUpload,
    Download,
    FolderOpen,
    SearchX,
    Trash2,
} from 'lucide-react';
import { useMemo, type KeyboardEvent } from 'react';

interface FileListProps {
    entries: Entry[];
    filter: string;
    selectedPath: string | null;
    onOpenDirectory: (path: string) => void;
    onSelectFile: (entry: Entry) => void;
    onDelete: (entry: Entry) => void;
    onUpload: () => void;
    className?: string;
}

const GRID =
    'grid grid-cols-[minmax(0,1fr)_6rem_10rem_4.5rem] items-center gap-4 px-4';

export function FileList({
    entries,
    filter,
    selectedPath,
    onOpenDirectory,
    onSelectFile,
    onDelete,
    onUpload,
    className,
}: FileListProps) {
    const visible = useMemo(() => {
        const needle = filter.trim().toLowerCase();

        return needle === ''
            ? entries
            : entries.filter((entry) =>
                  entry.name.toLowerCase().includes(needle),
              );
    }, [entries, filter]);

    const summary = useMemo(() => {
        const directories = visible.filter(
            (entry) => entry.type === 'directory',
        ).length;
        const files = visible.length - directories;
        const bytes = visible.reduce(
            (total, entry) => total + (entry.size ?? 0),
            0,
        );

        return { directories, files, bytes };
    }, [visible]);

    const activate = (entry: Entry) => {
        if (entry.type === 'directory') {
            onOpenDirectory(entry.path);
        } else {
            onSelectFile(entry);
        }
    };

    const onRowKeyDown = (event: KeyboardEvent, entry: Entry) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            activate(entry);
        }
    };

    return (
        <section className={cn('flex min-h-0 flex-col', className)}>
            <div
                className={cn(
                    GRID,
                    'h-9 shrink-0 border-b border-neutral-200 text-[11px] font-semibold tracking-wider text-neutral-400 uppercase dark:border-white/10 dark:text-neutral-500',
                )}
            >
                <span>Name</span>
                <span className="text-right">Size</span>
                <span>Modified</span>
                <span />
            </div>

            <div className="min-h-0 flex-1 scrollbar-thin overflow-y-auto">
                {visible.length === 0 ? (
                    <EmptyState
                        filtered={filter.trim() !== ''}
                        onUpload={onUpload}
                    />
                ) : (
                    <ul role="listbox" aria-label="Files">
                        {visible.map((entry) => {
                            const isSelected = selectedPath === entry.path;

                            return (
                                <li
                                    key={entry.path}
                                    role="option"
                                    aria-selected={isSelected}
                                    tabIndex={0}
                                    onClick={() => activate(entry)}
                                    onKeyDown={(event) =>
                                        onRowKeyDown(event, entry)
                                    }
                                    className={cn(
                                        GRID,
                                        'group h-11 cursor-default border-b border-neutral-100 text-sm transition-colors outline-none select-none focus-visible:bg-neutral-100 dark:border-white/5 dark:focus-visible:bg-white/5',
                                        isSelected
                                            ? 'bg-neutral-100 shadow-[inset_2px_0_0_var(--color-laravel)] dark:bg-white/[0.06]'
                                            : 'hover:bg-neutral-50 dark:hover:bg-white/[0.03]',
                                    )}
                                >
                                    <span className="flex min-w-0 items-center gap-3">
                                        <FileIcon
                                            entry={entry}
                                            className="size-[18px] shrink-0"
                                        />
                                        <span
                                            className={cn(
                                                'truncate',
                                                entry.type === 'directory'
                                                    ? 'font-medium text-neutral-900 dark:text-neutral-100'
                                                    : 'text-neutral-800 dark:text-neutral-200',
                                            )}
                                        >
                                            {entry.name}
                                        </span>
                                    </span>
                                    <span className="text-right font-mono text-xs text-neutral-500 tabular-nums dark:text-neutral-400">
                                        {entry.type === 'directory'
                                            ? '—'
                                            : formatBytes(entry.size)}
                                    </span>
                                    <span
                                        className="truncate text-xs text-neutral-500 dark:text-neutral-400"
                                        title={entry.lastModified ?? undefined}
                                    >
                                        {formatRelative(entry.lastModified)}
                                    </span>
                                    <span className="flex items-center justify-end gap-0.5 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100">
                                        {entry.type === 'file' && (
                                            <a
                                                href={downloadFile.url({
                                                    query: { path: entry.path },
                                                })}
                                                download={entry.name}
                                                title="Download"
                                                aria-label={`Download ${entry.name}`}
                                                onClick={(event) =>
                                                    event.stopPropagation()
                                                }
                                                className={buttonClasses(
                                                    'ghost',
                                                    'icon-sm',
                                                )}
                                            >
                                                <Download />
                                            </a>
                                        )}
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            title="Delete"
                                            aria-label={`Delete ${entry.name}`}
                                            onClick={(event) => {
                                                event.stopPropagation();
                                                onDelete(entry);
                                            }}
                                            className="hover:text-red-600 dark:hover:text-red-400"
                                        >
                                            <Trash2 />
                                        </Button>
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>

            <footer className="flex h-8 shrink-0 items-center gap-3 border-t border-neutral-200 px-4 text-[11px] text-neutral-400 dark:border-white/10 dark:text-neutral-500">
                <span>
                    {summary.directories}{' '}
                    {summary.directories === 1 ? 'folder' : 'folders'}
                </span>
                <span aria-hidden="true">·</span>
                <span>
                    {summary.files} {summary.files === 1 ? 'file' : 'files'}
                </span>
                {summary.bytes > 0 && (
                    <>
                        <span aria-hidden="true">·</span>
                        <span className="font-mono tabular-nums">
                            {formatBytes(summary.bytes)}
                        </span>
                    </>
                )}
            </footer>
        </section>
    );
}

function EmptyState({
    filtered,
    onUpload,
}: {
    filtered: boolean;
    onUpload: () => void;
}) {
    if (filtered) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center">
                <SearchX className="size-8 text-neutral-300 dark:text-neutral-600" />
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Nothing here matches that filter.
                </p>
            </div>
        );
    }

    return (
        <div className="flex h-full items-center justify-center p-8">
            <div className="flex w-full max-w-sm flex-col items-center gap-4 rounded-2xl border border-dashed border-neutral-300 p-10 text-center dark:border-white/15">
                <span className="flex size-12 items-center justify-center rounded-2xl bg-neutral-100 dark:bg-white/5">
                    <FolderOpen className="size-6 text-neutral-400" />
                </span>
                <div className="space-y-1">
                    <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                        This folder is empty
                    </p>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                        Drop files anywhere, or upload from your computer.
                    </p>
                </div>
                <Button variant="primary" size="sm" onClick={onUpload}>
                    <CloudUpload />
                    Upload files
                </Button>
            </div>
        </div>
    );
}
