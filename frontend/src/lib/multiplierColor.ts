// Shared multiplier color scale — matches RoundHistory badge ranges
export function multiplierColor(scaled: bigint): string {
  if (scaled < 150n) return "#ef4444"; // < 1.50x  — red
  if (scaled < 200n) return "#f97316"; // < 2.00x  — orange
  if (scaled < 300n) return "#5200ff"; // < 3.00x  — ultraviolet
  return "#3cffd0";                    // ≥ 3.00x  — mint
}
