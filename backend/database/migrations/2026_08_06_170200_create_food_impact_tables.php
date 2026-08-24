<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('foods', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained()->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete(); // seller
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedInteger('quantity');
            $table->unsignedInteger('remaining');
            $table->unsignedInteger('price')->default(0);
            $table->string('unit')->default('porsi');
            $table->unsignedTinyInteger('max_claim_per_user')->default(2);
            $table->string('location');
            $table->timestamp('pickup_until');
            $table->string('organization')->nullable();
            $table->string('status')->default('available'); // available|claimed|expired
            $table->string('image')->nullable();
            $table->timestamps();
        });

        Schema::create('food_claims', function (Blueprint $table) {
            $table->id();
            $table->foreignId('food_id')->constrained('foods')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->unsignedInteger('quantity')->default(1);
            $table->string('status')->default('reserved'); // reserved|picked_up|cancelled
            $table->timestamps();
        });

        Schema::create('ai_analyses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('item_id')->nullable()->constrained()->nullOnDelete();
            $table->string('image_url')->nullable();
            $table->string('detected_category')->nullable();
            $table->string('condition')->nullable();
            $table->unsignedInteger('estimated_price')->nullable();
            $table->string('recommendation')->nullable(); // sell|donate|borrow|repair
            $table->text('generated_description')->nullable();
            $table->json('payload')->nullable();
            $table->unsignedTinyInteger('confidence')->nullable();
            $table->timestamps();
        });

        Schema::create('impact_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->nullable()->constrained()->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('type'); // item_reused|food_rescued|item_donated|item_borrowed (+ legacy)
            $table->nullableMorphs('reference');
            $table->unsignedInteger('quantity')->default(0);
            $table->unsignedInteger('items_saved')->default(0);
            $table->decimal('estimated_weight', 8, 1)->default(0);
            $table->decimal('food_rescued_kg', 8, 1)->default(0);
            $table->decimal('waste_reduced_kg', 8, 1)->default(0);
            $table->unsignedBigInteger('estimated_saving')->default(0);
            $table->unsignedBigInteger('money_saved')->default(0);
            $table->timestamps();
        });

        Schema::create('app_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('title');
            $table->text('body')->nullable();
            $table->string('type')->default('general');
            $table->boolean('is_read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('app_notifications');
        Schema::dropIfExists('impact_logs');
        Schema::dropIfExists('ai_analyses');
        Schema::dropIfExists('food_claims');
        Schema::dropIfExists('foods');
    }
};
