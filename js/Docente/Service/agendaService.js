import { solicitarApi, obtenerDocenteActivo } from "./CrearCitaService.js";

const MARCADOR_SOLICITUD_PADRE = "[SOLICITUD_PADRE]";

const nombresEstado = {
  PENDIENTE: "Pendiente",
  ACEPTADA: "Aceptada",
  POSPUESTA: "Pospuesta",
  RECHAZADA: "Rechazada",
  CANCELADA: "Cancelada",
  FINALIZADA: "Finalizada"
};

export async function obtenerAgendaDocente() {
  const docente = await obtenerDocenteActivo();

  const citas = await solicitarApi(
    `/citas-reuniones/por-docente/${encodeURIComponent(docente.idDocente)}`
  );

  const lista = Array.isArray(citas) ? citas : [];
  const hoy = fechaDeHoy();

  // Solo lo que viene: la agenda mira hacia adelante. Las canceladas y
  // rechazadas se omiten porque ya no ocupan tiempo del docente.
  const vigentes = lista
    .filter(cita => (cita.citFechaReunion || "").slice(0, 10) >= hoy)
    .filter(cita => !["RECHAZADA", "CANCELADA"].includes(cita.citEstado))
    .map(convertirCita)
    .sort((primera, segunda) =>
      (primera.fechaReunion || "").localeCompare(segunda.fechaReunion || "")
    );

  return agruparPorFecha(vigentes);
}

// Los números que salen arriba en la pantalla.
export async function obtenerResumenAgenda() {
  const docente = await obtenerDocenteActivo();

  const citas = await solicitarApi(
    `/citas-reuniones/por-docente/${encodeURIComponent(docente.idDocente)}`
  );

  const lista = Array.isArray(citas) ? citas : [];
  const hoy = fechaDeHoy();

  const enFecha = fecha => lista.filter(
    cita => (cita.citFechaReunion || "").slice(0, 10) === fecha
  ).length;

  // Solicitudes que esperan respuesta del docente.
  const solicitudes = lista.filter(cita =>
    cita.citEstado === "PENDIENTE" &&
    cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE)
  ).length;

  return {
    hoy: enFecha(hoy),
    solicitudes,
    semana: lista.filter(cita => {
      const fecha = (cita.citFechaReunion || "").slice(0, 10);
      return fecha >= hoy && fecha <= sumarDias(hoy, 7);
    }).length,
    nombreDocente: `${docente.docNombre || ""} ${docente.docApellido || ""}`.trim()
  };
}

// Agrupación
function agruparPorFecha(citas) {
  const dias = new Map();

  citas.forEach(cita => {
    if (!dias.has(cita.fecha)) {
      dias.set(cita.fecha, {
        fecha: cita.fecha,
        fechaTexto: formatearFechaLarga(cita.fecha),
        esHoy: cita.fecha === fechaDeHoy(),
        citas: []
      });
    }

    dias.get(cita.fecha).citas.push(cita);
  });

  return Array.from(dias.values());
}

function convertirCita(cita) {
  const [fecha = "", horaCompleta = ""] = String(cita.citFechaReunion || "").split("T");
  const hora = horaCompleta.slice(0, 5);

  return {
    idCita: Number(cita.idCita),
    idEstudianteEncargado: Number(cita.idEstudianteEncargado),
    fecha,
    hora,
    horaTexto: formatearHora(hora),
    fechaReunion: cita.citFechaReunion,
    asunto: cita.citMotivo || "Sin asunto",
    descripcion: cita.citObservaciones || "",
    estudiante: cita.nombreEstudiante || "Estudiante no disponible",
    encargado: cita.nombreEncargado || "Encargado",
    estado: nombresEstado[cita.citEstado] || cita.citEstado,
    estadoApi: cita.citEstado,

    // Distingue lo que pidió el encargado de lo que convocó el docente:
    // solo lo que convocó el docente se puede editar o cancelar desde la agenda.
    esSolicitud: Boolean(cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE)),
    editable: !cita.citObservaciones?.startsWith(MARCADOR_SOLICITUD_PADRE) && cita.citEstado === "PENDIENTE"
  };
}

// Fechas
function fechaDeHoy() {
  const hoy = new Date();

  return `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}-${String(hoy.getDate()).padStart(2, "0")}`;
}

function sumarDias(fecha, dias) {
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const resultado = new Date(anio, mes - 1, dia + dias);

  return `${resultado.getFullYear()}-${String(resultado.getMonth() + 1).padStart(2, "0")}-${String(resultado.getDate()).padStart(2, "0")}`;
}

export function formatearFechaLarga(fecha) {
  if (!fecha) {
    return "Sin fecha";
  }

  const [anio, mes, dia] = fecha.split("-").map(Number);

  const meses = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const fechaLocal = new Date(anio, mes - 1, dia);

  const diasSemana = [
    "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"
  ];

  const diaSemana = diasSemana[fechaLocal.getDay()];

  return `${diaSemana.charAt(0).toUpperCase() + diaSemana.slice(1)} ${dia} de ${meses[mes - 1]}`;
}

export function formatearHora(hora) {
  if (!hora) {
    return "";
  }

  const [horasTexto, minutos] = hora.split(":");
  let horas = Number(horasTexto);
  const periodo = horas >= 12 ? "P.M" : "A.M";

  horas = horas % 12 || 12;

  return `${horas}:${minutos} ${periodo}`;
}