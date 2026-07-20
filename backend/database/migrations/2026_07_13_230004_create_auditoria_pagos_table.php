<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('auditoria_pagos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('pago_id');
            $table->uuid('prestamo_id');
            $table->uuid('cuota_id')->nullable();
            $table->uuid('user_id');
            $table->uuid('cobrador_id');
            $table->decimal('monto_abonado', 12, 2);
            $table->timestamp('fecha_pago')->nullable();
            $table->string('metodo_pago');
            $table->string('comprobante_url')->nullable();
            $table->text('notas')->nullable();
            $table->timestamp('created_at')->useCurrent();

            $table->index('pago_id');
            $table->index('prestamo_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('auditoria_pagos');
    }
};
