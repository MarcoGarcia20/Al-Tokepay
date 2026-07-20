<?php

namespace Database\Factories;

use App\Models\Cliente;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ClienteFactory extends Factory
{
    protected $model = Cliente::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'nombres' => fake()->firstName(),
            'apellidos' => fake()->lastName(),
            'documento_identidad' => fake()->unique()->numerify('########'),
            'celular' => fake()->numerify('9########'),
            'correo' => fake()->unique()->safeEmail(),
            'estado' => 'activo',
            'saldo_favor' => 0,
        ];
    }
}
