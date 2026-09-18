<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Switchable Disks
    |--------------------------------------------------------------------------
    |
    | The filesystem disks the explorer lets you switch between, as a comma
    | separated list of disk names from `config/filesystems.php`. Names
    | that are not configured as disks are ignored, and the first
    | entry is the disk the explorer opens on.
    |
    */

    'disks' => array_values(array_filter(array_map(
        trim(...),
        explode(',', (string) env('EXPLORER_DISKS', env('FILESYSTEM_DISK', 'local'))),
    ), fn (string $disk): bool => $disk !== '')),

];
