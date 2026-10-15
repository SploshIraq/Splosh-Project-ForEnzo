const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  PermissionFlagsBits,
  StringSelectMenuBuilder,
} = require('discord.js');
const db = require('./ticket-db');

function getTicket(channelId) {
  return db.get(`TICKET-PANEL_${channelId}`) || null;
}

function isTicketSupport(interaction, ticket) {
  return Boolean(
    ticket && (
      interaction.memberPermissions?.has(PermissionFlagsBits.Administrator) ||
      interaction.member?.roles?.cache?.has(ticket.Support)
    )
  );
}

async function requireTicketSupport(interaction) {
  const ticket = getTicket(interaction.channelId);
  if (!ticket) {
    await interaction.reply({ content: 'هذه القناة ليست تذكرة.', ephemeral: true });
    return null;
  }

  if (!isTicketSupport(interaction, ticket)) {
    await interaction.reply({ content: 'هذا الإجراء لفريق الدعم فقط.', ephemeral: true });
    return null;
  }

  return ticket;
}

function buildTicketComponents(claimedBy = null) {
  const claimedLabel = claimedBy ? 'تم استلام التذكرة' : 'استلام';
  const buttons = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('close').setLabel('إغلاق').setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId('claim')
      .setLabel(claimedLabel)
      .setStyle(ButtonStyle.Success)
      .setDisabled(Boolean(claimedBy)),
    new ButtonBuilder()
      .setCustomId('unclaim')
      .setLabel('إلغاء الاستلام')
      .setStyle(ButtonStyle.Secondary)
      .setDisabled(!claimedBy),
  );

  const menu = new StringSelectMenuBuilder()
    .setCustomId('supportPanel')
    .setPlaceholder('إدارة التذكرة')
    .addOptions(
      { label: 'تغيير اسم التذكرة', value: 'renameTicket', emoji: '✏️' },
      { label: 'إضافة عضو', value: 'addMemberToTicket', emoji: '➕' },
      { label: 'إزالة عضو', value: 'removeMemberFromTicket', emoji: '➖' },
      { label: 'تحديث اللوحة', value: 'refreshSupportPanel', emoji: '🔄' },
    );

  return [buttons, new ActionRowBuilder().addComponents(menu)];
}

async function sendTicketLog(guild, title, channel, ticket, actor) {
  const logChannelId = db.get(`LogsRoom_${guild.id}`);
  if (!logChannelId) return;

  const logChannel = guild.channels.cache.get(logChannelId);
  if (!logChannel?.isTextBased()) return;

  const embed = new EmbedBuilder()
    .setColor(0x5865f2)
    .setTitle(title)
    .addFields(
      { name: 'التذكرة', value: `${channel.name} (<#${channel.id}>)` },
      { name: 'صاحب التذكرة', value: `<@${ticket.author}>` },
      { name: 'بواسطة', value: `${actor}` },
    )
    .setTimestamp();

  await logChannel.send({ embeds: [embed] }).catch((error) => {
    console.error('Failed to send ticket log:', error);
  });
}

module.exports = {
  db,
  getTicket,
  isTicketSupport,
  requireTicketSupport,
  buildTicketComponents,
  sendTicketLog,
};