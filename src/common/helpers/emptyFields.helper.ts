export function removeEmptyFields<T extends Record<string, any>>(obj: T): Partial<T> {
  if (!obj || typeof obj !== 'object') {
    return {} as Partial<T>;
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (
      value !== null &&
      value !== undefined &&
      (typeof value !== 'string' || value.trim() !== '')
    ) {
      acc[key] = value;
    }
    return acc;
  }, {} as Record<string, any>) as Partial<T>;
}

export function isArrayEmpty(data: any[]): boolean {
  return !data || data.length === 0 || data.every(item => Object.keys(removeEmptyFields(item)).length === 0);
}