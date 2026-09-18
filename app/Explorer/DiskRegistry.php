<?php

namespace App\Explorer;

use Illuminate\Contracts\Session\Session;
use Illuminate\Support\Str;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Keeps track of which filesystem disk the explorer is browsing.
 *
 * The switchable disks come from `explorer.disks`, so the list survives config
 * caching, and the current selection is remembered in the session.
 *
 * @phpstan-type Disk array{name: string, driver: string, root: string|null}
 */
class DiskRegistry
{
    /**
     * Session key holding the name of the selected disk.
     */
    protected const string SESSION_KEY = 'explorer.disk';

    public function __construct(protected Session $session) {}

    /**
     * Names of the disks that may be browsed, in configured order.
     *
     * @return list<string>
     */
    public function names(): array
    {
        /** @var list<string> $configured */
        $configured = config('explorer.disks', []);

        $names = array_values(array_filter(
            $configured,
            fn (string $name): bool => is_array(config("filesystems.disks.{$name}")),
        ));

        return $names === [] ? [(string) config('filesystems.default')] : $names;
    }

    /**
     * Describe every disk that may be browsed.
     *
     * @return list<Disk>
     */
    public function all(): array
    {
        return array_map($this->describe(...), $this->names());
    }

    /**
     * The name of the disk currently being browsed.
     */
    public function current(): string
    {
        $names = $this->names();
        $selected = $this->session->get(self::SESSION_KEY);

        return is_string($selected) && in_array($selected, $names, true)
            ? $selected
            : $names[0];
    }

    /**
     * Switch to another browsable disk.
     */
    public function select(string $name): void
    {
        if (! in_array($name, $this->names(), true)) {
            throw new NotFoundHttpException("The [{$name}] disk is not browsable.");
        }

        $this->session->put(self::SESSION_KEY, $name);
    }

    /**
     * Describe a disk's driver and root.
     *
     * @return Disk
     */
    public function describe(string $name): array
    {
        /** @var array<string, mixed> $config */
        $config = config("filesystems.disks.{$name}", []);

        $root = match (true) {
            isset($config['root']) => Str::of((string) $config['root'])
                ->replaceStart(base_path().DIRECTORY_SEPARATOR, '')
                ->toString(),
            isset($config['bucket']) => 's3://'.$config['bucket'],
            default => null,
        };

        return [
            'name' => $name,
            'driver' => (string) ($config['driver'] ?? 'unknown'),
            'root' => $root,
        ];
    }
}
