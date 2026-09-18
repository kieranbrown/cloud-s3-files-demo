<?php

namespace App\Explorer;

use Illuminate\Filesystem\FilesystemAdapter;
use Illuminate\Filesystem\FilesystemManager;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Date;
use Illuminate\Validation\ValidationException;
use League\Flysystem\DirectoryAttributes;
use League\Flysystem\FileAttributes;
use League\Flysystem\StorageAttributes;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Browses a Laravel filesystem disk without caring which driver backs it.
 *
 * Everything goes through the Illuminate filesystem adapter, so the same code
 * works against the local driver (including an S3 Files / EFS mount), S3, FTP,
 * or any other Flysystem-backed disk.
 *
 * @phpstan-type Entry array{
 *     name: string,
 *     path: string,
 *     type: 'directory'|'file',
 *     extension: string|null,
 *     size: int|null,
 *     lastModified: string|null
 * }
 * @phpstan-type FileDetails array{
 *     name: string,
 *     path: string,
 *     extension: string|null,
 *     size: int,
 *     lastModified: string|null,
 *     mimeType: string,
 *     kind: 'text'|'image'|'pdf'|'video'|'audio'|'binary',
 *     content: string|null,
 *     truncated: bool
 * }
 */
class FileBrowser
{
    /**
     * Largest file (in bytes) whose contents are returned for text preview.
     */
    public const int MAX_TEXT_BYTES = 1024 * 1024;

    /**
     * Largest file (in bytes) that is sniffed for binary content.
     */
    protected const int MAX_SNIFF_BYTES = 8 * 1024 * 1024;

    /**
     * Extensions that are always treated as text regardless of detected MIME type.
     *
     * @var list<string>
     */
    protected const array TEXT_EXTENSIONS = [
        'txt', 'md', 'markdown', 'mdx', 'rst', 'log', 'csv', 'tsv',
        'json', 'jsonc', 'json5', 'yaml', 'yml', 'toml', 'ini', 'env', 'conf', 'cfg', 'properties',
        'xml', 'html', 'htm', 'xhtml', 'svg', 'css', 'scss', 'sass', 'less',
        'js', 'mjs', 'cjs', 'jsx', 'ts', 'mts', 'cts', 'tsx', 'vue', 'svelte', 'astro',
        'php', 'blade.php', 'py', 'rb', 'go', 'rs', 'java', 'kt', 'kts', 'swift', 'c', 'h', 'cpp', 'hpp', 'cs',
        'sh', 'bash', 'zsh', 'fish', 'ps1', 'bat', 'cmd', 'sql', 'graphql', 'gql', 'proto',
        'tf', 'tfvars', 'hcl', 'dockerfile', 'makefile', 'lock', 'gitignore', 'gitattributes', 'editorconfig', 'htaccess',
    ];

    protected ?FilesystemAdapter $disk = null;

    public function __construct(
        protected FilesystemManager $filesystems,
        protected DiskRegistry $disks,
    ) {}

    /**
     * The disk being browsed, as chosen in the disk registry.
     */
    protected function disk(): FilesystemAdapter
    {
        return $this->disk ??= $this->filesystems->disk($this->disks->current());
    }

    /**
     * Normalise a user-supplied path, rejecting anything that could escape the disk root.
     */
    public function normalize(string $path): string
    {
        $path = str_replace('\\', '/', trim($path));

        if (str_contains($path, "\0")) {
            throw new NotFoundHttpException('Invalid path.');
        }

        $segments = [];

        foreach (explode('/', $path) as $segment) {
            if ($segment === '' || $segment === '.') {
                continue;
            }

            if ($segment === '..') {
                throw new NotFoundHttpException('Invalid path.');
            }

            $segments[] = $segment;
        }

        return implode('/', $segments);
    }

    /**
     * Build the breadcrumb trail for a directory.
     *
     * @return list<array{name: string, path: string}>
     */
    public function breadcrumbs(string $directory): array
    {
        $directory = $this->normalize($directory);

        if ($directory === '') {
            return [];
        }

        $crumbs = [];
        $current = '';

        foreach (explode('/', $directory) as $segment) {
            $current = $current === '' ? $segment : $current.'/'.$segment;
            $crumbs[] = ['name' => $segment, 'path' => $current];
        }

        return $crumbs;
    }

