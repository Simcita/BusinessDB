import pkg from '@prisma/client';
const { PrismaClient } = pkg;

import adapterPkg from '@prisma/adapter-pg';
const { PrismaPg } = adapterPkg;

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

