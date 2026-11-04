import './src/config/environment';
import { defineConfig } from 'drizzle-kit';
import { env } from './src/config/environment';
export default defineConfig({ schema: './src/database/schema/index.ts', out: './drizzle', dialect: 'sqlite', dbCredentials: { url: env.DATABASE_URL }, strict: true });
