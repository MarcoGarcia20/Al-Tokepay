<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\JsonResponse;

class CobradorController extends Controller
{
    public function index(): JsonResponse
    {
        $cobradores = User::role('cobrador')->get(['id', 'name', 'email']);
        return response()->json($cobradores);
    }
}
