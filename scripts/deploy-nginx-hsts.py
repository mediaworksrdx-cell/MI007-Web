import subprocess
import base64

config = """server {
    listen 80;
    listen [::]:80;
    server_name marketintelligence-007.com www.marketintelligence-007.com;

    return 301 https://marketintelligence-007.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name www.marketintelligence-007.com;

    ssl_certificate /etc/letsencrypt/live/marketintelligence-007.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/marketintelligence-007.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    return 301 https://marketintelligence-007.com$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name marketintelligence-007.com;

    ssl_certificate /etc/letsencrypt/live/marketintelligence-007.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/marketintelligence-007.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # Modern Security Headers & Strict HSTS
    add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;

    client_max_body_size 10M;

    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Host $host;
    proxy_set_header X-Forwarded-Port $server_port;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # WhatsApp Bot Gateway — internal loopback only (never expose publicly)
    location /whatsapp/ {
        allow 127.0.0.1;
        allow ::1;
        deny all;

        proxy_pass http://127.0.0.1:5050/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
    }

    # Trade Engine Public Read-Only API Routes (subscribe & instruments removed from public exposure)
    location ~ ^/(candles|live-prices|crypto-prices|macro-data|search|historical|crypto|coingecko-historical-data|us|news|economic-calendar|notifications|quote|quotes|smc|fno) {
        limit_except GET HEAD OPTIONS {
            deny all;
        }
        if ($request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' 'https://marketintelligence-007.com' always;
            add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
            add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        add_header 'Access-Control-Allow-Origin' 'https://marketintelligence-007.com' always;
        add_header 'Access-Control-Allow-Methods' 'GET, OPTIONS' always;
        add_header 'Access-Control-Allow-Headers' 'DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range' always;

        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
    }

    # Trade Engine WebSocket
    location /ws {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }

    # MI-007 Next.js Terminal Application
    location / {
        proxy_pass http://127.0.0.1:3007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 300s;
        proxy_send_timeout 300s;
    }
}
"""

b64 = base64.b64encode(config.encode('utf-8')).decode('utf-8')
cmd = f'echo {b64} | base64 -d | sudo tee /etc/nginx/sites-available/marketintelligence > /dev/null && sudo nginx -t && sudo systemctl reload nginx'
res = subprocess.run(['ssh', '-o', 'StrictHostKeyChecking=no', '-i', r'C:\Users\daarv\.ssh\id_ed25519', 'synthetixanalytics@34.27.67.139', cmd], capture_output=True, text=True)
print('STDOUT:', res.stdout)
print('STDERR:', res.stderr)
print('Return code:', res.returncode)
