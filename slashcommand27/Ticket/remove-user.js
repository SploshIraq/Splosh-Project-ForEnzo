const { SlashCommandBuilder } = require('discord.js');
const { requireTicketSupport } = require('../../ticket-utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove-user')
    .setDescription('إزالة عضو من التذكرة الحالية')
    .addUserOption((option) =>
      option.setName('user').setDescription('User to remove').setRequired(true)
    ),

  async execute(interaction) {
    const ticket = await requireTicketSupport(interaction);
    if (!ticket) return;

    const user = interaction.options.getUser('user');
    try {
      await interaction.channel.permissionOverwrites.delete(user.id);

      await interaction.reply({ content: `تمت إزالة <@${user.id}> من التذكرة.`, ephemeral: true });
    } catch (error) {
      console.error('Failed to remove ticket member:', error);
      await interaction.reply({ content: 'تعذر إزالة العضو. تحقق من صلاحيات البوت.', ephemeral: true });
    }
  },
};
