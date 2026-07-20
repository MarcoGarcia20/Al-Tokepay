<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prestamo extends Model
{
    use HasUuids;

    protected $table = 'prestamos';

    protected $fillable = [
        'user_id',
        'cliente_id',
        'monto_principal',
        'tasa_interes',
        'num_cuotas',
        'frecuencia_pago',
        'estado',
        'fecha_inicio',
        'monto_total',
        'saldo_pendiente',
        'cobrador_id',
        'excluir_domingos',
        'notas',
    ];

    protected function casts(): array
    {
        return [
            'monto_principal' => 'decimal:2',
            'tasa_interes' => 'decimal:2',
            'monto_total' => 'decimal:2',
            'saldo_pendiente' => 'decimal:2',
            'excluir_domingos' => 'boolean',
            'fecha_inicio' => 'date',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cliente(): BelongsTo
    {
        return $this->belongsTo(Cliente::class);
    }

    public function cobrador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cobrador_id');
    }

    public function cuotas(): HasMany
    {
        return $this->hasMany(Cuota::class);
    }

    public function pagos(): HasMany
    {
        return $this->hasMany(Pago::class);
    }
}
