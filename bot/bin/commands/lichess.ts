import discord from "discord.js";
import got from "got";

import * as dtypes from "discord-api-types/v9";

import {
    BaseCommand,
    Command,
    Components,
    Execution
} from "../../src";

export interface LichessCommandState {
    challengerId: string;
    targetId: string;
    variant: string;
    time: number;
    increment: number;
    color: string;
    rated: boolean;
}

@Command({
    name: "lichess",
    description: "Challenge a user to a game of lichess",
    version: "1.0.0",
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
})
export default class LichessCommand extends BaseCommand {
    state!: LichessCommandState;

    @Components.Button("Accept", "SUCCESS")
    async onAccept(interaction: discord.ButtonInteraction) {
        if (interaction.user.id !== this.state.targetId) {
            return await interaction.reply({
                content: `You're not <@${this.state.targetId}>, idiot.`,
                ephemeral: true
            });
        }

        const challengerLichessConnection = await this.bot.database.getAccountConnection(this.state.challengerId, "lichess");
        const targetLichessConnection = await this.bot.database.getAccountConnection(this.state.targetId, "lichess");

        try {
            if (challengerLichessConnection) {
                const challengerToken = await this.bot.database.getAccessToken(challengerLichessConnection);

                if (targetLichessConnection) {
                    const targetToken = await this.bot.database.getAccessToken(targetLichessConnection);
                    const res: any = await got.post(`https://lichess.org/api/challenge/${targetLichessConnection.user_id}`, {
                        headers: {
                            Authorization: `Bearer ${challengerToken}`,
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: `acceptByToken=${encodeURIComponent(targetToken)}&rated=${this.state.rated}${this.state.time && this.state.increment ? `&clock.limit=${this.state.time}&clock.increment=${this.state.increment}` : ""}&color=${this.state.color}&variant=${this.state.variant}`
                    }).json();

                    const gameEmbed = new discord.MessageEmbed()
                        .setTitle("Lichess Challenge")
                        .setDescription(`<@${this.state.targetId}> has accepted your challenge! Join here: ${res.game.url}`);

                    await interaction.reply({
                        content: `<@${this.state.challengerId}>`,
                        embeds: [ gameEmbed ]
                    });
                } else {
                    const res: any = await got.post(`https://lichess.org/api/challenge/maya-bot-random-string-lol-maybe`, {
                        headers: {
                            Authorization: `Bearer ${challengerToken}`,
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: `rated=${this.state.rated}${this.state.time && this.state.increment ? `&clock.limit=${this.state.time}&clock.increment=${this.state.increment}` : ""}&color=${this.state.color}&variant=${this.state.variant}`
                    }).json();

                    const challengeEmbed = new discord.MessageEmbed()
                        .setTitle("Lichess Challenge")
                        .setDescription(`Created challenge! Join here: ${res.challenge.url}`);

                    await interaction.reply({
                        embeds: [ challengeEmbed ]
                    });
                    
                    const linkAccountEmbed = new discord.MessageEmbed()
                        .setTitle("Link Account")
                        .setDescription(`Consider linking a lichess account [here](${process.env.BASE_WEB}) to quickly accept challenges.`);
        
                    await interaction.followUp({
                        embeds: [ linkAccountEmbed ],
                        ephemeral: true
                    });
                }
            } else {
                if (targetLichessConnection) {
                    const color = this.state.color === "random"
                        ? this.state.color
                        : this.state.color === "black" ? "white" : "black";

                    const targetToken = await this.bot.database.getAccessToken(targetLichessConnection);
                    const res: any = await got.post(`https://lichess.org/api/challenge/maya-bot-random-string-lol-maybe`, {
                        headers: {
                            Authorization: `Bearer ${targetToken}`,
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: `rated=${this.state.rated}${this.state.time && this.state.increment ? `&clock.limit=${this.state.time}&clock.increment=${this.state.increment}` : ""}&color=${color}&variant=${this.state.variant}`
                    }).json();

                    const gameEmbed = new discord.MessageEmbed()
                        .setTitle("Lichess Challenge")
                        .setDescription(`<@${this.state.targetId}> has accepted your challenge! Join here: ${res.challenge.url}`);

                    await interaction.reply({
                        content: `<@${this.state.challengerId}>`,
                        embeds: [ gameEmbed ]
                    });
                } else {
                    const res: any = await got.post(`https://lichess.org/api/challenge/open`, {
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded"
                        },
                        body: `rated=${this.state.rated}${this.state.time && this.state.increment ? `&clock.limit=${this.state.time}&clock.increment=${this.state.increment}` : ""}&variant=${this.state.variant}`
                    }).json();

                    const gameEmbed = new discord.MessageEmbed()
                        .setTitle("Lichess Challenge")
                        .setDescription(`<@${this.state.targetId}> has accepted your challenge! Join here: ${res.challenge.url}`);

                    await interaction.reply({
                        content: `<@${this.state.challengerId}>`,
                        embeds: [ gameEmbed ]
                    });

                    const linkAccountEmbed = new discord.MessageEmbed()
                        .setTitle("Link Account")
                        .setDescription(`Consider linking a lichess account [here](${process.env.BASE_WEB}) to quickly accept challenges.`);
        
                    await interaction.followUp({
                        embeds: [ linkAccountEmbed ],
                        ephemeral: true
                    });
                }
            }
        } catch (e: any) {
            if (e instanceof got.HTTPError) {
                console.log("Error creating lichess game: " + (e.response.body as any).toString());
                const errorEmbed = new discord.MessageEmbed()
                    .setTitle("Lichess Challenge")
                    .setColor(0xed4245)
                    .setDescription("Got an error while trying to create the game: " + e.response.statusCode);

                if (targetLichessConnection) {
                    await interaction.reply({
                        embeds: [ errorEmbed ]
                    });
                } else {
                    await interaction.followUp({
                        embeds: [ errorEmbed ]
                    });
                }
                return;
            }

            throw e;
        }
    }
    
    @Components.Button("Decline/Cancel", "DANGER")
    async onDecline(interaction: discord.ButtonInteraction) {
        if (interaction.user.id === this.state.challengerId) {
            const cancelEmbed = new discord.MessageEmbed()
                .setTitle("Lichess Challenge")
                .setDescription(`<@${interaction.user.id}> sent you a challenge but they canceled it.`);

            await interaction.update({
                content: `<@${this.state.targetId}>`,
                embeds: [ cancelEmbed ],
                components: []
            })
        } else if (interaction.user.id === this.state.targetId) {
            const declineEmbed = new discord.MessageEmbed()
                .setTitle("Lichess Challenge")
                .setDescription(`<@${interaction.user.id}> sent you a challenge but you declined it.`);
                
            await interaction.update({
                content: `<@${this.state.targetId}>`,
                embeds: [ declineEmbed ],
                components: []
            })
        }
    }

    @Execution()
    async onExec(interaction: discord.CommandInteraction) {
        const acceptButton = this.buttons.get("accept")!;
        const declineButton = this.buttons.get("decline-cancel")!;

        const targetUser = interaction.options.getUser("user", true);
        const variant = interaction.options.getString("variant", false) || "standard";
        const time = interaction.options.getNumber("time", false) || 0;
        const increment = interaction.options.getNumber("increment", false) || 0;
        const color = interaction.options.getString("color", false) || "random";
        const rated = interaction.options.getBoolean("rated", false) || false;

        const challengerLichessConnection = await this.bot.database.getAccountConnection(interaction.user.id, "lichess");

        const challengeEmbed = new discord.MessageEmbed()
            .setTitle("Lichess Challenge");

        if (challengerLichessConnection) {
            challengeEmbed.setDescription(`<@${interaction.user.id}> ([${challengerLichessConnection.user_id}](https://lichess.org/@/${challengerLichessConnection.user_id})) has challenged you to a Lichess game!`);
        } else {
            challengeEmbed.setDescription(`<@${interaction.user.id}> has challenged you to a Lichess game!`);
        }

        this.state = {
            challengerId: interaction.user.id,
            targetId: targetUser.id,
            variant,
            time,
            increment,
            color,
            rated
        };

        const componentRow = new discord.MessageActionRow()
            .addComponents(acceptButton, declineButton);

        const message = await interaction.reply({
            content: `<@${targetUser.id}>`,
            embeds: [ challengeEmbed ],
            components: [ componentRow ]
        });
        
        if (!challengerLichessConnection) {
            const linkAccountEmbed = new discord.MessageEmbed()
                .setTitle("Link Account")
                .setDescription(`Consider linking a lichess account [here](${process.env.BASE_WEB}) to quickly send challenges.`);

            await interaction.followUp({
                embeds: [ linkAccountEmbed ],
                ephemeral: true
            });
        }
    }
}

