<?php

namespace App\Http\Controllers\Settings;

use App\Http\Controllers\Controller;
use App\Http\Requests\Settings\ApiKeyUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class ApiKeyController extends Controller
{
    public function edit(Request $request): Response
    {
        return Inertia::render('settings/api-keys', [
            'hasOpenAiKey' => $request->user()->hasOpenAiKey(),
        ]);
    }

    public function update(ApiKeyUpdateRequest $request): RedirectResponse
    {
        $key = $request->validated('openai_api_key');

        $request->user()->update([
            'openai_api_key' => $key ?: null,
        ]);

        return to_route('api-keys.edit')
            ->with('status', 'api-key-updated');
    }
}
