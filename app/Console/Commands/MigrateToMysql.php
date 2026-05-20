<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

#[Signature('db:migrate-to-mysql')]
#[Description('Migrate production Postgres data to MySQL')]
class MigrateToMysql extends Command
{
    /**
     * Tables to copy, in dependency order (parents before children).
     *
     * @var string[]
     */
    protected array $tables = [
        'users',
        'password_reset_tokens',
        'sessions',
        'research_items',
        'agent_conversations',
        'agent_conversation_messages',
    ];

    public function handle(): int
    {
        $this->info('Testing connections...');

        try {
            DB::connection('prod_pgsql')->getPdo();
            $this->info('  ✓ Postgres connected');
        } catch (\Exception $e) {
            $this->error('  ✗ Postgres connection failed: '.$e->getMessage());

            return self::FAILURE;
        }

        try {
            DB::connection('prod_mysql')->getPdo();
            $this->info('  ✓ MySQL connected');
        } catch (\Exception $e) {
            $this->error('  ✗ MySQL connection failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $database = $this->discoverMysqlDatabase();

        if (! $database) {
            $this->error('Could not find a user database on the MySQL server.');

            return self::FAILURE;
        }

        $this->info("  ✓ MySQL database: {$database}");
        DB::connection('prod_mysql')->statement("USE `{$database}`");
        config(['database.connections.prod_mysql.database' => $database]);
        DB::purge('prod_mysql');

        $this->newLine();
        $this->info('Running migrations on MySQL...');
        $this->call('migrate:fresh', [
            '--database' => 'prod_mysql',
            '--force' => true,
        ]);

        $this->newLine();
        $this->info('Copying data...');
        DB::connection('prod_mysql')->statement('SET FOREIGN_KEY_CHECKS=0');

        foreach ($this->tables as $table) {
            $this->copyTable($table);
        }

        DB::connection('prod_mysql')->statement('SET FOREIGN_KEY_CHECKS=1');

        $this->newLine();
        $this->info('Migration complete.');

        return self::SUCCESS;
    }

    protected function copyTable(string $table): void
    {
        $source = DB::connection('prod_pgsql');
        $destination = DB::connection('prod_mysql');

        $total = $source->table($table)->count();
        $this->line("  {$table}: {$total} rows");

        $destination->table($table)->truncate();

        $source->table($table)->orderBy($this->primaryKey($table))->chunk(500, function ($rows) use ($destination, $table) {
            $destination->table($table)->insert(
                collect($rows)->map(fn ($row) => (array) $row)->toArray()
            );
        });
    }

    protected function discoverMysqlDatabase(): ?string
    {
        $system = ['information_schema', 'mysql', 'performance_schema', 'sys'];

        $rows = DB::connection('prod_mysql')->select('SHOW DATABASES');

        foreach ($rows as $row) {
            $name = $row->Database;
            if (! in_array($name, $system)) {
                return $name;
            }
        }

        return null;
    }

    protected function primaryKey(string $table): string
    {
        return match ($table) {
            'password_reset_tokens' => 'email',
            default => 'id',
        };
    }
}
