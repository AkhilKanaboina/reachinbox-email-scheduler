import nodemailer, { Transporter, SentMessageInfo } from 'nodemailer';
import { env } from '../config/env';

let transporter: Transporter | null = null;

/**
 * Returns a singleton Nodemailer transporter using Ethereal Email (fake SMTP).
 *
 * - If ETHEREAL_USER / ETHEREAL_PASS are set in .env, those credentials are used.
 * - Otherwise, a new Ethereal test account is automatically generated and logged.
 *
 * Preview sent emails at https://ethereal.email/messages
 */
export async function getMailer(): Promise<Transporter> {
  if (transporter) return transporter;

  if (env.ETHEREAL_USER && env.ETHEREAL_PASS) {
    transporter = nodemailer.createTransport({
      host: env.ETHEREAL_HOST,
      port: parseInt(env.ETHEREAL_PORT, 10),
      secure: false, // TLS upgrade via STARTTLS
      auth: {
        user: env.ETHEREAL_USER,
        pass: env.ETHEREAL_PASS,
      },
    });

    console.log(`📧 Mailer: using saved Ethereal account → ${env.ETHEREAL_USER}`);
  } else {
    // Auto-create a new Ethereal test account
    const testAccount = await nodemailer.createTestAccount();

    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('');
    console.log('📧 ─── Ethereal Test Account Created ─────────────────────────');
    console.log(`   User : ${testAccount.user}`);
    console.log(`   Pass : ${testAccount.pass}`);
    console.log('   View sent emails → https://ethereal.email/messages');
    console.log('   TIP  : Add these to backend/.env to reuse across restarts.');
    console.log('─────────────────────────────────────────────────────────────');
    console.log('');
  }

  // Verify connection
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified');
  } catch (err) {
    console.warn('⚠️  SMTP verify failed (may still work):', (err as Error).message);
  }

  return transporter;
}

/**
 * Returns the Ethereal preview URL for a sent message.
 * Returns false if not an Ethereal transport.
 */
export function getPreviewUrl(info: SentMessageInfo): string | false {
  return nodemailer.getTestMessageUrl(info);
}
