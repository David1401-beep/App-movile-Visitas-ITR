import { limpiarSesion } from "../../sesionService.js";
import { solicitarApi, obtenerDocenteActivo } from "../Service/CrearCitaService.js";

const nombreUsuario = document.getElementById("nombre-usuario");
const correoUsuario = document.getElementById("correo-usuario");
const tarjetaPerfil = document.getElementById("tarjeta-perfil");
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

document.addEventListener("DOMContentLoaded", cargarPerfil);

async function cargarPerfil() {
  try {
    const docente = await obtenerDocenteActivo();

    escribir(nombreUsuario, `${docente.docNombre || ""} ${docente.docApellido || ""}`.trim());
    escribir(correoUsuario, docente.docCorreo || "No disponible");

    // DOC_ROL siempre vale "DOCENTE", así que se muestra DOC_TIPO, que
    // sí distingue al docente técnico del académico.
    agregarDato("Clave", docente.docClave);
    agregarDato("Tipo", docente.docTipo || docente.docRol);
  } catch (error) {
    console.error("No fue posible cargar el perfil.", error);
    escribir(nombreUsuario, "Sin sesión activa");
    escribir(correoUsuario, "Inicie sesión para ver su perfil");
  }
}

function agregarDato(etiqueta, valor) {
  if (!tarjetaPerfil || !valor) {
    return;
  }

  const caja = document.createElement("div");
  caja.className = "info-box";
  caja.innerHTML = `<strong>${etiqueta}:</strong> <span>${escaparHtml(valor)}</span>`;
  tarjetaPerfil.appendChild(caja);
}

// Espero a que el servidor cierre la sesión antes de salir de la pantalla.
btnCerrarSesion?.addEventListener("click", async function (evento) {
  evento.preventDefault();
  await limpiarSesion();
  window.location.replace("../inicioSesion.html");
});

function escribir(elemento, valor) {
  if (elemento) {
    elemento.textContent = valor;
  }
}

function escaparHtml(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}