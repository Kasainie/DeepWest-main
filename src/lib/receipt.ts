export function generateReceiptHtml(order: any, company: any): string {
  const date = new Date(order.created_at);
  const paidDate = order.paid_at ? new Date(order.paid_at) : null;

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${order.payment_status === 'paid' ? 'Receipt' : 'Order Bill'} #${order.order_number}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Courier New', monospace; max-width: 320px; margin: 0 auto; padding: 20px; background: #fff; color: #000; }
    .header { text-align: center; border-bottom: 2px dashed #000; padding-bottom: 12px; margin-bottom: 12px; }
    .company-name { font-size: 18px; font-weight: bold; }
    .company-info { font-size: 10px; color: #666; margin-top: 4px; }
    .title { font-size: 14px; font-weight: bold; margin-top: 8px; }
    .meta { font-size: 11px; margin-top: 4px; }
    .items { margin: 12px 0; }
    .item { display: flex; justify-content: space-between; font-size: 12px; padding: 3px 0; }
    .item-name { flex: 1; }
    .item-qty { width: 30px; text-align: center; }
    .item-price { width: 60px; text-align: right; }
    .divider { border-top: 1px dashed #000; margin: 8px 0; }
    .totals { font-size: 12px; }
    .total-line { display: flex; justify-content: space-between; padding: 2px 0; }
    .total-final { font-size: 16px; font-weight: bold; border-top: 2px solid #000; padding-top: 6px; margin-top: 4px; }
    .footer { text-align: center; font-size: 10px; color: #666; margin-top: 16px; border-top: 2px dashed #000; padding-top: 12px; }
    .payment-badge { display: inline-block; background: ${order.payment_status === 'paid' ? '#22c55e' : '#f59e0b'}; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: bold; margin-top: 8px; }
    @media print { body { margin: 0; padding: 10px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company?.name || 'Restaurant'}</div>
    ${company?.address ? `<div class="company-info">${company.address}</div>` : ''}
    ${company?.phone ? `<div class="company-info">Tel: ${company.phone}</div>` : ''}
    ${company?.email ? `<div class="company-info">${company.email}</div>` : ''}
    <div class="title">${order.payment_status === 'paid' ? '*** RECEIPT ***' : '*** ORDER BILL ***'}</div>
    <div class="meta">Order #${order.order_number}</div>
    <div class="meta">${order.table_number ? `Table: ${order.table_number}` : ''}</div>
    <div class="meta">${date.toLocaleDateString()} ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
  </div>

  <div class="items">
    <div class="item" style="font-weight:bold;border-bottom:1px solid #000;padding-bottom:4px;">
      <span class="item-name">Item</span>
      <span class="item-qty">Qty</span>
      <span class="item-price">Price</span>
    </div>
    ${order.order_items.map((oi: any) => `
    <div class="item">
      <span class="item-name">${oi.name}</span>
      <span class="item-qty">${oi.quantity}</span>
      <span class="item-price">$${Number(oi.total_price).toFixed(2)}</span>
    </div>`).join('')}
  </div>

  <div class="divider"></div>
  <div class="totals">
    <div class="total-line">
      <span>Subtotal</span>
      <span>$${Number(order.subtotal).toFixed(2)}</span>
    </div>
    <div class="total-line">
      <span>Tax (10%)</span>
      <span>$${Number(order.tax).toFixed(2)}</span>
    </div>
    <div class="total-line total-final">
      <span>TOTAL</span>
      <span>$${Number(order.total).toFixed(2)}</span>
    </div>
  </div>

  ${order.payment_status === 'paid' ? `
  <div style="text-align:center;margin-top:12px;">
    <span class="payment-badge">PAID - ${(order.payment_method || 'cash').toUpperCase()}</span>
    ${paidDate ? `<div class="meta" style="margin-top:4px;">${paidDate.toLocaleDateString()} ${paidDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>` : ''}
  </div>` : `
  <div style="text-align:center;margin-top:12px;">
    <span class="payment-badge">UNPAID</span>
  </div>`}

  <div class="footer">
    <p>Thank you for dining with us!</p>
    <p style="margin-top:4px;">${company?.name || 'Restaurant'}</p>
  </div>
</body>
</html>`;

  return html;
}

export function generateReceipt(order: any, company: any): Blob {
  return new Blob([generateReceiptHtml(order, company)], { type: "text/html" });
}
