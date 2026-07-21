#!/bin/sh
set -e

# Instalar dependencias de Composer si no existen
if [ ! -f "vendor/autoload.php" ]; then
    echo "=== Instalando dependencias de Composer ==="
    composer install --no-interaction --prefer-dist
fi

# Crear .env si no existe
if [ ! -f ".env" ]; then
    echo "=== Creando .env desde .env.example ==="
    cp .env.example .env
fi

# Inyectar variables de entorno en .env (sobrescribir)
echo "=== Inyectando variables de entorno en .env ==="
# APP_KEY
if [ -n "$APP_KEY" ]; then
    sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" .env
fi

# Base de datos (PostgreSQL)
if [ -n "$DB_HOST" ]; then
    sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=${DB_CONNECTION:-pgsql}|" .env
    sed -i "s|^DB_HOST=.*|DB_HOST=${DB_HOST}|" .env
    sed -i "s|^DB_PORT=.*|DB_PORT=${DB_PORT:-5432}|" .env
    sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE}|" .env
    sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME}|" .env
    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" .env
fi

# APP_URL
if [ -n "$APP_URL" ]; then
    sed -i "s|^APP_URL=.*|APP_URL=${APP_URL}|" .env
fi

# Otros (si los tienes)
if [ -n "$SESSION_DOMAIN" ]; then
    sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=${SESSION_DOMAIN}|" .env
fi
if [ -n "$SANCTUM_STATEFUL_DOMAINS" ]; then
    sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS}|" .env
fi

# Verificar que APP_KEY se haya inyectado correctamente
APP_KEY_IN_ENV=$(grep "^APP_KEY=" .env | cut -d '=' -f2)
if [ -z "$APP_KEY_IN_ENV" ] || [ "$APP_KEY_IN_ENV" = "base64:..." ]; then
    echo "=== Generando APP_KEY con artisan ==="
    php artisan key:generate --force
fi

# Esperar a que PostgreSQL esté disponible
echo "=== Esperando PostgreSQL en ${DB_HOST}:${DB_PORT} ==="
until php -r "new PDO('pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
    echo "Esperando conexión a PostgreSQL..."
    sleep 2
done
echo "PostgreSQL listo."

# Verificar si la tabla de migraciones existe
MIGRATED=$(php -r "
try {
    \$pdo = new PDO('pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');
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
    echo "=== Base de datos ya migrada ($MIGRATED migraciones previas) — ejecutando migraciones pendientes ==="
    php artisan migrate --force
fi

# Limpiar caché
php artisan config:clear
php artisan cache:clear

# Iniciar servidor
echo "=== Iniciando servidor en el puerto ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}