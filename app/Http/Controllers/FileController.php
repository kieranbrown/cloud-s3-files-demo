<?php

namespace App\Http\Controllers;

use App\Explorer\FileBrowser;
use App\Http\Requests\UpdateFileRequest;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class FileController
{
    public function __construct(protected FileBrowser $browser) {}

    /**
     * Describe a file, including its contents when it is previewable text.
     */
    public function show(Request $request): JsonResponse
    {
        $validated = $request->validate(['path' => ['required', 'string']]);

        return response()->json($this->browser->file($validated['path']));
    }

    /**
     * Stream a file inline for in-browser previews.
     */
    public function stream(Request $request): StreamedResponse
    {
        $validated = $request->validate(['path' => ['required', 'string']]);

        return $this->browser->stream($validated['path']);
    }

    /**
     * Stream a file as a download.
     */
    public function download(Request $request): StreamedResponse
    {
        $validated = $request->validate(['path' => ['required', 'string']]);

        return $this->browser->download($validated['path']);
    }

    /**
     * Overwrite a text file's contents.
     */
    public function update(UpdateFileRequest $request): JsonResponse
    {
        $this->browser->write(
            $request->string('path')->toString(),
            $request->string('content')->toString(),
        );

        return response()->json($this->browser->file($request->string('path')->toString()));
    }

    /**
     * Delete a file.
     */
    public function destroy(Request $request): RedirectResponse
    {
        $validated = $request->validate(['path' => ['required', 'string']]);

        $this->browser->delete($validated['path']);

        return back();
    }
}
