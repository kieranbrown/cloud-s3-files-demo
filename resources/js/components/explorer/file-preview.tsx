import {
    download as downloadFile,
    show as showFile,
    stream as streamFile,
    update as updateFile,
} from '@/actions/App/Http/Controllers/FileController';
import { CodeView } from '@/components/explorer/code-view';
import { FileIcon } from '@/components/explorer/file-icon';
import { Button, buttonClasses } from '@/components/ui/button';
import type { ToastTone } from '@/hooks/use-toasts';
import { languageFor } from '@/lib/files';
import { fetchJson, HttpError } from '@/lib/http';
import { cn, formatBytes, formatDate, formatRelative } from '@/lib/utils';
import type { Entry, FileDetails } from '@/types/explorer';
import { router, useHttp } from '@inertiajs/react';
import {
    AlertCircle,
    Download,
    FileQuestion,
    Loader2,
    Maximize2,
    Minimize2,
    Pencil,
    Save,
    Trash2,
    X,
} from 'lucide-react';
import { useEffect, useState, type KeyboardEvent } from 'react';

interface FilePreviewProps {
    path: string;
    expanded: boolean;
    onToggleExpanded: () => void;
    onClose: () => void;
    onDelete: (entry: Entry) => void;
    notify: (tone: ToastTone, message: string) => void;
    className?: string;
}

