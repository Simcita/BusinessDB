import pkg from '@prisma/client';
const { PrismaClient } = pkg;

import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

import 'dotenv/config'


const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 3,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
});

const adapter = new PrismaPg(pool);

/**
 * prisma
 * ------
 * Creates a singleton Prisma database client
 * used throughout the application.
 *
 * Parameters:
 * -----------
 * none
 *
 * Returns:
 * --------
 * PrismaClient
 */

const prisma = new PrismaClient({

    adapter,

    log: process.env.NODE_ENV === "production"
        ? ["warn", "error"]
        : ["query", "info", "warn", "error"]

});



export default prisma;