    /**
     * List the immediate children of a directory, directories first.
     *
     * @return list<Entry>
     */
    public function entries(string $directory): array
    {
        $directory = $this->normalize($directory);

        if ($directory !== '' && ! $this->disk()->directoryExists($directory)) {
            throw new NotFoundHttpException('Directory not found.');
        }

        /** @var iterable<StorageAttributes> $listing */
        $listing = $this->disk()->listContents($directory, false);

        return collect($listing)
            ->map(fn (StorageAttributes $attributes): array => $this->entryFromAttributes($attributes))
            ->sort(fn (array $a, array $b): int => strcmp($a['type'], $b['type']) ?: strnatcasecmp($a['name'], $b['name']))
            ->values()
            ->all();
    }

    /**
     * List only the sub-directories of a directory.
     *
     * @return list<Entry>
     */
    public function directories(string $directory): array
    {
        return array_values(array_filter(
            $this->entries($directory),
            fn (array $entry): bool => $entry['type'] === 'directory',
        ));
    }

    /**
     * Describe a file, including its contents when it is previewable text.
     *
     * @return FileDetails
     */
    public function file(string $path): array
    {
        $path = $this->existingFile($path);

        $size = $this->disk()->size($path);
        $mimeType = $this->safeMimeType($path);
        $kind = $this->kind($path, $mimeType, $size);

        if ($kind === 'text' && $mimeType === 'application/octet-stream') {
            $mimeType = 'text/plain';
        }

        $content = null;
        $truncated = false;

        if ($kind === 'text') {
            $content = $this->disk()->get($path) ?? '';

            if (strlen($content) > self::MAX_TEXT_BYTES) {
                $content = substr($content, 0, self::MAX_TEXT_BYTES);
                $truncated = true;
            }
        }

        return [
            'name' => basename($path),
            'path' => $path,
            'extension' => $this->extension($path),
            'size' => $size,
            'lastModified' => $this->timestamp($this->disk()->lastModified($path)),
            'mimeType' => $mimeType,
            'kind' => $kind,
            'content' => $content,
            'truncated' => $truncated,
        ];
    }

    /**
     * Stream a file inline (for previews).
     */
    public function stream(string $path): StreamedResponse
    {
        return $this->disk()->response($this->existingFile($path));
    }

    /**
     * Stream a file as an attachment.
     */
    public function download(string $path): StreamedResponse
    {
        return $this->disk()->download($this->existingFile($path));
    }

    /**
     * Overwrite a file's contents.
     */
    public function write(string $path, string $contents): void
    {
        $path = $this->existingFile($path);

        if (! $this->disk()->put($path, $contents)) {
            throw new RuntimeException("Unable to write [{$path}].");
        }
    }

    /**
     * Store an uploaded file inside a directory, keeping its original name.
     */
    public function upload(string $directory, UploadedFile $file): string
    {
        $directory = $this->normalize($directory);
        $name = $this->safeName($file->getClientOriginalName());

        $path = $this->disk()->putFileAs($directory, $file, $name);

        if ($path === false) {
            throw new RuntimeException("Unable to store [{$name}].");
        }

        return $path;
    }

    /**
     * Create a new file inside a directory from the given contents.
     */
    public function createFile(string $parent, string $name, string $contents): string
    {
        $path = $this->normalize($this->normalize($parent).'/'.$this->safeName($name));

        if ($this->disk()->exists($path)) {
            throw ValidationException::withMessages([
                'name' => 'Something with that name already exists here.',
            ]);
        }

        if (! $this->disk()->put($path, $contents)) {
            throw new RuntimeException("Unable to create [{$path}].");
        }

        return $path;
    }

    /**
     * Create a new directory inside a parent directory.
     */
    public function createDirectory(string $parent, string $name): string
    {
        $path = $this->normalize($this->normalize($parent).'/'.$this->safeName($name));

        if ($this->disk()->exists($path)) {
            throw ValidationException::withMessages([
                'name' => 'Something with that name already exists here.',
            ]);
        }

        if (! $this->disk()->makeDirectory($path)) {
            throw new RuntimeException("Unable to create directory [{$path}].");
        }

        return $path;
    }

