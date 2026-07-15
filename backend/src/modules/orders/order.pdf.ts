import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import type { orderRepository } from "./order.repository";

type Order = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

const PRIMARY = "#765341";
const INK = "#171717";
const MUTED = "#6b6b6b";
const BORDER = "#e7e7ea";

// Page content bounds (A4, 50pt margins → usable 50..545).
const LEFT = 50;
const RIGHT = 545;
const COL_GAP = 30;
const COL_WIDTH = (RIGHT - LEFT - COL_GAP) / 2;
const RIGHT_COL_X = LEFT + COL_WIDTH + COL_GAP;

// Logo lives in backend/assets — resolved from the process cwd (which is the
// backend/ dir both in dev via tsx and in prod via `node dist/server.js`).
const LOGO_PATH = path.join(process.cwd(), "assets", "logo.png");

const CLOSING_NOTE =
  "Thank you for shopping with YugenBD. Every product is authentically sourced " +
  "from Japan with care and intention. We hope these J-beauty essentials bring a " +
  "little more radiance to your everyday routine.";

function taka(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  // pdfkit's default fonts don't include the ৳ glyph, so use "Tk".
  return `Tk ${n.toLocaleString("en-US", { maximumFractionDigits: 0 })}`;
}

function zoneLabel(zone: string) {
  return zone === "inside_dhaka" ? "Inside Dhaka" : "Outside Dhaka";
}

