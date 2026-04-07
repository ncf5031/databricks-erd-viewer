/**
 * ERD Viewer - Color utilities for consistent type-based coloring
 */

// Data type color mapping for column type badges
const TYPE_COLORS: Record<string, string> = {
  BIGINT: 'text-blue-600 dark:text-blue-400',
  INT: 'text-blue-600 dark:text-blue-400',
  INTEGER: 'text-blue-600 dark:text-blue-400',
  SMALLINT: 'text-blue-600 dark:text-blue-400',
  TINYINT: 'text-blue-600 dark:text-blue-400',
  LONG: 'text-blue-600 dark:text-blue-400',

  DOUBLE: 'text-purple-600 dark:text-purple-400',
  FLOAT: 'text-purple-600 dark:text-purple-400',
  DECIMAL: 'text-purple-600 dark:text-purple-400',

  STRING: 'text-green-600 dark:text-green-400',
  VARCHAR: 'text-green-600 dark:text-green-400',
  CHAR: 'text-green-600 dark:text-green-400',

  BOOLEAN: 'text-orange-600 dark:text-orange-400',

  DATE: 'text-teal-600 dark:text-teal-400',
  TIMESTAMP: 'text-teal-600 dark:text-teal-400',
  TIMESTAMP_NTZ: 'text-teal-600 dark:text-teal-400',

  BINARY: 'text-gray-600 dark:text-gray-400',
  ARRAY: 'text-pink-600 dark:text-pink-400',
  MAP: 'text-pink-600 dark:text-pink-400',
  STRUCT: 'text-pink-600 dark:text-pink-400',
}

export function getTypeColor(typeName: string): string {
  const upper = typeName.toUpperCase().split('(')[0].split('<')[0].trim()
  return TYPE_COLORS[upper] || 'text-slate-500 dark:text-slate-400'
}

// Shorten type names for display
export function formatTypeName(typeName: string): string {
  return typeName
    .replace('TIMESTAMP_NTZ', 'TIMESTAMP')
    .replace('VARCHAR', 'VARCHAR')
}
