import { Resend } from 'resend';
import { Ride, Driver, CompanyBranding, Affiliate, EmailRecipientStatus } from './db';

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

export function getFromEmail(companyName: string = '95 Star Tracking'): string {
  if (process.env.EMAIL_FROM && process.env.EMAIL_FROM.trim()) {
    const custom = process.env.EMAIL_FROM.trim();
    if (custom.includes('<')) return custom;
    return `${companyName} <${custom}>`;
  }
  if (process.env.RESEND_FROM_EMAIL && process.env.RESEND_FROM_EMAIL.trim()) {
    const custom = process.env.RESEND_FROM_EMAIL.trim();
    if (custom.includes('<')) return custom;
    return `${companyName} <${custom}>`;
  }
  return `${companyName} <onboarding@resend.dev>`;
}

export interface EmailDispatchResult {
  attempted: number;
  sent: number;
  errors: string[];
  recipients: EmailRecipientStatus[];
}

/**
 * Format human-friendly date & time string in American timezone
 */
export function formatEmailDate(isoString: string, timeZone: string = process.env.APP_TIMEZONE || 'America/New_York'): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString('en-US', {
      timeZone,
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZoneName: 'short'
    });
  } catch {
    return isoString;
  }
}

/**
 * Format ride date & time if provided as separate fields
 */
function formatRideSchedule(ride: Ride): string {
  if (ride.rideDate || ride.rideTime) {
    return `${ride.rideDate || ''} ${ride.rideTime || ''}`.trim();
  }
  return formatEmailDate(ride.createdAt);
}

