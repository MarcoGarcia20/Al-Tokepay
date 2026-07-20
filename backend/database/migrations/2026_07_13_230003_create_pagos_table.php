<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('pagos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('prestamo_id')->constrained('prestamos')->onDelete('cascade');
            $table->foreignUuid('cuota_id')->nullable()->constrained('cuotas')->nullOnDelete();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->foreignUuid('cobrador_id')->constrained('users')->onDelete('cascade');
            $table->decimal('monto_abonado', 12, 2);
            $table->timestamp('fecha_pago')->useCurrent();
            $table->timestamp('hora_pago')->useCurrent();
            $table->string('metodo_pago');
            $table->string('comprobante_url')->nullable();
            $table->text('notas')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pagos');
    }
};
