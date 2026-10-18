// Buscador para una lista desplegable larga (docentes, estudiantes): se
// escribe el nombre y la lista se va reduciendo mientras se teclea. No
// distingue mayusculas ni tildes, asi "raul" encuentra a "Raúl Mena".

export function sinTildes(texto) {
  return String(texto || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

// Se llama cuando la lista ya tiene sus opciones. La primera ("Seleccione
// un...") se queda siempre arriba y sirve para decir cuantos se encontraron.
export function conectarBuscador(buscador, select, { singular, plural }) {
  if (!buscador || !select) return;

  const [primera, ...resto] = [...select.options];
  const textoInicial = primera?.textContent || "";
  const opciones = resto.map(opcion => ({ opcion, texto: sinTildes(opcion.textContent) }));

  function filtrar() {
    const busqueda = sinTildes(buscador.value);
    const elegido = select.value;
    const encontradas = opciones.filter(({ texto }) => texto.includes(busqueda));
    const lista = encontradas.map(({ opcion }) => opcion);

    // Lo que ya habia elegido no desaparece aunque no coincida con lo escrito.
    const anterior = opciones.find(({ opcion }) => opcion.value === elegido)?.opcion;
    if (anterior && !lista.includes(anterior)) {
      lista.unshift(anterior);
    }

    select.replaceChildren(primera, ...lista);

    if (!busqueda) {
      primera.textContent = textoInicial;
    } else if (encontradas.length === 0) {
      primera.textContent = `Ningún ${singular} coincide`;
    } else {
      primera.textContent = encontradas.length === 1
        ? `1 ${singular} encontrado`
        : `${encontradas.length} ${plural} encontrados`;
    }

    // Si solo queda uno se elige solo, para no tener que abrir la lista.
    if (!elegido && encontradas.length === 1) {
      select.value = encontradas[0].opcion.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
    } else {
      select.value = elegido;
    }
  }

  buscador.disabled = false;
  buscador.addEventListener("input", filtrar);

  // Al limpiar el formulario despues de enviar, la lista vuelve a estar completa.
  buscador.form?.addEventListener("reset", () => setTimeout(filtrar));
}
