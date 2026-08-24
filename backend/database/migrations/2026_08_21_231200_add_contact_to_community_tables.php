<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('community_events', function (Blueprint $table) {
            $table->string('whatsapp_url')->nullable()->after('organizer');
            $table->string('contact_note')->nullable()->after('whatsapp_url');
        });

        Schema::table('community_volunteers', function (Blueprint $table) {
            $table->string('whatsapp_url')->nullable()->after('organizer');
            $table->string('contact_note')->nullable()->after('whatsapp_url');
        });
    }

    public function down(): void
    {
        Schema::table('community_events', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_url', 'contact_note']);
        });

        Schema::table('community_volunteers', function (Blueprint $table) {
            $table->dropColumn(['whatsapp_url', 'contact_note']);
        });
    }
};
