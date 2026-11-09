<?php

declare(strict_types=1);

namespace QuickCommands\Http;

use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use QuickCommands\Models\Button;

final class ButtonInput
{
    /** @return array<string, mixed> */
    public static function validate(Request $request, bool $admin): array
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:48'],
            'color' => ['required', Rule::in(Button::COLORS)],
            'icon' => ['nullable', 'string', 'max:64', 'regex:/^[a-z0-9]+(-[a-z0-9]+)*$/'],
            'commands' => ['required', 'array', 'min:1', 'max:10'],
            'commands.*' => ['required', 'string', 'max:500', 'not_regex:/[\r\n]/'],
            'confirm' => ['boolean'],
        ] + ($admin ? ['eggs' => ['nullable', 'array', 'max:100'], 'eggs.*' => ['integer', 'exists:eggs,id']] : []));

        return [
            'label' => $data['label'],
            'color' => $data['color'],
            'icon' => $data['icon'] ?? null,
            'commands' => array_values(array_map(mb_trim(...), $data['commands'])),
            'confirm' => (bool) ($data['confirm'] ?? false),
        ] + ($admin ? ['eggs' => empty($data['eggs']) ? null : array_values(array_unique(array_map(intval(...), $data['eggs'])))] : []);
    }
}
