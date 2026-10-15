const { ChannelType, PermissionFlagsBits, SlashCommandBuilder } = require('discord.js');
const db = require('../../ticket-db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('set-ticket-log')
    .setDescription('تحديد قنوات سجلات التكت والنصوص')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option
      .setName('type')
      .setDescription('نوع القناة')
      .addChoices(
        { name: 'سجل الأحداث', value: 'log' },
        { name: 'النصوص Transcript', value: 'transcript' },
      )
      .setRequired(true))
    .addChannelOption((option) => option
      .setName('channel')
      .setDescription('القناة المستهدفة')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true)),

  async execute(interaction) {
    const type = interaction.options.getString('type');
    const channel = interaction.options.getChannel('channel');
    const key = type === 'log' ? `LogsRoom_${interaction.guildId}` : `TransRoom_${interaction.guildId}`;
    await db.set(key, channel.id);
    await interaction.reply({ content: `تم تحديد ${channel} بنجاح.`, ephemeral: true });
  },
};