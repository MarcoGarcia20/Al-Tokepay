<?php

namespace App\Policies;

use App\Models\Pago;
use App\Models\User;

class PagoPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Pago $pago): bool
    {
        if ($user->hasRole('administrador')) return true;
        return $pago->cobrador_id === $user->id || $pago->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }
}
