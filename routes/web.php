<?php

use App\Http\Controllers\DirectoryController;
use App\Http\Controllers\DiskController;
use App\Http\Controllers\ExplorerController;
use App\Http\Controllers\FileController;
use App\Http\Controllers\UploadController;
use Illuminate\Support\Facades\Route;

Route::get('/', [ExplorerController::class, 'index'])->name('explorer');

Route::prefix('explorer')->name('explorer.')->group(function (): void {
    Route::put('disk', DiskController::class)->name('disk.update');

    Route::get('directories', [DirectoryController::class, 'index'])->name('directories.index');
    Route::post('directories', [DirectoryController::class, 'store'])->name('directories.store');
    Route::delete('directories', [DirectoryController::class, 'destroy'])->name('directories.destroy');

    Route::get('files', [FileController::class, 'show'])->name('files.show');
    Route::post('files', [FileController::class, 'store'])->name('files.store');
    Route::put('files', [FileController::class, 'update'])->name('files.update');
    Route::delete('files', [FileController::class, 'destroy'])->name('files.destroy');
    Route::get('files/stream', [FileController::class, 'stream'])->name('files.stream');
    Route::get('files/download', [FileController::class, 'download'])->name('files.download');

    Route::post('uploads', UploadController::class)->name('uploads.store');
});
