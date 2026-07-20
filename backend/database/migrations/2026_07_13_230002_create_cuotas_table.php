<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('cuotas', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('prestamo_id')->constrained('prestamos')->onDelete('cascade');
            $table->integer('num_cuota');
            $table->decimal('monto_cuota', 10, 2);
            $table->decimal('monto_interes', 10, 2);
            $table->decimal('monto_principal', 10, 2);
            $table->decimal('saldo_capital', 10, 2);
            $table->date('fecha_vencimiento');
            $table->string('estado')->default('pendiente');
            $table->decimal('monto_pagado', 10, 2)->default(0);
            $table->integer('dias_retraso')->default(0);
            $table->decimal('penalidad_fija_acumulada', 10, 2)->default(0);
            $table->decimal('interes_moratorio_acumulado', 10, 2)->default(0);
            $table->date('ultimo_calculo_mora')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('cuotas');
    }
};
