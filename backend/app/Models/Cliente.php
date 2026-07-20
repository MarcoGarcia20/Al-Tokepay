<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Cliente extends Model
{
    use HasUuids;

    protected $table = 'clientes';

    protected $fillable = [
        'user_id',
        'nombres',
        'apellidos',
        'documento_identidad',
        'celular',
        'correo',
        'estado',
        'direccion',
        'notas',
        'saldo_favor',
        'cobrador_id',
    ];

    protected function casts(): array
    {
        return [
            'saldo_favor' => 'decimal:2',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function cobrador(): BelongsTo
    {
        return $this->belongsTo(User::class, 'cobrador_id');
    }

    public function prestamos(): HasMany
    {
        return $this->hasMany(Prestamo::class);
    }
}
