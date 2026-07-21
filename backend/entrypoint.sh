#!/bin/sh
set -e

# Instalar dependencias de Composer si no existen
if [ ! -f "vendor/autoload.php" ]; then
    echo "=== Instalando dependencias de Composer ==="
    composer install --no-interaction --prefer-dist
fi

# Crear .env si no existe (no es obligatorio si Render inyecta variables)
if [ ! -f ".env" ]; then
    echo "=== Creando .env desde .env.example ==="
    cp .env.example .env
fi

# Generar APP_KEY si no está definida
APP_KEY_EXISTS=$(php -r "echo env('APP_KEY', '');" 2>/dev/null || echo "")
if [ -z "$APP_KEY_EXISTS" ] || [ "$APP_KEY_EXISTS" = "base64:..." ]; then
    echo "=== Generando APP_KEY ==="
    php artisan key:generate --force
fi

# Esperar a que PostgreSQL esté disponible
echo "=== Esperando PostgreSQL ==="
until php -r "new PDO('pgsql:host=${DB_HOST:-postgres};port=${DB_PORT:-5432};dbname=${DB_DATABASE:-altokepay}', '${DB_USERNAME:-postgres}', '${DB_PASSWORD:-}');" 2>/dev/null; do
    echo "Esperando conexión a PostgreSQL..."
    sleep 2
done
echo "PostgreSQL listo."

# Verificar si la tabla de migraciones existe
MIGRATED=$(php -r "
try {
    \$pdo = new PDO('pgsql:host=${DB_HOST:-postgres};port=${DB_PORT:-5432};dbname=${DB_DATABASE:-altokepay}', '${DB_USERNAME:-postgres}', '${DB_PASSWORD:-}');
    \$stmt = \$pdo->query('SELECT COUNT(*) FROM migrations');
    echo \$stmt->fetchColumn();
} catch (Exception \$e) {
    echo '0';
}
" 2>/dev/null || echo "0")

# Ejecutar migraciones según el estado de la base de datos
if [ "$MIGRATED" = "0" ]; then
    echo "=== Base de datos vacía — ejecutando migraciones y seeders ==="
    php artisan migrate --seed --force
else
    echo "=== Base de datos ya migrada ($MIGRATED migraciones previas) — ejecutando migraciones pendientes ==="
    php artisan migrate --force
fi

# Limpiar caché (opcional)
php artisan config:clear
php artisan cache:clear

# Iniciar el servidor en el puerto asignado por Render ($PORT) o 8000 por defecto
echo "=== Iniciando servidor en el puerto ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}