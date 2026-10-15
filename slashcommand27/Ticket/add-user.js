const { SlashCommandBuilder } = require('discord.js');
const { requireTicketSupport } = require('../../ticket-utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-user')
    .setDescription('إضافة عضو إلى التذكرة الحالية')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to add').setRequired(true)
    ),

  async execute(interaction) {
    const ticket = await requireTicketSupport(interaction);
    if (!ticket) return;

    const user = interaction.options.getUser('user');
    try {
      await interaction.channel.permissionOverwrites.edit(user.id, {
        ViewChannel: true,
        SendMessages: true,
        ReadMessageHistory: true,
      });

      await interaction.reply({ content: `تمت إضافة <@${user.id}> إلى التذكرة.`, ephemeral: true });
    } catch (error) {
      console.error('Failed to add ticket member:', error);
      await interaction.reply({ content: 'تعذر إضافة العضو. تحقق من صلاحيات البوت.', ephemeral: true });
    }
  },
};
