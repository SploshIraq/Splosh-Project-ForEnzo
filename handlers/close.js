const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const discordTranscripts = require('discord-html-transcripts');
const { db, requireTicketSupport, sendTicketLog } = require('../ticket-utils');

const actions = new Map([
  ['close', 'prompt'],
  ['ticket_close_confirm', 'confirm'],
  ['Yes11', 'confirm'],
  ['ticket_close_cancel', 'cancel'],
  ['No11', 'cancel'],
  ['ticket_reopen', 'reopen'],
  ['Open', 'reopen'],
  ['ticket_delete_confirm', 'delete'],
  ['delete', 'delete'],
  ['ticket_transcript', 'transcript'],
  ['Tran', 'transcript'],
]);

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;
    const action = actions.get(interaction.customId);
    if (!action) return;

    try {
      if (action === 'cancel') {
        await interaction.update({ content: 'تم إلغاء العملية.', components: [] });
        return;
      }

      const ticket = await requireTicketSupport(interaction);
      if (!ticket) return;

      if (action === 'prompt') {
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_close_confirm').setLabel('تأكيد الإغلاق').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_close_cancel').setLabel('إلغاء').setStyle(ButtonStyle.Secondary),
        );
        await interaction.reply({ content: 'هل تريد إغلاق هذه التذكرة؟', components: [row], ephemeral: true });
        return;
      }

      if (action === 'confirm') {
        await interaction.deferUpdate();
        await interaction.channel.permissionOverwrites.edit(ticket.author, {
          ViewChannel: false,
          SendMessages: false,
        });
        ticket.closed = true;
        await db.set(`TICKET-PANEL_${interaction.channelId}`, ticket);
        await sendTicketLog(interaction.guild, 'إغلاق تذكرة', interaction.channel, ticket, interaction.user);

        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId('ticket_reopen').setLabel('إعادة فتح').setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId('ticket_delete_confirm').setLabel('حذف').setStyle(ButtonStyle.Danger),
          new ButtonBuilder().setCustomId('ticket_transcript').setLabel('Transcript').setStyle(ButtonStyle.Secondary),
        );
        await interaction.channel.send({ content: `أُغلقت التذكرة بواسطة ${interaction.user}.`, components: [row] });
        await interaction.editReply({ content: 'تم إغلاق التذكرة.', components: [] });
        return;
      }

      if (action === 'reopen') {
        await interaction.deferReply({ ephemeral: true });
        await interaction.channel.permissionOverwrites.edit(ticket.author, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
        ticket.closed = false;
        await db.set(`TICKET-PANEL_${interaction.channelId}`, ticket);
        await sendTicketLog(interaction.guild, 'إعادة فتح تذكرة', interaction.channel, ticket, interaction.user);
        await interaction.editReply({ content: 'تمت إعادة فتح التذكرة.' });
        return;
      }

      if (action === 'delete') {
        await interaction.deferReply({ ephemeral: true });
        await sendTicketLog(interaction.guild, 'حذف تذكرة', interaction.channel, ticket, interaction.user);
        await db.delete(`TICKET-PANEL_${interaction.channelId}`);
        await db.delete(`Claimed_${interaction.channelId}`);
        await interaction.editReply({ content: 'سيتم حذف التذكرة بعد لحظات.' });
        setTimeout(() => interaction.channel.delete().catch(console.error), 3000);
        return;
      }

      if (action === 'transcript') {
        await interaction.deferReply({ ephemeral: true });
        const transcript = await discordTranscripts.createTranscript(interaction.channel, {
          limit: -1,
          filename: `ticket-${interaction.channelId}.html`,
        });
        const transcriptChannelId = db.get(`TransRoom_${interaction.guildId}`);
        const transcriptChannel = interaction.guild.channels.cache.get(transcriptChannelId);
        if (transcriptChannel?.isTextBased()) {
          await transcriptChannel.send({ files: [transcript] });
          await interaction.editReply({ content: `تم إرسال النص إلى ${transcriptChannel}.` });
        } else {
          await interaction.editReply({ content: 'لم تحدد قناة للنص؛ أرفقته هنا.', files: [transcript] });
        }
      }
    } catch (error) {
      console.error('Ticket lifecycle action failed:', error);
      if (interaction.deferred) {
        await interaction.editReply({ content: 'تعذر تنفيذ الإجراء. تحقق من صلاحيات البوت.' }).catch(() => {});
      } else if (interaction.replied) {
        await interaction.followUp({ content: 'تعذر تنفيذ الإجراء. تحقق من صلاحيات البوت.', ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: 'تعذر تنفيذ الإجراء. تحقق من صلاحيات البوت.', ephemeral: true }).catch(() => {});
      }
    }
  });
};
