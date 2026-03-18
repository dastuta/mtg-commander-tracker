# Deployment Guide - MTG Commander Tracker

## Voraussetzungen

- VPS mit Ubuntu/Debian
- Docker & Docker Compose (optional aber empfohlen)
- ODER nginx + node.js

---

## Option 1: Docker (Empfohlen)

### 1. App bauen und deployen

```bash
# Auf deinem lokalen Rechner:
cd mtg-commander-tracker
npm install
npm run build

# Die dist/ Dateien auf den Server übertragen
scp -r dist/* user@dein-server.com:/var/www/mtg-commander-tracker/
```

### 2. Docker Compose nutzen

```bash
# Auf dem Server
cd /opt/mtg-commander-tracker
docker-compose up -d
```

Die App ist dann erreichbar unter `http://dein-server.com:8080`

---

## Option 2: Nginx direkt

### 1. nginx installieren

```bash
sudo apt update
sudo apt install nginx certbot python3-certbot-nginx
```

### 2. App bauen

```bash
npm install
npm run build
```

### 3. Dateien auf Server kopieren

```bash
scp -r dist/* user@dein-server.com:/var/www/mtg-commander-tracker/
```

### 4. nginx konfigurieren

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/mtg-commander-tracker
sudo ln -s /etc/nginx/sites-available/mtg-commander-tracker /etc/nginx/sites-enabled/
sudo nano /etc/nginx/sites-available/mtg-commander-tracker
# Domain anpassen: server_name example.com;
sudo nginx -t
sudo systemctl reload nginx
```

### 5. SSL mit Let's Encrypt

```bash
sudo certbot --nginx -d deine-domain.com -d www.deine-domain.com
```

---

## Option 3: Automatischer Build auf dem Server

### 1. Git Repository einrichten

```bash
# Auf dem Server
git clone https://github.com/dein-user/mtg-commander-tracker.git /opt/mtg-commander-tracker
cd /opt/mtg-commander-tracker
```

### 2. Build Script erstellen

```bash
cat > deploy.sh << 'EOF'
#!/bin/bash
cd /opt/mtg-commander-tracker
git pull
npm install
npm run build
rsync -av --delete dist/ /var/www/mtg-commander-tracker/
systemctl reload nginx
EOF
chmod +x deploy.sh
```

### 3. Automatischer Deploy bei Git Push (optional)

```bash
# Webhook für automatische Updates einrichten
```

---

## nginx Konfiguration anpassen

Bearbeite `deploy/nginx.conf`:

```nginx
server_name deine-domain.com www.deine-domain.com;  # Deine Domain
```

Bei SSLaktivierung die auskommentierten Blöcke aktivieren.

---

## Wartung

### Logs ansehen (Docker)
```bash
docker logs mtg-commander-tracker
docker-compose logs -f
```

### Logs ansehen (nginx)
```bash
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log
```

### App neu starten
```bash
# Docker
docker-compose restart

# oder nginx
sudo systemctl restart nginx
```

### Updates deployen
```bash
npm run build
# Dateien synchronisieren
rsync -av --delete dist/* user@dein-server.com:/var/www/mtg-commander-tracker/
```

---

## Daten

Die App nutzt `localStorage` im Browser. Für Datensicherung:

1. **Export Funktion** in der App nutzen
2. Regelmäßig localStorage exportieren
3. Oder in eine Datenbank migrieren (zukünftige Option)

---

## Troubleshooting

### App lädt nicht
```bash
sudo systemctl status nginx
sudo nginx -t
```

### CSS/JS nicht geladen
```bash
# Prüfe die Rechte
ls -la /var/www/mtg-commander-tracker/
sudo chown -R www-data:www-data /var/www/mtg-commander-tracker/
```

### SSL Zertifikat Probleme
```bash
sudo certbot --nginx -d deine-domain.com --force-renewal
```