    /**
     * Delete a file or directory (recursively).
     */
    public function delete(string $path): void
    {
        $path = $this->normalize($path);

        if ($path === '') {
            throw new NotFoundHttpException('The root directory cannot be deleted.');
        }

        if ($this->disk()->directoryExists($path)) {
            if (! $this->disk()->deleteDirectory($path)) {
                throw new RuntimeException("Unable to delete directory [{$path}].");
            }

            return;
        }

        if (! $this->disk()->fileExists($path)) {
            throw new NotFoundHttpException('File not found.');
        }

        if (! $this->disk()->delete($path)) {
            throw new RuntimeException("Unable to delete [{$path}].");
        }
    }

    /**
     * Normalise a path and ensure it points at an existing file.
     */
    protected function existingFile(string $path): string
    {
        $path = $this->normalize($path);

        if ($path === '' || ! $this->disk()->fileExists($path)) {
            throw new NotFoundHttpException('File not found.');
        }

        return $path;
    }

    /**
     * Reduce a user-supplied file or directory name to a single safe path segment.
     */
    protected function safeName(string $name): string
    {
        $name = trim(preg_replace('/[\x00-\x1F\x7F\/\\\\]+/u', '', $name) ?? '');

        if ($name === '' || $name === '.' || $name === '..') {
            throw ValidationException::withMessages([
                'name' => 'That name is not allowed.',
            ]);
        }

        return $name;
    }

    /**
     * @return Entry
     */
    protected function entryFromAttributes(StorageAttributes $attributes): array
    {
        $path = $attributes->path();

        return [
            'name' => basename($path),
            'path' => $path,
            'type' => $attributes instanceof DirectoryAttributes ? 'directory' : 'file',
            'extension' => $attributes instanceof FileAttributes ? $this->extension($path) : null,
            'size' => $attributes instanceof FileAttributes ? $attributes->fileSize() : null,
            'lastModified' => $this->timestamp($attributes->lastModified()),
        ];
    }

    /**
     * Decide how a file should be previewed.
     *
     * @return 'text'|'image'|'pdf'|'video'|'audio'|'binary'
     */
    protected function kind(string $path, string $mimeType, int $size): string
    {
        $extension = $this->extension($path);
        $isTextExtension = $extension !== null && in_array($extension, self::TEXT_EXTENSIONS, true);

        return match (true) {
            str_starts_with($mimeType, 'image/') => 'image',
            $mimeType === 'application/pdf' => 'pdf',
            str_starts_with($mimeType, 'video/') && ! $isTextExtension => 'video',
            str_starts_with($mimeType, 'audio/') && ! $isTextExtension => 'audio',
            $isTextExtension, str_starts_with($mimeType, 'text/') => 'text',
            $size <= self::MAX_SNIFF_BYTES && $this->looksLikeText($path) => 'text',
            default => 'binary',
        };
    }

    /**
     * Sniff the first few kilobytes of a file for binary content.
     */
    protected function looksLikeText(string $path): bool
    {
        $stream = $this->disk()->readStream($path);

        if (! is_resource($stream)) {
            return false;
        }

        $sample = fread($stream, 8192);
        fclose($stream);

        return is_string($sample) && ! str_contains($sample, "\0");
    }

    /**
     * Resolve a MIME type, falling back to a generic binary type when the driver cannot tell.
     */
    protected function safeMimeType(string $path): string
    {
        try {
            $mimeType = $this->disk()->mimeType($path);
        } catch (\Throwable) {
            $mimeType = false;
        }

        return is_string($mimeType) && $mimeType !== '' ? $mimeType : 'application/octet-stream';
    }

    protected function extension(string $path): ?string
    {
        $extension = strtolower(pathinfo($path, PATHINFO_EXTENSION));

        return $extension === '' ? null : $extension;
    }

    protected function timestamp(?int $timestamp): ?string
    {
        return $timestamp === null ? null : Date::createFromTimestamp($timestamp)->toIso8601String();
    }
}
