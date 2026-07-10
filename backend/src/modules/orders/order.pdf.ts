import PDFDocument from "pdfkit";
import type { orderRepository } from "./order.repository";

type Order = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

const PRIMARY = "#e5456d";
const INK = "#171717";
const MUTED = "#6b6b6b";

function taka(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  // pdfkit's default fonts don't include the ৳ glyph, so use "Tk".
  return `Tk ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function zoneLabel(zone: string) {
  return zone === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka";
}

/**
 * Streams a branded order-summary PDF for `order` into the response.
 * Generated server-side so it always matches the stored order.
 */
export function streamOrderPdf(order: Order, stream: NodeJS.WritableStream) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(stream);

  // Header / branding
  doc.fillColor(PRIMARY).fontSize(24).font("Helvetica-Bold").text("YugenBD");
  doc
    .fillColor(MUTED)
    .fontSize(10)
    .font("Helvetica")
    .text("Beauty & Personal Care - Cash on Delivery across Bangladesh");

  doc.moveDown(1);
  doc.moveTo(50, doc.y).lineTo(545, doc.y).strokeColor("#e7e7ea").stroke();
  doc.moveDown(1);

  // Order meta
  doc.fillColor(INK).fontSize(16).font("Helvetica-Bold").text("Order Summary");
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").fillColor(MUTED);
  doc.text(`Order ID: `, { continued: true }).fillColor(INK).text(order.id);
  doc
    .fillColor(MUTED)
    .text(`Date: `, { continued: true })
    .fillColor(INK)
    .text(new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }));
  doc
    .fillColor(MUTED)
    .text(`Status: `, { continued: true })
    .fillColor(INK)
    .text(order.status);

  doc.moveDown(1);

  // Customer
  doc.fillColor(INK).fontSize(13).font("Helvetica-Bold").text("Delivery To");
  doc.moveDown(0.3);
  doc.fontSize(10).font("Helvetica").fillColor(INK);
  doc.text(order.fullName);
  doc.text(order.phone);
  doc.text(order.address);
  doc
    .fillColor(MUTED)
    .text(`${zoneLabel(order.deliveryZone)} - ${order.deliveryEstimate}`);

  doc.moveDown(1);

  // Items table
  doc.fillColor(INK).fontSize(13).font("Helvetica-Bold").text("Items");
  doc.moveDown(0.5);

  const tableTop = doc.y;
  const cols = { title: 50, qty: 330, price: 400, total: 480 };
  doc.fontSize(10).font("Helvetica-Bold").fillColor(MUTED);
  doc.text("Product", cols.title, tableTop);
  doc.text("Qty", cols.qty, tableTop);
  doc.text("Price", cols.price, tableTop);
  doc.text("Total", cols.total, tableTop);
  doc.moveTo(50, doc.y + 4).lineTo(545, doc.y + 4).strokeColor("#e7e7ea").stroke();
  doc.moveDown(0.6);

  doc.font("Helvetica").fillColor(INK);
  for (const item of order.items) {
    const rowY = doc.y;
    const lineTotal = parseFloat(item.price) * item.quantity;
    let label = item.weightLabel ? `${item.title} (${item.weightLabel})` : item.title;
    if (item.isPreOrder) label += "  [PRE-ORDER]";
    doc.text(label, cols.title, rowY, { width: 260 });
    doc.text(String(item.quantity), cols.qty, rowY);
    doc.text(taka(item.price), cols.price, rowY);
    doc.text(taka(lineTotal), cols.total, rowY);
    doc.moveDown(0.5);
  }

  doc.moveTo(50, doc.y + 2).lineTo(545, doc.y + 2).strokeColor("#e7e7ea").stroke();
  doc.moveDown(0.8);

  // Totals (right aligned)
  const labelX = 360;
  const valueX = 480;
  const totalsRow = (label: string, value: string, bold = false) => {
    const y = doc.y;
    doc.font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(bold ? INK : MUTED);
    doc.text(label, labelX, y);
    doc.fillColor(INK).text(value, valueX, y);
    doc.moveDown(0.5);
  };
  totalsRow("Subtotal", taka(order.subtotal));
  totalsRow(`Delivery (${zoneLabel(order.deliveryZone)})`, taka(order.deliveryFee));
  totalsRow("Total", taka(order.total), true);

  doc.moveDown(1.5);

  // Payment note — depends on the method chosen at checkout.
  if (order.paymentMethod === "bkash") {
    doc
      .font("Helvetica-Bold")
      .fillColor(PRIMARY)
      .fontSize(11)
      .text("Payment: bKash (Send Money)", 50);
    doc.font("Helvetica").fillColor(MUTED).fontSize(9);
    doc
      .text(`Transaction ID: `, { continued: true })
      .fillColor(INK)
      .text(order.bkashTransactionId ?? "-");
    doc
      .fillColor(MUTED)
      .text(`Amount sent: `, { continued: true })
      .fillColor(INK)
      .text(order.bkashAmount != null ? taka(order.bkashAmount) : "-");
    doc
      .fillColor(MUTED)
      .text(`Payment status: `, { continued: true })
      .fillColor(INK)
      .text(order.paymentStatus);
  } else {
    doc
      .font("Helvetica-Bold")
      .fillColor(PRIMARY)
      .fontSize(11)
      .text("Payment: Cash on Delivery", 50);
    doc
      .font("Helvetica")
      .fillColor(MUTED)
      .fontSize(9)
      .text("Please keep the exact amount ready. We will call you to confirm before shipping.");
  }

  // Pre-order note when any line ships later.
  if (order.items.some((item) => item.isPreOrder)) {
    doc.moveDown(0.6);
    doc
      .font("Helvetica-Bold")
      .fillColor(INK)
      .fontSize(9)
      .text("Some items are pre-orders and will ship as soon as they are back in stock.");
  }

  doc.moveDown(2);
  doc
    .fontSize(8)
    .fillColor(MUTED)
    .text("Thank you for shopping with YugenBD.", 50, doc.y, { align: "center", width: 495 });

  doc.end();
}
