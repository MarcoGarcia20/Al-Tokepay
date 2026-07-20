<?php

namespace Tests\Feature;

use Tests\TestCase;
use Illuminate\Foundation\Testing\RefreshDatabase;
use App\Services\PrestamoService;
use App\Models\Cliente;
use App\Models\Cuota;
use App\Models\Prestamo;
use App\Models\User;

class PrestamoServiceTest extends TestCase
{
    use RefreshDatabase;

    private PrestamoService $service;
    private User $user;
    private Cliente $cliente;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = app(PrestamoService::class);
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

    public function test_crear_prestamo_genera_cronograma_completo(): void
    {
        $tabla = $this->service->generarTablaAmortizacion(
            principal: 1000,
            tasaMensual: 5,
            numCuotas: 6,
            frecuencia: 'mensual',
            fechaInicio: now()->format('Y-m-d'),
        );

        $prestamo = $this->service->crearPrestamoConCuotas(
            clienteId: $this->cliente->id,
            userId: $this->user->id,
            montoPrincipal: 1000,
            tasaInteres: 5,
            numCuotas: 6,
            frecuenciaPago: 'mensual',
            fechaInicio: now()->format('Y-m-d'),
            montoTotal: array_sum(array_column($tabla, 'cuotaTotal')),
            notas: null,
            cuotasData: $tabla,
        );

        $this->assertDatabaseHas('prestamos', ['id' => $prestamo->id]);
        $cuotas = Cuota::where('prestamo_id', $prestamo->id)->orderBy('num_cuota')->get();
        $this->assertCount(6, $cuotas);

        foreach ($cuotas as $i => $cuota) {
            $this->assertEquals($i + 1, $cuota->num_cuota);
            $this->assertEquals('pendiente', $cuota->estado);
            $this->assertEquals(0, (float) $cuota->monto_pagado);
        }
    }

    public function test_creacion_prestamo_es_transaccional(): void
    {
        $tabla = $this->service->generarTablaAmortizacion(1000, 5, 3, 'mensual', now()->format('Y-m-d'));

        $prestamo = $this->service->crearPrestamoConCuotas(
            clienteId: $this->cliente->id,
            userId: $this->user->id,
            montoPrincipal: 1000,
            tasaInteres: 5,
            numCuotas: 3,
            frecuenciaPago: 'mensual',
            fechaInicio: now()->format('Y-m-d'),
            montoTotal: array_sum(array_column($tabla, 'cuotaTotal')),
            notas: null,
            cuotasData: $tabla,
        );

        $this->assertDatabaseHas('prestamos', ['id' => $prestamo->id]);
        $this->assertCount(3, Cuota::where('prestamo_id', $prestamo->id)->get());

        try {
            $this->service->crearPrestamoConCuotas(
                clienteId: '00000000-0000-0000-0000-000000000000',
                userId: $this->user->id,
                montoPrincipal: 1000,
                tasaInteres: 5,
                numCuotas: 3,
                frecuenciaPago: 'mensual',
                fechaInicio: now()->format('Y-m-d'),
                montoTotal: array_sum(array_column($tabla, 'cuotaTotal')),
                notas: null,
                cuotasData: $tabla,
            );
            $this->fail('Expected QueryException for invalid FK was not thrown');
        } catch (\Illuminate\Database\QueryException $e) {
            $this->assertStringContainsStringIgnoringCase('foreign', $e->getMessage());
        }

        $this->assertDatabaseMissing('prestamos', ['cliente_id' => '00000000-0000-0000-0000-000000000000']);
    }

    public function test_frecuencia_quincenal_usa_14_dias(): void
    {
        $tabla = $this->service->generarTablaAmortizacion(
            principal: 1000,
            tasaMensual: 5,
            numCuotas: 3,
            frecuencia: 'quincenal',
            fechaInicio: '2026-01-01',
        );

        $this->assertCount(3, $tabla);
        $f1 = \Carbon\Carbon::parse($tabla[0]['fechaVencimiento']);
        $f2 = \Carbon\Carbon::parse($tabla[1]['fechaVencimiento']);
        $f3 = \Carbon\Carbon::parse($tabla[2]['fechaVencimiento']);

        $this->assertEquals(14, $f1->diffInDays($f2));
        $this->assertEquals(14, $f2->diffInDays($f3));
    }

    public function test_excluir_domingos_desplaza_fecha_a_lunes(): void
    {
        // Sábado 3 de enero de 2026. Cuota 1 = domingo 4 → debe pasar a lunes 5.
        $tabla = $this->service->generarTablaAmortizacion(
            principal: 1000,
            tasaMensual: 5,
            numCuotas: 4,
            frecuencia: 'diario',
            fechaInicio: '2026-01-03',
            excluirDomingos: true,
        );

        $fechas = array_map(fn ($c) => $c['fechaVencimiento'], $tabla);

        foreach ($fechas as $fecha) {
            $dia = \Carbon\Carbon::parse($fecha)->dayOfWeek;
            $this->assertNotEquals(0, $dia, "Fecha $fecha cae en domingo y no debería");
        }

        $fechasUnicas = array_unique($fechas);
        $this->assertCount(count($fechas), $fechasUnicas, 'Hay fechas de vencimiento duplicadas');
    }
}
