const {
  ActionRowBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('to-select')
    .setDescription('تحويل أزرار التكت في رسالة إلى قائمة اختيار')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option.setName('message_id').setDescription('معرف الرسالة').setRequired(true))
    .addStringOption((option) => option.setName('description1').setDescription('وصف الخيار الأول').setMaxLength(100).setRequired(false))
    .addStringOption((option) => option.setName('description2').setDescription('وصف الخيار الثاني').setMaxLength(100).setRequired(false))
    .addStringOption((option) => option.setName('description3').setDescription('وصف الخيار الثالث').setMaxLength(100).setRequired(false))
    .addStringOption((option) => option.setName('description4').setDescription('وصف الخيار الرابع').setMaxLength(100).setRequired(false))
    .addStringOption((option) => option.setName('description5').setDescription('وصف الخيار الخامس').setMaxLength(100).setRequired(false)),

  async execute(interaction) {
    try {
      const message = await interaction.channel.messages.fetch(interaction.options.getString('message_id'));
      const ticketButtons = message.components
        .flatMap((row) => row.components)
        .filter((component) => component.type === 2 && component.customId.startsWith('ticket_'))
        .slice(0, 24);

      if (!ticketButtons.length) {
        return interaction.reply({ content: 'لم أجد أزرار تكت في هذه الرسالة.', ephemeral: true });
      }

      const menu = new StringSelectMenuBuilder()
        .setCustomId('ticket_select')
        .setPlaceholder('اختر نوع التذكرة')
        .addOptions(ticketButtons.map((button, index) => {
          const option = new StringSelectMenuOptionBuilder()
            .setLabel(button.label || `تذكرة ${index + 1}`)
            .setValue(button.customId);
          if (button.emoji) option.setEmoji(button.emoji);
          const description = index < 5
            ? interaction.options.getString(`description${index + 1}`)
            : null;
          if (description) option.setDescription(description);
          return option;
        }))
        .addOptions({ label: 'إعادة الاختيار', value: 'reset' });

      const retainedRows = message.components
        .filter((row) => !row.components.some((component) => component.type === 2 && component.customId.startsWith('ticket_')))
        .map((row) => ActionRowBuilder.from(row));
      await message.edit({ components: [new ActionRowBuilder().addComponents(menu), ...retainedRows].slice(0, 5) });
      await interaction.reply({ content: 'تم تحويل أزرار التكت إلى قائمة اختيار.', ephemeral: true });
    } catch (error) {
      console.error('Failed to convert ticket buttons:', error);
      await interaction.reply({ content: 'تعذر تحويل الرسالة. تأكد من معرفها وصلاحيات البوت.', ephemeral: true });
    }
  },
};