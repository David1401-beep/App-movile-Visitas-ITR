import { obtenerAvisos } from "../Service/AvisosService.js";

const lista = document.getElementById("lista-avisos-padre");
const conteo = document.getElementById("conteo-avisos");
const pastillas = document.getElementById("pastillas-avisos");
const btnCalendario = document.getElementById("btn-abrir-fecha");
const cajaFecha = document.getElementById("contenedor-filtro-avisos");
const filtroFecha = document.getElementById("filtro-fecha-avisos");
const btnLimpiar = document.getElementById("btn-limpiar-filtro-avisos");

// Me guardo todos para que los filtros trabajen sobre la misma lista y no
// vuelva a consultar la API cada vez que tocan una pastilla.
let todos = [];
let periodo = "todos";

// Un comunicado es "nuevo" durante su primer dia.
const UN_DIA = 24 * 60 * 60 * 1000;

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

// Devuelve el primer dia del periodo elegido, o null si son todos.
function desdeCuando() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  if (periodo === "hoy") {
    return hoy;
  }

  if (periodo === "semana") {
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 6);
    return inicio;
  }

  if (periodo === "mes") {
    const inicio = new Date(hoy);
    inicio.setDate(inicio.getDate() - 29);
    return inicio;
  }

  return null;
}

function aplicarFiltro() {
  // La fecha exacta manda sobre las pastillas cuando esta puesta.
  const dia = filtroFecha?.value || "";

  let visibles;

  if (dia) {
    visibles = todos.filter(aviso => aviso.dia === dia);
  } else {
    const desde = desdeCuando();
    visibles = desde
      ? todos.filter(aviso => new Date(aviso.fecha) >= desde)
      : todos;
  }

  escribirConteo(visibles.length);

  if (visibles.length === 0) {
    mostrarMensaje(dia || periodo !== "todos"
      ? "No hay comunicados en ese periodo."
      : "No hay comunicados por el momento.");
    return;
  }

  lista.innerHTML = "";
  visibles.forEach(aviso => lista.appendChild(crearTarjeta(aviso)));
}

function escribirConteo(cantidad) {
  if (!conteo) {
    return;
  }

  conteo.textContent = cantidad === 1
    ? "1 comunicado"
    : `${cantidad} comunicados`;
}

function esReciente(aviso) {
  const publicado = new Date(aviso.fecha);

  if (Number.isNaN(publicado.getTime())) {
    return false;
  }

  return Date.now() - publicado.getTime() < UN_DIA;
}

// Solo el dia y el mes: la hora ya va abajo, junto al docente.
function fechaCorta(aviso) {
  const publicado = new Date(aviso.fecha);

  if (Number.isNaN(publicado.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-SV", { day: "numeric", month: "short" })
    .format(publicado)
    .replace(".", "");
}

function horaCorta(aviso) {
  const publicado = new Date(aviso.fecha);

  if (Number.isNaN(publicado.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("es-SV", { timeStyle: "short" }).format(publicado);
}

function crearTarjeta(aviso) {
  const tarjeta = document.createElement("article");
  tarjeta.className = "aviso-tarjeta";
  tarjeta.id = `comunicado-${aviso.idComunicado}`;

  const fila = document.createElement("div");
  fila.className = "aviso-fila";

  const icono = document.createElement("span");
  icono.className = "aviso-icono";
  icono.innerHTML = '<i class="bi bi-megaphone-fill" aria-hidden="true"></i>';

  const mensaje = document.createElement("p");
  mensaje.className = "aviso-mensaje mb-0";
  mensaje.textContent = aviso.mensaje;

  fila.append(icono, mensaje);

  const pie = document.createElement("div");
  pie.className = "aviso-pie";

  const autor = document.createElement("div");
  autor.className = "aviso-autor";

  const nombre = document.createElement("span");
  nombre.className = "aviso-docente";
  nombre.textContent = aviso.docente;

  const hora = document.createElement("span");
  hora.className = "aviso-hora";
  hora.textContent = horaCorta(aviso);

  autor.append(nombre, hora);

  const marca = document.createElement("div");
  marca.className = "aviso-marca";

  if (esReciente(aviso)) {
    const etiqueta = document.createElement("span");
    etiqueta.className = "aviso-nuevo";
    etiqueta.textContent = "Nuevo";
    marca.appendChild(etiqueta);
  }

  const fecha = document.createElement("span");
  fecha.className = "aviso-fecha";
  fecha.textContent = fechaCorta(aviso);
  marca.appendChild(fecha);

  pie.append(autor, marca);
  tarjeta.append(fila, pie);

  return tarjeta;
}

function mostrarMensaje(texto, esError = false) {
  lista.innerHTML = "";

  const parrafo = document.createElement("p");
  parrafo.className = `text-center mb-0 ${esError ? "text-danger" : "text-secondary"}`;
  parrafo.textContent = texto;
  lista.appendChild(parrafo);
}

// Las pastillas y la fecha exacta se excluyen: elegir una limpia la otra.
pastillas?.addEventListener("click", function (evento) {
  const boton = evento.target.closest("[data-periodo]");

  if (!boton) {
    return;
  }

  periodo = boton.dataset.periodo;

  pastillas.querySelectorAll(".pastilla")
    .forEach(p => p.classList.toggle("activa", p === boton));

  if (filtroFecha) {
    filtroFecha.value = "";
  }

  aplicarFiltro();
});

btnCalendario?.addEventListener("click", function () {
  const oculto = cajaFecha.classList.toggle("d-none");
  btnCalendario.setAttribute("aria-expanded", String(!oculto));
  btnCalendario.classList.toggle("activo", !oculto);

  if (!oculto) {
    filtroFecha?.focus();
  }
});

filtroFecha?.addEventListener("change", aplicarFiltro);
filtroFecha?.addEventListener("input", aplicarFiltro);

btnLimpiar?.addEventListener("click", function () {
  if (filtroFecha) {
    filtroFecha.value = "";
  }

  aplicarFiltro();
});
