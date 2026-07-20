<?php

namespace App\Providers;

use App\Models\Pago;
use App\Observers\PagoObserver;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    public function register(): void
    {
        //
    }

    public function boot(): void
    {
        Pago::observe(PagoObserver::class);
    }
}
