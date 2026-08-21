# Aure Barbershop — Documentación técnica del sistema

Sistema de contabilidad diaria para barbería/peluquería. Aplicación web local, de un solo archivo, sin necesidad de hosting, dominio ni conexión a internet.

---

## 1. Tecnología

| Capa | Tecnología | Motivo |
|---|---|---|
| Estructura | HTML5 | Un solo archivo `index.html` autocontenido |
| Estilos | CSS3 (custom properties / variables) | Tema claro/oscuro sin recompilar nada |
| Lógica | JavaScript vanilla (ES6+), sin frameworks | Cero dependencias, cero build, abre directo en el navegador |
| Persistencia | `localStorage` (API nativa del navegador) | No requiere servidor ni base de datos |
| Gráfica de ingresos/gastos | `<canvas>` dibujado a mano | Evita cargar librerías externas (Chart.js, etc.) que necesitarían internet |
| Exportación de datos | `Blob` + `URL.createObjectURL` | Genera archivos descargables (JSON, CSV) sin backend |
| Reporte imprimible / PDF | `window.print()` sobre una ventana generada dinámicamente | Usa el motor de impresión nativo del navegador en vez de una librería de PDF |
| Seguridad de acceso | Hash simple propio (no criptográfico) | Suficiente como disuasivo local; explicado en la sección 7 |

**No usa:** Node, React, build tools, CDN, ni ninguna librería externa. Todo el CSS y JS vive dentro del mismo `.html`.

### Por qué esta arquitectura
El requisito del cliente era "que funcione desde el teléfono sin pagar hosting". Un solo archivo HTML que se abre con `file://` o se guarda como "Agregar a pantalla de inicio" cumple eso exactamente: cero costo, cero dependencia de servidor, funciona sin señal.

---

## 2. Estructura de datos (localStorage)

Cada tabla vive bajo su propia clave en `localStorage`, como JSON:

| Clave | Contenido | Forma del objeto |
|---|---|---|
| `aure_services` | Catálogo de servicios | `{id, name, price, recipe:[{insumoId, qty}]}` |
| `aure_insumos` | Inventario de insumos | `{id, name, unit, stock, minStock, unitCost}` |
| `aure_income` | Ventas registradas | `{id, serviceId, serviceName, price, cost, payment, date, note}` |
| `aure_expenses` | Gastos registrados | `{id, description, amount, category, payment, date, insumoId?, insumoQty?}` |
| `aure_categories` | Categorías de gasto | `["Insumos","Renta",...]` (array de strings) |
| `aure_cierres` | Cierres de caja diarios | `{id, dateKey, date, incCash, incCard, expCash, expCard, expectedCash, totalIncome, totalExpense, cashCounted, difference}` |
| `aure_settings` | Configuración general | `{reminderOn, reminderDays, lastBackup, theme, pinEnabled, pinHash}` |
| `aure_logo` | Logo del negocio | Imagen en base64 (dataURL), comprimida a 240×240px |

**Dato clave:** `income.cost` guarda una "foto" del costo de insumos en el momento exacto de la venta (no el costo actual). Esto es intencional: si más adelante cambia el precio de un insumo, las ventas pasadas no se recalculan — el margen histórico queda fijo, como en cualquier sistema contable real.

---

## 3. Módulos y funciones

### 3.1 Dashboard (Inicio)
- Totales por rango: **Hoy / Semana / Mes** (ingresos, gastos, margen bruto, ganancia neta).
- **Margen bruto** = suma de (precio de venta − costo de insumos) de cada venta del período.
- Gráfica de barras de los últimos 7 días (ingresos vs. gastos), dibujada en `<canvas>`, sin librerías.
- Servicio más vendido del mes.
- Alerta de insumos con stock bajo (clic lleva directo a Catálogo → Insumos).
- Botón **"Cerrar caja de hoy"**.
- Lista de movimientos recientes.

### 3.2 Registrar Ingreso
- Selección visual del servicio (grid de tarjetas con precio).
- Precio editable (por si cobra distinto al de catálogo).
- Método de pago: Efectivo / Tarjeta.
- Fecha y hora (editable, por si se registra a destiempo).
- Nota opcional.
- **Al guardar:** descuenta automáticamente el stock de los insumos vinculados a la receta del servicio, y guarda el costo (`cost`) como snapshot para el cálculo de margen.

### 3.3 Registrar Gasto
- Descripción, monto, categoría, método de pago, fecha/hora.
- Campo opcional: **"¿Es compra de un insumo?"** — si se vincula, pide cantidad comprada y al guardar **incrementa automáticamente el stock** de ese insumo.

### 3.4 Historial
- Filtros: Todo / Ingresos / Gastos / Cierres.
- Filtro adicional por fecha.
- Cada movimiento se puede eliminar (con confirmación).
- La pestaña "Cierres" muestra el historial de cierres de caja con su diferencia (contado vs. esperado).

### 3.5 Catálogo (CRUD completo en las tres secciones)
**Servicios**
- Crear, editar, eliminar.
- Cada servicio puede tener una **receta** de insumos que consume (ej. "Corte + barba" usa 20ml de shampoo + 1 cuchilla).
- Muestra costo y margen calculado (venta − costo de receta).
- Validación anti-duplicados (nombre repetido).

**Insumos**
- Crear, editar, eliminar.
- Campos: nombre, unidad de medida, stock actual, stock mínimo (umbral de alerta), costo por unidad.
- Botones rápidos **+ / −** para ajustar stock manualmente (mermas, conteos físicos).
- Badge visual cuando el stock está en o por debajo del mínimo.

**Categorías de gasto**
- Crear, editar (renombrar), eliminar.
- Al renombrar, actualiza automáticamente el nombre en los gastos históricos que la usaban (evita categorías "huérfanas").
- No permite eliminar la última categoría restante (el formulario de gastos siempre necesita al menos una).

