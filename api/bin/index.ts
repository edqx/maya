import dotenv from "dotenv";
import path from "path";

dotenv.config({
    path: path.resolve(process.cwd(), "../.env")
});

import { MayaApiServer } from "../src";

(async () => {
    const port = parseInt(process.env.PORT || "8000");

    const accountServer = new MayaApiServer({
        postgres: {
            host: process.env.POSTGRES_HOST as string || "127.0.0.1",
            port: parseInt(process.env.POSTGRES_PORT || "5379"),
            username: process.env.POSTGRES_USER || "admin",
            password: process.env.POSTGRES_PASSWORD || "1234",
            database: process.env.POSTGRES_DATABASE || "postgres",
            ssl: "require"
        },
        redis: {
            host: process.env.REDIS_HOST as string || "127.0.0.1",
            port: parseInt(process.env.REDIS_PORT || "6379"),
            password: process.env.REDIS_PASSWORD as string|undefined
        },
        port
    });
    
    (async () => {
        accountServer.httpServer.once("listening", () => {
            console.log("Listening on port *:" + port);
        });
        await accountServer.start();
    })();
})();