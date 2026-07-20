<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('prestamos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('cliente_id')->constrained('clientes')->onDelete('cascade');
            $table->decimal('monto_principal', 12, 2);
            $table->decimal('tasa_interes', 5, 2);
            $table->integer('num_cuotas');
            $table->string('frecuencia_pago');
            $table->string('estado')->default('pendiente');
            $table->date('fecha_inicio');
            $table->decimal('monto_total', 12, 2);
            $table->decimal('saldo_pendiente', 12, 2);
            $table->foreignUuid('cobrador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('excluir_domingos')->default(false);
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('prestamos');
    }
};
