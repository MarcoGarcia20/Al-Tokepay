// ============================================================
// Utilitario de Precisión Financiera — Al Tokepay
// Encapsula Decimal.js para evitar errores de coma flotante
// ============================================================

import { Decimal } from 'decimal.js'

// Configuración de precisión global: 20 dígitos significativos
// Redondeo simétrico a la mitad hacia arriba (ROUND_HALF_UP)
Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export const money = {
  /**
   * Suma una lista de valores numéricos o Decimal
   */
  sum: (...values: (number | string | Decimal)[]): Decimal => {
    return values.reduce((acc: Decimal, val) => {
      if (val === undefined || val === null || val === '' || isNaN(Number(val))) {
        return acc
      }
      return acc.plus(new Decimal(val))
    }, new Decimal(0))
  },

  /**
   * Resta dos valores (a - b)
   */
  sub: (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
    const valA = new Decimal(a ?? 0)
    const valB = new Decimal(b ?? 0)
    return valA.minus(valB)
  },

  /**
   * Multiplica dos valores (a * b)
   */
  mul: (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
    const valA = new Decimal(a ?? 0)
    const valB = new Decimal(b ?? 0)
    return valA.times(valB)
  },

  /**
   * Divide dos valores (a / b)
   */
  div: (a: number | string | Decimal, b: number | string | Decimal): Decimal => {
    const valA = new Decimal(a ?? 0)
    const valB = new Decimal(b ?? 0)
    if (valB.isZero()) return new Decimal(0)
    return valA.div(valB)
  },

  /**
   * Redondea un valor a la cantidad de decimales especificada (por defecto 2)
   */
  round: (value: number | string | Decimal, decimals = 2): Decimal => {
    return new Decimal(value ?? 0).toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP)
  },

  /**
   * Redondea un valor y lo retorna como un número nativo de JS
   */
  toNumber: (value: number | string | Decimal, decimals = 2): number => {
    return money.round(value, decimals).toNumber()
  },
}
