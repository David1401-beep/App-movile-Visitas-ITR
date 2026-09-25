const hostApi = ["", "localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "localhost"
  : window.location.hostname;

const API_BASE_URL = `http://${hostApi}:8080/api/v1`;
const CLAVE_DATOS_SESION = "visitasITR.sesionPadre";
const MARCADOR_SOLICITUD_PADRE = "[SOLICITUD_PADRE]";

const LIMITE_MOTIVO = 250;
const LIMITE_OBSERVACIONES = 300;

async function solicitarApi(ruta, opciones = {}) {
  const configuracion = {
    credentials: "include",
    ...opciones,
    headers: {
      Accept: "application/json",
      ...(opciones.body ? { "Content-Type": "application/json" } : {}),
      ...opciones.headers
    }
  };

  let respuesta;

  try {
    respuesta = await fetch(`${API_BASE_URL}${ruta}`, configuracion);
  } catch (error) {
    throw new Error(
      "No se pudo conectar con la API. Compruebe que esté ejecutándose en el puerto 8080."
    );
  }

  const tipoContenido = respuesta.headers.get("content-type") || "";
  const contenido = tipoContenido.includes("json")
    ? await respuesta.json()
    : null;

  if (!respuesta.ok) {
    throw new Error(
      contenido?.message ||
      contenido?.detail ||
      contenido?.error ||
      `La API respondió con el estado ${respuesta.status}.`
    );
  }

  return contenido && Object.prototype.hasOwnProperty.call(contenido, "data")
    ? contenido.data
    : contenido;
}

function obtenerSesionPadre() {
  let sesion;

  try {
    sesion = JSON.parse(localStorage.getItem(CLAVE_DATOS_SESION) || "null");
  } catch (error) {
    sesion = null;
  }

  const idsEstudiante = (sesion?.idsEstudiante || [])
    .map(id => Number(id))
    .filter(id => Number.isInteger(id) && id > 0);

  if (!sesion || idsEstudiante.length === 0) {
    throw new Error("La sesión no es válida. Vuelva a iniciar sesión.");
  }

  return {
    ...sesion,
    idsEstudiante: [...new Set(idsEstudiante)]
  };
}

async function obtenerRelacionesSesion(sesion) {
  const relacionesApi = await solicitarApi("/estudiante-encargados");

  return (Array.isArray(relacionesApi) ? relacionesApi : [])
    .filter(relacion => sesion.idsEstudiante.includes(Number(relacion.idEstudiante)));
}

function construirFechaReunion(fecha) {
  const ahora = new Date();
  const fechaActual = `${ahora.getFullYear()}-${String(ahora.getMonth() + 1).padStart(2, "0")}-${String(ahora.getDate()).padStart(2, "0")}`;

  if (fecha !== fechaActual) {
    return `${fecha}T08:00:00`;
  }

  ahora.setMinutes(ahora.getMinutes() + 5);
  const horas = String(ahora.getHours()).padStart(2, "0");
  const minutos = String(ahora.getMinutes()).padStart(2, "0");

  return `${fecha}T${horas}:${minutos}:00`;
}

export async function cargarOpcionesSolicitud() {
  const sesion = obtenerSesionPadre();

  const [relaciones, docentesApi] = await Promise.all([
    obtenerRelacionesSesion(sesion),
    solicitarApi("/docentes")
  ]);

  if (relaciones.length === 0) {
    throw new Error("El estudiante todavía no tiene un encargado asociado.");
  }

  const docentes = (Array.isArray(docentesApi) ? docentesApi : []).map(docente => ({
    // La propiedad se sigue llamando idEmpleado porque el controller
    // de la pantalla la usa con ese nombre.
    idEmpleado: Number(docente.idDocente),
    idDocente: Number(docente.idDocente),
    nombre: `${docente.docNombre || ""} ${docente.docApellido || ""}`.trim(),
    tipo: docente.docTipo || ""
  }));

  if (docentes.length === 0) {
    throw new Error("No hay docentes disponibles para recibir la solicitud.");
  }

  return {
    relaciones: relaciones.map(relacion => ({
      idEstudianteEncargado: Number(relacion.idEstudianteEncargado),
      nombreEncargado: relacion.nombreEncargado || "Encargado",
      nombreEstudiante: relacion.nombreEstudiante || "Estudiante"
    })),
    docentes
  };
}

export async function crearSolicitudPadre(datosSolicitud) {
  const sesion = obtenerSesionPadre();
  const idRelacion = Number(datosSolicitud.idEstudianteEncargado);

  const relaciones = await obtenerRelacionesSesion(sesion);
  const idsRelaciones = relaciones.map(relacion => Number(relacion.idEstudianteEncargado));

  // Impide que alguien envíe una solicitud a nombre de un estudiante
  // que no le corresponde manipulando el formulario.
  if (!idsRelaciones.includes(idRelacion)) {
    throw new Error("El encargado seleccionado no pertenece a la sesión.");
  }

  const idDocente = Number(datosSolicitud.idDocente ?? datosSolicitud.idEmpleado);

  if (!idDocente) {
    throw new Error("Debe seleccionar un docente.");
  }

  const motivoCompleto = datosSolicitud.motivo.trim();

  if (!motivoCompleto) {
    throw new Error("Debe indicar el motivo de la visita.");
  }

  const observaciones = `${MARCADOR_SOLICITUD_PADRE} ${motivoCompleto}`
    .slice(0, LIMITE_OBSERVACIONES);

  return solicitarApi("/citas-reuniones", {
    method: "POST",
    body: JSON.stringify({
      idDocente,
      idEstudianteEncargado: idRelacion,
      citMotivo: motivoCompleto.slice(0, LIMITE_MOTIVO),
      citEstado: "PENDIENTE",
      citObservaciones: observaciones,
      citFechaReunion: construirFechaReunion(datosSolicitud.fecha)
    })
  });
}

export { MARCADOR_SOLICITUD_PADRE };