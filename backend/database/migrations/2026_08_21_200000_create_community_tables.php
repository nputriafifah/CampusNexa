<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('community_events', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('organizer')->nullable();
            $table->timestamp('starts_at');
            $table->timestamp('ends_at')->nullable();
            $table->unsignedInteger('quota')->default(50);
            $table->string('status')->default('open'); // open|full|closed
            $table->string('kind')->default('event'); // event|volunteer_drive
            $table->timestamps();
        });

        Schema::create('community_volunteers', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained()->cascadeOnDelete();
            $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('event_id')->nullable()->constrained('community_events')->nullOnDelete();
            $table->string('title');
            $table->text('description')->nullable();
            $table->string('location')->nullable();
            $table->string('organizer')->nullable();
            $table->timestamp('starts_at')->nullable();
            $table->unsignedInteger('quota')->default(20);
            $table->string('status')->default('open');
            $table->timestamps();
        });

        Schema::create('community_event_registrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('event_id')->constrained('community_events')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('registered'); // registered|cancelled|attended
            $table->timestamps();
            $table->unique(['event_id', 'user_id']);
        });

        Schema::create('community_volunteer_signups', function (Blueprint $table) {
            $table->id();
            $table->foreignId('volunteer_id')->constrained('community_volunteers')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('status')->default('pending'); // pending|approved|rejected|cancelled
            $table->timestamps();
            $table->unique(['volunteer_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('community_volunteer_signups');
        Schema::dropIfExists('community_event_registrations');
        Schema::dropIfExists('community_volunteers');
        Schema::dropIfExists('community_events');
    }
};
