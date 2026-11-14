/* ==========================================================
   DIW · UT1 PR1 — app.js (vanilla, sin frameworks)
   Carrito en localStorage, contador, total en vivo,
   búsqueda, filtros de categoría y favoritos dinámicos
   (clave diw.favs, siembra inicial ["w1","h1"]).
   ========================================================== */
(function () {
  'use strict';

  /* ---------- Catálogo ---------- */
  const PRODUCTOS = {
    w1: { nombre: 'Camiseta blanca', precio: 15.99, cat: 'M', img: 'assets/img-w1.jpg' },
    w2: { nombre: 'Camiseta estampada', precio: 19.99, cat: 'M', img: 'assets/img-w2.jpg' },
    h1: { nombre: 'Pantalón vaquero', precio: 34.99, cat: 'H', img: 'assets/img-h1.jpg' },
    h2: { nombre: 'Pantalón chino', precio: 29.99, cat: 'H', img: 'assets/img-h2.jpg' },
    n1: { nombre: 'Jumper infantil', precio: 18.99, cat: 'N', img: 'assets/img-n1.jpg' },
    n2: { nombre: 'Vestido infantil', precio: 22.99, cat: 'N', img: 'assets/img-n2.jpg' }
  };

  /* ---------- Persistencia (localStorage + respaldo en memoria) ---------- */
  const CLAVE = 'diw.cart';
  let memoria = {};

  function leerCarrito() {
    try {
      const crudo = window.localStorage.getItem(CLAVE);
      const datos = crudo ? JSON.parse(crudo) : {};
      const limpio = {};
      for (const id in datos) {
        const cantidad = Number.parseInt(datos[id], 10);
        if (Object.prototype.hasOwnProperty.call(PRODUCTOS, id) &&
            Number.isFinite(cantidad) && cantidad > 0) {
          limpio[id] = cantidad;
        }
      }
      return limpio;
    } catch (error) {
      // Storage no disponible o contenido corrupto: se usa el respaldo en memoria
      return Object.assign({}, memoria);
    }
  }

  function guardarCarrito(cart) {
    memoria = cart;
    try {
      window.localStorage.setItem(CLAVE, JSON.stringify(cart));
    } catch (error) {
      /* Sin persistencia: el carrito vive solo en memoria */
    }
  }

  /* ---------- Favoritos: persistencia (localStorage + respaldo en memoria) ---------- */
  const CLAVE_FAVS = 'diw.favs';
  // Siembra de primer uso: misma vista inicial que las tarjetas que había en el HTML
  let memoriaFavs = ['w1', 'h1'];

  function leerFavs() {
    try {
      const crudo = window.localStorage.getItem(CLAVE_FAVS);
      if (crudo === null) {
        // Primer uso: se siembran los favoritos iniciales
        guardarFavs(memoriaFavs);
        return memoriaFavs.slice();
      }
      const datos = JSON.parse(crudo);
      if (!Array.isArray(datos)) throw new Error('formato no válido');
      return datos.filter(function (id) {
        return Object.prototype.hasOwnProperty.call(PRODUCTOS, id);
      });
    } catch (error) {
      // Storage no disponible o contenido corrupto: se usa el respaldo en memoria
      return memoriaFavs.slice();
    }
  }

  function guardarFavs(favs) {
    memoriaFavs = favs.slice();
    try {
      window.localStorage.setItem(CLAVE_FAVS, JSON.stringify(favs));
    } catch (error) {
      /* Sin persistencia: los favoritos viven solo en memoria */
    }
  }

  /* ---------- Referencias del DOM ---------- */
  const $ = function (selector) { return document.querySelector(selector); };

  const contador = $('.cabecera__badge');
  const enlaceCarrito = $('.cabecera__carrito');
  const listaCarrito = $('.lista-carrito');
  const valorTotal = $('.total__valor');
  const botonFin = $('.btn-fin');
  const vacioCarrito = $('.estado-vacio--carrito');

  /* ---------- Utilidades ---------- */
  function euro(cifras) {
    return cifras.toFixed(2).replace('.', ',') + ' €';
  }

  function unidades(cart) {
    return Object.values(cart).reduce(function (suma, n) { return suma + n; }, 0);
  }

  function importe(cart) {
    return Object.entries(cart).reduce(function (suma, par) {
      return suma + PRODUCTOS[par[0]].precio * par[1];
    }, 0);
  }

  /* ---------- Carrito: render de filas ---------- */
  function filaProducto(id, cantidad) {
    const p = PRODUCTOS[id];
    const fila = document.createElement('li');
    fila.className = 'fila-carrito';
    fila.setAttribute('data-id', id);
    fila.innerHTML =
      '<img class="fila-carrito__img" src="' + p.img + '" alt="">' +
      '<div class="fila-carrito__info">' +
      '  <p class="fila-carrito__nombre">' + p.nombre + '</p>' +
      '  <p class="fila-carrito__precio">' + euro(p.precio) + '</p>' +
      '  <div class="fila-carrito__cantidad" role="group" aria-label="Cantidad de ' + p.nombre + '">' +
      '    <button type="button" class="fila-carrito__boton" data-cambiar="-1" aria-label="Restar una unidad de ' + p.nombre + '">−</button>' +
      '    <span class="fila-carrito__num">' + cantidad + '</span>' +
      '    <button type="button" class="fila-carrito__boton" data-cambiar="1" aria-label="Sumar una unidad de ' + p.nombre + '">+</button>' +
      '  </div>' +
      '</div>' +
      '<button type="button" class="fila-carrito__eliminar" data-eliminar aria-label="Eliminar ' + p.nombre + ' del carrito">✕</button>';
    return fila;
  }

  function renderCarrito(cart) {
    if (!listaCarrito) return;
    const n = unidades(cart);

    listaCarrito.textContent = '';
    Object.keys(cart).forEach(function (id) {
      listaCarrito.appendChild(filaProducto(id, cart[id]));
    });

    if (valorTotal) valorTotal.textContent = euro(importe(cart));
    if (vacioCarrito) vacioCarrito.hidden = n > 0;
    if (botonFin) botonFin.disabled = n === 0;
  }

  /* ---------- Contador de cabecera + actualización global ---------- */
  function actualizar() {
    const cart = leerCarrito();
    const n = unidades(cart);

    if (contador) contador.textContent = String(n);
    if (enlaceCarrito) {
      enlaceCarrito.setAttribute(
        'aria-label',
        n === 1
          ? 'Ver carrito de compra, 1 artículo'
          : 'Ver carrito de compra, ' + n + ' artículos'
      );
    }
    renderCarrito(cart);
  }

  /* ---------- Eventos (delegación en document) ---------- */
  document.addEventListener('click', function (ev) {
    // Añadir al carrito: botones [data-add] (Inicio, Explorar, Favoritos)
    const add = ev.target.closest('[data-add]');
    if (add) {
      const id = add.getAttribute('data-add');
      if (!Object.prototype.hasOwnProperty.call(PRODUCTOS, id)) return;
      const cart = leerCarrito();
      cart[id] = (cart[id] || 0) + 1;
      guardarCarrito(cart);
      actualizar();
      return;
    }

    // Tocar la foto de un producto: guardar en favoritos (Inicio y Explorar)
    const mediaFav = ev.target.closest('.prod__media[data-fav]');
    if (mediaFav) {
      anadirFavorito(mediaFav.getAttribute('data-fav'));
      return;
    }

    // Corazón de las tarjetas de Favoritos: quitar de favoritos
    const quitarFav = ev.target.closest('[data-quitar-fav]');
    if (quitarFav) {
      quitarFavorito(quitarFav.getAttribute('data-quitar-fav'));
      return;
    }

    // Controles de cantidad y eliminar (solo existe en carrito.html)
    if (!listaCarrito) return;

    const cambio = ev.target.closest('[data-cambiar]');
    if (cambio) {
      const fila = cambio.closest('.fila-carrito');
      const id = fila && fila.getAttribute('data-id');
      if (!id || !Object.prototype.hasOwnProperty.call(PRODUCTOS, id)) return;
      const cart = leerCarrito();
      const nueva = (cart[id] || 0) + Number.parseInt(cambio.getAttribute('data-cambiar'), 10);
      if (nueva <= 0) delete cart[id];
      else cart[id] = nueva;
      guardarCarrito(cart);
      actualizar();
      return;
    }

    const eliminar = ev.target.closest('[data-eliminar]');
    if (eliminar) {
      const fila = eliminar.closest('.fila-carrito');
      const id = fila && fila.getAttribute('data-id');
      if (!id) return;
      const cart = leerCarrito();
      delete cart[id];
      guardarCarrito(cart);
      actualizar();
    }
  });

  /* Teclado: Enter/Espacio sobre la foto táctil (role="button") */
  document.addEventListener('keydown', function (ev) {
    if (ev.key !== 'Enter' && ev.key !== ' ' && ev.key !== 'Spacebar') return;
    const mediaFav = ev.target.closest('.prod__media[data-fav]');
    // Solo si el foco está en la propia foto (no en el botón "+" que vive dentro)
    if (mediaFav && ev.target === mediaFav) {
      ev.preventDefault();
      anadirFavorito(mediaFav.getAttribute('data-fav'));
    }
  });

  /* ---------- Botón FIN COMPRA ---------- */
  if (botonFin) {
    botonFin.addEventListener('click', function () {
      const cart = leerCarrito();
      if (unidades(cart) === 0) return;
      const confirmado = window.confirm('¿Confirmar la compra?');
      if (!confirmado) return;
      guardarCarrito({});
      actualizar();
      window.alert('¡Gracias por tu compra!');
    });
  }

  /* ---------- Explorar: botón Filtro (aria-expanded / aria-controls) ---------- */
  const botonFiltro = $('.buscador__filtro');
  const panelFiltro = $('.panel-filtro');
  if (botonFiltro && panelFiltro) {
    botonFiltro.setAttribute('aria-controls', panelFiltro.id || 'panel-filtro');
    botonFiltro.setAttribute('aria-expanded', 'false');
    botonFiltro.addEventListener('click', function () {
      const abierto = botonFiltro.getAttribute('aria-expanded') === 'true';
      botonFiltro.setAttribute('aria-expanded', String(!abierto));
      panelFiltro.hidden = abierto;
    });
  }

  /* ---------- Explorar: búsqueda + filtros de categoría ---------- */
  const campoBusqueda = $('.buscador__input');
  const casillas = Array.prototype.slice.call(document.querySelectorAll('.panel-filtro__checkbox'));
  const secciones = Array.prototype.slice.call(document.querySelectorAll('.seccion[data-cat]'));

  function aplicarFiltros() {
    if (!secciones.length) return;
    const texto = campoBusqueda ? campoBusqueda.value.trim().toLowerCase() : '';
    const activas = {};
    casillas.forEach(function (c) {
      if (c.checked) activas[c.value] = true;
    });

    secciones.forEach(function (seccion) {
      const cat = seccion.getAttribute('data-cat');
      const prods = Array.prototype.slice.call(seccion.querySelectorAll('.prod'));
      let visibles = 0;

      prods.forEach(function (prod) {
        const nombre = (prod.getAttribute('data-nombre') || '').toLowerCase();
        const coincide = nombre.indexOf(texto) !== -1;
        prod.hidden = !coincide;
        if (coincide) visibles++;
      });

      // La sección se oculta si su casilla no está marcada o sin resultados
      seccion.hidden = !(activas[cat] && visibles > 0);
    });
  }

  if (campoBusqueda) campoBusqueda.addEventListener('input', aplicarFiltros);
  casillas.forEach(function (c) {
    c.addEventListener('change', aplicarFiltros);
  });
  aplicarFiltros();

  /* ---------- Favoritos: plantillas y SVG ---------- */
  const CORAZON_SVG =
    '<svg viewBox="0 0 24 24" fill="var(--rojo)" stroke="var(--negro)" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>';

  const MAS_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>';

  /* ---------- Favoritos: tarjetas dinámicas (favoritos.html) ---------- */
  const listaFavoritos = $('#lista-favoritos');
  const vacioFavoritos = $('.estado-vacio--favoritos');

  function tarjetaFav(id) {
    const p = PRODUCTOS[id];
    const tarjeta = document.createElement('li');
    tarjeta.className = 'tarjeta-fav';
    tarjeta.setAttribute('data-id', id);
    tarjeta.innerHTML =
      '<div class="tarjeta-fav__media">' +
      '<img class="tarjeta-fav__img" src="' + p.img + '" alt="' + p.nombre + ' (foto de producto)">' +
      '<button type="button" class="tarjeta-fav__corazon" data-quitar-fav="' + id + '" aria-label="Quitar de favoritos: ' + p.nombre + '">' + CORAZON_SVG + '</button>' +
      '</div>' +
      '<p class="tarjeta-fav__nombre">' + p.nombre + '</p>' +
      '<p class="tarjeta-fav__precio">' + euro(p.precio) + '</p>' +
      '<div class="tarjeta-fav__acciones">' +
      '<button type="button" class="btn-redondo" data-add="' + id + '" aria-label="Añadir ' + p.nombre + ' al carrito">' + MAS_SVG + '</button>' +
      '</div>';
    return tarjeta;
  }

  function renderFavoritos() {
    if (!listaFavoritos) return;
    const favs = leerFavs();
    listaFavoritos.textContent = '';
    favs.forEach(function (id) {
      if (Object.prototype.hasOwnProperty.call(PRODUCTOS, id)) {
        listaFavoritos.appendChild(tarjetaFav(id));
      }
    });
    if (vacioFavoritos) vacioFavoritos.hidden = listaFavoritos.children.length > 0;
  }

  /* ---------- Favoritos: badge de corazón sobre las fotos (Inicio y Explorar) ---------- */
  function actualizarBadgesFav() {
    const favs = leerFavs();
    document.querySelectorAll('.prod__media[data-fav]').forEach(function (media) {
      const id = media.getAttribute('data-fav');
      const marcado = favs.indexOf(id) !== -1;
      const badge = media.querySelector('.prod__badge-fav');
      if (marcado && !badge) {
        const nuevo = document.createElement('span');
        nuevo.className = 'prod__badge-fav';
        nuevo.setAttribute('aria-hidden', 'true');
        nuevo.innerHTML = CORAZON_SVG;
        media.appendChild(nuevo);
      } else if (!marcado && badge) {
        badge.remove();
      }
    });
  }

  function anadirFavorito(id) {
    if (!Object.prototype.hasOwnProperty.call(PRODUCTOS, id)) return;
    const favs = leerFavs();
    if (favs.indexOf(id) !== -1) return; // ya está guardado: no pasa nada
    favs.push(id);
    guardarFavs(favs);
    actualizarBadgesFav();
  }

  function quitarFavorito(id) {
    if (!Object.prototype.hasOwnProperty.call(PRODUCTOS, id)) return;
    const favs = leerFavs();
    guardarFavs(favs.filter(function (x) { return x !== id; }));
    renderFavoritos();
    actualizarBadgesFav();
  }

  /* ---------- Refuerzo de la tab activa (aria-current="page") ---------- */
  (function reforzarTab() {
    let nombre = (window.location.pathname || '').split('/').pop();
    if (!nombre) nombre = 'index.html';
    // Las subpáginas de Perfil activan la tab de Perfil
    const subdePerfil = ['informacion.html', 'devolucion.html', 'atencion-al-cliente.html', 'contacto.html'];
    if (subdePerfil.indexOf(nombre) !== -1) nombre = 'perfil.html';
    document.querySelectorAll('.nav-inferior__tab').forEach(function (tab) {
      if (tab.getAttribute('href') === nombre) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
  })();

  /* ---------- Arranque ---------- */
  if (listaFavoritos) renderFavoritos();
  actualizarBadgesFav();
  actualizar();
})();
