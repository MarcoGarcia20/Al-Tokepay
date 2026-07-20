<?php

use App\Console\Commands\ProcesarMoraDiaria;
use Illuminate\Support\Facades\Schedule;

Schedule::command(ProcesarMoraDiaria::class)->dailyAt('00:00');
