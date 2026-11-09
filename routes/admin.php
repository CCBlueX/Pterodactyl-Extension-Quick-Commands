<?php

declare(strict_types=1);

use Illuminate\Support\Facades\Route;
use QuickCommands\Http\Controllers\AdminController;

Route::get('/', [AdminController::class, 'index']);
Route::post('/buttons', [AdminController::class, 'store']);
Route::put('/buttons/order', [AdminController::class, 'order']);
Route::put('/buttons/{id}', [AdminController::class, 'update'])->whereNumber('id');
Route::delete('/buttons/{id}', [AdminController::class, 'destroy'])->whereNumber('id');