function titleCase(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** Customer-facing order id: the first 8 chars of the UUID (see confirmation page). */
function shortId(id: string) {
  return id.slice(0, 8);
}

/** A muted "Label: value" line rendered at a fixed column x. */
function metaLine(doc: PDFKit.PDFDocument, label: string, value: string, x: number, width: number) {
  doc
    .fontSize(10)
    .font("Helvetica")
    .fillColor(MUTED)
    .text(`${label}: `, x, doc.y, { width, continued: true })
    .fillColor(INK)
    .text(value);
}

/**
 * Streams a branded order-summary PDF for `order` into the response.
 * Generated server-side so it always matches the stored order.
 */
export function streamOrderPdf(order: Order, stream: NodeJS.WritableStream) {
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  doc.pipe(stream);

  // ---- Header: logo top-left ----
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, LEFT, 45, { height: 46 });
  } else {
    doc.fillColor(PRIMARY).fontSize(24).font("Helvetica-Bold").text("YugenBD", LEFT, 50);
  }

  let y = 108;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(BORDER).stroke();
  y += 22;

  // ---- Two columns: Order Summary (left) | Delivery To (right) ----
  const colTop = y;

  doc.fillColor(INK).fontSize(13).font("Helvetica-Bold").text("Order Summary", LEFT, colTop, { width: COL_WIDTH });
  doc.moveDown(0.5);
  metaLine(doc, "Order ID", shortId(order.id), LEFT, COL_WIDTH);
  metaLine(
    doc,
    "Date",
    new Date(order.createdAt).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" }),
    LEFT,
    COL_WIDTH
  );
  metaLine(doc, "Status", titleCase(order.status), LEFT, COL_WIDTH);
  metaLine(
    doc,
    "Payment",
    order.paymentMethod === "bkash" ? "bKash (Send Money)" : "Cash on Delivery",
    LEFT,
    COL_WIDTH
  );
  const leftEnd = doc.y;

  doc.fillColor(INK).fontSize(13).font("Helvetica-Bold").text("Delivery To", RIGHT_COL_X, colTop, { width: COL_WIDTH });
  doc.moveDown(0.5);
  doc.fontSize(10).font("Helvetica").fillColor(INK);
  doc.text(order.fullName, RIGHT_COL_X, doc.y, { width: COL_WIDTH });
  doc.text(order.phone, RIGHT_COL_X, doc.y, { width: COL_WIDTH });
  doc.text(order.address, RIGHT_COL_X, doc.y, { width: COL_WIDTH });
  doc.fillColor(MUTED).text(`${zoneLabel(order.deliveryZone)} - ${order.deliveryEstimate}`, RIGHT_COL_X, doc.y, {
    width: COL_WIDTH,
  });
  const rightEnd = doc.y;

  y = Math.max(leftEnd, rightEnd) + 26;

  // ---- Items ----
  doc.fillColor(INK).fontSize(13).font("Helvetica-Bold").text("Items", LEFT, y);
  doc.moveDown(0.5);

  const cols = { title: 50, qty: 330, price: 400, total: 480 };
  const headY = doc.y;
  doc.fontSize(10).font("Helvetica-Bold").fillColor(MUTED);
  doc.text("Product", cols.title, headY);
  doc.text("Qty", cols.qty, headY);
  doc.text("Price", cols.price, headY);
  doc.text("Total", cols.total, headY);
  doc.moveTo(LEFT, doc.y + 4).lineTo(RIGHT, doc.y + 4).strokeColor(BORDER).stroke();
  doc.moveDown(0.6);

  doc.font("Helvetica").fillColor(INK);
  for (const item of order.items) {
    const rowY = doc.y;
    const lineTotal = parseFloat(item.price) * item.quantity;
    let label = item.title;
    if (item.isPreOrder) label += "  [PRE-ORDER]";
    doc.text(label, cols.title, rowY, { width: 260 });
    const afterTitleY = doc.y;
    doc.text(String(item.quantity), cols.qty, rowY);
    doc.text(taka(item.price), cols.price, rowY);
    doc.text(taka(lineTotal), cols.total, rowY);
    doc.y = afterTitleY;
    doc.moveDown(0.5);
  }

  doc.moveTo(LEFT, doc.y + 2).lineTo(RIGHT, doc.y + 2).strokeColor(BORDER).stroke();
  doc.moveDown(0.8);

  // ---- Totals (right aligned) ----
  const labelX = 360;
  const valueX = 480;
  const totalsRow = (label: string, value: string, bold = false) => {
    const rowY = doc.y;
    doc.fontSize(10).font(bold ? "Helvetica-Bold" : "Helvetica").fillColor(bold ? INK : MUTED);
    doc.text(label, labelX, rowY);
    doc.fillColor(INK).text(value, valueX, rowY);
    doc.moveDown(0.5);
  };
  totalsRow("Subtotal", taka(order.subtotal));
  totalsRow(`Delivery (${zoneLabel(order.deliveryZone)})`, taka(order.deliveryFee));
  totalsRow("Total", taka(order.total), true);

  doc.moveDown(1.5);

  // ---- Payment history ----
  doc.fillColor(INK).fontSize(13).font("Helvetica-Bold").text("Payment History", LEFT, doc.y);
  doc.moveDown(0.5);
  if (order.paymentMethod === "bkash") {
    metaLine(doc, "Method", "bKash (Send Money)", LEFT, RIGHT - LEFT);
    metaLine(doc, "Transaction ID", order.bkashTransactionId ?? "-", LEFT, RIGHT - LEFT);
    metaLine(doc, "Amount sent", order.bkashAmount != null ? taka(order.bkashAmount) : "-", LEFT, RIGHT - LEFT);
    metaLine(doc, "Payment status", titleCase(order.paymentStatus), LEFT, RIGHT - LEFT);
  } else {
    metaLine(doc, "Method", "Cash on Delivery", LEFT, RIGHT - LEFT);
    metaLine(doc, "Payment status", "Due on delivery", LEFT, RIGHT - LEFT);
    doc
      .fontSize(9)
      .font("Helvetica")
      .fillColor(MUTED)
      .text("Please keep the exact amount ready. We will call you to confirm before shipping.", LEFT, doc.y, {
        width: RIGHT - LEFT,
      });
  }

  // Pre-order note when any line ships later.
  if (order.items.some((item) => item.isPreOrder)) {
    doc.moveDown(0.6);
    doc
      .font("Helvetica-Bold")
      .fillColor(INK)
      .fontSize(9)
      .text("Some items are pre-orders and will ship as soon as they are back in stock.", LEFT, doc.y, {
        width: RIGHT - LEFT,
      });
  }

  // ---- Closing note (bottom) ----
  doc.moveDown(2.5);
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor(BORDER).stroke();
  doc.moveDown(1);
  doc
    .fontSize(9)
    .font("Helvetica")
    .fillColor(MUTED)
    .text(CLOSING_NOTE, LEFT, doc.y, { align: "center", width: RIGHT - LEFT, lineGap: 2 });

  doc.end();
}
