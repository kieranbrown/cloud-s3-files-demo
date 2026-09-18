<?php

namespace App\Http\Controllers;

use App\Explorer\DiskRegistry;
use App\Explorer\FileBrowser;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ExplorerController
{
    public function __construct(
        protected FileBrowser $browser,
        protected DiskRegistry $disks,
    ) {}

    /**
     * Render the explorer for a directory on the selected disk.
     */
    public function index(Request $request): Response
    {
        $path = $this->browser->normalize($request->string('path')->toString());
        $disk = $this->disks->current();

        return Inertia::render('explorer', [
            'disk' => $this->disks->describe($disk),
            'disks' => $this->disks->all(),
            'path' => $path,
            'breadcrumbs' => $this->browser->breadcrumbs($path),
            'entries' => $this->browser->entries($path),
            'roots' => Inertia::once(fn (): array => $this->browser->directories(''))->as("roots:{$disk}"),
        ]);
    }
}
