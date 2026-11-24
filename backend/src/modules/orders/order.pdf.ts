import path from "path";
import fs from "fs";
import PDFDocument from "pdfkit";
import type { orderRepository } from "./order.repository";

type Order = NonNullable<Awaited<ReturnType<typeof orderRepository.findById>>>;

// Storefront theme tokens (frontend/src/app/globals.css) — keep in sync.
const PRIMARY = "#765341";
const PRIMARY_LIGHT = "#f1eeec";
const INK = "#171717";
const MUTED = "#6b6b6b";
const BORDER = "#e7e7ea";
const WHITE = "#ffffff";

// Page content bounds (A4, 50pt margins → usable 50..545).
const LEFT = 50;
const RIGHT = 545;
const CONTENT_WIDTH = RIGHT - LEFT;
const COL_GAP = 30;
const COL_WIDTH = (RIGHT - LEFT - COL_GAP) / 2;
const RIGHT_COL_X = LEFT + COL_WIDTH + COL_GAP;

// Assets live in backend/assets — resolved from the process cwd (which is the
// backend/ dir both in dev via tsx and in prod via `node dist/server.js`).
const ASSETS = path.join(process.cwd(), "assets");
const LOGO_PATH = path.join(ASSETS, "logo.png");
// Faint centred background stamp. Prefers a dedicated mark-only artwork when
// present, otherwise reuses the header logo.
const WATERMARK_PATH = [path.join(ASSETS, "watermark.png"), LOGO_PATH].find((p) => fs.existsSync(p));

/**
 * The storefront's typeface (Jost, loaded via next/font on the web). pdfkit
 * needs a real font file, so the .ttf pair is read from backend/assets/fonts.
 * When they're absent we fall back to the built-in Helvetica rather than
 * failing the download — the invoice still renders, just in the default face.
 */
const FONT_DIR = path.join(ASSETS, "fonts");
const JOST_REGULAR = path.join(FONT_DIR, "Jost-Regular.ttf");
const JOST_BOLD = path.join(FONT_DIR, "Jost-SemiBold.ttf");
const HAS_JOST = fs.existsSync(JOST_REGULAR) && fs.existsSync(JOST_BOLD);

// Document-local font aliases — registered per document in registerFonts().
const BODY = "Body";
const BOLD = "Bold";

function registerFonts(doc: PDFKit.PDFDocument) {
  doc.registerFont(BODY, HAS_JOST ? JOST_REGULAR : "Helvetica");
  doc.registerFont(BOLD, HAS_JOST ? JOST_BOLD : "Helvetica-Bold");
}

const CLOSING_NOTE =
  "Thank you for shopping with YugenBD. Every product is authentically sourced " +
  "from Japan with care and intention. We hope these J-beauty essentials bring a " +
  "little more radiance to your everyday routine.";

function taka(value: string | number) {
  const n = typeof value === "string" ? parseFloat(value) : value;
  // Neither pdfkit's default fonts nor Jost include the ৳ glyph, so use "Tk".
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
    .font(BODY)
    .fillColor(MUTED)
    .text(`${label}: `, x, doc.y, { width, continued: true })
    .fillColor(INK)
    .text(value);
}

/**
 * Faint brand stamp behind the page content. Drawn first (pdfkit paints in
 * call order) and wrapped in save/restore so the opacity change can't leak
 * into the content that follows.
 */
function drawWatermark(doc: PDFKit.PDFDocument) {
  if (!WATERMARK_PATH) return;
  const size = 380;
  doc.save();
  doc.opacity(0.06);
  doc.image(WATERMARK_PATH, (595 - size) / 2, (842 - size) / 2, {
    fit: [size, size],
    align: "center",
    valign: "center",
  });
  doc.restore();
  doc.opacity(1);
}

// ---- Item thumbnails -------------------------------------------------------

const THUMB = 30;
const IMAGE_TIMEOUT_MS = 4000;

/**
 * pdfkit only embeds PNG/JPEG. Cloudinary URLs are rewritten to a small JPEG
 * thumbnail (so WebP/AVIF uploads still work and the PDF stays light); other
 * hosts are fetched as-is and kept only if they really are PNG/JPEG.
 */
function thumbnailUrl(url: string) {
  return url.includes("res.cloudinary.com") && url.includes("/upload/")
    ? url.replace("/upload/", "/upload/f_jpg,q_80,w_120,h_120,c_pad,b_white/")
    : url;
}

function isPngOrJpeg(buf: Buffer) {
  const png = buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  const jpeg = buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  return png || jpeg;
}

async function fetchImage(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(thumbnailUrl(url), { signal: AbortSignal.timeout(IMAGE_TIMEOUT_MS) });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    return isPngOrJpeg(buf) ? buf : null;
  } catch {
    return null;
  }
}

