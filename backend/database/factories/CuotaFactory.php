<?php

namespace Database\Factories;

use App\Models\Cuota;
use App\Models\Prestamo;
use Illuminate\Database\Eloquent\Factories\Factory;

class CuotaFactory extends Factory
{
    protected $model = Cuota::class;

    public function definition(): array
    {
        return [
            'prestamo_id' => Prestamo::factory(),
            'num_cuota' => 1,
            'monto_cuota' => 100,
            'monto_interes' => 25,
            'monto_principal' => 75,
            'saldo_capital' => 925,
            'fecha_vencimiento' => now()->addMonth()->format('Y-m-d'),
            'estado' => 'pendiente',
            'monto_pagado' => 0,
        ];
    }
}
