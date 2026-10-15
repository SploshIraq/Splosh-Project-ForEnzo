const {
  ActionRowBuilder,
  ChannelType,
  EmbedBuilder,
  ModalBuilder,
  PermissionFlagsBits,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { db, buildTicketComponents } = require('../ticket-utils');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
      if (interaction.isButton()) {
        const panelConfig = db.get(`Ticket_${interaction.channelId}_${interaction.customId}`);
        const isTicketOpenButton = interaction.customId === 'ticket_open'
          || interaction.customId.startsWith('ticket_open_');
        if (panelConfig || isTicketOpenButton) {
          await beginTicket(interaction, interaction.channelId, interaction.customId);
          return;
        }
      }

      if (interaction.isStringSelectMenu() && interaction.customId === 'ticket_select') {
        const selectedId = interaction.values[0];
        if (selectedId === 'reset') {
          await interaction.deferUpdate();
          return;
        }

        await beginTicket(interaction, interaction.channelId, selectedId);
        return;
      }

      if (interaction.isModalSubmit() && interaction.customId.startsWith('ticket_reason:')) {
        const [, panelChannelId, ...buttonIdParts] = interaction.customId.split(':');
        const buttonId = buttonIdParts.join(':');
        const ticketConfig = db.get(`Ticket_${panelChannelId}_${buttonId}`);
        if (!ticketConfig) {
          await interaction.reply({ content: 'إعدادات هذه اللوحة غير موجودة. أعد إعداد لوحة التكت.', ephemeral: true });
          return;
        }

        await interaction.deferReply({ ephemeral: true });
        const reason = interaction.fields.getTextInputValue('ticket_reason');
        const channel = await createTicketChannel(interaction, ticketConfig, reason);
        await interaction.editReply({ content: `تم إنشاء تذكرتك: ${channel}` });
      }
    } catch (error) {
      console.error('Ticket creation failed:', error);
      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({ content: 'تعذر إنشاء التذكرة. تحقق من صلاحيات البوت.' }).catch(() => {});
      } else {
        await interaction.reply({ content: 'تعذر إنشاء التذكرة. تحقق من صلاحيات البوت.', ephemeral: true }).catch(() => {});
      }
    }
  });
};

async function beginTicket(interaction, panelChannelId, buttonId) {
  const ticketConfig = db.get(`Ticket_${panelChannelId}_${buttonId}`);
  if (!ticketConfig) {
    await interaction.reply({ content: 'إعدادات هذه اللوحة غير موجودة. أعد إعداد لوحة التكت.', ephemeral: true });
    return;
  }

  if (ticketConfig.Ask === 'on') {
    const modal = new ModalBuilder()
      .setCustomId(`ticket_reason:${panelChannelId}:${buttonId}`)
      .setTitle('سبب فتح التذكرة')
      .addComponents(new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('ticket_reason')
          .setLabel('ما سبب فتح التذكرة؟')
          .setStyle(TextInputStyle.Paragraph)
          .setMaxLength(1000)
          .setRequired(true),
      ));
    await interaction.showModal(modal);
    return;
  }

  await interaction.deferReply({ ephemeral: true });
  const channel = await createTicketChannel(interaction, ticketConfig);
  await interaction.editReply({ content: `تم إنشاء تذكرتك: ${channel}` });
}

async function createTicketChannel(interaction, ticketConfig, reason = null) {
  const guild = interaction.guild;
  const user = interaction.user;
  const username = user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 55) || 'member';
  const channel = await guild.channels.create({
    name: `ticket-${username}-${user.id.slice(-4)}`,
    type: ChannelType.GuildText,
    parent: ticketConfig.Category,
    permissionOverwrites: [
      {
        id: guild.roles.everyone.id,
        deny: [PermissionFlagsBits.ViewChannel],
      },
      {
        id: ticketConfig.Support,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      },
      {
        id: interaction.client.user.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
          PermissionFlagsBits.ManageChannels,
        ],
      },
    ],
  });

  const ticket = {
    author: user.id,
    Support: ticketConfig.Support,
    Category: ticketConfig.Category,
    panelChannel: interaction.isButton() || interaction.isStringSelectMenu()
      ? interaction.channelId
      : null,
    closed: false,
  };
  await db.set(`TICKET-PANEL_${channel.id}`, ticket);

  const content = `<@${user.id}> <@&${ticketConfig.Support}>`;
  const welcomeEmbed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setDescription(ticketConfig.Internal || 'يرجى كتابة تفاصيل طلبك هنا.');
  const components = buildTicketComponents();
  const payload = { content, components };
  if (ticketConfig.Type === 'embed') {
    payload.embeds = [welcomeEmbed];
  } else {
    payload.content += `\n${ticketConfig.Internal || 'يرجى كتابة تفاصيل طلبك هنا.'}`;
  }

  await channel.send(payload);
  if (reason) {
    const reasonEmbed = new EmbedBuilder()
      .setColor(0x5865f2)
      .setTitle('سبب فتح التذكرة')
      .setDescription(reason);
    await channel.send({ embeds: [reasonEmbed] });
  }

  return channel;
}
