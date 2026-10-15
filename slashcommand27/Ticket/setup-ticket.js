const { randomUUID } = require('crypto');
const {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
} = require('discord.js');
const db = require('../../ticket-db');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setup-ticket')
    .setDescription('إعداد لوحة نظام التذاكر')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addChannelOption((option) => option
      .setName('panel_channel')
      .setDescription('القناة التي ستظهر فيها لوحة التذاكر')
      .addChannelTypes(ChannelType.GuildText)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('type_1')
      .setDescription('اسم القسم الأول في قائمة التذاكر')
      .setMaxLength(100)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('type_2')
      .setDescription('اسم القسم الثاني في قائمة التذاكر')
      .setMaxLength(100)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('type_3')
      .setDescription('اسم القسم الثالث في قائمة التذاكر')
      .setMaxLength(100)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('type_4')
      .setDescription('اسم القسم الرابع في قائمة التذاكر')
      .setMaxLength(100)
      .setRequired(true))
    .addRoleOption((option) => option
      .setName('support_role')
      .setDescription('رتبة فريق الدعم')
      .setRequired(true))
    .addChannelOption((option) => option
      .setName('category')
      .setDescription('تصنيف قنوات التذاكر')
      .addChannelTypes(ChannelType.GuildCategory)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('welcome_type')
      .setDescription('طريقة عرض رسالة الترحيب داخل التذكرة')
      .addChoices(
        { name: 'Embed', value: 'embed' },
        { name: 'رسالة عادية', value: 'message' },
      )
      .setRequired(true))
    .addStringOption((option) => option
      .setName('ask_reason')
      .setDescription('هل يُطلب من صاحب التذكرة كتابة السبب؟')
      .addChoices(
        { name: 'نعم', value: 'on' },
        { name: 'لا', value: 'off' },
      )
      .setRequired(true))
    .addStringOption((option) => option
      .setName('panel_text')
      .setDescription('الوصف الذي سيظهر في لوحة فتح التذكرة')
      .setMaxLength(4000)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('welcome_message')
      .setDescription('رسالة الترحيب داخل قناة التذكرة')
      .setMaxLength(1900)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('image_url')
      .setDescription('رابط الصورة التي ستظهر في لوحة التذاكر')
      .setMaxLength(500)
      .setRequired(true))
    .addStringOption((option) => option
      .setName('emoji_1')
      .setDescription('إيموجي القسم الأول، اختياري')
      .setMaxLength(100)
      .setRequired(false))
    .addStringOption((option) => option
      .setName('emoji_2')
      .setDescription('إيموجي القسم الثاني، اختياري')
      .setMaxLength(100)
      .setRequired(false))
    .addStringOption((option) => option
      .setName('emoji_3')
      .setDescription('إيموجي القسم الثالث، اختياري')
      .setMaxLength(100)
      .setRequired(false))
    .addStringOption((option) => option
      .setName('emoji_4')
      .setDescription('إيموجي القسم الرابع، اختياري')
      .setMaxLength(100)
      .setRequired(false))
    .addStringOption((option) => option
      .setName('ticket_title')
      .setDescription('عنوان لوحة التذكرة')
      .setMaxLength(256)
      .setRequired(false))
    .addStringOption((option) => option
      .setName('embed_color')
      .setDescription('لون الـ Embed بصيغة HEX مثل #5865F2')
      .setMaxLength(7)
      .setRequired(false)),

  async execute(interaction) {
    const panelChannel = interaction.options.getChannel('panel_channel');
    const supportRole = interaction.options.getRole('support_role');
    const category = interaction.options.getChannel('category');
    const ticketTypes = [1, 2, 3, 4].map((number) => interaction.options.getString(`type_${number}`));
    const colorInput = interaction.options.getString('embed_color') || '#5865F2';
    const color = /^#[0-9a-fA-F]{6}$/.test(colorInput) ? colorInput : '#5865F2';
    const imageUrl = interaction.options.getString('image_url')?.trim();
    const panelText = interaction.options.getString('panel_text');
    const welcomeMessage = interaction.options.getString('welcome_message');

    if (!/^https?:\/\/\S+$/i.test(imageUrl)) {
      await interaction.reply({
        content: 'رابط الصورة لازم يكون رابطًا صالحًا يبدأ بـ http:// أو https://.',
        ephemeral: true,
      });
      return;
    }

    const panelEmbed = new EmbedBuilder()
      .setColor(color)
      .setDescription(panelText)
      .setTimestamp();

    const title = interaction.options.getString('ticket_title');
    if (title) panelEmbed.setTitle(title);
    panelEmbed.setImage(imageUrl);

    const ticketConfig = {
      Support: supportRole.id,
      Category: category.id,
      Internal: welcomeMessage,
      Type: interaction.options.getString('welcome_type'),
      Ask: interaction.options.getString('ask_reason'),
    };
    const ticketOptions = ticketTypes.map((label, index) => ({
      label,
      value: `ticket_open_${randomUUID()}`,
      description: 'فتح تكت جديد',
      emoji: interaction.options.getString(`emoji_${index + 1}`),
    }));
    const ticketMenu = new StringSelectMenuBuilder()
      .setCustomId('ticket_select')
      .setPlaceholder('اختر القسم المناسب')
      .addOptions(ticketOptions.map((option) => {
        const menuOption = new StringSelectMenuOptionBuilder()
          .setLabel(option.label)
          .setValue(option.value)
          .setDescription(option.description);
        if (option.emoji) menuOption.setEmoji(option.emoji);
        return menuOption;
      }));

    try {
        for (const option of ticketOptions) {
          await db.set(`Ticket_${panelChannel.id}_${option.value}`, ticketConfig);
        }

      const panelMessage = await panelChannel.send({
        embeds: [panelEmbed],
        components: [new ActionRowBuilder().addComponents(ticketMenu)],
      });
      await interaction.reply({
        content: `تم إعداد لوحة التذاكر في ${panelChannel} بنجاح.`,
        ephemeral: true,
      });
      return panelMessage;
    } catch (error) {
      console.error('Failed to set up ticket panel:', error);
      await interaction.reply({
        content: 'تعذر إعداد لوحة التذاكر. تأكد من صلاحيات البوت في القناة والتصنيف.',
        ephemeral: true,
      });
    }
  },
};
