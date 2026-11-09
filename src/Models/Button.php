<?php

declare(strict_types=1);

namespace QuickCommands\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Pterodactyl\Models\Server;
use QuickCommands\Support\Order;
use QuickCommands\Support\Template;

/**
 * @property int $id
 * @property int|null $server_id
 * @property list<int>|null $eggs
 * @property string $label
 * @property string $color
 * @property string|null $icon
 * @property list<string> $commands
 * @property bool $confirm
 * @property int $sort
 */
final class Button extends Model
{
    public const array COLORS = ['grey', 'primary', 'green', 'orange', 'red', 'cyan', 'yellow', 'contrast'];

    protected $table = 'ext_quick_commands_buttons';

    protected $fillable = ['server_id', 'eggs', 'label', 'color', 'icon', 'commands', 'confirm', 'sort'];

    protected function casts(): array
    {
        return ['eggs' => 'array', 'commands' => 'array', 'confirm' => 'boolean', 'sort' => 'integer'];
    }

    /** The sort value that puts a new button last in its list. */
    public static function nextSort(Builder $list): int
    {
        return ((int) $list->max('sort')) + 1;
    }

    /**
     * Stores the order of a whole list, given as button ids.
     *
     * @param  array<mixed>  $ids
     */
    public static function reorder(Builder $list, array $ids): void
    {
        try {
            $sorts = Order::sorts($list->clone()->pluck('id')->map(intval(...))->all(), $ids);
        } catch (InvalidArgumentException $exception) {
            abort(422, $exception->getMessage());
        }

        DB::transaction(static function () use ($list, $sorts): void {
            foreach ($sorts as $id => $sort) {
                $list->clone()->whereKey($id)->update(['sort' => $sort]);
            }
        });
    }

    /** Administrator buttons for the server's egg first, then the server's own. */
    public static function for(Server $server): Builder
    {
        return self::query()
            ->where(static fn (Builder $query) => $query->where('server_id', $server->id)->orWhere(static fn (Builder $global) => $global
                ->whereNull('server_id')
                ->where(static fn (Builder $eggs) => $eggs->whereNull('eggs')->orWhereJsonContains('eggs', $server->egg_id))))
            ->orderByRaw('server_id is not null')
            ->orderBy('sort')
            ->orderBy('id');
    }

    /** @return array<string, mixed> */
    public function present(): array
    {
        return [
            'id' => $this->id,
            'label' => $this->label,
            // A colour this version does not know (written by a newer one) shows as grey.
            'color' => in_array($this->color, self::COLORS, true) ? $this->color : 'grey',
            'icon' => $this->icon,
            'commands' => $this->commands,
            'placeholders' => Template::placeholders($this->commands),
            'confirm' => $this->confirm,
            'sort' => $this->sort,
            'eggs' => $this->eggs,
            'global' => $this->server_id === null,
        ];
    }
}
