export interface SaleReceiptData {
  sale_date: string;
  department: string;
  category: string;
  description: string | null;
  amount: number;
  payment_method: string;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-KE", { year: "numeric", month: "short", day: "numeric" });
}

export function generateSaleReceiptHtml(
  sale: SaleReceiptData,
  company: { name?: string; address?: string; phone?: string; email?: string } | null
): string {
  const now = new Date();
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Sale Receipt – ${sale.description || sale.category}</title>
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
    .badge { display: inline-block; background: #22c55e; color: white; padding: 2px 10px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-top: 8px; }
    .footer { text-align: center; font-size: 10px; color: #666; margin-top: 16px; border-top: 2px dashed #000; padding-top: 12px; }
    @media print { body { margin: 0; padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company?.name || "Company"}</div>
    ${company?.address ? `<div class="company-info">${company.address}</div>` : ""}
    ${company?.phone ? `<div class="company-info">Tel: ${company.phone}</div>` : ""}
    ${company?.email ? `<div class="company-info">${company.email}</div>` : ""}
    <div class="title">*** SALE RECEIPT ***</div>
    <div class="meta">${now.toLocaleDateString("en-KE")} ${now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
  </div>

  <div class="section">
    <div class="row"><span class="row-label">Date</span><span class="row-value">${formatDate(sale.sale_date)}</span></div>
    <div class="row"><span class="row-label">Department</span><span class="row-value" style="text-transform:capitalize">${sale.department}</span></div>
    <div class="row"><span class="row-label">Category</span><span class="row-value" style="text-transform:capitalize">${sale.category}</span></div>
    ${sale.description ? `<div class="row"><span class="row-label">Description</span><span class="row-value">${sale.description}</span></div>` : ""}
    <div class="row"><span class="row-label">Payment</span><span class="row-value" style="text-transform:capitalize">${sale.payment_method.replace("_", " ")}</span></div>
  </div>

  <div class="divider"></div>

  <div class="total-line">
    <span>TOTAL</span>
    <span>KSh ${Number(sale.amount).toLocaleString("en-KE", { minimumFractionDigits: 2 })}</span>
  </div>

  <div style="text-align:center;margin-top:12px;">
    <span class="badge">RECORDED</span>
  </div>

  <div class="footer">
    <p>Thank you for your business!</p>
    <p style="margin-top:4px;">${company?.name || "Company"}</p>
    <p style="margin-top:8px;font-size:9px;color:#999;">Powered by LKTECH</p>
  </div>
</body>
</html>`;
}

export function downloadSaleReceipt(sale: SaleReceiptData, company: any): void {
  const html = generateSaleReceiptHtml(sale, company);
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `sale-receipt-${sale.sale_date}-${sale.department}.html`;
  a.click();
  URL.revokeObjectURL(url);
}

export function printSaleReceipt(sale: SaleReceiptData, company: any): void {
  const html = generateSaleReceiptHtml(sale, company);
  const w = window.open("", "_blank", "width=400,height=600");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  w.print();
}
