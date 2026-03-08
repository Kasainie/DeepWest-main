import { format } from "date-fns";

/**
 * Convert an array of objects to a CSV string and trigger download.
 */
export function downloadCSV(
  data: Record<string, any>[],
  columns: { key: string; header: string }[],
  filename: string
) {
  if (data.length === 0) return;

  const header = columns.map((c) => `"${c.header}"`).join(",");
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const val = row[c.key];
        if (val == null) return '""';
        const str = String(val).replace(/"/g, '""');
        return `"${str}"`;
      })
      .join(",")
  );

  const csv = [header, ...rows].join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  triggerDownload(blob, `${filename}.csv`);
}

/**
 * Generate an HTML-based printable PDF report and open print dialog.
 */
export function downloadPDF(
  title: string,
  companyName: string,
  columns: { key: string; header: string }[],
  data: Record<string, any>[],
  summary?: { label: string; value: string }[]
) {
  const now = format(new Date(), "MMM d, yyyy HH:mm");

  const tableRows = data
    .map(
      (row) =>
        `<tr>${columns
          .map((c) => `<td>${row[c.key] ?? "—"}</td>`)
          .join("")}</tr>`
    )
    .join("");

  const summaryHtml = summary
    ? `<div class="summary">${summary
        .map((s) => `<div class="summary-item"><span>${s.label}</span><strong>${s.value}</strong></div>`)
        .join("")}</div>`
    : "";

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title} — ${companyName}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Segoe UI', system-ui, sans-serif; padding: 40px; color: #1a1a1a; max-width: 900px; margin: 0 auto; }
    .header { border-bottom: 3px solid #1a1a1a; padding-bottom: 16px; margin-bottom: 24px; }
    .company { font-size: 22px; font-weight: 700; }
    .title { font-size: 16px; color: #555; margin-top: 4px; }
    .meta { font-size: 11px; color: #888; margin-top: 4px; }
    .summary { display: flex; gap: 24px; margin-bottom: 24px; flex-wrap: wrap; }
    .summary-item { background: #f5f5f5; border-radius: 8px; padding: 12px 18px; min-width: 140px; }
    .summary-item span { display: block; font-size: 11px; color: #666; }
    .summary-item strong { font-size: 18px; display: block; margin-top: 2px; }
    table { width: 100%; border-collapse: collapse; font-size: 12px; }
    th { background: #f5f5f5; text-align: left; padding: 10px 12px; font-weight: 600; border-bottom: 2px solid #ddd; }
    td { padding: 8px 12px; border-bottom: 1px solid #eee; }
    tr:hover { background: #fafafa; }
    .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #ddd; font-size: 10px; color: #999; text-align: center; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company">${companyName}</div>
    <div class="title">${title}</div>
    <div class="meta">Generated: ${now}</div>
  </div>
  ${summaryHtml}
  <table>
    <thead><tr>${columns.map((c) => `<th>${c.header}</th>`).join("")}</tr></thead>
    <tbody>${tableRows}</tbody>
  </table>
  <div class="footer">
    <p>${companyName} &bull; ${title} &bull; ${now}</p>
    <p>${data.length} record${data.length !== 1 ? "s" : ""}</p>
  </div>
</body>
</html>`;

  const w = window.open("", "_blank", "width=900,height=700");
  if (!w) return;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 400);
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
