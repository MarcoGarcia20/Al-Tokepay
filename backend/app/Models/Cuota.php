<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Cuota extends Model
{
    use HasUuids;

    protected $table = 'cuotas';

    protected $fillable = [
        'prestamo_id',
        'num_cuota',
        'monto_cuota',
        'monto_interes',
        'monto_principal',
        'saldo_capital',
        'fecha_vencimiento',
        'estado',
        'monto_pagado',
        'dias_retraso',
        'penalidad_fija_acumulada',
        'interes_moratorio_acumulado',
        'ultimo_calculo_mora',
    ];

    protected function casts(): array
    {
        return [
            'monto_cuota' => 'decimal:2',
            'monto_interes' => 'decimal:2',
            'monto_principal' => 'decimal:2',
            'saldo_capital' => 'decimal:2',
            'monto_pagado' => 'decimal:2',
            'penalidad_fija_acumulada' => 'decimal:2',
            'interes_moratorio_acumulado' => 'decimal:2',
            'dias_retraso' => 'integer',
            'fecha_vencimiento' => 'date',
            'ultimo_calculo_mora' => 'date',
        ];
    }

    public function prestamo(): BelongsTo
    {
        return $this->belongsTo(Prestamo::class);
    }
}
