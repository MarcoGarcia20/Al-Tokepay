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

# --- INYECCIÓN DE VARIABLES DE ENTORNO EN .env ---
# Esto asegura que las variables de Render se usen en lugar de las del .env.example
echo "=== Inyectando variables de entorno en .env ==="

# Inyectar APP_KEY
if [ -n "$APP_KEY" ]; then
    if grep -q "^APP_KEY=" .env; then
        sed -i "s|^APP_KEY=.*|APP_KEY=$APP_KEY|" .env
    else
        echo "APP_KEY=$APP_KEY" >> .env
    fi
else
    echo "=== Generando APP_KEY con artisan ==="
    php artisan key:generate --force
fi

# Inyectar variables de base de datos (PostgreSQL)
if [ -n "$DB_CONNECTION" ]; then
    sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=$DB_CONNECTION/" .env || echo "DB_CONNECTION=$DB_CONNECTION" >> .env
fi
if [ -n "$DB_HOST" ]; then
    sed -i "s/^DB_HOST=.*/DB_HOST=$DB_HOST/" .env || echo "DB_HOST=$DB_HOST" >> .env
fi
if [ -n "$DB_PORT" ]; then
    sed -i "s/^DB_PORT=.*/DB_PORT=$DB_PORT/" .env || echo "DB_PORT=$DB_PORT" >> .env
fi
if [ -n "$DB_DATABASE" ]; then
    sed -i "s/^DB_DATABASE=.*/DB_DATABASE=$DB_DATABASE/" .env || echo "DB_DATABASE=$DB_DATABASE" >> .env
fi
if [ -n "$DB_USERNAME" ]; then
    sed -i "s/^DB_USERNAME=.*/DB_USERNAME=$DB_USERNAME/" .env || echo "DB_USERNAME=$DB_USERNAME" >> .env
fi
if [ -n "$DB_PASSWORD" ]; then
    sed -i "s/^DB_PASSWORD=.*/DB_PASSWORD=$DB_PASSWORD/" .env || echo "DB_PASSWORD=$DB_PASSWORD" >> .env
fi

# Opcional: forzar que no use sqlite
if grep -q "^DB_CONNECTION=sqlite" .env; then
    echo "=== Forzando DB_CONNECTION=pgsql porque estamos en Render ==="
    sed -i "s/^DB_CONNECTION=.*/DB_CONNECTION=pgsql/" .env
fi

# --- FIN DE INYECCIÓN ---

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

# Limpiar caché
php artisan config:clear
php artisan cache:clear

# Iniciar el servidor
echo "=== Iniciando servidor en el puerto ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}