/**
 * Download every distinct line image up front (pdfkit draws synchronously).
 * Never throws: a missing, slow or broken image just falls back to the icon.
 */
async function loadItemImages(order: Order) {
  const urls = [...new Set(order.items.map((item) => item.imageUrl).filter((u): u is string => !!u))];
  const entries = await Promise.all(urls.map(async (url) => [url, await fetchImage(url)] as const));
  return new Map(entries);
}

/** Thumbnail cell: the product photo, or a neutral bag icon (custom lines, missing images). */
function drawThumb(doc: PDFKit.PDFDocument, image: Buffer | null | undefined, x: number, y: number) {
  doc.save();
  doc.roundedRect(x, y, THUMB, THUMB, 4).clip();
  if (image) {
    doc.rect(x, y, THUMB, THUMB).fill(WHITE);
    doc.image(image, x, y, { fit: [THUMB, THUMB], align: "center", valign: "center" });
  } else {
    doc.rect(x, y, THUMB, THUMB).fill(PRIMARY_LIGHT);
    // Simple shopping-bag glyph, centred.
    const bw = 14;
    const bh = 12;
    const bx = x + (THUMB - bw) / 2;
    const by = y + 11;
    doc.lineWidth(1.2).strokeColor(PRIMARY);
    doc.roundedRect(bx, by, bw, bh, 1.5).stroke();
    doc
      .moveTo(bx + 4, by)
      .bezierCurveTo(bx + 4, by - 6, bx + bw - 4, by - 6, bx + bw - 4, by)
      .stroke();
  }
  doc.restore();
  doc.lineWidth(0.6).roundedRect(x, y, THUMB, THUMB, 4).strokeColor(BORDER).stroke();
  doc.lineWidth(1);
}

/** Items table: primary-filled header row, then one bordered row per line. */
function drawItemsTable(
  doc: PDFKit.PDFDocument,
  order: Order,
  top: number,
  images: Map<string, Buffer | null>
) {
  const PAD = 8;
  // Thumbnail sits in the Product column, left of the title.
  const TITLE_X = LEFT + PAD + THUMB + 10;
  const columns = [
    { label: "Product", x: LEFT + PAD, width: 249 },
    { label: "Qty", x: LEFT + 265 + PAD, width: 39 },
    { label: "Price", x: LEFT + 320 + PAD, width: 69 },
    { label: "Total", x: LEFT + 405 + PAD, width: 74 },
  ];
  const alignFor = (index: number): "left" | "center" | "right" =>
    index === 0 ? "left" : index === 1 ? "center" : "right";

  // Header row — brand background, white text.
  const headerHeight = 26;
  doc.rect(LEFT, top, CONTENT_WIDTH, headerHeight).fill(PRIMARY);
  doc.fillColor(WHITE).font(BOLD).fontSize(10);
  columns.forEach((col, index) => {
    doc.text(col.label, col.x, top + 8, { width: col.width, align: alignFor(index) });
  });

  let y = top + headerHeight;

  order.items.forEach((item) => {
    const lineTotal = parseFloat(item.price) * item.quantity;
    const label = item.isPreOrder ? `${item.title}  [PRE-ORDER]` : item.title;

    doc.font(BODY).fontSize(10);
    const titleWidth = columns[0].x + columns[0].width - TITLE_X;
    const titleHeight = doc.heightOfString(label, { width: titleWidth });
    const rowHeight = Math.max(titleHeight, THUMB) + PAD * 2;
    // Single-line cells are vertically centred in the row.
    const textY = y + (rowHeight - doc.currentLineHeight()) / 2;

    drawThumb(doc, item.imageUrl ? images.get(item.imageUrl) : null, LEFT + PAD, y + (rowHeight - THUMB) / 2);

    doc.fillColor(INK).font(BODY).fontSize(10);
    doc.text(label, TITLE_X, y + (rowHeight - titleHeight) / 2, { width: titleWidth });
    const cells = [String(item.quantity), taka(item.price), taka(lineTotal)];
    columns.slice(1).forEach((col, index) => {
      doc.text(cells[index], col.x, textY, { width: col.width, align: alignFor(index + 1) });
    });

    y += rowHeight;
    doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(BORDER).stroke();
  });

  // Outer frame drawn last so it sits on top of the row fills.
  doc.rect(LEFT, top, CONTENT_WIDTH, y - top).strokeColor(BORDER).stroke();
  doc.y = y;
}

/**
 * Streams a branded order-summary PDF for `order` into the response.
 * Generated server-side so it always matches the stored order. Line images are
 * downloaded first (see loadItemImages), so this resolves once drawing starts.
 */
