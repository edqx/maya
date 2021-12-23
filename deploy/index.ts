import express from "express";
import crypto from "crypto";
import path from "path";
import child_process from "child_process";

import dotenv from "dotenv";
dotenv.config({
    path: path.resolve(process.cwd(), "../.env")
});

function runCommandInDir(command: string, dir?: string) {
    return new Promise<string>((resolve, reject) => {
        child_process.exec(command, {
            cwd: dir || process.cwd()
        }, (err, stdout) => {
            if (err) {
                reject(err);
                return;
            }
            resolve(stdout);
        });
    });
}

const app = express();

app.use(express.raw({
    inflate: true,
    limit: "100kb",
    type: "*/*"
}));

app.post("/", async (req, res) => {
    if (!req.header("User-Agent")?.startsWith("GitHub-Hookshot/")) {
        console.log("Got deploy POST but the User-Agent did not match:");
        console.log("    " + req.header("User-Agent"));
        return;
    }

    const hmacVerify = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET as string);
    hmacVerify.write(req.body);
    const computedSha256 = hmacVerify.digest();

    const receivedSha256Str = req.header("X-Hub-Signature-256")?.split("=")[1];

    if (!receivedSha256Str) {
        console.log("Got deploy POST but it wasn't signed:");
        console.log("    " + Object.keys(req.headers).join(", "));
        return;
    }

    const receivedSha256 = Buffer.from(receivedSha256Str, "hex");

    if (!crypto.timingSafeEqual(computedSha256, receivedSha256)) {
        console.log("Got deploy POST but the signature did not match:");
        console.log("    " + computedSha256.toString("hex"));
        console.log("    " + receivedSha256.toString("hex"));
        return;
    }

    try {
        const json = JSON.parse(req.body.toString("utf8"));
        
        console.log("Got valid deploy POST, deploying..");

        console.log("Getting current commit..");
        const currentCommitUntrimmed = await runCommandInDir("git rev-parse HEAD");
        const currentCommit = currentCommitUntrimmed.trim();
        
        console.log("    " + currentCommit);
    
        if (currentCommit === json.after) {
            console.log("Got deploy POST but the commit was the same as the last");
            return;
        }

        console.log("Resetting any changes made locally..");
        await runCommandInDir("git reset --hard HEAD");
        console.log("Pulling remote changes..");
        await runCommandInDir("git pull");

        console.log("Building @maya/api..");
        await runCommandInDir("yarn build", path.resolve(process.cwd(), "..", "api"));
        console.log("Building @maya/database..");
        await runCommandInDir("yarn build", path.resolve(process.cwd(), "..", "database"));
        console.log("Building @maya/deploy..");
        await runCommandInDir("yarn build", path.resolve(process.cwd(), "..", "deploy"));
        console.log("Building @maya/web..");
        await runCommandInDir("yarn build", path.resolve(process.cwd(), "..", "web"));
        
        console.log("Restarting pm2 processes..");
        await runCommandInDir("pm2 restart all");

        console.log("Success!");
    } catch (e) {
        console.log("Got deploy POST but encountered an error");
        console.log("   ", e);
    }
});

app.listen(parseInt(process.env.PORT as string) || 8002);