// Pone una flecha de regreso junto al titulo de cada pantalla, para no
// tener que pasar por el inicio cada vez que uno quiere retroceder.
//
// Se incluye asi en el HTML:
//   <script type="module" src="../js/botonVolver.js"></script>

function nombreDePantalla() {
  return window.location.pathname.split("/").pop().toLowerCase();
}

// La flecha solo hace falta donde no se llega por la barra de abajo. Si la
// pantalla esta en su propia barra no la pongo, porque desde ahi ya se
// navega con un toque. Lo leo de la barra en vez de tener una lista escrita
// a mano, asi sigue funcionando si algun dia cambian los botones.
function estaEnLaBarra() {
  const enlaces = document.querySelectorAll(".bottom-nav a[href]");
  const pantalla = nombreDePantalla();

  return Array.from(enlaces).some(enlace =>
    enlace.getAttribute("href").split("/").pop().toLowerCase() === pantalla
  );
}

function inicioQueCorresponde() {
  return nombreDePantalla().endsWith("-docente.html")
    ? "inicio-docente.html"
    : "inicio-padres.html";
}

function volver() {
  // Si vengo de otra pantalla de la app, el atras del navegador deja al
  // usuario justo donde estaba. Si abrio la pantalla directo no hay a que
  // volver, asi que lo mando al inicio que le toca.
  const vengoDeLaApp = document.referrer.startsWith(window.location.origin);

  if (vengoDeLaApp) {
    window.history.back();
    return;
  }

  window.location.href = inicioQueCorresponde();
}

function crearBoton() {
  const boton = document.createElement("button");

  boton.type = "button";
  boton.className = "btn-volver";
  boton.id = "btn-volver";
  boton.setAttribute("aria-label", "Volver a la pantalla anterior");

  const icono = document.createElement("i");
  icono.className = "bi bi-arrow-left";
  icono.setAttribute("aria-hidden", "true");

  boton.appendChild(icono);
  boton.addEventListener("click", volver);

  return boton;
}

function colocarBoton() {
  if (estaEnLaBarra()) {
    return;
  }

  const titulo = document.getElementById("titulo-encabezado");

  if (!titulo || document.getElementById("btn-volver")) {
    return;
  }

  // El encabezado reparte el titulo y el logo a los extremos. Si meto la
  // flecha suelta quedarian tres cosas repartidas, asi que la agrupo con
  // el titulo para que el logo siga solo a la derecha.
  const grupo = document.createElement("div");
  grupo.className = "encabezado-con-volver";

  titulo.parentNode.insertBefore(grupo, titulo);
  grupo.appendChild(crearBoton());
  grupo.appendChild(titulo);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", colocarBoton);
} else {
  colocarBoton();
}
