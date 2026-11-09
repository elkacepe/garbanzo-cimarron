export const pesos = (n: number) => '$' + n.toLocaleString('es-AR');
export const personas = (n: number) => (n === 1 ? '1 persona' : `${n} personas`);
export const asientos = (n: number) => (n === 1 ? '1 asiento' : `${n} asientos`);
export const reservas = (n: number) => (n === 1 ? '1 reserva' : `${n} reservas`);
