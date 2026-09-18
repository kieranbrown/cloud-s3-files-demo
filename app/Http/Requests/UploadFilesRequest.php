<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UploadFilesRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'path' => ['present', 'string'],
            'files' => ['required', 'array', 'min:1'],
            'files.*' => ['required', 'file'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'files.required' => 'Choose at least one file to upload.',
            'files.*.file' => 'One of the uploads was not a valid file.',
        ];
    }
}
