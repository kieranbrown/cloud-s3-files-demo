import { cn } from '@/lib/utils';
import type { Breadcrumb } from '@/types/explorer';
import { ChevronRight, HardDrive } from 'lucide-react';
import { Fragment } from 'react';

interface BreadcrumbsProps {
    diskName: string;
    crumbs: Breadcrumb[];
    onNavigate: (path: string) => void;
}

export function Breadcrumbs({
    diskName,
    crumbs,
    onNavigate,
}: BreadcrumbsProps) {
    const crumbClasses =
        'flex h-7 max-w-56 cursor-pointer items-center gap-1.5 rounded-md px-2 text-sm transition-colors hover:bg-neutral-100 dark:hover:bg-white/5';

    return (
        <nav
            aria-label="Breadcrumb"
            className="flex min-w-0 scrollbar-thin items-center gap-0.5 overflow-x-auto"
        >
            <button
                type="button"
                onClick={() => onNavigate('')}
                className={cn(
                    crumbClasses,
                    crumbs.length === 0
                        ? 'font-medium text-neutral-900 dark:text-white'
                        : 'text-neutral-500 dark:text-neutral-400',
                )}
            >
                <HardDrive className="size-3.5 shrink-0" />
                <span className="truncate">{diskName}</span>
            </button>
            {crumbs.map((crumb, index) => {
                const isLast = index === crumbs.length - 1;

                return (
                    <Fragment key={crumb.path}>
                        <ChevronRight className="size-3.5 shrink-0 text-neutral-300 dark:text-neutral-600" />
                        <button
                            type="button"
                            onClick={() => onNavigate(crumb.path)}
                            aria-current={isLast ? 'page' : undefined}
                            className={cn(
                                crumbClasses,
                                isLast
                                    ? 'font-medium text-neutral-900 dark:text-white'
                                    : 'text-neutral-500 dark:text-neutral-400',
                            )}
                        >
                            <span className="truncate">{crumb.name}</span>
                        </button>
                    </Fragment>
                );
            })}
        </nav>
    );
}
