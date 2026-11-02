# Shizumusic 🎵

Clean iOS-style music web app. Telegram system hata ditta — sida browser vich play.

**Features:** stream · download (mp3) · autoplay (queue khatam hone te similar songs) · playlists · favourites · recently played · queue · shuffle/repeat · lock-screen controls · dark/light auto · iPhone "Add to Home Screen" app.

Stack: HTML + CSS + JS (frontend, no framework) + Node/Express (backend). Playlists browser (localStorage) vich save hunde ne, isliye Heroku de ephemeral disk te v kamm karda.

## Run locally
```bash
npm install
npm start        # http://localhost:3000
```

## Heroku
```bash
heroku login
heroku create shizumusic-yourname
git init && git add . && git commit -m "Shizumusic"
git push heroku main        # (ya master)
heroku open
```
Procfile + engines already set han. Config (optional): `heroku config:set APP_NAME=Shizumusic`

## VPS (Ubuntu) - Docker nal
```bash
docker build -t shizumusic .
docker run -d --restart always -p 80:3000 --name shizumusic shizumusic
```

## VPS - bina Docker (pm2)
```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs
npm install --omit=dev && sudo npm i -g pm2
PORT=3000 pm2 start server.js --name shizumusic && pm2 save && pm2 startup
```
HTTPS layi nginx + certbot piche laga lao (port 3000 te proxy). Nginx vich `proxy_buffering off;` rakho.

## Music source
`providers/audius.js` - Audius public API (free, key nahi chahidi). Dusra source lagauna hove ta ohi
functions (`trending, search, track, streamUrl`) wali nayi file bana ke `server.js` vich `require` badal do.

## Folder
```
server.js            express server + API (/api/search, /trending, /stream/:id, /download/:id)
providers/audius.js  music source
public/              index.html, style.css, app.js, manifest, sw.js, icons
test/mock-audius.js  offline fake API: node test/mock-audius.js, then AUDIUS_API=http://localhost:4001 npm start
```
