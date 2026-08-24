<?php

namespace App\Services;

use App\Models\AppNotification;
use App\Models\CommunityEvent;
use App\Models\CommunityEventRegistration;
use App\Models\CommunityVolunteerSignup;
use App\Models\ImpactLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class ImpactService
{
    public function record(
        User $user,
        string $type,
        ?Model $reference = null,
        int $itemsSaved = 0,
        float $foodRescuedKg = 0,
        float $wasteReducedKg = 0,
        int $moneySaved = 0,
    ): ImpactLog {
        $user->increment('items_saved', $itemsSaved);
        $user->increment('food_rescued_kg', $foodRescuedKg);
        $user->increment('waste_reduced_kg', $wasteReducedKg);
        $user->increment('money_saved', $moneySaved);
        $user->refresh();

        return ImpactLog::create([
            'university_id' => $user->university_id,
            'user_id' => $user->id,
            'type' => $type,
            'reference_type' => $reference ? $reference::class : null,
            'reference_id' => $reference?->getKey(),
            'quantity' => max($itemsSaved, (int) ceil($foodRescuedKg)),
            'items_saved' => $itemsSaved,
            'estimated_weight' => $wasteReducedKg ?: $foodRescuedKg,
            'food_rescued_kg' => $foodRescuedKg,
            'waste_reduced_kg' => $wasteReducedKg,
            'estimated_saving' => $moneySaved,
            'money_saved' => $moneySaved,
        ]);
    }

    public function notify(
        User $user,
        string $title,
        string $body,
        string $type = 'general',
        ?string $link = null,
    ): AppNotification {
        $existing = AppNotification::query()
            ->where('user_id', $user->id)
            ->where('title', $title)
            ->where('body', $body)
            ->where('created_at', '>', now()->subHours(12))
            ->latest()
            ->first();

        if ($existing) {
            return $existing;
        }

        return AppNotification::create([
            'user_id' => $user->id,
            'title' => $title,
            'body' => $body,
            'type' => $type,
            'link' => $link,
            'is_read' => false,
        ]);
    }

    /**
     * Undo food_rescued impact for a food claim cancel (user counters + campus ImpactLog).
     */
    public function reverseFoodRescue(
        User $user,
        Model $reference,
        float $foodRescuedKg,
        float $wasteReducedKg,
        int $moneySaved,
    ): void {
        $user->decrement('food_rescued_kg', min((float) $user->food_rescued_kg, $foodRescuedKg));
        $user->decrement('waste_reduced_kg', min((float) $user->waste_reduced_kg, $wasteReducedKg));
        $user->decrement('money_saved', min((int) $user->money_saved, $moneySaved));
        $user->refresh();

        $remainingKg = $foodRescuedKg;
        $logs = ImpactLog::query()
            ->where('user_id', $user->id)
            ->where('type', 'food_rescued')
            ->where('reference_type', $reference::class)
            ->where('reference_id', $reference->getKey())
            ->orderByDesc('id')
            ->get();

        foreach ($logs as $log) {
            if ($remainingKg <= 0.001) {
                break;
            }

            $logKg = (float) $log->food_rescued_kg;
            if ($logKg <= $remainingKg + 0.05) {
                $remainingKg -= $logKg;
                $log->delete();
                continue;
            }

            $keepKg = round($logKg - $remainingKg, 1);
            $ratio = $logKg > 0 ? $keepKg / $logKg : 0;
            $log->update([
                'food_rescued_kg' => $keepKg,
                'waste_reduced_kg' => round((float) $log->waste_reduced_kg * $ratio, 1),
                'estimated_weight' => round((float) $log->estimated_weight * $ratio, 1),
                'money_saved' => (int) round((int) $log->money_saved * $ratio),
                'estimated_saving' => (int) round((int) $log->estimated_saving * $ratio),
                'quantity' => max(1, (int) ceil($keepKg)),
            ]);
            $remainingKg = 0;
        }
    }

    public function campusStats(?int $universityId = null): array
    {
        $query = ImpactLog::query();
        if ($universityId) {
            $query->where('university_id', $universityId);
        }

        $totals = $query
            ->selectRaw('COALESCE(SUM(items_saved),0) as items_saved')
            ->selectRaw('COALESCE(SUM(food_rescued_kg),0) as food_rescued_kg')
            ->selectRaw('COALESCE(SUM(waste_reduced_kg),0) as waste_reduced_kg')
            ->selectRaw('COALESCE(SUM(money_saved),0) as money_saved')
            ->first();

        $usersQuery = User::query()->where('role', 'student');
        if ($universityId) {
            $usersQuery->where('university_id', $universityId);
        }

        $eventsQuery = CommunityEvent::query()->where('status', '!=', 'cancelled');
        if ($universityId) {
            $eventsQuery->where('university_id', $universityId);
        }

        $volunteersQuery = CommunityVolunteerSignup::query()
            ->whereIn('status', ['approved', 'pending']);
        if ($universityId) {
            $volunteersQuery->whereHas('volunteer', fn ($q) => $q->where('university_id', $universityId));
        }

        return [
            'itemsSaved' => (int) ($totals->items_saved ?? 0),
            'foodRescuedKg' => round((float) ($totals->food_rescued_kg ?? 0), 1),
            'wasteReducedKg' => round((float) ($totals->waste_reduced_kg ?? 0), 1),
            'moneySaved' => (int) ($totals->money_saved ?? 0),
            'activeUsers' => $usersQuery->count(),
            'eventsHeld' => $eventsQuery->count(),
            'activeVolunteers' => (int) $volunteersQuery->distinct()->count('user_id'),
        ];
    }

    public function weekly(?int $universityId = null): array
    {
        $days = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
        $start = now()->startOfWeek()->startOfDay();
        $end = $start->copy()->addDays(6)->endOfDay();

        $rowsQuery = ImpactLog::query()->whereBetween('created_at', [$start, $end]);
        if ($universityId) {
            $rowsQuery->where('university_id', $universityId);
        }

        $rows = $rowsQuery->get(['created_at', 'items_saved', 'food_rescued_kg', 'type']);

        $byDay = $rows->groupBy(fn ($log) => $log->created_at->toDateString());

        return collect($days)->map(function ($day, $i) use ($start, $byDay) {
            $date = $start->copy()->addDays($i)->toDateString();
            $logs = $byDay->get($date, collect());

            return [
                'day' => $day,
                'items' => (int) $logs->sum('items_saved'),
                'food' => (int) round(
                    (float) $logs
                        ->whereIn('type', ['food_claim', 'food_rescued'])
                        ->sum('food_rescued_kg')
                ),
            ];
        })->all();
    }

    /** Counts from registration tables so badges stay accurate even if an event is closed. */
    public function communityParticipation(User $user): array
    {
        return [
            'eventsJoined' => CommunityEventRegistration::query()
                ->where('user_id', $user->id)
                ->where('status', 'registered')
                ->count(),
            'volunteersJoined' => CommunityVolunteerSignup::query()
                ->where('user_id', $user->id)
                ->whereIn('status', ['pending', 'approved'])
                ->count(),
        ];
    }
}
