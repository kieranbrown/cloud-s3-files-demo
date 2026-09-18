<?php

namespace App\Http\Requests;

use App\Explorer\FileBrowser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreFileRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'path' => ['present', 'nullable', 'string'],
            'name' => ['required', 'string', 'max:255', 'regex:/^[^\/\\\\\x00-\x1F]+$/u', 'not_in:.,..'],
            'content' => ['present', 'nullable', 'string', 'max:'.FileBrowser::MAX_TEXT_BYTES],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'File names cannot contain slashes.',
            'name.not_in' => 'That name is not allowed.',
        ];
    }
}
