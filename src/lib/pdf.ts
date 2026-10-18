import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { Ride, STATUS_LABELS, STATUS_SEQUENCE } from '../types';
import { getLogoDataUrl, getBrandInfo } from './logoData';
import { formatAmericanDateTime, formatAmericanTime } from './timezone';

export function buildRideTimelineTableData(ride: Ride): string[][] {
  const tableData: string[][] = [];

  // Row 1: Authoritative Creation Record
  tableData.push([
    '1',
    'Created (Initial Record)',
    formatDateTime(ride.createdAt),
    'Initial Record Created'
  ]);

  const isRideDone = ride.currentStatus === 'done';

  STATUS_SEQUENCE.forEach((statusKey, idx) => {
    const isDoneStage = statusKey === 'done';
    const event = (ride.events || []).find(e => e.status === statusKey);
    const recordedTimestamp = event?.startedAt || (isDoneStage && isRideDone && ride.completedAt ? ride.completedAt : undefined);

    let timestampText = 'Pending';
    let statusNoteText = 'Pending Progression';

    if (recordedTimestamp) {
      timestampText = formatDateTime(recordedTimestamp);
      if (event?.comment) {
        statusNoteText = `Note: ${event.comment}`;
      } else if (event?.endedAt && event.durationSeconds !== undefined && statusKey !== 'done') {
        statusNoteText = `Duration: ${formatDuration(event.durationSeconds)}`;
      } else if (isDoneStage) {
        statusNoteText = 'Ride Completed';
      } else {
        statusNoteText = 'Milestone Recorded';
      }
    } else if (isRideDone) {
      timestampText = 'Not recorded';
      statusNoteText = 'Not recorded in audit log';
    } else if (ride.currentStatus === statusKey) {
      timestampText = 'In Progress';
      statusNoteText = 'Active Stage Now';
    } else {
      timestampText = 'Pending';
      statusNoteText = 'Awaiting Progression';
    }

    tableData.push([
      String(idx + 2),
      STATUS_LABELS[statusKey],
      timestampText,
      statusNoteText
    ]);
  });

  return tableData;
}

export function formatDateTime(isoString?: string): string {
  return formatAmericanDateTime(isoString, { includeSeconds: true });
}

export function formatTimeOnly(isoString?: string): string {
  return formatAmericanTime(isoString, { includeTzAbbr: true });
}

