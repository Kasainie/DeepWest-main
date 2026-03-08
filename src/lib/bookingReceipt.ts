export interface BookingReceiptData {
  guest_name: string;
  room_number?: string;
  booking_type: string;
  details?: string;
  check_in?: string;
  check_out?: string;
  amount: number;
  status: string;
  created_at: string;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

function formatDateTime(dateStr: string): string {
  const d = new Date(dateStr);
  return `${d.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" })} ${d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`;
}

export function generateBookingReceiptHtml(
  booking: BookingReceiptData,
  company: { name?: string; address?: string; phone?: string; email?: string; logo_url?: string } | null,
  type: "check_in" | "check_out"
): string {
  const isCheckIn = type === "check_in";
  const title = isCheckIn ? "CHECK-IN RECEIPT" : "CHECK-OUT RECEIPT";
  const badgeColor = isCheckIn ? "#3b82f6" : "#22c55e";
  const now = new Date();

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} – ${booking.guest_name}</title>
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
    .badge { display: inline-block; background: ${badgeColor}; color: white; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-top: 8px; }
    .footer { text-align: center; font-size: 10px; color: #666; margin-top: 16px; border-top: 2px dashed #000; padding-top: 12px; }
    @media print { body { margin: 0; padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    ${company?.logo_url ? `<img src="${company.logo_url}" alt="${company?.name || 'Logo'}" style="max-width:80px;max-height:80px;margin:0 auto 8px;display:block;border-radius:4px;">` : ""}
    <div class="company-name">${company?.name || "Hotel"}</div>
    ${company?.address ? `<div class="company-info">${company.address}</div>` : ""}
    ${company?.phone ? `<div class="company-info">Tel: ${company.phone}</div>` : ""}
    ${company?.email ? `<div class="company-info">${company.email}</div>` : ""}
    <div class="title">*** ${title} ***</div>
    <div class="meta">${formatDateTime(now.toISOString())}</div>
  </div>

  <div class="section">
    <div class="row"><span class="row-label">Guest</span><span class="row-value">${booking.guest_name}</span></div>
    ${booking.room_number ? `<div class="row"><span class="row-label">Room</span><span class="row-value">${booking.room_number}</span></div>` : ""}
    <div class="row"><span class="row-label">Booking Type</span><span class="row-value" style="text-transform:capitalize">${booking.booking_type}</span></div>
    ${booking.details ? `<div class="row"><span class="row-label">Details</span><span class="row-value">${booking.details}</span></div>` : ""}
  </div>

  <div class="divider"></div>

  <div class="section">
    <div class="row"><span class="row-label">Check In</span><span class="row-value">${formatDate(booking.check_in)}</span></div>
    <div class="row"><span class="row-label">Check Out</span><span class="row-value">${formatDate(booking.check_out)}</span></div>
    ${!isCheckIn && booking.check_in && booking.check_out ? (() => {
      const nights = Math.max(1, Math.ceil((new Date(booking.check_out).getTime() - new Date(booking.check_in).getTime()) / (1000 * 60 * 60 * 24)));
      return `<div class="row"><span class="row-label">Duration</span><span class="row-value">${nights} night${nights !== 1 ? "s" : ""}</span></div>`;
    })() : ""}
  </div>

  <div class="divider"></div>

  <div class="total-line">
    <span>TOTAL</span>
    <span>KSh ${Number(booking.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
  </div>

  <div style="text-align:center;margin-top:12px;">
    <span class="badge">${isCheckIn ? "CHECKED IN" : "CHECKED OUT"}</span>
  </div>

  <div class="footer">
    <p>${isCheckIn ? "Welcome! Enjoy your stay." : "Thank you for staying with us!"}</p>
    <p style="margin-top:4px;">${company?.name || "Hotel"}</p>
    <p style="margin-top:8px;font-size:9px;color:#999;">Powered by LKTECH</p>
  </div>
</body>
</html>`;
}

export function printBookingReceipt(
  booking: BookingReceiptData,
  company: { name?: string; address?: string; phone?: string; email?: string; logo_url?: string } | null,
  type: "check_in" | "check_out"
): void {
  const html = generateBookingReceiptHtml(booking, company, type);
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}

export function downloadBookingReceipt(
  booking: BookingReceiptData,
  company: { name?: string; address?: string; phone?: string; email?: string; logo_url?: string } | null,
  type: "check_in" | "check_out"
): void {
  const html = generateBookingReceiptHtml(booking, company, type);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `booking-${type}-receipt-${booking.guest_name.replace(/\s+/g, "-")}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
