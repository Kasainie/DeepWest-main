export interface ConferenceReceiptData {
  event_name: string;
  organizer: string | null;
  room_name: string;
  attendees: number;
  event_date: string;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  amount: number;
  status: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

export function generateConferenceReceiptHtml(
  booking: ConferenceReceiptData,
  company: { name?: string; address?: string; phone?: string; email?: string; logo_url?: string } | null
): string {
  const now = new Date();
  const badgeColor = booking.status === "confirmed" ? "#3b82f6" : booking.status === "cancelled" ? "#ef4444" : "#f59e0b";
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Conference Receipt – ${booking.event_name}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; padding: 20px; background: #fff; color: #000; }
    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
    .company-name { font-size: 18px; font-weight: bold; }
    .company-info { font-size: 10px; color: #666; margin-top: 4px; }
    .title { font-size: 14px; font-weight: bold; margin-top: 8px; letter-spacing: 1px; }
    .meta { font-size: 11px; margin-top: 4px; }
    .section { margin: 12px 0; }
    .row { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
    .row-label { color: #666; }
    .row-value { font-weight: bold; text-align: right; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .total-line { display: flex; justify-content: space-between; font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 6px; margin-top: 4px; }
    .badge { display: inline-block; background: ${badgeColor}; color: white; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-top: 8px; text-transform: capitalize; }
    .footer { text-align: center; font-size: 10px; color: #666; margin-top: 16px; border-top: 2px dashed #000; padding-top: 12px; }
    @media print { body { margin: 0; padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    ${company?.logo_url ? `<img src="${company.logo_url}" alt="${company?.name || 'Logo'}" style="max-width:80px;max-height:80px;margin:0 auto 8px;display:block;border-radius:4px;">` : ""}
    <div class="company-name">${company?.name || "Company"}</div>
    ${company?.address ? `<div class="company-info">${company.address}</div>` : ""}
    ${company?.phone ? `<div class="company-info">Tel: ${company.phone}</div>` : ""}
    ${company?.email ? `<div class="company-info">${company.email}</div>` : ""}
    <div class="title">*** CONFERENCE RECEIPT ***</div>
    <div class="meta">${now.toLocaleDateString("en-KE")} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
  </div>

  <div class="section">
    <div class="row"><span class="row-label">Event</span><span class="row-value">${booking.event_name}</span></div>
    ${booking.organizer ? `<div class="row"><span class="row-label">Organizer</span><span class="row-value">${booking.organizer}</span></div>` : ""}
    <div class="row"><span class="row-label">Room</span><span class="row-value">${booking.room_name}</span></div>
    <div class="row"><span class="row-label">Attendees</span><span class="row-value">${booking.attendees}</span></div>
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="row"><span class="row-label">Date</span><span class="row-value">${formatDate(booking.event_date)}${booking.end_date && booking.end_date !== booking.event_date ? ` – ${formatDate(booking.end_date)}` : ""}</span></div>
    ${booking.start_time ? `<div class="row"><span class="row-label">Time</span><span class="row-value">${booking.start_time}${booking.end_time ? ` – ${booking.end_time}` : ""}</span></div>` : ""}
  </div>

  <div class="divider"></div>

  <div class="total-line">
    <span>TOTAL</span>
    <span>KSh ${Number(booking.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
  </div>

  <div style="text-align:center;margin-top:12px;">
    <span class="badge">${booking.status}</span>
  </div>

  <div class="footer">
    <p>Thank you for choosing our venue!</p>
    <p style="margin-top:4px;">${company?.name || "Company"}</p>
    <p style="margin-top:8px;font-size:9px;color:#999;">Powered by LKTECH</p>
  </div>
</body>
</html>`;
}

export function downloadConferenceReceipt(booking: ConferenceReceiptData, company: any): void {
  const html = generateConferenceReceiptHtml(booking, company);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `conference-receipt-${booking.event_name.replace(/\s+/g, "-").substring(0, 20)}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printConferenceReceipt(booking: ConferenceReceiptData, company: any): void {
  const html = generateConferenceReceiptHtml(booking, company);
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
