const JWT_SECRET_RAW = process.env.JWT_SECRET;
if (!JWT_SECRET_RAW) {
  console.error("[FATAL] JWT_SECRET is not set in environment variables.");
  process.exit(1);
}
export const JWT_SECRET: string = JWT_SECRET_RAW;
