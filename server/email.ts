import { Resend } from 'resend';
import { Ride, Driver, CompanyBranding } from './db';

let resendInstance: Resend | null = null;

function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || !apiKey.trim()) {
    return null;
  }
  if (!resendInstance) {
    resendInstance = new Resend(apiKey.trim());
  }
  return resendInstance;
}

export interface EmailDispatchResult {
  attempted: number;
  sent: number;
  errors: string[];
  recipients: {
    email: string;
    role: 'driver' | 'passenger' | 'admin';
    success: boolean;
    error?: string;
  }[];
}

/**
 * Format human friendly date time string
 */
function formatEmailDate(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}

/**
 * Generate Driver Email HTML
 */
function buildDriverEmailHtml(params: {
  driverName: string;
  passengerName: string;
  reservationId: string;
  createdAt: string;
  driverUrl: string;
  companyName: string;
  vehicle?: string;
}): string {
  const { driverName, passengerName, reservationId, createdAt, driverUrl, companyName, vehicle } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Driver Dispatch - Reservation ${reservationId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #94a3b8; margin-bottom: 4px;">Chauffeur Fleet Dispatch</span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${companyName}</h1>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: #1e293b; color: #38bdf8; font-family: monospace; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid #334155;">${reservationId}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Hello <strong>${driverName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                You have been assigned to chauffeur the following ride. Please tap the button below to open your Driver Status Control Panel.
              </p>

              <!-- Ride Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Passenger</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${passengerName}</span>
                        </td>
                        <td style="padding-bottom: 12px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Reservation ID</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${reservationId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 4px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Assigned Date</span>
                          <span style="font-size: 13px; color: #334155;">${formatEmailDate(createdAt)}</span>
                        </td>
                        <td style="padding-top: 4px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Assigned Vehicle</span>
                          <span style="font-size: 13px; color: #334155;">${vehicle || 'Standard Luxury Fleet'}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary Action Button -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${driverUrl}" target="_blank" style="display: block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Open Driver Status Panel
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 11px; font-family: monospace; color: #0284c7; word-break: break-all;">
                <a href="${driverUrl}" style="color: #0284c7; text-decoration: underline;">${driverUrl}</a>
              </p>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  * Note: Use this link to advance ride milestones in real-time (Getting Ready, On The Way, Arrived, Passenger On Board, Drop Off, Done). Valid for 72 hours.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} ${companyName}. All rights reserved.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate Passenger Email HTML
 */
function buildPassengerEmailHtml(params: {
  passengerName: string;
  reservationId: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  passengerUrl: string;
  companyName: string;
  vehicle?: string;
}): string {
  const { passengerName, reservationId, driverName, driverPhone, createdAt, passengerUrl, companyName, vehicle } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Chauffeur Tracking Link - ${reservationId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #38bdf8; margin-bottom: 4px;">Live Chauffeur Tracking</span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${companyName}</h1>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: #1e293b; color: #ffffff; font-family: monospace; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid #334155;">${reservationId}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Dear <strong>${passengerName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Your chauffeur has been confirmed for reservation <strong>${reservationId}</strong>. You can follow your chauffeur's live progress and arrival in real time.
              </p>

              <!-- Chauffeur & Ride Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Assigned Chauffeur</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${driverName || 'Professional Chauffeur'}</span>
                        </td>
                        <td style="padding-bottom: 12px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Reservation ID</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${reservationId}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 4px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Vehicle</span>
                          <span style="font-size: 13px; color: #334155;">${vehicle || 'Executive Sedan'}</span>
                        </td>
                        <td style="padding-top: 4px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Driver Contact</span>
                          <span style="font-size: 13px; color: #334155;">${driverPhone || 'Available via live monitor'}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary Action Button -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${passengerUrl}" target="_blank" style="display: block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-align: center; box-shadow: 0 2px 4px rgba(2,132,199,0.2);">
                      Track Chauffeur Live
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Or copy and paste this link into your browser:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 11px; font-family: monospace; color: #0284c7; word-break: break-all;">
                <a href="${passengerUrl}" style="color: #0284c7; text-decoration: underline;">${passengerUrl}</a>
              </p>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  Live tracking shows exact arrival milestones including when your chauffeur is on the way and has arrived. No app installation required.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Thank you for choosing ${companyName}.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Generate Admin Email HTML
 */
function buildAdminEmailHtml(params: {
  passengerName: string;
  passengerEmail: string;
  reservationId: string;
  driverName?: string;
  driverPhone?: string;
  createdAt: string;
  adminUrl: string;
  companyName: string;
  vehicle?: string;
  additionalEmailsCount?: number;
}): string {
  const { 
    passengerName, passengerEmail, reservationId, 
    driverName, driverPhone, createdAt, adminUrl, 
    companyName, vehicle, additionalEmailsCount 
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Operations Monitor - Ride ${reservationId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 580px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #10b981; margin-bottom: 4px;">Admin Operations Notification</span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${companyName}</h1>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: #064e3b; color: #6ee7b7; font-family: monospace; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid #047857;">${reservationId}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                A fleet driver has been assigned to reservation <strong>${reservationId}</strong>. Tracking links have been dispatched to the assigned driver and passenger.
              </p>

              <!-- Assignment Overview Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Assigned Driver</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${driverName || 'Assigned'}</span>
                          ${driverPhone ? `<span style="font-size: 12px; color: #64748b; display: block;">${driverPhone}</span>` : ''}
                        </td>
                        <td style="padding-bottom: 12px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Passenger</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${passengerName}</span>
                          <span style="font-size: 12px; color: #64748b; display: block; font-family: monospace;">${passengerEmail}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 4px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Vehicle</span>
                          <span style="font-size: 13px; color: #334155;">${vehicle || 'Fleet Assigned'}</span>
                        </td>
                        <td style="padding-top: 4px;" width="50%">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Recipient Summary</span>
                          <span style="font-size: 13px; color: #334155;">Passenger ${additionalEmailsCount ? `(+${additionalEmailsCount} additional)` : ''}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary Action Button -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${adminUrl}" target="_blank" style="display: block; background-color: #0f172a; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-align: center; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                      Open Admin Realtime Monitor
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Or access the Admin Monitor directly:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 11px; font-family: monospace; color: #059669; word-break: break-all;">
                <a href="${adminUrl}" style="color: #059669; text-decoration: underline;">${adminUrl}</a>
              </p>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  * Admin links allow real-time monitoring of all timestamp milestones and full audit PDF download.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} ${companyName} Operations.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

/**
 * Dispatch tracking link emails via Resend strictly enforcing recipient routing rules.
 *
 * Rules:
 * - Driver Tracking Link -> ONLY Assigned Driver email
 * - Passenger Tracking Link -> Passenger Email + all Additional Passenger Emails
 * - Admin Tracking Link -> All Configured Admin Emails
 */
export async function dispatchRideTrackingEmails(params: {
  ride: Ride;
  driver?: Driver | null;
  adminEmails: string[];
  branding: CompanyBranding;
  baseUrl: string;
}): Promise<EmailDispatchResult> {
  const { ride, driver, adminEmails, branding, baseUrl } = params;

  const result: EmailDispatchResult = {
    attempted: 0,
    sent: 0,
    errors: [],
    recipients: []
  };

  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const driverUrl = `${cleanBaseUrl}/driver/${ride.tokens.driverToken}`;
  const passengerUrl = `${cleanBaseUrl}/passenger/${ride.tokens.passengerToken}`;
  const adminUrl = `${cleanBaseUrl}/track/${ride.tokens.adminToken}`;

  const companyName = branding.companyName || '95 Star Tracking';
  const fromEmail = process.env.RESEND_FROM_EMAIL || `${companyName} <onboarding@resend.dev>`;
  const resend = getResend();

  // 1. Resolve Driver Recipient
  const driverEmail = driver?.email?.trim() || undefined;

  // 2. Resolve Passenger Recipients (Main + Additional)
  const passengerRecipients: string[] = [];
  if (ride.passengerEmail && ride.passengerEmail.trim()) {
    passengerRecipients.push(ride.passengerEmail.trim().toLowerCase());
  }
  if (Array.isArray(ride.additionalPassengerEmails)) {
    for (const extra of ride.additionalPassengerEmails) {
      if (extra && extra.trim()) {
        const clean = extra.trim().toLowerCase();
        if (!passengerRecipients.includes(clean)) {
          passengerRecipients.push(clean);
        }
      }
    }
  }

  // 3. Resolve Admin Recipients
  const cleanAdminRecipients: string[] = [];
  if (Array.isArray(adminEmails)) {
    for (const adm of adminEmails) {
      if (adm && adm.trim()) {
        const clean = adm.trim().toLowerCase();
        if (!cleanAdminRecipients.includes(clean)) {
          cleanAdminRecipients.push(clean);
        }
      }
    }
  }

  console.log(`[Email Dispatch] Starting tracking email dispatch for Ride ${ride.reservationId}:`);
  console.log(`- Driver email: ${driverEmail || '(none)'}`);
  console.log(`- Passenger recipients (${passengerRecipients.length}): ${passengerRecipients.join(', ')}`);
  console.log(`- Admin recipients (${cleanAdminRecipients.length}): ${cleanAdminRecipients.join(', ')}`);

  // If Resend API key is not configured, record graceful simulation in server logs without failing
  if (!resend) {
    const warning = 'RESEND_API_KEY is not configured in server environment. Emails were simulated internally and not delivered to inboxes.';
    console.warn(`[Email Dispatch Warning] ${warning}`);
    result.errors.push(warning);

    if (driverEmail) {
      result.attempted++;
      result.recipients.push({ email: driverEmail, role: 'driver', success: false, error: 'RESEND_API_KEY not configured' });
    }
    for (const pEmail of passengerRecipients) {
      result.attempted++;
      result.recipients.push({ email: pEmail, role: 'passenger', success: false, error: 'RESEND_API_KEY not configured' });
    }
    for (const aEmail of cleanAdminRecipients) {
      result.attempted++;
      result.recipients.push({ email: aEmail, role: 'admin', success: false, error: 'RESEND_API_KEY not configured' });
    }

    return result;
  }

  // --- SEND DRIVER EMAIL ---
  if (driverEmail) {
    result.attempted++;
    try {
      const driverHtml = buildDriverEmailHtml({
        driverName: ride.driverName || driver?.name || 'Driver',
        passengerName: ride.passengerName,
        reservationId: ride.reservationId,
        createdAt: ride.createdAt,
        driverUrl,
        companyName,
        vehicle: driver?.vehicle
      });

      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: driverEmail,
        subject: `Assigned Ride Dispatch - ${ride.reservationId} (${ride.passengerName})`,
        html: driverHtml
      });

      if (error) {
        console.error(`[Email Dispatch] Failed to send driver email to ${driverEmail}:`, error);
        result.errors.push(`Driver (${driverEmail}): ${error.message}`);
        result.recipients.push({ email: driverEmail, role: 'driver', success: false, error: error.message });
      } else {
        console.log(`[Email Dispatch] Driver email sent to ${driverEmail} (id: ${data?.id})`);
        result.sent++;
        result.recipients.push({ email: driverEmail, role: 'driver', success: true });
      }
    } catch (err: any) {
      console.error(`[Email Dispatch] Exception sending driver email to ${driverEmail}:`, err);
      result.errors.push(`Driver (${driverEmail}): ${err.message}`);
      result.recipients.push({ email: driverEmail, role: 'driver', success: false, error: err.message });
    }
  }

  // --- SEND PASSENGER EMAILS ---
  const passengerHtml = buildPassengerEmailHtml({
    passengerName: ride.passengerName,
    reservationId: ride.reservationId,
    driverName: ride.driverName || driver?.name,
    driverPhone: ride.driverPhone || driver?.phone,
    createdAt: ride.createdAt,
    passengerUrl,
    companyName,
    vehicle: driver?.vehicle
  });

  for (const pEmail of passengerRecipients) {
    result.attempted++;
    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: pEmail,
        subject: `Your Chauffeur Live Tracking - Reservation ${ride.reservationId}`,
        html: passengerHtml
      });

      if (error) {
        console.error(`[Email Dispatch] Failed to send passenger email to ${pEmail}:`, error);
        result.errors.push(`Passenger (${pEmail}): ${error.message}`);
        result.recipients.push({ email: pEmail, role: 'passenger', success: false, error: error.message });
      } else {
        console.log(`[Email Dispatch] Passenger email sent to ${pEmail} (id: ${data?.id})`);
        result.sent++;
        result.recipients.push({ email: pEmail, role: 'passenger', success: true });
      }
    } catch (err: any) {
      console.error(`[Email Dispatch] Exception sending passenger email to ${pEmail}:`, err);
      result.errors.push(`Passenger (${pEmail}): ${err.message}`);
      result.recipients.push({ email: pEmail, role: 'passenger', success: false, error: err.message });
    }
  }

  // --- SEND ADMIN EMAILS ---
  const adminHtml = buildAdminEmailHtml({
    passengerName: ride.passengerName,
    passengerEmail: ride.passengerEmail,
    reservationId: ride.reservationId,
    driverName: ride.driverName || driver?.name,
    driverPhone: ride.driverPhone || driver?.phone,
    createdAt: ride.createdAt,
    adminUrl,
    companyName,
    vehicle: driver?.vehicle,
    additionalEmailsCount: ride.additionalPassengerEmails?.length || 0
  });

  for (const aEmail of cleanAdminRecipients) {
    result.attempted++;
    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: aEmail,
        subject: `[Admin Monitor] Driver Assigned - ${ride.reservationId} (${ride.passengerName})`,
        html: adminHtml
      });

      if (error) {
        console.error(`[Email Dispatch] Failed to send admin email to ${aEmail}:`, error);
        result.errors.push(`Admin (${aEmail}): ${error.message}`);
        result.recipients.push({ email: aEmail, role: 'admin', success: false, error: error.message });
      } else {
        console.log(`[Email Dispatch] Admin email sent to ${aEmail} (id: ${data?.id})`);
        result.sent++;
        result.recipients.push({ email: aEmail, role: 'admin', success: true });
      }
    } catch (err: any) {
      console.error(`[Email Dispatch] Exception sending admin email to ${aEmail}:`, err);
      result.errors.push(`Admin (${aEmail}): ${err.message}`);
      result.recipients.push({ email: aEmail, role: 'admin', success: false, error: err.message });
    }
  }

  return result;
}

