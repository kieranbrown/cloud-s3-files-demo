<?php

namespace App\Http\Controllers;

use App\Explorer\DiskRegistry;
use App\Http\Requests\SelectDiskRequest;
use Illuminate\Http\RedirectResponse;

class DiskController
{
    public function __construct(protected DiskRegistry $disks) {}

    /**
     * Browse a different disk, starting again at its root.
     */
    public function __invoke(SelectDiskRequest $request): RedirectResponse
    {
        $this->disks->select($request->string('disk')->toString());

        return to_route('explorer');
    }
}
