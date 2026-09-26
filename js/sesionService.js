const hostApi = ["", "localhost", "127.0.0.1"].includes(window.location.hostname)
  ? "localhost"
  : window.location.hostname;

const AUTH_BASE_URL = `http://${hostApi}:8081/api/v1`;
const API_BASE_URL = `http://${hostApi}:8080/api/v1`;

// Datos del perfil para mostrar en pantalla. El token no esta aqui,
// va en una cookie que maneja el navegador.
const CLAVE_SESION_PADRE = "visitasITR.sesionPadre";
const CLAVE_CORREO_ESTUDIANTE = "visitasITR.correoEstudiante";
const CLAVE_ID_DOCENTE = "visitasITR.idDocente";
const CLAVE_CORREO_DOCENTE = "visitasITR.correoDocente";
const CLAVE_ROL = "visitasITR.rol";

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
      // Sin esto el navegador no guarda ni manda la cookie.
      credentials: "include",
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
    credentials: "include",
    headers: { Accept: "application/json" }
  });

  const contenido = await respuesta.json().catch(() => null);

  if (!respuesta.ok) {
    throw new Error(contenido?.message || "No fue posible consultar la información.");
  }

  return contenido?.data ?? contenido;
}


// Inicio de sesión unificado

// Revisa el correo y la contraseña y arma la sesión según el rol.
// Devuelve a qué pantalla hay que ir.
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
  let auth = await pedirAuth("/auth/login", credenciales);

  // El /auth/login no acepta estudiantes y responde 403. En ese caso
  // pruebo por la ruta del encargado.
  if (auth.estado === 403) {
    auth = await pedirAuth("/usuarios/inicio-sesion-encargado", credenciales);
  }

  if (!auth.ok) {
    if (auth.estado === 401) {
      throw new Error("El correo o la contraseña son incorrectos.");
    }
    throw new Error(auth.mensaje || "Error al verificar las credenciales.");
  }

  const rol = String(auth.datos?.rol || "").toUpperCase();

  // 2. Bloqueo para Administradores/Recepcionistas (deben usar el portal web)
  if (ROLES_ADMINISTRATIVOS.includes(rol)) {
    await limpiarSesion();
    throw new Error(
      "Esta cuenta pertenece al personal administrativo. " +
      "Ingrese desde el sitio web correspondiente."
    );
  }

  // 3. Flujo para Docentes
  if (ROLES_DOCENTE.includes(rol)) {
    guardarSesionDocente(auth.datos, email);
    return { tipo: "docente", destino: "inicio-docente.html" };
  }

  // 4. Flujo para Estudiantes / Encargados (ingresan con credenciales de estudiante)
  if (rol === "ESTUDIANTE" || rol === "ENCARGADO") {
    await guardarSesionPadre(auth.datos, email);
    return { tipo: "encargado", destino: "inicio-padres.html" };
  }

  throw new Error("El rol asociado a esta cuenta no tiene permisos de acceso.");
}


// Construcción de la sesión
function guardarSesionDocente(datos, email) {
  limpiarDatosLocales();

  localStorage.setItem(CLAVE_ROL, datos.rol);
  localStorage.setItem(CLAVE_ID_DOCENTE, datos.idUsuario);
  localStorage.setItem(CLAVE_CORREO_DOCENTE, datos.email || email);
}

async function guardarSesionPadre(datos, email) {
  limpiarDatosLocales();
  localStorage.setItem(CLAVE_ROL, "ENCARGADO");

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

// Le pregunto a la API si la sesión sigue activa. Siempre reviso aquí,
// porque el localStorage lo puede cambiar cualquiera.
export async function obtenerSesion() {
  try {
    const respuesta = await fetch(`${AUTH_BASE_URL}/auth/me`, {
      credentials: "include",
      headers: { Accept: "application/json" }
    });

    if (!respuesta.ok) {
      return null;
    }

    const contenido = await respuesta.json().catch(() => null);
    return contenido?.data ?? null;
  } catch (error) {
    return null;
  }
}

export async function haySesionActiva() {
  return (await obtenerSesion()) !== null;
}

export function obtenerRol() {
  return localStorage.getItem(CLAVE_ROL);
}

export function esDocente(rol = obtenerRol()) {
  return ROLES_DOCENTE.includes(String(rol || "").toUpperCase());
}

// Pantalla que le toca según el rol.
export function destinoSegunRol(rol = obtenerRol()) {
  return esDocente(rol) ? "inicio-docente.html" : "inicio-padres.html";
}

// Cierra la sesión en el servidor y borra lo guardado en el navegador.
export async function limpiarSesion() {
  try {
    await fetch(`${AUTH_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include"
    });
  } catch (error) {
    console.error("No fue posible cerrar la sesión en el servidor.", error);
  }

  limpiarDatosLocales();
}

function limpiarDatosLocales() {
  [
    CLAVE_SESION_PADRE, CLAVE_CORREO_ESTUDIANTE,
    CLAVE_ID_DOCENTE, CLAVE_CORREO_DOCENTE, CLAVE_ROL,
    // Claves viejas de cuando guardaba el token en el navegador.
    "visitasITR.token", "visitasITR.expira",
    "visitasITR.tokenDocente", "visitasITR.rolDocente",
    "visitasITR.expiraDocente", "visitasITR.correoPadre"
  ].forEach(clave => localStorage.removeItem(clave));
}

// Si no hay sesión activa, manda al login.
export async function exigirSesion() {
  if (!(await haySesionActiva())) {
    window.location.replace("inicioSesion.html");
    return false;
  }

  return true;
}
