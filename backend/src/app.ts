import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./config/env";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";
import categoryRoutes from "./modules/categories/category.routes";
import productRoutes from "./modules/products/product.routes";
import uploadRoutes from "./modules/uploads/upload.routes";
import concernRoutes from "./modules/concerns/concern.routes";
import reviewRoutes from "./modules/reviews/review.routes";
import adminReviewRoutes from "./modules/reviews/review.admin.routes";
import orderRoutes from "./modules/orders/order.routes";
import authRoutes from "./modules/auth/auth.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import heroSlideRoutes from "./modules/hero-slides/hero-slide.routes";
import faqRoutes from "./modules/faq/faq.routes";
import announcementRoutes from "./modules/announcements/announcement.routes";
import locationRoutes from "./modules/locations/location.routes";
import addressRoutes from "./modules/addresses/address.routes";
import adminUserRoutes from "./modules/users/user.routes";
import shipmentRoutes from "./modules/shipment/shipment.routes";
import deliveryRoutes from "./modules/delivery/delivery.routes";

const app = express();

const allowedOrigins = env.CORS_ORIGIN.split(",").map((o) => o.trim());

app.use(helmet());
app.use(
  cors({
    origin: (origin, cb) => {
      // Allow same-origin/non-browser (no origin) and any allow-listed origin.
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed by CORS`));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));

app.get("/health", (_req, res) => {
  res.json({ success: true, message: "YugenBD API is running" });
});

app.use("/api/v1/categories", categoryRoutes);
app.use("/api/v1/products", productRoutes);
app.use("/api/v1/uploads", uploadRoutes);
app.use("/api/v1/hero-slides", heroSlideRoutes);
app.use("/api/v1/faq", faqRoutes);
app.use("/api/v1/announcements", announcementRoutes);
app.use("/api/v1/locations", locationRoutes);
app.use("/api/v1/addresses", addressRoutes);
app.use("/api/v1/concerns", concernRoutes);
app.use("/api/v1/reviews", reviewRoutes);
app.use("/api/v1/admin/reviews", adminReviewRoutes);
app.use("/api/v1/orders", orderRoutes);
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin/dashboard", dashboardRoutes);
app.use("/api/v1/admin/users", adminUserRoutes);
app.use("/api/v1/shipment", shipmentRoutes);
app.use("/api/v1/delivery", deliveryRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
