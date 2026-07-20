-- ============================================================
-- RPC: Crear préstamo y cuotas de forma atómica
-- ============================================================

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
  p_cuotas            JSONB
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
    notas
  ) VALUES (
    p_user_id,
    p_cliente_id,
    p_monto_principal,
    p_tasa_interes,
    p_num_cuotas,
    p_frecuencia_pago,
    'activo', -- Comienza directamente como activo al crearse
    p_fecha_inicio,
    p_monto_total,
    p_monto_total, -- Saldo pendiente inicial es igual al monto total
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
