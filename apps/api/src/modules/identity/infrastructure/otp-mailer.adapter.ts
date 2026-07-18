import { Injectable, Logger } from '@nestjs/common';
import nodemailer from 'nodemailer';
import { AppConfigService } from '../../../bootstrap/app-config.service';

@Injectable()
export class OtpMailerAdapter {
  private readonly logger = new Logger(OtpMailerAdapter.name);

  constructor(private readonly config: AppConfigService) {}

  get isConfigured(): boolean {
    return Boolean(this.config.resendApiKey) || this.config.smtpConfigured;
  }

  async sendLoginCode(email: string, code: string): Promise<void> {
    const subject = 'Your Nexiora login code';
    const text = [
      `Your Nexiora verification code is ${code}.`,
      '',
      'This code expires in 10 minutes.',
      'If you did not request this, you can ignore this email.',
    ].join('\n');
    const html = `
      <div style="font-family:Arial,sans-serif;line-height:1.5;color:#111">
        <p>Your Nexiora verification code is:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:6px">${code}</p>
        <p>This code expires in 10 minutes.</p>
        <p style="color:#666">If you did not request this, you can ignore this email.</p>
      </div>
    `;

    if (this.config.resendApiKey) {
      await this.sendWithResend(email, subject, text, html);
      return;
    }

    if (this.config.smtpConfigured && !this.isServerlessRuntime()) {
      await this.sendWithSmtp(email, subject, text, html);
      return;
    }

    if (this.config.smtpConfigured && this.isServerlessRuntime()) {
      throw new Error(
        'SMTP email is not available on Vercel. Set RESEND_API_KEY for production login codes.',
      );
    }

    throw new Error('No email provider configured');
  }

  private isServerlessRuntime(): boolean {
    return Boolean(process.env.VERCEL) || Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME);
  }

  private async sendWithResend(
    email: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const from = this.config.emailFrom || 'Nexiora AI <onboarding@resend.dev>';
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.config.resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to: [email], subject, text, html }),
      signal: AbortSignal.timeout(12_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      this.logger.error(`Resend failed: ${detail}`);
      throw new Error('Unable to send verification email');
    }
  }

  private async sendWithSmtp(
    email: string,
    subject: string,
    text: string,
    html: string,
  ): Promise<void> {
    const transporter = nodemailer.createTransport({
      host: this.config.smtpHost,
      port: this.config.smtpPort,
      secure: this.config.smtpSecure,
      connectionTimeout: 12_000,
      greetingTimeout: 12_000,
      socketTimeout: 20_000,
      auth: {
        user: this.config.smtpUser,
        pass: this.config.smtpPass,
      },
    });

    try {
      await Promise.race([
        transporter.sendMail({
          from: this.config.emailFrom || this.config.smtpUser,
          to: email,
          subject,
          text,
          html,
        }),
        new Promise((_, reject) => {
          setTimeout(() => reject(new Error('SMTP send timed out')), 15_000);
        }),
      ]);
    } finally {
      transporter.close();
    }
  }
}
