import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import JSZip from 'jszip';
import { Ride, STATUS_LABELS } from '../types';
import { getLogoDataUrl, getBrandInfo } from './logoData';

export function formatDateTime(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
}

export function formatTimeOnly(isoString?: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  } catch {
    return isoString;
  }
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

  let y = 44;

  // Reservation & Passenger Details Grid
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Reservation Details', 20, y);
  y += 6;

  const leftColX = 20;
  const rightColX = 110;

  doc.setFontSize(9);
  
  // Row 1
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
  y += 6;

  // Row 2
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Passenger Name:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.passengerName, leftColX + 32, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Assigned Driver:', rightColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.driverName || 'Unassigned', rightColX + 28, y);
  y += 6;

  // Row 3
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(71, 85, 105);
  doc.text('Passenger Email:', leftColX, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(15, 23, 42);
  doc.text(ride.passengerEmail, leftColX + 32, y);

  if (ride.driverPhone) {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Driver Contact:', rightColX, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    doc.text(ride.driverPhone, rightColX + 28, y);
  }
  y += 10;

  // Status Timeline Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('Status Progression & Server Timestamps', 20, y);
  y += 4;

  const tableData = (ride.events || []).map((evt, idx) => {
    const label = STATUS_LABELS[evt.status] || evt.status;
    const start = formatDateTime(evt.startedAt);

    return [
      String(idx + 1),
      label,
      start
    ];
  });

  if (tableData.length === 0) {
    tableData.push(['—', 'Created (Awaiting Driver)', formatDateTime(ride.createdAt)]);
  }

  autoTable(doc, {
    startY: y,
    head: [['#', 'Status Stage', 'Recorded Server Timestamp']],
    body: tableData,
    margin: { left: 20, right: 20 },
    theme: 'plain',
    styles: {
      fontSize: 9,
      textColor: [15, 23, 42],
      cellPadding: 4,
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
      0: { cellWidth: 14, halign: 'center' },
      1: { cellWidth: 70, fontStyle: 'bold' },
      2: { cellWidth: 86 }
    }
  });

  const finalY = (doc as any).lastAutoTable.finalY + 12;

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

    let y = 44;

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setFontSize(11);
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text('Reservation Details', 20, y);
    y += 6;

    const leftColX = 20;
    const rightColX = 110;

    combinedDoc.setFontSize(9);
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
    y += 6;

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Passenger Name:', leftColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.passengerName, leftColX + 32, y);

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Assigned Driver:', rightColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.driverName || 'Unassigned', rightColX + 28, y);
    y += 6;

    combinedDoc.setFont('helvetica', 'bold');
    combinedDoc.setTextColor(71, 85, 105);
    combinedDoc.text('Passenger Email:', leftColX, y);
    combinedDoc.setFont('helvetica', 'normal');
    combinedDoc.setTextColor(15, 23, 42);
    combinedDoc.text(ride.passengerEmail, leftColX + 32, y);

    if (ride.driverPhone) {
      combinedDoc.setFont('helvetica', 'bold');
      combinedDoc.setTextColor(71, 85, 105);
      combinedDoc.text('Driver Contact:', rightColX, y);
      combinedDoc.setFont('helvetica', 'normal');
      combinedDoc.setTextColor(15, 23, 42);
      combinedDoc.text(ride.driverPhone, rightColX + 28, y);
    }
    y += 10;

    const tableData = (ride.events || []).map((evt, idx) => {
      const label = STATUS_LABELS[evt.status] || evt.status;
      const start = formatDateTime(evt.startedAt);
      return [String(idx + 1), label, start];
    });

    if (tableData.length === 0) {
      tableData.push(['—', 'Created (Awaiting Driver)', formatDateTime(ride.createdAt)]);
    }

    autoTable(combinedDoc, {
      startY: y,
      head: [['#', 'Status Stage', 'Recorded Server Timestamp']],
      body: tableData,
      margin: { left: 20, right: 20 },
      theme: 'plain',
      styles: {
        fontSize: 9,
        textColor: [15, 23, 42],
        cellPadding: 4,
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
        0: { cellWidth: 14, halign: 'center' },
        1: { cellWidth: 70, fontStyle: 'bold' },
        2: { cellWidth: 86 }
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

