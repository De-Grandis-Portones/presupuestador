# API de Partner — De Grandis Portones (Presupuestador)

Manual para el equipo de desarrollo de un distribuidor que quiere presupuestar
usando el catálogo, los precios y las reglas de configuración de De Grandis
desde su propia aplicación.

## Qué hace esta API y qué no

- Te da el catálogo de productos, la estructura de secciones y las reglas de
  qué depende de qué, para que puedas armar tu propia pantalla de selección
  (igual a la que usa un distribuidor logueado en nuestro cotizador).
- Te da el precio ya calculado (precio de lista de **tu** distribuidor en
  Odoo, con tu margen/ajuste y el IVA que corresponda) — nunca necesitás
  conocer nuestras reglas internas de precio.
- Cuando el usuario final de tu app confirma un presupuesto, se lo mandás a
  esta API y queda creado de nuestro lado. **A partir de ahí, toda la
  gestión (revisión técnica/comercial, medición si corresponde, y el link de
  confirmación que firma el cliente final) la maneja el equipo de De
  Grandis desde su propio sistema.** Tu aplicación no necesita (ni puede)
  hacer nada más después de crear el presupuesto.

## Base URL

```
https://presupuestador-kdbl.onrender.com/api/partner/v1
```

## Autenticación

Cada distribuidor tiene su propia **API key**, que te va a entregar el
equipo de De Grandis (se genera una sola vez del lado de ellos y se muestra
una única vez — guardala como un secreto, no se puede volver a ver).

Mandala en cada request en uno de estos dos headers (cualquiera de los dos
funciona):

