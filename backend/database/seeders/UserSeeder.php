<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;

class UserSeeder extends Seeder
{
    public function run(): void
    {
        $admin = User::firstOrCreate(
            ['email' => 'admin@altokepay.com'],
            [
                'id' => (string) Str::uuid(),
                'name' => 'Admin Principal',
                'password' => bcrypt('password'),
            ],
        );
        $admin->syncRoles(['administrador']);

        $cobrador1 = User::firstOrCreate(
            ['email' => 'carlos@altokepay.com'],
            [
                'id' => (string) Str::uuid(),
                'name' => 'Carlos Cobrador',
                'password' => bcrypt('password'),
            ],
        );
        $cobrador1->syncRoles(['cobrador']);

        $cobrador2 = User::firstOrCreate(
            ['email' => 'maria@altokepay.com'],
            [
                'id' => (string) Str::uuid(),
                'name' => 'María Cobradora',
                'password' => bcrypt('password'),
            ],
        );
        $cobrador2->syncRoles(['cobrador']);
    }
}
