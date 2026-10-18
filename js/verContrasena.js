// Pone un boton con forma de ojo dentro de cada campo de contraseña, para
// mostrar u ocultar lo que se esta escribiendo.
//
// Se incluye asi en el HTML y trabaja solo con todos los campos de la pagina:
//   <script type="module" src="../js/verContrasena.js"></script>

function cambiarIcono(boton, visible) {
  boton.innerHTML = `<i class="bi ${visible ? "bi-eye-slash" : "bi-eye"}" aria-hidden="true"></i>`;
  boton.setAttribute("aria-label", visible ? "Ocultar la contraseña" : "Mostrar la contraseña");
  boton.setAttribute("aria-pressed", String(visible));
}

// Dice si el campo es oscuro mirando su fondo. Si el fondo es transparente se
// guia por el texto: letra clara quiere decir campo oscuro.
function campoOscuro(estilo) {
  const fondo = estilo.backgroundColor.match(/[\d.]+/g)?.map(Number) || [];
  const texto = estilo.color.match(/[\d.]+/g)?.map(Number) || [];
  const brillo = ([r, g, b]) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;

  if (fondo.length >= 3 && (fondo[3] ?? 1) > 0.5) {
    return brillo(fondo) < 0.5;
  }

  return texto.length >= 3 && brillo(texto) > 0.6;
}

function agregarOjo(input) {
  if (input.dataset.conOjo) {
    return;
  }

  input.dataset.conOjo = "si";

  const estilo = getComputedStyle(input);

  const envoltura = document.createElement("div");
  envoltura.className = "campo-contrasena";

  // El margen pasa del campo a la envoltura. Si se quedara en el campo, la
  // envoltura lo mediria tambien y el ojo no quedaria centrado.
  envoltura.style.marginTop = estilo.marginTop;
  envoltura.style.marginBottom = estilo.marginBottom;

  input.parentNode.insertBefore(envoltura, input);
  envoltura.appendChild(input);

  // Algunos campos traen el margen y el relleno con !important, por eso se
  // pisan de la misma forma.
  input.style.setProperty("margin-top", "0", "important");
  input.style.setProperty("margin-bottom", "0", "important");
  // Lugar a la derecha para que lo escrito no quede debajo del ojo.
  input.style.setProperty("padding-right", "2.9rem", "important");

  const boton = document.createElement("button");
  boton.type = "button";
  // Colores fijos segun el fondo: claro en los campos oscuros y oscuro en los
  // claros. Antes copiaba el color del texto al cargar, y cuando el navegador
  // autocompletaba la contraseña (pinta el campo de celeste) el ojo quedaba
  // blanco sobre claro y casi no se veia. El CSS cubre ese caso.
  boton.className = `btn-ver-contrasena ${campoOscuro(estilo) ? "sobre-oscuro" : "sobre-claro"}`;
  cambiarIcono(boton, false);

  boton.addEventListener("click", function () {
    const mostrar = input.type === "password";
    input.type = mostrar ? "text" : "password";
    cambiarIcono(boton, mostrar);
  });

  // Al enviar se vuelve a ocultar. Si el inicio de sesion falla, la
  // contraseña no se queda a la vista de quien este al lado.
  input.form?.addEventListener("submit", function () {
    input.type = "password";
    cambiarIcono(boton, false);
  });

  envoltura.appendChild(boton);
}

function ponerOjos() {
  document.querySelectorAll('input[type="password"]').forEach(agregarOjo);
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", ponerOjos);
} else {
  ponerOjos();
}
