-- ============================================================
-- Al Tokepay — Esquema Inicial de Base de Datos
-- Versión: 1.0.0
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ── Extensiones necesarias ──────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLA: clientes
-- ============================================================
CREATE TABLE IF NOT EXISTS public.clientes (
  id                  UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nombres             TEXT        NOT NULL CHECK (char_length(nombres) >= 2),
  apellidos           TEXT        NOT NULL CHECK (char_length(apellidos) >= 2),
  documento_identidad TEXT        NOT NULL,
  celular             TEXT        NOT NULL,
  correo              TEXT,
  estado              TEXT        NOT NULL DEFAULT 'activo' CHECK (estado IN ('activo', 'bloqueado')),
  direccion           TEXT,
  notas               TEXT,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para clientes
CREATE INDEX IF NOT EXISTS idx_clientes_user_id        ON public.clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_clientes_documento       ON public.clientes(documento_identidad);
CREATE INDEX IF NOT EXISTS idx_clientes_estado          ON public.clientes(estado);
CREATE UNIQUE INDEX IF NOT EXISTS uq_clientes_doc_user  ON public.clientes(documento_identidad, user_id);

-- ============================================================
-- TABLA: prestamos
-- ============================================================
CREATE TABLE IF NOT EXISTS public.prestamos (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cliente_id        UUID        NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  monto_principal   NUMERIC(12,2) NOT NULL CHECK (monto_principal > 0),
  tasa_interes      NUMERIC(8,4)  NOT NULL CHECK (tasa_interes >= 0),  -- porcentaje mensual
  num_cuotas        INTEGER       NOT NULL CHECK (num_cuotas > 0 AND num_cuotas <= 360),
  frecuencia_pago   TEXT        NOT NULL DEFAULT 'mensual'
                    CHECK (frecuencia_pago IN ('diario', 'semanal', 'quincenal', 'mensual')),
  estado            TEXT        NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'activo', 'pagado', 'en_mora')),
  fecha_inicio      DATE        NOT NULL,
  monto_total       NUMERIC(12,2) GENERATED ALWAYS AS (NULL) STORED, -- se calcula en trigger
  saldo_pendiente   NUMERIC(12,2) NOT NULL DEFAULT 0,
  notas             TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Corregir: monto_total no puede ser GENERATED con NULL, usamos columna normal
ALTER TABLE public.prestamos DROP COLUMN IF EXISTS monto_total;
ALTER TABLE public.prestamos ADD COLUMN IF NOT EXISTS monto_total NUMERIC(12,2) NOT NULL DEFAULT 0;

