#!/bin/sh
set -e

echo "=== 🚀 Iniciando contenedor de Laravel ==="

# ========================
# 1. Instalar dependencias
# ========================
if [ ! -f "vendor/autoload.php" ]; then
    echo "=== 📦 Instalando dependencias de Composer ==="
    composer install --no-interaction --prefer-dist
fi

# ========================
# 2. Crear .env si no existe
# ========================
if [ ! -f ".env" ]; then
    echo "=== 📄 Creando .env desde .env.example ==="
    cp .env.example .env
fi

# ========================
# 3. Inyectar variables de entorno en .env (sobrescribir)
# ========================
echo "=== 🛠️ Inyectando variables de entorno en .env ==="

# Función auxiliar para sobrescribir o agregar
set_env_var() {
    key="$1"
    value="$2"
    if [ -z "$value" ]; then
        echo "⚠️  Variable $key no definida, omitiendo."
        return
    fi
    # Escapar caracteres especiales para sed (slash, punto, etc.) usando delimitador #
    escaped_value=$(echo "$value" | sed -e 's/[\/&]/\\&/g')
    if grep -q "^${key}=" .env; then
        sed -i "s#^${key}=.*#${key}=${escaped_value}#" .env
    else
        echo "${key}=${value}" >> .env
    fi
}

# APP_KEY
if [ -n "$APP_KEY" ]; then
    set_env_var "APP_KEY" "$APP_KEY"
else
    echo "⚠️  APP_KEY no definida, se generará automáticamente."
fi

# Base de datos
if [ -n "$DB_HOST" ]; then
    set_env_var "DB_CONNECTION" "${DB_CONNECTION:-pgsql}"
    set_env_var "DB_HOST" "$DB_HOST"
    set_env_var "DB_PORT" "${DB_PORT:-5432}"
    set_env_var "DB_DATABASE" "$DB_DATABASE"
    set_env_var "DB_USERNAME" "$DB_USERNAME"
    set_env_var "DB_PASSWORD" "$DB_PASSWORD"
else
    echo "❌ ERROR: DB_HOST no está definida. Asegúrate de configurarla en Render."
    exit 1
fi

# Otras variables
if [ -n "$APP_URL" ]; then
    set_env_var "APP_URL" "$APP_URL"
fi
if [ -n "$APP_ENV" ]; then
    set_env_var "APP_ENV" "$APP_ENV"
fi
if [ -n "$APP_DEBUG" ]; then
    set_env_var "APP_DEBUG" "$APP_DEBUG"
fi
if [ -n "$SESSION_DRIVER" ]; then
    set_env_var "SESSION_DRIVER" "$SESSION_DRIVER"
fi
if [ -n "$SESSION_DOMAIN" ]; then
    set_env_var "SESSION_DOMAIN" "$SESSION_DOMAIN"
fi
if [ -n "$SANCTUM_STATEFUL_DOMAINS" ]; then
    set_env_var "SANCTUM_STATEFUL_DOMAINS" "$SANCTUM_STATEFUL_DOMAINS"
fi

# ========================
# 4. Generar APP_KEY si no existe
# ========================
APP_KEY_IN_ENV=$(grep "^APP_KEY=" .env | cut -d '=' -f2)
if [ -z "$APP_KEY_IN_ENV" ] || [ "$APP_KEY_IN_ENV" = "base64:..." ]; then
    echo "=== 🔑 Generando APP_KEY con artisan ==="
    php artisan key:generate --force
fi

# ========================
# 5. Verificar que las variables de BD están en .env
# ========================
echo "=== 📋 Contenido de .env (claves) ==="
grep -E "^(APP_ENV|APP_DEBUG|APP_URL|APP_KEY|DB_|SESSION_DRIVER|SESSION_DOMAIN|SANCTUM_STATEFUL_DOMAINS)=" .env || echo "⚠️  No se encontraron variables."

# ========================
# 6. Esperar a que PostgreSQL esté disponible
# ========================
echo "=== ⏳ Esperando PostgreSQL en ${DB_HOST}:${DB_PORT} ==="
RETRIES=30
until [ $RETRIES -le 0 ] || php -r "new PDO('pgsql:host=${DB_HOST};port=${DB_PORT};dbname=${DB_DATABASE}', '${DB_USERNAME}', '${DB_PASSWORD}');" 2>/dev/null; do
    echo "🔄 Esperando conexión a PostgreSQL... ($RETRIES intentos restantes)"
    RETRIES=$((RETRIES-1))
    sleep 3
done

if [ $RETRIES -le 0 ]; then
    echo "❌ No se pudo conectar a PostgreSQL después de varios intentos."
    exit 1
fi
echo "✅ PostgreSQL listo."

# ========================
# 7. Verificar migraciones
# ========================
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
    echo "=== 🗄️ Base de datos vacía — ejecutando migraciones y seeders ==="
    php artisan migrate --seed --force
else
    echo "=== 🗄️ Base de datos ya migrada ($MIGRATED migraciones previas) — ejecutando migraciones pendientes ==="
    php artisan migrate --force
fi

# ========================
# 8. Limpiar caché de configuración
# ========================
echo "=== 🧹 Limpiando caché ==="
php artisan config:clear
php artisan cache:clear

# ========================
# 9. Iniciar servidor
# ========================
echo "=== 🚀 Iniciando servidor en el puerto ${PORT:-8000} ==="
exec php artisan serve --host=0.0.0.0 --port=${PORT:-8000}