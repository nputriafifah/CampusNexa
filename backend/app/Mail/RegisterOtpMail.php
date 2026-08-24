<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class RegisterOtpMail extends Mailable
{
    use Queueable, SerializesModels;

    public function __construct(
        public string $code,
        public string $name,
    ) {}

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Kode OTP pendaftaran CampusNexa',
        );
    }

    public function content(): Content
    {
        return new Content(
            htmlString: <<<HTML
<!DOCTYPE html>
<html lang="id">
<head><meta charset="utf-8"></head>
<body style="font-family: Georgia, serif; background:#eef3f0; padding:32px; color:#14201c;">
  <div style="max-width:480px; margin:0 auto; background:#fff; padding:28px 32px; border:1px solid #c9dbd3;">
    <p style="font-size:22px; font-weight:700; margin:0 0 8px; color:#0f5c4c;">CampusNexa</p>
    <p style="margin:0 0 20px; color:#5a6b64;">Halo {$this->name},</p>
    <p style="margin:0 0 12px;">Gunakan kode berikut untuk menyelesaikan pendaftaran:</p>
    <p style="font-size:32px; letter-spacing:8px; font-weight:700; margin:20px 0; color:#0f5c4c;">{$this->code}</p>
    <p style="margin:0 0 8px; color:#5a6b64; font-size:14px;">Kode berlaku 10 menit. Jangan bagikan ke siapa pun.</p>
    <p style="margin:24px 0 0; font-size:13px; color:#8a9a93;">Jika Anda tidak mendaftar di CampusNexa, abaikan email ini.</p>
  </div>
</body>
</html>
HTML
        );
    }
}
