import { obtenerAvisos } from "../Service/AvisosService.js";

const lista = document.getElementById("lista-avisos-padre");
const filtroFecha = document.getElementById("filtro-fecha-avisos");
const btnLimpiar = document.getElementById("btn-limpiar-filtro-avisos");

// Me guardo todos para que el filtro trabaje sobre la misma lista y no
// vuelva a consultar la API cada vez que cambian la fecha.
let todos = [];

document.addEventListener("DOMContentLoaded", cargar);

async function cargar() {
  if (!lista) {
    return;
  }

  try {
    // Sin limite: aqui se ven todos, no solo los tres del inicio.
    todos = await obtenerAvisos(null);
    aplicarFiltro();
  } catch (error) {
    console.error("No fue posible cargar los comunicados.", error);
    mostrarMensaje(error.message, true);
  }
}

function aplicarFiltro() {
  const dia = filtroFecha?.value || "";
  const visibles = dia ? todos.filter(aviso => aviso.dia === dia) : todos;

  if (visibles.length === 0) {
    mostrarMensaje(dia
      ? "No hay comunicados de esa fecha."
      : "No hay comunicados por el momento.");
    return;
  }

  lista.innerHTML = "";
  visibles.forEach(aviso => lista.appendChild(crearTarjeta(aviso)));
}

function crearTarjeta(aviso) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "aviso-tarjeta";
  tarjeta.id = `comunicado-${aviso.idComunicado}`;

  const mensaje = document.createElement("p");
  mensaje.className = "aviso-mensaje mb-1";
  mensaje.textContent = aviso.mensaje;

  const firma = document.createElement("small");
  firma.className = "aviso-firma d-block text-secondary";
  firma.textContent = `${aviso.docente} · ${aviso.fechaTexto}`;

  tarjeta.append(mensaje, firma);
  return tarjeta;
}

function mostrarMensaje(texto, esError = false) {
  lista.innerHTML = "";

  const parrafo = document.createElement("p");
  parrafo.className = `text-center mb-0 ${esError ? "text-danger" : "text-secondary"}`;
  parrafo.textContent = texto;
  lista.appendChild(parrafo);
}

filtroFecha?.addEventListener("change", aplicarFiltro);
filtroFecha?.addEventListener("input", aplicarFiltro);

btnLimpiar?.addEventListener("click", function () {
  if (filtroFecha) {
    filtroFecha.value = "";
  }

  aplicarFiltro();
});
