import discord from "discord.js";
import got from "got";

import * as dtypes from "discord-api-types/v9";
import { MayaDatabaseConnection } from "@maya/database";
import { REST } from "@discordjs/rest";

const commands: dtypes.RESTPutAPIApplicationCommandsJSONBody = [
    {
        name: "lichess",
        description: "Challenge a user to a game of lichess",
        options: [
            {
                type: dtypes.ApplicationCommandOptionType.User,
                name: "user",
                description: "The user to play a game against",
                required: true
            },
            {
                type: dtypes.ApplicationCommandOptionType.String,
                name: "variant",
                description: "The variant of chess to play",
                choices: [
                    {
                        name: "Standard",
                        value: "standard"
                    },
                    {
                        name: "Chess 960",
                        value: "chess960"
                    },
                    {
                        name: "Crazyhouse",
                        value: "crazyhouse"
                    },
                    {
                        name: "Anti Chess",
                        value: "antichess"
                    },
                    {
                        name: "Atomic",
                        value: "atomic"
                    },
                    {
                        name: "Horde",
                        value: "horde"
                    },
                    {
                        name: "King of the Hill",
                        value: "kingOfTheHill"
                    },
                    {
                        name: "Racing Kings",
                        value: "racingKings"
                    },
                    {
                        name: "Three Check",
                        value: "threeCheck"
                    }
                ],
                required: false
            },
            {
                type: dtypes.ApplicationCommandOptionType.Number,
                name: "time",
                description: "The initial time for both parties in minutes, or 'None' for a correspondence game. Default: 'None'",
                choices: [
                    {
                        name: "None",
                        value: 0
                    },
                    {
                        name: "1/4",
                        value: 0.25
                    },
                    {
                        name: "1/2",
                        value: 0.5
                    },
                    {
                        name: "3/4",
                        value: 0.75
                    },
                    {
                        name: "1",
                        value: 1
                    },
                    {
                        name: "1.5",
                        value: 1.5
                    },
                    {
                        name: "2",
                        value: 2
                    },
                    {
                        name: "3",
                        value: 3
                    },
                    {
                        name: "5",
                        value: 5
                    },
                    {
                        name: "10",
                        value: 10
                    },
                    {
                        name: "15",
                        value: 15
                    },
                    {
                        name: "20",
                        value: 20
                    },
                    {
                        name: "25",
                        value: 25
                    },
                    {
                        name: "30",
                        value: 30
                    },
                    {
                        name: "40",
                        value: 40
                    },
                    {
                        name: "60",
                        value: 60
                    },
                    {
                        name: "90",
                        value: 90
                    },
                    {
                        name: "120",
                        value: 120
                    },
                    {
                        name: "180",
                        value: 180
                    }
                ],
                required: false
            },
            {
                type: dtypes.ApplicationCommandOptionType.Number,
                name: "increment",
                description: "The time increment for both parties in seconds, or 'None' for a correspondence game. Default: 'None'",
                required: false
            },
            {
                type: dtypes.ApplicationCommandOptionType.String,
                name: "color",
                description: "The piece color that you will play as",
                choices: [
                    {
                        name: "Random",
                        value: "random"
                    },
                    {
                        name: "Black",
                        value: "black"
                    },
                    {
                        name: "White",
                        value: "white"
                    }
                ],
                required: false
            },
            {
                type: dtypes.ApplicationCommandOptionType.Boolean,
                name: "rated",
                description: "Whether or not the game is rated",
                required: false
            }
        ]
    },
    {
        name: "stoic",
        description: "Get a random quote from a stoic philosopher"
    },
    {
        name: "bible",
        description: "Get a bible verse",
        options: [
            {
                type: dtypes.ApplicationCommandOptionType.String,
                name: "book",
                description: "Book of the bible to fetch a verse from",
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
];

const rest = new REST({ version: "9" }).setToken(process.env.BOT_TOKEN as string);

const stoicAuthorImages: Record<string, string> = {
    "Epictetus": "https://i.imgur.com/OmHdT8N.png",
    "Seneca": "https://i.imgur.com/FEfpnny.jpg",
    "Marcus Aurelius": "https://i.imgur.com/kSsir7v.jpg",
    "Cleanthes": "https://i.imgur.com/2b7rfeJ.jpg"
};

export interface BibleVerseResponse {
    book_id: string;
    book_name: string;
    chapter: number;
    verse: number;
    text: string;
}

export interface BibleResponse {
    reference: string;
    verses: BibleVerseResponse[];
    text: string;
    translation_id: string;
    translation_name: string;
    translation_note: string;
}

export interface LichessChallenge {
    challenged: string;
    challengeId: string;
}

const lichessChallengeMessages: Map<string, LichessChallenge> = new Map;

function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const out = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        out.push(array.slice(i, i + chunkSize));
    }
    return out;
}

function renderBibleVerses(verses: BibleVerseResponse[]) {
    if (verses.length === 0) {
        return new discord.MessageEmbed()
            .setColor(0xed4245)
            .setTitle("Bible Error")
            .setDescription("No verses found");
    }

    const embed = new discord.MessageEmbed()
        .setTitle(verses[0].book_name);

    for (const verse of verses) {
        embed.addField(verse.book_name + " " + verse.chapter + ":" + verse.verse, verse.text, false);
    }
    
    return embed;
}

const cachedResponses: Map<string, { expiresAt: number; data: any }> = new Map;
async function getBibleVerses(book: string, verses: string) {
    const cachedResponse = cachedResponses.get(`${book} ${verses}`);
    if (cachedResponse) {
        if (Date.now() > cachedResponse.expiresAt) {
            cachedResponses.delete(`${book} ${verses}`);
        } else {
            return cachedResponse.data as BibleVerseResponse[];
        }
    }

    const bibleResponse: { error: string }|BibleResponse = await got.get(`https://bible-api.com/${book} ${verses}`).json();

    if ("error" in bibleResponse) {
        return bibleResponse;
    }

    cachedResponses.set(`${book} ${verses}`, {
        expiresAt: Date.now() + 30000,
        data: bibleResponse.verses
    });
    return bibleResponse.verses;
}
setInterval(() => {
    for (const [ verseRef, cachedResponse ] of cachedResponses) {
        if (Date.now() > cachedResponse.expiresAt) {
            cachedResponses.delete(verseRef);
        }
    }
}, 30000);

(async () => {
    const client = new discord.Client({
        intents: [
            discord.Intents.FLAGS.GUILDS
        ]
    });

    const database = new MayaDatabaseConnection({
        host: process.env.POSTGRES_HOST as string || "127.0.0.1",
        port: parseInt(process.env.POSTGRES_PORT || "5379"),
        username: process.env.POSTGRES_USER || "admin",
        password: process.env.POSTGRES_PASSWORD || "1234",
        database: process.env.POSTGRES_DATABASE || "postgres"
    },
    {
        host: process.env.REDIS_HOST as string || "127.0.0.1",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD as string|undefined
    });

    console.log("Logging in..");

    await client.login(process.env.BOT_TOKEN as string);

    console.log("Logged in!");

    if (!client.isReady())
       return;

    await rest.put(
        dtypes.Routes.applicationGuildCommands(client.application.id, process.env.GUILD_ID as string),
        {
            body: commands
        }
    );

    console.log("Client is ready!");

    client.on("interactionCreate", async interaction => {
        if (interaction.guildId !== process.env.GUILD_ID)
            return;

        if (interaction.isButton()) {
            if (interaction.customId.startsWith("next_verse_")) {
                const [ ,,book, verses, currentPageStr ] = interaction.customId.split("_");
                    
                const bibleResponse = await getBibleVerses(book, verses);

                if ("error" in bibleResponse) {
                    const embed = new discord.MessageEmbed()
                        .setColor(0xed4245)
                        .setTitle("Bible Error")
                        .setDescription("No verses found");

                    await interaction.update({
                        embeds: [ embed ]
                    });

                    return;
                }
                
                const chunkedVerses = chunkArray(bibleResponse, 5);
                const page = parseInt(currentPageStr);

                const previousButton = new discord.MessageButton()
                    .setStyle(1)
                    .setLabel("Previous")
                    .setCustomId(`previous_verse_${book}_${verses}_${page - 1}`)
                    .setDisabled(page === 0);
                    
                const nextButton = new discord.MessageButton()
                    .setStyle(1)
                    .setLabel("Next")
                    .setCustomId(`next_verse_${book}_${verses}_${page + 1}`)
                    .setDisabled(page + 1 >= chunkedVerses.length);
                    
                const buttonRow = new discord.MessageActionRow()
                    .addComponents(previousButton, nextButton);

                interaction.update({
                    embeds: [ renderBibleVerses(chunkedVerses[page]) ],
                    components: [ buttonRow ]
                });
            } else if (interaction.customId.startsWith("previous_verse_")) {
                const [ ,,book, verses, currentPageStr ] = interaction.customId.split("_");
                    
                const bibleResponse = await getBibleVerses(book, verses);

                if ("error" in bibleResponse) {
                    const embed = new discord.MessageEmbed()
                        .setColor(0xed4245)
                        .setTitle("Bible Error")
                        .setDescription("No verses found");

                    await interaction.update({
                        embeds: [ embed ]
                    });

                    return;
                }
                
                const chunkedVerses = chunkArray(bibleResponse, 5);
                const page = parseInt(currentPageStr);

                const previousButton = new discord.MessageButton()
                    .setStyle(1)
                    .setLabel("Previous")
                    .setCustomId(`previous_verse_${book}_${verses}_${page - 1}`)
                    .setDisabled(page === 0);
                    
                const nextButton = new discord.MessageButton()
                    .setStyle(1)
                    .setLabel("Next")
                    .setCustomId(`next_verse_${book}_${verses}_${page + 1}`)
                    .setDisabled(page + 1 >= chunkedVerses.length);
                    
                const buttonRow = new discord.MessageActionRow()
                    .addComponents(previousButton, nextButton);

                interaction.update({
                    embeds: [ renderBibleVerses(chunkedVerses[page]) ],
                    components: [ buttonRow ]
                });
            } else if (interaction.customId.startsWith("accept_challenge")) {
                
            } else if (interaction.customId.startsWith("decline_challenge")) {
                const [,, challengerId, destId ] = interaction.customId.split("_");

                if (interaction.user.id !== challengerId && interaction.user.id !== destId) {
                    interaction.reply({
                        content: "You can't decline a challenge that isn't yours.",
                        ephemeral: true
                    });
                    return;
                }
                
                const lichessConnectionChallenger = await database.getAccountConnection(challengerId, "lichess");
                const lichessConnectionDest = await database.getAccountConnection(destId, "lichess");

                if (interaction.user.id === challengerId) {
                    const embed = new discord.MessageEmbed()
                        .setTitle("Lichess");

                    if (lichessConnectionChallenger) {
                        embed.setDescription(`<@${challengerId}> ([@${lichessConnectionChallenger.user_id}](https://lichess.org/@/${lichessConnectionChallenger.user_id})) canceled the challenge`);
                    } else {
                        embed.setDescription(`<@${challengerId}> canceled the challenge`);
                    }
                        
                    await interaction.update({
                        content: "<@" + destId + ">, ",
                        embeds: [ embed ],
                        components: []
                    });
                } else {
                    const embed = new discord.MessageEmbed()
                        .setTitle("Lichess");
                        
                    if (lichessConnectionChallenger) {
                        embed.setDescription(`<@${challengerId}> ([@${lichessConnectionChallenger.user_id}](https://lichess.org/@/${lichessConnectionChallenger.user_id})) sent a challenge that you declined`);
                    } else {
                        embed.setDescription(`<@${challengerId}> sent a challenge that you declined`);
                    }
                        
                    await interaction.update({
                        content: "<@" + destId + ">, ",
                        embeds: [ embed ],
                        components: []
                    });
                }
            }
            return;
        }

        if (!interaction.isCommand())
            return;

        if (interaction.commandName === "lichess") {
            const user = interaction.options.getUser("user", true);
            const variant = interaction.options.getString("variant", false) || "standard";
            const time = interaction.options.getNumber("time", false) || 0;
            const increment = interaction.options.getNumber("increment", false) || 0;
            const color = interaction.options.getString("color", false) || "random";
            const rated = interaction.options.getBoolean("rated", false) || false;

            const lichessConnectionChallenger = await database.getAccountConnection(interaction.user.id, "lichess");
            const lichessConnectionDest = await database.getAccountConnection(user.id, "lichess");
            
            const challengerAccessToken = lichessConnectionChallenger
                ? await database.getAccessToken(lichessConnectionChallenger)
                : undefined;

            const apiChallengeUser = lichessConnectionDest
                ? lichessConnectionDest.user_id
                : "iamgoingtofartalotprobably"; // workaround to create an open-ended challenge: https://github.com/ornicar/lila/issues/10251

            /*const challenge: any = await got.post("https://lichess.org/api/challenge/", {
                headers: {
                    Authorization: "Bearer " + challengerAccessToken
                }
            }).json();*/

            const embed = new discord.MessageEmbed()
                .setTitle("Lichess");

            if (lichessConnectionChallenger) {
                embed.setDescription(`<@${interaction.user.id}> ([@${lichessConnectionChallenger.user_id}](https://lichess.org/@/${lichessConnectionChallenger.user_id})) \
has challenged you to a game!`);
            } else {
                embed.setDescription(`<@${interaction.user.id}> has challenged you to a game!`);
            }

            if (!lichessConnectionDest) {
                embed.addField("Link your Account", `Consider linking your lichess account to discord, ${process.env.BASE_WEB as string + "/account/connections"}`);
            }
            
            const acceptButton = new discord.MessageButton()
                .setStyle("SUCCESS")
                .setLabel("Accept")
                .setCustomId(`accept_challenge_${interaction.user.id}_${user.id}_${variant}_${time}_${increment}_${color}_${rated}`);
                
            const declineButton = new discord.MessageButton()
                .setStyle("DANGER")
                .setLabel("Decline/Cancel")
                .setCustomId(`decline_challenge_${interaction.user.id}_${user.id}`);

            const buttonRow = new discord.MessageActionRow()
                .addComponents(acceptButton, declineButton);

            await interaction.reply({
                content: "<@" + user + ">, ",
                embeds: [ embed ],
                components: [ buttonRow ]
            });
        } else if (interaction.commandName === "stoic") {
            const randomQuote: { text: string; author: string } = await got.get("https://stoic-quotes.com/api/quote").json();

            const embed = new discord.MessageEmbed()
                .setThumbnail(stoicAuthorImages[randomQuote.author])
                .setTitle("Stoic Quote")
                .setDescription("‟" + randomQuote.text + "” — **" + randomQuote.author + "**");

            interaction.reply({
                embeds: [ embed ]
            });
        } else if (interaction.commandName === "bible") {
            const book = interaction.options.getString("book", true);
            const verses = interaction.options.getString("verses", true);

            const bibleResponse = await getBibleVerses(book, verses);

            if ("error" in bibleResponse) {
                const embed = new discord.MessageEmbed()
                    .setColor(0xed4245)
                    .setTitle("Bible Error")
                    .setDescription("No verses found");

                await interaction.reply({
                    embeds: [ embed ]
                });

                return;
            }

            const chunkedVerses = chunkArray(bibleResponse, 5);

            const previousButton = new discord.MessageButton()
                .setStyle("PRIMARY")
                .setLabel("Previous")
                .setCustomId(`previous_verse_${book}_${verses}_0`)
                .setDisabled(true);
            
            const nextButton = new discord.MessageButton()
                .setStyle("PRIMARY")
                .setLabel("Next")
                .setCustomId(`next_verse_${book}_${verses}_1`)
                .setDisabled(chunkedVerses.length === 1);

            const buttonRow = new discord.MessageActionRow()
                .addComponents(previousButton, nextButton);

            const message = await interaction.reply({
                embeds: [ renderBibleVerses(chunkedVerses[0]) ],
                components: [ buttonRow ],
                fetchReply: true
            });
        }
    });
})();