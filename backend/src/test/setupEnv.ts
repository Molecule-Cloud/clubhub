import { config } from "dotenv";

config({ path: ".env.test" });

console.log("DEBUG actual DATABASE_URL used by tests:", process.env.DATABASE_URL);