-- Índices para prestamos
CREATE INDEX IF NOT EXISTS idx_prestamos_user_id      ON public.prestamos(user_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_cliente_id   ON public.prestamos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_prestamos_estado       ON public.prestamos(estado);

-- ============================================================
-- TABLA: cuotas
-- ============================================================
CREATE TABLE IF NOT EXISTS public.cuotas (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestamo_id       UUID        NOT NULL REFERENCES public.prestamos(id) ON DELETE CASCADE,
  num_cuota         INTEGER     NOT NULL CHECK (num_cuota > 0),
  monto_cuota       NUMERIC(12,2) NOT NULL CHECK (monto_cuota >= 0),
  monto_interes     NUMERIC(12,2) NOT NULL DEFAULT 0,
  monto_principal   NUMERIC(12,2) NOT NULL DEFAULT 0,
  saldo_capital     NUMERIC(12,2) NOT NULL DEFAULT 0, -- saldo restante después de esta cuota
  fecha_vencimiento DATE        NOT NULL,
  estado            TEXT        NOT NULL DEFAULT 'pendiente'
                    CHECK (estado IN ('pendiente', 'pagado', 'vencido')),
  monto_pagado      NUMERIC(12,2) NOT NULL DEFAULT 0.00,
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(prestamo_id, num_cuota)
);

-- Índices para cuotas
CREATE INDEX IF NOT EXISTS idx_cuotas_prestamo_id       ON public.cuotas(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_cuotas_estado            ON public.cuotas(estado);
CREATE INDEX IF NOT EXISTS idx_cuotas_fecha_vencimiento ON public.cuotas(fecha_vencimiento);

-- ============================================================
-- TABLA: pagos (cobranzas)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.pagos (
  id             UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  prestamo_id    UUID        NOT NULL REFERENCES public.prestamos(id) ON DELETE RESTRICT,
  cuota_id       UUID        REFERENCES public.cuotas(id) ON DELETE SET NULL,
  user_id        UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  monto_abonado  NUMERIC(12,2) NOT NULL CHECK (monto_abonado > 0),
  fecha_pago     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metodo_pago    TEXT        NOT NULL DEFAULT 'efectivo'
                 CHECK (metodo_pago IN ('efectivo', 'transferencia', 'billetera_digital')),
  notas          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para pagos
CREATE INDEX IF NOT EXISTS idx_pagos_prestamo_id ON public.pagos(prestamo_id);
CREATE INDEX IF NOT EXISTS idx_pagos_cuota_id    ON public.pagos(cuota_id);
CREATE INDEX IF NOT EXISTS idx_pagos_user_id     ON public.pagos(user_id);
CREATE INDEX IF NOT EXISTS idx_pagos_fecha_pago  ON public.pagos(fecha_pago);

-- ============================================================
-- TABLA: perfiles de usuario (roles)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.perfiles (
  id         UUID        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  rol        TEXT        NOT NULL DEFAULT 'administrador'
             CHECK (rol IN ('administrador', 'cobrador')),
  nombre     TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- FUNCIÓN: updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers updated_at
CREATE TRIGGER set_clientes_updated_at   BEFORE UPDATE ON public.clientes   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_prestamos_updated_at  BEFORE UPDATE ON public.prestamos  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_cuotas_updated_at     BEFORE UPDATE ON public.cuotas     FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
CREATE TRIGGER set_perfiles_updated_at   BEFORE UPDATE ON public.perfiles   FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ============================================================
-- FUNCIÓN: Auto-crear perfil al registrar usuario
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.perfiles (id, nombre)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'nombre', NEW.email));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- RPC: Registrar pago de forma atómica
-- Actualiza monto_pagado en cuota, cambia estado si corresponde,
-- actualiza saldo_pendiente del préstamo y recalcula mora.
-- ============================================================
CREATE OR REPLACE FUNCTION public.registrar_pago(
  p_prestamo_id   UUID,
  p_cuota_id      UUID,
  p_user_id       UUID,
  p_monto         NUMERIC,
  p_metodo        TEXT,
  p_notas         TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_cuota         public.cuotas%ROWTYPE;
  v_prestamo      public.prestamos%ROWTYPE;
  v_pago_id       UUID;
  v_nuevo_pagado  NUMERIC;
  v_estado_cuota  TEXT;
  v_cuotas_mora   INTEGER;
BEGIN
  -- Bloquear la cuota para escritura concurrente
  SELECT * INTO v_cuota FROM public.cuotas WHERE id = p_cuota_id FOR UPDATE;
  SELECT * INTO v_prestamo FROM public.prestamos WHERE id = p_prestamo_id FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cuota o préstamo no encontrado';
  END IF;

  -- Calcular nuevo monto pagado
  v_nuevo_pagado := v_cuota.monto_pagado + p_monto;

  -- Determinar nuevo estado de la cuota
  IF v_nuevo_pagado >= v_cuota.monto_cuota THEN
    v_estado_cuota := 'pagado';
  ELSE
    v_estado_cuota := 'pendiente';
  END IF;

  -- Actualizar cuota
  UPDATE public.cuotas
  SET
    monto_pagado = v_nuevo_pagado,
    estado       = v_estado_cuota,
    updated_at   = NOW()
  WHERE id = p_cuota_id;

  -- Insertar registro de pago
  INSERT INTO public.pagos (prestamo_id, cuota_id, user_id, monto_abonado, metodo_pago, notas)
  VALUES (p_prestamo_id, p_cuota_id, p_user_id, p_monto, p_metodo, p_notas)
  RETURNING id INTO v_pago_id;

  -- Recalcular saldo pendiente del préstamo
  UPDATE public.prestamos
  SET
    saldo_pendiente = (
      SELECT COALESCE(SUM(monto_cuota - monto_pagado), 0)
      FROM public.cuotas
      WHERE prestamo_id = p_prestamo_id AND estado != 'pagado'
    ),
    updated_at = NOW()
  WHERE id = p_prestamo_id;

  -- Verificar si hay cuotas en mora (vencidas sin pagar)
  SELECT COUNT(*) INTO v_cuotas_mora
  FROM public.cuotas
  WHERE prestamo_id = p_prestamo_id
    AND estado = 'vencido';

  -- Verificar si todas las cuotas están pagadas
  IF NOT EXISTS (
    SELECT 1 FROM public.cuotas
    WHERE prestamo_id = p_prestamo_id AND estado != 'pagado'
  ) THEN
    UPDATE public.prestamos SET estado = 'pagado', updated_at = NOW() WHERE id = p_prestamo_id;
  ELSIF v_cuotas_mora > 0 THEN
    UPDATE public.prestamos SET estado = 'en_mora', updated_at = NOW() WHERE id = p_prestamo_id;
  END IF;

  RETURN jsonb_build_object(
    'pago_id',      v_pago_id,
    'cuota_estado', v_estado_cuota,
    'monto_pagado', v_nuevo_pagado
  );
END;
$$;

-- ============================================================
-- RPC: Actualizar estados de cuotas vencidas (cron job)
-- ============================================================
CREATE OR REPLACE FUNCTION public.actualizar_cuotas_vencidas()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_actualizadas INTEGER;
BEGIN
  UPDATE public.cuotas
  SET estado = 'vencido', updated_at = NOW()
  WHERE estado = 'pendiente'
    AND fecha_vencimiento < CURRENT_DATE;

  GET DIAGNOSTICS v_actualizadas = ROW_COUNT;

  -- Actualizar estado de préstamos con cuotas vencidas
  UPDATE public.prestamos p
  SET estado = 'en_mora', updated_at = NOW()
  WHERE p.estado = 'activo'
    AND EXISTS (
      SELECT 1 FROM public.cuotas c
      WHERE c.prestamo_id = p.id AND c.estado = 'vencido'
    );

  RETURN v_actualizadas;
END;
$$;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE public.clientes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prestamos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cuotas    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagos     ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.perfiles  ENABLE ROW LEVEL SECURITY;

-- ── CLIENTES ──────────────────────────────────────────────
CREATE POLICY "clientes_select" ON public.clientes
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "clientes_insert" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clientes_update" ON public.clientes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "clientes_delete" ON public.clientes
  FOR DELETE USING (auth.uid() = user_id);

-- ── PRESTAMOS ─────────────────────────────────────────────
CREATE POLICY "prestamos_select" ON public.prestamos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "prestamos_insert" ON public.prestamos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prestamos_update" ON public.prestamos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "prestamos_delete" ON public.prestamos
  FOR DELETE USING (auth.uid() = user_id);

-- ── CUOTAS ────────────────────────────────────────────────
-- Las cuotas se acceden a través del préstamo
CREATE POLICY "cuotas_select" ON public.cuotas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.prestamos p
      WHERE p.id = prestamo_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "cuotas_insert" ON public.cuotas
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.prestamos p
      WHERE p.id = prestamo_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "cuotas_update" ON public.cuotas
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.prestamos p
      WHERE p.id = prestamo_id AND p.user_id = auth.uid()
    )
  );

CREATE POLICY "cuotas_delete" ON public.cuotas
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.prestamos p
      WHERE p.id = prestamo_id AND p.user_id = auth.uid()
    )
  );

