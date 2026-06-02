/**
 * authorize_roles()
 * -----------------
 * Restricts route access by admin role.
 *
 * Parameters:
 * -----------
 * allowed_roles : array
 *
 * Returns:
 * --------
 * Express Middleware
 */

const authorize_roles = (

    allowed_roles = []

) => {

    return (

        request,
        response,
        next

    ) => {

        /**
         * Reject unauthorized roles.
         */

        if (

            !allowed_roles.includes(

                request.admin.role

            )

        ) {

            return response.status(403).json({

                success: false,

                message: "Insufficient permissions."

            });

        }



        next();

    };

};



export default authorize_roles;
