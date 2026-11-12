export const money = (v: number) =>
  "$" + Number(v).toLocaleString("es-AR", { maximumFractionDigits: 2 });