export function formatDuration(seconds?: number): string {
  if (seconds === undefined || seconds === null) return '—';
  if (seconds === 0) return '0s';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

export function getTimeRemaining(_expiresAt?: string): { isExpired: boolean; text: string } {
  return { isExpired: false, text: 'Permanent Active Link' };
}

export function renderPdfHeader(doc: jsPDF, ride: Ride, logoDataUrl?: string, subheaderText: string = 'OFFICIAL RIDE & TIMESTAMP REPORT') {
  const pageWidth = doc.internal.pageSize.getWidth();
  const brand = getBrandInfo();
  const titleText = brand.companyName || '95 Star Tracking';
  const subtitleLine = brand.tagline ? `${brand.tagline.toUpperCase()} • ${subheaderText}` : subheaderText;
  let textStartX = 20;

  // Add the Company Logo with appropriate size (~20mm x 20.4mm)
  if (logoDataUrl) {
    try {
      doc.addImage(logoDataUrl, 'PNG', 20, 11, 20, 20.4);
      textStartX = 44;
    } catch {
      textStartX = 20;
    }
  }

  // Header / Brand Title on the right of the logo
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(titleText, textStartX, 20.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139); // slate-500
  doc.text(subtitleLine, textStartX, 26.5);

  // Status Badge in Top Right
  const statusLabel = STATUS_LABELS[ride.currentStatus] || ride.currentStatus;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(`Status: ${statusLabel.toUpperCase()}`, pageWidth - 20, 21, { align: 'right' });

  // Divider Line
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.line(20, 36, pageWidth - 20, 36);
}

export function generateSingleRidePdf(ride: Ride, logoDataUrl?: string): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Render Header with bigger logo on left and '95 Star Tracking' on right
  renderPdfHeader(doc, ride, logoDataUrl);

  let y = 43;

  // Reservation & Passenger Details Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Reservation & Dispatch Details', 20, y);
  y += 5.5;

  const leftColX = 20;
  const rightColX = 110;

  doc.setFontSize(8.5);
  
  // Row 1: Reservation ID & Created At
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Reservation ID:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.reservationId, leftColX + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Created At:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(formatDateTime(ride.createdAt), rightColX + 28, y);
  y += 5.5;

  // Row 2: Passenger Name & Completed At
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Passenger Name:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.passengerName, leftColX + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Completed At:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.completedAt ? formatDateTime(ride.completedAt) : (ride.currentStatus === 'done' ? 'Completed' : 'In Progress'), rightColX + 28, y);
  y += 5.5;

  // Row 3: Passenger Email & Assigned Driver
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Passenger Email:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.passengerEmail, leftColX + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Assigned Driver:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.driverName || 'Unassigned', rightColX + 28, y);
  y += 5.5;

  // Row 4: Ride Date & Time & Driver Contact
  const scheduleText = (ride.rideDate || ride.rideTime)
    ? `${ride.rideDate || ''} ${ride.rideTime || ''}`.trim()
    : 'Not specified';

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Ride Schedule:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(scheduleText, leftColX + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Driver Contact:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.driverPhone || '—', rightColX + 28, y);
  y += 5.5;

  // Row 5: Affiliate Info & Current Status
  const affiliateText = (ride.affiliateName || ride.affiliateId)
    ? `${ride.affiliateName || 'Affiliate'}${ride.affiliateId ? ` (ID: ${ride.affiliateId})` : ''}`
    : 'Not specified';

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Affiliate Info:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(affiliateText, leftColX + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Current Status:', rightColX, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(ride.currentStatus === 'done' ? 16 : 37, ride.currentStatus === 'done' ? 185 : 99, ride.currentStatus === 'done' ? 129 : 235);
  doc.text((STATUS_LABELS[ride.currentStatus] || ride.currentStatus).toUpperCase(), rightColX + 28, y);
  y += 9;

  // Status Timeline Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('Status Progression & Server Timestamps', 20, y);
  y += 4;

  const tableData = buildRideTimelineTableData(ride);

  autoTable(doc, {
    startY: y,
    head: [['#', 'Status Stage', 'Recorded Server Timestamp', 'Status & Duration Notes']],
    body: tableData,
    margin: { left: 20, right: 20 },
    theme: 'plain',
    styles: {
      fontSize: 8.5,
      textColor: [15, 23, 42],
      cellPadding: 3.5,
      lineColor: [226, 232, 240],
      lineWidth: 0.2
    },
    headStyles: {
      fillColor: [248, 250, 252],
      textColor: [51, 65, 85],
      fontStyle: 'bold',
      lineWidth: 0.4,
      lineColor: [203, 213, 225]
    },
    columnStyles: {
      0: { cellWidth: 10, halign: 'center' },
      1: { cellWidth: 48, fontStyle: 'bold' },
      2: { cellWidth: 58 },
      3: { cellWidth: 54 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 10;

  // Footer / Verification note
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.text(`Generated on ${formatDateTime(new Date().toISOString())} • 95 Star Tracking Official Audit Record`, 20, finalY);

  return doc;
}

export async function downloadSingleRidePdf(ride: Ride) {
  const logoDataUrl = await getLogoDataUrl();
  const doc = generateSingleRidePdf(ride, logoDataUrl);
  doc.save(`95-star-ride-${ride.reservationId}.pdf`);
}

export async function downloadBulkZip(rides: Ride[]) {
  const logoDataUrl = await getLogoDataUrl();
  const zip = new JSZip();

  rides.forEach(ride => {
    const doc = generateSingleRidePdf(ride, logoDataUrl);
    const pdfBlob = doc.output('blob');
    zip.file(`95-star-ride-${ride.reservationId}.pdf`, pdfBlob);
  });

  const content = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(content);
  const a = document.createElement('a');
  a.href = url;
  a.download = `95-star-rides-bulk-${new Date().toISOString().slice(0, 10)}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function downloadBulkCombinedPdf(rides: Ride[]) {
  const logoDataUrl = await getLogoDataUrl();
  const combinedDoc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  rides.forEach((ride, index) => {
    if (index > 0) {
      combinedDoc.addPage();
    }
    
    renderPdfHeader(combinedDoc, ride, logoDataUrl, `OFFICIAL RIDE REPORT (${index + 1} OF ${rides.length})`);

    let y = 43;

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setFontSize(10.5);
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text('Reservation & Dispatch Details', 20, y);
    y += 5.5;

    const leftColX = 20;
    const rightColX = 110;

    combinedDoc.setFontSize(8.5);
    
    // Row 1: Reservation ID & Created At
    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Reservation ID:', leftColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.reservationId, leftColX + 32, y);

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Created At:', rightColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(formatDateTime(ride.createdAt), rightColX + 28, y);
    y += 5.5;

    // Row 2: Passenger Name & Completed At
    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Passenger Name:', leftColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.passengerName, leftColX + 32, y);

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Completed At:', rightColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.completedAt ? formatDateTime(ride.completedAt) : (ride.currentStatus === 'done' ? 'Completed' : 'In Progress'), rightColX + 28, y);
    y += 5.5;

    // Row 3: Passenger Email & Assigned Driver
    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Passenger Email:', leftColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.passengerEmail, leftColX + 32, y);

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Assigned Driver:', rightColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.driverName || 'Unassigned', rightColX + 28, y);
    y += 5.5;

    // Row 4: Ride Date & Time & Driver Contact
    const scheduleText = (ride.rideDate || ride.rideTime)
      ? `${ride.rideDate || ''} ${ride.rideTime || ''}`.trim()
      : 'Not specified';

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Ride Schedule:', leftColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(scheduleText, leftColX + 32, y);

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Driver Contact:', rightColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.driverPhone || '—', rightColX + 28, y);
    y += 5.5;

    // Row 5: Affiliate Info & Current Status
    const affiliateText = (ride.affiliateName || ride.affiliateId)
      ? `${ride.affiliateName || 'Affiliate'}${ride.affiliateId ? ` (ID: ${ride.affiliateId})` : ''}`
      : 'Not specified';

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Affiliate Info:', leftColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(affiliateText, leftColX + 32, y);

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Current Status:', rightColX, y);
    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(ride.currentStatus === 'done' ? 16 : 37, ride.currentStatus === 'done' ? 185 : 99, ride.currentStatus === 'done' ? 129 : 235);
    combinedDoc.text((STATUS_LABELS[ride.currentStatus] || ride.currentStatus).toUpperCase(), rightColX + 28, y);
    y += 9;

    const tableData = buildRideTimelineTableData(ride);

    autoTable(combinedDoc, {
      startY: y,
      head: [['#', 'Status Stage', 'Recorded Server Timestamp', 'Status & Duration Notes']],
      body: tableData,
      margin: { left: 20, right: 20 },
      theme: 'plain',
      styles: {
        fontSize: 8.5,
        textColor: [15, 23, 42],
        cellPadding: 3.5,
        lineColor: [226, 232, 240],
        lineWidth: 0.2
      },
      headStyles: {
        fillColor: [248, 250, 252],
        textColor: [51, 65, 85],
        fontStyle: 'bold',
        lineWidth: 0.4,
        lineColor: [203, 213, 225]
      },
      columnStyles: {
        0: { cellWidth: 10, halign: 'center' },
        1: { cellWidth: 48, fontStyle: 'bold' },
        2: { cellWidth: 58 },
        3: { cellWidth: 54 }
      }
    });
  });

  combinedDoc.save(`95-star-all-rides-${new Date().toISOString().slice(0, 10)}.pdf`);
}

/**
 * Escape string for CSV format
 */
function escapeCsv(val: any): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Generate and download CSV for a single or bulk list of rides
 */
export function downloadBulkCsv(rides: Ride[], customFilename?: string) {
  const headers = [
    'Reservation ID',
    'Passenger Name',
    'Passenger Email',
    'Assigned Driver',
    'Driver Phone',
    'Current Status',
    'Status Label',
    'Created At',
    'Completed At',
    'Getting Ready Time',
    'On The Way Time',
    'Arrived Time',
    'Passenger On Board Time',
    'Drop Off Time',
    'Done Time'
  ];

  const rows = rides.map(ride => {
    const eventMap: Record<string, string> = {};
    (ride.events || []).forEach(e => {
      eventMap[e.status] = formatDateTime(e.startedAt);
    });

    const statusLabel = STATUS_LABELS[ride.currentStatus] || ride.currentStatus;

    return [
      escapeCsv(ride.reservationId),
      escapeCsv(ride.passengerName),
      escapeCsv(ride.passengerEmail),
      escapeCsv(ride.driverName || 'Unassigned'),
      escapeCsv(ride.driverPhone || '—'),
      escapeCsv(ride.currentStatus),
      escapeCsv(statusLabel),
      escapeCsv(formatDateTime(ride.createdAt)),
      escapeCsv(ride.completedAt ? formatDateTime(ride.completedAt) : '—'),
      escapeCsv(eventMap['getting_ready'] || '—'),
      escapeCsv(eventMap['on_the_way'] || '—'),
      escapeCsv(eventMap['arrived'] || '—'),
      escapeCsv(eventMap['passenger_on_board'] || '—'),
      escapeCsv(eventMap['drop_off'] || '—'),
      escapeCsv(eventMap['done'] || '—')
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const fname = customFilename || (rides.length === 1 
    ? `95-star-ride-${rides[0].reservationId}.csv` 
    : `95-star-rides-export-${new Date().toISOString().slice(0, 10)}.csv`);
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadSingleRideCsv(ride: Ride) {
  downloadBulkCsv([ride], `95-star-ride-${ride.reservationId}.csv`);
}

