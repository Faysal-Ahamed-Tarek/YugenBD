import { db } from "../client";
import { announcements } from "../schema";

// Initial announcement-bar messages (Bangla). Admin can edit/add/remove these
// from the Home page. Order matters — shown left→right in the marquee.
const announcementsData = [
  "৩,০০০ টাকার বেশি কেনাকাটায় সারা দেশে সম্পূর্ণ ফ্রি ডেলিভারি! 🚚",
  "প্রথম ১০০ জন গ্রাহক অ্যাকাউন্ট তৈরি করলেই পাচ্ছেন ফ্রি ডেলিভারি — আজই রেজিস্টার করুন! ✨",
];

/** Idempotent: seeds the initial announcement bar only when empty. */
export async function seedAnnouncements() {
  const existing = await db.select({ id: announcements.id }).from(announcements).limit(1);
  if (existing.length > 0) {
    console.log("Announcements already seeded, skipping.");
    return;
  }

  await db.insert(announcements).values(
    announcementsData.map((text, i) => ({ text, sortOrder: i }))
  );
  console.log(`Seeded ${announcementsData.length} announcements.`);
}
