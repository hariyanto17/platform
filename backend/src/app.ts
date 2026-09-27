/// <reference path="./types/express.d.ts" />
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./utils/errorHandler";

// Import Routers
import authRouter from "./modules/auth/router";
import usersRouter from "./modules/users/router";
import orgsRouter from "./modules/organizations/router";
import appsRouter from "./modules/applications/router";
import rolesRouter from "./modules/roles/router";
import accessRouter from "./modules/access/router";
import auditRouter from "./modules/auditLogs/router";
import dashboardRouter from "./modules/dashboard/router";
import settingsRouter from "./modules/settings/router";
import securityRouter from "./modules/security/router";
import paymentsRouter from "./modules/payments/router";

const app = express();

// Global Middlewares
const envOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((s) => s.trim())
  : [];

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3011",
  "http://localhost:3050",
  "https://cinema.168billiard.online",
  "https://platform.168billiard.online",
  "https://ticket.168billiard.online",
  "https://concession.168billiard.online",
  ...envOrigins,
];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        allowedOrigins.includes(origin) ||
        origin.endsWith(".168billiard.online") ||
        origin === "https://168billiard.online" ||
        origin.includes("localhost") ||
        origin.includes("127.0.0.1")
      ) {
        return callback(null, true);
      }
      return callback(null, true);
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept", "Cookie"],
  })
);
app.use(cookieParser(process.env.SESSION_SECRET || "platformcookieparsersecret"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Checks
app.get("/health", (req, res) => {
  res.status(200).json({
    status: "success",
    message: "Health check successful",
    data: { status: "OK", timestamp: new Date() }
  });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Mounted Routers
app.use("/api/auth", authRouter);
app.use("/api/users", usersRouter);
app.use("/api/organizations", orgsRouter);
app.use("/api/applications", appsRouter);
app.use("/api", rolesRouter); // Exposes /api/roles and /api/permissions
app.use("/api/access", accessRouter);
app.use("/api/audit-logs", auditRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/security", securityRouter);
app.use("/api/payments", paymentsRouter);

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
