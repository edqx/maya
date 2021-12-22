import express from "express";
import { ApiError, StatusCode } from "../errors";
import { MayaApiServer } from "../index";

export function validSessionMiddleware() {
    return async function (server: MayaApiServer, req: express.Request, res: express.Response) {
        const sessionId = req.cookies["session-id"] || "";
        const sessionData = await server.database.getSession(sessionId);

        if (!sessionData) {
            throw new ApiError(StatusCode.Forbidden, "NoSessionData", "No session data associated with the request; make sure you're logged in.");
        }

        const discordAccount = await server.database.getAccount(sessionData.discord_user_id);
        
        if (!discordAccount) {
            throw new ApiError(StatusCode.Forbidden, "NoDiscordAccount", "No discord account associated with the request; make sure you're logged in.");
        }

        return true;
    }
}