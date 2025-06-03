import dotenv from "dotenv";
import fastGlob from "fast-glob";

export async function loadEnv(): Promise<void> {
  const envFiles = await fastGlob([".env", ".env.local", ".env.*"], {
    cwd: process.cwd(),
    onlyFiles: true,
  });

  for (const file of envFiles) {
    dotenv.config({ path: file });
  }
}