export function FilePreview({
    path,
    expanded,
    onToggleExpanded,
    onClose,
    onDelete,
    notify,
    className,
}: FilePreviewProps) {
    const [details, setDetails] = useState<FileDetails | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [editing, setEditing] = useState(false);
    const [draft, setDraft] = useState('');

    const save = useHttp<{ path: string; content: string }, FileDetails>({
        path,
        content: '',
    });

    useEffect(() => {
        const controller = new AbortController();

        setDetails(null);
        setError(null);
        setEditing(false);

        fetchJson<FileDetails>(showFile.url({ query: { path } }), {
            signal: controller.signal,
        })
            .then((response) => setDetails(response))
            .catch((reason: unknown) => {
                if (controller.signal.aborted) {
                    return;
                }

                setError(
                    reason instanceof HttpError
                        ? reason.message
                        : 'Unable to load this file.',
                );
            });

        return () => controller.abort();
    }, [path]);

    const startEditing = () => {
        if (!details) {
            return;
        }

        setDraft(details.content ?? '');
        setEditing(true);
    };

    const persist = () => {
        if (!details || save.processing) {
            return;
        }

        save.setData({ path: details.path, content: draft });
        void save.put(updateFile.url(), {
            onSuccess: (updated) => {
                setDetails(updated);
                setEditing(false);
                notify('success', `Saved ${updated.name}`);
                router.reload({ only: ['entries'] });
            },
            onError: (errors) => {
                notify(
                    'error',
                    Object.values(errors)[0] ?? 'Unable to save the file.',
                );
            },
        });
    };

    const onEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
        if ((event.metaKey || event.ctrlKey) && event.key === 's') {
            event.preventDefault();
            persist();
        }

        if (event.key === 'Escape') {
            event.preventDefault();
            setEditing(false);
        }
    };

    const streamUrl = streamFile.url({ query: { path } });
    const downloadUrl = downloadFile.url({ query: { path } });
    const name = details?.name ?? path.split('/').pop() ?? path;
    const canEdit = details?.kind === 'text' && !details.truncated && !editing;

    return (
        <aside
            aria-label={`Preview of ${name}`}
            className={cn(
                'flex min-h-0 flex-col bg-white dark:bg-neutral-950',
                className,
            )}
        >
            <header className="flex h-14 shrink-0 items-center gap-2 border-b border-neutral-200 px-3 sm:gap-3 sm:px-4 dark:border-white/10">
                <FileIcon
                    entry={{
                        name,
                        extension: details?.extension ?? null,
                        type: 'file',
                    }}
                    className="size-5 shrink-0"
                />
                <div className="min-w-0 flex-1">
                    <h2
                        className="truncate text-sm font-semibold text-neutral-900 dark:text-white"
                        title={path}
                    >
                        {name}
                    </h2>
                    <p className="truncate text-[11px] text-neutral-500 dark:text-neutral-400">
                        {details ? (
                            <>
                                <span className="font-mono tabular-nums">
                                    {formatBytes(details.size)}
                                </span>
                                <span aria-hidden="true"> · </span>
                                {details.mimeType}
                                <span aria-hidden="true"> · </span>
                                <span title={formatDate(details.lastModified)}>
                                    modified{' '}
                                    {formatRelative(details.lastModified)}
                                </span>
                            </>
                        ) : (
                            path
                        )}
                    </p>
                </div>
                <div className="flex items-center gap-0.5">
                    {editing ? (
                        <>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditing(false)}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="primary"
                                size="sm"
                                onClick={persist}
                                disabled={save.processing}
                                title="Save (⌘S)"
                            >
                                {save.processing ? (
                                    <Loader2 className="animate-spin" />
                                ) : (
                                    <Save />
                                )}
                                Save
                            </Button>
                        </>
                    ) : (
                        <>
                            {canEdit && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    title="Edit"
                                    aria-label="Edit file"
                                    onClick={startEditing}
                                >
                                    <Pencil />
                                </Button>
                            )}
                            <a
                                href={downloadUrl}
                                download={name}
                                title="Download"
                                aria-label="Download file"
                                className={buttonClasses('ghost', 'icon')}
                            >
                                <Download />
                            </a>
                            <Button
                                variant="ghost"
                                size="icon"
                                title="Delete"
                                aria-label="Delete file"
                                className="hover:text-red-600 dark:hover:text-red-400"
                                onClick={() =>
                                    onDelete({
                                        name,
                                        path,
                                        type: 'file',
                                        extension: details?.extension ?? null,
                                        size: details?.size ?? null,
                                        lastModified:
                                            details?.lastModified ?? null,
                                    })
                                }
                            >
                                <Trash2 />
                            </Button>
                        </>
                    )}
                    <span className="hidden items-center lg:flex">
                        <span className="mx-1 h-5 w-px bg-neutral-200 dark:bg-white/10" />
                        <Button
                            variant="ghost"
                            size="icon"
                            title={expanded ? 'Restore' : 'Expand'}
                            aria-label={
                                expanded ? 'Restore preview' : 'Expand preview'
                            }
                            onClick={onToggleExpanded}
                        >
                            {expanded ? <Minimize2 /> : <Maximize2 />}
                        </Button>
                    </span>
                    <Button
                        variant="ghost"
                        size="icon"
                        title="Close"
                        aria-label="Close preview"
                        onClick={onClose}
                    >
                        <X />
                    </Button>
                </div>
            </header>

            <div className="relative min-h-0 flex-1 scrollbar-thin overflow-auto">
                {error ? (
                    <Message
                        icon={AlertCircle}
                        title="Couldn't load this file"
                        description={error}
                        tone="error"
                    />
                ) : !details ? (
                    <Skeleton />
                ) : (
                    <Body
                        details={details}
                        editing={editing}
                        draft={draft}
                        onDraftChange={setDraft}
                        onEditorKeyDown={onEditorKeyDown}
                        streamUrl={streamUrl}
                        downloadUrl={downloadUrl}
                    />
                )}
            </div>
        </aside>
    );
}

interface BodyProps {
    details: FileDetails;
    editing: boolean;
    draft: string;
    onDraftChange: (value: string) => void;
    onEditorKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
    streamUrl: string;
    downloadUrl: string;
}

