import { getTestimonials } from "@/lib/api";
import TestimonialsCarousel from "./TestimonialsCarousel";

/**
 * Server component: fetches active testimonials (ordered by orderId) on the
 * server and hands them to the client carousel, so the section costs no
 * client-side fetching.
 */
export default async function TestimonialsSection() {
  const testimonials = await getTestimonials();
  if (testimonials.length === 0) return null;

  return (
    <section aria-label="Customer video testimonials" className="md:py-6">
      {/* Header keeps side padding for readability; the carousel below is edge-to-edge */}
      <header className="mx-auto max-w-7xl px-4 mb-3 md:mb-4 text-center">
        <h2 className="text-2xl md:text-4xl font-bold">
          Result You Can See, Confidence You Can Feel
        </h2>
        <p className="mt-2 text-sm md:text-base text-muted">Real people. Real results.</p>
      </header>

      <div className="mx-auto max-w-7xl">
        <TestimonialsCarousel items={testimonials} />
      </div>
    </section>
  );
}
