<?php

namespace App\Policies;

use App\Models\Prestamo;
use App\Models\User;

class PrestamoPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Prestamo $prestamo): bool
    {
        if ($user->hasRole('administrador')) return true;
        return $prestamo->cobrador_id === $user->id || $prestamo->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Prestamo $prestamo): bool
    {
        return $user->hasRole('administrador');
    }

    public function delete(User $user, Prestamo $prestamo): bool
    {
        return $user->hasRole('administrador');
    }
}
