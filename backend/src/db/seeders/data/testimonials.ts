/**
 * Demo testimonial videos from Cloudinary's public demo cloud, cropped to
 * vertical 9:16 with c_fill so they render like social video cards.
 * Posters are generated from the 2-second frame (so_2) of each video.
 * Replace with real customer videos uploaded to your own Cloudinary cloud.
 */
const demoVideo = (publicId: string) =>
  `https://res.cloudinary.com/demo/video/upload/c_fill,ar_9:16,w_540,q_auto/${publicId}.mp4`;

const demoPoster = (publicId: string) =>
  `https://res.cloudinary.com/demo/video/upload/c_fill,ar_9:16,w_540,so_2,q_auto,f_jpg/${publicId}.jpg`;

export const testimonialsData = [
  {
    title: "My skin has never felt this smooth",
    description: "Skincare routine results after 4 weeks",
    videoUrl: demoVideo("samples/dance-2"),
    posterUrl: demoPoster("samples/dance-2"),
    orderId: 1,
    isActive: true,
  },
  {
    title: "Dandruff gone in two weeks",
    description: "Anti-dandruff shampoo honest review",
    videoUrl: demoVideo("dog"),
    posterUrl: demoPoster("dog"),
    orderId: 2,
    isActive: true,
  },
  {
    title: "Best sunscreen I've used in Dhaka heat",
    description: "SPF 50+ sunscreen gel daily wear test",
    videoUrl: demoVideo("samples/sea-turtle"),
    posterUrl: demoPoster("samples/sea-turtle"),
    orderId: 3,
    isActive: true,
  },
  {
    title: "Hair fall reduced, growth visible",
    description: "Onion black seed hair oil 30-day update",
    videoUrl: demoVideo("samples/elephants"),
    posterUrl: demoPoster("samples/elephants"),
    orderId: 4,
    isActive: true,
  },
  {
    title: "The glow is real — vitamin C serum",
    description: "Brightening serum before and after",
    videoUrl: demoVideo("samples/cld-sample-video"),
    posterUrl: demoPoster("samples/cld-sample-video"),
    orderId: 5,
    isActive: true,
  },
  {
    title: "Beard finally filled in",
    description: "Beard growth oil 6-week journey",
    videoUrl: demoVideo("elephants"),
    posterUrl: demoPoster("elephants"),
    orderId: 6,
    isActive: true,
  },
];
