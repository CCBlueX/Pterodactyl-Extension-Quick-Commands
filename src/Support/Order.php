<?php

declare(strict_types=1);

namespace QuickCommands\Support;

use InvalidArgumentException;

final class Order
{
    /**
     * The new sort value per button id. The request has to list every button of the list exactly once,
     * so a stale page cannot drop or duplicate buttons.
     *
     * @param  list<int>  $existing
     * @param  array<mixed>  $requested
     * @return array<int, int>
     */
    public static function sorts(array $existing, array $requested): array
    {
        $ids = [];

        foreach ($requested as $id) {
            if (! is_int($id) && ! (is_string($id) && ctype_digit($id))) {
                throw new InvalidArgumentException('The order lists an unknown button.');
            }

            $ids[] = (int) $id;
        }

        $expected = $existing;
        $given = $ids;
        sort($expected);
        sort($given);

        if ($expected !== $given) {
            throw new InvalidArgumentException('The buttons changed meanwhile. Reload and try again.');
        }

        return array_flip($ids);
    }
}
