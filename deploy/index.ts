import express from "express";
import crypto from "crypto";
import path from "path";
import child_process from "child_process";

import dotenv from "dotenv";
dotenv.config();

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

app.use(express.raw());

app.post("/", async (req, res) => {
    if (!req.header("User-Agent")?.startsWith("GitHub-Hookshot/")) {
        console.log("Got deploy POST but the User-Agent did not match:");
        console.log("    " + req.header("User-Agent"));
        return;
    }

    const hmac = crypto.createHmac("sha256", process.env.WEBHOOK_SECRET as string);
    hmac.write(req.body);

    const sha256 = hmac.digest("hex");

    if (sha256 !== req.header("X-Hub-Signature-256")) {
        console.log("Got deploy POST but the signature did not match:");
        console.log("    " + sha256);
        console.log("    " + req.header("X-Hub-Signature-256"));
        return;
    }

    try {
        const json = JSON.parse(req.body.toString("utf8"));

        const currentCommitUntrimmed = await runCommandInDir("git rev-parse HEAD");
        const currentCommit = currentCommitUntrimmed.trim();
    
        if (currentCommit === json.after) {
            console.log("Got deploy POST but the commit was the same as the last");
            return;
        }

        await runCommandInDir("git reset --hard HEAD");
        await runCommandInDir("git pull");

        await runCommandInDir("yarn build", path.resolve(process.cwd(), "..", "api"));
        await runCommandInDir("yarn build", path.resolve(process.cwd(), "..", "database"));
        await runCommandInDir("yarn build", path.resolve(process.cwd(), "..", "deploy"));
        await runCommandInDir("yarn build", path.resolve(process.cwd(), "..", "web"));
        
        await runCommandInDir("pm2 restart all");
    } catch (e) {
        console.log(e);

        console.log("Got deploy POST but couldn't parse body:");
        console.log("    " + req.body.toString("utf8"));
    }
});

app.listen(8002);