# При первом запуске потребуется: 
1. Установить Node.js я использую 18.18.2 (https://nodejs.org/en/download/)
2. Установить модули (npm i/npm install)
3. Конфигурация серверов в папке servers
   В папке servers есть пример конфигурации сервера
   ```module.exports = {
       config: {
         host: 'Айпи сервера',
         port: 'Порт (если есть, если не нужен - оставить пустым)',
         img: 'Ссылка на изображение (если есть, если не нужна - оставить пустой)',
         icon: 'Ссылка на иконку (если есть, если не нужна - оставить пустой)',
         footerr: 'Футер (это то что находится внизу эмбеда)',
       },
       namemc: 'Имя сервера',
     };```
4. Конфигурация servers.json
   ``` Пример:
       Вводить имя сервера такой же как файл в папке servers
       Например если файл server.js то писать нужно без .js просто server (ВАЖНО! Писать желательно без русских букв)
   [
       "example",
       "Server 1",
       "Server 2"
   ]```
5. Конфигурация .env (Вам уже надан файл .env.example просто переименуйте его в .env)
   TOKEN=Токен вашего дискорд бота, его можно получить на сайте https://discord.com/developers/applications

   DISCORD_CHANNEL_ID=Айди канала в который будет отправлятся весь мониторинг (можно получить через https://support.discord.com/hc/ru/articles 206346498-Где-мне-найти-ID-пользователя-сервера-сообщения
6. Запустить скрипт (npm start)
