import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

// Isso aqui é o que estava faltando: ele vai ler o seu arquivo .env
dotenv.config();

export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL,
  },
});