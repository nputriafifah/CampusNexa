<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->foreignId('organization_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('claimer_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('condition')->default('Baik');
            // Day 4: sell | donate | exchange | borrow (listing_type = type)
            $table->string('listing_type');
            $table->unsignedInteger('price')->default(0);
            $table->string('location')->nullable();
            // available | reserved | sold | borrowed | donated
            $table->string('status')->default('available');
            $table->string('image')->nullable();
            $table->json('tags')->nullable();
            $table->timestamps();
        });

        Schema::create('item_images', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->string('path');
            $table->boolean('is_primary')->default(false);
            $table->timestamps();
        });

        // Exchange interest messages (MVP helper, not a Day-4 core entity)
        Schema::create('item_interests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->text('message');
            $table->timestamps();
        });

        Schema::create('borrow_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('item_id')->constrained()->cascadeOnDelete();
            $table->foreignId('borrower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('message')->nullable();
            $table->string('status')->default('pending'); // pending|approved|rejected|returned
            $table->boolean('reminder_sent')->default(false);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('borrow_requests');
        Schema::dropIfExists('item_interests');
        Schema::dropIfExists('item_images');
        Schema::dropIfExists('items');
    }
};
