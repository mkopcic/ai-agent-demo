<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;
use Opcodes\LogViewer\Facades\LogViewer;

class LogController extends Controller
{
    public function index(): Response
    {
        return Inertia::render('logs/index');
    }

    public function files(): JsonResponse
    {
        $files = LogViewer::getFiles();

        return response()->json(['data' => $files->map(fn ($f) => [
            'identifier' => $f->identifier,
            'name' => $f->name,
            'size_formatted' => $f->sizeFormatted(),
            'earliest_timestamp' => $f->earliestTimestamp(),
            'latest_timestamp' => $f->latestTimestamp(),
        ])->values()]);
    }

    public function entries(Request $request): JsonResponse
    {
        $file = LogViewer::getFile($request->query('file', ''));

        if (! $file) {
            return response()->json(['logs' => ['data' => []], 'levelCounts' => [], 'pagination' => null]);
        }

        $query = $file->logs();
        $query->search($request->query('query', ''));
        $query->reverse();
        $query->scan();

        $logs = $query->paginate((int) $request->query('per_page', 25));

        return response()->json([
            'logs' => ['data' => collect($logs->items())->map(fn ($log) => [
                'index' => $log->index,
                'file_identifier' => $log->fileIdentifier,
                'level' => strtolower($log->getLevel()->value),
                'level_name' => $log->getLevel()->getName(),
                'datetime' => $log->datetime?->format('Y-m-d H:i:s'),
                'message' => $log->message,
                'full_text' => $log->getOriginalText(),
            ])],
            'levelCounts' => collect($query->getLevelCounts())->values()->map(fn ($lc) => [
                'level' => strtolower($lc->level->value),
                'level_name' => $lc->level->getName(),
                'count' => $lc->count,
            ])->all(),
            'pagination' => [
                'current_page' => $logs->currentPage(),
                'last_page' => $logs->lastPage(),
                'total' => $logs->total(),
            ],
        ]);
    }
}
