import { defineConfig } from '@prisma/config';
import * as dotenv from 'dotenv';

dotenv.config();

export default defineConfig({
  datasource: {
    // Mudamos aqui para DIRECT_URL para ele conseguir criar as colunas
    url: process.env.DIRECT_URL, 
  },
});