<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\MoraService;
use App\Models\Cliente;
use App\Models\Cuota;
use App\Models\ParametroSistema;
use App\Models\Prestamo;
use App\Models\User;

class MoraServiceTest extends TestCase
{
    use RefreshDatabase;

    private MoraService $service;
    private User $user;
    private Cliente $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(MoraService::class);
        $this->user = User::create([
            'name' => 'Admin Test',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
        ]);

        ParametroSistema::create([
            'clave' => 'penalidad_diaria_mora',
            'valor' => '5.00',
            'descripcion' => 'Penalidad fija por día de retraso',
        ]);
        ParametroSistema::create([
            'clave' => 'tasa_mora_porcentaje',
            'valor' => '1.50',
            'descripcion' => 'Tasa mensual de interés moratorio',
        ]);

        $this->cliente = Cliente::create([
            'user_id' => $this->user->id,
            'nombres' => 'Juan',
            'apellidos' => 'Pérez',
            'documento_identidad' => '12345678',
            'celular' => '999888777',
            'correo' => 'juan@test.com',
            'estado' => 'activo',
            'saldo_favor' => 0,
        ]);
    }

    private function crearCuotaVencida(): array
    {
        $prestamo = Prestamo::create([
            'user_id' => $this->user->id,
            'cliente_id' => $this->cliente->id,
            'monto_principal' => 100,
            'tasa_interes' => 5,
            'num_cuotas' => 1,
            'frecuencia_pago' => 'mensual',
            'estado' => 'activo',
            'fecha_inicio' => now()->subMonth()->format('Y-m-d'),
            'monto_total' => 100,
            'saldo_pendiente' => 100,
        ]);

        $cuota = Cuota::create([
            'prestamo_id' => $prestamo->id,
            'num_cuota' => 1,
            'monto_cuota' => 100,
            'monto_interes' => 25,
            'monto_principal' => 75,
            'saldo_capital' => 0,
            'fecha_vencimiento' => now()->subDay()->format('Y-m-d'),
            'estado' => 'pendiente',
            'monto_pagado' => 0,
        ]);

        return [$prestamo, $cuota];
    }

    public function test_procesar_mora_incrementa_dias_retraso_y_penalidad(): void
    {
        [$prestamo, $cuota] = $this->crearCuotaVencida();

        $this->service->procesarMoraDiaria();

        $cuota->refresh();
        $this->assertEquals(1, $cuota->dias_retraso);
        $this->assertEquals(5.00, (float) $cuota->penalidad_fija_acumulada);
        $this->assertEquals('vencido', $cuota->estado);

        $prestamo->refresh();
        $this->assertEquals('en_mora', $prestamo->estado);
    }

    public function test_procesar_mora_es_idempotente_mismo_dia(): void
    {
        [$prestamo, $cuota] = $this->crearCuotaVencida();

        $this->service->procesarMoraDiaria();
        $cuota->refresh();
        $diasRetraso = $cuota->dias_retraso;
        $penalidad = (float) $cuota->penalidad_fija_acumulada;

        $this->service->procesarMoraDiaria();
        $cuota->refresh();

        $this->assertEquals($diasRetraso, $cuota->dias_retraso);
        $this->assertEquals($penalidad, (float) $cuota->penalidad_fija_acumulada);
    }

    public function test_procesar_mora_no_afecta_cuotas_pagadas(): void
    {
        $prestamo = Prestamo::create([
            'user_id' => $this->user->id,
            'cliente_id' => $this->cliente->id,
            'monto_principal' => 100,
            'tasa_interes' => 5,
            'num_cuotas' => 1,
            'frecuencia_pago' => 'mensual',
            'estado' => 'activo',
            'fecha_inicio' => now()->subMonth()->format('Y-m-d'),
            'monto_total' => 100,
            'saldo_pendiente' => 0,
        ]);

        $cuota = Cuota::create([
            'prestamo_id' => $prestamo->id,
            'num_cuota' => 1,
            'monto_cuota' => 100,
            'monto_interes' => 25,
            'monto_principal' => 75,
            'saldo_capital' => 0,
            'fecha_vencimiento' => now()->subDay()->format('Y-m-d'),
            'estado' => 'pagado',
            'monto_pagado' => 100,
        ]);

        $this->service->procesarMoraDiaria();

        $cuota->refresh();
        $this->assertEquals(0, $cuota->dias_retraso);
        $this->assertEquals(0, (float) $cuota->penalidad_fija_acumulada);
        $this->assertEquals('pagado', $cuota->estado);
    }
}
