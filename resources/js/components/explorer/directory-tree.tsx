import { index as directoriesIndex } from '@/actions/App/Http/Controllers/DirectoryController';
import { fetchJson } from '@/lib/http';
import { cn } from '@/lib/utils';
import type { DirectoriesResponse, Entry } from '@/types/explorer';
import {
    ChevronRight,
    Folder,
    FolderOpen,
    HardDrive,
    Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';

interface DirectoryTreeProps {
    roots: Entry[];
    currentPath: string;
    entries: Entry[];
    diskName: string;
    onNavigate: (path: string) => void;
}

function ancestorsOf(path: string): string[] {
    const ancestors = [''];

    if (path === '') {
        return ancestors;
    }

    const segments = path.split('/');

    for (let index = 1; index <= segments.length; index += 1) {
        ancestors.push(segments.slice(0, index).join('/'));
    }

    return ancestors;
}

export function DirectoryTree({
    roots,
    currentPath,
    entries,
    diskName,
    onNavigate,
}: DirectoryTreeProps) {
    const [childrenByPath, setChildrenByPath] = useState<
        Record<string, Entry[]>
    >({ '': roots });
    const [expanded, setExpanded] = useState<Record<string, boolean>>({
        '': true,
    });
    const [loading, setLoading] = useState<Record<string, boolean>>({});
    const requested = useRef(new Set<string>(['']));

    const load = useCallback(async (path: string) => {
        requested.current.add(path);
        setLoading((current) => ({ ...current, [path]: true }));

        try {
            const response = await fetchJson<DirectoriesResponse>(
                directoriesIndex.url({ query: { path } }),
            );

            setChildrenByPath((current) => ({
                ...current,
                [path]: response.directories,
            }));
        } catch {
            requested.current.delete(path);
        } finally {
            setLoading((current) => {
                const next = { ...current };
                delete next[path];

                return next;
            });
        }
    }, []);

    // The directory being viewed already has a fresh listing; reuse it.
    useEffect(() => {
        requested.current.add(currentPath);
        setChildrenByPath((current) => ({
            ...current,
            [currentPath]: entries.filter(
                (entry) => entry.type === 'directory',
            ),
        }));
    }, [currentPath, entries]);

    // Reveal the current directory in the tree, fetching unseen levels.
    useEffect(() => {
        const ancestors = ancestorsOf(currentPath);

        setExpanded((current) => {
            const next = { ...current };
            ancestors.forEach((ancestor) => {
                next[ancestor] = true;
            });

            return next;
        });

        ancestors.forEach((ancestor) => {
            if (!requested.current.has(ancestor)) {
                void load(ancestor);
            }
        });
    }, [currentPath, load]);

    const toggle = useCallback(
        (path: string) => {
            setExpanded((current) => ({ ...current, [path]: !current[path] }));

            if (!requested.current.has(path)) {
                void load(path);
            }
        },
        [load],
    );

    const rootChildren = childrenByPath[''] ?? [];

    return (
        <ul className="space-y-px text-sm" role="tree">
            <li role="treeitem" aria-selected={currentPath === ''}>
                <button
                    type="button"
                    onClick={() => onNavigate('')}
                    className={cn(
                        'flex h-8 w-full cursor-pointer items-center gap-2 rounded-md px-2 text-left transition-colors',
                        currentPath === ''
                            ? 'bg-neutral-200/70 font-medium text-neutral-900 dark:bg-white/10 dark:text-white'
                            : 'text-neutral-700 hover:bg-neutral-200/50 dark:text-neutral-300 dark:hover:bg-white/5',
                    )}
                >
                    <HardDrive className="size-4 shrink-0 text-neutral-500 dark:text-neutral-400" />
                    <span className="truncate">{diskName}</span>
                </button>
                {rootChildren.length > 0 && (
                    <ul role="group" className="mt-px space-y-px">
                        {rootChildren.map((entry) => (
                            <TreeNode
                                key={entry.path}
                                entry={entry}
                                depth={1}
                                childrenByPath={childrenByPath}
                                expanded={expanded}
                                loading={loading}
                                currentPath={currentPath}
                                onToggle={toggle}
                                onNavigate={onNavigate}
                            />
                        ))}
                    </ul>
                )}
            </li>
        </ul>
    );
}

interface TreeNodeProps {
    entry: Entry;
    depth: number;
    childrenByPath: Record<string, Entry[]>;
    expanded: Record<string, boolean>;
    loading: Record<string, boolean>;
    currentPath: string;
    onToggle: (path: string) => void;
    onNavigate: (path: string) => void;
}

function TreeNode({
    entry,
    depth,
    childrenByPath,
    expanded,
    loading,
    currentPath,
    onToggle,
    onNavigate,
}: TreeNodeProps) {
    const children = childrenByPath[entry.path];
    const isOpen = expanded[entry.path] === true;
    const isLoading = loading[entry.path] === true;
    const isActive = currentPath === entry.path;
    const isAncestor = currentPath.startsWith(`${entry.path}/`);
    const mayHaveChildren = children === undefined || children.length > 0;
    const FolderIcon = isOpen && mayHaveChildren ? FolderOpen : Folder;

    return (
        <li role="treeitem" aria-expanded={isOpen} aria-selected={isActive}>
            <div
                className={cn(
                    'group flex h-8 items-center gap-1 rounded-md pr-2 transition-colors',
                    isActive
                        ? 'bg-neutral-200/70 text-neutral-900 dark:bg-white/10 dark:text-white'
                        : 'text-neutral-700 hover:bg-neutral-200/50 dark:text-neutral-300 dark:hover:bg-white/5',
                )}
                style={{ paddingLeft: `${depth * 12 + 2}px` }}
            >
                <button
                    type="button"
                    tabIndex={-1}
                    aria-label={isOpen ? 'Collapse folder' : 'Expand folder'}
                    onClick={() => onToggle(entry.path)}
                    className={cn(
                        'flex size-5 shrink-0 cursor-pointer items-center justify-center rounded text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200',
                        !mayHaveChildren && 'invisible',
                    )}
                >
                    {isLoading ? (
                        <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                        <ChevronRight
                            className={cn(
                                'size-3.5 transition-transform',
                                isOpen && 'rotate-90',
                            )}
                        />
                    )}
                </button>
                <button
                    type="button"
                    onClick={() => onNavigate(entry.path)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-left"
                >
                    <FolderIcon
                        className={cn(
                            'size-4 shrink-0',
                            isActive || isAncestor
                                ? 'text-laravel'
                                : 'text-neutral-400 group-hover:text-neutral-500 dark:text-neutral-500 dark:group-hover:text-neutral-400',
                        )}
                        fill="currentColor"
                        fillOpacity={isActive || isAncestor ? 0.18 : 0.08}
                        strokeWidth={1.75}
                    />
                    <span className={cn('truncate', isActive && 'font-medium')}>
                        {entry.name}
                    </span>
                </button>
            </div>
            {isOpen && children && children.length > 0 && (
                <ul role="group" className="mt-px space-y-px">
                    {children.map((child) => (
                        <TreeNode
                            key={child.path}
                            entry={child}
                            depth={depth + 1}
                            childrenByPath={childrenByPath}
                            expanded={expanded}
                            loading={loading}
                            currentPath={currentPath}
                            onToggle={onToggle}
                            onNavigate={onNavigate}
                        />
                    ))}
                </ul>
            )}
        </li>
    );
}
