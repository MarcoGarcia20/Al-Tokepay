<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('clientes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignUuid('user_id')->constrained('users')->onDelete('cascade');
            $table->string('nombres');
            $table->string('apellidos');
            $table->string('documento_identidad');
            $table->string('celular');
            $table->string('correo')->nullable();
            $table->string('estado')->default('activo');
            $table->text('direccion')->nullable();
            $table->text('notas')->nullable();
            $table->decimal('saldo_favor', 12, 2)->default(0);
            $table->foreignUuid('cobrador_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('clientes');
    }
};