export function getEmailServiceStatus() {
  const apiKey = process.env.RESEND_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);
  const fromEmail = process.env.RESEND_FROM_EMAIL || 'Default Sender (onboarding@resend.dev)';

  return {
    isConfigured,
    fromEmail,
    mode: isConfigured ? 'live_resend' : 'preview_simulation'
  };
}

export async function sendTestEmail(params: {
  targetEmail: string;
  templateType: 'driver' | 'passenger' | 'admin';
  branding: CompanyBranding;
  baseUrl: string;
}): Promise<{
  success: boolean;
  message: string;
  templateType: string;
  targetEmail: string;
  mode: string;
  previewHtml: string;
  error?: string;
}> {
  const { targetEmail, templateType, branding, baseUrl } = params;
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const companyName = branding.companyName || '95 Star Tracking';
  const fromEmail = process.env.RESEND_FROM_EMAIL || `${companyName} <onboarding@resend.dev>`;
  const resend = getResend();

  const sampleRide = {
    reservationId: 'TEST-9501',
    passengerName: 'Alex Morgan (Test)',
    passengerEmail: targetEmail,
    createdAt: new Date().toISOString(),
    driverName: 'Marcus Vance (Test Chauffeur)',
    driverPhone: '+1 (555) 019-2834',
    vehicle: 'Mercedes-Benz S-Class (Black)'
  };

  const driverUrl = `${cleanBaseUrl}/driver/demo_test_driver_token`;
  const passengerUrl = `${cleanBaseUrl}/passenger/demo_test_passenger_token`;
  const adminUrl = `${cleanBaseUrl}/track/demo_test_admin_token`;

  let subject = '';
  let html = '';

  if (templateType === 'driver') {
    subject = `[TEST] Assigned Ride Dispatch - ${sampleRide.reservationId} (${sampleRide.passengerName})`;
    html = buildDriverEmailHtml({
      driverName: sampleRide.driverName,
      passengerName: sampleRide.passengerName,
      reservationId: sampleRide.reservationId,
      createdAt: sampleRide.createdAt,
      driverUrl,
      companyName,
      vehicle: sampleRide.vehicle
    });
  } else if (templateType === 'passenger') {
    subject = `[TEST] Your Chauffeur Live Tracking - Reservation ${sampleRide.reservationId}`;
    html = buildPassengerEmailHtml({
      passengerName: sampleRide.passengerName,
      reservationId: sampleRide.reservationId,
      driverName: sampleRide.driverName,
      driverPhone: sampleRide.driverPhone,
      createdAt: sampleRide.createdAt,
      passengerUrl,
      companyName,
      vehicle: sampleRide.vehicle
    });
  } else {
    // admin
    subject = `[TEST Admin Monitor] Driver Assigned - ${sampleRide.reservationId} (${sampleRide.passengerName})`;
    html = buildAdminEmailHtml({
      passengerName: sampleRide.passengerName,
      passengerEmail: sampleRide.passengerEmail,
      reservationId: sampleRide.reservationId,
      driverName: sampleRide.driverName,
      driverPhone: sampleRide.driverPhone,
      createdAt: sampleRide.createdAt,
      adminUrl,
      companyName,
      vehicle: sampleRide.vehicle,
      additionalEmailsCount: 0
    });
  }

  if (!resend) {
    console.log(`[Test Email Simulation] Test email (${templateType}) simulated for ${targetEmail}`);
    return {
      success: false,
      message: `No email was delivered because RESEND_API_KEY is not configured in your server environment. To receive real emails in your inbox, add your RESEND_API_KEY to your environment variables. You can preview the generated HTML email below.`,
      templateType,
      targetEmail,
      mode: 'preview_simulation',
      previewHtml: html,
      error: 'Missing RESEND_API_KEY in environment'
    };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: targetEmail,
      subject,
      html
    });

    if (error) {
      console.error(`[Test Email] Error sending to ${targetEmail}:`, error);
      return {
        success: false,
        message: `Failed to deliver test email: ${error.message}`,
        templateType,
        targetEmail,
        mode: 'live_resend',
        previewHtml: html,
        error: error.message
      };
    }

    console.log(`[Test Email] Delivered successfully to ${targetEmail} (id: ${data?.id})`);
    return {
      success: true,
      message: `Test email (${templateType.toUpperCase()} template) successfully delivered to ${targetEmail}!`,
      templateType,
      targetEmail,
      mode: 'live_resend',
      previewHtml: html
    };
  } catch (err: any) {
    console.error(`[Test Email] Exception sending to ${targetEmail}:`, err);
    return {
      success: false,
      message: `Exception sending test email: ${err.message}`,
      templateType,
      targetEmail,
      mode: 'live_resend',
      previewHtml: html,
      error: err.message
    };
  }
}

