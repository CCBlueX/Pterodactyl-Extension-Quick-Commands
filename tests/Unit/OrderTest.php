<?php

declare(strict_types=1);

namespace QuickCommands\Tests\Unit;

use InvalidArgumentException;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;
use QuickCommands\Support\Order;

final class OrderTest extends TestCase
{
    /** @return array<string, array{list<int>, array<mixed>}> */
    public static function invalid(): array
    {
        return [
            'missing' => [[1, 2, 3], [1, 2]],
            'foreign' => [[1, 2], [1, 9]],
            'duplicate' => [[1, 2], [1, 1]],
            'extra' => [[1], [1, 2]],
            'not a number' => [[1], ['1a']],
            'negative' => [[1], [-1]],
        ];
    }

    public function test_positions_become_sort_values(): void
    {
        $this->assertSame([7 => 0, 3 => 1, 5 => 2], Order::sorts([3, 5, 7], [7, '3', 5]));
    }

    /**
     * @param  list<int>  $existing
     * @param  array<mixed>  $requested
     */
    #[DataProvider('invalid')]
    public function test_lists_that_do_not_match_are_refused(array $existing, array $requested): void
    {
        $this->expectException(InvalidArgumentException::class);

        Order::sorts($existing, $requested);
    }
}
