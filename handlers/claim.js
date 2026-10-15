const { EmbedBuilder } = require('discord.js');
const { db, requireTicketSupport, buildTicketComponents } = require('../ticket-utils');

module.exports = (client) => {
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton() || !['claim', 'unclaim'].includes(interaction.customId)) return;

    const ticket = await requireTicketSupport(interaction);
    if (!ticket) return;

    const claimedKey = `Claimed_${interaction.channelId}`;
    const claimedBy = db.get(claimedKey);
    if (interaction.customId === 'claim') {
      if (claimedBy) {
        await interaction.reply({
          content: claimedBy === interaction.user.id
            ? 'أنت مستلم هذه التذكرة بالفعل.'
            : `التذكرة مستلمة من <@${claimedBy}>.`,
          ephemeral: true,
        });
        return;
      }

      await db.set(claimedKey, interaction.user.id);
      await interaction.update({ components: buildTicketComponents(interaction.user.id) });
      await interaction.channel.send({
        embeds: [new EmbedBuilder().setColor(0x57f287).setDescription(`استلم ${interaction.user} هذه التذكرة.`)],
      });
      return;
    }

    if (claimedBy !== interaction.user.id) {
      await interaction.reply({ content: 'لا يمكنك إلغاء استلام تذكرة مستلمة من عضو آخر.', ephemeral: true });
      return;
    }

    await db.delete(claimedKey);
    await interaction.update({ components: buildTicketComponents() });
    await interaction.channel.send({
      embeds: [new EmbedBuilder().setColor(0x5865f2).setDescription(`${interaction.user} ألغى استلام التذكرة.`)],
    });
  });
};
