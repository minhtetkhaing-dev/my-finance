export function formatMMK(value: number) {
  return `MMK ${Math.round(Number(value) || 0).toLocaleString("en-US")}`;
}
