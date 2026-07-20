<?php

namespace App\Services;

use App\Models\Cuota;
use App\Models\Prestamo;
use App\Support\Money;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PrestamoService
{
    public function crearPrestamoConCuotas(
        string $clienteId,
        string $userId,
        float $montoPrincipal,
        float $tasaInteres,
        int $numCuotas,
        string $frecuenciaPago,
        string $fechaInicio,
        float $montoTotal,
        ?string $notas,
        array $cuotasData,
        bool $excluirDomingos = false,
        ?string $cobradorId = null,
    ): Prestamo {
        return DB::transaction(function () use (
            $clienteId, $userId, $montoPrincipal, $tasaInteres, $numCuotas,
            $frecuenciaPago, $fechaInicio, $montoTotal, $notas,
            $cuotasData, $excluirDomingos, $cobradorId
        ) {
            $prestamo = Prestamo::create([
                'user_id' => $userId,
                'cliente_id' => $clienteId,
                'monto_principal' => $montoPrincipal,
                'tasa_interes' => $tasaInteres,
                'num_cuotas' => $numCuotas,
                'frecuencia_pago' => $frecuenciaPago,
                'estado' => 'activo',
                'fecha_inicio' => $fechaInicio,
                'monto_total' => $montoTotal,
                'saldo_pendiente' => $montoTotal,
                'excluir_domingos' => $excluirDomingos,
                'cobrador_id' => $cobradorId,
                'notas' => $notas,
            ]);

            foreach ($cuotasData as $c) {
                Cuota::create([
                    'prestamo_id' => $prestamo->id,
                    'num_cuota' => $c['numCuota'],
                    'monto_cuota' => $c['cuotaTotal'],
                    'monto_interes' => $c['interes'],
                    'monto_principal' => $c['capital'],
                    'saldo_capital' => $c['saldoRestante'],
                    'fecha_vencimiento' => $c['fechaVencimiento'],
                    'estado' => 'pendiente',
                    'monto_pagado' => 0,
                ]);
            }

            return $prestamo;
        });
    }

    public function generarTablaAmortizacion(
        float $principal,
        float $tasaMensual,
        int $numCuotas,
        string $frecuencia,
        string $fechaInicio,
        bool $excluirDomingos = false,
    ): array {
        $tasa = $this->tasaPorFrecuencia($tasaMensual, $frecuencia);
        $cuotaFija = $this->calcularCuotaFija($principal, $tasa, $numCuotas);

        $saldo = Money::from($principal);
        $tabla = [];
        $fechaActual = Carbon::parse($fechaInicio);

        for ($i = 1; $i <= $numCuotas; $i++) {
            if ($frecuencia === 'diario') {
                $fechaActual = $fechaActual->copy()->addDay();
                if ($excluirDomingos && $fechaActual->isSunday()) {
                    $fechaActual->addDay();
                }
            } else {
                $fechaActual = $this->calcularFechaVencimiento(Carbon::parse($fechaInicio), $i, $frecuencia);
            }

            $interes = $saldo->mul($tasa)->round(2);
            $capital = Money::from($cuotaFija)->sub($interes)->round(2);

            if ($i === $numCuotas) {
                $capital = $saldo;
            }

            $saldoRestante = $saldo->sub($capital)->round(2);
            $totalCuota = $i === $numCuotas ? $capital->add($interes)->round(2) : Money::from($cuotaFija)->round(2);

            $tabla[] = [
                'numCuota' => $i,
                'fechaVencimiento' => $fechaActual->format('Y-m-d'),
                'cuotaTotal' => $totalCuota->toFloat(),
                'interes' => $interes->toFloat(),
                'capital' => $capital->toFloat(),
                'saldoRestante' => $saldoRestante->toFloat(),
            ];

            $saldo = $saldoRestante;
        }

        return $tabla;
    }

    private function tasaPorFrecuencia(float $tasaMensual, string $frecuencia): Money
    {
        $r = Money::from($tasaMensual)->div(100);
        return match ($frecuencia) {
            'diario' => Money::from(1)->add($r)->pow(1 / 30)->sub(1),
            'semanal' => Money::from(1)->add($r)->pow(7 / 30)->sub(1),
            'quincenal' => Money::from(1)->add($r)->pow(14 / 30)->sub(1),
            default => $r,
        };
    }

    private function calcularCuotaFija(float $principal, Money $tasaPeriodica, int $numCuotas): Money
    {
        if ($tasaPeriodica->isZero()) {
            return Money::from($principal)->div($numCuotas);
        }
        $unoMasR = Money::from(1)->add($tasaPeriodica);
        $divisor = Money::from(1)->sub($unoMasR->pow(-$numCuotas));
        return $tasaPeriodica->mul($principal)->div($divisor);
    }

    private function calcularFechaVencimiento(Carbon $fechaBase, int $numeroCuota, string $frecuencia): Carbon
    {
        return match ($frecuencia) {
            'diario' => $fechaBase->copy()->addDays($numeroCuota),
            'semanal' => $fechaBase->copy()->addWeeks($numeroCuota),
            'quincenal' => $fechaBase->copy()->addDays($numeroCuota * 14),
            'mensual' => $fechaBase->copy()->addMonths($numeroCuota),
            default => $fechaBase->copy()->addDays($numeroCuota),
        };
    }
}
