// Aqui decido en que orden salen las citas en las listas.
// Arriba las que hay que contestar y al final las que ya se cerraron.

const PRIORIDAD = {
  POSPUESTA: 1,
  PENDIENTE: 2,
  ACEPTADA: 3,
  FINALIZADA: 4,
  CANCELADA: 5,
  RECHAZADA: 6
};

function prioridad(estadoApi) {
  return PRIORIDAD[String(estadoApi || "").toUpperCase()] || 7;
}

// Compara dos citas. Primero mira el estado y si son iguales usa la fecha.
// Con masRecientesPrimero en true deja arriba la fecha mas nueva.
export function compararCitas(primera, segunda, masRecientesPrimero = true) {
  const diferencia = prioridad(primera.estadoApi) - prioridad(segunda.estadoApi);

  if (diferencia !== 0) {
    return diferencia;
  }

  const fechaPrimera = primera.fechaReunion || "";
  const fechaSegunda = segunda.fechaReunion || "";

  return masRecientesPrimero
    ? fechaSegunda.localeCompare(fechaPrimera)
    : fechaPrimera.localeCompare(fechaSegunda);
}

// Ordena la lista sin modificar la original.
export function ordenarCitas(citas, masRecientesPrimero = true) {
  return [...citas].sort((primera, segunda) =>
    compararCitas(primera, segunda, masRecientesPrimero)
  );
}
