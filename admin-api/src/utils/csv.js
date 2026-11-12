/**
 * Neutralize CSV Formula Injection (DDE / command execution in spreadsheet software).
 * Escapes embedded quotes and prepends a single quote if the cell begins with =, +, -, @, \t, or \r.
 */
export function sanitizeCsvCell(val) {
  if (val === null || val === undefined) return '';
  let str = String(val).replace(/"/g, '""');
  if (/^[=+\-@\t\r]/.test(str)) {
    str = "'" + str;
  }
  return str;
}

export default sanitizeCsvCell;

