<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class AuditoriaPago extends Model
{
    use HasUuids;

    protected $table = 'auditoria_pagos';

    public $timestamps = false;

    protected $fillable = [
        'pago_id',
        'prestamo_id',
        'cuota_id',
        'user_id',
        'cobrador_id',
        'monto_abonado',
        'fecha_pago',
        'metodo_pago',
        'comprobante_url',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'monto_abonado' => 'decimal:2',
            'fecha_pago' => 'datetime',
            'created_at' => 'datetime',
        ];
    }
}
