const hostApi = ["", "localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "localhost"
  : window.location.hostname;

const AUTH_BASE_URL = `http://${hostApi}:8081/api/v1`;
const API_BASE_URL = `http://${hostApi}:8080/api/v1`;

const CLAVE_SESION_PADRE = "visitasITR.sesionPadre";
const CLAVE_CORREO_ESTUDIANTE = "visitasITR.correoEstudiante";

const CLAVE_ID_DOCENTE = "visitasITR.idDocente";
const CLAVE_CORREO_DOCENTE = "visitasITR.correoDocente";

const CLAVE_TOKEN = "visitasITR.token";
const CLAVE_ROL = "visitasITR.rol";
const CLAVE_EXPIRA = "visitasITR.expira";

const ROLES_DOCENTE = [
  "DOCENTE",
  "DOCENTE TÉCNICO",
  "DOCENTE TECNICO",
  "DOCENTE ACADÉMICO",
  "DOCENTE ACADEMICO"
];

const ROLES_ADMINISTRATIVOS = [
  "ADMINISTRADOR",
  "RECEPCIONISTA"
];

// Llamadas a la API
async function pedirAuth(ruta, cuerpo) {
  let respuesta;

  try {
    respuesta = await fetch(`${AUTH_BASE_URL}${ruta}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      body: JSON.stringify(cuerpo)
    });
  } catch (error) {
    throw new Error(
      "No se pudo conectar con el servicio de autenticación. " +
      "Compruebe que esté ejecutándose en el puerto 8081."
    );
  }

  const contenido = await respuesta.json().catch(() => null);

  return {
    estado: respuesta.status,
    ok: respuesta.ok,
    datos: contenido?.data,
    mensaje: contenido?.mensaje || contenido?.message
  };
}

async function consultarApi(ruta) {
  const respuesta = await fetch(`${API_BASE_URL}${ruta}`, {
    headers: { Accept: "application/json" }
  });

  const contenido = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(contenido?.message || "No fue posible consultar la información.");
  }

  return contenido?.data ?? contenido;
}


// Inicio de sesión unificado

/**
 * Valida las credenciales y prepara la sesión según el rol en V_USUARIOS_AUTH.
 *
 * @returns {Promise<{tipo: string, destino: string}>} Adónde debe ir la app.
 */
export async function iniciarSesion(correo, password) {
  const email = String(correo || "").trim().toLowerCase();

  if (!email) {
    throw new Error("Ingrese su correo.");
  }

  if (!password) {
    throw new Error("Ingrese su contraseña.");
  }

  const credenciales = { email, password };

  // 1. Consulta la API Auth (Puerto 8081 - Busca en V_USUARIOS_AUTH)
  const auth = await pedirAuth("/auth/login", credenciales);

  if (!auth.ok) {
    if (auth.estado === 401) {
      throw new Error("El correo o la contraseña son incorrectos.");
    }
    throw new Error(auth.mensaje || "Error al verificar las credenciales.");
  }

  const rol = String(auth.datos?.rol || "").toUpperCase();

  // 2. Bloqueo para Administradores/Recepcionistas (deben usar el portal web)
  if (ROLES_ADMINISTRATIVOS.includes(rol)) {
    throw new Error(
      "Esta cuenta pertenece al personal administrativo. " +
      "Ingrese desde el sitio web correspondiente."
    );
  }

  // 3. Flujo para Docentes
  if (ROLES_DOCENTE.includes(rol)) {
    guardarSesionDocente(auth.datos, email);
    return { tipo: "docente", destino: "Docentes/index.html" };
  }

  // 4. Flujo para Estudiantes / Encargados (ingresan con credenciales de estudiante)
  if (rol === "ESTUDIANTE" || rol === "ENCARGADO") {
    await guardarSesionPadre(auth.datos, email);
    return { tipo: "encargado", destino: "Padres/index.html" };
  }

  throw new Error("El rol asociado a esta cuenta no tiene permisos de acceso.");
}


// Construcción de la sesión
function guardarDatosComunes(datos) {
  localStorage.setItem(CLAVE_TOKEN, datos.token);
  localStorage.setItem(CLAVE_ROL, datos.rol);

  const vence = Date.now() + (Number(datos.expiraEnSegundos) || 0) * 1000;
  localStorage.setItem(CLAVE_EXPIRA, String(vence));
}

function guardarSesionDocente(datos, email) {
  limpiarSesion();
  guardarDatosComunes(datos);

  localStorage.setItem(CLAVE_ID_DOCENTE, datos.idUsuario);
  localStorage.setItem(CLAVE_CORREO_DOCENTE, datos.email || email);
}

async function guardarSesionPadre(datos, email) {
  limpiarSesion();
  // Se fuerza el rol activo a ENCARGADO para la sesión local
  guardarDatosComunes({ ...datos, rol: "ENCARGADO" });

  const idEstudiante = Number(datos.idUsuario);
  let estudiante = null;

  try {
    estudiante = await consultarApi(`/estudiantes/${idEstudiante}`);
  } catch (error) {
    console.error("No fue posible cargar los datos del estudiante.", error);
  }

  let relaciones = [];

  try {
    const todas = await consultarApi("/estudiante-encargados");
    relaciones = (Array.isArray(todas) ? todas : [])
      .filter(r => Number(r.idEstudiante) === idEstudiante);
  } catch (error) {
    console.error("No fue posible cargar el encargado del estudiante.", error);
  }

  const sesion = {
    correoEstudiante: datos.email || email,
    nombreEstudiante: estudiante
      ? `${estudiante.estNombre || ""} ${estudiante.estApellido || ""}`.trim()
      : "Estudiante",
    codigoEstudiante: estudiante?.estCodigo || "",
    idsEstudiante: [idEstudiante],
    nombreEncargado: relaciones[0]?.nombreEncargado || "Encargado",
    idEncargado: Number(relaciones[0]?.idEncargado) || null,
    idsEstudianteEncargado: relaciones.map(r => Number(r.idEstudianteEncargado))
  };

  localStorage.setItem(CLAVE_SESION_PADRE, JSON.stringify(sesion));
  localStorage.setItem(CLAVE_CORREO_ESTUDIANTE, sesion.correoEstudiante);
}


// Estado de la sesión
export function haySesionActiva() {
  const token = localStorage.getItem(CLAVE_TOKEN);
  const expira = Number(localStorage.getItem(CLAVE_EXPIRA));

  if (!token) {
    return false;
  }

  if (expira && Date.now() > expira) {
    limpiarSesion();
    return false;
  }

  return true;
}

export function obtenerRol() {
  return localStorage.getItem(CLAVE_ROL);
}

export function esDocente() {
  return ROLES_DOCENTE.includes(String(obtenerRol() || "").toUpperCase());
}

/**
 * Pantalla que corresponde al rol de la sesión actual.
 */
export function destinoSegunRol() {
  return esDocente() ? "Docentes/index.html" : "Padres/index.html";
}

export function limpiarSesion() {
  [
    CLAVE_SESION_PADRE, CLAVE_CORREO_ESTUDIANTE,
    CLAVE_ID_DOCENTE, CLAVE_CORREO_DOCENTE,
    CLAVE_TOKEN, CLAVE_ROL, CLAVE_EXPIRA,
    "visitasITR.tokenDocente", "visitasITR.rolDocente",
    "visitasITR.expiraDocente", "visitasITR.correoPadre"
  ].forEach(clave => localStorage.removeItem(clave));
}

/**
 * Envía al inicio de sesión a quien no tenga una sesión vigente.
 *
 * @param {string} nivel ruta relativa hasta la raíz del proyecto.
 */
export function exigirSesion(nivel = "../") {
  if (!haySesionActiva()) {
    window.location.replace(`${nivel}inicioSesion.html`);
    return false;
  }

  return true;
}