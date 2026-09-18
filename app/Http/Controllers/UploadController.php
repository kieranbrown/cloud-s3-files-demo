<?php

namespace App\Http\Controllers;

use App\Explorer\FileBrowser;
use App\Http\Requests\UploadFilesRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\UploadedFile;

class UploadController
{
    public function __construct(protected FileBrowser $browser) {}

    /**
     * Store one or more uploaded files inside a directory.
     */
    public function __invoke(UploadFilesRequest $request): RedirectResponse
    {
        $directory = $request->string('path')->toString();

        /** @var list<UploadedFile> $files */
        $files = $request->file('files', []);

        foreach ($files as $file) {
            $this->browser->upload($directory, $file);
        }

        return back();
    }
}
