<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('universities', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('code', 32)->unique();
            $table->string('logo')->nullable();
            $table->string('city')->nullable();
            $table->string('status')->default('active'); // active|inactive
            $table->timestamps();
        });

        Schema::create('organizations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('university_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('type')->default('UKM'); // BEM|HIMA|UKM|kantin|other
            $table->string('logo')->nullable();
            $table->text('description')->nullable();
            $table->timestamps();
        });

        Schema::create('categories', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('slug')->unique();
            $table->timestamps();
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('university_id')->nullable()->after('email')->constrained()->nullOnDelete();
            $table->foreignId('organization_id')->nullable()->after('university_id')->constrained()->nullOnDelete();
            $table->string('student_id', 64)->nullable()->after('organization_id');
            $table->string('faculty')->nullable()->after('student_id');
            $table->string('study_program')->nullable()->after('faculty');
            $table->string('avatar', 10)->nullable()->after('study_program');
            // Day 4: super_admin | campus_admin | student
            $table->string('role')->default('student')->after('avatar');
            $table->unsignedInteger('items_saved')->default(0)->after('role');
            $table->decimal('food_rescued_kg', 8, 1)->default(0)->after('items_saved');
            $table->decimal('waste_reduced_kg', 8, 1)->default(0)->after('food_rescued_kg');
            $table->unsignedBigInteger('money_saved')->default(0)->after('waste_reduced_kg');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('organization_id');
            $table->dropConstrainedForeignId('university_id');
            $table->dropColumn([
                'student_id',
                'faculty',
                'study_program',
                'avatar',
                'role',
                'items_saved',
                'food_rescued_kg',
                'waste_reduced_kg',
                'money_saved',
            ]);
        });

        Schema::dropIfExists('categories');
        Schema::dropIfExists('organizations');
        Schema::dropIfExists('universities');
    }
};
