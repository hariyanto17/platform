import app from "./app";
import { logger } from "./utils/logger";
import dotenv from "dotenv";
dotenv.config();

const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5000;

app.listen(PORT, () => {
  logger.info(`Server is running on port ${PORT}`);
});
