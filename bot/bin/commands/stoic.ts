import discord from "discord.js";
import got from "got";

import {
    BaseCommand,
    Command,
    Execution
} from "../../src";

export interface RandomStoicQuoteResponse {
    text: string;
    author: string;
}

@Command({
    name: "stoic",
    version: "1.0.0",
    description: "Get a random quote from a stoic philosopher"
})
export default class GetRandomStoicQuoteCommand extends BaseCommand {
    static stoicAuthorImages: Record<string, string> = {
        "Epictetus": "https://i.imgur.com/OmHdT8N.png",
        "Seneca": "https://i.imgur.com/FEfpnny.jpg",
        "Marcus Aurelius": "https://i.imgur.com/kSsir7v.jpg",
        "Cleanthes": "https://i.imgur.com/2b7rfeJ.jpg"
    };

    @Execution()
    async onExec(interaction: discord.CommandInteraction) {
        try {
            const randomQuote: RandomStoicQuoteResponse = await got.get("https://stoic-quotes.com/api/quote").json();
    
            const embed = new discord.MessageEmbed()
                .setThumbnail(GetRandomStoicQuoteCommand.stoicAuthorImages[randomQuote.author])
                .setTitle(`Stoic Quote — ${randomQuote.author}`)
                .setDescription(`‟${randomQuote.text}”`);
    
            interaction.reply({
                embeds: [ embed ]
            });
        } catch (e: any) {
            if (e instanceof got.HTTPError) {
                const embed = new discord.MessageEmbed()
                    .setColor(0xed4245)
                    .setTitle("Stoic Quote")
                    .setDescription(`There was an error fetching a stoic quote (**${e.response.statusCode}**)`);
                    
                return interaction.reply({
                    embeds: [ embed ]
                });
            }

            const embed = new discord.MessageEmbed()
                .setColor(0xed4245)
                .setTitle("Stoic Quote")
                .setDescription(`There was an error fetching a stoic quote`)
                .addField("Error", "`" + e.toString() + "`");

            if (e.stack) {
                embed.addField("Stack Trace", "```" + e.stack + "```");
            }
        }
    }
}

