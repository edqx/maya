import discord from "discord.js";
import { MayaBot } from "../MayaBot";

export class BaseCommand {
    buttons: Map<string, discord.MessageButton>;

    constructor(
        public readonly bot: MayaBot,
        public readonly executionId: string,
        public state: any
    ) {
        this.buttons = new Map;
    }
}