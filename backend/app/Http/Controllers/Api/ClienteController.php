<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cliente;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class ClienteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Cliente::with('cobrador:id,name');

        if (!$user->hasRole('administrador')) {
            $query->where(function ($q) use ($user) {
                $q->where('cobrador_id', $user->id)
                  ->orWhere('user_id', $user->id);
            });
        }

        $clientes = $query->orderBy('nombres')->get();

        return response()->json($clientes);
    }

    public function show(string $id): JsonResponse
    {
        $cliente = Cliente::with('cobrador:id,name', 'prestamos')->findOrFail($id);
        Gate::authorize('view', $cliente);
        return response()->json($cliente);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'nombres' => 'required|string|min:2',
            'apellidos' => 'required|string|min:2',
            'documento_identidad' => 'required|string|min:8|max:12',
            'celular' => 'required|string|min:9',
            'correo' => 'nullable|email',
            'direccion' => 'nullable|string',
            'notas' => 'nullable|string',
            'cobrador_id' => 'nullable|exists:users,id',
        ]);

        $validated['user_id'] = $request->user()->id;
        $validated['estado'] = 'activo';
        $validated['saldo_favor'] = 0;

        $cliente = Cliente::create($validated);

        return response()->json($cliente, 201);
    }

    public function update(Request $request, string $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);
        Gate::authorize('update', $cliente);

        $validated = $request->validate([
            'nombres' => 'sometimes|string|min:2',
            'apellidos' => 'sometimes|string|min:2',
            'documento_identidad' => 'sometimes|string|min:8|max:12',
            'celular' => 'sometimes|string|min:9',
            'correo' => 'nullable|email',
            'direccion' => 'nullable|string',
            'notas' => 'nullable|string',
            'cobrador_id' => 'nullable|exists:users,id',
            'estado' => 'sometimes|in:activo,bloqueado',
        ]);

        $cliente->update($validated);

        return response()->json($cliente);
    }

    public function toggleEstado(string $id): JsonResponse
    {
        $cliente = Cliente::findOrFail($id);
        Gate::authorize('update', $cliente);

        $cliente->update([
            'estado' => $cliente->estado === 'activo' ? 'bloqueado' : 'activo',
        ]);

        return response()->json($cliente);
    }
}
