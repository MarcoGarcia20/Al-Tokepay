<?php

namespace App\Services;

use App\Models\Cuota;
use App\Models\ParametroSistema;
use App\Models\Prestamo;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

class MoraService
{
    public function procesarMoraDiaria(): array
    {
        return DB::transaction(function () {
            $penalidadDiaria = ParametroSistema::find('penalidad_diaria_mora');
            $tasaMora = ParametroSistema::find('tasa_mora_porcentaje');

            $penalidadDiariaValor = $penalidadDiaria ? (float) $penalidadDiaria->valor : 5.00;
            $tasaMoraMensual = $tasaMora ? (float) $tasaMora->valor : 1.50;

            $tasaMoraDiaria = Money::from($tasaMoraMensual)->div(100)->div(30);

            $hoy = now()->format('Y-m-d');

            $cuotas = Cuota::where('estado', '!=', 'pagado')
                ->where('fecha_vencimiento', '<', $hoy)
                ->where(function ($q) use ($hoy) {
                    $q->whereNull('ultimo_calculo_mora')
                      ->orWhere('ultimo_calculo_mora', '<', $hoy);
                })
                ->lockForUpdate()
                ->get();

            $cantActualizadas = 0;
            $moraTotal = Money::from(0);
            $penalidadTotal = Money::from(0);

            foreach ($cuotas as $cuota) {
                $montoPendiente = Money::from($cuota->monto_cuota)->sub($cuota->monto_pagado);
                $interesDiario = $montoPendiente->mul($tasaMoraDiaria)->round(2);

                $cuota->update([
                    'estado' => 'vencido',
                    'dias_retraso' => $cuota->dias_retraso + 1,
                    'penalidad_fija_acumulada' => Money::from($cuota->penalidad_fija_acumulada)->add($penalidadDiariaValor)->toFloat(),
                    'interes_moratorio_acumulado' => Money::from($cuota->interes_moratorio_acumulado)->add($interesDiario)->toFloat(),
                    'ultimo_calculo_mora' => $hoy,
                ]);

                Prestamo::where('id', $cuota->prestamo_id)
                    ->where('estado', 'activo')
                    ->update(['estado' => 'en_mora']);

                $cantActualizadas++;
                $moraTotal = $moraTotal->add($interesDiario);
                $penalidadTotal = $penalidadTotal->add($penalidadDiariaValor);
            }

            return [
                'cuotas_procesadas' => $cantActualizadas,
                'mora_total_acumulada' => $moraTotal->toFloat(),
                'penalidad_total_acumulada' => $penalidadTotal->toFloat(),
            ];
        });
    }
}
