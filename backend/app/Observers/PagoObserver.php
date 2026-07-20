<?php

namespace App\Observers;

use App\Models\AuditoriaPago;
use App\Models\Pago;

class PagoObserver
{
    public function created(Pago $pago): void
    {
        AuditoriaPago::create([
            'pago_id' => $pago->id,
            'prestamo_id' => $pago->prestamo_id,
            'cuota_id' => $pago->cuota_id,
            'user_id' => $pago->user_id,
            'cobrador_id' => $pago->cobrador_id,
            'monto_abonado' => $pago->monto_abonado,
            'fecha_pago' => $pago->fecha_pago,
            'metodo_pago' => $pago->metodo_pago,
            'comprobante_url' => $pago->comprobante_url,
            'notas' => $pago->notas,
        ]);
    }
}
