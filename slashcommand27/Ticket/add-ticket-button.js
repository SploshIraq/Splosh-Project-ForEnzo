const { randomUUID } = require('crypto');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  SlashCommandBuilder,
} = require('discord.js');
const db = require('../../ticket-db');

const styles = {
  primary: ButtonStyle.Primary,
  success: ButtonStyle.Success,
  danger: ButtonStyle.Danger,
  secondary: ButtonStyle.Secondary,
};

module.exports = {
  data: new SlashCommandBuilder()
    .setName('add-ticket-button')
    .setDescription('إضافة زر تكت إلى رسالة موجودة')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) => option
      .setName('message_id')
      .setDescription('معرف رقمي أو رابط رسالة موجودة في نفس القناة')
      .setRequired(true))
    .addStringOption((option) => option
      .setName('button_name')
      .setDescription('النص الظاهر على الزر')
      .setMaxLength(80)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('button_style')
      .setDescription('لون الزر')
      .addChoices(
        { name: 'أزرق', value: 'primary' },
        { name: 'أخضر', value: 'success' },
        { name: 'أحمر', value: 'danger' },
        { name: 'رمادي', value: 'secondary' },
      )
      .setRequired(true))
    .addRoleOption((option) => option.setName('support_role').setDescription('رتبة الدعم').setRequired(true))
    .addChannelOption((option) => option
      .setName('category')
      .setDescription('تصنيف قنوات التذاكر')
      .addChannelTypes(ChannelType.GuildCategory)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('welcome_type')
      .setDescription('نوع رسالة الترحيب')
      .addChoices(
        { name: 'Embed', value: 'embed' },
        { name: 'رسالة عادية', value: 'message' },
      )
      .setRequired(true))
    .addStringOption((option) => option
      .setName('welcome_message')
      .setDescription('محتوى رسالة الترحيب داخل التكت')
      .setMaxLength(1900)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('ask_reason')
      .setDescription('سؤال المستخدم عن سبب فتح التكت')
      .addChoices(
        { name: 'نعم', value: 'on' },
        { name: 'لا', value: 'off' },
      )
      .setRequired(true))
    .addStringOption((option) => option.setName('emoji').setDescription('إيموجي الزر').setMaxLength(100).setRequired(false)),

  async execute(interaction) {
    try {
      const messageInput = interaction.options.getString('message_id').trim();
      const messageId = messageInput.match(/(?:^|\/)(\d{17,20})\/?$/)?.[1];
      if (!messageId) {
        return interaction.reply({
          content: 'خانة `message_id` تحتاج معرف الرسالة الرقمي أو رابطها، وليس نص الرسالة. إذا تريد إنشاء لوحة جديدة استخدم `/setup-ticket`.',
          ephemeral: true,
        });
      }

      const message = await interaction.channel.messages.fetch(messageId);
      const rows = message.components.map((row) => ActionRowBuilder.from(row));
      let buttonRow = rows.find((row) => row.components.length < 5 && row.components.every((component) => component.type === 2));
      if (!buttonRow) {
        if (rows.length >= 5) {
          return interaction.reply({ content: 'الرسالة وصلت إلى الحد الأقصى للمكونات.', ephemeral: true });
        }
        buttonRow = new ActionRowBuilder();
        rows.push(buttonRow);
      }

      const customId = `ticket_open_${randomUUID()}`;
      const button = new ButtonBuilder()
        .setCustomId(customId)
        .setLabel(interaction.options.getString('button_name'))
        .setStyle(styles[interaction.options.getString('button_style')]);
      const emoji = interaction.options.getString('emoji');
      if (emoji) button.setEmoji(emoji);
      buttonRow.addComponents(button);

      const ticketConfig = {
        Support: interaction.options.getRole('support_role').id,
        Category: interaction.options.getChannel('category').id,
        Type: interaction.options.getString('welcome_type'),
        Internal: interaction.options.getString('welcome_message'),
        Ask: interaction.options.getString('ask_reason'),
      };
      await db.set(`Ticket_${message.channelId}_${customId}`, ticketConfig);
      await message.edit({ components: rows });
      await interaction.reply({ content: 'تمت إضافة زر التكت إلى الرسالة.', ephemeral: true });
    } catch (error) {
      console.error('Failed to add ticket button:', error);
      const message = error.code === 10008
        ? 'لم أجد الرسالة في نفس القناة. شغّل الأمر في قناة الرسالة وتأكد من معرفها.'
        : 'تعذر إضافة الزر. تأكد أن البوت يملك View Channel وRead Message History وManage Messages.';
      await interaction.reply({ content: message, ephemeral: true });
    }
  },
};
