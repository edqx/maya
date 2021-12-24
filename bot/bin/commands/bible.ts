import discord from "discord.js";
import got from "got";

import * as dtypes from "discord-api-types/v9";

import {
    BaseCommand,
    Command,
    Components,
    Execution,
    MayaBot
} from "../../src";

import { chunkArray } from "../util/chunkArray";

export interface BibleVerse {
    bookname: string;
    chapter: string;
    verse: string;
    text: string;
}

export interface BibleResponseError {
    error: string;
}

export type BibleResponse = BibleVerse[] | BibleResponseError;

export interface BibleState {
    currentPage: number;
    book: string;
    verses: string;
}

const allValidBooks = new Set([
    "Acts", "Amos", "1 Chronicles", "2 Chronicles", "Colossians", "1 Corinthians", "2 Corinthians", "Daniel",
    "Deuteronomy", "Ecclesiastes", "Ephesians", "Esther", "Exodus", "Ezekiel", "Ezra", "Galatians", "Genesis",
    "Habakkuk", "Haggai", "Hebrews", "Hosea", "Isaiah", "James", "Jeremiah", "Job", "Joel", "John", "1 John",
    "2 John", "3 John", "Jonah", "Joshua", "Jude", "Judges", "1 Kings", "2 Kings", "Lamentations", "Leviticus",
    "Luke", "Malachi", "Mark", "Matthew", "Micah", "Nahum", "Nehemiah", "Numbers", "Obadiah", "1 Peter", "2 Peter",
    "Philemon", "Philippians", "Proverbs", "Psalms", "Revelation", "Romans", "Ruth", "1 Samuel", "2 Samuel", "Song of Solomon",
    "1 Thessalonians", "2 Thessalonians", "1 Timothy", "2 Timothy", "Titus", "Zechariah", "Zephaniah"
]);

@Command({
    name: "bible",
    version: "1.0.0",
    description: "Read from holy scripture",
    options: [
        {
            type: dtypes.ApplicationCommandOptionType.Subcommand,
            name: "random",
            description: "Get a random verse"
        },
        {
            type: dtypes.ApplicationCommandOptionType.Subcommand,
            name: "read",
            description: "Get a verse or several verses",
            options: [
                {
                    type: dtypes.ApplicationCommandOptionType.String,
                    name: "book",
                    description: "The book to read from",
                    required: true
                },
                {
                    type: dtypes.ApplicationCommandOptionType.String,
                    name: "verses",
                    description: "The verse(s) to retrieve",
                    required: true
                }
            ]
        }
    ]
})
export default class GetBibleVersesCommand extends BaseCommand {
    static cachedResponses: Map<string, { expiresAt: number; data: any }> = new Map;

    constructor(
        public readonly bot: MayaBot,
        public readonly executionId: string,
        public state: BibleState
    ) {
        super(bot, executionId, state);
    }

    async getBibleVerses(book: "random"): Promise<BibleVerse[]|undefined>;
    async getBibleVerses(book: string, verses: string): Promise<BibleVerse[]|undefined>;
    async getBibleVerses(book: string, verses?: string) {
        const cachedResponse = GetBibleVersesCommand.cachedResponses.get(`${book} ${verses}`);
        if (cachedResponse) {
            if (Date.now() > cachedResponse.expiresAt) {
                GetBibleVersesCommand.cachedResponses.delete(`${book} ${verses}`);
            } else {
                return cachedResponse.data as BibleVerse[];
            }
        }

        try {
            const bibleResponse: BibleResponse = book === "random"
                ? await got.get(`https://labs.bible.org/api/?passage=random&type=json`).json()
                : await got.get(`https://labs.bible.org/api/?passage=${encodeURIComponent(book)}%20${verses}&type=json`).json();

            if ("error" in bibleResponse) {
                return undefined;
            }

            if (book !== "random") {
                GetBibleVersesCommand.cachedResponses.set(`${book} ${verses}`, {
                    expiresAt: Date.now() + 30000,
                    data: bibleResponse
                });
            }

            return bibleResponse;
        } catch (e: any) {
            if (e instanceof got.HTTPError) {
                return undefined;
            }

            throw e;
        }
    }

    renderBibleVerses(verses: BibleVerse[]) {
        if (verses.length === 0) {
            return new discord.MessageEmbed()
                .setColor(0xed4245)
                .setTitle("Bible Error")
                .setDescription("No verses found");
        }
    
        const embed = new discord.MessageEmbed()
            .setTitle(verses[0].bookname)
            .setFooter("Bible data from https://labs.bible.org/");
    
        for (const verse of verses) {
            embed.addField(`${verse.bookname} ${verse.chapter}:${verse.verse}`, verse.text.trim(), false);
        }
        
        return embed;
    }

