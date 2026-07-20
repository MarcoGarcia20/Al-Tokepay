// ============================================================
// Utilidades de Matemática Financiera — Al Tokepay
// Sistema Francés (cuota fija) y cálculos de mora
// ============================================================

import { addDays, addWeeks, addMonths } from 'date-fns'
import { Decimal } from 'decimal.js'
import { money } from '../lib/money'
import type { FilaAmortizacion, FrecuenciaPago, SimulacionPrestamo } from '../types/database'

// ── Formatters de moneda ───────────────────────────────────

/**
 * Formatea un número como moneda peruana (PEN)
 * Usar SIEMPRE esta función para mostrar dinero en pantalla
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea solo el número sin símbolo de moneda
 */
export const formatAmount = (amount: number): string => {
  return new Intl.NumberFormat('es-PE', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/**
 * Formatea porcentaje
 */
export const formatPercent = (value: number, decimals = 2): string => {
  return `${value.toFixed(decimals)}%`
}

// ── Conversión de tasas ────────────────────────────────────

/**
 * Convierte tasa mensual a tasa según frecuencia de pago
 */
export const tasaPorFrecuencia = (
  tasaMensual: number,
  frecuencia: FrecuenciaPago
): Decimal => {
  const r = money.div(tasaMensual, 100)
  switch (frecuencia) {
    case 'diario':
      // Tasa diaria: (1 + r)^(1/30) - 1
      return new Decimal(1).plus(r).pow(new Decimal(1).div(30)).minus(1)
    case 'semanal':
      // Tasa semanal: (1 + r)^(7/30) - 1
      return new Decimal(1).plus(r).pow(new Decimal(7).div(30)).minus(1)
    case 'quincenal':
      // Tasa quincenal: (1 + r)^(14/30) - 1
      return new Decimal(1).plus(r).pow(new Decimal(14).div(30)).minus(1)
    case 'mensual':
    default:
      return r
  }
}

// ── Cálculo de fecha de vencimiento ───────────────────────

export const calcularFechaVencimiento = (
  fechaBase: Date,
  numeroCuota: number,
  frecuencia: FrecuenciaPago
): Date => {
  switch (frecuencia) {
    case 'diario':
      return addDays(fechaBase, numeroCuota)
    case 'semanal':
      return addWeeks(fechaBase, numeroCuota)
    case 'quincenal':
      return addDays(fechaBase, numeroCuota * 14)
    case 'mensual':
    default:
      return addMonths(fechaBase, numeroCuota)
  }
}

// ── Sistema Francés (cuota fija) ───────────────────────────

/**
 * Calcula la cuota fija periódica (Sistema Francés)
 * Fórmula: C = P * r / (1 - (1+r)^-n)
 */
export const calcularCuotaFija = (
  principal: number,
  tasaPeriodica: Decimal,
  numCuotas: number
): Decimal => {
  if (tasaPeriodica.isZero()) {
    return money.div(principal, numCuotas)
  }
  const unoMasR = new Decimal(1).plus(tasaPeriodica)
  const divisor = new Decimal(1).minus(unoMasR.pow(-numCuotas))
  return money.div(tasaPeriodica.times(principal), divisor)
}

/**
 * Genera la tabla de amortización completa (Sistema Francés)
 */
export const generarTablaAmortizacion = (
  principal: number,
  tasaMensual: number,
  numCuotas: number,
  frecuencia: FrecuenciaPago,
  fechaInicio: Date,
  excluirDomingos = false
): FilaAmortizacion[] => {
  const tasa = tasaPorFrecuencia(tasaMensual, frecuencia)
  const cuotaFija = calcularCuotaFija(principal, tasa, numCuotas)

  let saldo = new Decimal(principal)
  const tabla: FilaAmortizacion[] = []

  let fechaActual = new Date(fechaInicio)

  for (let i = 1; i <= numCuotas; i++) {
    // Calcular fecha de vencimiento
    if (frecuencia === 'diario') {
      fechaActual = addDays(fechaActual, 1)
      if (excluirDomingos && fechaActual.getDay() === 0) {
        fechaActual = addDays(fechaActual, 1) // saltar al lunes
      }
    } else {
      fechaActual = calcularFechaVencimiento(fechaInicio, i, frecuencia)
    }

    const interes = money.round(saldo.times(tasa))
    let capital = money.round(money.sub(cuotaFija, interes))

    // Última cuota: ajuste de redondeo
    if (i === numCuotas) {
      capital = saldo
    }

    const saldoRestante = money.round(money.sub(saldo, capital))
    const totalCuota = i === numCuotas ? money.sum(capital, interes) : cuotaFija

    tabla.push({
      numCuota: i,
      fechaVencimiento: new Date(fechaActual),
      cuotaTotal: money.toNumber(totalCuota),
      interes: money.toNumber(interes),
      capital: money.toNumber(capital),
      saldoRestante: money.toNumber(saldoRestante),
    })

    saldo = saldoRestante
  }

  return tabla
}

/**
 * Simula un préstamo completo y devuelve todos los datos necesarios
 */
export const simularPrestamo = (
  principal: number,
  tasaMensual: number,
  numCuotas: number,
  frecuencia: FrecuenciaPago,
  fechaInicio: Date,
  excluirDomingos = false
): SimulacionPrestamo => {
  const tabla = generarTablaAmortizacion(
    principal,
    tasaMensual,
    numCuotas,
    frecuencia,
    fechaInicio,
    excluirDomingos
  )

  const totalPagar = tabla.reduce((acc, fila) => money.sum(acc, fila.cuotaTotal), new Decimal(0))
  const totalIntereses = tabla.reduce((acc, fila) => money.sum(acc, fila.interes), new Decimal(0))

  return {
    montoPrincipal: principal,
    tasaMensual,
    numCuotas,
    frecuenciaPago: frecuencia,
    fechaInicio,
    excluirDomingos,
    tabla,
    totalIntereses: money.toNumber(totalIntereses),
    totalPagar: money.toNumber(totalPagar),
  }
}

// ── Cálculos de mora ───────────────────────────────────────

/**
 * Calcula el interés de mora diario sobre una cuota vencida
 * Tasa mora: 1.5x la tasa de interés original (configurable)
 */
export const calcularMoraDiaria = (
  montoCuota: number,
  tasaMensual: number,
  diasMora: number,
  factorMora = 1.5
): number => {
  const tasaDiaria = money.div(money.div(tasaMensual, 100), 30)
  const tasaMoraDiaria = money.mul(tasaDiaria, factorMora)
  const mora = money.mul(money.mul(montoCuota, tasaMoraDiaria), diasMora)
  return money.toNumber(mora)
}

/**
 * Calcula porcentaje de cartera en mora
 */
export const calcularPorcentajeMora = (
  saldoEnMora: number,
  totalCartera: number
): number => {
  if (totalCartera === 0) return 0
  return money.toNumber(money.mul(money.div(saldoEnMora, totalCartera), 100))
}

/**
 * Determina si una cuota está vencida
 */
export const esCuotaVencida = (fechaVencimiento: string | Date): boolean => {
  const fecha = typeof fechaVencimiento === 'string'
    ? new Date(fechaVencimiento + 'T00:00:00')
    : fechaVencimiento
  return fecha < new Date(new Date().toDateString())
}

/**
 * Días de mora de una cuota vencida
 */
export const diasDeMora = (fechaVencimiento: string | Date): number => {
  const fecha = typeof fechaVencimiento === 'string'
    ? new Date(fechaVencimiento + 'T00:00:00')
    : fechaVencimiento
  const hoy = new Date(new Date().toDateString())
  const diff = hoy.getTime() - fecha.getTime()
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)))
}

/**
 * Obtiene el nombre legible de la frecuencia de pago
 */
export const nombreFrecuencia = (frecuencia: FrecuenciaPago): string => {
  const map: Record<FrecuenciaPago, string> = {
    diario: 'Diario',
    semanal: 'Semanal',
    quincenal: 'Quincenal',
    mensual: 'Mensual',
  }
  return map[frecuencia]
}

/**
 * Obtiene el nombre legible del método de pago
 */
export const nombreMetodoPago = (metodo: string): string => {
  const map: Record<string, string> = {
    efectivo: 'Efectivo',
    transferencia: 'Transferencia',
    billetera_digital: 'Billetera Digital',
  }
  return map[metodo] ?? metodo
}