### 3.6 Ajustes
- **Apariencia:** alternar tema claro/oscuro (también accesible desde el ícono 🌙/☀️ en la barra superior).
- **Identidad del negocio:** subir/quitar logo (se recorta a cuadro y se comprime a 240×240px antes de guardar, para no saturar el almacenamiento).
- **Seguridad:** activar/desactivar PIN de 4 dígitos, cambiar PIN.
- **Respaldo de datos:** exportar/importar JSON completo; muestra fecha del último respaldo.
- **Recordatorio automático:** aviso dentro de la app si pasaron X días (configurable) sin respaldar.
- **Reportes:** exportar CSV (Excel/Sheets) y generar reporte mensual imprimible / "Guardar como PDF".
- **Zona de riesgo:** borrar solo ingresos y gastos (el catálogo no se toca).

---

## 4. Sincronización en tiempo real

Toda acción que modifica datos (vender, gastar, ajustar stock, editar catálogo, etc.) dispara una función central `syncAll()` que refresca automáticamente:
- Las estadísticas del Dashboard.
- El historial (si está visible).
- Las tres listas del Catálogo.
- Los selectores dependientes (categoría en el formulario de gasto, vínculo de insumo, etc.)

Esto garantiza que, sin importar desde qué pantalla se hizo un cambio, toda la app quede consistente al instante — no hay que "recargar" ni navegar para ver datos actualizados.

---

## 5. Diseño visual

### Paleta de color — Azul petróleo + cobre
Con soporte de tema claro y oscuro mediante `html[data-theme]`.

| Variable | Oscuro | Claro | Uso |
|---|---|---|---|
| `--bg` | `#0e1c22` | `#eef3f2` | Fondo general |
| `--surface` | `#15272e` | `#ffffff` | Tarjetas |
| `--gold` (acento cobre) | `#c17a4f` | `#a8623a` | Botones primarios, acentos |
| `--red` | `#a34438` | `#a13f2f` | Gastos, alertas |
| `--green` | `#4f8f7c` | `#3d7a67` | Ingresos, positivo |
| `--cream` (texto) | `#eef3f2` | `#12262c` | Texto principal |

### Tipografía
- **Display:** Playfair Display (serif elegante) — nombre de marca y encabezados.
- **Cuerpo:** system-ui / sans-serif nativo — formularios y texto general.
- **Monoespaciada tabular:** para todas las cifras monetarias (efecto "libro de cuentas").

### Elemento de identidad ("firma visual")
Tarjetas estilo **recibo/ticket**, con borde superior perforado (efecto de papel arrancado de una libreta), reforzando el concepto de "libro de contabilidad de barbería".

### Responsivo
- **Móvil** (por defecto): navegación inferior, tarjetas apiladas.
- **Tablet** (≥640px): contenedor más ancho, catálogo en 3 columnas, modales como diálogo centrado.
- **Escritorio** (≥1024px): navegación lateral fija, contenido centrado con ancho de lectura cómodo, catálogo en 4 columnas.

---

## 6. Seguridad y privacidad

- **PIN de acceso:** pantalla de bloqueo con teclado numérico antes de mostrar cualquier dato. El PIN se guarda como un hash simple (no texto plano), pero **no es seguridad criptográfica de nivel bancario** — es un disuasivo contra acceso casual (ej. un empleado o cliente tomando el teléfono), no protección contra un atacante técnico.
- **Sin recuperación de PIN:** al no haber servidor, si se olvida el PIN la única salida es borrar los datos del navegador — lo que también borra la información del negocio. Se advierte esto explícitamente dentro de la misma app.
- **Todos los datos son locales:** nada se envía a internet. La contrapartida es que el respaldo manual (exportar JSON) es responsabilidad del usuario — no hay backup en la nube automático.

---

## 7. Limitaciones conocidas (a tener en cuenta)

1. **`localStorage` tiene límite de tamaño** (~5–10MB según navegador). Para el volumen de una barbería (registros diarios de texto) esto alcanza para años de uso, pero fotos o logos muy grandes podrían acercarse al límite — por eso el logo se comprime automáticamente.
2. **Los datos están ligados al navegador y al archivo específico.** Si el dueño cambia de teléfono o de navegador, debe restaurar desde un respaldo JSON exportado previamente.
3. **El PIN no es a prueba de expertos técnicos** — es un candado de uso diario, no una bóveda.
4. **El recordatorio de respaldo solo avisa con la app abierta** — no hay notificaciones push en segundo plano, porque eso requeriría un service worker con HTTPS (no disponible al abrir el archivo directo desde el teléfono).
5. **Exportación "PDF"** en realidad abre el diálogo de impresión del navegador para que el usuario elija "Guardar como PDF" — no genera un archivo PDF por sí sola, pero el resultado es el mismo sin depender de ninguna librería.

---

## 8. Historial de versiones del respaldo (JSON)

El archivo de respaldo incluye un campo `version` para rastrear qué campos contiene:
- **v1:** servicios, ingresos, gastos, categorías.
- **v2:** + insumos.
- **v3 (actual):** + cierres de caja.

La función de importar es retrocompatible: si faltan campos (respaldo viejo), usa valores por defecto en vez de fallar.

---

## 9. Resumen ejecutivo para el cliente

Aure Barbershop es una aplicación de contabilidad que vive enteramente en su teléfono, sin pagar hosting ni depender de internet para funcionar día a día. Permite registrar ventas y gastos, controlar el inventario de insumos con descuento automático al vender, conocer la rentabilidad real de cada servicio, cerrar caja diariamente, proteger el acceso con PIN, y sacar reportes para uso propio o para su contador — todo desde un solo archivo que se abre como cualquier otra app.
