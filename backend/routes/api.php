<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClienteController;
use App\Http\Controllers\Api\CobradorController;
use App\Http\Controllers\Api\ComprobanteController;
use App\Http\Controllers\Api\CuotaController;
use App\Http\Controllers\Api\MoraController;
use App\Http\Controllers\Api\PagoController;
use App\Http\Controllers\Api\ParametroController;
use App\Http\Controllers\Api\PrestamoController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login']);
Route::post('/register', [AuthController::class, 'register']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('clientes', ClienteController::class)->except(['destroy']);
    Route::patch('clientes/{cliente}/toggle-estado', [ClienteController::class, 'toggleEstado']);

    Route::get('prestamos', [PrestamoController::class, 'index']);
    Route::get('prestamos/{prestamo}', [PrestamoController::class, 'show']);
    Route::post('prestamos', [PrestamoController::class, 'store']);
    Route::post('prestamos/simular', [PrestamoController::class, 'simular']);

    Route::post('pagos', [PagoController::class, 'store']);

    Route::get('cuotas/pendientes', [CuotaController::class, 'pendientes']);

    Route::middleware('role:administrador')->group(function () {
        Route::post('mora/procesar', [MoraController::class, 'procesar']);
        Route::get('parametros', [ParametroController::class, 'index']);
        Route::put('parametros/{clave}', [ParametroController::class, 'update']);
    });

    Route::get('cobradores', [CobradorController::class, 'index']);

    Route::post('comprobantes', [ComprobanteController::class, 'upload']);
});
