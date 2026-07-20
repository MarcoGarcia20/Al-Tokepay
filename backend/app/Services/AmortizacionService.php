<?php

namespace App\Services;

use App\Models\Cliente;
use App\Models\Cuota;
use App\Models\Pago;
use App\Models\Prestamo;
use App\Support\Money;
use Illuminate\Support\Facades\DB;

class AmortizacionService
{
    public function registrarAbono(
        string $prestamoId,
        string $userId,
        string $cobradorId,
        float $monto,
        string $metodo,
        ?string $notas = null,
        ?string $comprobanteUrl = null,
    ): array {
        return DB::transaction(function () use ($prestamoId, $userId, $cobradorId, $monto, $metodo, $notas, $comprobanteUrl) {
            $prestamo = Prestamo::where('id', $prestamoId)->lockForUpdate()->firstOrFail();
            $clienteId = $prestamo->cliente_id;

            $montoRestante = Money::from($monto);
            $pagosRegistrados = [];

            $cuotas = Cuota::where('prestamo_id', $prestamoId)
                ->where('estado', '!=', 'pagado')
                ->orderBy('fecha_vencimiento')
                ->orderBy('num_cuota')
                ->lockForUpdate()
                ->get();

            foreach ($cuotas as $cuota) {
                if ($montoRestante->isZero()) {
                    break;
                }

                $penalidades = Money::from($cuota->penalidad_fija_acumulada)
                    ->add($cuota->interes_moratorio_acumulado);
                $cuotaPendiente = Money::from($cuota->monto_cuota)->sub($cuota->monto_pagado);
                $totalAdeudado = $cuotaPendiente->add($penalidades);

                if ($montoRestante->isGreaterThanOrEqualTo($totalAdeudado)) {
                    $montoAplicado = $totalAdeudado;
                    $nuevoPagado = $cuota->monto_cuota;

                    $cuota->update([
                        'monto_pagado' => $nuevoPagado,
                        'penalidad_fija_acumulada' => 0,
                        'interes_moratorio_acumulado' => 0,
                        'estado' => 'pagado',
                    ]);

                    $pago = Pago::create([
                        'prestamo_id' => $prestamoId,
                        'cuota_id' => $cuota->id,
                        'user_id' => $userId,
                        'cobrador_id' => $cobradorId,
                        'monto_abonado' => $montoAplicado->toFloat(),
                        'metodo_pago' => $metodo,
                        'comprobante_url' => $comprobanteUrl,
                        'notas' => $notas,
                    ]);

                    $pagosRegistrados[] = [
                        'cuota_id' => $cuota->id,
                        'num_cuota' => $cuota->num_cuota,
                        'monto_aplicado' => $montoAplicado->toFloat(),
                        'estado' => 'pagado',
                    ];

                    $montoRestante = $montoRestante->sub($montoAplicado);
                } else {
                    $montoAplicado = $montoRestante;

                    if ($montoRestante->isGreaterThanOrEqualTo($penalidades)) {
                        $despuesPenalidades = $montoRestante->sub($penalidades);
                        $nuevoPagado = Money::from($cuota->monto_pagado)->add($despuesPenalidades);

                        $cuota->update([
                            'monto_pagado' => $nuevoPagado->toFloat(),
                            'penalidad_fija_acumulada' => 0,
                            'interes_moratorio_acumulado' => 0,
                            'estado' => 'parcial',
                        ]);
                    } else {
                        $penalidadFija = Money::from($cuota->penalidad_fija_acumulada);
                        if ($montoRestante->isGreaterThanOrEqualTo($penalidadFija)) {
                            $moraAplicada = $montoRestante->sub($penalidadFija);
                            $cuota->update([
                                'penalidad_fija_acumulada' => 0,
                                'interes_moratorio_acumulado' => Money::from($cuota->interes_moratorio_acumulado)->sub($moraAplicada)->toFloat(),
                                'estado' => 'parcial',
                            ]);
                        } else {
                            $cuota->update([
                                'penalidad_fija_acumulada' => Money::from($cuota->penalidad_fija_acumulada)->sub($montoRestante)->toFloat(),
                                'estado' => 'parcial',
                            ]);
                        }
                    }

                    Pago::create([
                        'prestamo_id' => $prestamoId,
                        'cuota_id' => $cuota->id,
                        'user_id' => $userId,
                        'cobrador_id' => $cobradorId,
                        'monto_abonado' => $montoAplicado->toFloat(),
                        'metodo_pago' => $metodo,
                        'comprobante_url' => $comprobanteUrl,
                        'notas' => $notas,
                    ]);

                    $pagosRegistrados[] = [
                        'cuota_id' => $cuota->id,
                        'num_cuota' => $cuota->num_cuota,
                        'monto_aplicado' => $montoAplicado->toFloat(),
                        'estado' => 'parcial',
                    ];

                    $montoRestante = Money::from(0);
                }
            }

            if ($montoRestante->isGreaterThan(0)) {
                Cliente::where('id', $clienteId)->increment('saldo_favor', $montoRestante->toFloat());

                $pago = Pago::create([
                    'prestamo_id' => $prestamoId,
                    'cuota_id' => null,
                    'user_id' => $userId,
                    'cobrador_id' => $cobradorId,
                    'monto_abonado' => $montoRestante->toFloat(),
                    'metodo_pago' => $metodo,
                    'comprobante_url' => $comprobanteUrl,
                    'notas' => $notas ?? 'Excedente guardado como saldo a favor del cliente',
                ]);

                $pagosRegistrados[] = [
                    'cuota_id' => null,
                    'num_cuota' => null,
                    'monto_aplicado' => $montoRestante->toFloat(),
                    'estado' => 'excedente_saldo_favor',
                ];
            }

            $saldoPendiente = Cuota::where('prestamo_id', $prestamoId)
                ->where('estado', '!=', 'pagado')
                ->get()
                ->sum(fn($c) => (float) $c->monto_cuota - (float) $c->monto_pagado);

            $prestamo->update(['saldo_pendiente' => $saldoPendiente]);

            $cuotasNoPagadas = Cuota::where('prestamo_id', $prestamoId)
                ->where(function ($q) {
                    $q->where('estado', '!=', 'pagado')
                      ->orWhere('penalidad_fija_acumulada', '>', 0)
                      ->orWhere('interes_moratorio_acumulado', '>', 0);
                })
                ->count();

            if ($cuotasNoPagadas === 0) {
                $prestamo->update(['estado' => 'pagado']);
            } elseif (
                Cuota::where('prestamo_id', $prestamoId)->where('estado', 'vencido')->exists()
            ) {
                $prestamo->update(['estado' => 'en_mora']);
            } elseif ($prestamo->estado === 'pendiente') {
                $prestamo->update(['estado' => 'activo']);
            }

            return [
                'success' => true,
                'pagos' => $pagosRegistrados,
            ];
        });
    }
}
