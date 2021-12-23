import express from "express";
import { MayaApiServer } from "../../../index";

export default async function (server: MayaApiServer, req: express.Request, res: express.Response) {
    res.redirect("https://discord.com/api/oauth2/authorize?client_id=908114579924598824&redirect_uri=" + encodeURIComponent(process.env.BASE_WEB as string + "/auth/discord/callback") + "&response_type=code&scope=identify");
}