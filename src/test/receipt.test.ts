import { describe, it, expect } from "vitest";
import { generateReceipt, generateReceiptHtml } from "@/lib/receipt";

const mockOrder = {
  order_number: 42,
  created_at: "2026-03-08T07:06:11.687Z",
  paid_at: "2026-03-08T07:07:00.419Z",
  payment_status: "paid",
  payment_method: "cash",
  table_number: "T1",
  subtotal: 50,
  tax: 5,
  total: 55,
  order_items: [
    { name: "Maize", quantity: 1, total_price: 50 },
  ],
};

const mockCompany = {
  name: "Test Hotel",
  address: "123 Main St",
  phone: "+254700000000",
  email: "info@test.com",
};

describe("generateReceipt", () => {
  it("generates a receipt blob", () => {
    const blob = generateReceipt(mockOrder, mockCompany);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/html");
  });

  it("includes company info in paid receipt", () => {
    const html = generateReceiptHtml(mockOrder, mockCompany);
    expect(html).toContain("Test Hotel");
    expect(html).toContain("123 Main St");
    expect(html).toContain("+254700000000");
    expect(html).toContain("*** RECEIPT ***");
    expect(html).toContain("PAID");
  });

  it("generates a bill for unpaid orders", () => {
    const unpaidOrder = { ...mockOrder, payment_status: "unpaid", paid_at: null };
    const html = generateReceiptHtml(unpaidOrder, mockCompany);
    expect(html).toContain("*** ORDER BILL ***");
    expect(html).toContain("UNPAID");
  });

  it("includes order items and totals", () => {
    const html = generateReceiptHtml(mockOrder, mockCompany);
    expect(html).toContain("Maize");
    expect(html).toContain("$50.00");
    expect(html).toContain("$5.00");
    expect(html).toContain("$55.00");
  });

  it("includes order number and table", () => {
    const html = generateReceiptHtml(mockOrder, mockCompany);
    expect(html).toContain("Order #42");
    expect(html).toContain("Table: T1");
  });

  it("shows payment method on paid receipt", () => {
    const html = generateReceiptHtml(mockOrder, mockCompany);
    expect(html).toContain("CASH");
  });

  it("handles missing company gracefully", () => {
    const html = generateReceiptHtml(mockOrder, null);
    expect(html).toContain("Restaurant");
    expect(html).toContain("Order #42");
  });
});