    async renderMessage(interaction: discord.CommandInteraction|discord.ButtonInteraction) {
        const bibleResponse = await this.getBibleVerses(this.state.book, this.state.verses);

        if (!bibleResponse) {
            const embed = new discord.MessageEmbed()
                .setColor(0xed4245)
                .setTitle("Bible Error")
                .setDescription("Couldn't get those verses, either they don't exist or I got an error");

            await interaction.reply({
                embeds: [ embed ]
            });

            return;
        }
        
        const chunkedVerses = chunkArray(bibleResponse, 5);
        const sendOptions: discord.InteractionReplyOptions = {
            embeds: [ this.renderBibleVerses(chunkedVerses[this.state.currentPage]) ]
        }

        if (chunkedVerses.length > 1) {
            const previousButton = this.buttons.get("previous")!;
            const nextButton = this.buttons.get("next")!;
    
            previousButton.setDisabled(this.state.currentPage === 0);
            nextButton.setDisabled(this.state.currentPage === chunkedVerses.length - 1);

            const buttonRow = new discord.MessageActionRow()
                .addComponents(previousButton, nextButton);

            sendOptions.components = [ buttonRow ];
        }

        if ("update" in interaction) {
            interaction.update(sendOptions);
        } else {
            interaction.reply(sendOptions);
        }
    }

    @Components.Button("Previous", "PRIMARY")
    async onPreviousVerse(interaction: discord.ButtonInteraction) {
        this.state.currentPage--;
        await this.renderMessage(interaction);
    }

    @Components.Button("Next", "PRIMARY")
    async onNextVerse(interaction: discord.ButtonInteraction) {
        this.state.currentPage++;
        await this.renderMessage(interaction);
    }

    @Execution("read")
    async onReadVerses(interaction: discord.CommandInteraction) {
        const bookInput = interaction.options.getString("book", true);
        const versesInput = interaction.options.getString("verses", true);
        
        if (!allValidBooks.has(bookInput)) {
            const embed = new discord.MessageEmbed()
                .setColor(0xed4245)
                .setTitle("Bible Error")
                .setDescription(`There's no book in the bible called '${bookInput}'`)
                .addField("Valid Books", `Choose from any of the following: ${[...allValidBooks].map(bookName => `**${bookName}**`).join(", ")}`);

            await interaction.reply({
                embeds: [ embed ]
            });
            return;
        }

        if (!/^\d+\:\d+(\-\d+(\:\d+)?)?$/.test(versesInput)) {
            const embed = new discord.MessageEmbed()
                .setColor(0xed4245)
                .setTitle("Bible Error")
                .setDescription(`Bad verse range: \`${versesInput}\``)
                .addField("Usage", `Should be in the format of \`chapter:verse[-[end_chapter:]end_verse]\``);

            await interaction.reply({
                embeds: [ embed ]
            });
            return;
        }

        this.state = {
            currentPage: 0,
            book: bookInput,
            verses: versesInput
        };

        await this.renderMessage(interaction);
    }

    @Components.Button("Another", "PRIMARY")
    async onAnotherRandomVerse(interaction: discord.ButtonInteraction) {
        const bibleResponse = await this.getBibleVerses("random");
        
        if (!bibleResponse || "error" in bibleResponse) {
            const embed = new discord.MessageEmbed()
                .setColor(0xed4245)
                .setTitle("Bible Error")
                .setDescription("Couldn't get a random verse because of some error");

            await interaction.reply({
                embeds: [ embed ]
            });

            return;
        }

        await interaction.update({
            embeds: [ this.renderBibleVerses(bibleResponse) ]
        });
    }

    @Execution("random")
    async onRandom(interaction: discord.CommandInteraction) {
        const bibleResponse = await this.getBibleVerses("random");
        
        if (!bibleResponse || "error" in bibleResponse) {
            const embed = new discord.MessageEmbed()
                .setColor(0xed4245)
                .setTitle("Bible Error")
                .setDescription("Couldn't get a random verse because of some error");

            await interaction.reply({
                embeds: [ embed ]
            });

            return;
        }

        const anotherButton = this.buttons.get("another")!;

        const buttonRow = new discord.MessageActionRow()
            .addComponents(anotherButton);

        await interaction.reply({
            embeds: [ this.renderBibleVerses(bibleResponse) ],
            components: [ buttonRow ]
        });
    }
}

