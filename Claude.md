═══════════════════════════════════════════
1 — Theme color update
═══════════════════════════════════════════
- Update `--primary` in globals.css from `#e5456d` to `#765341`.
- Derive `--primary-dark` and `--primary-light` from the new base (e.g. a darker shade for 
  hover states like buttons, a light tint for backgrounds like badges/chips — generate 
  reasonable values, e.g. `-dark` ~15-20% darker, `-light` a very light tint ~90% toward 
  white, consistent with how the original #c72f56/#fdeef2 related to #e5456d).
- Grep the whole codebase (frontend/admin) for any hardcoded hex colors matching the old 
  primary (`#e5456d`, `#c72f56`, `#fdeef2`) or any other hardcoded hex that should be a 
  token — replace with `bg-primary`/`text-primary`/etc. token classes. This is a good 
  opportunity to catch any component that bypassed the token system.
- Confirm both admin/ and frontend/ apps pick up the new color (they may have separately 
  copied globals.css per the earlier deployment task — update both, don't just one).

═══════════════════════════════════════════
2 — Product detail page images: full image, no crop (HIGH PRIORITY)
═══════════════════════════════════════════
- This was attempted before but confirm it's actually correct end-to-end — treat as the 
  most important fix in this batch.
- ProductGallery main image (desktop) and mobile scroll-snap carousel: next/image must use 
  `object-contain` (NOT `object-cover`/`fill`-cropping), so the complete image is always 
  visible with no cropping from top/bottom or sides, regardless of the image's native aspect 
  ratio. Container should letterbox with `bg-surface` (or similar theme background) around 
  the image rather than cropping to fill.
- Check both the main large image view AND the thumbnail tabs (desktop) / dot indicators 
  (mobile) — thumbnails can stay cropped/cover for a clean square grid, but clicking into 
  the main viewer must show the full uncropped image.
- Test with at least one portrait, one landscape, and one square test image to confirm no 
  edge is ever cut off in the main viewer at both mobile and desktop breakpoints.

═══════════════════════════════════════════
4 — Admin product list: title as edit link
═══════════════════════════════════════════
- Product title text in the admin `/products` table IS the edit link/icon — clicking the 
  title text navigates directly to the edit page. Remove the separate edit icon/button if 
  one still exists alongside it (title text now serves that sole purpose) — style the title 
  with a hover state (underline or primary-color hover) so it visibly reads as clickable, 
  not just plain static text.
- Delete icon stays separate (destructive action shouldn't be combined with the name link).

═══════════════════════════════════════════
5 — Admin nav: "Pages" dropdown containing "Home"
═══════════════════════════════════════════
- Confirm/fix the admin sidebar nav structure: "Pages" is a dropdown/expandable parent nav 
  item (not a flat link), and "Home" is a child item under it, linking to `/pages/home` 
  (hero slider + testimonial video management from the earlier task). Structure allows 
  adding more page-sections under "Pages" later without restructuring the nav again (e.g. 
  build the dropdown generically — a `NAV_SECTIONS` config with children arrays — rather 
  than hardcoding a single Home-only case).

═══════════════════════════════════════════
6 — Shop by Concern: mobile carousel arrows
═══════════════════════════════════════════
- Add left/right arrow buttons to the Shop by Concern section's mobile view (currently 
  likely relying on touch-swipe/scroll-snap only per the Carousel/ui pattern used elsewhere) 
  — same visual style as the white circular arrows already used in TestimonialsCarousel or 
  the desktop ProductCarousel arrows, for consistency.

═══════════════════════════════════════════
7 — Global rule: conditional carousel arrows everywhere
═══════════════════════════════════════════
- Apply this rule to EVERY carousel/scrollable row with left/right arrows across the site 
  (HeroSlider, TestimonialsCarousel, ProductCarousel, Shop by Concern, and any others found 
  via grep for arrow/carousel components): 
    - The LEFT arrow only renders/shows when there is content to scroll to on the left 
      (i.e. current scroll position > 0 / not at the first item).
    - The RIGHT arrow only renders/shows when there is content to scroll to on the right 
      (i.e. not already at the last item / scrollable content remains).
    - At the very start: only right arrow shows. At the very end: only left arrow shows. 
      In the middle: both show. If everything fits without needing to scroll at all (e.g. 
      few items on a wide screen): neither arrow shows.
    - Implement via tracking scroll position (scrollLeft, scrollWidth, clientWidth) or 
      active-index bounds (whichever each component already uses internally) and 
      conditionally rendering (not just disabling) the arrow buttons — spec says "should not 
      show," meaning hidden/unmounted, not merely disabled/greyed-out.
    - Update on scroll/resize/index-change so arrows correctly appear/disappear as the user 
      navigates, not just calculated once on mount.

Do not add payment integration. Do not touch additionInformation field naming. Do not 
reintroduce any weight-related code while touching product detail/admin product files for 
other reasons in this same task. Confirm end-to-end: new brand color (#765341) applied 
everywhere with no leftover hardcoded old-color hex codes; product detail images show fully 
uncropped on mobile and desktop; zero weight references remain anywhere; admin product title 
click opens edit; admin nav shows Pages → Home; Shop by Concern has working mobile arrows; 
and every carousel across the site correctly hides its left arrow at the start and right 
arrow at the end.