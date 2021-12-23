import passport from "passport";
import express from "express";

import { MayaApiServer } from "../../../index";
import { ApiError, StatusCode } from "../../../errors";

export default async function (server: MayaApiServer, req: express.Request, res: express.Response) {
    const sessionId = req.cookies["session-id"] || "";
    const sessionData = await server.database.getSession(sessionId);

    if (!sessionData)
        throw new ApiError(StatusCode.Forbidden, "NoSessionInformation", "No valid session information associated with a discord account (try logging in with discord first?).");

    return new Promise<void>((resolve, reject) => {
        req.query.code = req.body.code;
        passport.authenticate("lichess", { failureRedirect: "/failed", scope: ["challenge:write"] }, async (error: any, result: any) => {
            if (error)
                return reject(new ApiError(StatusCode.InternalServerError, "LichessFailedToAuthorize", "Failed to get OAuth2 access token."));

            const { accessToken, user } = result;
            
            if (!accessToken)
                return reject(new ApiError(StatusCode.InternalServerError, "LichessFailedToFetchUser", "Failed to get OAuth2 access token."));

            if (!user)
                return reject(new ApiError(StatusCode.InternalServerError, "LichessFailedToFetchUser", "Failed to fetch user after successfully getting OAuth2 access token."));

            await server.database.createAccountConnection(sessionData.discord_user_id, "lichess", user.id, accessToken, undefined);

            res.status(200).json({
                success: true,
                data: {}
            });
            
            resolve();
        })(req, res, () => {});
    });
}   