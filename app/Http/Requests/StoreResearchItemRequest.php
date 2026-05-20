<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreResearchItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'type' => ['required', Rule::in(['image', 'document', 'url'])],
            'file' => ['required_if:type,image,document', 'nullable', 'file', 'max:20480'],
            'url' => ['required_if:type,url', 'nullable', 'url', 'max:2048'],
            'notes' => ['nullable', 'string', 'max:5000'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required_if' => 'A file is required for image or document uploads.',
            'url.required_if' => 'A URL is required for URL captures.',
            'file.max' => 'The file size must not exceed 20MB.',
        ];
    }
}