export async function streamOrderPdf(order: Order, stream: NodeJS.WritableStream) {
  const images = await loadItemImages(order);
  const doc = new PDFDocument({ size: "A4", margin: 50 });
  registerFonts(doc);
  doc.pipe(stream);

  // Stamp every page: once for the page that already exists, then on each new one.
  doc.on("pageAdded", () => drawWatermark(doc));
  drawWatermark(doc);

  // ---- Header: logo centred ----
  if (fs.existsSync(LOGO_PATH)) {
    doc.image(LOGO_PATH, LEFT, 45, { fit: [CONTENT_WIDTH, 46], align: "center" });
  } else {
    doc
      .fillColor(PRIMARY)
      .fontSize(24)
      .font(BOLD)
      .text("YugenBD", LEFT, 50, { width: CONTENT_WIDTH, align: "center" });
  }

  let y = 108;
  doc.moveTo(LEFT, y).lineTo(RIGHT, y).strokeColor(BORDER).stroke();
  y += 22;

  // ---- Two columns: Order Summary (left) | Delivery To (right) ----
  const colTop = y;

  doc.fillColor(INK).fontSize(13).font(BOLD).text("Order Summary", LEFT, colTop, { width: COL_WIDTH });
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
  // The bKash reference is the shop's only proof of a manual Send Money, so it
  // stays on the invoice even though the Payment History block is gone.
  if (order.paymentMethod === "bkash") {
    metaLine(doc, "Transaction ID", order.bkashTransactionId ?? "-", LEFT, COL_WIDTH);
    metaLine(doc, "Payment status", titleCase(order.paymentStatus), LEFT, COL_WIDTH);
  }
  const leftEnd = doc.y;

  doc.fillColor(INK).fontSize(13).font(BOLD).text("Delivery To", RIGHT_COL_X, colTop, { width: COL_WIDTH });
  doc.moveDown(0.5);
  doc.fontSize(10).font(BODY).fillColor(INK);
  doc.text(order.fullName, RIGHT_COL_X, doc.y, { width: COL_WIDTH });
  doc.text(order.phone, RIGHT_COL_X, doc.y, { width: COL_WIDTH });
  doc.text(order.address, RIGHT_COL_X, doc.y, { width: COL_WIDTH });
  doc.fillColor(MUTED).text(`${zoneLabel(order.deliveryZone)} - ${order.deliveryEstimate}`, RIGHT_COL_X, doc.y, {
    width: COL_WIDTH,
  });
  const rightEnd = doc.y;

  y = Math.max(leftEnd, rightEnd) + 26;

  // ---- Customer note (only when present) ----
  if (order.note) {
    doc.fillColor(INK).fontSize(11).font(BOLD).text("Note from customer", LEFT, y);
    doc.moveDown(0.3);
    doc.fontSize(10).font(BODY).fillColor(INK).text(order.note, LEFT, doc.y, { width: CONTENT_WIDTH });
    y = doc.y + 16;
  }

  // ---- Items ----
  doc.fillColor(INK).fontSize(13).font(BOLD).text("Items", LEFT, y);
  drawItemsTable(doc, order, doc.y + 8, images);
  doc.moveDown(1);

  // ---- Totals (right aligned) ----
  const labelX = 360;
  const valueX = 480;
  const totalsRow = (label: string, value: string, bold = false) => {
    const rowY = doc.y;
    doc.fontSize(10).font(bold ? BOLD : BODY).fillColor(bold ? INK : MUTED);
    doc.text(label, labelX, rowY);
    doc.fillColor(INK).text(value, valueX, rowY);
    doc.moveDown(0.5);
  };
  totalsRow("Subtotal", taka(order.subtotal));
  if (Number(order.discount) > 0) {
    // Long codes would collide with the value column, so clip them.
    const code = order.couponCode && order.couponCode.length > 14 ? `${order.couponCode.slice(0, 13)}…` : order.couponCode;
    totalsRow(`Discount${code ? ` (${code})` : ""}`, `- ${taka(order.discount)}`);
  }
  totalsRow(`Delivery (${zoneLabel(order.deliveryZone)})`, taka(order.deliveryFee));
  totalsRow("Total", taka(order.total), true);

  // ---- Closing note (bottom) ----
  doc.moveDown(2.5);
  doc.moveTo(LEFT, doc.y).lineTo(RIGHT, doc.y).strokeColor(BORDER).stroke();
  doc.moveDown(1);
  doc
    .fontSize(9)
    .font(BODY)
    .fillColor(MUTED)
    .text(CLOSING_NOTE, LEFT, doc.y, { align: "center", width: CONTENT_WIDTH, lineGap: 2 });

  doc.end();
}
