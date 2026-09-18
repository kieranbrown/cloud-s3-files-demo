<?php

namespace App\Http\Controllers;

use App\Explorer\FileBrowser;
use App\Http\Requests\StoreDirectoryRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

class DirectoryController
{
    public function __construct(protected FileBrowser $browser) {}

    /**
     * List the sub-directories of a directory (used to lazily expand the tree).
     */
    public function index(Request $request): JsonResponse
    {
        $path = $request->string('path')->toString();

        return response()->json([
            'path' => $this->browser->normalize($path),
            'directories' => $this->browser->directories($path),
        ]);
    }

    /**
     * Create a directory inside the given parent.
     */
    public function store(StoreDirectoryRequest $request): RedirectResponse
    {
        $this->browser->createDirectory(
            $request->string('path')->toString(),
            $request->string('name')->toString(),
        );

        return back();
    }

    /**
     * Delete a directory and everything inside it.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $validated = $request->validate(['path' => ['required', 'string']]);

        $this->browser->delete($validated['path']);

        return back();
    }
}
