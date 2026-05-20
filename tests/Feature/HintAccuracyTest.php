<?php

use Illuminate\Support\Facades\File;

it('keeps AI SDK hints aligned with usage', function () {
    $content = File::get(base_path('resources/js/components/demo/feature-badge.tsx'));

    expect($content)->toContain('RemembersConversations')
        ->and($content)->toContain('Image::fromStorage')
        ->and($content)->toContain('FileSearch(stores:')
        ->and($content)->not->toContain("'middleware'");
});
