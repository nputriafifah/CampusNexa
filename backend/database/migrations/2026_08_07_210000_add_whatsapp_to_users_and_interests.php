<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('whatsapp', 30)->nullable()->after('faculty');
        });

        Schema::table('item_interests', function (Blueprint $table) {
            $table->string('whatsapp', 30)->nullable()->after('message');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('whatsapp');
        });

        Schema::table('item_interests', function (Blueprint $table) {
            $table->dropColumn('whatsapp');
        });
    }
};
