const { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } = require('discord.js');
const { requireTicketSupport } = require('../../ticket-utils');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('delete')
    .setDescription('حذف التذكرة الحالية'),

  async execute(interaction) {
    const ticket = await requireTicketSupport(interaction);
    if (!ticket) return;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('ticket_delete_confirm').setLabel('تأكيد الحذف').setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('إلغاء').setStyle(ButtonStyle.Secondary),
    );
    await interaction.reply({ content: 'هل تريد حذف هذه التذكرة نهائيًا؟', components: [row], ephemeral: true });
  },
};