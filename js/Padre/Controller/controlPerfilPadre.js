import { obtenerSesionPadre } from "../Service/ConvocatoriasService.js";
import { obtenerAgendaPadre } from "../Service/CitasPadreService.js";
import { limpiarSesion } from "../../sesionService.js";

const nombreUsuario = document.getElementById("nombre-usuario");
const correoUsuario = document.getElementById("correo-usuario");
const tarjetaPerfil = document.getElementById("tarjeta-perfil");
const btnCerrarSesion = document.getElementById("btn-cerrar-sesion");

document.addEventListener("DOMContentLoaded", cargarPerfil);

async function cargarPerfil() {
  let sesion;

  try {
    sesion = obtenerSesionPadre();
  } catch (error) {
    escribir(nombreUsuario, "Sin sesión activa");
    escribir(correoUsuario, "Inicie sesión para ver su perfil");
    return;
  }

  escribir(nombreUsuario, sesion.nombreEncargado || "Encargado");
  escribir(correoUsuario, sesion.correoEstudiante || "No disponible");

  agregarDatos(sesion);
  await agregarResumenCitas();
}

function agregarDatos(sesion) {
  if (!tarjetaPerfil) {
    return;
  }

  const filas = [
    ["Estudiante", sesion.nombreEstudiante],
    ["Código", sesion.codigoEstudiante]
  ];

  filas.forEach(([etiqueta, valor]) => {
    if (!valor) {
      return;
    }

    const caja = document.createElement("div");
    caja.className = "info-box";
    caja.innerHTML = `<strong>${etiqueta}:</strong> <span>${escaparHtml(valor)}</span>`;
    tarjetaPerfil.appendChild(caja);
  });
}

async function agregarResumenCitas() {
  if (!tarjetaPerfil) {
    return;
  }

  const caja = document.createElement("div");
  caja.className = "info-box";
  caja.innerHTML = "<strong>Citas registradas:</strong> <span>Cargando...</span>";
  tarjetaPerfil.appendChild(caja);

  try {
    const agenda = await obtenerAgendaPadre();
    const pendientes = agenda.filter(cita => cita.estadoApi === "PENDIENTE").length;

    caja.innerHTML =
      `<strong>Citas registradas:</strong> <span>${agenda.length} (${pendientes} pendientes)</span>`;
  } catch (error) {
    console.error("No fue posible cargar el resumen de citas.", error);
    caja.innerHTML = "<strong>Citas registradas:</strong> <span>No disponible</span>";
  }
}

// Espero a que el servidor cierre la sesión antes de salir de la pantalla.
btnCerrarSesion?.addEventListener("click", async function (evento) {
  evento.preventDefault();
  await limpiarSesion();
  window.location.replace("inicioSesion.html");
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