// ==============================================================================
// 1. ADMIN EMAIL TEMPLATE
// ==============================================================================
export function buildAdminEmailHtml(params: {
  passengerName: string;
  passengerEmail: string;
  reservationId: string;
  driverName?: string;
  driverPhone?: string;
  driverVehicle?: string;
  driverLicensePlate?: string;
  affiliateName?: string;
  affiliateCompany?: string;
  affiliateId?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  rideSchedule: string;
  currentStatus: string;
  createdAt: string;
  adminUrl: string;
  companyName: string;
  additionalEmailsCount?: number;
}): string {
  const { 
    passengerName, passengerEmail, reservationId, 
    driverName, driverPhone, driverVehicle, driverLicensePlate,
    affiliateName, affiliateCompany, affiliateId,
    pickupLocation, dropoffLocation, rideSchedule, currentStatus,
    createdAt, adminUrl, companyName, additionalEmailsCount 
  } = params;

  const hasAffiliate = Boolean(affiliateName || affiliateId);
  const affiliateDisplay = hasAffiliate 
    ? `${affiliateName || 'Affiliate'}${affiliateCompany ? ` (${affiliateCompany})` : ''}${affiliateId ? ` [ID: ${affiliateId}]` : ''}`
    : 'None (Direct In-House Booking)';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Notification - Reservation ${reservationId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 26px 32px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #10b981; margin-bottom: 4px;">Admin Operations Notification</span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${companyName}</h1>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: #1e293b; color: #38bdf8; font-family: monospace; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid #334155;">#${reservationId}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                A ride has been registered under Reservation <strong>#${reservationId}</strong>. Real-time operations monitoring and live telemetry are active.
              </p>

              <!-- Reservation & Passenger Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Passenger</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a; display: block;">${passengerName}</span>
                          <span style="font-size: 12px; color: #64748b; font-family: monospace;">${passengerEmail}</span>
                          ${additionalEmailsCount ? `<span style="font-size: 11px; color: #0284c7; display: block; margin-top: 2px;">+${additionalEmailsCount} additional passenger recipient(s)</span>` : ''}
                        </td>
                        <td style="padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Ride Status</span>
                          <span style="display: inline-block; font-size: 12px; font-weight: 700; text-transform: uppercase; background-color: #dbeafe; color: #1e40af; padding: 3px 8px; border-radius: 6px;">
                            ${currentStatus}
                          </span>
                          <span style="font-size: 11px; color: #64748b; display: block; margin-top: 4px;">Created: ${formatEmailDate(createdAt)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 6px; padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Schedule (Pickup Date & Time)</span>
                          <span style="font-size: 13px; font-weight: 600; color: #0f172a;">${rideSchedule}</span>
                        </td>
                        <td style="padding-top: 6px; padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Assigned Chauffeur</span>
                          <span style="font-size: 13px; font-weight: 600; color: #0f172a; display: block;">${driverName || 'Unassigned (Fleet Pending)'}</span>
                          ${driverPhone ? `<span style="font-size: 12px; color: #64748b;">${driverPhone}</span>` : ''}
                          ${driverVehicle ? `<span style="font-size: 11px; color: #475569; display: block;">${driverVehicle}${driverLicensePlate ? ` [${driverLicensePlate}]` : ''}</span>` : ''}
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 6px;" colspan="2" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Affiliate / Partner Details</span>
                          <span style="font-size: 13px; color: #334155;">${affiliateDisplay}</span>
                        </td>
                      </tr>
                      ${pickupLocation || dropoffLocation ? `
                      <tr>
                        <td style="padding-top: 10px;" colspan="2" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Route / Service Location</span>
                          <span style="font-size: 12px; color: #334155;">
                            ${pickupLocation ? `<strong>Pickup:</strong> ${pickupLocation}` : ''}
                            ${pickupLocation && dropoffLocation ? ' &nbsp;•&nbsp; ' : ''}
                            ${dropoffLocation ? `<strong>Drop-off:</strong> ${dropoffLocation}` : ''}
                          </span>
                        </td>
                      </tr>
                      ` : ''}
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

              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Or access the Admin Monitor URL directly:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 11px; font-family: monospace; color: #0284c7; word-break: break-all;">
                <a href="${adminUrl}" style="color: #0284c7; text-decoration: underline;">${adminUrl}</a>
              </p>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  * Admin links allow comprehensive timeline auditing, PDF export, driver reassignment, and status management. Do not share with customers or drivers.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                © ${new Date().getFullYear()} ${companyName} Operations. All rights reserved.
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

// ==============================================================================
// 2. CUSTOMER / PASSENGER EMAIL TEMPLATE
// ==============================================================================
export function buildCustomerEmailHtml(params: {
  customerName: string;
  reservationId: string;
  rideSchedule: string;
  driverName?: string;
  driverPhone?: string;
  vehicle?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  customerUrl: string;
  companyName: string;
}): string {
  const { 
    customerName, reservationId, rideSchedule, 
    driverName, driverPhone, vehicle, 
    pickupLocation, dropoffLocation, customerUrl, companyName 
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Chauffeur Live Tracking - Reservation ${reservationId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
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
                    <span style="display: inline-block; background-color: #1e293b; color: #ffffff; font-family: monospace; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid #334155;">#${reservationId}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Dear <strong>${customerName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Your luxury transportation reservation <strong>#${reservationId}</strong> is confirmed. You can follow your assigned chauffeur's live progress, arrival milestones, and journey in real time.
              </p>

              <!-- Ride Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Reservation ID</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a; font-family: monospace;">${reservationId}</span>
                        </td>
                        <td style="padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Scheduled Pickup</span>
                          <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${rideSchedule}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 4px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Assigned Chauffeur</span>
                          <span style="font-size: 13px; font-weight: 600; color: #0f172a; display: block;">${driverName || 'Professional Chauffeur'}</span>
                          ${driverPhone ? `<span style="font-size: 12px; color: #64748b;">${driverPhone}</span>` : ''}
                        </td>
                        <td style="padding-top: 4px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Vehicle</span>
                          <span style="font-size: 13px; color: #334155;">${vehicle || 'Executive Luxury Fleet'}</span>
                        </td>
                      </tr>
                      ${pickupLocation || dropoffLocation ? `
                      <tr>
                        <td style="padding-top: 12px;" colspan="2" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Service Location Details</span>
                          <span style="font-size: 12px; color: #334155;">
                            ${pickupLocation ? `<strong>Pickup:</strong> ${pickupLocation}` : ''}
                            ${pickupLocation && dropoffLocation ? ' &nbsp;•&nbsp; ' : ''}
                            ${dropoffLocation ? `<strong>Drop-off:</strong> ${dropoffLocation}` : ''}
                          </span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary Action Button -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${customerUrl}" target="_blank" style="display: block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-align: center; box-shadow: 0 2px 4px rgba(2,132,199,0.2);">
                      Track Chauffeur Live
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Or tap/paste this live tracking link into any browser:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 11px; font-family: monospace; color: #0284c7; word-break: break-all;">
                <a href="${customerUrl}" style="color: #0284c7; text-decoration: underline;">${customerUrl}</a>
              </p>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  Live tracking shows exact status milestones including when your chauffeur is on the way, has arrived at your pickup location, and trip completion. No app download is required.
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

// ==============================================================================
// 3. DRIVER EMAIL TEMPLATE
// ==============================================================================
export function buildDriverEmailHtml(params: {
  driverName: string;
  passengerName: string;
  passengerEmail?: string;
  reservationId: string;
  rideSchedule: string;
  driverUrl: string;
  companyName: string;
  vehicle?: string;
  licensePlate?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
}): string {
  const { 
    driverName, passengerName, passengerEmail, reservationId, 
    rideSchedule, driverUrl, companyName, vehicle, licensePlate,
    pickupLocation, dropoffLocation 
  } = params;

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
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
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
                    <span style="display: inline-block; background-color: #1e293b; color: #38bdf8; font-family: monospace; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid #334155;">#${reservationId}</span>
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
                You have been assigned to chauffeur reservation <strong>#${reservationId}</strong>. Please tap the button below to launch your dedicated Driver Status Control Panel.
              </p>

              <!-- Ride Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Passenger</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a; display: block;">${passengerName}</span>
                          ${passengerEmail ? `<span style="font-size: 11px; color: #64748b;">${passengerEmail}</span>` : ''}
                        </td>
                        <td style="padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Scheduled Pickup</span>
                          <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${rideSchedule}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 4px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Assigned Vehicle</span>
                          <span style="font-size: 13px; color: #334155; font-weight: 600;">${vehicle || 'Executive Luxury Fleet'}</span>
                          ${licensePlate ? `<span style="font-size: 11px; color: #64748b; display: block;">Plate: ${licensePlate}</span>` : ''}
                        </td>
                        <td style="padding-top: 4px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Reservation ID</span>
                          <span style="font-size: 13px; font-family: monospace; font-weight: 700; color: #0f172a;">${reservationId}</span>
                        </td>
                      </tr>
                      ${pickupLocation || dropoffLocation ? `
                      <tr>
                        <td style="padding-top: 12px;" colspan="2" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Route Location Details</span>
                          <span style="font-size: 12px; color: #334155;">
                            ${pickupLocation ? `<strong>Pickup:</strong> ${pickupLocation}` : ''}
                            ${pickupLocation && dropoffLocation ? ' &nbsp;•&nbsp; ' : ''}
                            ${dropoffLocation ? `<strong>Drop-off:</strong> ${dropoffLocation}` : ''}
                          </span>
                        </td>
                      </tr>
                      ` : ''}
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

              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Or copy and paste your driver link:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 11px; font-family: monospace; color: #0284c7; word-break: break-all;">
                <a href="${driverUrl}" style="color: #0284c7; text-decoration: underline;">${driverUrl}</a>
              </p>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  * Note: Use this link to advance ride milestones in real-time (Getting Ready, On The Way, Arrived, Passenger On Board, Drop Off, Done). Do not share your driver link with customers.
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

// ==============================================================================
// 4. AFFILIATE / PARTNER EMAIL TEMPLATE
// ==============================================================================
export function buildAffiliateEmailHtml(params: {
  affiliateName: string;
  passengerName: string;
  reservationId: string;
  rideSchedule: string;
  driverName?: string;
  driverVehicle?: string;
  pickupLocation?: string;
  dropoffLocation?: string;
  affiliateUrl: string;
  companyName: string;
}): string {
  const { 
    affiliateName, passengerName, reservationId, 
    rideSchedule, driverName, driverVehicle, 
    pickupLocation, dropoffLocation, affiliateUrl, companyName 
  } = params;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Affiliate Partner Confirmation - Reservation ${reservationId}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 16px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);">
          
          <!-- Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 28px 32px; text-align: left;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="display: inline-block; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.1em; color: #a855f7; margin-bottom: 4px;">Affiliate Partner Dispatch</span>
                    <h1 style="margin: 0; font-size: 20px; font-weight: 800; color: #ffffff; letter-spacing: -0.02em;">${companyName}</h1>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display: inline-block; background-color: #1e293b; color: #c084fc; font-family: monospace; font-size: 13px; font-weight: 700; padding: 6px 12px; border-radius: 8px; border: 1px solid #334155;">#${reservationId}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                Hello <strong>${affiliateName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #334155;">
                We have registered reservation <strong>#${reservationId}</strong> associated with your partner network. Your client's chauffeur ride is confirmed in our system.
              </p>

              <!-- Affiliate Ride Details Box -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f8fafc; border-radius: 12px; border: 1px solid #e2e8f0; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 20px;">
                    <table width="100%" border="0" cellpadding="0" cellspacing="0">
                      <tr>
                        <td style="padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Passenger / Client</span>
                          <span style="font-size: 14px; font-weight: 700; color: #0f172a;">${passengerName}</span>
                        </td>
                        <td style="padding-bottom: 12px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Scheduled Pickup</span>
                          <span style="font-size: 13px; font-weight: 700; color: #0f172a;">${rideSchedule}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding-top: 4px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Assigned Chauffeur</span>
                          <span style="font-size: 13px; font-weight: 600; color: #0f172a;">${driverName || 'Fleet Assigned'}</span>
                        </td>
                        <td style="padding-top: 4px;" width="50%" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Vehicle</span>
                          <span style="font-size: 13px; color: #334155;">${driverVehicle || 'Executive Luxury Fleet'}</span>
                        </td>
                      </tr>
                      ${pickupLocation || dropoffLocation ? `
                      <tr>
                        <td style="padding-top: 12px;" colspan="2" valign="top">
                          <span style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block; margin-bottom: 2px;">Route Location</span>
                          <span style="font-size: 12px; color: #334155;">
                            ${pickupLocation ? `<strong>Pickup:</strong> ${pickupLocation}` : ''}
                            ${pickupLocation && dropoffLocation ? ' &nbsp;•&nbsp; ' : ''}
                            ${dropoffLocation ? `<strong>Drop-off:</strong> ${dropoffLocation}` : ''}
                          </span>
                        </td>
                      </tr>
                      ` : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Primary Action Button -->
              <table width="100%" border="0" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td align="center">
                    <a href="${affiliateUrl}" target="_blank" style="display: block; background-color: #6b21a8; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 28px; border-radius: 10px; text-align: center; box-shadow: 0 2px 4px rgba(107,33,168,0.2);">
                      View Live Ride Tracking
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 0 0 6px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Or access the live monitor link:
              </p>
              <p style="margin: 0 0 20px 0; font-size: 11px; font-family: monospace; color: #7e22ce; word-break: break-all;">
                <a href="${affiliateUrl}" style="color: #7e22ce; text-decoration: underline;">${affiliateUrl}</a>
              </p>

              <div style="border-top: 1px solid #e2e8f0; padding-top: 16px;">
                <p style="margin: 0; font-size: 12px; color: #94a3b8; line-height: 1.5;">
                  * Partner tracking allows live arrival visibility for your client. Real-time updates occur automatically as our chauffeur advances ride milestones.
                </p>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                Thank you for partnering with ${companyName}.
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

// Backward-compatible alias
export const buildPassengerEmailHtml = buildCustomerEmailHtml;

// ==============================================================================
// 5. TRANSACTIONAL EMAIL DISPATCHER (AUTOMATIC ON RIDE CREATION OR DRIVER ASSIGNMENT)
// ==============================================================================
export interface DispatchTrackingEmailsParams {
  ride: Ride;
  driver?: Driver | null;
  affiliate?: Affiliate | null;
  adminEmails: string[];
  branding: CompanyBranding;
  baseUrl: string;
  toggles?: {
    admin: boolean;
    customer: boolean;
    driver: boolean;
    affiliate: boolean;
  };
  isInitialCreation?: boolean;
  onLogEntry?: (entry: {
    rideId: string;
    reservationId: string;
    recipientType: 'admin' | 'customer' | 'driver' | 'affiliate';
    recipientEmail: string;
    status: 'sent' | 'failed' | 'skipped';
    messageId?: string;
    error?: string;
  }) => void;
}

export async function dispatchRideTrackingEmails(params: DispatchTrackingEmailsParams): Promise<EmailDispatchResult> {
  const { 
    ride, driver, affiliate, adminEmails, branding, baseUrl, 
    toggles = { admin: true, customer: true, driver: true, affiliate: true },
    onLogEntry
  } = params;

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
  const fromEmail = getFromEmail(companyName);
  const resend = getResend();
  const scheduleFormatted = formatRideSchedule(ride);

  const logHelper = (entry: {
    recipientType: 'admin' | 'customer' | 'driver' | 'affiliate';
    recipientEmail: string;
    status: 'sent' | 'failed' | 'skipped';
    messageId?: string;
    error?: string;
  }) => {
    if (onLogEntry) {
      onLogEntry({
        rideId: ride.id,
        reservationId: ride.reservationId,
        ...entry
      });
    }
  };

  // Helper to check deduplication: has this email already been successfully sent for this ride recently?
  const isDuplicate = (email: string, role: string): boolean => {
    if (!ride.emailDispatchStatus || !Array.isArray(ride.emailDispatchStatus.recipients)) {
      return false;
    }
    const previous = ride.emailDispatchStatus.recipients.find(
      r => r.email.toLowerCase() === email.toLowerCase() && (r.role === role || (role === 'customer' && r.role === 'passenger'))
    );
    if (!previous || !previous.success) return false;
    const sentTime = new Date(ride.emailDispatchStatus.sentAt).getTime();
    const now = Date.now();
    // 5-minute deduplication window
    return (now - sentTime) < 5 * 60 * 1000;
  };

  console.log(`[Email Dispatch] Triggered for Ride #${ride.reservationId}:`, {
    toggles,
    resendConfigured: Boolean(resend),
    fromEmail
  });

  // ----------------------------------------------------------------------------
  // 1. ADMIN EMAIL NOTIFICATION
  // ----------------------------------------------------------------------------
  if (toggles.admin === false) {
    console.log(`[Email Dispatch] Admin email skipped: Toggle is OFF in settings.`);
    logHelper({
      recipientType: 'admin',
      recipientEmail: adminEmails[0] || process.env.ADMIN_EMAIL || 'admin',
      status: 'skipped',
      error: 'Admin email notifications disabled by settings'
    });
    result.recipients.push({
      email: adminEmails[0] || process.env.ADMIN_EMAIL || 'admin',
      role: 'admin',
      success: false,
      status: 'skipped',
      error: 'Admin email notifications disabled by settings'
    });
  } else {
    // Collect all admin recipients
    const adminRecipients: string[] = [];
    if (Array.isArray(adminEmails)) {
      for (const adm of adminEmails) {
        if (adm && adm.trim()) {
          const clean = adm.trim().toLowerCase();
          if (clean.includes('@') && !adminRecipients.includes(clean)) {
            adminRecipients.push(clean);
          }
        }
      }
    }
    if (adminRecipients.length === 0 && process.env.ADMIN_EMAIL && process.env.ADMIN_EMAIL.trim()) {
      const clean = process.env.ADMIN_EMAIL.trim().toLowerCase();
      if (clean.includes('@')) adminRecipients.push(clean);
    }

    if (adminRecipients.length === 0) {
      console.warn(`[Email Dispatch] No admin email address configured in database or environment.`);
      logHelper({
        recipientType: 'admin',
        recipientEmail: 'none',
        status: 'skipped',
        error: 'No admin email address configured'
      });
      result.recipients.push({
        email: 'none',
        role: 'admin',
        success: false,
        status: 'skipped',
        error: 'No admin email address configured'
      });
    } else {
      const adminHtml = buildAdminEmailHtml({
        passengerName: ride.passengerName,
        passengerEmail: ride.passengerEmail,
        reservationId: ride.reservationId,
        driverName: ride.driverName || driver?.name,
        driverPhone: ride.driverPhone || driver?.phone,
        driverVehicle: driver?.vehicle,
        driverLicensePlate: driver?.licensePlate,
        affiliateName: ride.affiliateName || affiliate?.name,
        affiliateCompany: affiliate?.company,
        affiliateId: ride.affiliateId || affiliate?.id,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        rideSchedule: scheduleFormatted,
        currentStatus: ride.currentStatus,
        createdAt: ride.createdAt,
        adminUrl,
        companyName,
        additionalEmailsCount: ride.additionalPassengerEmails?.length || 0
      });

      for (const aEmail of adminRecipients) {
        if (isDuplicate(aEmail, 'admin')) {
          console.log(`[Email Dispatch] Admin email skipped for ${aEmail}: Duplicate send prevented.`);
          logHelper({
            recipientType: 'admin',
            recipientEmail: aEmail,
            status: 'skipped',
            error: 'Duplicate email prevented (already sent for this ride recently)'
          });
          continue;
        }

        result.attempted++;

        if (!resend) {
          const warn = 'RESEND_API_KEY is not configured in server environment (simulated delivery).';
          console.warn(`[Email Dispatch] ${warn} Target: ${aEmail}`);
          result.errors.push(`Admin (${aEmail}): ${warn}`);
          result.recipients.push({
            email: aEmail,
            role: 'admin',
            success: false,
            status: 'skipped',
            error: warn
          });
          logHelper({
            recipientType: 'admin',
            recipientEmail: aEmail,
            status: 'skipped',
            error: warn
          });
        } else {
          try {
            const { data, error } = await resend.emails.send({
              from: fromEmail,
              to: aEmail,
              subject: `[${companyName}] Admin Notification - Ride #${ride.reservationId} (${ride.passengerName})`,
              html: adminHtml
            });

            if (error) {
              console.error(`[Email Dispatch] Failed to send admin email to ${aEmail}:`, error);
              result.errors.push(`Admin (${aEmail}): ${error.message}`);
              result.recipients.push({
                email: aEmail,
                role: 'admin',
                success: false,
                status: 'failed',
                error: error.message
              });
              logHelper({
                recipientType: 'admin',
                recipientEmail: aEmail,
                status: 'failed',
                error: error.message
              });
            } else {
              console.log(`[Email Dispatch] Admin email sent to ${aEmail} (Resend ID: ${data?.id})`);
              result.sent++;
              result.recipients.push({
                email: aEmail,
                role: 'admin',
                success: true,
                status: 'sent',
                messageId: data?.id
              });
              logHelper({
                recipientType: 'admin',
                recipientEmail: aEmail,
                status: 'sent',
                messageId: data?.id
              });
            }
          } catch (err: any) {
            console.error(`[Email Dispatch] Exception sending admin email to ${aEmail}:`, err);
            result.errors.push(`Admin (${aEmail}): ${err.message}`);
            result.recipients.push({
              email: aEmail,
              role: 'admin',
              success: false,
              status: 'failed',
              error: err.message
            });
            logHelper({
              recipientType: 'admin',
              recipientEmail: aEmail,
              status: 'failed',
              error: err.message
            });
          }
        }
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 2. CUSTOMER / PASSENGER EMAIL NOTIFICATION
  // ----------------------------------------------------------------------------
  if (toggles.customer === false) {
    console.log(`[Email Dispatch] Customer email skipped: Toggle is OFF in settings.`);
    logHelper({
      recipientType: 'customer',
      recipientEmail: ride.passengerEmail || 'customer',
      status: 'skipped',
      error: 'Customer email notifications disabled by settings'
    });
    result.recipients.push({
      email: ride.passengerEmail || 'customer',
      role: 'customer',
      success: false,
      status: 'skipped',
      error: 'Customer email notifications disabled by settings'
    });
  } else {
    const customerRecipients: string[] = [];
    if (ride.passengerEmail && ride.passengerEmail.trim()) {
      const clean = ride.passengerEmail.trim().toLowerCase();
      if (clean.includes('@') && clean.includes('.')) {
        customerRecipients.push(clean);
      }
    }
    if (Array.isArray(ride.additionalPassengerEmails)) {
      for (const extra of ride.additionalPassengerEmails) {
        if (extra && extra.trim()) {
          const clean = extra.trim().toLowerCase();
          if (clean.includes('@') && clean.includes('.') && !customerRecipients.includes(clean)) {
            customerRecipients.push(clean);
          }
        }
      }
    }

    if (customerRecipients.length === 0) {
      console.warn(`[Email Dispatch] Customer email address is missing or invalid for Ride #${ride.reservationId}.`);
      logHelper({
        recipientType: 'customer',
        recipientEmail: ride.passengerEmail || 'missing',
        status: 'skipped',
        error: 'Customer email address missing or invalid'
      });
      result.recipients.push({
        email: ride.passengerEmail || 'missing',
        role: 'customer',
        success: false,
        status: 'skipped',
        error: 'Customer email address missing or invalid'
      });
    } else {
      const customerHtml = buildCustomerEmailHtml({
        customerName: ride.passengerName,
        reservationId: ride.reservationId,
        rideSchedule: scheduleFormatted,
        driverName: ride.driverName || driver?.name,
        driverPhone: ride.driverPhone || driver?.phone,
        vehicle: driver?.vehicle,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        customerUrl: passengerUrl,
        companyName
      });

      for (const cEmail of customerRecipients) {
        if (isDuplicate(cEmail, 'customer')) {
          console.log(`[Email Dispatch] Customer email skipped for ${cEmail}: Duplicate send prevented.`);
          logHelper({
            recipientType: 'customer',
            recipientEmail: cEmail,
            status: 'skipped',
            error: 'Duplicate email prevented (already sent for this ride recently)'
          });
          continue;
        }

        result.attempted++;

        if (!resend) {
          const warn = 'RESEND_API_KEY is not configured in server environment (simulated delivery).';
          console.warn(`[Email Dispatch] ${warn} Target: ${cEmail}`);
          result.errors.push(`Customer (${cEmail}): ${warn}`);
          result.recipients.push({
            email: cEmail,
            role: 'customer',
            success: false,
            status: 'skipped',
            error: warn
          });
          logHelper({
            recipientType: 'customer',
            recipientEmail: cEmail,
            status: 'skipped',
            error: warn
          });
        } else {
          try {
            const { data, error } = await resend.emails.send({
              from: fromEmail,
              to: cEmail,
              subject: `Your Chauffeur Reservation & Live Tracking - #${ride.reservationId}`,
              html: customerHtml
            });

            if (error) {
              console.error(`[Email Dispatch] Failed to send customer email to ${cEmail}:`, error);
              result.errors.push(`Customer (${cEmail}): ${error.message}`);
              result.recipients.push({
                email: cEmail,
                role: 'customer',
                success: false,
                status: 'failed',
                error: error.message
              });
              logHelper({
                recipientType: 'customer',
                recipientEmail: cEmail,
                status: 'failed',
                error: error.message
              });
            } else {
              console.log(`[Email Dispatch] Customer email sent to ${cEmail} (Resend ID: ${data?.id})`);
              result.sent++;
              result.recipients.push({
                email: cEmail,
                role: 'customer',
                success: true,
                status: 'sent',
                messageId: data?.id
              });
              logHelper({
                recipientType: 'customer',
                recipientEmail: cEmail,
                status: 'sent',
                messageId: data?.id
              });
            }
          } catch (err: any) {
            console.error(`[Email Dispatch] Exception sending customer email to ${cEmail}:`, err);
            result.errors.push(`Customer (${cEmail}): ${err.message}`);
            result.recipients.push({
              email: cEmail,
              role: 'customer',
              success: false,
              status: 'failed',
              error: err.message
            });
            logHelper({
              recipientType: 'customer',
              recipientEmail: cEmail,
              status: 'failed',
              error: err.message
            });
          }
        }
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 3. DRIVER EMAIL NOTIFICATION
  // ----------------------------------------------------------------------------
  if (toggles.driver === false) {
    console.log(`[Email Dispatch] Driver email skipped: Toggle is OFF in settings.`);
    logHelper({
      recipientType: 'driver',
      recipientEmail: driver?.email || 'driver',
      status: 'skipped',
      error: 'Driver email notifications disabled by settings'
    });
    result.recipients.push({
      email: driver?.email || 'driver',
      role: 'driver',
      success: false,
      status: 'skipped',
      error: 'Driver email notifications disabled by settings'
    });
  } else if (!ride.driverId && !driver) {
    console.log(`[Email Dispatch] Driver email skipped: No driver assigned to Ride #${ride.reservationId}.`);
    logHelper({
      recipientType: 'driver',
      recipientEmail: 'none',
      status: 'skipped',
      error: 'No driver assigned to this ride'
    });
  } else {
    const driverEmail = driver?.email?.trim().toLowerCase();
    if (!driverEmail || !driverEmail.includes('@') || !driverEmail.includes('.')) {
      console.warn(`[Email Dispatch] Assigned driver (${ride.driverName || 'driver'}) has no valid email address.`);
      logHelper({
        recipientType: 'driver',
        recipientEmail: driverEmail || 'missing',
        status: 'skipped',
        error: 'Assigned driver has no valid email address'
      });
      result.recipients.push({
        email: driverEmail || 'missing',
        role: 'driver',
        success: false,
        status: 'skipped',
        error: 'Assigned driver has no valid email address'
      });
    } else if (isDuplicate(driverEmail, 'driver')) {
      console.log(`[Email Dispatch] Driver email skipped for ${driverEmail}: Duplicate send prevented.`);
      logHelper({
        recipientType: 'driver',
        recipientEmail: driverEmail,
        status: 'skipped',
        error: 'Duplicate email prevented (already sent for this ride recently)'
      });
    } else {
      result.attempted++;

      const driverHtml = buildDriverEmailHtml({
        driverName: ride.driverName || driver?.name || 'Driver',
        passengerName: ride.passengerName,
        passengerEmail: ride.passengerEmail,
        reservationId: ride.reservationId,
        rideSchedule: scheduleFormatted,
        driverUrl,
        companyName,
        vehicle: driver?.vehicle,
        licensePlate: driver?.licensePlate,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation
      });

      if (!resend) {
        const warn = 'RESEND_API_KEY is not configured in server environment (simulated delivery).';
        console.warn(`[Email Dispatch] ${warn} Target: ${driverEmail}`);
        result.errors.push(`Driver (${driverEmail}): ${warn}`);
        result.recipients.push({
          email: driverEmail,
          role: 'driver',
          success: false,
          status: 'skipped',
          error: warn
        });
        logHelper({
          recipientType: 'driver',
          recipientEmail: driverEmail,
          status: 'skipped',
          error: warn
        });
      } else {
        try {
          const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: driverEmail,
            subject: `Assigned Ride Dispatch - #${ride.reservationId} (${ride.passengerName})`,
            html: driverHtml
          });

          if (error) {
            console.error(`[Email Dispatch] Failed to send driver email to ${driverEmail}:`, error);
            result.errors.push(`Driver (${driverEmail}): ${error.message}`);
            result.recipients.push({
              email: driverEmail,
              role: 'driver',
              success: false,
              status: 'failed',
              error: error.message
            });
            logHelper({
              recipientType: 'driver',
              recipientEmail: driverEmail,
              status: 'failed',
              error: error.message
            });
          } else {
            console.log(`[Email Dispatch] Driver email sent to ${driverEmail} (Resend ID: ${data?.id})`);
            result.sent++;
            result.recipients.push({
              email: driverEmail,
              role: 'driver',
              success: true,
              status: 'sent',
              messageId: data?.id
            });
            logHelper({
              recipientType: 'driver',
              recipientEmail: driverEmail,
              status: 'sent',
              messageId: data?.id
            });
          }
        } catch (err: any) {
          console.error(`[Email Dispatch] Exception sending driver email to ${driverEmail}:`, err);
          result.errors.push(`Driver (${driverEmail}): ${err.message}`);
          result.recipients.push({
            email: driverEmail,
            role: 'driver',
            success: false,
            status: 'failed',
            error: err.message
          });
          logHelper({
            recipientType: 'driver',
            recipientEmail: driverEmail,
            status: 'failed',
            error: err.message
          });
        }
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 4. AFFILIATE / PARTNER EMAIL NOTIFICATION
  // ----------------------------------------------------------------------------
  const hasAffiliateAssigned = Boolean(ride.affiliateId || ride.affiliateName || affiliate);

  if (toggles.affiliate === false) {
    if (hasAffiliateAssigned) {
      console.log(`[Email Dispatch] Affiliate email skipped: Toggle is OFF in settings.`);
      logHelper({
        recipientType: 'affiliate',
        recipientEmail: ride.affiliateEmail || affiliate?.email || 'affiliate',
        status: 'skipped',
        error: 'Affiliate email notifications disabled by settings'
      });
      result.recipients.push({
        email: ride.affiliateEmail || affiliate?.email || 'affiliate',
        role: 'affiliate',
        success: false,
        status: 'skipped',
        error: 'Affiliate email notifications disabled by settings'
      });
    }
  } else if (!hasAffiliateAssigned) {
    // No affiliate assigned - intentionally do not send and do not clutter
    console.log(`[Email Dispatch] Affiliate email not needed: No affiliate partner assigned to Ride #${ride.reservationId}.`);
  } else {
    const affiliateEmail = (ride.affiliateEmail || affiliate?.email)?.trim().toLowerCase();
    const affName = ride.affiliateName || affiliate?.name || affiliate?.company || 'Partner Chauffeur Network';

    if (!affiliateEmail || !affiliateEmail.includes('@') || !affiliateEmail.includes('.')) {
      console.warn(`[Email Dispatch] Assigned affiliate (${affName}) has no valid email address.`);
      logHelper({
        recipientType: 'affiliate',
        recipientEmail: affiliateEmail || 'missing',
        status: 'skipped',
        error: `Affiliate partner "${affName}" has no valid email address configured`
      });
      result.recipients.push({
        email: affiliateEmail || 'missing',
        role: 'affiliate',
        success: false,
        status: 'skipped',
        error: `Affiliate partner "${affName}" has no valid email address configured`
      });
    } else if (isDuplicate(affiliateEmail, 'affiliate')) {
      console.log(`[Email Dispatch] Affiliate email skipped for ${affiliateEmail}: Duplicate send prevented.`);
      logHelper({
        recipientType: 'affiliate',
        recipientEmail: affiliateEmail,
        status: 'skipped',
        error: 'Duplicate email prevented (already sent for this ride recently)'
      });
    } else {
      result.attempted++;

      const affiliateHtml = buildAffiliateEmailHtml({
        affiliateName: affName,
        passengerName: ride.passengerName,
        reservationId: ride.reservationId,
        rideSchedule: scheduleFormatted,
        driverName: ride.driverName || driver?.name,
        driverVehicle: driver?.vehicle,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        affiliateUrl: passengerUrl,
        companyName
      });

      if (!resend) {
        const warn = 'RESEND_API_KEY is not configured in server environment (simulated delivery).';
        console.warn(`[Email Dispatch] ${warn} Target: ${affiliateEmail}`);
        result.errors.push(`Affiliate (${affiliateEmail}): ${warn}`);
        result.recipients.push({
          email: affiliateEmail,
          role: 'affiliate',
          success: false,
          status: 'skipped',
          error: warn
        });
        logHelper({
          recipientType: 'affiliate',
          recipientEmail: affiliateEmail,
          status: 'skipped',
          error: warn
        });
      } else {
        try {
          const { data, error } = await resend.emails.send({
            from: fromEmail,
            to: affiliateEmail,
            subject: `Affiliate Partner Confirmation - #${ride.reservationId} (${ride.passengerName})`,
            html: affiliateHtml
          });

          if (error) {
            console.error(`[Email Dispatch] Failed to send affiliate email to ${affiliateEmail}:`, error);
            result.errors.push(`Affiliate (${affiliateEmail}): ${error.message}`);
            result.recipients.push({
              email: affiliateEmail,
              role: 'affiliate',
              success: false,
              status: 'failed',
              error: error.message
            });
            logHelper({
              recipientType: 'affiliate',
              recipientEmail: affiliateEmail,
              status: 'failed',
              error: error.message
            });
          } else {
            console.log(`[Email Dispatch] Affiliate email sent to ${affiliateEmail} (Resend ID: ${data?.id})`);
            result.sent++;
            result.recipients.push({
              email: affiliateEmail,
              role: 'affiliate',
              success: true,
              status: 'sent',
              messageId: data?.id
            });
            logHelper({
              recipientType: 'affiliate',
              recipientEmail: affiliateEmail,
              status: 'sent',
              messageId: data?.id
            });
          }
        } catch (err: any) {
          console.error(`[Email Dispatch] Exception sending affiliate email to ${affiliateEmail}:`, err);
          result.errors.push(`Affiliate (${affiliateEmail}): ${err.message}`);
          result.recipients.push({
            email: affiliateEmail,
            role: 'affiliate',
            success: false,
            status: 'failed',
            error: err.message
          });
          logHelper({
            recipientType: 'affiliate',
            recipientEmail: affiliateEmail,
            status: 'failed',
            error: err.message
          });
        }
      }
    }
  }

  return result;
}

// Backward compatible alias
export const dispatchRideCreatedEmails = dispatchRideTrackingEmails;

// ==============================================================================
// 6. RESEND SERVICE STATUS
// ==============================================================================
export function getEmailServiceStatus() {
  const apiKey = process.env.RESEND_API_KEY;
  const isConfigured = Boolean(apiKey && apiKey.trim().length > 0);
  const fromEmail = getFromEmail();

  return {
    isConfigured,
    fromEmail,
    mode: isConfigured ? 'live_resend' : 'preview_simulation'
  };
}

// ==============================================================================
// 7. TEST EMAIL DISPATCH
// ==============================================================================
export async function sendTestEmail(params: {
  targetEmail: string;
  templateType: 'admin' | 'customer' | 'passenger' | 'driver' | 'affiliate';
  branding: CompanyBranding;
  baseUrl: string;
}): Promise<{
  success: boolean;
  message: string;
  templateType: string;
  targetEmail: string;
  mode: string;
  previewHtml: string;
  messageId?: string;
  error?: string;
}> {
  const { targetEmail, templateType, branding, baseUrl } = params;
  const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
  const companyName = branding.companyName || '95 Star Tracking';
  const fromEmail = getFromEmail(companyName);
  const resend = getResend();

  const sampleRide: Ride = {
    id: 'ride_test_sample',
    reservationId: 'TEST-9501',
    passengerName: 'Alex Morgan (VIP Test)',
    passengerEmail: targetEmail,
    currentStatus: 'created',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    rideDate: new Date().toISOString().split('T')[0],
    rideTime: '14:30',
    pickupLocation: 'JFK Airport Terminal 4, NY',
    dropoffLocation: 'The Plaza Hotel, 768 5th Ave, New York, NY',
    driverName: 'Marcus Vance (Senior Chauffeur)',
    driverPhone: '+1 (555) 019-2834',
    affiliateName: 'Royal Chauffeur Network',
    tokens: {
      driverToken: 'demo_test_driver_token',
      passengerToken: 'demo_test_passenger_token',
      adminToken: 'demo_test_admin_token',
      createdAt: new Date().toISOString()
    },
    events: []
  };

  const driverUrl = `${cleanBaseUrl}/driver/${sampleRide.tokens.driverToken}`;
  const passengerUrl = `${cleanBaseUrl}/passenger/${sampleRide.tokens.passengerToken}`;
  const adminUrl = `${cleanBaseUrl}/track/${sampleRide.tokens.adminToken}`;
  const scheduleFormatted = formatRideSchedule(sampleRide);

  let subject = '';
  let html = '';

  const normalizedType = templateType === 'passenger' ? 'customer' : templateType;

  if (normalizedType === 'driver') {
    subject = `[TEST] Assigned Ride Dispatch - #${sampleRide.reservationId} (${sampleRide.passengerName})`;
    html = buildDriverEmailHtml({
      driverName: sampleRide.driverName || 'Driver',
      passengerName: sampleRide.passengerName,
      passengerEmail: sampleRide.passengerEmail,
      reservationId: sampleRide.reservationId,
      rideSchedule: scheduleFormatted,
      driverUrl,
      companyName,
      vehicle: 'Mercedes-Benz S580 (Black)',
      licensePlate: '95STR-01',
      pickupLocation: sampleRide.pickupLocation,
      dropoffLocation: sampleRide.dropoffLocation
    });
  } else if (normalizedType === 'customer') {
    subject = `[TEST] Your Chauffeur Reservation & Live Tracking - #${sampleRide.reservationId}`;
    html = buildCustomerEmailHtml({
      customerName: sampleRide.passengerName,
      reservationId: sampleRide.reservationId,
      rideSchedule: scheduleFormatted,
      driverName: sampleRide.driverName,
      driverPhone: sampleRide.driverPhone,
      vehicle: 'Mercedes-Benz S580 (Black)',
      pickupLocation: sampleRide.pickupLocation,
      dropoffLocation: sampleRide.dropoffLocation,
      customerUrl: passengerUrl,
      companyName
    });
  } else if (normalizedType === 'affiliate') {
    subject = `[TEST] Affiliate Partner Confirmation - #${sampleRide.reservationId} (${sampleRide.passengerName})`;
    html = buildAffiliateEmailHtml({
      affiliateName: 'Royal Chauffeur Network',
      passengerName: sampleRide.passengerName,
      reservationId: sampleRide.reservationId,
      rideSchedule: scheduleFormatted,
      driverName: sampleRide.driverName,
      driverVehicle: 'Mercedes-Benz S580 (Black)',
      pickupLocation: sampleRide.pickupLocation,
      dropoffLocation: sampleRide.dropoffLocation,
      affiliateUrl: passengerUrl,
      companyName
    });
  } else {
    // Admin
    subject = `[TEST] Admin Notification - Ride #${sampleRide.reservationId} (${sampleRide.passengerName})`;
    html = buildAdminEmailHtml({
      passengerName: sampleRide.passengerName,
      passengerEmail: sampleRide.passengerEmail,
      reservationId: sampleRide.reservationId,
      driverName: sampleRide.driverName,
      driverPhone: sampleRide.driverPhone,
      driverVehicle: 'Mercedes-Benz S580 (Black)',
      driverLicensePlate: '95STR-01',
      affiliateName: 'Royal Chauffeur Network',
      affiliateCompany: 'Royal Global Chauffeurs LLC',
      affiliateId: 'AFF-1092',
      pickupLocation: sampleRide.pickupLocation,
      dropoffLocation: sampleRide.dropoffLocation,
      rideSchedule: scheduleFormatted,
      currentStatus: 'created',
      createdAt: sampleRide.createdAt,
      adminUrl,
      companyName,
      additionalEmailsCount: 0
    });
  }

  if (!resend) {
    console.log(`[Test Email Simulation] Test email (${normalizedType}) simulated for ${targetEmail}`);
    return {
      success: false,
      message: `No email was delivered because RESEND_API_KEY is not configured in your server environment. You can preview the generated HTML email below. To receive live emails in your inbox, set RESEND_API_KEY on Render or in .env.`,
      templateType: normalizedType,
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
        templateType: normalizedType,
        targetEmail,
        mode: 'live_resend',
        previewHtml: html,
        error: error.message
      };
    }

    console.log(`[Test Email] Delivered successfully to ${targetEmail} (id: ${data?.id})`);
    return {
      success: true,
      message: `Test email (${normalizedType.toUpperCase()} template) successfully delivered to ${targetEmail} via Resend! (Message ID: ${data?.id})`,
      templateType: normalizedType,
      targetEmail,
      mode: 'live_resend',
      previewHtml: html,
      messageId: data?.id
    };
  } catch (err: any) {
    console.error(`[Test Email] Exception sending to ${targetEmail}:`, err);
    return {
      success: false,
      message: `Exception sending test email: ${err.message}`,
      templateType: normalizedType,
      targetEmail,
      mode: 'live_resend',
      previewHtml: html,
      error: err.message
    };
  }
}
