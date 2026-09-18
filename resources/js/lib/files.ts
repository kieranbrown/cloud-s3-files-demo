import type { Entry } from '@/types/explorer';

export type IconKind =
    | 'code'
    | 'json'
    | 'markdown'
    | 'text'
    | 'image'
    | 'video'
    | 'audio'
    | 'archive'
    | 'pdf'
    | 'spreadsheet'
    | 'config'
    | 'lock'
    | 'file';

const CODE = new Set([
    'php',
    'js',
    'mjs',
    'cjs',
    'jsx',
    'ts',
    'mts',
    'cts',
    'tsx',
    'vue',
    'svelte',
    'astro',
    'py',
    'rb',
    'go',
    'rs',
    'java',
    'kt',
    'kts',
    'swift',
    'c',
    'h',
    'cpp',
    'hpp',
    'cs',
    'sh',
    'bash',
    'zsh',
    'fish',
    'ps1',
    'sql',
    'graphql',
    'gql',
    'proto',
    'html',
    'htm',
    'css',
    'scss',
    'sass',
    'less',
    'xml',
    'blade',
]);
const CONFIG = new Set([
    'yaml',
    'yml',
    'toml',
    'ini',
    'env',
    'conf',
    'cfg',
    'properties',
    'tf',
    'tfvars',
    'hcl',
    'editorconfig',
    'htaccess',
    'gitignore',
    'gitattributes',
]);
const IMAGE = new Set([
    'png',
    'jpg',
    'jpeg',
    'gif',
    'webp',
    'avif',
    'svg',
    'bmp',
    'ico',
    'heic',
    'tiff',
]);
const VIDEO = new Set(['mp4', 'webm', 'mov', 'mkv', 'avi', 'm4v']);
const AUDIO = new Set(['mp3', 'wav', 'ogg', 'flac', 'm4a', 'aac']);
const ARCHIVE = new Set([
    'zip',
    'tar',
    'gz',
    'tgz',
    'bz2',
    'xz',
    'zst',
    '7z',
    'rar',
]);
const SPREADSHEET = new Set(['csv', 'tsv', 'xls', 'xlsx', 'numbers']);

export function iconKind(entry: Pick<Entry, 'name' | 'extension'>): IconKind {
    const name = entry.name.toLowerCase();
    const extension = entry.extension ?? '';

    if (name.endsWith('.blade.php')) {
        return 'code';
    }

    if (
        name.endsWith('.lock') ||
        name === 'package-lock.json' ||
        name === 'yarn.lock'
    ) {
        return 'lock';
    }

    if (
        name === 'dockerfile' ||
        name === 'makefile' ||
        name.startsWith('.env')
    ) {
        return 'config';
    }

    if (
        extension === 'json' ||
        extension === 'jsonc' ||
        extension === 'json5'
    ) {
        return 'json';
    }

    if (extension === 'md' || extension === 'markdown' || extension === 'mdx') {
        return 'markdown';
    }

    if (extension === 'pdf') {
        return 'pdf';
    }

    if (CODE.has(extension)) {
        return 'code';
    }

    if (CONFIG.has(extension)) {
        return 'config';
    }

    if (IMAGE.has(extension)) {
        return 'image';
    }

    if (VIDEO.has(extension)) {
        return 'video';
    }

    if (AUDIO.has(extension)) {
        return 'audio';
    }

    if (ARCHIVE.has(extension)) {
        return 'archive';
    }

    if (SPREADSHEET.has(extension)) {
        return 'spreadsheet';
    }

    if (extension === 'txt' || extension === 'log' || extension === 'rst') {
        return 'text';
    }

    return 'file';
}

const LANGUAGES: Record<string, string> = {
    php: 'php',
    blade: 'blade',
    js: 'javascript',
    mjs: 'javascript',
    cjs: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    mts: 'typescript',
    cts: 'typescript',
    tsx: 'tsx',
    vue: 'vue',
    svelte: 'svelte',
    astro: 'astro',
    json: 'json',
    jsonc: 'jsonc',
    json5: 'json5',
    md: 'markdown',
    markdown: 'markdown',
    mdx: 'mdx',
    yml: 'yaml',
    yaml: 'yaml',
    toml: 'toml',
    ini: 'ini',
    cfg: 'ini',
    conf: 'ini',
    properties: 'properties',
    env: 'dotenv',
    xml: 'xml',
    svg: 'xml',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'fish',
    ps1: 'powershell',
    sql: 'sql',
    graphql: 'graphql',
    gql: 'graphql',
    proto: 'proto',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    kts: 'kotlin',
    swift: 'swift',
    c: 'c',
    h: 'c',
    cpp: 'cpp',
    hpp: 'cpp',
    cs: 'csharp',
    tf: 'hcl',
    tfvars: 'hcl',
    hcl: 'hcl',
    csv: 'csv',
    log: 'log',
    diff: 'diff',
    patch: 'diff',
};

export function languageFor(name: string, extension: string | null): string {
    const lower = name.toLowerCase();

    if (lower.endsWith('.blade.php')) {
        return 'blade';
    }

    if (lower === 'dockerfile') {
        return 'dockerfile';
    }

    if (lower === 'makefile') {
        return 'makefile';
    }

    if (lower.startsWith('.env')) {
        return 'dotenv';
    }

    if (lower === 'composer.lock' || lower === 'package-lock.json') {
        return 'json';
    }

    return LANGUAGES[extension ?? ''] ?? 'text';
}
