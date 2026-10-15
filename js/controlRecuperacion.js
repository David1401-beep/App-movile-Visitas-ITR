import { solicitarCodigo, verificarCodigo, cambiarPassword } from "./RecuperacionService.js";
import { revisar, avisoValidacion, bloquearLetras } from "./validaciones.js";

// Esta pantalla NO carga guardian.js a proposito: quien llega aqui no
// tiene sesion, y el guardian lo sacaria antes de poder escribir nada.

document.addEventListener("DOMContentLoaded", function () {
  const formCorreo = document.getElementById("formulario-correo");
  const formCodigo = document.getElementById("formulario-codigo");
  const formPassword = document.getElementById("formulario-password");

  const inputCorreo = document.getElementById("correo-recuperar");
  const inputCodigo = document.getElementById("codigo-recuperar");
  const inputPassword = document.getElementById("password-nueva");
  const inputRepetida = document.getElementById("password-repetida");

  // El codigo es de 6 digitos: no deja escribir letras.
  bloquearLetras(inputCodigo);

  const btnEnviar = document.getElementById("btn-enviar-codigo");
  const btnVerificar = document.getElementById("btn-verificar-codigo");
  const btnCambiar = document.getElementById("btn-cambiar-password");
  const btnReenviar = document.getElementById("btn-reenviar");

  const mensaje = document.getElementById("mensaje-recuperar");

  let correo = "";
  let codigo = "";

  formCorreo.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    if (!formCorreo.checkValidity()) {
      formCorreo.reportValidity();
      return;
    }

    const problemaCorreo = revisar([
      { el: inputCorreo, nombre: "correo", tipo: "correo" }
    ]);

    if (problemaCorreo) {
      avisoValidacion(problemaCorreo);
      return;
    }

    correo = inputCorreo.value.trim().toLowerCase();

    await conBoton(btnEnviar, "Enviando...", async function () {
      const resultado = await solicitarCodigo(correo);

      if (!resultado.exito) {
        mostrarError(resultado.mensaje);
        return;
      }

      // La API responde igual exista o no el correo.
      mostrarAviso(resultado.mensaje);
      mostrarPaso(formCodigo);
      inputCodigo.focus();
    });
  });

  formCodigo.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    codigo = inputCodigo.value.trim();

    const problemaCodigo = revisar([
      { el: inputCodigo, nombre: "código", tipo: "codigo" }
    ]);

    if (problemaCodigo) {
      avisoValidacion(problemaCodigo);
      return;
    }

    await conBoton(btnVerificar, "Verificando...", async function () {
      const resultado = await verificarCodigo(correo, codigo);

      if (!resultado.exito) {
        mostrarError(resultado.mensaje);
        return;
      }

      limpiarMensaje();
      mostrarPaso(formPassword);
      inputPassword.focus();
    });
  });

  formPassword.addEventListener("submit", async function (evento) {
    evento.preventDefault();

    const problemaPassword = revisar([
      { el: inputPassword, nombre: "contraseña nueva", min: 6 }
    ]);

    if (problemaPassword) {
      avisoValidacion(problemaPassword);
      return;
    }

    if (inputPassword.value !== inputRepetida.value) {
      avisoValidacion({ mensaje: "Las contraseñas no coinciden.", el: inputRepetida });
      return;
    }

    await conBoton(btnCambiar, "Guardando...", async function () {
      const resultado = await cambiarPassword(correo, codigo, inputPassword.value);

      if (!resultado.exito) {
        mostrarError(resultado.mensaje);
        return;
      }

      formPassword.hidden = true;
      mostrarAviso(resultado.mensaje);

      setTimeout(() => window.location.replace("inicioSesion.html"), 2500);
    });
  });

  btnReenviar.addEventListener("click", async function () {
    inputCodigo.value = "";

    const resultado = await solicitarCodigo(correo);

    if (resultado.exito) {
      mostrarAviso("Le enviamos un código nuevo. El anterior ya no sirve.");
    } else {
      mostrarError(resultado.mensaje);
    }
  });

  // Apoyo

  function mostrarPaso(formulario) {
    formCorreo.hidden = formulario !== formCorreo;
    formCodigo.hidden = formulario !== formCodigo;
    formPassword.hidden = formulario !== formPassword;
  }

  async function conBoton(boton, textoEspera, accion) {
    const original = boton.textContent;
    boton.disabled = true;
    boton.textContent = textoEspera;

    try {
      await accion();
    } finally {
      boton.disabled = false;
      boton.textContent = original;
    }
  }

  function mostrarError(texto) {
    mensaje.textContent = texto;
    mensaje.className = "text-center small mb-0 mt-2 text-danger";
  }

  function mostrarAviso(texto) {
    mensaje.textContent = texto;
    mensaje.className = "text-center small mb-0 mt-2 text-success";
  }

  function limpiarMensaje() {
    mensaje.textContent = "";
    mensaje.className = "text-center small mb-0 mt-2";
  }
});
