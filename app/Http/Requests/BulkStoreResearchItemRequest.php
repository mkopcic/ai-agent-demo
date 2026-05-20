<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class BulkStoreResearchItemRequest extends FormRequest
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
            'files' => ['nullable', 'array', 'max:20'],
            'files.*' => ['file', 'max:20480'],
            'file_notes' => ['nullable', 'array'],
            'file_notes.*' => ['nullable', 'string', 'max:5000'],
            'urls' => ['nullable', 'array', 'max:20'],
            'urls.*' => ['url', 'max:2048'],
            'url_notes' => ['nullable', 'array'],
            'url_notes.*' => ['nullable', 'string', 'max:5000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $hasFiles = ! empty($this->file('files'));
            $hasUrls = ! empty($this->input('urls'));

            if (! $hasFiles && ! $hasUrls) {
                $validator->errors()->add('files', 'Please provide at least one file or URL.');
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'files.max' => 'You can upload a maximum of 20 files at once.',
            'files.*.max' => 'Each file must not exceed 20MB.',
            'urls.max' => 'You can submit a maximum of 20 URLs at once.',
            'urls.*.url' => 'Each URL must be a valid URL.',
        ];
    }
}
