import express from "express";

import { MayaApiServer } from "../../../index";
import { ApiError, StatusCode } from "../../../errors";

export default async function (server: MayaApiServer, req: express.Request, res: express.Response) {
    const sessionId = req.cookies["session-id"] || "";
    const sessionData = await server.database.getSession(sessionId);

    if (!sessionData)
        throw new ApiError(StatusCode.Forbidden, "NoSessionInformation", "No valid session information associated with a discord account (try logging in with discord first?).");

    await server.database.revokeDiscordAccess(sessionData.discord_user_id);
    await server.database.destroySession(sessionData.id);

    res.clearCookie("session-id").status(200).json({
        success: true,
        data: {}
    });
}   