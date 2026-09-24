// Contenido del tutorial (/tutorial). Cada sección dice para qué roles es
// ("todos" = cualquier usuario logueado); la página muestra por defecto solo
// las del rol del usuario. **texto** se ve en negrita: se usa para los nombres
// de botones, pestañas y pantallas tal cual aparecen en la app, así el usuario
// los reconoce. Si se cambia un texto de la app, conviene actualizarlo acá.
//
// Tipos de bloque: p (párrafo), sub (subtítulo), steps (pasos numerados),
// list (viñetas), defs (término -> explicación), flow (etapas con flechas),
// tip (consejo) y warn (atención).
//
// goTo agrega un botón "Ir a ..." al final de la sección; `can` decide quién lo
// ve (si falta, lo ve quien tenga alguno de los roles de la sección).

export const ROLE_LABELS = {
  superuser: "Superusuario",
  distribuidor: "Distribuidor",
  vendedor: "Vendedor",
  enc_comercial: "Enc. Comercial",
  rev_tecnica: "Rev. Técnica",
  medidor: "Medidor",
  logistica: "Logística",
  administracion: "Administración",
};

const SELLERS = ["vendedor", "distribuidor"];

export const TUTORIAL_SECTIONS = [
  {
    id: "primeros-pasos",
    title: "Primeros pasos",
    roles: ["todos"],
    intro: "Cómo entrar, qué es cada cosa de la barra de arriba y cómo moverte por el programa.",
    blocks: [
      { type: "sub", text: "Entrar y salir" },
      {
        type: "steps",
        items: [
          "Escribí tu **Usuario** y tu **Contraseña** (el ojito muestra lo que escribiste) y tocá **Entrar**.",
          "Si aparece **Credenciales inválidas**, revisá usuario y contraseña. Si aparece **Usuario inhabilitado**, tu cuenta está desactivada: pedí que la habiliten.",
          "La sesión queda abierta en ese navegador varios días. Para cerrarla tocá **Salir**, arriba a la derecha.",
        ],
      },
      { type: "sub", text: "La barra de arriba" },
      {
        type: "defs",
        items: [
          { term: "Tu nombre y rol", text: "En el centro: tu usuario y tus roles (Vendedor, Distribuidor, Medidor, etc.). Lo que ves en el menú depende de esos roles." },
          { term: "Consulta tecnica / Consulta comercial", text: "Para hacerle preguntas al área técnica o comercial. Si tienen un número rojo, tenés respuestas o consultas sin leer." },
          { term: "Online / Offline", text: "Indica si el programa pudo traer catálogo y precios de Odoo al entrar. En **Offline** puede que los precios no carguen: recargá la página y, si sigue, reportalo." },
          { term: "☀️ 🌙 🖥️", text: "Modo claro, modo oscuro o automático (según tu computadora). Queda guardado en ese navegador." },
          { term: "Botón verde redondo", text: "Abajo a la derecha, en todas las pantallas: sirve para **Reportar error** del sistema y ver **Mis consultas**. Al pie de ese panel está el acceso a este tutorial." },
        ],
      },
      { type: "sub", text: "Moverte por el programa" },
      {
        type: "list",
        items: [
          "**Menu** te muestra tarjetas con todo lo que podés usar según tu rol. Cada tarjeta tiene su botón (**Ir al presupuesto**, **Ver mis presupuestos**, **Abrir mediciones**...).",
          "La barra de navegación tiene los mismos accesos. Los que tienen ▾ (**Presupuestar ▾**, **Aprobaciones ▾**) se despliegan al pasar el mouse por encima.",
        ],
      },
    ],
    goTo: { path: "/menu", label: "Ir al Menu" },
  },
  {
    id: "ayuda",
    title: "¿A quién le pregunto?",
    roles: ["todos"],
    intro: "Hay tres canales distintos. Elegir el correcto hace que la respuesta llegue más rápido.",
    blocks: [
      {
        type: "defs",
        items: [
          { term: "Consulta tecnica", text: "Dudas técnicas de un producto o de un presupuesto (medidas, sistemas, colocación). Responde el área técnica." },
          { term: "Consulta comercial", text: "Precios, condiciones, descuentos, clientes, reclamos de comisiones. Responde el área comercial." },
          { term: "Reportar error (botón verde)", text: "Cuando el **programa** falla o no funciona como debería, necesitás un acceso o permiso, o no entendés cómo se usa algo. Lo recibe el equipo de sistemas." },
        ],
      },
      { type: "sub", text: "Cómo reportar un error" },
      {
        type: "steps",
        items: [
          "Tocá el botón verde redondo de abajo a la derecha. Se abre en la pestaña **Reportar error**.",
          "Elegí la **Categoría** (por ejemplo **Error / algo no funciona** o **Solicitud de acceso o permiso**).",
          "En **Contanos tu ticket** explicá qué estabas haciendo, qué esperabas y qué pasó. Si es de un presupuesto, poné el número.",
          "Si podés, adjuntá una captura de pantalla o un video corto en **Adjuntos (opcional)** (hasta 5 archivos).",
          "Tocá **Enviar ticket**. Las respuestas aparecen en la pestaña **Mis consultas**; el botón verde muestra un número rojo cuando hay novedades.",
        ],
      },
      {
        type: "tip",
        text: "Dentro de **Mis consultas** podés abrir un ticket, agregar un comentario o **Anular ticket** si ya no hace falta.",
      },
    ],
  },
  {
    id: "recorrido",
    title: "El recorrido de un presupuesto",
    roles: ["todos"],
    intro: "El camino completo desde que se arma un presupuesto hasta que el producto entra a producción. Sirve para entender en qué etapa está cada uno y quién tiene que actuar.",
    blocks: [
      {
        type: "flow",
        items: [
          "1. Vendedor/Distribuidor arma y confirma",
          "2. Aprueban Comercial y Técnica",
          "3. Se crea la NP en Odoo",
          "4. Medición en obra",
          "5. Vendedor ajusta y reenvía",
          "6. Comercial revisa la diferencia",
          "7. Técnica aprueba el final: NV",
          "8. Cliente firma el link",
          "9. Semana de producción",
        ],
      },
      {
        type: "defs",
        items: [
          { term: "1. Armar y confirmar", text: "El vendedor o distribuidor carga cliente, medidas y productos, y toca **Confirmar presupuesto** eligiendo **Acopio** o **Producción**." },
          { term: "2. Aprobaciones", text: "Comercial y Técnica lo revisan, cada uno por su lado y en cualquier orden. Si alguno lo rechaza, vuelve al vendedor para corregir y las dos aprobaciones empiezan de nuevo." },
          { term: "3. NP (Nota de Pedido)", text: "Cuando están las dos aprobaciones se crea la NP en Odoo (por ejemplo **NP4240**)." },
          { term: "4. Medición", text: "Si el presupuesto incluye el servicio de medición, el medidor va a la obra, carga las medidas reales y lo devuelve al vendedor." },
          { term: "5. Cambios postmedición", text: "El vendedor revisa lo que cambió con la medición y lo reenvía a Comercial." },
          { term: "6 y 7. Revisión final", text: "Comercial revisa la diferencia de precio y Técnica hace la aprobación final. Ahí se crea la **NV** (Nota de Venta, mantiene el número: NP4240 → NV4240) y el link de aceptación para el cliente." },
          { term: "8. Firma del cliente", text: "El cliente abre el link, revisa los datos técnicos, acepta los términos y firma con nombre y DNI." },
          { term: "9. Producción", text: "Con la firma se reserva la semana de producción. **El producto no ingresa a producción hasta que el cliente completa la aceptación.**" },
        ],
      },
      { type: "sub", text: "Variantes del recorrido" },
      {
        type: "list",
        items: [
          "**Portón o puerta sin servicio de medición:** después de las aprobaciones se crea la NV directamente; Técnica completa el detalle técnico y se genera el link para el cliente.",
          "**Ipanel y Plegados:** no pasan por el medidor; Técnica revisa el detalle técnico.",
          "**Otros:** siempre va a producción. Con las dos aprobaciones se crea la NV y se reserva la semana.",
          "**Acopio:** se crea la NP y queda guardado en acopio. Cuando el cliente quiera fabricarlo, el vendedor pide el **paso a Producción** y Comercial y Técnica lo aprueban de nuevo.",
        ],
      },
    ],
  },
  {
    id: "armar-porton",
    title: "Armar un presupuesto de portón",
    roles: SELLERS,
    intro: "El paso a paso para cotizar un portón De Grandis. Ipanel, Plegados, Otros y Puertas funcionan casi igual (ver la sección siguiente).",
    blocks: [
      {
        type: "steps",
        items: [
          "Entrá desde **Menu** → **Presupuesto De Grandis Portones** → **Ir al presupuesto** (o **Presupuestar ▾** → **De Grandis Portones**).",
          "Esperá a que termine **Preparando lista de precios**: mientras tanto el catálogo dice **Catálogo bloqueado momentáneamente**. Si aparece **No se pudieron cargar los precios**, tocá **Reintentar**.",
          "Cargá los datos del cliente y la forma de pago (se explica en detalle más abajo).",
          "En **Características del portón** elegí un producto por sección con **Elegir**. Al elegir, se abre sola la sección siguiente.",
          "En **Medidas del Vano** cargá **Ancho del vano (m)** y **Alto del vano (m)**. El programa calcula el tamaño real del portón, la superficie y el peso.",
          "Revisá la tabla **Ítems** y los totales (**Subtotal**, **IVA**, **Total**).",
          "Descargá el PDF con **PDF presupuesto** para mandárselo al cliente.",
          "Cuando el cliente está de acuerdo, tocá **Confirmar presupuesto** y elegí **Acopio** o **Producción**.",
        ],
      },
      { type: "sub", text: "Características del portón (catálogo)" },
      {
        type: "list",
        items: [
          "Las secciones se miran **siempre desde afuera de la vivienda/obra (exterior)**: tenelo en cuenta para lados, apertura y colocación. El botón **?** lo recuerda.",
          "Cada sección muestra cuántos elegiste y el total. Se puede plegar y desplegar tocando el título.",
          "Si cambiás un producto del que dependen las secciones siguientes, te avisa que vas a tener que volver a cargarlas.",
          "**Sin stock permanente**: el producto se puede elegir pero no hay stock permanente. **No habilitado para tu rol**: no lo podés usar.",
          "Algunos ítems se agregan solos según lo que elegiste (por ejemplo refuerzos por peso). Aparecen como **Auto** y no se pueden borrar.",
          "**Actualizar catálogo** vuelve a traer el catálogo si algo no aparece.",
        ],
      },
      { type: "sub", text: "Medidas del vano" },
      {
        type: "list",
        items: [
          "El **Tipo de colocación** (**Por detras del vano** o **Dentro del vano**) sale de lo que elegiste en el catálogo. Si es por detrás, se suman los adicionales de piernas y dintel.",
          "El portón calculado tiene que medir entre **2,30 m y 7 m de ancho** y entre **2 m y 3 m de alto**. Si queda afuera, aparece **Se encuentra fuera de los limites de tamano** y no se puede guardar.",
          "Los **parantes** (orientación, cantidad y distribución) se calculan solos. Solo se pueden editar en portones **apto para revestir**; ahí podés elegir distribución **Especial** y ubicar cada parante. **Ver esquema de parantes** muestra el dibujo.",
          "Abajo vas a ver las **Medidas de paso**, **Medidas de hoja**, el **Peso estimado** y la **Producción estimada** (semana aproximada de fabricación).",
        ],
      },
    ],
    goTo: { path: "/cotizador", label: "Ir al presupuesto de portones" },
  },
  {
    id: "cliente-y-pago",
    title: "Datos del cliente, forma de pago y coeficiente",
    roles: SELLERS,
    intro: "La parte de arriba del presupuesto. Es igual en todos los tipos de presupuesto.",
    blocks: [
      {
        type: "defs",
        items: [
          { term: "Datos cliente existente", text: "Busca entre **tus** presupuestos anteriores (escribí al menos 2 letras) y completa los datos del cliente solos." },
          { term: "Nombre, apellido y teléfono", text: "Obligatorios para guardar. El **Teléfono** va **sin 0 y sin 15** (y sin 54): por ejemplo 3515123456." },
          { term: "Localidad, Dirección y Google Maps (URL)", text: "Obligatorios para confirmar. El link de Maps tiene que ser de Google Maps (maps.app.goo.gl, google.com/maps o g.page)." },
          { term: "Correo", text: "Opcional, pero si lo cargás tiene que ser válido." },
          { term: "Contacto adicional", text: "Opcional: otra persona de la obra (nombre, rol y teléfono). También recibe el link de aceptación." },
          { term: "Vendedor del distribuidor", text: "Solo para distribuidores: quién de tu empresa hizo la venta." },
          { term: "Forma de pago", text: "Obligatoria para confirmar. Cada forma puede tener un recargo o descuento que ya queda incluido en el precio final de cada ítem. **Tarjetas** pide elegir tarjeta y cuotas; **Pago Multiple** permite combinar formas con porcentajes que sumen 100%." },
          { term: "Condición", text: "**Condición 1** o **Condición 2**. La Condición 2 solo está disponible con **Efectivo** o **Cheques 30**." },
          { term: "Coeficiente (%)", text: "Porcentaje que se suma a todos los precios (si es negativo, resta). En los distribuidores arranca en 20%: es tu margen. La **PDF proforma** muestra los precios sin coeficiente." },
        ],
      },
      {
        type: "tip",
        text: "El CUIT y los datos fiscales no se cargan acá: los completa Comercial al aprobar, cuando hace falta.",
      },
    ],
  },
  {
    id: "otros-tipos",
    title: "Ipanel, Plegados, Otros y Puertas",
    roles: SELLERS,
    intro: "Se arman igual que un portón (cliente, catálogo, ítems, guardar y confirmar). Lo que cambia son las medidas.",
    blocks: [
      {
        type: "defs",
        items: [
          { term: "Ipanel", text: "**Medidas del Ipanel**: **Ancho (m)** y **Alto (m)**. Si elegís **Panel en Lamas 22mm** te pide sí o sí la orientación, las divisiones y la medida de cada sección, que tienen que completar el espacio justo. **Repartir en partes iguales** te ayuda a hacerlo rápido." },
          { term: "Plegados", text: "**Medidas del plegado**: superficie, descripción y el plano. **Adjuntá el plano** (PDF o imagen): sin plano no se puede confirmar." },
          { term: "Otros", text: "No lleva medidas: elegís productos y cargás la cantidad de cada uno. Siempre va a producción." },
          { term: "Puertas", text: "**Presupuestador Puertas**: **Ancho puerta (m)** y **Alto puerta (m)**; la superficie se calcula sola. Si elegís paneles en lamas, pide cómo van armados." },
        ],
      },
      { type: "sub", text: "Vincular a un portón" },
      {
        type: "p",
        text: "En Ipanel, Plegados, Otros y Puertas aparece **Vincular a portón existente**. Si es para la misma obra que un portón ya cotizado, tocá **Buscar portón** y elegilo: copia los datos del cliente y el número queda atado al portón (por ejemplo **INP**, **PLNP**, **ONP** o **PNP** + el número del portón).",
      },
      {
        type: "warn",
        text: "Un producto vinculado no se puede pasar a Odoo hasta que el portón vinculado esté aprobado.",
      },
    ],
    goTo: { path: "/presupuestos", label: "Ir a Mis presupuestos" },
  },
  {
    id: "guardar-confirmar",
    title: "Guardar, PDF, actualizar precios y confirmar",
    roles: SELLERS,
    blocks: [
      { type: "sub", text: "Guardado automático" },
      {
        type: "list",
        items: [
          "Con **nombre, apellido y teléfono** cargados, el presupuesto se guarda solo unos segundos después de cada cambio. Arriba vas a ver **Autoguardando...** y después **Autoguardado** con la hora.",
          "Si falta alguno de esos datos, queda como **Borrador local** solo en tu navegador. Si cerrás y volvés, te avisa **Recuperé un borrador local sin guardar**.",
          "En la **Edición acopio**, la **Edición postmedición** y los ajustes **no hay guardado automático**: tocá **Guardar**.",
        ],
      },
      { type: "sub", text: "Botones del presupuesto" },
      {
        type: "defs",
        items: [
          { term: "Guardar", text: "Guarda en **Mis presupuestos**. En portones primero revisa los precios: si cambiaron, los actualiza y te pide **guardar nuevamente**." },
          { term: "PDF presupuesto", text: "Guarda y descarga el PDF para el cliente." },
          { term: "PDF proforma", text: "Solo distribuidores: la versión con precios sin tu coeficiente." },
          { term: "Actualizar presupuesto", text: "Aparece en borradores y rechazados. Reemplaza los precios por los de la lista actual **y cambia la fecha del presupuesto a hoy**. Usalo cuando retomás un presupuesto viejo." },
          { term: "Limpiar presupuesto", text: "Vacía la pantalla para empezar uno nuevo. No borra los presupuestos ya guardados." },
          { term: "Confirmar presupuesto", text: "Lo manda a aprobación (ver abajo)." },
        ],
      },
      { type: "sub", text: "Confirmar: Acopio o Producción" },
      {
        type: "steps",
        items: [
          "Tocá **Confirmar presupuesto**. Para confirmar tienen que estar completos dirección, localidad, forma de pago y link de Google Maps.",
          "Si sos distribuidor, en portones te pregunta por el punto de entrega: **Aceptar** sigue con la confirmación; **Cancelar** frena para que corrijas dirección, localidad o Maps.",
          "En **Elegí el destino del presupuesto** podés escribir una **Observación** (sale en el PDF y la leen Comercial y Técnica).",
          "Elegí **Confirmar en Acopio** (queda reservado, se fabrica más adelante) o **Confirmar en Producción** (va a fabricación; ya no se puede editar desde Mis presupuestos).",
          "Listo: aparece **Presupuesto confirmado** y pasa a Comercial y Técnica.",
        ],
      },
      {
        type: "warn",
        title: "Si no te deja guardar o confirmar",
        text: "Leé el mensaje en rojo: casi siempre falta un dato (teléfono mal escrito, falta el Maps, medidas fuera de rango). Si un ítem queda en **Cargando precio...** o **⚠ Precio no disponible**, esperá o tocá **Actualizar presupuesto**. Si aparece el aviso de que el precio de **Coplanar/Clásico** no tiene la instalación sumada, recargá la página con **Shift+F5**. Si sigue, reportá el error con el botón verde.",
      },
    ],
  },
  {
    id: "mis-presupuestos",
    title: "Mis presupuestos: seguir cada presupuesto",
    roles: SELLERS,
    intro: "Todos tus presupuestos, con su estado, sus PDFs y lo que te toca hacer en cada uno.",
    blocks: [
      {
        type: "list",
        items: [
          "Filtrá por tipo (**Portón**, **Ipanel**, **Plegados**, **Otros**, **Puerta**) y por estado (**Guardados**, **Pendientes**, **Rechazados**, **En Acopio**, **En Producción**, **En Medición**, **Devueltos por medición**).",
          "El buscador encuentra por cliente, localidad, dirección, teléfono o estado.",
          "La columna **NP/NV Odoo** muestra el número en Odoo cuando ya se creó.",
        ],
      },
      { type: "sub", text: "Qué significa cada estado" },
      {
        type: "defs",
        items: [
          { term: "Borrador / Guardado", text: "Todavía no lo confirmaste. Podés seguir editándolo con **Editar**." },
          { term: "Pendiente Comercial y Técnica", text: "Confirmado, esperando las dos aprobaciones. También puede decir **Pendiente Comercial** o **Pendiente Técnica** si ya aprobó uno." },
          { term: "Rechazado (corregir)", text: "Comercial o Técnica lo rechazó. Tocalo para ver el motivo, corregilo con **Editar** y volvé a confirmarlo." },
          { term: "Sincronizando a Odoo / Enviado a Odoo", text: "Aprobado: se está creando o ya se creó la NP/NV en Odoo." },
          { term: "Pendiente por hacer cambios postmedición", text: "Volvió de la medición. Te toca revisarlo y reenviarlo (ver la sección siguiente)." },
          { term: "Reenviado, esperando aprobación comercial", text: "Ya lo reenviaste después de la medición; ahora lo revisa Comercial." },
        ],
      },
      { type: "sub", text: "Acciones de cada fila" },
      {
        type: "defs",
        items: [
          { term: "Ver original / Ver final", text: "PDF del presupuesto original y, cuando existe, del final (después de la medición)." },
          { term: "Proforma / Proforma final", text: "Solo distribuidores." },
          { term: "Ver medición / Ver detalle técnico", text: "Se habilita cuando Técnica aprueba." },
          { term: "Editar", text: "Solo en borradores y rechazados." },
          { term: "Edición acopio / Edición postmedición", text: "Para modificar un presupuesto en acopio o uno que volvió de medición." },
          { term: "Solicitar paso a Producción", text: "En los que están **En Acopio**, cuando el cliente quiere fabricarlo. Mientras lo revisan dice **Solicitud en revisión**." },
        ],
      },
      {
        type: "tip",
        text: "En el filtro **En Producción** aparece la columna **Aceptación del cliente**: ahí ves si el cliente ya firmó y podés copiar el link con **🔗 Ver link**.",
      },
    ],
    goTo: { path: "/presupuestos", label: "Ir a Mis presupuestos" },
  },
  {
    id: "devueltos",
    title: "Cuando te lo rechazan o vuelve de medición",
    roles: SELLERS,
    blocks: [
      { type: "sub", text: "Rechazado por Comercial o Técnica" },
      {
        type: "steps",
        items: [
          "En **Mis presupuestos** filtrá **Rechazados** y tocá el estado **Rechazado (corregir)** para leer el motivo.",
          "Tocá **Editar**, hacé los cambios y guardá.",
          "Volvé a tocar **Confirmar presupuesto**. Las dos aprobaciones empiezan de nuevo.",
        ],
      },
      { type: "sub", text: "Devuelto después de la medición" },
      {
        type: "steps",
        items: [
          "Filtrá **Devueltos por medición**: el estado dice **Pendiente por hacer cambios postmedición**.",
          "Tocá **Edición postmedición**. Arriba vas a ver **Presupuesto devuelto desde medición / datos técnicos** con las medidas reales.",
          "Revisá los cambios (medidas, productos que cambió el medidor). Lo que ya se facturó aparece como **Facturado previamente**.",
          "Si querés descartar tus cambios, tocá **Restablecer al original**.",
          "Cuando esté bien, tocá **Confirmar y enviar a Comercial**. Si la diferencia de superficie está dentro de la tolerancia, no se cobra y se agrega una línea que lo aclara.",
        ],
      },
      { type: "sub", text: "Pasar de Acopio a Producción" },
      {
        type: "steps",
        items: [
          "Si hace falta, modificalo con **Edición acopio** y tocá **Guardar**.",
          "En **Mis presupuestos** → **En Acopio**, tocá **Solicitar paso a Producción**.",
          "Comercial y Técnica lo aprueban (o lo rechazan). Desde ahí sigue como cualquier presupuesto en producción: medición, NV y link al cliente.",
        ],
      },
      {
        type: "tip",
        text: "Desde el detalle de un presupuesto tenés **Consultar a Comercial** y **Consultar a Técnica**: abren la consulta con el número ya cargado.",
      },
    ],
  },
  {
    id: "link-cliente",
    title: "Link de aceptación del cliente",
    roles: ["vendedor", "distribuidor", "enc_comercial", "rev_tecnica"],
    intro: "Es la firma del cliente. Sin ella el producto no entra a producción.",
    blocks: [
      { type: "sub", text: "Cómo le llega al cliente" },
      {
        type: "list",
        items: [
          "Se genera cuando Técnica hace la aprobación final (con la NV ya creada). Se manda por WhatsApp al cliente, al distribuidor y al contacto adicional.",
          "Si hace falta reenviarlo: **Mis presupuestos** → filtro **En Producción** → columna **Aceptación del cliente** → **🔗 Ver link** → **Copiar link**, y mandalo vos.",
          "A las 9, 12 y 17 hs aparece el aviso **Clientes con firma pendiente**, con los que todavía no firmaron, cuántos días llevan y el botón **Copiar link**.",
        ],
      },
      { type: "sub", text: "Qué hace el cliente" },
      {
        type: "steps",
        items: [
          "Abre el link: ve la **Nota de venta**, sus datos, la medición y los datos técnicos del producto a fabricar (sin precios).",
          "Toca **Acepto los datos técnicos del Portón** (o del Ipanel / de la Puerta).",
          "Lee los **Términos y Condiciones de Venta**, marca **Acepto los términos y condiciones** y toca **Aceptar y continuar**.",
          "Escribe su **Nombre completo**, después su **DNI**, y toca **Confirmar aceptación**.",
          "Queda registrado y ve la fecha estimada de finalización de producción.",
        ],
      },
      {
        type: "tip",
        text: "Cuando el cliente firma, en **Mis presupuestos** (y en **Estado de Productos**) aparece su nombre, DNI y la fecha en que aceptó.",
      },
    ],
  },
  {
    id: "mis-distribuidores",
    title: "Mis distribuidores",
    roles: ["vendedor", "enc_comercial"],
    intro: "Para vendedores: los distribuidores que tenés asignados y sus datos de acceso.",
    blocks: [
      {
        type: "list",
        items: [
          "Ves su **Usuario** y **Contrasena** con botón **Copiar**, para pasárselos. Si la contraseña dice **No disponible**, hay que resetearla desde el **Gestor de usuarios**.",
          "Podés cargar su **Teléfono** (se usa para los avisos de medición) y su **Maps por defecto** (el punto de entrega de su empresa); cada uno con su **Guardar**.",
          "**Logo presupuesto**: con **Subir logo** el distribuidor tiene su propio logo en los PDFs (PNG, JPG o WEBP, hasta 2 MB). Sin logo usa el de De Grandis Portones.",
        ],
      },
    ],
    goTo: { path: "/mis-distribuidores", label: "Ir a Mis distribuidores", can: (u) => !!(u?.is_superuser || u?.is_enc_comercial || (u?.is_vendedor && !u?.is_distribuidor)) },
  },
  {
    id: "mis-comisiones",
    title: "Mis comisiones",
    roles: ["vendedor"],
    intro: "Se entra desde la tarjeta **Mis comisiones** del **Menu**.",
    blocks: [
      {
        type: "steps",
        items: [
          "Elegí el **Mes** y la **Quincena** (**1–15** o **16–fin**) y tocá **↻ Actualizar**.",
          "Arriba ves los portones vendidos, los vendidos por tus distribuidores y el **Monto comisionado**.",
          "**Ver detalle / composición** muestra qué comprobantes suman.",
        ],
      },
      {
        type: "warn",
        text: "El monto es una estimación: incluye ventas que todavía no están facturadas. Para que aparezcan tus ventas, tu usuario tiene que tener cargado tu nombre completo.",
      },
      {
        type: "tip",
        text: "Si no estás de acuerdo con el cálculo, usá **Abrir ticket a Comercial** dentro de la misma pantalla, antes de la fecha límite que indica.",
      },
    ],
    goTo: { path: "/mis-comisiones", label: "Ir a Mis comisiones", can: (u) => !!(u?.is_vendedor && !u?.is_distribuidor) },
  },
  {
    id: "aprobacion-comercial",
    title: "Aprobación comercial",
    roles: ["enc_comercial"],
    intro: "Revisar y aprobar (o rechazar) los presupuestos que confirman vendedores y distribuidores.",
    blocks: [
      {
        type: "steps",
        items: [
          "Entrá a **Aprobaciones ▾** → **Aprobacion Comercial** y elegí el circuito (**Aprobación de Portones**, **de Ipanels**, **de Puertas**, **de Plegados**, **de Otros** o **Todos**) con **Abrir**.",
          "Usá el filtro **Pendientes**. Los que esperan tu decisión dicen **Pendiente tu decisión**.",
          "Tocá **Abrir** en la fila: ves cliente, ítems, precios y los datos para aprobar.",
          "Escribí, si hace falta, las **Observaciones del revisor** (se copian en la nota de la NP en Odoo).",
          "Tocá **Aprobar Comercial** o **Rechazar Comercial**. Si rechazás, vuelve al vendedor y las dos aprobaciones empiezan de nuevo.",
        ],
      },
      {
        type: "p",
        text: "En presupuestos de vendedores con **Condición 1**, al aprobar se abre **Datos fiscales de facturación**: cargá el CUIT/CUIL (con 11 dígitos lo busca solo en Odoo), la razón social, el tipo de responsabilidad AFIP y los datos de contacto.",
      },
      { type: "sub", text: "Otras pestañas" },
      {
        type: "defs",
        items: [
          { term: "Mediciones Portones", text: "Presupuestos reenviados después de la medición. En **Revisión comercial de medición** ves total original, total editado y diferencia; tocá **Aprobar** o **Devolver al vendedor**." },
          { term: "Portones: Acopio → Producción", text: "Pedidos de pasar de acopio a producción: **OK** o **Rechazar** (con motivo)." },
          { term: "Portones en Acopio / enviados a Producción / Aprobados (historial)", text: "Para consultar lo que ya pasó." },
        ],
      },
      {
        type: "tip",
        text: "Si no encontrás un presupuesto en la pestaña de su tipo, buscalo en **Todos**. El buscador encuentra por cliente, localidad, dirección, usuario o código.",
      },
    ],
    goTo: { path: "/aprobacion/comercial/menu", label: "Ir a Aprobación Comercial" },
  },
  {
    id: "revision-tecnica",
    title: "Revisión técnica",
    roles: ["rev_tecnica"],
    intro: "Aprobar técnicamente los presupuestos, organizar las mediciones y hacer la aprobación final que genera la NV.",
    blocks: [
      { type: "sub", text: "Primera aprobación" },
      {
        type: "steps",
        items: [
          "Entrá a **Aprobaciones ▾** → **Revision Tecnica** y elegí el circuito con **Abrir**.",
          "Filtrá **Pendientes**, tocá **Abrir** en la fila y revisá los datos técnicos.",
          "Tocá **Aprobar Técnica** o **Rechazar Técnica**. Si rechazás, vuelve al vendedor y las dos aprobaciones empiezan de nuevo.",
        ],
      },
      { type: "sub", text: "Circuito técnico (mediciones y aprobación final)" },
      {
        type: "list",
        items: [
          "En la pestaña **Circuito técnico** asignás la **Fecha visita** de cada medición (elegís el día y **Guardar**). El medidor la ve en su lista.",
          "**Bloqueado** significa que todavía falta la aprobación de Comercial.",
          "**Completar detalle técnico**: para los que no llevan medición.",
          "**Aprobar final**: abre la revisión técnica final. Podés corregir el ancho y alto finales (te pide confirmarlo).",
          "**Aprobar revisión final** crea la **NV** y el link del cliente. Después aparece **Enviar por WhatsApp** con un **Abrir →** por destinatario (cliente, distribuidor, contacto opcional). Cerrás con **Listo, cerrar**.",
          "**Rechazar y enviar al vendedor**: lo devuelve con un motivo (obligatorio).",
        ],
      },
      {
        type: "p",
        text: "Los **Ipanels** y **Plegados** no pasan por medidor: en su pestaña, en **Detalles técnicos ... sin medición**, usá **Completar detalle técnico** y **Aprobar detalle**. Los pedidos de **Acopio → Producción** se aprueban con **OK** o **Rechazar**.",
      },
    ],
    goTo: { path: "/aprobacion/tecnica/menu", label: "Ir a Aprobaciones Técnicas" },
  },
  {
    id: "mediciones",
    title: "Mediciones (medidor)",
    roles: ["medidor"],
    intro: "La lista de portones y puertas a medir y el formulario que se completa en la obra.",
    blocks: [
      { type: "sub", text: "La lista" },
      {
        type: "list",
        items: [
          "Entrá con **Menu** → **Mediciones** → **Abrir mediciones**. Filtros: **Pendientes**, **Enviadas a vendedor**, **Enviadas a técnica**, **Aprobadas**, **Todas**.",
          "La **Fecha visita** la asigna Técnica. El teléfono abre WhatsApp y **📍 Abrir** abre la ubicación en Maps.",
          "Las fotos y videos se cargan desde la lista, en la columna **Archivos** → **📎 Agregar** (hasta 12 archivos). Se pueden agregar en cualquier momento.",
        ],
      },
      { type: "sub", text: "El formulario" },
      {
        type: "steps",
        items: [
          "Tocá **Formulario** en la fila.",
          "Revisá **Datos del cliente** y el resumen técnico del presupuesto. Si en la obra hay otra persona de contacto, cargala en **Contacto adicional**.",
          "En **Esquema de medidas** cargá los anchos y altos medidos, en **milímetros** (en puertas, exactamente 2 anchos y 2 altos). El tamaño final se calcula solo.",
          "Si hace falta, cambiá productos en **Productos que puede cambiar el medidor** y anotá lo importante en **Observaciones del medidor**.",
          "**Guardar** guarda un borrador para seguir después.",
          "Cuando terminaste, tocá **Enviar al vendedor**. Hacelo **desde la obra**: el navegador toma tu ubicación GPS para el link de Maps (aceptá el permiso). Si ya había una ubicación cargada, te pregunta si querés reemplazarla.",
        ],
      },
      {
        type: "warn",
        text: "Una vez enviada, la medición ya no se puede editar. Revisá bien las medidas antes de tocar **Enviar al vendedor**.",
      },
    ],
    goTo: { path: "/mediciones", label: "Ir a Mediciones" },
  },
  {
    id: "estado-productos",
    title: "Estado de Productos",
    roles: ["rev_tecnica", "enc_comercial", "logistica", "administracion"],
    intro: "El tablero para saber en qué etapa está cada portón, Ipanel, puerta o plegado.",
    blocks: [
      {
        type: "list",
        items: [
          "Entrá por **Aprobaciones ▾** → **Estado Productos**.",
          "Filtrá por tipo (**Portones**, **Ipanels**, **Puertas**, **Plegados**) y por estado (**Pendientes**, **Esperando cliente**, **Acopio / Producción**, **Completos**...). El buscador encuentra por cliente, vendedor o número.",
          "La columna **Estado** dice la etapa en palabras, por ejemplo **Medición pendiente**, **Link enviado — esperando aceptación del cliente** o **Completo — cliente aceptó, en producción**.",
          "**Aceptación del cliente**: **🔗 Ver link** para copiarlo, o el nombre, DNI y fecha si ya firmó, con la fecha estimada de fin de producción.",
          "**Link enviado**: quien le manda el link al cliente toca **✗** para marcarlo; queda en **✓**.",
        ],
      },
      { type: "sub", text: "Cancelar una NV" },
      {
        type: "p",
        text: "Técnica, Comercial y Administración pueden tocar **Cancelar** en una NV, escribir el **Motivo de la cancelación** y confirmar con **Cancelar NV definitivamente**. La fila queda en rojo y tachada, y el cliente ya no puede firmar el link.",
      },
      {
        type: "warn",
        text: "La cancelación no tiene vuelta atrás y no modifica nada en Odoo.",
      },
    ],
    goTo: { path: "/aprobacion/tecnica/portones-estado", label: "Ir a Estado Productos" },
  },
  {
    id: "consultas",
    title: "Consultas técnicas y comerciales",
    roles: ["vendedor", "distribuidor", "rev_tecnica", "enc_comercial"],
    blocks: [
      { type: "sub", text: "Si hacés la consulta (vendedor o distribuidor)" },
      {
        type: "steps",
        items: [
          "Tocá **Consulta tecnica** o **Consulta comercial** en la barra de arriba.",
          "En **Nueva consulta** completá el **Asunto**, el número de venta, pedido o presupuesto (opcional) y describí la consulta. Podés adjuntar una imagen, PDF o video.",
          "Tocá **Crear ticket**. La respuesta te llega en la misma pantalla y el botón de arriba muestra un número rojo.",
          "Para contestar, escribí en **Enviar respuesta** y tocá **Enviar mensaje**.",
        ],
      },
      { type: "sub", text: "Si respondés (Técnica o Comercial)" },
      {
        type: "list",
        items: [
          "Tu pantalla es el **Gestor de consultas**, con filtros **Pendientes**, **En proceso**, **Cerradas** y **Todas**.",
          "Respondé con **Responder consulta** → **Enviar mensaje**: la consulta pasa a **En proceso**.",
          "Cuando está resuelta, tocá **Cerrar consulta**, escribí el **Detalle de la resolución final** y **Cerrar con resolución**.",
          "Con **+ Nuevo** podés mandar un aviso a una persona, a **Todos los vendedores**, a **Todos los distribuidores** o a varios elegidos.",
        ],
      },
    ],
  },
  {
    id: "meet",
    title: "Calendario de Meet (servicio técnico)",
    roles: ["rev_tecnica"],
    intro: "Horarios para que los clientes reserven una reunión por Google Meet con el encargado técnico.",
    blocks: [
      {
        type: "steps",
        items: [
          "Entrá por **Menu** → **Calendario de Meet Servicio Técnico**.",
          "En **Configuración** cargá el **Link fijo de Google Meet** y el **Nombre del encargado técnico**, y tocá **Guardar configuración**.",
          "En **Horarios recurrentes** elegí días, **Desde**/**Hasta** y la **Duración por turno**, y tocá **Agregar regla** (genera turnos para los próximos 30 días). También podés sumar un **horario puntual**.",
          "Compartí con los clientes el **Link para compartir con clientes** (**Copiar link**). Ellos eligen un horario y confirman con sus datos.",
          "En **Horarios** ves cada turno **Disponible** o **Reservado** (en **Lista** o **Ver como calendario**), con los datos del cliente.",
        ],
      },
      {
        type: "tip",
        text: "10 minutos antes de cada reunión (y otra vez a los 5) el programa te avisa con un botón **Abrir Google Meet**.",
      },
    ],
    goTo: { path: "/servicio-tecnico/calendario-meet", label: "Ir al Calendario de Meet" },
  },
  {
    id: "administracion",
    title: "Administración",
    roles: ["administracion"],
    blocks: [
      {
        type: "list",
        items: [
          "**Historial de ventas**: todos los presupuestos que llegaron a Odoo. Filtrá por tipo, modo, fechas o buscá por NP, NV, cliente o vendedor.",
          "**Ver detalle** muestra el resumen, las líneas, el historial comercial y administrativo y el historial técnico (medición, NV, semana de producción y aceptación del cliente). Es solo de consulta.",
          "Desde **Estado de Productos** podés cancelar una NV (ver esa sección).",
        ],
      },
    ],
    goTo: { path: "/administracion", label: "Ir a Administración" },
  },
  {
    id: "logistica",
    title: "Logística",
    roles: ["logistica"],
    blocks: [
      {
        type: "p",
        text: "Tu pantalla es **Estado de Productos**: ahí ves en qué etapa está cada producto, si el cliente ya firmó y la fecha estimada de fin de producción. También podés marcar **Link enviado** cuando el link se le mandó al cliente.",
      },
    ],
    goTo: { path: "/aprobacion/tecnica/portones-estado", label: "Ir a Estado Productos" },
  },
  {
    id: "gestion-comercial",
    title: "Gestión comercial: catálogo, planificación, financiamiento y usuarios",
    roles: ["enc_comercial"],
    blocks: [
      {
        type: "defs",
        items: [
          { term: "Dashboard", text: "Arma el catálogo que ven los vendedores: elegís el catálogo (Portones, Ipanel, Plegados, Otros, Puertas), creás secciones y les asignás las etiquetas de Odoo, definís las **Dependencias** (qué secciones se habilitan según lo elegido) y los tipos o sistemas de portón. También está la **Tolerancia comercial** en m² para la diferencia de medición." },
          { term: "Planificacion", text: "Capacidad de producción por semana: por cada semana cargás la **Capacidad** y comentarios, y ves **Comprometidos** y **Disponible**. Tocá **Guardar planificación**. Cada producto toma la primera semana con lugar cuando el cliente firma." },
          { term: "Financiamiento", text: "Recargo o descuento (%) de cada forma de pago. Los valores negativos son descuentos (por ejemplo -5 para efectivo). Tocá **Guardar financiamiento**." },
          { term: "Gestor de usuarios", text: "**Nuevo usuario** para dar de alta; **Editar** para cambiar roles, datos o la contraseña (en **Nueva contraseña**); **Inhabilitar** / **Habilitar** para cortar o devolver el acceso. A un distribuidor hay que asignarle lista de precios y vendedor. **⬇ Descargar distribuidores (Excel)** baja el listado." },
        ],
      },
    ],
    goTo: { path: "/dashboard", label: "Ir al Dashboard" },
  },
  {
    id: "superusuario",
    title: "Herramientas de Superusuario",
    roles: ["superuser"],
    intro: "El menú **Superusuario ▾**. El superusuario tiene todos los roles, así que también ve todo lo anterior.",
    blocks: [
      {
        type: "defs",
        items: [
          { term: "Catalogo Puertas", text: "Secciones, etiquetas, alias y visibilidad del catálogo de puertas." },
          { term: "Reglas Tecnicas", text: "Productos que se agregan solos, parámetros de piernas, superficie y parantes, medidas de paso y hoja, tabla kg/m² y fórmula de superficie final." },
          { term: "Nombres PDF productos", text: "Con qué nombre sale cada producto en el PDF (vacío = el nombre de Odoo)." },
          { term: "Asignacion Produccion", text: "Qué propiedad del presupuestador corresponde a cada propiedad de producción (integrador)." },
          { term: "Admin presupuestos y Odoo", text: "Todos los presupuestos y órdenes de todos los usuarios. Permite eliminar los que todavía no generaron orden en Odoo y resincronizar medidas de paso de un portón." },
          { term: "Visualizador portones", text: "Buscás un NP o NV y ves toda su historia: cliente, vendedor, productos, datos técnicos y línea de tiempo." },
          { term: "Actividad vendedores", text: "Lo que hizo cada vendedor o distribuidor: presupuestos guardados y confirmados, acopios, ajustes, mediciones e historial de acciones." },
        ],
      },
    ],
  },
];
