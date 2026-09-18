<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class StoreDirectoryRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'path' => ['present', 'string'],
            'name' => ['required', 'string', 'max:255', 'regex:/^[^\/\\\\\x00-\x1F]+$/u', 'not_in:.,..'],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'name.regex' => 'Folder names cannot contain slashes.',
            'name.not_in' => 'That name is not allowed.',
        ];
    }
}
