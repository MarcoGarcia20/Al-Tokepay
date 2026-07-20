<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\AmortizacionService;
use App\Models\Cliente;
use App\Models\Cuota;
use App\Models\Prestamo;
use App\Models\User;

class AmortizacionServiceTest extends TestCase
{
    use RefreshDatabase;

    private AmortizacionService $service;
    private User $user;
    private Cliente $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(AmortizacionService::class);
        $this->user = User::create([
            'name' => 'Admin Test',
            'email' => 'admin@test.com',
            'password' => bcrypt('password'),
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

    private function crearPrestamoConCuotas(int $numCuotas, float $montoCuota = 100): Prestamo
    {
        $prestamo = Prestamo::create([
            'user_id' => $this->user->id,
            'cliente_id' => $this->cliente->id,
            'monto_principal' => $montoCuota * $numCuotas,
            'tasa_interes' => 5,
            'num_cuotas' => $numCuotas,
            'frecuencia_pago' => 'mensual',
            'estado' => 'activo',
            'fecha_inicio' => now()->format('Y-m-d'),
            'monto_total' => $montoCuota * $numCuotas,
            'saldo_pendiente' => $montoCuota * $numCuotas,
        ]);

        for ($i = 1; $i <= $numCuotas; $i++) {
            Cuota::create([
                'prestamo_id' => $prestamo->id,
                'num_cuota' => $i,
                'monto_cuota' => $montoCuota,
                'monto_interes' => 25,
                'monto_principal' => 75,
                'saldo_capital' => $montoCuota * ($numCuotas - $i),
                'fecha_vencimiento' => now()->addMonths($i)->format('Y-m-d'),
                'estado' => 'pendiente',
                'monto_pagado' => 0,
            ]);
        }

        return $prestamo->fresh();
    }

    public function test_abono_exacto_liquida_cuota_mas_antigua(): void
    {
        $prestamo = $this->crearPrestamoConCuotas(3);

        $this->service->registrarAbono(
            prestamoId: $prestamo->id,
            userId: $this->user->id,
            cobradorId: $this->user->id,
            monto: 100,
            metodo: 'efectivo',
        );

        $cuota1 = Cuota::where('prestamo_id', $prestamo->id)->where('num_cuota', 1)->first();
        $cuota2 = Cuota::where('prestamo_id', $prestamo->id)->where('num_cuota', 2)->first();
        $cuota3 = Cuota::where('prestamo_id', $prestamo->id)->where('num_cuota', 3)->first();

        $this->assertEquals('pagado', $cuota1->estado);
        $this->assertEquals(100, (float) $cuota1->monto_pagado);
        $this->assertEquals('pendiente', $cuota2->estado);
        $this->assertEquals(0, (float) $cuota2->monto_pagado);
        $this->assertEquals('pendiente', $cuota3->estado);
        $this->assertEquals(0, (float) $cuota3->monto_pagado);
    }

    public function test_abono_parcial_deja_cuota_en_estado_parcial(): void
    {
        $prestamo = $this->crearPrestamoConCuotas(3);

        $this->service->registrarAbono(
            prestamoId: $prestamo->id,
            userId: $this->user->id,
            cobradorId: $this->user->id,
            monto: 50,
            metodo: 'efectivo',
        );

        $cuota1 = Cuota::where('prestamo_id', $prestamo->id)->where('num_cuota', 1)->first();
        $this->assertEquals('parcial', $cuota1->estado);
        $this->assertEquals(50, (float) $cuota1->monto_pagado);
    }

    public function test_abono_excedente_se_aplica_a_siguiente_cuota(): void
    {
        $prestamo = $this->crearPrestamoConCuotas(3);

        $this->service->registrarAbono(
            prestamoId: $prestamo->id,
            userId: $this->user->id,
            cobradorId: $this->user->id,
            monto: 150,
            metodo: 'efectivo',
        );

        $cuota1 = Cuota::where('prestamo_id', $prestamo->id)->where('num_cuota', 1)->first();
        $cuota2 = Cuota::where('prestamo_id', $prestamo->id)->where('num_cuota', 2)->first();
        $cuota3 = Cuota::where('prestamo_id', $prestamo->id)->where('num_cuota', 3)->first();

        $this->assertEquals('pagado', $cuota1->estado);
        $this->assertEquals(100, (float) $cuota1->monto_pagado);
        $this->assertEquals('parcial', $cuota2->estado);
        $this->assertEquals(50, (float) $cuota2->monto_pagado);
        $this->assertEquals('pendiente', $cuota3->estado);
        $this->assertEquals(0, (float) $cuota3->monto_pagado);
    }

    public function test_excedente_sin_cuotas_pendientes_va_a_saldo_favor(): void
    {
        $prestamo = $this->crearPrestamoConCuotas(1);

        $this->service->registrarAbono(
            prestamoId: $prestamo->id,
            userId: $this->user->id,
            cobradorId: $this->user->id,
            monto: 150,
            metodo: 'efectivo',
        );

        $cuota = Cuota::where('prestamo_id', $prestamo->id)->first();
        $this->assertEquals('pagado', $cuota->estado);
        $this->assertEquals(100, (float) $cuota->monto_pagado);

        $this->cliente->refresh();
        $this->assertEquals(50, (float) $this->cliente->saldo_favor);
    }

    public function test_prestamo_no_cierra_si_queda_penalidad_pendiente(): void
    {
        $prestamo = $this->crearPrestamoConCuotas(1);
        $cuota = Cuota::where('prestamo_id', $prestamo->id)->first();
        $cuota->update(['penalidad_fija_acumulada' => 10]);

        $this->service->registrarAbono(
            prestamoId: $prestamo->id,
            userId: $this->user->id,
            cobradorId: $this->user->id,
            monto: 100,
            metodo: 'efectivo',
        );

        $cuota->refresh();
        $this->assertEquals('parcial', $cuota->estado);
        $this->assertEquals(90, (float) $cuota->monto_pagado);
        $this->assertEquals(0, (float) $cuota->penalidad_fija_acumulada);

        $prestamo->refresh();
        $this->assertNotEquals('pagado', $prestamo->estado);
    }

    public function test_prestamo_cierra_cuando_todo_esta_saldado(): void
    {
        $prestamo = $this->crearPrestamoConCuotas(1);
        $cuota = Cuota::where('prestamo_id', $prestamo->id)->first();
        $cuota->update(['penalidad_fija_acumulada' => 10]);

        $this->service->registrarAbono(
            prestamoId: $prestamo->id,
            userId: $this->user->id,
            cobradorId: $this->user->id,
            monto: 110,
            metodo: 'efectivo',
        );

        $cuota->refresh();
        $this->assertEquals('pagado', $cuota->estado);
        $this->assertEquals(100, (float) $cuota->monto_pagado);

        $prestamo->refresh();
        $this->assertEquals('pagado', $prestamo->estado);
    }

    public function test_bloqueo_de_fila_evita_doble_aplicacion_concurrente(): void
    {
        $this->markTestSkipped(
            'No es viable simular concurrencia real en este entorno de testing. '
            . 'El driver de base de datos es SQLite (no soporta row-level locking) '
            . 'y PHPUnit ejecuta tests en un solo proceso. '
            . 'La protección por lockForUpdate() está presente en el código de producción '
            . 'y funciona con PostgreSQL en el entorno real.'
        );
    }
}
