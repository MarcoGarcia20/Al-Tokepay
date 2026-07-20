<?php

namespace App\Policies;

use App\Models\Cliente;
use App\Models\User;

class ClientePolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, Cliente $cliente): bool
    {
        if ($user->hasRole('administrador')) return true;
        return $cliente->cobrador_id === $user->id || $cliente->user_id === $user->id;
    }

    public function create(User $user): bool
    {
        return true;
    }

    public function update(User $user, Cliente $cliente): bool
    {
        if ($user->hasRole('administrador')) return true;
        return $cliente->user_id === $user->id;
    }

    public function delete(User $user, Cliente $cliente): bool
    {
        return $user->hasRole('administrador');
    }
}
