#!/bin/sh
set -e

if [ ! -f "vendor/autoload.php" ]; then
    echo "=== Instalando dependencias de Composer ==="
    composer install --no-interaction --prefer-dist
fi

if [ ! -f ".env" ]; then
    echo "=== Creando .env desde .env.example ==="
    cp .env.example .env
fi

APP_KEY_EXISTS=$(php -r "echo env('APP_KEY', '');" 2>/dev/null || echo "")
if [ -z "$APP_KEY_EXISTS" ] || [ "$APP_KEY_EXISTS" = "base64:..." ]; then
    echo "=== Generando APP_KEY ==="
    php artisan key:generate --force
fi

echo "=== Esperando MySQL ==="
until php -r "new PDO('mysql:host=${DB_HOST:-mysql};port=${DB_PORT:-3306};dbname=${DB_DATABASE:-altokepay}', '${DB_USERNAME:-root}', '${DB_PASSWORD:-}');" 2>/dev/null; do
    sleep 2
done
echo "MySQL listo."

MIGRATED=$(php -r "
try {
    \$pdo = new PDO('mysql:host=${DB_HOST:-mysql};port=${DB_PORT:-3306};dbname=${DB_DATABASE:-altokepay}', '${DB_USERNAME:-root}', '${DB_PASSWORD:-}');
    \$stmt = \$pdo->query('SELECT COUNT(*) FROM migrations');
    echo \$stmt->fetchColumn();
} catch (Exception \$e) {
    echo '0';
}
" 2>/dev/null || echo "0")

if [ "$MIGRATED" = "0" ]; then
    echo "=== Base de datos vacía — ejecutando migraciones y seeders ==="
    php artisan migrate --seed --force
else
    echo "=== Base de datos ya migrada ($MIGRATED migraciones previas) — saltando ==="
fi

echo "=== Iniciando servidor ==="
php artisan serve --host=0.0.0.0 --port=8000
