import bcrypt from "bcrypt";



/**
 * hash_password()
 * ---------------
 * Hashes plaintext password.
 *
 * Parameters:
 * -----------
 * password : string
 *
 * Returns:
 * --------
 * Promise<string>
 */

export const hash_password = async (

    password

) => {

    return await bcrypt.hash(

        password,

        10

    );

};



/**
 * compare_password()
 * ------------------
 * Compares plaintext password
 * against stored hash.
 *
 * Parameters:
 * -----------
 * password : string
 *
 * hashed_password : string
 *
 * Returns:
 * --------
 * Promise<boolean>
 */

export const compare_password = async (

    password,
    hashed_password

) => {

    return await bcrypt.compare(

        password,

        hashed_password

    );

};
