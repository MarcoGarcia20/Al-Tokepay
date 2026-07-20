<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Pago extends Model
{
    use HasUuids;

    protected $table = 'pagos';

    protected $fillable = [
        'prestamo_id',
        'cuota_id',
        'user_id',
        'cobrador_id',
        'monto_abonado',
        'fecha_pago',
        'hora_pago',
        'metodo_pago',
        'comprobante_url',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'monto_abonado' => 'decimal:2',
            'fecha_pago' => 'datetime',
            'hora_pago' => 'datetime',
        ];
    }

    public function prestamo(): BelongsTo
    {
        return $this->belongsTo(Prestamo::class);
    }

    public function cuota(): BelongsTo
    {
        return $this->belongsTo(Cuota::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cobrador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cobrador_id');
    }
}
