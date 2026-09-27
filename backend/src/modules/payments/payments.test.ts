import test from "node:test";
import assert from "node:assert";
import http from "node:http";
import app from "../../app";
import { prisma } from "../../utils/prisma";
import { generateSignature } from "./midtransClient";
import { PLATFORM_INTERNAL_API_KEY } from "../../config/midtrans";

function startServer(): Promise<{ server: http.Server; url: string }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as any;
      const url = `http://127.0.0.1:${address.port}`;
      resolve({ server, url });
    });
  });
}

test("Platform Centralized Payment Module Test Suite", async (t) => {
  const { server, url } = await startServer();

  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  const testOrderNumber = `TEST-ORD-${Date.now()}`;

  await t.test("POST /api/payments/charge without internal key returns 401", async () => {
    const res = await fetch(`${url}/api/payments/charge`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        appCode: "TICKETING",
        externalOrderId: testOrderNumber,
        orderNumber: testOrderNumber,
        grossAmount: 50000,
        paymentType: "qris",
      }),
    });

    assert.strictEqual(res.status, 401);
  });

  await t.test("POST /api/payments/charge with valid internal key initiates QRIS charge", async () => {
    const res = await fetch(`${url}/api/payments/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-platform-internal-key": PLATFORM_INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        appCode: "TICKETING",
        externalOrderId: testOrderNumber,
        orderNumber: testOrderNumber,
        grossAmount: 50000,
        paymentType: "qris",
        customer: {
          name: "Test Customer",
          email: "customer@planetcinema.com",
          phone: "08123456789",
        },
        itemDetails: [
          { id: "ITEM-1", name: "Movie Ticket (Seat A1)", price: 50000, quantity: 1 },
        ],
        splitItems: [
          { targetAppCode: "TICKETING", targetOrderId: testOrderNumber, amount: 50000 },
        ],
        expiryMinutes: 10,
      }),
    });

    assert.strictEqual(res.status, 201);
    const body: any = await res.json();
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.orderNumber, testOrderNumber);
    assert.strictEqual(body.data.status, "PENDING");
    assert.ok(body.data.qrUrl || body.data.qrString);

    // Verify in database
    const txRecord = await prisma.paymentTransaction.findFirst({
      where: { externalOrderId: testOrderNumber },
      include: { splitItems: true },
    });
    assert.ok(txRecord);
    assert.strictEqual(txRecord.appCode, "TICKETING");
    assert.strictEqual(txRecord.status, "PENDING");
    assert.strictEqual(txRecord.splitItems.length, 1);
  });

  await t.test("GET /api/payments/status/:identifier returns transaction status", async () => {
    const res = await fetch(`${url}/api/payments/status/${testOrderNumber}`);
    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.externalOrderId, testOrderNumber);
    assert.strictEqual(body.data.status, "PENDING");
  });

  await t.test("POST /api/payments/midtrans/webhook with invalid signature returns 401", async () => {
    const res = await fetch(`${url}/api/payments/midtrans/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: testOrderNumber,
        status_code: "200",
        gross_amount: "50000.00",
        signature_key: "invalid_signature_hash",
        transaction_id: `txn-test-${Date.now()}`,
        transaction_status: "settlement",
        payment_type: "qris",
      }),
    });

    assert.strictEqual(res.status, 401);

    // Verify webhook log recorded as invalid signature
    const log = await prisma.paymentWebhookLog.findFirst({
      where: { orderId: testOrderNumber, isSignatureValid: false },
    });
    assert.ok(log);
    assert.strictEqual(log.dispatchStatus, "FAILED");
  });

  await t.test("POST /api/payments/midtrans/webhook with valid signature processes settlement", async () => {
    const grossAmount = "50000.00";
    const statusCode = "200";
    const signatureKey = generateSignature(testOrderNumber, statusCode, grossAmount);

    const res = await fetch(`${url}/api/payments/midtrans/webhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order_id: testOrderNumber,
        status_code: statusCode,
        gross_amount: grossAmount,
        signature_key: signatureKey,
        transaction_id: `txn-midtrans-${Date.now()}`,
        transaction_status: "settlement",
        payment_type: "qris",
        fraud_status: "accept",
      }),
    });

    assert.strictEqual(res.status, 200);
    const body: any = await res.json();
    assert.strictEqual(body.status, "success");

    // Verify transaction status updated in DB
    const txRecord = await prisma.paymentTransaction.findFirst({
      where: { externalOrderId: testOrderNumber },
    });
    assert.ok(txRecord);
    assert.strictEqual(txRecord.status, "SETTLEMENT");
    assert.ok(txRecord.settledAt);
  });

  await t.test("POST /api/payments/charge supports multi-service Combo packages", async () => {
    const comboOrderNumber = `COMBO-ORD-${Date.now()}`;
    const res = await fetch(`${url}/api/payments/charge`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-platform-internal-key": PLATFORM_INTERNAL_API_KEY,
      },
      body: JSON.stringify({
        appCode: "COMBO",
        externalOrderId: comboOrderNumber,
        orderNumber: comboOrderNumber,
        grossAmount: 110000,
        paymentType: "qris",
        customer: {
          name: "Combo Buyer",
          email: "combo@planetcinema.com",
        },
        itemDetails: [
          { id: "TCK-1", name: "Movie Ticket (Seat B1)", price: 60000, quantity: 1 },
          { id: "FNB-1", name: "Large Popcorn Combo", price: 50000, quantity: 1 },
        ],
        splitItems: [
          { targetAppCode: "TICKETING", targetOrderId: `TCK-${comboOrderNumber}`, amount: 60000 },
          { targetAppCode: "CONCESSION", targetOrderId: `FNB-${comboOrderNumber}`, amount: 50000 },
        ],
        expiryMinutes: 10,
      }),
    });

    assert.strictEqual(res.status, 201);
    const body: any = await res.json();
    assert.strictEqual(body.status, "success");
    assert.strictEqual(body.data.appCode, "COMBO");

    const comboRecord = await prisma.paymentTransaction.findFirst({
      where: { externalOrderId: comboOrderNumber },
      include: { splitItems: true },
    });
    assert.ok(comboRecord);
    assert.strictEqual(comboRecord.splitItems.length, 2);
    assert.strictEqual(comboRecord.splitItems[0].targetAppCode, "TICKETING");
    assert.strictEqual(comboRecord.splitItems[1].targetAppCode, "CONCESSION");
  });
});
