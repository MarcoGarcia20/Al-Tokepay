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

# Forzar que APP_KEY esté definida en el .env
# Si la variable de entorno APP_KEY está definida, la usamos; si no, la generamos
if [ -n "$APP_KEY" ]; then
    echo "=== Usando APP_KEY desde variable de entorno ==="
    # Reemplazar o agregar APP_KEY en .env
    if grep -q "^APP_KEY=" .env; then
        sed -i "s|^APP_KEY=.*|APP_KEY=$APP_KEY|" .env
    else
        echo "APP_KEY=$APP_KEY" >> .env
    fi
else
    echo "=== Generando APP_KEY con artisan ==="
    php artisan key:generate --force
fi

# Esperar a que PostgreSQL esté disponible
echo "=== Esperando PostgreSQL en ${DB_HOST:-postgres}:${DB_PORT:-5432} ==="
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