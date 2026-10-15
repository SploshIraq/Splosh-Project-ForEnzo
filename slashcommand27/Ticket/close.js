const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { requireTicketSupport } = require('../../ticket-utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('close')
    .setDescription('إغلاق التذكرة الحالية'),

  async execute(interaction) {
    const ticket = await requireTicketSupport(interaction);
    if (!ticket) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('تأكيد الإغلاق').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('إلغاء').setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({ content: 'هل تريد إغلاق هذه التذكرة؟', components: [row], ephemeral: true });
  },
};