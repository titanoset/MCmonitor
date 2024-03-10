const { Client, GatewayIntentBits, Collection, EmbedBuilder } = require("discord.js");
const request = require('request');
const Rcon = require('minecraft-server-util').RCON;
const express = require('express');
const app = express();
const process = require("node:process");
const dotenv = require('dotenv');
const fs = require('fs');
const chalk = require('chalk');
dotenv.config();

let rconCheckNotified = false;
const channelId = process.env.DISCORD_CHANNEL_ID || '';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
client.buttons = new Collection();
client.commandsArray = [];

app.get('/', (req, res) => {
  res.send("Загружено");
});

app.listen(process.env.PORT || 3001, () => {
  console.log(chalk.green('Сервер запущен.'));
});

client.commands = new Collection();
client.buttons = new Collection();
client.commandsArray = [];

function getServerStatus(host, port) {
  return new Promise((resolve, reject) => {
    const url = port ? `https://api.mcsrvstat.us/2/${host}:${port}` : `https://api.mcsrvstat.us/2/${host}`;
    request(url, (error, response, body) => {
      if (error) {
        reject(error);
      } else if (response.statusCode !== 200) {
        reject(new Error(`Код статуса: ${response.statusCode}`));
      } else {
        const data = JSON.parse(body);
        resolve(data);
      }
    });
  });
}

function formatEmbed(data, serverConfig, namemc, isRestarting) {
  const online = data.online ? '**Запущен**' : '__**Недоступен**__';
  let color = data.online ? '#00FF00' : '#FF0000';

  if (isRestarting) {
    color = '#FFFF00';
  }

  const fields = [
    { name: "**Адрес**", value: `**\`${serverConfig.host}${serverConfig.port ? `:${serverConfig.port}` : ''}\`**`, inline: true },
    { name: "**Версия**", value: data.version ? `\`\`\`${data.version}\`\`\`` : 'Оффлайн', inline: false },
    { name: "**Игроков**", value: data.players ? `\`\`\`${data.players.online} / ${data.players.max}\`\`\`` : 'Оффлайн', inline: false },
  ];

  if (data.players && data.players.list) {
    fields.push({ name: "**Игроки онлайн**", value: data.players.list.join(', '), inline: false });
  }

  // Конфигурация эмбеда самого вывода статистики сервера
  const embed = new EmbedBuilder()
    .setColor(color)
    .setTitle(namemc)
    .setDescription(`Статус сервера: ${online}`)
    .addFields(fields);

  if (serverConfig.img) {
    embed.setImage(serverConfig.img);
  }

  if (serverConfig.icon) {
    embed.setThumbnail(serverConfig.icon);
  }

  embed.setFooter({ text: serverConfig.footerr });

  return embed;
}

// Не рабочая часть кода
async function checkServerRestart(host, port, rconPort, rconPassword) {
  try {
    if (rconCheckNotified || !rconPassword || !rconPort) {
      rconCheckNotified = true;
      return false;
    }

    const rcon = new Rcon(host, rconPort, rconPassword, 5000);
    await rcon.connect();
    const response = await rcon.send('list');
    return response.includes('Restarting');
  } catch (error) {
    console.error(chalk.red('Ошибка проверки перезагрузки сервера:', error));
    return false;
  }
}

let lastMessageId;

async function sendAllEmbeds(channel, serverNames) {
  try {
    rconCheckNotified = false;

    const serverEmbeds = [];
    let onlineServers = 0;
    let offlineServers = 0;

    for (const serverName of serverNames) {
      const serverConfig = require(`./servers/${serverName}`);
      const data = await getServerStatus(serverConfig.config.host, serverConfig.config.port);
      const isRestarting = await checkServerRestart(serverConfig.config.host, serverConfig.config.port, serverConfig.config.rconPort, serverConfig.config.rconPassword);
      const embed = formatEmbed(data, serverConfig.config, serverConfig.namemc, isRestarting);
      serverEmbeds.push(embed);

      if (data.online) {
        onlineServers++;
      } else {
        offlineServers++;
      }
    }

    // Вывод статистики в консоли
    console.clear()
    console.log(chalk.green(`Имя бота ${client.user.tag}`));
    console.log(chalk.blue(` `));
    console.log(chalk.blue(`Статистика:`));
    console.log(chalk.green(`Активных серверов: ${onlineServers}`));
    console.log(chalk.red(`Оффлайн серверов: ${offlineServers}`));

    const lastUpdatedEmbed = new EmbedBuilder()
      .setColor('#8B0000')
      .setTitle('Было обновлено в:')
      .setDescription(`\`\`\`${new Date().toLocaleString()}\`\`\``)

    serverEmbeds.push(lastUpdatedEmbed);

    if (lastMessageId) {
      const existingMessage = await channel.messages.fetch(lastMessageId);
      await existingMessage.edit({ embeds: serverEmbeds });
    } else {
      const message = await channel.send({ embeds: serverEmbeds });
      lastMessageId = message.id;
    }
  } catch (error) {
    console.error(chalk.red('Ошибка отправки встроенных сообщений:', error));
    process.exit(1)
  }
}

client.on('ready', async () => {
  console.clear();
  console.log(chalk.green(`Бот вошел как ${client.user.tag}`));

  const channel = client.channels.cache.get(channelId);

  if (!channel) {
    console.error(chalk.red(`Канал с ID ${channelId} не найден`));
    process.exit(1)
  }

  try {
    // Тут удаляем все старые сообщения в канале который задали (максимум 14 дней, иначе работать не будет)
    const messages = await channel.messages.fetch({ limit: 100 });
    channel.bulkDelete(messages);
    console.log(chalk.green(`Удалено ${messages.size} сообщений из канала ${channel.name}`));
  } catch (error) {
    console.error(chalk.red('Ошибка при удалении сообщений:', error));
    process.exit(1)
  }

  const serverNames = JSON.parse(fs.readFileSync('./servers.json', 'utf-8'));
  sendAllEmbeds(channel, serverNames);

  setInterval(() => {
    sendAllEmbeds(channel, serverNames);
  }, 60000);
});

client.on('disconnect', async () => {
  const channel = client.channels.cache.get(channelId);
  if (channel) {
    const messages = await channel.messages.fetch({ limit: 100 });
    channel.bulkDelete(messages);
  }
});

client.login(process.env.TOKEN);