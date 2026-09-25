const hostApi = ["", "localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "localhost"
  : window.location.hostname;

const API_BASE_URL = `http://${hostApi}:8080/api/v1`;
const CLAVE_ID_DOCENTE = "visitasITR.idDocente";

const LIMITE_MOTIVO = 250;
const LIMITE_OBSERVACIONES = 300;

async function solicitarApi(ruta, opciones = {}) {
  const configuracion = {
    ...opciones,
    // Lo pongo despues del spread para que no se me pierda en ninguna
    // llamada. Sin esto no va la cookie y la API responde 401.
    credentials: "include",
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

export async function obtenerDocenteActivo() {
  const idGuardado = Number(localStorage.getItem(CLAVE_ID_DOCENTE));

  if (!idGuardado) {
    throw new Error("No hay una sesión de docente activa. Inicie sesión nuevamente.");
  }

  try {
    return await solicitarApi(`/docentes/${idGuardado}`);
  } catch (error) {
    // La sesión guardada ya no es válida; se limpia y se exige iniciar sesión de nuevo.
    localStorage.removeItem(CLAVE_ID_DOCENTE);
    throw new Error("No hay una sesión de docente activa. Inicie sesión nuevamente.");
  }
}


export async function obtenerDatosFormularioCita() {
  const [docente, relaciones] = await Promise.all([
    obtenerDocenteActivo(),
    solicitarApi("/estudiante-encargados")
  ]);

  const lista = Array.isArray(relaciones) ? relaciones : [];

  if (lista.length === 0) {
    throw new Error("No hay estudiantes con encargado asignado.");
  }

  return {

    idEmpleado: Number(docente.idDocente),
    idDocente: Number(docente.idDocente),
    nombreDocente: `${docente.docNombre || ""} ${docente.docApellido || ""}`.trim(),
    relaciones: lista
  };
}

function construirCuerpoCita(datosCita, idDocente) {
  const asunto = String(datosCita.asunto || "").trim();

  if (!asunto) {
    throw new Error("Debe indicar el asunto de la convocatoria.");
  }

  if (!datosCita.idEstudianteEncargado) {
    throw new Error("Debe seleccionar un estudiante.");
  }

  if (!datosCita.fecha || !datosCita.hora) {
    throw new Error("Debe indicar la fecha y la hora de la convocatoria.");
  }

  return {
    idDocente: Number(idDocente),
    idEstudianteEncargado: Number(datosCita.idEstudianteEncargado),
    citMotivo: asunto.slice(0, LIMITE_MOTIVO),
    citEstado: "PENDIENTE",
    citObservaciones: String(datosCita.descripcion || "").slice(0, LIMITE_OBSERVACIONES),
    citFechaReunion: `${datosCita.fecha}T${datosCita.hora}:00`
  };
}

export async function crearCitaDocente(datosCita, idDocente) {
  return solicitarApi("/citas-reuniones", {
    method: "POST",
    body: JSON.stringify(construirCuerpoCita(datosCita, idDocente))
  });
}

export async function editarCitaDocente(idCita, datosCita, idDocente) {
  return solicitarApi(`/citas-reuniones/${idCita}`, {
    method: "PUT",
    body: JSON.stringify(construirCuerpoCita(datosCita, idDocente))
  });
}

export async function eliminarCitaDocente(idCita) {
  return solicitarApi(`/citas-reuniones/${idCita}`, { method: "DELETE" });
}

export { solicitarApi };