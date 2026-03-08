import { describe, it, expect } from "vitest";
import { generateReceipt } from "@/lib/receipt";

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
  it("generates a receipt blob for paid orders", () => {
    const blob = generateReceipt(mockOrder, mockCompany);
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("text/html");
  });

  it("includes company name in receipt", async () => {
    const blob = generateReceipt(mockOrder, mockCompany);
    const text = await blob.text();
    expect(text).toContain("Test Hotel");
    expect(text).toContain("123 Main St");
    expect(text).toContain("*** RECEIPT ***");
    expect(text).toContain("PAID");
  });

  it("generates a bill for unpaid orders", async () => {
    const unpaidOrder = { ...mockOrder, payment_status: "unpaid", paid_at: null };
    const blob = generateReceipt(unpaidOrder, mockCompany);
    const text = await blob.text();
    expect(text).toContain("*** ORDER BILL ***");
    expect(text).toContain("UNPAID");
  });

  it("includes order items and totals", async () => {
    const blob = generateReceipt(mockOrder, mockCompany);
    const text = await blob.text();
    expect(text).toContain("Maize");
    expect(text).toContain("$50.00");
    expect(text).toContain("$5.00");
    expect(text).toContain("$55.00");
  });

  it("includes order number and table", async () => {
    const blob = generateReceipt(mockOrder, mockCompany);
    const text = await blob.text();
    expect(text).toContain("Order #42");
    expect(text).toContain("Table: T1");
  });
});
