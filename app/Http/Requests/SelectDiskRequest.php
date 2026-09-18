<?php

namespace App\Http\Requests;

use App\Explorer\DiskRegistry;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class SelectDiskRequest extends FormRequest
{
    /**
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(DiskRegistry $disks): array
    {
        return [
            'disk' => ['required', 'string', Rule::in($disks->names())],
        ];
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'disk.in' => 'That disk is not available.',
        ];
    }
}
