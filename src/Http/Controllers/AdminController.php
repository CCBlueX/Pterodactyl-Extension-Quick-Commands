<?php

declare(strict_types=1);

namespace QuickCommands\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use QuickCommands\Http\ButtonInput;
use QuickCommands\Models\Button;
use QuickCommands\Panel\Panel;

final class AdminController
{
    public function __construct(private readonly Panel $panel) {}

    public function index(): JsonResponse
    {
        return new JsonResponse([
            'buttons' => Button::query()->whereNull('server_id')->orderBy('sort')->orderBy('id')->get()->map(static fn (Button $button): array => $button->present()),
            'eggs' => $this->panel->eggs(),
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        abort_if(Button::query()->whereNull('server_id')->count() >= 100, 422, 'There can be up to 100 buttons.');

        Button::query()->create(ButtonInput::validate($request, true) + ['sort' => Button::nextSort(Button::query()->whereNull('server_id'))]);

        return $this->index();
    }

    public function update(Request $request, int $id): JsonResponse
    {
        Button::query()->whereNull('server_id')->findOrFail($id)->update(ButtonInput::validate($request, true));

        return $this->index();
    }

    public function order(Request $request): JsonResponse
    {
        Button::reorder(Button::query()->whereNull('server_id'), $request->validate(['ids' => ['required', 'array', 'max:100']])['ids']);

        return $this->index();
    }

    public function destroy(int $id): JsonResponse
    {
        Button::query()->whereNull('server_id')->findOrFail($id)->delete();

        return $this->index();
    }
}
