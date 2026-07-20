import type { Metadata } from "next";
import PageHero from "@/components/content/PageHero";

export const metadata: Metadata = {
  title: "Return & Refund Policy",
  description:
    "YugenBD Return & Refund Policy — damaged, defective or incorrect items are replaced or refunded within 7–10 working days of an approved claim.",
  alternates: { canonical: "/returns" },
};

const WHATSAPP = "https://wa.me/8801778931591";

/** Bangla helper — a subtle secondary line under English content. */
function Bn({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <span className={`mt-1 block text-[13.5px] leading-relaxed text-muted ${className}`}>{children}</span>;
}

function SectionHeading({ num, en, bn }: { num: string; en: string; bn: string }) {
  return (
    <h2 className="mb-4 border-b-2 border-primary/40 pb-2.5">
      <span className="flex items-baseline gap-3 text-2xl md:text-3xl font-semibold">
        <span className="text-base italic text-primary">{num}</span>
        {en}
      </span>
      <span className="mt-1 block text-sm font-medium text-primary">{bn}</span>
    </h2>
  );
}

export default function ReturnsPage() {
  return (
    <div>
      <PageHero
        showMark={false}
        title="Return & Refund Policy"
        subtitle="ফেরত ও রিফান্ড নীতিমালা"
      />

      <div className="mx-auto max-w-3xl px-4 py-12 md:py-16">
        <p className="mx-auto mb-12 max-w-2xl text-center text-lg md:text-xl leading-relaxed text-muted">
          At YugenBD, your satisfaction is at the heart of everything we do. We stand behind the
          authenticity and quality of every product we import from Japan. If something arrives damaged,
          defective, or incorrect, we will make it right.
          <span className="mt-3 block border-t border-border pt-3 text-sm">
            ইউগেন-এ আপনার সন্তুষ্টিই আমাদের সবকিছুর কেন্দ্রবিন্দু। জাপান থেকে আমদানি করা প্রতিটি পণ্যের সত্যতা ও
            মানের নিশ্চয়তা আমরা দিই। কোনো পণ্য ক্ষতিগ্রস্ত, ত্রুটিপূর্ণ বা ভুল অবস্থায় পৌঁছালে আমরা তা ঠিক করে দেব।
          </span>
        </p>

        {/* 01 — Our Promise */}
        <section className="mb-11">
          <SectionHeading num="01" en="Our Promise" bn="আমাদের প্রতিশ্রুতি" />
          <p className="text-muted leading-relaxed">
            We guarantee customer satisfaction across all of our platforms. Where an item arrives{" "}
            <strong className="text-foreground">damaged, defective, or incorrect</strong>, YugenBD will
            arrange a replacement or a full refund within{" "}
            <strong className="text-foreground">7–10 working days</strong> of an approved claim. No
            additional shipping fee is charged for the replacement of such damaged or defective shipments.
          </p>
          <p className="mt-3 border-t border-dashed border-border pt-3 text-[15px] leading-relaxed text-muted">
            আমাদের সকল প্ল্যাটফর্মে আমরা গ্রাহক সন্তুষ্টির নিশ্চয়তা দিই। কোনো পণ্য{" "}
            <strong className="text-foreground">ক্ষতিগ্রস্ত, ত্রুটিপূর্ণ বা ভুল</strong> অবস্থায় পৌঁছালে,
            অনুমোদিত অভিযোগের পর ইউগেন <strong className="text-foreground">৭–১০ কর্মদিবসের</strong> মধ্যে পণ্য
            প্রতিস্থাপন বা সম্পূর্ণ অর্থ ফেরত দেবে। এমন ক্ষতিগ্রস্ত বা ত্রুটিপূর্ণ পণ্য প্রতিস্থাপনের জন্য
            অতিরিক্ত কোনো ডেলিভারি চার্জ নেওয়া হয় না।
          </p>
        </section>

        {/* 02 — Eligibility */}
        <section className="mb-11">
          <SectionHeading num="02" en="Eligibility for Returns" bn="ফেরতের যোগ্যতা" />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border border-t-[3px] border-t-green-600 bg-background p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-green-700">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-green-600 text-xs font-bold text-white">
                  ✓
                </span>
                What we accept
                <Bn className="text-green-700/80">যা আমরা গ্রহণ করি</Bn>
              </h3>
              <ul className="rich-list space-y-2 text-[15px] text-muted">
                <li>
                  Products that arrive <strong className="text-foreground">damaged or defective</strong>
                  <Bn>ক্ষতিগ্রস্ত বা ত্রুটিপূর্ণ অবস্থায় পৌঁছানো পণ্য</Bn>
                </li>
                <li>
                  Wrong or incorrect items sent by us
                  <Bn>আমাদের পক্ষ থেকে পাঠানো ভুল পণ্য</Bn>
                </li>
                <li>
                  Sealed products still in their original condition
                  <Bn>সিলগালা ও আসল অবস্থায় থাকা পণ্য</Bn>
                </li>
                <li>
                  Claims reported <strong className="text-foreground">within 3 days</strong> of receipt with photo/video evidence
                  <Bn>পণ্য হাতে পাওয়ার ৩ দিনের মধ্যে ছবি/ভিডিও প্রমাণসহ জানানো অভিযোগ</Bn>
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-border border-t-[3px] border-t-red-500 bg-background p-5">
              <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-red-700">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                  ✕
                </span>
                What we cannot accept
                <Bn className="text-red-700/80">যা আমরা গ্রহণ করি না</Bn>
              </h3>
              <ul className="rich-list space-y-2 text-[15px] text-muted">
                <li>
                  Used, swatched, or opened products
                  <Bn>ব্যবহৃত, সোয়াচ করা বা খোলা পণ্য</Bn>
                </li>
                <li>
                  Liquid or semi-liquid items once unsealed
                  <Bn>সিল খোলার পর তরল বা আধা-তরল পণ্য</Bn>
                </li>
                <li>
                  Change of mind on smell, texture, colour, or design
                  <Bn>গন্ধ, টেক্সচার, রঙ বা ডিজাইন নিয়ে মত পরিবর্তন</Bn>
                </li>
                <li>
                  Products that simply &quot;do not suit you&quot;
                  <Bn>যে পণ্য শুধু &quot;আপনার সাথে মানায়নি&quot;</Bn>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-4 rounded-r-lg border-l-[3px] border-primary bg-surface px-5 py-4 text-[15px]">
            <strong className="mb-1 block text-foreground">Wrong orders</strong>
            <span className="text-muted">
              Wrong orders may be exchanged upon payment of the returning and re-sending courier costs,
              provided the product is unused and in its original sealed condition.
            </span>
            <Bn>
              <strong className="text-foreground">ভুল অর্ডার:</strong> পণ্য অব্যবহৃত ও আসল সিলগালা অবস্থায় থাকলে,
              ফেরত ও পুনরায় পাঠানোর কুরিয়ার খরচ পরিশোধ সাপেক্ষে ভুল অর্ডার বিনিময় করা যেতে পারে।
            </Bn>
          </div>
        </section>

        {/* 03 — How to raise a claim */}
        <section className="mb-11">
          <SectionHeading num="03" en="How to Raise a Claim" bn="যেভাবে অভিযোগ জানাবেন" />
          <ol className="space-y-0">
            {[
              {
                en: "Inspect on arrival",
                enSub: "Open and check your parcel as soon as it arrives. Record a clear unboxing photo or video.",
                bn: "পার্সেল হাতে পেয়েই খুলুন ও পরীক্ষা করুন। পরিষ্কার আনবক্সিং ছবি বা ভিডিও রাখুন।",
              },
              {
                en: "Contact us within 3 days",
                enSub: "Reach our Customer Care team with your order number and the photo/video evidence of the issue.",
                bn: "অর্ডার নম্বর ও সমস্যার ছবি/ভিডিও প্রমাণসহ ৩ দিনের মধ্যে আমাদের কাস্টমার কেয়ার টিমে যোগাযোগ করুন।",
              },
              {
                en: "Review & approval",
                enSub: "Our Customer Care team, in consultation with management, will confirm your claim and advise the next step.",
                bn: "আমাদের কাস্টমার কেয়ার টিম ব্যবস্থাপনার সাথে পরামর্শ করে আপনার অভিযোগ যাচাই করে পরবর্তী পদক্ষেপ জানাবে।",
              },
              {
                en: "Replacement or refund",
                enSub: "Once approved, we replace the product or process your refund within 7–10 working days.",
                bn: "অনুমোদনের পর ৭–১০ কর্মদিবসের মধ্যে আমরা পণ্য প্রতিস্থাপন বা অর্থ ফেরত প্রক্রিয়া সম্পন্ন করি।",
              },
            ].map((step, i, arr) => (
              <li
                key={i}
                className={`flex gap-4 py-4 ${i < arr.length - 1 ? "border-b border-dashed border-border" : ""}`}
              >
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-foreground text-sm font-semibold text-background">
                  {i + 1}
                </span>
                <div>
                  <strong className="block text-[17px] font-semibold">{step.en}</strong>
                  <span className="text-[15px] text-muted">{step.enSub}</span>
                  <Bn>{step.bn}</Bn>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* 04 — Required materials */}
        <section className="mb-11">
          <SectionHeading num="04" en="Required Return Materials" bn="ফেরতের জন্য প্রয়োজনীয় জিনিস" />
          <p className="text-muted">To process any approved return, please make sure the parcel includes:</p>
          <p className="mb-3 text-[15px] text-muted">
            অনুমোদিত যেকোনো ফেরত প্রক্রিয়া করতে অনুগ্রহ করে পার্সেলে নিচের জিনিসগুলো রাখুন:
          </p>
          <ul className="rich-list space-y-2 text-muted">
            <li>
              The <strong className="text-foreground">original invoice</strong> or order confirmation
              <Bn>আসল ইনভয়েস বা অর্ডার নিশ্চিতকরণ</Bn>
            </li>
            <li>
              The <strong className="text-foreground">YugenBD box</strong> and all original packaging
              <Bn>ইউগেন বক্স ও সকল আসল প্যাকেজিং</Bn>
            </li>
            <li>
              The product itself, unused and in its original sealed condition
              <Bn>অব্যবহৃত ও আসল সিলগালা অবস্থায় থাকা পণ্যটি</Bn>
            </li>
          </ul>
        </section>

        {/* 05 — Shipping & return costs */}
        <section className="mb-4">
          <SectionHeading num="05" en="Shipping & Return Costs" bn="শিপিং ও ফেরত খরচ" />
          <ul className="rich-list space-y-2 text-muted">
            <li>
              <strong className="text-foreground">Inside Dhaka:</strong> Free pickup arranged by our Customer Care team (conditions apply).
              <Bn>ঢাকার ভেতরে: আমাদের কাস্টমার কেয়ার টিমের মাধ্যমে বিনামূল্যে পিকআপ (শর্ত প্রযোজ্য)।</Bn>
            </li>
            <li>
              <strong className="text-foreground">Outside Dhaka:</strong> Please return via a trusted courier service. Verified shipping charges are reimbursed for valid claims.
              <Bn>ঢাকার বাইরে: বিশ্বস্ত কুরিয়ার সার্ভিসে ফেরত পাঠান। বৈধ অভিযোগের ক্ষেত্রে যাচাইকৃত শিপিং খরচ ফেরত দেওয়া হয়।</Bn>
            </li>
            <li>
              <strong className="text-foreground">Invalid claims:</strong> The customer bears all return and re-shipping expenses.
              <Bn>অবৈধ অভিযোগ: ফেরত ও পুনরায় পাঠানোর সমস্ত খরচ গ্রাহক বহন করবেন।</Bn>
            </li>
          </ul>
          <div className="mt-4 rounded-r-lg border-l-[3px] border-primary bg-surface px-5 py-4 text-[15px]">
            <strong className="mb-1 block text-foreground">A note on refunds</strong>
            <span className="text-muted">
              Approved refunds are issued to the original payment method or via mobile banking, as agreed
              with our Customer Care team, within 7–10 working days of approval.
            </span>
            <Bn>
              <strong className="text-foreground">অর্থ ফেরত প্রসঙ্গে:</strong> অনুমোদিত অর্থ ফেরত মূল পেমেন্ট মাধ্যমে
              বা মোবাইল ব্যাংকিং-এর মাধ্যমে, কাস্টমার কেয়ার টিমের সাথে সম্মত অনুযায়ী, অনুমোদনের ৭–১০ কর্মদিবসের
              মধ্যে দেওয়া হয়।
            </Bn>
          </div>
        </section>

        {/* Contact CTA */}
        <div className="mt-14 rounded-2xl bg-foreground px-6 py-11 text-center text-background">
          <h2 className="text-2xl md:text-3xl font-semibold">Need help with a return?</h2>
          <p className="mx-auto mt-2 max-w-md text-sm text-background/70">
            Our Customer Care team is here to guide you through every step of the process.
            <span className="mt-1 block">ফেরত নিয়ে সাহায্য দরকার? আমরা প্রতিটি ধাপে আপনাকে সহায়তা করতে প্রস্তুত।</span>
          </p>
          <a
            href={WHATSAPP}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 inline-block rounded-full bg-primary px-7 py-3 text-sm font-semibold text-white transition-colors hover:bg-primary-dark"
          >
            Chat on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}
