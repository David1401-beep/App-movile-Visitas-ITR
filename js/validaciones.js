// Reglas de validacion compartidas por todos los formularios.
//
// La idea: cada pantalla declara que espera de cada campo y esto se encarga
// de revisarlo y de avisar siempre igual. Asi un nombre no acepta numeros
// aqui y alla acepta cualquier cosa.
//
// Se usa asi:
//   const error = revisar([
//     { el: inputNombre, nombre: "nombre", tipo: "letras" },
//     { el: inputCorreo, nombre: "correo", tipo: "correo" }
//   ]);
//   if (error) { avisoValidacion(error); return; }

// Letras con acentos y ñ, espacios, apostrofe y guion (D'Angelo, Pérez-Luna).
const LETRAS = /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'’-]+$/;
const SOLO_DIGITOS = /^[0-9]+$/;
const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^[0-9]{4}-[0-9]{4}$/;
const CARNET = /^[0-9]{8}$/;
const CODIGO = /^[0-9]{6}$/;

// Un texto que es solo numeros casi siempre es un error de captura.
const TODO_NUMEROS = /^[0-9\s]+$/;

export function esSoloLetras(valor) {
  return LETRAS.test(String(valor).trim());
}

// Quita en vivo lo que no son letras. Se usa en nombres y apellidos para
// que el usuario vea de una vez que ahi no van numeros.
export function bloquearNumeros(...inputs) {
  inputs.filter(Boolean).forEach(input => {
    input.addEventListener("input", function () {
      const limpio = this.value.replace(/[^A-Za-zÁÉÍÓÚÜÑáéíóúüñ\s'’-]/g, "");

      if (limpio !== this.value) {
        this.value = limpio;
      }
    });
  });
}

// Lo contrario: deja solo digitos. Para carnets y codigos.
export function bloquearLetras(...inputs) {
  inputs.filter(Boolean).forEach(input => {
    input.addEventListener("input", function () {
      const limpio = this.value.replace(/[^0-9]/g, "");

      if (limpio !== this.value) {
        this.value = limpio;
      }
    });
  });
}

// Los mensajes dicen "el correo" o "la contrasena". Casi todos los campos
// son masculinos; estos son los femeninos que usa el sistema.
const FEMENINOS = ["contraseña", "descripción"];

function conArticulo(nombre) {
  const primera = nombre.split(" ")[0].toLowerCase();
  return `${FEMENINOS.includes(primera) ? "la" : "el"} ${nombre}`;
}

function revisarCampo(campo) {
  const el = campo.el;

  if (!el) {
    return null;
  }

  const valor = String(el.value ?? "").trim();
  const nombre = campo.nombre || "este campo";
  const elNombre = conArticulo(nombre);
  const ElNombre = elNombre.charAt(0).toUpperCase() + elNombre.slice(1);

  if (!valor) {
    return campo.opcional ? null : `Complete ${elNombre}.`;
  }

  if (campo.min && valor.length < campo.min) {
    return `${ElNombre} debe tener al menos ${campo.min} caracteres.`;
  }

  if (campo.max && valor.length > campo.max) {
    return `${ElNombre} no puede pasar de ${campo.max} caracteres.`;
  }

  switch (campo.tipo) {
    case "letras":
      if (!LETRAS.test(valor)) {
        return `${ElNombre} solo puede llevar letras. Quite los números y símbolos.`;
      }
      break;

    case "digitos":
      if (!SOLO_DIGITOS.test(valor)) {
        return `${ElNombre} solo puede llevar números.`;
      }
      break;

    case "carnet":
      if (!CARNET.test(valor)) {
        return `${ElNombre} debe ser de 8 dígitos (por ejemplo 20240087).`;
      }
      break;

    case "codigo":
      if (!CODIGO.test(valor)) {
        return `${ElNombre} debe ser de 6 dígitos.`;
      }
      break;

    case "telefono":
      if (!TELEFONO.test(valor)) {
        return `${ElNombre} debe tener el formato 0000-0000.`;
      }
      break;

    case "correo":
      if (!CORREO.test(valor)) {
        return `${ElNombre} no tiene un formato válido.`;
      }
      break;

    // Texto libre: acepta numeros, pero no deja pasar algo que sea
    // puros numeros, que casi siempre es un error de captura.
    case "texto":
      if (TODO_NUMEROS.test(valor)) {
        return `${ElNombre} no puede ser solo números.`;
      }
      break;

    default:
      break;
  }

  return null;
}

// Revisa la lista en orden y devuelve el primer problema, o null si todo
// esta bien. Devuelve tambien el campo para poder enfocarlo.
export function revisar(campos) {
  for (const campo of campos) {
    const mensaje = revisarCampo(campo);

    if (mensaje) {
      return { mensaje, el: campo.el };
    }
  }

  return null;
}

// Para textos que no vienen de un input de la pagina, como lo que se
// escribe dentro de una ventana emergente. Devuelve el mensaje o null.
export function revisarValor(valor, campo) {
  const problema = revisar([{ ...campo, el: { value: valor } }]);
  return problema ? problema.mensaje : null;
}

// Modal propio, por si la pantalla no carga SweetAlert. Se arma una sola
// vez y se reutiliza.
function modalPropio(mensaje) {
  let fondo = document.getElementById("modal-validacion");

  if (!fondo) {
    fondo = document.createElement("div");
    fondo.id = "modal-validacion";
    fondo.className = "modal-validacion-fondo";
    fondo.innerHTML = `
      <div class="modal-validacion-caja" role="alertdialog" aria-modal="true"
           aria-labelledby="modal-validacion-titulo">
        <h2 class="modal-validacion-titulo" id="modal-validacion-titulo">Revise los datos</h2>
        <p class="modal-validacion-texto" id="modal-validacion-texto"></p>
        <button type="button" class="modal-validacion-boton" id="modal-validacion-cerrar">Entendido</button>
      </div>
    `;
    document.body.appendChild(fondo);

    const cerrar = () => fondo.classList.remove("visible");
    fondo.querySelector("#modal-validacion-cerrar").addEventListener("click", cerrar);
    fondo.addEventListener("click", evento => {
      if (evento.target === fondo) {
        cerrar();
      }
    });
    document.addEventListener("keydown", evento => {
      if (evento.key === "Escape") {
        cerrar();
      }
    });
  }

  fondo.querySelector("#modal-validacion-texto").textContent = mensaje;
  fondo.classList.add("visible");
  fondo.querySelector("#modal-validacion-cerrar").focus();
}

// Muestra el error en un modal y deja el cursor en el campo que fallo.
export function avisoValidacion(error) {
  const mensaje = typeof error === "string" ? error : error?.mensaje;

  if (!mensaje) {
    return;
  }

  if (window.Swal) {
    Swal.fire({ icon: "warning", title: "Revise los datos", text: mensaje });
  } else {
    modalPropio(mensaje);
  }

  if (typeof error === "object" && error?.el) {
    error.el.focus();
  }
}
