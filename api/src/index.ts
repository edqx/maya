import http from "http";
import express from "express";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";
import got from "got";

import passport from "passport";
import postgres from "postgres";

import sessions from "express-session";

import * as dapi from "@discordjs/rest";
import { Strategy as LichessStrategy } from "passport-lichess";

import { ApiError, StatusCode } from "./errors";
import { MayaDatabaseConnection } from "@maya/database";

export type RouteHandler = (server: MayaApiServer, req: express.Request, response: express.Response) => Promise<boolean|undefined>;

export interface ProcessedRoute {
    verb: string;
    route: string;
    handler: RouteHandler;
}

const verbColors: Record<string, chalk.ChalkFunction> = {
    "USE": chalk.grey,
    "GET": chalk.yellow,
    "POST": chalk.magenta,
    "DELETE": chalk.red
};

const statusColors: Record<string, chalk.ChalkFunction> = {
    "100": chalk.grey,
    "200": chalk.green,
    "300": chalk.yellow,
    "400": chalk.magenta,
    "500": chalk.red
};

export function getStatusColor(statusCode: StatusCode) {
    const lowestHundred = ~~(statusCode / 100) * 100;

    return statusColors[lowestHundred.toString()] || chalk.grey;
}

passport.serializeUser((user, cb) => cb(undefined, user as Express.User));
passport.deserializeUser((obj, cb) => cb(undefined, obj as false|Express.User));

passport.use(
    new LichessStrategy({
        clientID: "maya",
        callbackURL: process.env.AUTH_CALLBACK_URL + "/auth/lichess/callback"
    },
    async (accessToken: string, refreshToken: string, profile: any, cb: (err: any, user: any) => void) => {
        try {
            const userGetResponse = await got.get("https://lichess.org/api/account", {
                headers: {
                    Authorization: "Bearer " + accessToken
                }
            }).json();

            cb(undefined, { accessToken, refreshToken, user: userGetResponse });
        } catch (e) {
            console.log(e);
            cb(e, undefined);
        }
    })
);

function normaliseEndpointName(baseRoute: string, endpointName: string) {
    if (endpointName === "index") {
        return baseRoute;
    }

    if (endpointName === "404") {
        return path.join(baseRoute, "*");
    }

    return path.join(baseRoute, endpointName);
}

export async function recursiveGetRoutes(baseRoute: string): Promise<ProcessedRoute[]> {
    const allRoutes: ProcessedRoute[] = [];

    const absolutePath = path.resolve(__dirname, "routes", baseRoute);
    const inDirectory = await fs.readdir(absolutePath);
    inDirectory.sort(fileName => fileName.startsWith("404") ? 1 : -1);
    
    for (const fileName of inDirectory) {
        if (fileName.startsWith("middleware")) {
            const { default: middlewares } = await import(path.join(absolutePath, fileName));

            for (const middleware of middlewares) {
                allRoutes.push({
                    verb: "USE",
                    route: baseRoute.replace(/\$(.+)/g, ":$1").replace(/\\/g, "/") + "*",
                    handler: middleware
                });
            }
        }
    }

    for (const fileName of inDirectory) {
        if (fileName.startsWith("_") || fileName === "middleware")
            continue;

        const pathname = path.resolve(absolutePath, fileName);
        const fileStat = await fs.stat(pathname);

        if (fileStat.isDirectory()) {
            allRoutes.push(...await recursiveGetRoutes(path.join(baseRoute, fileName) + "/"));
        } else if ((fileName.endsWith(".ts") || fileName.endsWith("js")) && !fileName.endsWith(".d.ts")) {
            const [ httpVerb, endpointName ] = path.basename(path.basename(fileName, ".ts"), ".js").split(" ");

            if (!httpVerb || !endpointName)
                continue;

            const { default: routeHandler } = await import(pathname);
            
            allRoutes.push({
                verb: httpVerb,
                route: normaliseEndpointName(baseRoute, endpointName).replace(/\$(.+?)\/?/g, ":$1").replace(/\\/g, "/"),
                handler: routeHandler
            });
        }
    }

    return allRoutes;
}

export interface AccountServerConfig {
    postgres: {
        host: string;
        port: number;
        username: string;
        password: string;
        database: string;
        ssl: "require"|"prefer"|boolean|object;
    };
    redis: {
        host: string;
        port: number;
        password: string|undefined;
    };
    port: number;
}

export class MayaApiServer {
    expressServer: express.Express;
    httpServer?: http.Server;
    discordApi: dapi.REST;

    database: MayaDatabaseConnection;

    constructor(public readonly config: AccountServerConfig) {
        this.expressServer = express();

        this.database = new MayaDatabaseConnection(config.postgres, config.redis);

        this.discordApi = new dapi.REST().setToken(process.env.BOT_TOKEN as string);
    }
    
    private listen() {
        return new Promise<void>(resolve => {
            this.httpServer = this.expressServer.listen(this.config.port, "0.0.0.0");
            this.httpServer.once("listening", () => {
                resolve();
            });
        });
    }

    async start() {
        const begin = process.hrtime.bigint();
        const allRoutes = await recursiveGetRoutes("");
        const took = process.hrtime.bigint();

        console.log("Took " + (Number((took - begin) / BigInt(1000000))) + "ms to register all routes");

        this.expressServer.use(sessions({ secret: "some-secret", resave: true, saveUninitialized: true }));

        for (const route of allRoutes) {
            this.expressServer[route.verb.toLowerCase() as keyof express.Express]("/" + route.route, async (req: express.Request, res: express.Response, next: express.NextFunction) => {
                try {
                    const doNext = await route.handler(this, req, res);

                    if (res.headersSent) {
                        if (res.statusCode === StatusCode.OK) {
                            console.log(`[${(verbColors[req.method] || chalk.grey)(route.verb)}] ${req.path} (${getStatusColor(res.statusCode)(StatusCode[res.statusCode])} ${res.getHeader("Content-Length")}bytes)`);
                        } else {
                            console.log(`[${(verbColors[req.method] || chalk.grey)(route.verb)}] ${req.path} (${getStatusColor(res.statusCode)(StatusCode[res.statusCode])})`);
                        }
                    } else if (doNext) {
                        next();
                    }
                } catch (e) {
                    if (e instanceof ApiError) {
                        if (res.headersSent) {
                            return;
                        }

                        res.status(e.statusCode).json({
                            success: false,
                            ...e.toJSON()
                        });
                        
                        console.log(`[${(verbColors[req.method] || chalk.grey)(route.verb)}] ${req.path} (${getStatusColor(res.statusCode)(StatusCode[res.statusCode])})`);
                        return;
                    }

                    if (res.headersSent) {
                        return;
                    } else {
                        console.log(e);
                        console.log(`[${(verbColors[req.method] || chalk.grey)(route.verb)}] ${req.path} (${getStatusColor(500)("InternalServerError")})`);
                    }
                }
            });
        }
        await this.listen();
    }
}