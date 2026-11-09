<?php

declare(strict_types=1);

namespace QuickCommands\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Pterodactyl\Exceptions\Http\Connection\DaemonConnectionException;
use Pterodactyl\Models\Server;
use QuickCommands\Http\ButtonInput;
use QuickCommands\Models\Button;
use QuickCommands\Panel\Panel;
use QuickCommands\Support\Template;

final class ServerController
{
    public function __construct(private readonly Panel $panel) {}

    public function index(Request $request, Server $server): JsonResponse
    {
        $this->authorize($request, $server, 'control.console');

        return new JsonResponse([
            'buttons' => Button::for($server)->get()->map(static fn (Button $button): array => $button->present()),
            'can_manage' => $request->user()->can('ext.quick-commands.manage', $server),
        ]);
    }

    public function store(Request $request, Server $server): JsonResponse
    {
        $this->authorize($request, $server, 'ext.quick-commands.manage');
        abort_if(Button::query()->where('server_id', $server->id)->count() >= 20, 422, 'A server can have up to 20 buttons.');

        Button::query()->create(ButtonInput::validate($request, false) + ['server_id' => $server->id, 'sort' => Button::nextSort(Button::query()->where('server_id', $server->id))]);

        return $this->index($request, $server);
    }

    public function update(Request $request, Server $server, int $id): JsonResponse
    {
        $this->authorize($request, $server, 'ext.quick-commands.manage');

        Button::query()->where('server_id', $server->id)->findOrFail($id)->update(ButtonInput::validate($request, false));

        return $this->index($request, $server);
    }

    public function order(Request $request, Server $server): JsonResponse
    {
        $this->authorize($request, $server, 'ext.quick-commands.manage');

        Button::reorder(Button::query()->where('server_id', $server->id), $request->validate(['ids' => ['required', 'array', 'max:20']])['ids']);

        return $this->index($request, $server);
    }

    public function destroy(Request $request, Server $server, int $id): JsonResponse
    {
        $this->authorize($request, $server, 'ext.quick-commands.manage');

        Button::query()->where('server_id', $server->id)->findOrFail($id)->delete();

        return $this->index($request, $server);
    }

    public function run(Request $request, Server $server, int $id): JsonResponse
    {
        $this->authorize($request, $server, 'control.console');

        $button = Button::for($server)->findOrFail($id);
        $values = $request->validate(['values' => ['array'], 'values.*' => ['nullable', 'string', 'max:200']])['values'] ?? [];

        try {
            $commands = Template::fill($button->commands, array_map(strval(...), $values));
        } catch (InvalidArgumentException $exception) {
            abort(422, $exception->getMessage());
        }

        try {
            foreach ($commands as $command) {
                $this->panel->send($server, $command);
            }
        } catch (DaemonConnectionException) {
            abort(409, 'The server has to be running to receive commands.');
        }

        return new JsonResponse(['sent' => count($commands)]);
    }

    private function authorize(Request $request, Server $server, string $permission): void
    {
        abort_unless((bool) $request->user()?->can($permission, $server), 403, 'You do not have permission to do that.');
    }
}
