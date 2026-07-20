<?php

namespace Database\Seeders;

use App\Models\ParametroSistema;
use Illuminate\Database\Seeder;

class ParametroSeeder extends Seeder
{
    public function run(): void
    {
        ParametroSistema::firstOrCreate(
            ['clave' => 'penalidad_diaria_mora'],
            [
                'valor' => '5.00',
                'descripcion' => 'Penalidad fija en soles por cada día de retraso en una cuota',
            ],
        );

        ParametroSistema::firstOrCreate(
            ['clave' => 'tasa_mora_porcentaje'],
            [
                'valor' => '1.50',
                'descripcion' => 'Tasa mensual de interés moratorio (en porcentaje) a prorrata diaria',
            ],
        );
    }
}
