<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('ext_quick_commands_buttons', 'icon')) {
            return;
        }

        Schema::table('ext_quick_commands_buttons', function (Blueprint $table): void {
            $table->string('icon', 64)->nullable()->after('color');
        });
    }

    public function down(): void
    {
        if (Schema::hasColumn('ext_quick_commands_buttons', 'icon')) {
            Schema::table('ext_quick_commands_buttons', function (Blueprint $table): void {
                $table->dropColumn('icon');
            });
        }
    }
};
