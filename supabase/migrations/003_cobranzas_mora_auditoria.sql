-- ============================================================
-- Al Tokepay — Migración: Cobranzas, Mora, Auditoría & RLS
-- Versión: 1.1.0
-- Ejecutar en: Supabase SQL Editor
-- ============================================================

-- ── 1. AGREGAR COLUMNAS A TABLAS EXISTENTES ──────────────────

-- Tabla: cuotas
ALTER TABLE public.cuotas ADD COLUMN IF NOT EXISTS dias_retraso INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.cuotas ADD COLUMN IF NOT EXISTS penalidad_fija_acumulada NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.cuotas ADD COLUMN IF NOT EXISTS interes_moratorio_acumulado NUMERIC(10,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.cuotas ADD COLUMN IF NOT EXISTS ultimo_calculo_mora DATE;

-- Cambiar check constraint de estado en cuotas para incluir 'parcial'
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN 
        SELECT conname 
        FROM pg_constraint 
        WHERE conrelid = 'public.cuotas'::regclass AND contype = 'c' AND conname LIKE '%estado%'
    LOOP
        EXECUTE 'ALTER TABLE public.cuotas DROP CONSTRAINT ' || quote_ident(r.conname);
    END LOOP;
END $$;

ALTER TABLE public.cuotas ADD CONSTRAINT cuotas_estado_check CHECK (estado IN ('pendiente', 'pagado', 'vencido', 'parcial'));

-- Tabla: clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS saldo_favor NUMERIC(12,2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS cobrador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Tabla: prestamos
ALTER TABLE public.prestamos ADD COLUMN IF NOT EXISTS cobrador_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
ALTER TABLE public.prestamos ADD COLUMN IF NOT EXISTS excluir_domingos BOOLEAN NOT NULL DEFAULT FALSE;

-- Tabla: pagos
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS cobrador_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS hora_pago TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.pagos ADD COLUMN IF NOT EXISTS comprobante_url TEXT;

-- Realizar backfill para registros existentes de pagos
UPDATE public.pagos SET cobrador_id = user_id WHERE cobrador_id IS NULL;
ALTER TABLE public.pagos ALTER COLUMN cobrador_id SET NOT NULL;

-- ── 2. ACTUALIZAR VISTA DE DETALLE DE CUOTAS ────────────────

DROP VIEW IF EXISTS public.v_cuotas_detalle;
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
  c.dias_retraso,
  c.penalidad_fija_acumulada,
  c.interes_moratorio_acumulado,
  c.ultimo_calculo_mora,
  c.updated_at,
  p.user_id,
  p.monto_principal     AS prestamo_monto,
  p.frecuencia_pago,
  p.excluir_domingos,
  cl.nombres            AS cliente_nombres,
  cl.apellidos          AS cliente_apellidos,
  cl.celular            AS cliente_celular,
  cl.documento_identidad
FROM public.cuotas c
JOIN public.prestamos p  ON p.id = c.prestamo_id
JOIN public.clientes  cl ON cl.id = p.cliente_id;

-- ── 3. TABLA: parametros_sistema ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.parametros_sistema (
  clave       TEXT        PRIMARY KEY,
  valor       TEXT        NOT NULL,
  descripcion TEXT,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Insertar parámetros semilla
INSERT INTO public.parametros_sistema (clave, valor, descripcion)
VALUES 
  ('penalidad_diaria_mora', '5.00', 'Penalidad fija en soles por cada día de retraso en una cuota'),
  ('tasa_mora_porcentaje', '1.50', 'Tasa mensual de interés moratorio (en porcentaje) a prorrata diaria')
ON CONFLICT (clave) DO NOTHING;

-- Trigger updated_at para parametros_sistema
CREATE TRIGGER set_parametros_updated_at BEFORE UPDATE ON public.parametros_sistema FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- ── 4. TABLA: auditoria_pagos ────────────────────────────────

CREATE TABLE IF NOT EXISTS public.auditoria_pagos (
  id              UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  pago_id         UUID        NOT NULL,
  prestamo_id     UUID        NOT NULL,
  cuota_id        UUID,
  user_id         UUID        NOT NULL,
  cobrador_id     UUID        NOT NULL,
  monto_abonado   NUMERIC(12,2) NOT NULL,
  fecha_pago      TIMESTAMPTZ,
  metodo_pago     TEXT        NOT NULL,
  comprobante_url  TEXT,
  notas           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para insertar de forma inmutable en auditoria_pagos
CREATE OR REPLACE FUNCTION public.registrar_auditoria_pago()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.auditoria_pagos (
    pago_id,
    prestamo_id,
    cuota_id,
    user_id,
    cobrador_id,
    monto_abonado,
    fecha_pago,
    metodo_pago,
    comprobante_url,
    notas
  ) VALUES (
    NEW.id,
    NEW.prestamo_id,
    NEW.cuota_id,
    NEW.user_id,
    NEW.cobrador_id,
    NEW.monto_abonado,
    NEW.fecha_pago,
    NEW.metodo_pago,
    NEW.comprobante_url,
    NEW.notas
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER on_pago_inserted
  AFTER INSERT ON public.pagos
  FOR EACH ROW EXECUTE FUNCTION public.registrar_auditoria_pago();

-- Trigger para prevenir actualizaciones y eliminaciones en auditoria_pagos
CREATE OR REPLACE FUNCTION public.bloquear_auditoria_pagos()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'No se permite modificar ni eliminar registros de la tabla de auditoría';
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER prevent_update_delete_auditoria
  BEFORE UPDATE OR DELETE ON public.auditoria_pagos
  FOR EACH ROW EXECUTE FUNCTION public.bloquear_auditoria_pagos();

-- ── 5. HELPER PARA RLS ────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.obtener_rol_usuario(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_rol TEXT;
BEGIN
  SELECT rol INTO v_rol FROM public.perfiles WHERE id = p_user_id;
  RETURN COALESCE(v_rol, 'cobrador');
END;
$$;

-- ── 6. RPC: crear_prestamo_con_cuotas ACTUALIZADO ────────────

CREATE OR REPLACE FUNCTION public.crear_prestamo_con_cuotas(
  p_cliente_id        UUID,
  p_user_id           UUID,
  p_monto_principal   NUMERIC,
  p_tasa_interes      NUMERIC,
  p_num_cuotas        INTEGER,
  p_frecuencia_pago   TEXT,
  p_fecha_inicio      DATE,
  p_monto_total       NUMERIC,
  p_notas             TEXT,
  p_cuotas            JSONB,
  p_excluir_domingos  BOOLEAN DEFAULT FALSE,
  p_cobrador_id       UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prestamo_id UUID;
  v_cuota JSONB;
BEGIN
  -- 1. Insertar el préstamo
  INSERT INTO public.prestamos (
    user_id,
    cliente_id,
    monto_principal,
    tasa_interes,
    num_cuotas,
    frecuencia_pago,
    estado,
    fecha_inicio,
    monto_total,
    saldo_pendiente,
    excluir_domingos,
    cobrador_id,
    notas
  ) VALUES (
    p_user_id,
    p_cliente_id,
    p_monto_principal,
    p_tasa_interes,
    p_num_cuotas,
    p_frecuencia_pago,
    'activo',
    p_fecha_inicio,
    p_monto_total,
    p_monto_total,
    p_excluir_domingos,
    p_cobrador_id,
    p_notas
  ) RETURNING id INTO v_prestamo_id;

  -- 2. Recorrer e insertar las cuotas
  FOR v_cuota IN SELECT * FROM jsonb_array_elements(p_cuotas)
  LOOP
    INSERT INTO public.cuotas (
      prestamo_id,
      num_cuota,
      monto_cuota,
      monto_interes,
      monto_principal,
      saldo_capital,
      fecha_vencimiento,
      estado,
      monto_pagado
    ) VALUES (
      v_prestamo_id,
      (v_cuota->>'numCuota')::INTEGER,
      (v_cuota->>'cuotaTotal')::NUMERIC,
      (v_cuota->>'interes')::NUMERIC,
      (v_cuota->>'capital')::NUMERIC,
      (v_cuota->>'saldoRestante')::NUMERIC,
      (v_cuota->>'fechaVencimiento')::DATE,
      'pendiente',
      0.00
    );
  END LOOP;

  RETURN v_prestamo_id;
END;
$$;

-- ── 7. RPC: registrar_abono_automatico (FIFO + Bloqueo) ──────

CREATE OR REPLACE FUNCTION public.registrar_abono_automatico(
  p_prestamo_id     UUID,
  p_user_id         UUID,
  p_cobrador_id     UUID,
  p_monto           NUMERIC,
  p_metodo          TEXT,
  p_notas           TEXT DEFAULT NULL,
  p_comprobante_url  TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_prestamo            public.prestamos%ROWTYPE;
  v_cuota               RECORD;
  v_monto_restante      NUMERIC;
  v_pago_id             UUID;
  v_pagos_registrados   JSONB := '[]'::jsonb;
  v_cuota_pendiente     NUMERIC;
  v_monto_aplicado      NUMERIC;
  v_penalidades_cuota   NUMERIC;
  v_nuevo_pagado        NUMERIC;
  v_cliente_id          UUID;
  v_mora_aplicada       NUMERIC;
  v_penalidad_aplicada  NUMERIC;
BEGIN
  -- 1. Bloquear cuotas afectadas de forma atómica al inicio
  PERFORM id FROM public.cuotas
  WHERE prestamo_id = p_prestamo_id
    AND estado IN ('pendiente', 'parcial', 'vencido')
  ORDER BY fecha_vencimiento ASC, num_cuota ASC
  FOR UPDATE;

  -- 2. Bloquear préstamo y obtener datos
  SELECT * INTO v_prestamo FROM public.prestamos WHERE id = p_prestamo_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Préstamo no encontrado';
  END IF;

  v_cliente_id := v_prestamo.cliente_id;
  v_monto_restante := p_monto;

  -- 3. Recorrer cuotas no pagadas por vencimiento ascendente
  FOR v_cuota IN 
    SELECT * FROM public.cuotas 
    WHERE prestamo_id = p_prestamo_id AND estado != 'pagado' 
    ORDER BY fecha_vencimiento ASC, num_cuota ASC 
  LOOP
    EXIT WHEN v_monto_restante <= 0;

    -- Penalidades acumuladas en esta cuota
    v_penalidades_cuota := v_cuota.penalidad_fija_acumulada + v_cuota.interes_moratorio_acumulado;
    -- Capital + Interés pendiente
    v_cuota_pendiente := v_cuota.monto_cuota - v_cuota.monto_pagado;

    -- Total adeudado en esta cuota (incluyendo penalidades)
    IF v_monto_restante >= (v_cuota_pendiente + v_penalidades_cuota) THEN
      -- Se paga toda la cuota y sus penalidades
      v_monto_aplicado := v_cuota_pendiente + v_penalidades_cuota;
      v_nuevo_pagado := v_cuota.monto_cuota;
      
      -- Actualizar cuota a pagado, y poner penalidades en cero
      UPDATE public.cuotas
      SET
        monto_pagado = v_nuevo_pagado,
        penalidad_fija_acumulada = 0,
        interes_moratorio_acumulado = 0,
        estado = 'pagado',
        updated_at = NOW()
      WHERE id = v_cuota.id;

      -- Registrar el pago para esta cuota
      INSERT INTO public.pagos (prestamo_id, cuota_id, user_id, cobrador_id, monto_abonado, metodo_pago, comprobante_url, notas)
      VALUES (p_prestamo_id, v_cuota.id, p_user_id, p_cobrador_id, v_monto_aplicado, p_metodo, p_comprobante_url, p_notas)
      RETURNING id INTO v_pago_id;

      v_pagos_registrados := v_pagos_registrados || jsonb_build_object(
        'cuota_id', v_cuota.id,
        'num_cuota', v_cuota.num_cuota,
        'monto_aplicado', v_monto_aplicado,
        'estado', 'pagado'
      );

      v_monto_restante := v_monto_restante - v_monto_aplicado;

    ELSE
      -- Abono parcial
      v_monto_aplicado := v_monto_restante;
      
      -- Primero se pagan las penalidades
      IF v_monto_restante >= v_penalidades_cuota THEN
        -- Se pagan todas las penalidades y una parte de la cuota base
        v_monto_restante := v_monto_restante - v_penalidades_cuota;
        v_nuevo_pagado := v_cuota.monto_pagado + v_monto_restante;
        
        UPDATE public.cuotas
        SET
          monto_pagado = v_nuevo_pagado,
          penalidad_fija_acumulada = 0,
          interes_moratorio_acumulado = 0,
          estado = 'parcial',
          updated_at = NOW()
        WHERE id = v_cuota.id;
      ELSE
        -- No alcanza para pagar todas las penalidades. Se abona todo a penalidades.
        -- Se descuenta de la penalidad fija primero
        IF v_monto_restante >= v_cuota.penalidad_fija_acumulada THEN
          v_penalidad_aplicada := v_cuota.penalidad_fija_acumulada;
          v_mora_aplicada := v_monto_restante - v_penalidad_aplicada;
          
          UPDATE public.cuotas
          SET
            penalidad_fija_acumulada = 0,
            interes_moratorio_acumulado = interes_moratorio_acumulado - v_mora_aplicada,
            estado = 'parcial',
            updated_at = NOW()
          WHERE id = v_cuota.id;
        ELSE
          v_penalidad_aplicada := v_monto_restante;
          
          UPDATE public.cuotas
          SET
            penalidad_fija_acumulada = penalidad_fija_acumulada - v_penalidad_aplicada,
            estado = 'parcial',
            updated_at = NOW()
          WHERE id = v_cuota.id;
        END IF;
      END IF;

      -- Registrar el pago parcial
      INSERT INTO public.pagos (prestamo_id, cuota_id, user_id, cobrador_id, monto_abonado, metodo_pago, comprobante_url, notas)
      VALUES (p_prestamo_id, v_cuota.id, p_user_id, p_cobrador_id, v_monto_aplicado, p_metodo, p_comprobante_url, p_notas)
      RETURNING id INTO v_pago_id;

      v_pagos_registrados := v_pagos_registrados || jsonb_build_object(
        'cuota_id', v_cuota.id,
        'num_cuota', v_cuota.num_cuota,
        'monto_aplicado', v_monto_aplicado,
        'estado', 'parcial'
      );

      v_monto_restante := 0;
    END IF;

  END LOOP;

  -- 4. Si queda excedente, va a saldo a favor del cliente
  IF v_monto_restante > 0 THEN
    UPDATE public.clientes
    SET saldo_favor = saldo_favor + v_monto_restante
    WHERE id = v_cliente_id;

    -- Registrar pago sin cuota asociada (saldo a favor)
    INSERT INTO public.pagos (prestamo_id, cuota_id, user_id, cobrador_id, monto_abonado, metodo_pago, comprobante_url, notas)
    VALUES (p_prestamo_id, NULL, p_user_id, p_cobrador_id, v_monto_restante, p_metodo, p_comprobante_url, COALESCE(p_notas, 'Excedente guardado como saldo a favor del cliente'))
    RETURNING id INTO v_pago_id;

    v_pagos_registrados := v_pagos_registrados || jsonb_build_object(
      'cuota_id', NULL,
      'num_cuota', NULL,
      'monto_aplicado', v_monto_restante,
      'estado', 'excedente_saldo_favor'
    );
  END IF;

  -- 5. Recalcular el saldo pendiente del préstamo
  UPDATE public.prestamos
  SET
    saldo_pendiente = (
      SELECT COALESCE(SUM(monto_cuota - monto_pagado), 0)
      FROM public.cuotas
      WHERE prestamo_id = p_prestamo_id AND estado != 'pagado'
    ),
    updated_at = NOW()
  WHERE id = p_prestamo_id;

  -- 6. Control de estados y cierre del préstamo (RF-04 + Penalidades en cero)
  IF NOT EXISTS (
    SELECT 1 FROM public.cuotas
    WHERE prestamo_id = p_prestamo_id 
      AND (
        estado <> 'pagado'
        OR penalidad_fija_acumulada > 0
        OR interes_moratorio_acumulado > 0
      )
  ) THEN
    UPDATE public.prestamos 
    SET estado = 'pagado', updated_at = NOW() 
    WHERE id = p_prestamo_id;
  ELSE
    -- Si quedan cuotas vencidas
    IF EXISTS (
      SELECT 1 FROM public.cuotas 
      WHERE prestamo_id = p_prestamo_id AND estado = 'vencido'
    ) THEN
      UPDATE public.prestamos 
      SET estado = 'en_mora', updated_at = NOW() 
      WHERE id = p_prestamo_id;
    ELSE
      UPDATE public.prestamos 
      SET estado = 'activo', updated_at = NOW() 
      WHERE id = p_prestamo_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'pagos', v_pagos_registrados
  );
END;
$$;

-- ── 8. RPC: procesar_mora_diaria ──────────────────────────────

CREATE OR REPLACE FUNCTION public.procesar_mora_diaria()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_penalidad_diaria    NUMERIC;
  v_tasa_mora_mensual   NUMERIC;
  v_tasa_mora_diaria    NUMERIC;
  v_cuota               RECORD;
  v_cant_actualizadas   INTEGER := 0;
  v_monto_mora_sumado   NUMERIC := 0;
  v_monto_penalidad_sumado NUMERIC := 0;
  v_monto_pendiente     NUMERIC;
  v_interes_diario      NUMERIC;
BEGIN
  -- 1. Obtener parámetros configurados
  SELECT valor::NUMERIC INTO v_penalidad_diaria FROM public.parametros_sistema WHERE clave = 'penalidad_diaria_mora';
  IF NOT FOUND THEN
    v_penalidad_diaria := 5.00;
  END IF;

  SELECT valor::NUMERIC INTO v_tasa_mora_mensual FROM public.parametros_sistema WHERE clave = 'tasa_mora_porcentaje';
  IF NOT FOUND THEN
    v_tasa_mora_mensual := 1.50;
  END IF;

  v_tasa_mora_diaria := v_tasa_mora_mensual / 100.0 / 30.0;

  -- 2. Buscar todas las cuotas vencidas que no se hayan procesado hoy
  FOR v_cuota IN
    SELECT c.*, p.tasa_interes
    FROM public.cuotas c
    JOIN public.prestamos p ON c.prestamo_id = p.id
    WHERE c.estado != 'pagado'
      AND c.fecha_vencimiento < CURRENT_DATE
      AND (c.ultimo_calculo_mora IS NULL OR c.ultimo_calculo_mora < CURRENT_DATE)
  LOOP
    v_monto_pendiente := v_cuota.monto_cuota - v_cuota.monto_pagado;
    v_interes_diario := ROUND(v_monto_pendiente * v_tasa_mora_diaria, 2);
    
    UPDATE public.cuotas
    SET
      estado = 'vencido',
      dias_retraso = dias_retraso + 1,
      penalidad_fija_acumulada = penalidad_fija_acumulada + v_penalidad_diaria,
      interes_moratorio_acumulado = interes_moratorio_acumulado + v_interes_diario,
      ultimo_calculo_mora = CURRENT_DATE,
      updated_at = NOW()
    WHERE id = v_cuota.id;

    -- Poner el préstamo en mora
    UPDATE public.prestamos
    SET estado = 'en_mora', updated_at = NOW()
    WHERE id = v_cuota.prestamo_id AND estado = 'activo';

    v_cant_actualizadas := v_cant_actualizadas + 1;
    v_monto_mora_sumado := v_monto_mora_sumado + v_interes_diario;
    v_monto_penalidad_sumado := v_monto_penalidad_sumado + v_penalidad_diaria;
  END LOOP;

  RETURN jsonb_build_object(
    'cuotas_procesadas', v_cant_actualizadas,
    'mora_total_acumulada', v_monto_mora_sumado,
    'penalidad_total_acumulada', v_monto_penalidad_sumado
  );
END;
$$;

-- ── 9. POLÍTICAS RLS POR ROL Y ASIGNACIÓN ───────────────────────

-- Eliminar políticas antiguas para evitar colisiones
DROP POLICY IF EXISTS "clientes_select" ON public.clientes;
DROP POLICY IF EXISTS "clientes_insert" ON public.clientes;
DROP POLICY IF EXISTS "clientes_update" ON public.clientes;
DROP POLICY IF EXISTS "clientes_delete" ON public.clientes;

DROP POLICY IF EXISTS "prestamos_select" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_insert" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_update" ON public.prestamos;
DROP POLICY IF EXISTS "prestamos_delete" ON public.prestamos;

DROP POLICY IF EXISTS "cuotas_select" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_insert" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_update" ON public.cuotas;
DROP POLICY IF EXISTS "cuotas_delete" ON public.cuotas;

DROP POLICY IF EXISTS "pagos_select" ON public.pagos;
DROP POLICY IF EXISTS "pagos_insert" ON public.pagos;
DROP POLICY IF EXISTS "pagos_update" ON public.pagos;

-- Clientes
CREATE POLICY "clientes_select" ON public.clientes
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = cobrador_id OR public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "clientes_insert" ON public.clientes
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "clientes_update" ON public.clientes
  FOR UPDATE USING (auth.uid() = user_id OR public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "clientes_delete" ON public.clientes
  FOR DELETE USING (auth.uid() = user_id OR public.obtener_rol_usuario(auth.uid()) = 'administrador');

-- Préstamos
CREATE POLICY "prestamos_select" ON public.prestamos
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = cobrador_id OR public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "prestamos_insert" ON public.prestamos
  FOR INSERT WITH CHECK (auth.uid() = user_id OR public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "prestamos_update" ON public.prestamos
  FOR UPDATE USING (public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "prestamos_delete" ON public.prestamos
  FOR DELETE USING (public.obtener_rol_usuario(auth.uid()) = 'administrador');

-- Cuotas
CREATE POLICY "cuotas_select" ON public.cuotas
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.prestamos p
      WHERE p.id = prestamo_id AND (p.user_id = auth.uid() OR p.cobrador_id = auth.uid() OR public.obtener_rol_usuario(auth.uid()) = 'administrador')
    )
  );

CREATE POLICY "cuotas_insert" ON public.cuotas
  FOR INSERT WITH CHECK (public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "cuotas_update" ON public.cuotas
  FOR UPDATE USING (public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "cuotas_delete" ON public.cuotas
  FOR DELETE USING (public.obtener_rol_usuario(auth.uid()) = 'administrador');

-- Pagos
CREATE POLICY "pagos_select" ON public.pagos
  FOR SELECT USING (auth.uid() = user_id OR auth.uid() = cobrador_id OR public.obtener_rol_usuario(auth.uid()) = 'administrador');

CREATE POLICY "pagos_insert" ON public.pagos
  FOR INSERT WITH CHECK (auth.uid() = cobrador_id OR public.obtener_rol_usuario(auth.uid()) = 'administrador');

-- Parámetros del sistema
ALTER TABLE public.parametros_sistema ENABLE ROW LEVEL SECURITY;

CREATE POLICY "parametros_select" ON public.parametros_sistema
  FOR SELECT USING (true);

CREATE POLICY "parametros_all_admin" ON public.parametros_sistema
  FOR ALL USING (public.obtener_rol_usuario(auth.uid()) = 'administrador');

-- ── 10. BUCKET DE STORAGE COMPROBANTES DE PAGO ───────────────

-- Insertar bucket
INSERT INTO storage.buckets (id, name, public) 
VALUES ('comprobantes-pago', 'comprobantes-pago', false)
ON CONFLICT (id) DO NOTHING;

-- RLS para Storage de Comprobantes
DROP POLICY IF EXISTS "Select comprobante" ON storage.objects;
DROP POLICY IF EXISTS "Insert comprobante" ON storage.objects;

CREATE POLICY "Select comprobante" ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'comprobantes-pago'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.obtener_rol_usuario(auth.uid()) = 'administrador'
    )
  );

CREATE POLICY "Insert comprobante" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'comprobantes-pago'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR public.obtener_rol_usuario(auth.uid()) = 'administrador'
    )
  );
