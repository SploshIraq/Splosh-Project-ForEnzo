require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

client.on('error', (error) => {
  console.error('Discord client error:', error);
});

client.commands = new Collection();

for (const file of fs.readdirSync(path.join(__dirname, 'handlers')).filter((entry) => entry.endsWith('.js')).sort()) {
  require(path.join(__dirname, 'handlers', file))(client);
}

const ticketDir = path.join(__dirname, 'slashcommand27', 'Ticket');
for (const file of fs.readdirSync(ticketDir).filter((entry) => entry.endsWith('.js')).sort()) {
  const command = require(path.join(ticketDir, file));
  if (command && command.data) {
    client.commands.set(command.data.name, command);
  }
}

client.once('ready', async () => {
  console.log(`Ticket bot ready: ${client.user.tag}`);
  console.log(`Loaded commands: ${client.commands.size}`);

  try {
    const commands = [...client.commands.values()].map((command) => command.data.toJSON());
    const guilds = [...client.guilds.cache.values()];

    await Promise.all(guilds.map((guild) => guild.commands.set(commands)));
    console.log(`Ticket slash commands registered in ${guilds.length} server(s).`);

    await client.application.commands.set(commands);
    console.log('Global ticket slash commands registered.');
  } catch (error) {
    console.error('Failed to register ticket slash commands:', error);
  }
});

client.on('interactionCreate', async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({
        content: 'There was an error while running this ticket command.',
        ephemeral: true,
      });
      return;
    }

    await interaction.reply({
      content: 'There was an error while running this ticket command.',
      ephemeral: true,
    });
  }
});

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN environment variable.');
  process.exit(1);
}

client.login(token);
