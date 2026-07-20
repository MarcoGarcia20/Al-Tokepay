<?php

namespace App\Console\Commands;

use App\Services\MoraService;
use Illuminate\Console\Command;

class ProcesarMoraDiaria extends Command
{
    protected $signature = 'mora:procesar-diaria';
    protected $description = 'Procesa la mora diaria sobre cuotas vencidas no pagadas';

    public function handle(MoraService $moraService): int
    {
        $this->info('Iniciando proceso de mora diaria...');

        try {
            $resultado = $moraService->procesarMoraDiaria();

            $this->info("Cuotas procesadas: {$resultado['cuotas_procesadas']}");
            $this->info("Mora total acumulada: S/. {$resultado['mora_total_acumulada']}");
            $this->info("Penalidad total acumulada: S/. {$resultado['penalidad_total_acumulada']}");

            return Command::SUCCESS;
        } catch (\Exception $e) {
            $this->error("Error: {$e->getMessage()}");
            return Command::FAILURE;
        }
    }
}
