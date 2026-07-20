<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComprobanteController extends Controller
{
    public function upload(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'archivo' => 'required|file|mimes:jpg,jpeg,png,pdf|max:5120',
        ]);

        $path = $request->file('archivo')->store('comprobantes-pago', 'public');

        $url = asset('storage/' . $path);

        return response()->json([
            'url' => $url,
            'path' => $path,
        ], 201);
    }
}