-- ── PAGOS ─────────────────────────────────────────────────
CREATE POLICY "pagos_select" ON public.pagos
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "pagos_insert" ON public.pagos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "pagos_update" ON public.pagos
  FOR UPDATE USING (auth.uid() = user_id);

-- ── PERFILES ──────────────────────────────────────────────
CREATE POLICY "perfiles_select_own" ON public.perfiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "perfiles_update_own" ON public.perfiles
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- VISTAS (sin RLS — heredan seguridad del usuario)
-- ============================================================

-- Vista: cuotas enriquecidas con datos del préstamo y cliente
CREATE OR REPLACE VIEW public.v_cuotas_detalle AS
SELECT
  c.id,
  c.prestamo_id,
  c.num_cuota,
  c.monto_cuota,
  c.monto_interes,
  c.monto_principal,
  c.saldo_capital,
  c.fecha_vencimiento,
  c.estado,
  c.monto_pagado,
  c.updated_at,
  p.user_id,
  p.monto_principal     AS prestamo_monto,
  p.frecuencia_pago,
  cl.nombres            AS cliente_nombres,
  cl.apellidos          AS cliente_apellidos,
  cl.celular            AS cliente_celular,
  cl.documento_identidad
FROM public.cuotas c
JOIN public.prestamos p  ON p.id = c.prestamo_id
JOIN public.clientes  cl ON cl.id = p.cliente_id;

-- ============================================================
-- DATOS DE PRUEBA (comentar en producción)
-- ============================================================
-- Los datos de prueba se insertan vía la aplicación después de autenticarse.

-- ============================================================
-- FIN DEL SCRIPT
-- ============================================================
