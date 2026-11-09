<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use QuickCommands\Http\Controllers\ServerController;

Route::get('/', [ServerController::class, 'index']);
Route::post('/buttons', [ServerController::class, 'store']);
Route::put('/buttons/order', [ServerController::class, 'order']);
Route::put('/buttons/{id}', [ServerController::class, 'update'])->whereNumber('id');
Route::delete('/buttons/{id}', [ServerController::class, 'destroy'])->whereNumber('id');
Route::post('/buttons/{id}/run', [ServerController::class, 'run'])->whereNumber('id')->middleware('throttle:30,1');
