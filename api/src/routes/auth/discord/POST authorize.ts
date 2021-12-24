import express from "express";
import got from "got";
import postgres from "postgres";

import * as dtypes from "discord-api-types/v9";
import * as dapi from "@discordjs/rest";

import { MayaApiServer } from "../../../index";
import { ApiError, StatusCode } from "../../../errors";

export default async function (server: MayaApiServer, req: express.Request, res: express.Response) {
    const ipAddress = req.header("X-Forwarded-For") || req.socket.remoteAddress || "";
    
    if (!req.body.code)
        throw new ApiError(StatusCode.BadRequest, "NoQueryCode", "Expected 'code' field in json body to complete OAuth2 log-in flow.");

    try {
        const tokenExchangeJson: dtypes.RESTPostOAuth2AccessTokenResult = await got.post("https://discord.com/api/v9" + dtypes.Routes.oauth2TokenExchange(), {
            headers: {
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: `client_id=${process.env.CLIENT_ID as string}&client_secret=${process.env.CLIENT_SECRET as string}&grant_type=authorization_code&code=${req.body.code}&redirect_uri=${encodeURIComponent(process.env.BASE_WEB as string + "/auth/discord/callback")}`
        }).json();
            
        try {
            const userRest = new dapi.REST().setToken(tokenExchangeJson.access_token);
            const userJson = await userRest.get(dtypes.Routes.user("@me"), {
                authPrefix: "Bearer"
            }) as dtypes.RESTGetAPICurrentUserResult;

            if (!userJson.id)
                throw new ApiError(StatusCode.InternalServerError, "DiscordFailedToFetchUser", "Failed to fetch user after successfully getting OAuth2 access token.");

            try {
                const expiresAt = new Date(Date.now() + (tokenExchangeJson.expires_in * 1000));

                await server.database.createAccount(userJson.id, tokenExchangeJson.access_token, tokenExchangeJson.refresh_token, tokenExchangeJson.token_type, expiresAt, tokenExchangeJson.scope);

                const sessionData = await server.database.getOrCreateSession(userJson.id, ipAddress || "", req.header("User-Agent") || "");

                return res.cookie("session-id", sessionData.id).status(200).json({
                    success: true,
                    data: {}
                });
            } catch (e) {
                if (e instanceof postgres.PostgresError) {
                    console.log(e);
                    throw new ApiError(StatusCode.InternalServerError, "UnknownDatabaseError", "There was an unexpected error while connecting to the database");;
                }

                throw e;
            }
        } catch (e) {
            if (e instanceof got.HTTPError)
                throw new ApiError(StatusCode.InternalServerError, "DiscordFailedToFetchUser", "Failed to fetch user after successfully getting OAuth2 access token.");
    
            throw e;
        }
    } catch (e) {
        if (e instanceof got.HTTPError)
            throw new ApiError(StatusCode.InternalServerError, "DiscordFailedToAuthorize", "Failed to get OAuth2 access token.");

        throw e;
    }

}