/// <reference path="./types/express.d.ts" />
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { errorHandler } from "./utils/errorHandler";

// Import Routers
import authRouter from "./modules/auth/router";

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);
app.use(cookieParser(process.env.SESSION_SECRET || "platformcookieparsersecret"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health Checks
app.get("/health", (req, res) => {
  res.status(200).json({ status: "OK", timestamp: new Date() });
});

app.get("/ping", (req, res) => {
  res.status(200).send("pong");
});

// Mounted Routers
app.use("/api/auth", authRouter);

// Global Error Handler Middleware
app.use(errorHandler);

export default app;
