<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\MoraService;
use Illuminate\Http\JsonResponse;

class MoraController extends Controller
{
    public function __construct(
        private MoraService $moraService,
    ) {}

    public function procesar(): JsonResponse
    {
        $resultado = $this->moraService->procesarMoraDiaria();

        return response()->json($resultado);
    }
}
