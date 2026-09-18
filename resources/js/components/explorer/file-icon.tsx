import { iconKind, type IconKind } from '@/lib/files';
import { cn } from '@/lib/utils';
import type { Entry } from '@/types/explorer';
import {
    File,
    FileArchive,
    FileAudio,
    FileCode2,
    FileCog,
    FileImage,
    FileJson2,
    FileLock2,
    FileSpreadsheet,
    FileText,
    FileType2,
    FileVideo,
    Folder,
    type LucideProps,
} from 'lucide-react';
import type { ComponentType } from 'react';

const ICONS: Record<
    IconKind,
    { icon: ComponentType<LucideProps>; tone: string }
> = {
    code: { icon: FileCode2, tone: 'text-sky-500 dark:text-sky-400' },
    json: { icon: FileJson2, tone: 'text-amber-500 dark:text-amber-400' },
    markdown: {
        icon: FileText,
        tone: 'text-neutral-500 dark:text-neutral-400',
    },
    text: { icon: FileText, tone: 'text-neutral-500 dark:text-neutral-400' },
    image: { icon: FileImage, tone: 'text-violet-500 dark:text-violet-400' },
    video: { icon: FileVideo, tone: 'text-pink-500 dark:text-pink-400' },
    audio: { icon: FileAudio, tone: 'text-fuchsia-500 dark:text-fuchsia-400' },
    archive: {
        icon: FileArchive,
        tone: 'text-orange-500 dark:text-orange-400',
    },
    pdf: { icon: FileType2, tone: 'text-red-500 dark:text-red-400' },
    spreadsheet: {
        icon: FileSpreadsheet,
        tone: 'text-emerald-500 dark:text-emerald-400',
    },
    config: { icon: FileCog, tone: 'text-teal-500 dark:text-teal-400' },
    lock: { icon: FileLock2, tone: 'text-neutral-400 dark:text-neutral-500' },
    file: { icon: File, tone: 'text-neutral-400 dark:text-neutral-500' },
};

interface FileIconProps {
    entry: Pick<Entry, 'name' | 'extension' | 'type'>;
    className?: string;
}

export function FileIcon({ entry, className }: FileIconProps) {
    if (entry.type === 'directory') {
        return (
            <Folder
                className={cn('text-laravel', className)}
                fill="currentColor"
                fillOpacity={0.18}
                strokeWidth={1.75}
                aria-hidden="true"
            />
        );
    }

    const { icon: Icon, tone } = ICONS[iconKind(entry)];

    return (
        <Icon
            className={cn(tone, className)}
            strokeWidth={1.75}
            aria-hidden="true"
        />
    );
}
