// ============================================================
// Types — Source of Truth del esquema de la base de datos
// Refleja exactamente las tablas de Supabase / PostgreSQL
// ============================================================

// ── Enums ──────────────────────────────────────────────────

export type EstadoCliente = 'activo' | 'bloqueado'

export type FrecuenciaPago = 'diario' | 'semanal' | 'quincenal' | 'mensual'

export type EstadoPrestamo = 'pendiente' | 'activo' | 'pagado' | 'en_mora'

export type EstadoCuota = 'pendiente' | 'pagado' | 'vencido' | 'parcial'

export type MetodoPago = 'efectivo' | 'transferencia' | 'billetera_digital'

export type RolUsuario = 'administrador' | 'cobrador'

// ── Entidades de Base de Datos ─────────────────────────────

export interface Cliente {
  id: string
  user_id: string
  nombres: string
  apellidos: string
  documento_identidad: string
  celular: string
  correo: string | null
  estado: EstadoCliente
  direccion: string | null
  notas: string | null
  saldo_favor: number
  cobrador_id: string | null
  created_at: string
  updated_at: string
}

export interface Prestamo {
  id: string
  user_id: string
  cliente_id: string
  monto_principal: number
  tasa_interes: number
  num_cuotas: number
  frecuencia_pago: FrecuenciaPago
  estado: EstadoPrestamo
  fecha_inicio: string
  monto_total: number
  saldo_pendiente: number
  cobrador_id: string | null
  excluir_domingos: boolean
  notas: string | null
  created_at: string
  updated_at: string
}

export interface Cuota {
  id: string
  prestamo_id: string
  num_cuota: number
  monto_cuota: number
  monto_interes: number
  monto_principal: number
  saldo_capital: number
  fecha_vencimiento: string
  estado: EstadoCuota
  monto_pagado: number
  dias_retraso: number
  penalidad_fija_acumulada: number
  interes_moratorio_acumulado: number
  ultimo_calculo_mora: string | null
  updated_at: string
}

export interface Pago {
  id: string
  prestamo_id: string
  cuota_id: string | null
  user_id: string
  cobrador_id: string
  monto_abonado: number
  fecha_pago: string
  metodo_pago: MetodoPago
  comprobante_url: string | null
  notas: string | null
  created_at: string
}

export interface Perfil {
  id: string
  rol: RolUsuario
  nombre: string | null
  avatar_url: string | null
  created_at: string
  updated_at: string
}

export interface ParametroSistema {
  id: number
  clave: string
  valor: string
  descripcion: string | null
  created_at: string
  updated_at: string
}

export interface AuditoriaPago {
  id: string
  pago_id: string
  prestamo_id: string
  cuota_id: string | null
  user_id: string
  cobrador_id: string
  monto_abonado: number
  fecha_pago: string | null
  metodo_pago: string
  comprobante_url: string | null
  notas: string | null
  created_at: string
}

// ── Tipos extendidos / JOIN ────────────────────────────────

export interface PrestamoConCliente extends Prestamo {
  clientes: Pick<Cliente, 'nombres' | 'apellidos' | 'documento_identidad' | 'celular' | 'correo'>
}

export interface CuotaDetalle extends Cuota {
  prestamos: Pick<Prestamo, 'monto_principal' | 'frecuencia_pago' | 'user_id'>
  clientes: Pick<Cliente, 'nombres' | 'apellidos' | 'celular' | 'documento_identidad'>
}

// ── Tipos de inserción (Omitir campos auto-generados / opcionales) ──

export type ClienteInsert = {
  id?: string
  user_id?: string
  nombres: string
  apellidos: string
  documento_identidad: string
  celular: string
  correo?: string | null
  estado?: EstadoCliente
  direccion?: string | null
  notas?: string | null
  saldo_favor?: number
  cobrador_id?: string | null
  created_at?: string
  updated_at?: string
}

export type PrestamoInsert = {
  id?: string
  user_id?: string
  cliente_id: string
  monto_principal: number
  tasa_interes: number
  num_cuotas: number
  frecuencia_pago: FrecuenciaPago
  estado?: EstadoPrestamo
  fecha_inicio: string
  monto_total: number
  saldo_pendiente?: number
  cobrador_id?: string | null
  excluir_domingos?: boolean
  notas?: string | null
  created_at?: string
  updated_at?: string
}

export type CuotaInsert = {
  id?: string
  prestamo_id: string
  num_cuota: number
  monto_cuota: number
  monto_interes: number
  monto_principal: number
  saldo_capital: number
  fecha_vencimiento: string
  estado?: EstadoCuota
  monto_pagado?: number
  dias_retraso?: number
  penalidad_fija_acumulada?: number
  interes_moratorio_acumulado?: number
  ultimo_calculo_mora?: string | null
  updated_at?: string
}

export type PagoInsert = {
  id?: string
  prestamo_id: string
  cuota_id?: string | null
  user_id: string
  cobrador_id: string
  monto_abonado: number
  fecha_pago?: string
  metodo_pago: MetodoPago
  comprobante_url?: string | null
  notas?: string | null
  created_at?: string
}

// ── Tipos de actualización ─────────────────────────────────

export type ClienteUpdate = Partial<ClienteInsert>
export type PrestamoUpdate = Partial<PrestamoInsert>
export type CuotaUpdate = Partial<CuotaInsert>

// ── Tipos de negocio (UI / lógica) ─────────────────────────

export interface FilaAmortizacion {
  numCuota: number
  fechaVencimiento: Date
  cuotaTotal: number
  interes: number
  capital: number
  saldoRestante: number
}

export interface SimulacionPrestamo {
  montoPrincipal: number
  tasaMensual: number
  numCuotas: number
  frecuenciaPago: FrecuenciaPago
  fechaInicio: Date
  excluirDomingos: boolean
  tabla: FilaAmortizacion[]
  totalIntereses: number
  totalPagar: number
}

export interface KpiDashboard {
  capitalColocado: number
  totalRecaudado: number
  saldoPendienteTotal: number
  porcentajeMora: number
  prestamosActivos: number
  prestamosEnMora: number
  clientesActivos: number
}