function Body({
    details,
    editing,
    draft,
    onDraftChange,
    onEditorKeyDown,
    streamUrl,
    downloadUrl,
}: BodyProps) {
    switch (details.kind) {
        case 'text': {
            if (editing) {
                return (
                    <textarea
                        autoFocus
                        spellCheck={false}
                        value={draft}
                        onChange={(event) => onDraftChange(event.target.value)}
                        onKeyDown={onEditorKeyDown}
                        className="block h-full w-full resize-none bg-transparent p-4 font-mono text-base leading-[1.65] text-neutral-800 outline-none sm:pl-6 sm:text-[0.8125rem] dark:text-neutral-200"
                    />
                );
            }

            const content = details.content ?? '';

            if (content === '') {
                return (
                    <Message
                        icon={FileQuestion}
                        title="Empty file"
                        description="There's nothing in here yet. Hit edit to add some content."
                    />
                );
            }

            return (
                <>
                    {details.truncated && (
                        <div className="sticky top-0 z-10 border-b border-amber-200 bg-amber-50/95 px-4 py-1.5 text-xs text-amber-800 backdrop-blur dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                            Showing the first 1 MB of this file. Download it to
                            see everything.
                        </div>
                    )}
                    <CodeView
                        code={content}
                        language={languageFor(details.name, details.extension)}
                    />
                </>
            );
        }

        case 'image':
            return (
                <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_center,_rgba(0,0,0,0.04),_transparent_70%)] p-3 sm:p-6 dark:bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.05),_transparent_70%)]">
                    <img
                        src={streamUrl}
                        alt={details.name}
                        className="max-h-full max-w-full rounded-lg object-contain shadow-xl ring-1 ring-black/5 dark:ring-white/10"
                    />
                </div>
            );

        case 'pdf':
            return (
                <iframe
                    src={streamUrl}
                    title={details.name}
                    className="h-full w-full bg-neutral-100 dark:bg-neutral-900"
                />
            );

        case 'video':
            return (
                <div className="flex h-full items-center justify-center bg-black p-4">
                    <video
                        controls
                        src={streamUrl}
                        className="max-h-full max-w-full rounded-lg"
                    />
                </div>
            );

        case 'audio':
            return (
                <div className="flex h-full items-center justify-center p-8">
                    <audio
                        controls
                        src={streamUrl}
                        className="w-full max-w-md"
                    />
                </div>
            );

        default:
            return (
                <Message
                    icon={FileQuestion}
                    title="No preview available"
                    description={`${details.mimeType} files can't be shown inline, but you can still download this one.`}
                    action={
                        <a
                            href={downloadUrl}
                            download={details.name}
                            className={buttonClasses('secondary', 'sm')}
                        >
                            <Download />
                            Download {formatBytes(details.size)}
                        </a>
                    }
                />
            );
    }
}

function Skeleton() {
    return (
        <div className="animate-pulse space-y-3 p-6" aria-hidden="true">
            {[80, 60, 90, 40, 70, 55, 85, 30].map((width, index) => (
                <div
                    key={index}
                    className="h-3 rounded bg-neutral-200 dark:bg-white/10"
                    style={{ width: `${width}%` }}
                />
            ))}
        </div>
    );
}

interface MessageProps {
    icon: typeof FileQuestion;
    title: string;
    description: string;
    tone?: 'neutral' | 'error';
    action?: React.ReactNode;
}

function Message({
    icon: Icon,
    title,
    description,
    tone = 'neutral',
    action,
}: MessageProps) {
    return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
            <span
                className={cn(
                    'flex size-12 items-center justify-center rounded-2xl',
                    tone === 'error'
                        ? 'bg-red-500/10 text-red-600 dark:text-red-400'
                        : 'bg-neutral-100 text-neutral-400 dark:bg-white/5',
                )}
            >
                <Icon className="size-6" />
            </span>
            <div className="space-y-1">
                <p className="text-sm font-medium text-neutral-900 dark:text-neutral-100">
                    {title}
                </p>
                <p className="max-w-xs text-xs text-neutral-500 dark:text-neutral-400">
                    {description}
                </p>
            </div>
            {action}
        </div>
    );
}
