import dotenv from "dotenv";
import path from "path";
import fs from "fs";

const dotEnvLocation = path.resolve(process.cwd(), ".env");

try {
    fs.statSync(dotEnvLocation);
} catch (e) {
    try {
        fs.writeFileSync(dotEnvLocation, `
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5379
POSTGRES_USER=admin
POSTGRES_PASSWORD=1234
POSTGRES_DB=postgres

BASE_URL=http://localhost:8000

CLIENT_ID=
CLIENT_SECRET=
        `.trim(), "utf8");
    } catch (e) {
        console.log("Could not create .env file");
    }
}

dotenv.config();

import { MayaApiServer } from "../src";

(async () => {
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
        port: parseInt(process.env.PORT || "8000")
    });
    
    (async () => {
        await accountServer.start();
        console.log("Listening on port *:" + accountServer.config.port);
    })();
})();