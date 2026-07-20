<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        Role::firstOrCreate(
            ['name' => 'administrador', 'guard_name' => 'web'],
            ['name' => 'administrador', 'guard_name' => 'web'],
        );
        Role::firstOrCreate(
            ['name' => 'cobrador', 'guard_name' => 'web'],
            ['name' => 'cobrador', 'guard_name' => 'web'],
        );
    }
}
