import express from "express";

import { ApiError, StatusCode } from "../../errors";
import { MayaApiServer } from "../../index";

export default async function (server: MayaApiServer, req: express.Request, res: express.Response) {
    const sessionId = req.cookies["session-id"] || "";
    const sessionData = await server.database.getSession(sessionId);

    if (!sessionData)
        throw new ApiError(StatusCode.Forbidden, "NoSessionInformation", "No valid session information associated with a discord account (try logging in with discord first?).");

    const user = await server.database.getDiscordUser(sessionData.discord_user_id);

    res.status(200).json({
        success: true,
        data: user
    });
}