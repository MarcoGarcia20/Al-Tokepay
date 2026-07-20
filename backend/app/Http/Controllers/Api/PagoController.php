<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\AmortizacionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PagoController extends Controller
{
    public function __construct(
        private AmortizacionService $amortizacionService,
    ) {}

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'prestamo_id' => 'required|exists:prestamos,id',
            'monto' => 'required|numeric|min:0.5',
            'metodo_pago' => 'required|in:efectivo,transferencia,billetera_digital',
            'notas' => 'nullable|string',
            'comprobante_url' => 'nullable|string',
            'cobrador_id' => 'nullable|exists:users,id',
        ]);

        $cobradorId = $validated['cobrador_id'] ?? $request->user()->id;

        $resultado = $this->amortizacionService->registrarAbono(
            $validated['prestamo_id'],
            $request->user()->id,
            $cobradorId,
            $validated['monto'],
            $validated['metodo_pago'],
            $validated['notas'] ?? null,
            $validated['comprobante_url'] ?? null,
        );

        return response()->json($resultado, 201);
    }
}
