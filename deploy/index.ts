import express from "express";
import crypto from "crypto";
import path from "path";
import discord from "discord.js";
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

const appsToBuild = [ "@maya/api", "@maya/database", "@maya/deploy", "@maya/web" ];

const webhookClient = new discord.WebhookClient({ id: process.env.DISCORD_WEBHOOK_ID as string, token: process.env.DISCORD_WEBHOOK_TOKEN as string });

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
        
        console.log("Getting current commit..");
        const currentCommitUntrimmed = await runCommandInDir("git rev-parse HEAD");
        const currentCommit = currentCommitUntrimmed.trim();
        
        console.log("    " + currentCommit);
    
        if (currentCommit === json.after) {
            console.log("Got deploy POST but the commit was the same as the last");
            return;
        }

        try {
            console.log("Got valid deploy POST, deploying..");
    
            console.log("Resetting any changes made locally..");
            await runCommandInDir("git reset --hard HEAD");
            console.log("Pulling remote changes..");
            await runCommandInDir("git pull");

            throw new Error("testing");
    
            console.log(`"Building ${appsToBuild.map(app => `@maya/${app}`).join(",")} (${appsToBuild.length})..`);
            await Promise.all(appsToBuild.map((app, i) => {
                return runCommandInDir("yarn build", path.resolve(process.cwd(), "..", app))
                    .then(() => console.log(`(${i + 1}) Built @maya/${app}!`));
            }));
            
            console.log("Success!");
    
            console.log("Restarting pm2 processes..");
            await runCommandInDir("pm2 restart all");
        } catch (e: any) {
            console.log("Got deploy POST but encountered an error");
            console.log("   ", e);

            const embed = new discord.MessageEmbed()
                .setTitle("🌹 Deployment Failed")
                .setColor(0xed4245)
                .setDescription(`Couldn't deploy latest commit [\`${json.after}\`](https://github.com/edqx/maya/commit/${json.after})`);

            try {
                embed
                    .addField("Error", e.toString())
                    .addField("Stack Trace", e.stack);
            } catch (e) {
                embed
                    .addField("Error", "Couldn't get error")
                    .addField("Error", "Couldn't get stack trace");
            }

            webhookClient.send({ embeds: [ embed ] });
        }
    } catch (e) {
        console.log("Got deploy POST but encountered an error");
        console.log("   ", e);
    }
});

const port = parseInt(process.env.PORT as string) || 8002;
app.listen(port, () => {
    console.log("Listening on *:" + port);
});