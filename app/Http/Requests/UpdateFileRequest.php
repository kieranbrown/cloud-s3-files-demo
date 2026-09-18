<?php

namespace App\Http\Requests;

use App\Explorer\FileBrowser;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;

class UpdateFileRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'path' => ['required', 'string'],
            'content' => ['present', 'nullable', 'string', 'max:'.FileBrowser::MAX_TEXT_BYTES],
        ];
    }
}
