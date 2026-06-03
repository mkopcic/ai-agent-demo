<?php

use App\Http\Controllers\ConversationController;
use App\Http\Controllers\LogController;
use App\Http\Controllers\ResearchController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use Laravel\Fortify\Features;

Route::get('/', function () {
    return Inertia::render('welcome', [
        'canRegister' => Features::enabled(Features::registration()),
    ]);
})->name('home');

Route::get('dashboard', function () {
    return redirect()->route('research.index');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware(['auth', 'verified'])->group(function () {
    Route::get('logs', [LogController::class, 'index'])->name('logs.index');
    Route::get('api/logs/files', [LogController::class, 'files'])->name('logs.files');
    Route::get('api/logs/entries', [LogController::class, 'entries'])->name('logs.entries');

    Route::get('research', [ResearchController::class, 'index'])->name('research.index');
    Route::post('research', [ResearchController::class, 'store'])->name('research.store');
    Route::post('research/bulk', [ResearchController::class, 'bulkStore'])->name('research.bulk-store');

    Route::get('research/chat', [ConversationController::class, 'index'])->name('research.chat');
    Route::post('research/chat/stream', [ConversationController::class, 'stream'])->name('research.stream');
    Route::get('research/chat/{conversation}/title-stream', [ConversationController::class, 'titleStream'])->name('research.chat.title-stream');
    Route::delete('research/chat/{conversation}', [ConversationController::class, 'destroy'])->name('research.chat.destroy');

    Route::get('research/{item}', [ResearchController::class, 'show'])->name('research.show');
    Route::put('research/{item}', [ResearchController::class, 'update'])->name('research.update');
    Route::post('research/{item}/replace', [ResearchController::class, 'replaceWithFile'])->name('research.replace');
    Route::get('research/{item}/file', [ResearchController::class, 'serveFile'])->name('research.serve-file');
    Route::delete('research/{item}', [ResearchController::class, 'destroy'])->name('research.destroy');
});

require __DIR__.'/settings.php';
