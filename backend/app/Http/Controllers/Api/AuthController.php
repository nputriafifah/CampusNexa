<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Mail\PasswordResetOtpMail;
use App\Mail\RegisterOtpMail;
use App\Models\PasswordResetOtp;
use App\Models\RegistrationOtp;
use App\Models\University;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    private const OTP_TTL_MINUTES = 10;

    private const OTP_MAX_ATTEMPTS = 5;

    private const RESEND_COOLDOWN_SECONDS = 60;

    /** Step 1: kirim OTP ke email (belum buat akun) */
    public function requestRegisterOtp(Request $request)
    {
        $data = $this->validateRegisterPayload($request);

        $code = $this->issueOtp($data);
        $this->sendOtpMail($data['email'], $data['name'], $code);

        return response()->json([
            'message' => 'Kode OTP telah dikirim ke email Anda.',
            'email' => $data['email'],
            'expires_in' => self::OTP_TTL_MINUTES * 60,
        ]);
    }

    /** Kirim ulang OTP */
    public function resendRegisterOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
        ]);

        $email = strtolower(trim($data['email']));
        $otp = RegistrationOtp::where('email', $email)->first();

        if (! $otp) {
            throw ValidationException::withMessages([
                'email' => ['Silakan isi formulir daftar ulang terlebih dahulu.'],
            ]);
        }

        if ($otp->last_sent_at && $otp->last_sent_at->diffInSeconds(now()) < self::RESEND_COOLDOWN_SECONDS) {
            $wait = self::RESEND_COOLDOWN_SECONDS - (int) $otp->last_sent_at->diffInSeconds(now());

            throw ValidationException::withMessages([
                'email' => ["Tunggu {$wait} detik sebelum mengirim ulang."],
            ]);
        }

        $payload = json_decode(Crypt::decryptString($otp->payload), true);
        if (! is_array($payload)) {
            throw ValidationException::withMessages([
                'email' => ['Sesi pendaftaran tidak valid. Silakan daftar ulang.'],
            ]);
        }

        if (User::where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => ['Email sudah terdaftar. Silakan masuk.'],
            ]);
        }

        $code = (string) random_int(100000, 999999);
        $otp->update([
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'last_sent_at' => now(),
        ]);

        $this->sendOtpMail($email, $payload['name'] ?? 'Mahasiswa', $code);

        return response()->json([
            'message' => 'Kode OTP baru telah dikirim.',
            'email' => $email,
            'expires_in' => self::OTP_TTL_MINUTES * 60,
        ]);
    }

    /** Step 2: verifikasi OTP → buat akun */
    public function verifyRegisterOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
            'code' => ['required', 'string', 'size:6'],
        ]);

        $email = strtolower(trim($data['email']));
        $otp = RegistrationOtp::where('email', $email)->first();

        if (! $otp) {
            throw ValidationException::withMessages([
                'code' => ['Kode tidak ditemukan. Silakan daftar ulang.'],
            ]);
        }

        if ($otp->expires_at->isPast()) {
            $otp->delete();
            throw ValidationException::withMessages([
                'code' => ['Kode sudah kedaluwarsa. Minta kode baru.'],
            ]);
        }

        if ($otp->attempts >= self::OTP_MAX_ATTEMPTS) {
            $otp->delete();
            throw ValidationException::withMessages([
                'code' => ['Terlalu banyak percobaan. Silakan daftar ulang.'],
            ]);
        }

        if (! Hash::check($data['code'], $otp->code_hash)) {
            $otp->increment('attempts');
            throw ValidationException::withMessages([
                'code' => ['Kode OTP salah.'],
            ]);
        }

        $payload = json_decode(Crypt::decryptString($otp->payload), true);
        if (! is_array($payload) || empty($payload['password'])) {
            $otp->delete();
            throw ValidationException::withMessages([
                'code' => ['Sesi pendaftaran rusak. Silakan daftar ulang.'],
            ]);
        }

        if (User::where('email', $email)->exists()) {
            $otp->delete();
            throw ValidationException::withMessages([
                'email' => ['Email sudah terdaftar. Silakan masuk.'],
            ]);
        }

        $university = $this->resolveUniversity($payload['university'] ?? null);

        $user = User::create([
            'name' => $payload['name'],
            'email' => $email,
            'password' => $payload['password'],
            'university_id' => $university?->id,
            'student_id' => $payload['student_id'] ?? null,
            'faculty' => $payload['faculty'] ?? null,
            'avatar' => collect(explode(' ', $payload['name']))
                ->map(fn ($p) => mb_substr($p, 0, 1))
                ->take(2)
                ->implode(''),
            'role' => 'student',
            'email_verified_at' => now(),
        ]);

        $otp->delete();

        $token = $user->createToken('campusnexa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load('university')->toApiArray(),
        ], 201);
    }

    /** Tetap tersedia: daftar langsung tanpa OTP (dev/legacy) */
    public function register(Request $request)
    {
        $data = $this->validateRegisterPayload($request);
        $university = $this->resolveUniversity($data['university'] ?? null);

        $user = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => $data['password'],
            'university_id' => $university?->id,
            'student_id' => $data['student_id'] ?? null,
            'faculty' => $data['faculty'] ?? null,
            'avatar' => collect(explode(' ', $data['name']))->map(fn ($p) => mb_substr($p, 0, 1))->take(2)->implode(''),
            'role' => 'student',
        ]);

        $token = $user->createToken('campusnexa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load('university')->toApiArray(),
        ], 201);
    }

    public function login(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        $user = User::where('email', $data['email'])->first();

        if (! $user || ! Hash::check($data['password'], $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['Email atau password salah.'],
            ]);
        }

        if (($user->account_status ?: 'active') !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Akun ini dinonaktifkan. Hubungi admin kampus.'],
            ]);
        }

        $token = $user->createToken('campusnexa')->plainTextToken;

        return response()->json([
            'token' => $token,
            'user' => $user->load('university')->toApiArray(),
        ]);
    }

    /** Lupa password: kirim OTP ke email terdaftar */
    public function requestPasswordResetOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)->first();

        if (! $user) {
            throw ValidationException::withMessages([
                'email' => ['Email tidak terdaftar di CampusNexa.'],
            ]);
        }

        if (($user->account_status ?: 'active') !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Akun ini dinonaktifkan. Hubungi admin kampus.'],
            ]);
        }

        $existing = PasswordResetOtp::where('email', $email)->first();
        if ($existing?->last_sent_at && $existing->last_sent_at->diffInSeconds(now()) < self::RESEND_COOLDOWN_SECONDS) {
            $wait = self::RESEND_COOLDOWN_SECONDS - (int) $existing->last_sent_at->diffInSeconds(now());

            throw ValidationException::withMessages([
                'email' => ["Tunggu {$wait} detik sebelum mengirim ulang."],
            ]);
        }

        $code = $this->issuePasswordResetOtp($email);
        $this->sendPasswordResetOtpMail($email, $user->name ?: 'Mahasiswa', $code);

        return response()->json([
            'message' => 'Kode OTP reset kata sandi telah dikirim ke email Anda.',
            'email' => $email,
            'expires_in' => self::OTP_TTL_MINUTES * 60,
        ]);
    }

    public function resendPasswordResetOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
        ]);

        $email = strtolower(trim($data['email']));
        $user = User::where('email', $email)->first();
        $otp = PasswordResetOtp::where('email', $email)->first();

        if (! $user || ! $otp) {
            throw ValidationException::withMessages([
                'email' => ['Silakan minta kode OTP reset terlebih dahulu.'],
            ]);
        }

        if (($user->account_status ?: 'active') !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Akun ini dinonaktifkan. Hubungi admin kampus.'],
            ]);
        }

        if ($otp->last_sent_at && $otp->last_sent_at->diffInSeconds(now()) < self::RESEND_COOLDOWN_SECONDS) {
            $wait = self::RESEND_COOLDOWN_SECONDS - (int) $otp->last_sent_at->diffInSeconds(now());

            throw ValidationException::withMessages([
                'email' => ["Tunggu {$wait} detik sebelum mengirim ulang."],
            ]);
        }

        $code = (string) random_int(100000, 999999);
        $otp->update([
            'code_hash' => Hash::make($code),
            'attempts' => 0,
            'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
            'last_sent_at' => now(),
        ]);

        $this->sendPasswordResetOtpMail($email, $user->name ?: 'Mahasiswa', $code);

        return response()->json([
            'message' => 'Kode OTP baru telah dikirim.',
            'email' => $email,
            'expires_in' => self::OTP_TTL_MINUTES * 60,
        ]);
    }

    /** Verifikasi OTP + set kata sandi baru */
    public function resetPasswordWithOtp(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:190'],
            'code' => ['required', 'string', 'size:6'],
            'password' => ['required', 'string', 'min:8', 'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/', 'confirmed'],
        ], [
            'password.regex' => 'Kata sandi harus mengandung huruf dan angka.',
        ]);

        $email = strtolower(trim($data['email']));
        $otp = PasswordResetOtp::where('email', $email)->first();
        $user = User::where('email', $email)->first();

        if (! $user || ! $otp) {
            throw ValidationException::withMessages([
                'code' => ['Kode OTP tidak valid. Minta kode baru.'],
            ]);
        }

        if ($otp->expires_at->isPast()) {
            throw ValidationException::withMessages([
                'code' => ['Kode OTP sudah kedaluwarsa. Minta kode baru.'],
            ]);
        }

        if ($otp->attempts >= self::OTP_MAX_ATTEMPTS) {
            throw ValidationException::withMessages([
                'code' => ['Terlalu banyak percobaan. Minta kode baru.'],
            ]);
        }

        if (! Hash::check($data['code'], $otp->code_hash)) {
            $otp->increment('attempts');

            throw ValidationException::withMessages([
                'code' => ['Kode OTP salah.'],
            ]);
        }

        if (($user->account_status ?: 'active') !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Akun ini dinonaktifkan. Hubungi admin kampus.'],
            ]);
        }

        $user->password = $data['password'];
        $user->save();

        $otp->delete();
        $user->tokens()->delete();

        return response()->json([
            'message' => 'Kata sandi berhasil diperbarui. Silakan masuk.',
        ]);
    }

    public function me(Request $request)
    {
        return response()->json([
            'user' => $request->user()->load('university')->toApiArray(),
        ]);
    }

    public function updateMe(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'faculty' => ['nullable', 'string', 'max:190'],
            'whatsapp' => ['nullable', 'string', 'max:30'],
            'study_program' => ['nullable', 'string', 'max:190'],
            'organization_id' => ['nullable', 'integer', 'exists:organizations,id'],
        ]);

        if (array_key_exists('name', $data)) {
            $user->name = trim($data['name']);
            $user->avatar = collect(explode(' ', $user->name))
                ->map(fn ($p) => mb_substr($p, 0, 1))
                ->take(2)
                ->implode('');
        }

        if (array_key_exists('faculty', $data)) {
            $user->faculty = $data['faculty'] ? trim($data['faculty']) : null;
        }

        if (array_key_exists('whatsapp', $data)) {
            $user->whatsapp = $data['whatsapp'] ? trim($data['whatsapp']) : null;
        }

        if (array_key_exists('study_program', $data)) {
            $user->study_program = $data['study_program'] ? trim($data['study_program']) : null;
        }

        if (array_key_exists('organization_id', $data)) {
            $orgId = $data['organization_id'] ? (int) $data['organization_id'] : null;
            if ($orgId) {
                $org = \App\Models\Organization::query()->find($orgId);
                if ($org && $user->university_id && (int) $org->university_id !== (int) $user->university_id) {
                    abort(422, 'Organisasi bukan dari kampusmu');
                }
            }
            $user->organization_id = $orgId;
        }

        $user->save();

        return response()->json([
            'user' => $user->fresh()->load('university')->toApiArray(),
            'message' => 'Profil diperbarui',
        ]);
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'current_password' => ['required', 'string'],
            'password' => ['required', 'string', 'min:6', 'confirmed'],
        ]);

        $user = $request->user();

        if (! Hash::check($data['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Password lama tidak cocok.'],
            ]);
        }

        $user->password = $data['password'];
        $user->save();

        return response()->json(['message' => 'Password diganti']);
    }

    public function logout(Request $request)
    {
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Logged out']);
    }

    private function validateRegisterPayload(Request $request): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'regex:/^(?=.*[A-Za-z])(?=.*\d).+$/'],
            'university' => ['nullable', 'string', 'max:190'],
            'student_id' => ['required', 'string', 'max:64'],
            'faculty' => ['nullable', 'string', 'max:190'],
        ], [
            'password.regex' => 'Kata sandi harus mengandung huruf dan angka.',
            'student_id.required' => 'NIM wajib diisi.',
        ]);

        $data['email'] = strtolower(trim($data['email']));
        $data['student_id'] = trim($data['student_id']);

        return $data;
    }

    private function issueOtp(array $data): string
    {
        $code = (string) random_int(100000, 999999);

        RegistrationOtp::updateOrCreate(
            ['email' => $data['email']],
            [
                'code_hash' => Hash::make($code),
                'payload' => Crypt::encryptString(json_encode([
                    'name' => $data['name'],
                    'password' => $data['password'],
                    'university' => $data['university'] ?? null,
                    'student_id' => $data['student_id'] ?? null,
                    'faculty' => $data['faculty'] ?? null,
                ], JSON_THROW_ON_ERROR)),
                'attempts' => 0,
                'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
                'last_sent_at' => now(),
            ]
        );

        return $code;
    }

    private function issuePasswordResetOtp(string $email): string
    {
        $code = (string) random_int(100000, 999999);

        PasswordResetOtp::updateOrCreate(
            ['email' => $email],
            [
                'code_hash' => Hash::make($code),
                'attempts' => 0,
                'expires_at' => now()->addMinutes(self::OTP_TTL_MINUTES),
                'last_sent_at' => now(),
            ]
        );

        return $code;
    }

    private function sendOtpMail(string $email, string $name, string $code): void
    {
        try {
            Mail::to($email)->send(new RegisterOtpMail($code, $name));
        } catch (\Throwable $e) {
            report($e);
            throw ValidationException::withMessages([
                'email' => [
                    'Gagal mengirim email OTP. Periksa konfigurasi Gmail (MAIL_USERNAME / App Password) di .env.',
                ],
            ]);
        }
    }

    private function sendPasswordResetOtpMail(string $email, string $name, string $code): void
    {
        try {
            Mail::to($email)->send(new PasswordResetOtpMail($code, $name));
        } catch (\Throwable $e) {
            report($e);
            throw ValidationException::withMessages([
                'email' => [
                    'Gagal mengirim email OTP. Periksa konfigurasi Gmail (MAIL_USERNAME / App Password) di .env.',
                ],
            ]);
        }
    }

    private function resolveUniversity(?string $universityName): ?University
    {
        if (! empty($universityName)) {
            $name = trim($universityName);
            $university = University::where('name', $name)
                ->orWhere('code', strtoupper($name))
                ->first();

            if (! $university) {
                $base = strtoupper(preg_replace('/[^A-Za-z0-9]/', '', substr($name, 0, 12)) ?: 'CAMPUS');
                $code = $base;
                $i = 1;
                while (University::where('code', $code)->exists()) {
                    $code = $base.($i++);
                }

                $university = University::create([
                    'name' => $name,
                    'code' => $code,
                    'city' => null,
                    'status' => 'active',
                ]);
            }

            return $university;
        }

        return University::where('code', 'UNS')->first();
    }
}
