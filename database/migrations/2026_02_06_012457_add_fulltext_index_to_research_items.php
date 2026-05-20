<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        if (! in_array(Schema::getConnection()->getDriverName(), ['pgsql', 'mysql', 'mariadb'])) {
            return;
        }

        Schema::table('research_items', function (Blueprint $table) {
            $index = $table->fullText(['title', 'ai_summary', 'user_notes']);

            if (Schema::getConnection()->getDriverName() === 'pgsql') {
                $index->language('english');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (! in_array(Schema::getConnection()->getDriverName(), ['pgsql', 'mysql', 'mariadb'])) {
            return;
        }

        Schema::table('research_items', function (Blueprint $table) {
            $table->dropFullText(['title', 'ai_summary', 'user_notes']);
        });
    }
};
