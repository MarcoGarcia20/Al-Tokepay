<?php

use Illuminate\Http\RedirectResponse;

Route::get('/', fn (): RedirectResponse => redirect('/api/me'));
