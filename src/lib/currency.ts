/**
 * Format a number as Kenya Shillings (KES).
 * Example: formatKES(1500) => "KSh 1,500.00"
 * Example: formatKES(1500, 0) => "KSh 1,500"
 */
export function formatKES(amount: number, decimals: number = 2): string {
  return `KSh ${amount.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}
