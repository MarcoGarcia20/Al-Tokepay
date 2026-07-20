<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Prestamo;
use App\Services\PrestamoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;

class PrestamoController extends Controller
{
    public function __construct(
        private PrestamoService $prestamoService,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();

        $query = Prestamo::with('cliente:id,nombres,apellidos,documento_identidad,celular,correo');

        if (!$user->hasRole('administrador')) {
            $query->where(function ($q) use ($user) {
                $q->where('cobrador_id', $user->id)
                  ->orWhere('user_id', $user->id);
            });
        }

        $prestamos = $query->orderBy('created_at', 'desc')->get();

        return response()->json($prestamos);
    }

    public function show(string $id): JsonResponse
    {
        $prestamo = Prestamo::with('cliente', 'cuotas')->findOrFail($id);
        Gate::authorize('view', $prestamo);
        return response()->json($prestamo);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'cliente_id' => 'required|exists:clientes,id',
            'monto_principal' => 'required|numeric|min:10',
            'tasa_interes' => 'required|numeric|min:0|max:100',
            'num_cuotas' => 'required|integer|min:1|max:120',
            'frecuencia_pago' => 'required|in:diario,semanal,quincenal,mensual',
            'fecha_inicio' => 'required|date',
            'notas' => 'nullable|string',
            'excluir_domingos' => 'boolean',
            'cobrador_id' => 'nullable|exists:users,id',
        ]);

        $tabla = $this->prestamoService->generarTablaAmortizacion(
            $validated['monto_principal'],
            $validated['tasa_interes'],
            $validated['num_cuotas'],
            $validated['frecuencia_pago'],
            $validated['fecha_inicio'],
            $validated['excluir_domingos'] ?? false,
        );

        $totalPagar = array_sum(array_column($tabla, 'cuotaTotal'));

        $prestamo = $this->prestamoService->crearPrestamoConCuotas(
            $validated['cliente_id'],
            $request->user()->id,
            $validated['monto_principal'],
            $validated['tasa_interes'],
            $validated['num_cuotas'],
            $validated['frecuencia_pago'],
            $validated['fecha_inicio'],
            $totalPagar,
            $validated['notas'] ?? null,
            $tabla,
            $validated['excluir_domingos'] ?? false,
            $validated['cobrador_id'] ?? null,
        );

        return response()->json($prestamo->load('cuotas'), 201);
    }

    public function simular(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'monto_principal' => 'required|numeric|min:10',
            'tasa_interes' => 'required|numeric|min:0|max:100',
            'num_cuotas' => 'required|integer|min:1|max:120',
            'frecuencia_pago' => 'required|in:diario,semanal,quincenal,mensual',
            'fecha_inicio' => 'required|date',
            'excluir_domingos' => 'boolean',
        ]);

        $tabla = $this->prestamoService->generarTablaAmortizacion(
            $validated['monto_principal'],
            $validated['tasa_interes'],
            $validated['num_cuotas'],
            $validated['frecuencia_pago'],
            $validated['fecha_inicio'],
            $validated['excluir_domingos'] ?? false,
        );

        $totalPagar = array_sum(array_column($tabla, 'cuotaTotal'));
        $totalIntereses = $totalPagar - $validated['monto_principal'];

        return response()->json([
            'tabla' => $tabla,
            'total_pagar' => round($totalPagar, 2),
            'total_intereses' => round($totalIntereses, 2),
        ]);
    }
}
