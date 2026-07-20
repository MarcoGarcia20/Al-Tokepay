<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Cuota;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CuotaController extends Controller
{
    public function pendientes(Request $request): JsonResponse
    {
        $cuotas = Cuota::with('prestamo.cliente')
            ->where('estado', 'pendiente')
            ->orderBy('fecha_vencimiento')
            ->get();

        return response()->json($cuotas);
    }
}
