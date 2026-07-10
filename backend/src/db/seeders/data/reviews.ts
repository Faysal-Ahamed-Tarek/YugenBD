/**
 * Pools for generating realistic dummy reviews. The seeder rotates through
 * these deterministically per product so re-runs on a fresh DB produce the
 * same data.
 */
export const reviewerNames = [
  "Nusrat Jahan",
  "Tanvir Ahmed",
  "Sadia Islam",
  "Mehedi Hasan",
  "Farhana Akter",
  "Rakibul Islam",
  "Sumaiya Rahman",
  "Arif Chowdhury",
  "Tasnim Ferdous",
  "Shakil Khan",
  "Rifat Ara",
  "Naimur Rahman",
  "Jannatul Mawa",
  "Sabbir Hossain",
  "Anika Tabassum",
  "Fahim Shahriar",
];

export const reviewComments = [
  "Ordered on Saturday, got it by Tuesday in Chattogram. The product is original — you can tell from the packaging. Already seeing a difference after two weeks of regular use.",
  "Was a bit skeptical about ordering skincare online but this turned out great. Texture is light, absorbs quickly, and no breakouts in this weather. Will repurchase.",
  "Honestly better than the imported one I used to buy at double the price. Delivery man was polite and COD made it totally hassle-free.",
  "Using it every night for a month now. My skin feels noticeably smoother and the dark patches near my cheeks have faded a bit. Genuine product, fast delivery.",
  "Third time ordering from YugenBD. Consistent quality every time. This one has become a permanent part of my routine.",
  "Works well even in Dhaka's humidity. Doesn't feel heavy or sticky like most products I've tried. Packaging was sealed properly.",
  "Bought it after seeing the reviews and they were right. Noticeable improvement within 10-12 days. My sister has already ordered one for herself.",
  "Good value for money. The quantity lasts longer than expected if you use the right amount. Delivery took 3 days to Sylhet.",
  "My dermatologist actually approved this one when I showed her. Gentle enough for my sensitive skin, no redness or irritation at all.",
  "The difference is visible in photos — my husband noticed before I even told him I was using something new. Very happy with this purchase.",
  "Decent product. Took a little longer to show results than I hoped, but after a month I can say it definitely works. Be patient with it.",
  "Perfect for daily use. I keep one at home and ordered another for my office bag. The pump/packaging makes it easy to use on the go.",
];

/** Day offsets (within the last ~3 months) rotated across seeded reviews. */
export const reviewDayOffsets = [3, 9, 17, 26, 34, 41, 55, 63, 72, 81, 88];