```
Authorization: Bearer pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```
o
```
x-api-key: pk_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

Si la key falta o es inválida, la respuesta es `401`:
```json
{ "ok": false, "error": "API key inválida" }
```

## Límites (rate limit)

- 60 requests por minuto por API key.
- 120 requests por minuto por IP de origen.

Si te pasás, la respuesta es `429`:
```json
{ "ok": false, "error": "Demasiadas solicitudes. Esperá un minuto e intentá de nuevo." }
```

## Formato de errores

Todas las respuestas de error tienen esta forma, con el código HTTP que
corresponda (`400` por defecto, `401` sin auth, `404` si no se encuentra
algo, `429` por rate limit):
```json
{ "ok": false, "error": "mensaje descriptivo" }
```

---

## 1. `GET /catalog?kind=porton`

Devuelve el catálogo de productos disponibles.

**Query params:**
- `kind` (opcional, default `porton`): uno de `porton`, `ipanel`, `plegados`,
  `puerta`, `otros`.

**Respuesta:**
```json
{
  "ok": true,
  "kind": "porton",
  "sections": [
    { "id": 12, "name": "Sistema de apertura" },
    { "id": 15, "name": "Motor y automatización" }
  ],
  "products": [
    {
      "id": 3234,
      "name": "Portón Acero Simil Aluminio Clásico",
      "sections": ["Sistema de apertura"],
      "section_ids": [12]
    }
  ]
}
```

- `sections`: todas las secciones configuradas para ese `kind`, con su `id`
  numérico — este `id` es el que después vas a cruzar contra
  `GET /rules` (sección 2).
- `products[].section_ids`: a qué sección(es) pertenece cada producto, por
  `id` (usar esto para cruzar contra las reglas, no `sections`, que son
  nombres pensados solo para mostrar en pantalla).
- Los productos que ese distribuidor no debe ver (`disable_for_distribuidor`)
  ya vienen filtrados — no hace falta que los descartes vos.

## 2. `GET /rules?kind=porton`

Devuelve las reglas de "qué depende de qué" para armar el flujo de selección
guiado (mismo criterio que usa nuestro propio cotizador).

**Respuesta:**
```json
{
  "ok": true,
  "kind": "porton",
  "initial_section_id": 12,
  "section_dependency_rules": [
    {
      "id": "section_dep_1",
      "name": "Dependencia 1",
      "active": true,
      "parent_section_id": 12,
      "required_product_ids": [3234, 3235],
      "match_mode": "any",
      "child_section_ids": [15, 18],
      "sort_order": 1
    }
  ],
  "system_derivation_rules": [
    {
      "id": "system_der_1",
      "name": "Sistema derivado 1",
      "active": true,
      "required_product_ids": [3234],
      "match_mode": "all",
      "derived_porton_type": "acero_simil_aluminio_clasico",
      "sort_order": 1
    }
  ]
}
```

**Cómo usarlas:**

- **`initial_section_id`**: la primera sección que tenés que mostrarle al
  usuario (las demás arrancan ocultas).
- **`section_dependency_rules`**: por cada regla activa (`active: true`), si
  el usuario ya eligió en la sección `parent_section_id` los productos de
  `required_product_ids` (con `match_mode: "all"` = tiene que haber elegido
  TODOS esos ids; `"any"` = alcanza con QUE HAYA ELEGIDO alguno), entonces
  se habilitan las secciones listadas en `child_section_ids`. Si
  `required_product_ids` viene vacío, la regla se activa con cualquier
  selección dentro de la sección padre.
- **`system_derivation_rules`**: mismo mecanismo de matching
  (`required_product_ids` + `match_mode`, pero acá default `"all"`), y si
  matchea, `derived_porton_type` es el valor que tenés que mandar como
  `porton_type` al crear el presupuesto (paso 4). Si ninguna regla matchea,
  mandá `porton_type` vacío o no lo mandes — el equipo de De Grandis lo
  completa al revisar.

Estas reglas son puramente estructurales (no dependen de precio/margen/forma
de pago), y se administran desde el dashboard interno de De Grandis, así que
pueden cambiar con el tiempo — no las hardcodees en tu app, pedilas siempre
en caliente (podés cachearlas vos mismo un par de minutos si te preocupa la
latencia).

## 3. `POST /price` — cotizar (preview, no guarda nada)

Usalo para mostrarle el precio al usuario mientras arma el presupuesto,
tantas veces como haga falta.

**Body:**
```json
{
  "items": [
    { "product_id": 3234, "qty": 1 },
    { "product_id": 2842, "qty": 1 }
  ],
  "margin_percent": 10,
  "adjustment_percent": 0,
  "condition_mode": "cond1",
  "nv": null
}
```

- `items` (obligatorio): hasta 50 ítems, cada uno con `product_id` (de
  `/catalog`) y `qty` (> 0). **La cantidad la tenés que resolver vos**: esta
  API no calcula automáticamente cantidades por superficie ni agrega
  accesorios derivados (ver "Lo que esta API NO hace" más abajo).
- `margin_percent` / `adjustment_percent` (opcional, default `0`): iguales a
  lo que hoy tipea a mano un distribuidor en nuestro cotizador — margen sobre
  el precio de lista, y ajuste adicional (p.ej. por forma de pago).
- `condition_mode` (opcional, default `"cond1"`): `"cond1"` (IVA 21%) o
  `"cond2"` (IVA 10.5%).
- `nv` (opcional): si ya tenés el número de NV de un presupuesto anterior
  (ver más abajo), te devuelve también si lo encontramos, su estado de
  medición y sus fechas de medición/instalación.

**Respuesta:**
```json
{
  "ok": true,
  "distributor": { "id": 7, "name": "Nombre del Distribuidor" },
  "condition_mode": "cond1",
  "margin_percent": 10,
  "adjustment_percent": 0,
  "lines": [
    { "product_id": 3234, "qty": 1, "base_price": 150000, "unit_price": 165000, "line_total": 165000 },
    { "product_id": 2842, "qty": 1, "base_price": 8000, "unit_price": 8800, "line_total": 8800 }
  ],
  "subtotal": 173800,
  "iva_rate": 0.21,
  "iva": 36498,
  "total": 210298,
  "nv": null,
  "nv_encontrado": null,
  "fecha_llegada_instalacion": null,
  "fecha_medicion": null,
  "estado_medicion": null
}
```

Si mandaste `nv`, revisá **`nv_encontrado`** antes que las fechas:
- `nv_encontrado: false` → ese NV no existe en nuestro sistema.
- `nv_encontrado: true` → existe. `estado_medicion` te dice en qué está
  (`"pendiente"`, `"programada"` o `"realizada"`), y `fecha_medicion` viene
  `null` mientras esté `"pendiente"` — **eso no significa que no exista**,
  solo que todavía no se le asignó fecha. `estado_medicion` viene `null` si
  ese producto no requiere medición (no aplica).
- Si no mandaste `nv` (o mandaste `0`/vacío), todos estos campos vienen
  `null` porque no se buscó nada.

## 4. `POST /quotes` — crear el presupuesto (esto SÍ queda guardado)

Llamalo una sola vez, cuando el usuario de tu app ya confirmó el
presupuesto y quiere que De Grandis lo gestione.

**Body:**
```json
{
  "end_customer": {
    "name": "Juan Pérez",
    "phone": "3511234567",
    "email": "juan@ejemplo.com",
    "address": "Calle Falsa 123, Córdoba",
    "maps_url": "https://maps.google.com/?q=..."
  },
  "items": [
    { "product_id": 3234, "qty": 1 },
    { "product_id": 2842, "qty": 1 }
  ],
  "margin_percent": 10,
  "adjustment_percent": 0,
  "condition_mode": "cond1",
  "catalog_kind": "porton",
  "fulfillment_mode": "acopio",
  "porton_type": "acero_simil_aluminio_clasico",
  "dimensions": { "width": 3, "height": 2.2 },
  "note": "Comentario opcional para el equipo de De Grandis"
}
```

- **`end_customer.name` es el único campo obligatorio** de `end_customer`
  (los demás — `phone`, `email`, `address`, `maps_url` — son opcionales acá,
  pero cuantos más mandes, menos tiene que pedirle el equipo de De Grandis
  al cliente final después). Recomendado: mandá al menos `name` y `phone`.
- `items`: igual que en `/price`.
- `margin_percent`, `adjustment_percent`, `condition_mode`: igual que en
  `/price` — se usan para calcular el precio final que queda guardado en el
  presupuesto.
- `catalog_kind` (opcional, default `"porton"`): `"porton"`, `"ipanel"`,
  `"plegados"`, `"puerta"` u `"otros"`.
- `fulfillment_mode` (opcional, default `"acopio"`): `"acopio"` o
  `"produccion"`.
- `porton_type` (opcional): el valor derivado de `system_derivation_rules`
  (paso 2), si corresponde.
- `dimensions` (opcional): `{ width, height }` en metros, si tu producto
  necesita medidas.
- `note` (opcional): texto libre, se agrega a la nota interna del
  presupuesto (que ya incluye automáticamente "Creado vía API partner").

**Respuesta:**
```json
{
  "ok": true,
  "quote_id": "3f2504e0-4f89-11d3-9a0c-0305e82c3301",
  "status": "draft",
  "subtotal": 173800,
  "iva_rate": 0.21,
  "iva": 36498,
  "total": 210298
}
```

- `quote_id`: guardalo de tu lado si querés poder mostrarle al usuario de tu
  app "tu presupuesto quedó cargado" o para tus propios registros. **No hay
  un endpoint para consultar/actualizar este presupuesto después de
  creado** — a partir de acá el seguimiento lo hace el equipo de De Grandis
  desde su propio sistema (te van a poder avisar por fuera, ej. por
  teléfono/mail, cuando tengan novedades).
- `status` siempre va a ser `"draft"` al crearlo.

---

## Flujo recomendado para tu integración

1. Al iniciar la app (o cada tanto), pedí `GET /catalog?kind=porton` y
   `GET /rules?kind=porton` juntos.
2. Armá tu pantalla de selección: mostrá primero la sección
   `initial_section_id`; a medida que el usuario elige productos, recorré
   `section_dependency_rules` para habilitar las secciones que correspondan.
3. Con los productos ya elegidos, mirá `system_derivation_rules` para saber
   qué `porton_type` corresponde (si aplica a tu catálogo).
4. Mientras el usuario arma el presupuesto, llamá `POST /price` las veces
   que necesites para mostrarle el precio en vivo.
5. Cuando confirma, pedile los datos del cliente final (al menos nombre y
   celular) y llamá `POST /quotes` una sola vez con la selección final.
6. Mostrale al usuario que el presupuesto quedó enviado — de acá en más lo
   sigue el equipo de De Grandis.

## Lo que esta API NO hace (para no llevarte sorpresas)

- **No calcula automáticamente cantidades por superficie** (por ejemplo,
  m² a partir de ancho×alto) ni agrega accesorios derivados de una medida
  (como "parantes" con precio automático). Si tu catálogo incluye productos
  de ese tipo, hoy tenés que resolver la cantidad vos mismo antes de
  mandarla en `items[].qty`.
- **No deriva `porton_type` en el servidor** — vos lo calculás con
  `system_derivation_rules` y lo mandás en `POST /quotes`; si no lo mandás,
  queda vacío y el equipo de De Grandis lo completa al revisar.
- **No permite editar ni cancelar un presupuesto ya creado**, ni consultar
  su estado — es "creá una vez, seguimiento del lado de De Grandis".

Si alguno de estos puntos te hace falta para tu integración, avisale al
equipo de De Grandis — son extensiones puntuales que se pueden evaluar
aparte.
