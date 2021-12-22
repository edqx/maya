import passport from "passport";
import { useMiddleware } from "../../../util/useMiddleware";

export default useMiddleware(passport.authenticate("lichess", { scope: ["challenge:write"] }));