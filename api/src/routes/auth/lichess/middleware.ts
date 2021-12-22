import passport from "passport";
import { validSessionMiddleware } from "../../../middleware/validSessionMiddleware";

import { useMiddleware } from "../../../util/useMiddleware";

export default [
    useMiddleware(passport.initialize()),
    useMiddleware(passport.session()),
    validSessionMiddleware()
];