// Control de Navegación Inferior (Footer Nav)
document.addEventListener('DOMContentLoaded', () => {
  const navItems = document.querySelectorAll('.bottom-nav .nav-item');
  const currentPath = window.location.pathname.toLowerCase();

  // Marcar automáticamente el ítem activo según la URL actual
  navItems.forEach(item => {
    const link = item.querySelector('a');
    const href = link?.getAttribute('href')?.toLowerCase();

    if (href) {
      const pageName = href.split('/').pop();
      if (currentPath.endsWith(pageName)) {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      } else if (pageName === 'citas-padres.html' && currentPath.endsWith('crearsolicitud-padres.html')) {
        navItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
      }
    }

    item.addEventListener('click', (event) => {
      const destination = link?.getAttribute('href');

      // Los enlaces con una página asignada navegan normalmente. Los que todavía
      // usan "#" solo cambian el indicador visual hasta que exista su pantalla.
      if (!destination || destination === '#') {
        event.preventDefault();
      }

      // Remueve la clase active de todos los items
      navItems.forEach(i => i.classList.remove('active'));
      // Agrega la clase active únicamente al item clickeado
      item.classList.add('active');
    });
  });
});
  