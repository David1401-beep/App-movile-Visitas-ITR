// Horario de atencion del colegio. La misma regla esta en la API; aqui
// esta para avisarle al usuario antes de que envie el formulario.
//
//   lunes a viernes  8:00 a 16:00
//   sabado           cerrado
//   domingo          cerrado

const APERTURA = "08:00";
const CIERRE = "16:00";

const CERRADO_FIN_DE_SEMANA = "Los fines de semana no se atienden reuniones.";

// Devuelve el horario de ese dia, o que esta cerrado.
export function horarioDeLaFecha(fecha) {
  if (!fecha) {
    return { abierto: true, min: APERTURA, max: CIERRE };
  }

  // Se parte el texto en vez de usar new Date(fecha), porque esa forma
  // interpreta la fecha en UTC y puede correrse un dia.
  const [anio, mes, dia] = fecha.split("-").map(Number);
  const diaSemana = new Date(anio, mes - 1, dia).getDay();

  if (diaSemana === 0 || diaSemana === 6) {
    return {
      abierto: false,
      mensaje: CERRADO_FIN_DE_SEMANA
    };
  }

  return {
    abierto: true,
    min: APERTURA,
    max: CIERRE,
    mensaje: "El horario de atención es de 8:00 AM a 4:00 PM."
  };
}

// Deja el campo de hora con el rango que corresponde al dia elegido y no
// deja enviar una hora fuera de ese rango.
//
// El min/max del input sirve para el selector, pero el navegador no siempre
// lo hace cumplir: por eso ademas se revisa la hora a mano y se marca el
// campo como invalido, que si frena el envio del formulario.
export function ajustarCampoHora(campoFecha, campoHora) {
  if (!campoFecha || !campoHora) {
    return;
  }

  const revisarHora = () => {
    const horario = horarioDeLaFecha(campoFecha.value);

    if (!horario.abierto || !campoHora.value) {
      campoHora.setCustomValidity("");
      return;
    }

    const fuera = campoHora.value < horario.min || campoHora.value > horario.max;
    campoHora.setCustomValidity(fuera ? horario.mensaje : "");
  };

  const aplicar = () => {
    const horario = horarioDeLaFecha(campoFecha.value);

    if (!horario.abierto) {
      campoFecha.setCustomValidity(horario.mensaje);
      campoHora.removeAttribute("min");
      campoHora.removeAttribute("max");
      revisarHora();
      return;
    }

    campoFecha.setCustomValidity("");
    campoHora.min = horario.min;
    campoHora.max = horario.max;
    campoHora.title = horario.mensaje;
    revisarHora();
  };

  campoFecha.addEventListener("change", aplicar);
  campoFecha.addEventListener("input", aplicar);
  campoHora.addEventListener("change", revisarHora);
  campoHora.addEventListener("input", revisarHora);
  aplicar();
}

// Revisa fecha y hora juntas. Devuelve null si todo esta bien, o el
// mensaje de lo que esta mal.
export function revisarFechaHora(fecha, hora) {
  const horario = horarioDeLaFecha(fecha);

  if (!horario.abierto) {
    return horario.mensaje;
  }

  if (hora && (hora < horario.min || hora > horario.max)) {
    return horario.mensaje;
  }

  return null;
}
