import "dotenv/config";
import { seedLocations } from "./locations.seeder";
import { seedCategories } from "./categories.seeder";
import { seedProducts } from "./products.seeder";
import { seedShortDescriptions } from "./short-descriptions.seeder";
import { seedConcerns } from "./concerns.seeder";
import { seedFaq } from "./faq.seeder";
import { seedAnnouncements } from "./announcements.seeder";
import { seedReviews } from "./reviews.seeder";
import { seedAdmins } from "./admins.seeder";

async function main() {
  await seedLocations();
  await seedCategories();
  await seedProducts();
  await seedShortDescriptions();
  await seedConcerns();
  await seedFaq();
  await seedAnnouncements();
  await seedReviews();
  await seedAdmins();
  console.log("Seeding complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
