const {
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require('discord.js');
const { requireTicketSupport } = require('../ticket-utils');

const panelActions = {
  renameTicket: {
    id: 'renameTicketSubmitModal',
    title: 'تغيير اسم التذكرة',
    inputId: 'newNameValue',
    label: 'اسم التذكرة الجديد',
  },
  addMemberToTicket: {
    id: 'addMemberToTicketSubmitModal',
    title: 'إضافة عضو للتذكرة',
    inputId: 'addMemberToTicketMemberId',
    label: 'معرف العضو',
  },
  removeMemberFromTicket: {
    id: 'removeMemberFromTicketSubmitModal',
    title: 'إزالة عضو من التذكرة',
    inputId: 'removeMemberFromTicketMemberId',
    label: 'معرف العضو',
  },
};

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    try {
    if (interaction.isStringSelectMenu() && interaction.customId === 'supportPanel') {
      const ticket = await requireTicketSupport(interaction);
      if (!ticket) return;

      const config = panelActions[interaction.values[0]];
      if (!config) {
        await interaction.reply({ content: 'لوحة إدارة التذكرة جاهزة.', ephemeral: true });
        return;
      }

      const modal = new ModalBuilder()
        .setCustomId(config.id)
        .setTitle(config.title)
        .addComponents(new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId(config.inputId)
            .setLabel(config.label)
            .setStyle(TextInputStyle.Short)
            .setMaxLength(config.inputId === 'newNameValue' ? 90 : 20)
            .setRequired(true),
        ));
      await interaction.showModal(modal);
      return;
    }

    if (!interaction.isModalSubmit()) return;
    const config = Object.values(panelActions).find((item) => item.id === interaction.customId);
    if (!config) return;

    const ticket = await requireTicketSupport(interaction);
    if (!ticket) return;

    try {
      if (interaction.customId === panelActions.renameTicket.id) {
        const name = interaction.fields.getTextInputValue(config.inputId)
          .normalize('NFKC')
          .trim()
          .toLowerCase()
          .replace(/[^\p{L}\p{N}-]+/gu, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 90);
        if (!name) {
          await interaction.reply({ content: 'اسم القناة غير صالح.', ephemeral: true });
          return;
        }

        await interaction.channel.setName(name);
        await interaction.reply({ content: `تم تغيير اسم التذكرة إلى ${name}.`, ephemeral: true });
        return;
      }

      const adding = interaction.customId === panelActions.addMemberToTicket.id;
      const memberId = interaction.fields.getTextInputValue(config.inputId).trim();
      const member = await interaction.guild.members.fetch(memberId);
      if (adding) {
        await interaction.channel.permissionOverwrites.edit(member.id, {
          ViewChannel: true,
          SendMessages: true,
          ReadMessageHistory: true,
        });
        await interaction.reply({ content: `تمت إضافة ${member} إلى التذكرة.`, ephemeral: true });
      } else {
        await interaction.channel.permissionOverwrites.edit(member.id, {
          ViewChannel: false,
          SendMessages: false,
        });
        await interaction.reply({ content: `تمت إزالة ${member} من التذكرة.`, ephemeral: true });
      }
    } catch (error) {
      console.error('Ticket support panel action failed:', error);
      await interaction.reply({ content: 'تعذر تنفيذ الإجراء. تحقق من معرف العضو وصلاحيات البوت.', ephemeral: true }).catch(() => {});
    }
    } catch (error) {
      console.error('Ticket support panel interaction failed:', error);
      if (error.code === 10062) return;

      const message = 'انتهت مهلة التفاعل أو تعذر فتح النافذة؛ اضغط على الخيار مرة ثانية.';
      if (interaction.deferred) {
        await interaction.editReply({ content: message }).catch(() => {});
      } else if (interaction.replied) {
        await interaction.followUp({ content: message, ephemeral: true }).catch(() => {});
      } else {
        await interaction.reply({ content: message, ephemeral: true }).catch(() => {});
      }
    }
  });
};