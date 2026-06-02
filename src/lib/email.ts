import { Resend } from 'resend';
import fs from 'fs/promises';
import path from 'path';

export interface EmailLog {
  id: string;
  to: string;
  subject: string;
  html: string;
  photoUrl: string;
  voiceUrl?: string;
  message?: string;
  created_at: string;
}

const LOCAL_EMAILS_PATH = path.join(process.cwd(), 'src', 'data', 'local_emails.json');

const initLocalEmails = async () => {
  try {
    await fs.mkdir(path.dirname(LOCAL_EMAILS_PATH), { recursive: true });
    await fs.access(LOCAL_EMAILS_PATH);
  } catch {
    await fs.writeFile(LOCAL_EMAILS_PATH, JSON.stringify([], null, 2), 'utf-8');
  }
};

export const getLocalEmails = async (): Promise<EmailLog[]> => {
  await initLocalEmails();
  try {
    const data = await fs.readFile(LOCAL_EMAILS_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return [];
  }
};

export const writeLocalEmails = async (emails: EmailLog[]) => {
  await initLocalEmails();
  try {
    await fs.writeFile(LOCAL_EMAILS_PATH, JSON.stringify(emails, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing local email sandbox:', err);
  }
};

export const deleteLocalEmail = async (id: string): Promise<void> => {
  const emails = await getLocalEmails();
  const filtered = emails.filter((e) => e.id !== id);
  await writeLocalEmails(filtered);
};

export const clearLocalEmails = async (): Promise<void> => {
  await writeLocalEmails([]);
};

export const sendMemoryEmail = async (params: {
  to: string;
  photoUrl: string;
  voiceUrl?: string;
  message?: string;
  deliveryDate: string;
  createdDate: string;
}): Promise<{ success: boolean; error?: any }> => {
  const apiKey = process.env.RESEND_API_KEY;
  
  const formattedCreatedDate = new Date(params.createdDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  
  const formattedDeliveryDate = new Date(params.deliveryDate).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Retro Modern Dark Gradient HTML layout for the email
  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Dear Memory Time Capsule</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            background-color: #020617;
            color: #f8fafc;
            margin: 0;
            padding: 40px 10px;
          }
          .container {
            max-width: 580px;
            margin: 0 auto;
            background-color: #0f172a;
            border: 1px solid #1e293b;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.4);
          }
          .banner {
            background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #db2777 100%);
            padding: 30px 20px;
            text-align: center;
          }
          .banner-title {
            color: #ffffff;
            font-size: 26px;
            font-weight: 800;
            margin: 0;
            letter-spacing: -0.5px;
          }
          .banner-subtitle {
            color: #cbd5e1;
            font-size: 13px;
            margin: 6px 0 0 0;
            font-weight: 300;
          }
          .content {
            padding: 30px 20px;
          }
          .dates-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 24px;
            background-color: rgba(30, 41, 59, 0.5);
            border-radius: 12px;
            border: 1px solid #334155;
          }
          .date-col {
            width: 50%;
            padding: 12px 16px;
            text-align: center;
          }
          .date-label {
            font-size: 10px;
            color: #94a3b8;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 4px;
            font-weight: 600;
          }
          .date-value {
            font-size: 13px;
            color: #f1f5f9;
            font-weight: 500;
          }
          .photo-wrapper {
            text-align: center;
            margin-bottom: 24px;
            background-color: #020617;
            padding: 16px;
            border-radius: 16px;
            border: 1px solid #1e293b;
          }
          .photo-img {
            max-width: 100%;
            height: auto;
            border-radius: 8px;
            border: 2px solid #334155;
          }
          .message-wrapper {
            background-color: rgba(79, 70, 229, 0.08);
            border-left: 4px solid #6366f1;
            border-radius: 0 12px 12px 0;
            padding: 16px 20px;
            margin-bottom: 24px;
            color: #e2e8f0;
            font-size: 15px;
            line-height: 1.6;
          }
          .message-title {
            font-size: 11px;
            text-transform: uppercase;
            color: #818cf8;
            font-weight: 700;
            letter-spacing: 1px;
            margin-bottom: 6px;
          }
          .voice-wrapper {
            background: linear-gradient(135deg, rgba(124, 58, 237, 0.15) 0%, rgba(219, 39, 119, 0.15) 100%);
            border: 1px solid rgba(139, 92, 246, 0.3);
            border-radius: 16px;
            padding: 20px;
            margin-bottom: 24px;
            text-align: center;
          }
          .voice-title {
            font-weight: 700;
            color: #ec4899;
            font-size: 14px;
            margin-bottom: 6px;
          }
          .voice-text {
            font-size: 12px;
            color: #94a3b8;
            margin: 0 0 16px 0;
          }
          .voice-btn {
            display: inline-block;
            background: linear-gradient(95deg, #7c3aed 0%, #db2777 100%);
            color: #ffffff !important;
            text-decoration: none;
            padding: 10px 24px;
            border-radius: 30px;
            font-weight: 600;
            font-size: 13px;
            box-shadow: 0 4px 10px rgba(124, 58, 237, 0.3);
          }
          .footer {
            text-align: center;
            padding: 24px 20px;
            border-top: 1px solid #1e293b;
            font-size: 11px;
            color: #64748b;
            line-height: 1.6;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="banner">
            <h1 class="banner-title">Dear Memory</h1>
            <p class="banner-subtitle">Your Digital Memory Time Capsule</p>
          </div>

          <div class="content">
            <table class="dates-table">
              <tr>
                <td class="date-col" style="border-right: 1px solid #334155;">
                  <div class="date-label">Captured On</div>
                  <div class="date-value">${formattedCreatedDate}</div>
                </td>
                <td class="date-col">
                  <div class="date-label">Delivered On</div>
                  <div class="date-value">${formattedDeliveryDate}</div>
                </td>
              </tr>
            </table>

            <div class="photo-wrapper">
              <img class="photo-img" src="${params.photoUrl.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${params.photoUrl}` : params.photoUrl}" alt="Captured Memory Frame">
            </div>

            ${
              params.message
                ? `<div class="message-wrapper">
                    <div class="message-title">Message from the past:</div>
                    <div style="white-space: pre-wrap;">${params.message}</div>
                   </div>`
                : ''
            }

            ${
              params.voiceUrl
                ? `<div class="voice-wrapper">
                    <div class="voice-title">🎙️ Audio Note From The Past</div>
                    <p class="voice-text">Click the button below to listen to the audio message left for you.</p>
                    <a href="${params.voiceUrl.startsWith('/') ? `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}${params.voiceUrl}` : params.voiceUrl}" target="_blank" class="voice-btn">Play Voice Note</a>
                   </div>`
                : ''
            }
          </div>

          <div class="footer">
            <p>Sent with 💖 via Dear Memory</p>
            <p>You received this because a scheduled digital memory capsule was target-delivered to your email address. Do not reply to this email.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  if (apiKey) {
    try {
      const resend = new Resend(apiKey);
      const { data, error } = await resend.emails.send({
        from: 'Dear Memory <onboarding@resend.dev>',
        to: [params.to],
        subject: `⏰ A Time Capsule Message from ${formattedCreatedDate}`,
        html: html,
      });

      if (error) {
        console.error('Resend execution error:', error);
        return { success: false, error };
      }
      return { success: true };
    } catch (err) {
      console.error('Resend standard error:', err);
      return { success: false, error: err };
    }
  } else {
    // Sandbox logger
    const logEntry: EmailLog = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 9),
      to: params.to,
      subject: `⏰ A Time Capsule Message from ${formattedCreatedDate}`,
      html: html,
      photoUrl: params.photoUrl,
      voiceUrl: params.voiceUrl,
      message: params.message,
      created_at: new Date().toISOString(),
    };

    const localEmails = await getLocalEmails();
    localEmails.push(logEntry);
    await writeLocalEmails(localEmails);
    return { success: true };
  }
};
