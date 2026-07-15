import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrderById } from "@/lib/api";
import { formatPrice } from "@/lib/format";
import ProductImage from "@/components/product/ProductImage";

const PUBLIC_API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
const WHATSAPP_NUMBER = "8801924415506";

export const metadata: Metadata = {
  title: "Order Confirmed",
  robots: { index: false },
};

interface PageProps {
  params: Promise<{ orderId: string }>;
}

const ZONE_LABEL: Record<string, string> = {
  inside_dhaka: "Inside Dhaka",
  outside_dhaka: "Outside Dhaka",
};

export default async function OrderConfirmationPage({ params }: PageProps) {
  const { orderId } = await params;
  const order = await getOrderById(orderId);
  if (!order) notFound();

  const pdfHref = `${PUBLIC_API_URL}/orders/${order.id}/pdf`;
  const whatsappHref = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    `Hi! I need help with my order ${order.id.slice(0, 8)}`
  )}`;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:py-12">
      {/* Success header */}
      <div className="text-center">
        <span className="mx-auto inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary-light text-primary">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </span>
        <h1 className="mt-4 text-2xl md:text-3xl font-semibold">Order placed successfully</h1>
        <p className="mt-2 text-sm text-muted">
          Thank you, {order.fullName.split(" ")[0]}! We&apos;ll call you to confirm before shipping.
        </p>
        <p className="mt-1 text-sm">
          Order ID: <span className="font-semibold font-mono">{order.id.slice(0, 8)}</span>
        </p>
      </div>

      {/* Summary card */}
      <div className="mt-8 rounded-2xl border border-border p-5 md:p-6">
        <h2 className="text-lg font-semibold">Order Summary</h2>

        <ul className="mt-4 divide-y divide-border border-y border-border">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 py-3">
              <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-surface">
                <ProductImage src={item.imageUrl} alt={item.title} sizes="56px" />
              </span>
              <span className="flex-1 text-base">
                <span className="line-clamp-1">
                  {item.title}
                  {item.isPreOrder && (
                    <span className="ml-2 inline-block rounded-full bg-foreground/80 px-2 py-0.5 text-[10px] font-semibold text-white align-middle">
                      Pre-Order
                    </span>
                  )}
                </span>
                <span className="text-muted">
                  Qty {item.quantity} × {formatPrice(item.price)}
                </span>
              </span>
              <span className="text-base font-semibold">
                {formatPrice(parseFloat(item.price) * item.quantity)}
              </span>
            </li>
          ))}
        </ul>

        <div className="mt-4 space-y-2 text-base">
          <div className="flex justify-between">
            <span className="text-muted">Subtotal</span>
            <span className="font-semibold">{formatPrice(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted">
              Delivery — {ZONE_LABEL[order.deliveryZone] ?? order.deliveryZone} ({order.deliveryEstimate})
            </span>
            <span className="font-semibold">{formatPrice(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between border-t border-border pt-2 text-base">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">{formatPrice(order.total)}</span>
          </div>
        </div>

        {order.paymentMethod === "bkash" ? (
          <div className="mt-4 rounded-lg bg-surface px-3 py-2.5 text-base">
            📱 <strong>bKash Send Money</strong> — transaction{" "}
            <span className="font-medium">{order.bkashTransactionId}</span>
            {order.bkashAmount && <> · {formatPrice(order.bkashAmount)}</>}.{" "}
            {order.paymentStatus === "verified"
              ? "Payment verified ✓"
              : "We'll verify your payment before shipping."}
          </div>
        ) : (
          <div className="mt-4 rounded-lg bg-surface px-3 py-2.5 text-base">
            💵 <strong>Cash on Delivery</strong> — please keep {formatPrice(order.total)} ready for the courier.
          </div>
        )}

        {order.items.some((item) => item.isPreOrder) && (
          <div className="mt-3 rounded-lg border border-primary/40 bg-primary-light px-3 py-2.5 text-base text-primary">
            Some items are pre-orders and will ship as soon as they&apos;re back in stock.
          </div>
        )}

        {/* Delivery address */}
        <div className="mt-4 text-base">
          <p className="font-medium">Delivering to</p>
          <p className="mt-1 text-muted">
            {order.fullName} · {order.phone}
            <br />
            {order.address}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <a
          href={pdfHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-white hover:bg-primary-dark transition-colors"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3v12m0 0l-4-4m4 4l4-4M5 21h14" />
          </svg>
          Download PDF
        </a>
        <a
          href={whatsappHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-full border border-border px-6 py-3 text-sm font-semibold hover:border-primary hover:text-primary transition-colors"
        >
          Need help? Message us on WhatsApp
        </a>
      </div>

      <div className="mt-6 text-center">
        <Link href="/" className="text-sm text-muted hover:text-primary transition-colors">
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
