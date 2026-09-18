import DiskController from '@/actions/App/Http/Controllers/DiskController';
import { cn } from '@/lib/utils';
import type { DiskInfo } from '@/types/explorer';
import { router } from '@inertiajs/react';
import { Check, ChevronsUpDown, HardDrive, Loader2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface DiskSwitcherProps {
    disk: DiskInfo;
    disks: DiskInfo[];
    className?: string;
}

export function DiskSwitcher({ disk, disks, className }: DiskSwitcherProps) {
    const [open, setOpen] = useState(false);
    const [switchingTo, setSwitchingTo] = useState<string | null>(null);
    const container = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!open) {
            return;
        }

        const onPointerDown = (event: PointerEvent) => {
            if (!container.current?.contains(event.target as Node)) {
                setOpen(false);
            }
        };

        const onKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        window.addEventListener('pointerdown', onPointerDown);
        window.addEventListener('keydown', onKeyDown);

        return () => {
            window.removeEventListener('pointerdown', onPointerDown);
            window.removeEventListener('keydown', onKeyDown);
        };
    }, [open]);

    const select = (name: string) => {
        setOpen(false);

        if (name === disk.name) {
            return;
        }

        setSwitchingTo(name);
        router.put(
            DiskController.url(),
            { disk: name },
            {
                preserveState: false,
                onFinish: () => setSwitchingTo(null),
            },
        );
    };

    const summary = (
        <>
            <span className="flex size-5 items-center justify-center rounded-full bg-neutral-100 dark:bg-white/10">
                {switchingTo ? (
                    <Loader2 className="size-3 animate-spin text-neutral-500 dark:text-neutral-400" />
                ) : (
                    <HardDrive className="size-3 text-neutral-500 dark:text-neutral-400" />
                )}
            </span>
            <span className="truncate font-medium">
                {switchingTo ?? disk.name}
            </span>
            <span className="hidden text-neutral-400 xl:inline dark:text-neutral-500">
                {disk.driver} driver
            </span>
            {disk.root && (
                <span className="hidden max-w-64 truncate font-mono text-neutral-500 2xl:inline dark:text-neutral-400">
                    {disk.root}
                </span>
            )}
        </>
    );

    const pillClasses =
        'h-8 min-w-0 max-w-full items-center gap-2 rounded-full border border-neutral-200 py-1 pr-3 pl-1.5 text-xs dark:border-white/10';

    if (disks.length < 2) {
        return (
            <div
                className={cn('flex', pillClasses, className)}
                title={disk.root ?? undefined}
            >
                {summary}
            </div>
        );
    }

    return (
        <div ref={container} className={cn('relative', className)}>
            <button
                type="button"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label="Switch disk"
                disabled={switchingTo !== null}
                onClick={() => setOpen((current) => !current)}
                className={cn(
                    'flex cursor-pointer transition-colors hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-neutral-300 focus-visible:outline-none disabled:opacity-60 dark:hover:bg-white/5 dark:focus-visible:ring-white/20',
                    pillClasses,
                )}
            >
                {summary}
                <ChevronsUpDown className="size-3 text-neutral-400" />
            </button>

            {open && (
                <div
                    role="listbox"
                    aria-label="Disks"
                    className="absolute top-full left-0 z-40 mt-1.5 w-[min(18rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-neutral-200 bg-white p-1 shadow-xl dark:border-white/10 dark:bg-neutral-900"
                >
                    {disks.map((option) => {
                        const isCurrent = option.name === disk.name;

                        return (
                            <button
                                key={option.name}
                                type="button"
                                role="option"
                                aria-selected={isCurrent}
                                onClick={() => select(option.name)}
                                className="flex w-full cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-neutral-100 dark:hover:bg-white/5"
                            >
                                <Check
                                    className={cn(
                                        'mt-0.5 size-3.5 shrink-0',
                                        isCurrent
                                            ? 'text-laravel'
                                            : 'text-transparent',
                                    )}
                                />
                                <span className="min-w-0 flex-1">
                                    <span className="flex items-baseline justify-between gap-2">
                                        <span className="truncate text-sm font-medium">
                                            {option.name}
                                        </span>
                                        <span className="shrink-0 font-mono text-[11px] text-neutral-400 dark:text-neutral-500">
                                            {option.driver}
                                        </span>
                                    </span>
                                    {option.root && (
                                        <span
                                            className="block truncate font-mono text-[11px] text-neutral-400 dark:text-neutral-500"
                                            title={option.root}
                                        >
                                            {option.root}
                                        </span>
                                    )}
                                </span>
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
