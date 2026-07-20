<?php

namespace Database\Factories;

use App\Models\Cliente;
use App\Models\Prestamo;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class PrestamoFactory extends Factory
{
    protected $model = Prestamo::class;

    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'cliente_id' => Cliente::factory(),
            'monto_principal' => 1000,
            'tasa_interes' => 5,
            'num_cuotas' => 3,
            'frecuencia_pago' => 'mensual',
            'estado' => 'activo',
            'fecha_inicio' => now()->format('Y-m-d'),
            'monto_total' => 300,
            'saldo_pendiente' => 300,
            'excluir_domingos' => false,
        ];
    }
}
