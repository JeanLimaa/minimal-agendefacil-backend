/**
 * Arredonda um valor monetário para 2 casas decimais
 * @param value Valor a ser arredondado
 * @returns Valor arredondado
 */
export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

/**
 * Converte um valor decimal para centavos
 * @param value Valor a ser convertido
 * @returns Valor em centavos
*/
export function decimalToCents(value: number): number {
  return Math.round(value * 100);
}