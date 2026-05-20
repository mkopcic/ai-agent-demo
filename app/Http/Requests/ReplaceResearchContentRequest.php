<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class ReplaceResearchContentRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->route('item')->user_id === $this->user()->id;
    }

    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'file' => ['required', 'file', 'max:20480', 'mimes:jpg,jpeg,png,gif,webp,pdf'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'file.required' => 'Please upload a file to replace the failed URL content.',
            'file.max' => 'The file size must not exceed 20MB.',
            'file.mimes' => 'The file must be an image (JPG, PNG, GIF, WebP) or PDF.',
        ];
    }
}
