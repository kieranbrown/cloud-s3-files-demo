export type EntryType = 'directory' | 'file';

export interface Entry {
    name: string;
    path: string;
    type: EntryType;
    extension: string | null;
    size: number | null;
    lastModified: string | null;
}

export type FileKind = 'text' | 'image' | 'pdf' | 'video' | 'audio' | 'binary';

export interface FileDetails {
    name: string;
    path: string;
    extension: string | null;
    size: number;
    lastModified: string | null;
    mimeType: string;
    kind: FileKind;
    content: string | null;
    truncated: boolean;
}

export interface Breadcrumb {
    name: string;
    path: string;
}

export interface DiskInfo {
    name: string;
    driver: string;
    root: string | null;
}

export interface ExplorerPageProps {
    disk: DiskInfo;
    disks: DiskInfo[];
    path: string;
    breadcrumbs: Breadcrumb[];
    entries: Entry[];
    roots: Entry[];
}

export interface DirectoriesResponse {
    path: string;
    directories: Entry[];
}
