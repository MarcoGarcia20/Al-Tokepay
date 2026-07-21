#!/bin/sh
set -e

echo "=== Iniciando entrypoint ==="

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

# --- Inyección forzada de variables de entorno ---
echo "=== Inyectando variables de entorno en .env ==="

# APP_KEY
if [ -n "$APP_KEY" ]; then
    if grep -q "^APP_KEY=" .env; then
        sed -i "s|^APP_KEY=.*|APP_KEY=${APP_KEY}|" .env
    else
        echo "APP_KEY=${APP_KEY}" >> .env
    fi
fi

# Base de datos
if [ -n "$DB_HOST" ]; then
    # Forzar cada variable (si no existe la línea, se agrega)
    sed -i "s|^DB_CONNECTION=.*|DB_CONNECTION=${DB_CONNECTION:-pgsql}|" .env
    if ! grep -q "^DB_CONNECTION=" .env; then
        echo "DB_CONNECTION=${DB_CONNECTION:-pgsql}" >> .env
    fi

    sed -i "s|^DB_HOST=.*|DB_HOST=${DB_HOST}|" .env
    if ! grep -q "^DB_HOST=" .env; then
        echo "DB_HOST=${DB_HOST}" >> .env
    fi

    sed -i "s|^DB_PORT=.*|DB_PORT=${DB_PORT:-5432}|" .env
    if ! grep -q "^DB_PORT=" .env; then
        echo "DB_PORT=${DB_PORT:-5432}" >> .env
    fi

    sed -i "s|^DB_DATABASE=.*|DB_DATABASE=${DB_DATABASE}|" .env
    if ! grep -q "^DB_DATABASE=" .env; then
        echo "DB_DATABASE=${DB_DATABASE}" >> .env
    fi

    sed -i "s|^DB_USERNAME=.*|DB_USERNAME=${DB_USERNAME}|" .env
    if ! grep -q "^DB_USERNAME=" .env; then
        echo "DB_USERNAME=${DB_USERNAME}" >> .env
    fi

    sed -i "s|^DB_PASSWORD=.*|DB_PASSWORD=${DB_PASSWORD}|" .env
    if ! grep -q "^DB_PASSWORD=" .env; then
        echo "DB_PASSWORD=${DB_PASSWORD}" >> .env
    fi
else
    echo "ERROR: DB_HOST no está definida. Asegúrate de configurarla en Render."
    exit 1
fi

# APP_URL
if [ -n "$APP_URL" ]; then
    sed -i "s|^APP_URL=.*|APP_URL=${APP_URL}|" .env
    if ! grep -q "^APP_URL=" .env; then
        echo "APP_URL=${APP_URL}" >> .env
    fi
fi

# SESSION_DRIVER (obligatorio para sesiones)
if [ -n "$SESSION_DRIVER" ]; then
    sed -i "s|^SESSION_DRIVER=.*|SESSION_DRIVER=${SESSION_DRIVER}|" .env
    if ! grep -q "^SESSION_DRIVER=" .env; then
        echo "SESSION_DRIVER=${SESSION_DRIVER}" >> .env
    fi
else
    echo "SESSION_DRIVER=database" >> .env
fi

# Otras variables (opcionales)
[ -n "$SESSION_DOMAIN" ] && sed -i "s|^SESSION_DOMAIN=.*|SESSION_DOMAIN=${SESSION_DOMAIN}|" .env
[ -n "$SANCTUM_STATEFUL_DOMAINS" ] && sed -i "s|^SANCTUM_STATEFUL_DOMAINS=.*|SANCTUM_STATEFUL_DOMAINS=${SANCTUM_STATEFUL_DOMAINS}|" .env

# --- Mostrar configuración (sin datos sensibles) ---
echo "=== Configuración de .env ==="
grep -E "^(APP_ENV|APP_DEBUG|APP_URL|DB_CONNECTION|DB_HOST|DB_PORT|DB_DATABASE|SESSION_DRIVER)" .env

# --- Esperar a que PostgreSQL esté disponible ---
echo "=== Esperando PostgreSQL en ${DB_HOST}:${DB_PORT} ==="
MAX_RETRIES=30
RETRY_COUNT=0
until php -r "new PDO('pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
    RETRY_COUNT=$((RETRY_COUNT + 1))
    if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
        echo "ERROR: No se pudo conectar a PostgreSQL después de $MAX_RETRIES intentos."
        exit 1
    fi
    echo "Esperando conexión a PostgreSQL... (intento $RETRY_COUNT/$MAX_RETRIES)"
    sleep 2
done
echo "PostgreSQL listo."

# --- Migraciones ---
echo "=== Ejecutando migraciones ==="
php artisan migrate --force

# --- Verificar y crear usuario admin si no existe ---
echo "=== Verificando usuario administrador ==="
ADMIN_EXISTS=$(php -r "
try {
    \$pdo = new PDO('pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');
    \$stmt = \$pdo->query(\"SELECT COUNT(*) FROM users WHERE email = 'admin@altokepay.com'\");
    echo \$stmt->fetchColumn();
} catch (Exception \$e) {
    echo '0';
}
" 2>/dev/null || echo "0")

if [ "$ADMIN_EXISTS" = "0" ]; then
    echo "=== Usuario admin no encontrado. Ejecutando seeders ==="
    php artisan db:seed --class=UserSeeder --force
    # También ejecutar DatabaseSeeder si es necesario (pero UserSeeder ya crea el admin)
    # php artisan db:seed --force
else
    echo "=== Usuario admin ya existe. Saltando seeders ==="
fi

# --- Limpiar caché ---
php artisan config:clear
php artisan cache:clear

# --- Iniciar servidor ---
echo "=== Iniciando servidor en el puerto ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}