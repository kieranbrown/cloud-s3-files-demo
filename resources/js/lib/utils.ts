import { clsx, type ClassValue } from 'clsx';

export function cn(...inputs: ClassValue[]): string {
    return clsx(inputs);
}

const UNITS = ['B', 'KB', 'MB', 'GB', 'TB'];

export function formatBytes(bytes: number | null | undefined): string {
    if (bytes === null || bytes === undefined) {
        return '—';
    }

    if (bytes < 1024) {
        return `${bytes} B`;
    }

    let value = bytes;
    let unit = 0;

    while (value >= 1024 && unit < UNITS.length - 1) {
        value /= 1024;
        unit += 1;
    }

    return `${value.toFixed(value >= 100 ? 0 : 1)} ${UNITS[unit]}`;
}

const dateFormatter = new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
});

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
});

export function formatDate(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    return dateFormatter.format(new Date(iso));
}

export function formatRelative(iso: string | null | undefined): string {
    if (!iso) {
        return '—';
    }

    const seconds = Math.round((new Date(iso).getTime() - Date.now()) / 1000);
    const absolute = Math.abs(seconds);

    if (absolute < 45) {
        return 'just now';
    }

    if (absolute < 3600) {
        return relativeFormatter.format(Math.round(seconds / 60), 'minute');
    }

    if (absolute < 86400) {
        return relativeFormatter.format(Math.round(seconds / 3600), 'hour');
    }

    if (absolute < 86400 * 30) {
        return relativeFormatter.format(Math.round(seconds / 86400), 'day');
    }

    return dateFormatter.format(new Date(iso));
}

export function parentPath(path: string): string {
    const index = path.lastIndexOf('/');

    return index === -1 ? '' : path.slice(0, index);
}
