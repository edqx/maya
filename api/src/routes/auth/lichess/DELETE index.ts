import express from "express";
import got from "got";

import { MayaApiServer } from "../../../index";
import { ApiError, StatusCode } from "../../../errors";

export default async function (server: MayaApiServer, req: express.Request, res: express.Response) {
    const sessionId = req.cookies["session-id"] || "";
    const sessionData = await server.database.getSession(sessionId);

    if (!sessionData)
        throw new ApiError(StatusCode.Forbidden, "NoSessionInformation", "No valid session information associated with a discord account (try logging in with discord first?).");

    const accountConnection = await server.database.getAccountConnection(sessionData.discord_user_id, "lichess");

    if (!accountConnection)
        throw new ApiError(StatusCode.NotFound, "NotConnected", "No account connection for 'lichess'");

    const accessToken = await server.database.getAccessToken(accountConnection);

    try {
        await got.delete("https://lichess.org/api/token", {
            headers: {
                Authorization: "Bearer " + accessToken
            }
        });
    } catch (e) {
        throw new ApiError(StatusCode.InternalServerError, "FailedToRevokeToken", "Failed to revoke lichess authorization token");
    }

    await server.database.unlinkAccountConnection(sessionData.discord_user_id, "lichess");

    res.status(200).json({
        success: true,
        data: {}
    });
}   