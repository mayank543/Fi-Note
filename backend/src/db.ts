import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import { PrismaClient } from '@prisma/client'

const isCloudDB = process.env.DATABASE_URL?.includes('neon.tech') || process.env.DATABASE_URL?.includes('render.com');

const pool = new Pool({ 
    connectionString: process.env.DATABASE_URL,
    ssl: isCloudDB ? { rejectUnauthorized: false } : false
})
const adapter = new PrismaPg(pool)
export const prisma = new PrismaClient({ adapter })
