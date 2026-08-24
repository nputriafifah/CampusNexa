<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\CommunityEvent;
use App\Models\CommunityEventRegistration;
use App\Models\CommunityVolunteer;
use App\Models\CommunityVolunteerSignup;
use App\Services\ImpactService;
use Illuminate\Http\Request;

class CommunityController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $uid = $user->university_id;

        $events = CommunityEvent::query()
            ->when($uid, fn ($q) => $q->where('university_id', $uid))
            ->where('status', '!=', 'closed')
            ->orderBy('starts_at')
            ->limit(40)
            ->get()
            ->map(fn (CommunityEvent $e) => $e->toApiArray($user->id));

        $volunteers = CommunityVolunteer::query()
            ->when($uid, fn ($q) => $q->where('university_id', $uid))
            ->where('status', '!=', 'closed')
            ->latest()
            ->limit(40)
            ->get()
            ->map(fn (CommunityVolunteer $v) => $v->toApiArray($user->id));

        return response()->json([
            'events' => $events,
            'volunteers' => $volunteers,
        ]);
    }

    public function showEvent(Request $request, CommunityEvent $event)
    {
        $this->ensureCampusAccess($request, $event->university_id);

        return response()->json([
            'data' => $event->toApiArray($request->user()->id),
        ]);
    }

    public function showVolunteer(Request $request, CommunityVolunteer $volunteer)
    {
        $this->ensureCampusAccess($request, $volunteer->university_id);

        return response()->json([
            'data' => $volunteer->toApiArray($request->user()->id),
        ]);
    }

    public function registerEvent(Request $request, CommunityEvent $event, ImpactService $impact)
    {
        $user = $request->user();
        $this->ensureCampusAccess($request, $event->university_id);
        abort_if($event->status === 'closed', 422, 'Event sudah ditutup');

        $count = $event->registrations()->where('status', 'registered')->count();
        abort_if($count >= $event->quota, 422, 'Kuota event penuh');

        $reg = CommunityEventRegistration::updateOrCreate(
            ['event_id' => $event->id, 'user_id' => $user->id],
            ['status' => 'registered']
        );

        $impact->notify(
            $user,
            'Pendaftaran event berhasil',
            $event->whatsapp_url
                ? "Kamu terdaftar di \"{$event->title}\". Join grup WA panitia untuk info lanjut."
                : "Kamu terdaftar di \"{$event->title}\". Cek detail untuk langkah berikutnya.",
            'community',
            '/app/community/events/'.$event->id
        );

        return response()->json([
            'message' => 'Terdaftar',
            'data' => $event->fresh()->toApiArray($user->id),
            'registration' => $reg->status,
        ]);
    }

    public function cancelEvent(Request $request, CommunityEvent $event)
    {
        $this->ensureCampusAccess($request, $event->university_id);

        CommunityEventRegistration::where('event_id', $event->id)
            ->where('user_id', $request->user()->id)
            ->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Pendaftaran dibatalkan',
            'data' => $event->fresh()->toApiArray($request->user()->id),
        ]);
    }

    public function signupVolunteer(Request $request, CommunityVolunteer $volunteer, ImpactService $impact)
    {
        $user = $request->user();
        $this->ensureCampusAccess($request, $volunteer->university_id);
        abort_if($volunteer->status === 'closed', 422, 'Relawan sudah ditutup');

        $count = $volunteer->signups()->whereIn('status', ['pending', 'approved'])->count();
        abort_if($count >= $volunteer->quota, 422, 'Kuota relawan penuh');

        $signup = CommunityVolunteerSignup::updateOrCreate(
            ['volunteer_id' => $volunteer->id, 'user_id' => $user->id],
            ['status' => 'pending']
        );

        $impact->notify(
            $user,
            'Pendaftaran relawan terkirim',
            $volunteer->whatsapp_url
                ? "Menunggu konfirmasi \"{$volunteer->title}\". Boleh join grup WA untuk briefing."
                : "Menunggu konfirmasi untuk \"{$volunteer->title}\".",
            'community',
            '/app/community/volunteers/'.$volunteer->id
        );

        return response()->json([
            'message' => 'Pendaftaran dikirim',
            'data' => $volunteer->fresh()->toApiArray($user->id),
            'signup' => $signup->status,
        ]);
    }

    public function cancelVolunteer(Request $request, CommunityVolunteer $volunteer)
    {
        $this->ensureCampusAccess($request, $volunteer->university_id);

        CommunityVolunteerSignup::where('volunteer_id', $volunteer->id)
            ->where('user_id', $request->user()->id)
            ->update(['status' => 'cancelled']);

        return response()->json([
            'message' => 'Pendaftaran dibatalkan',
            'data' => $volunteer->fresh()->toApiArray($request->user()->id),
        ]);
    }

    protected function ensureCampusAccess(Request $request, ?int $universityId): void
    {
        $uid = $request->user()?->university_id;
        if ($uid && $universityId && (int) $universityId !== (int) $uid) {
            abort(403, 'Kegiatan dari kampus lain');
        }
    }
}
