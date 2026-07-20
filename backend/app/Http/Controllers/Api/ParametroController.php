<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ParametroSistema;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ParametroController extends Controller
{
    public function index(): JsonResponse
    {
        $parametros = ParametroSistema::orderBy('clave')->get();
        return response()->json($parametros);
    }

    public function update(Request $request, string $clave): JsonResponse
    {
        $validated = $request->validate([
            'valor' => 'required|string',
        ]);

        $parametro = ParametroSistema::where('clave', $clave)->firstOrFail();
        $parametro->update(['valor' => $validated['valor']]);

        return response()->json($parametro);
    }
}
