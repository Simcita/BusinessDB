import { PrismaClient } from "@prisma/client";

import { PrismaPg } from '@prisma/adapter-pg'

import 'dotenv/config'


const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL,
})

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

    log: [
        "query",
        "info",
        "warn",
        "error"
    ]

});



export default prisma;

