const { SlashCommandBuilder } = require('discord.js');
const { requireTicketSupport } = require('../../ticket-utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rename')
    .setDescription('تغيير اسم قناة التذكرة الحالية')
    .addStringOption((option) =>
      option.setName('name').setDescription('الاسم الجديد').setMaxLength(90).setRequired(true)
    ),

  async execute(interaction) {
    const ticket = await requireTicketSupport(interaction);
    if (!ticket) return;

    const name = interaction.options.getString('name');
    try {
      await interaction.channel.setName(name);
      await interaction.reply({ content: `تم تغيير اسم التذكرة إلى ${name}.`, ephemeral: true });
    } catch (error) {
      console.error('Failed to rename ticket:', error);
      await interaction.reply({ content: 'تعذر تغيير اسم التذكرة. تحقق من صلاحيات البوت.', ephemeral: true });
    }
  },
};
