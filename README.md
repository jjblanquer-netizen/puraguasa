# 🕵️‍♂️ INTRUSO — versión multidispositivo (Firebase)

Cada jugador entra con su propio móvil a una misma partida en tiempo real.
Sin registro, sin instalar nada aparte del navegador. Mismo patrón técnico
que **SplitGuasa**: Firebase Realtime Database + hosting estático + PWA,
sin frameworks ni build tools.

---

## 1. Crear el proyecto de Firebase

1. Ve a [console.firebase.google.com](https://console.firebase.google.com) →
   **Crear un proyecto**. Puedes llamarlo `intruso` (o el nombre que
   prefieras). Puedes desactivar Google Analytics, no hace falta.
2. En el menú lateral, entra en **Compilación → Realtime Database** (⚠️ no
   "Firestore Database", son productos distintos) → **Crear base de
   datos**.
3. Elige la región **europe-west1** (Bélgica) — es la misma que usas en
   SplitGuasa, así que la latencia con España es la misma que ya conoces.
4. Cuando te pregunte por las reglas de seguridad, elige **modo de
   prueba** para empezar (luego las sustituimos por las de este
   proyecto).
5. Ve a **Reglas** (pestaña dentro de Realtime Database) y pega el
   contenido de `firebase-rules.json` (incluido en este ZIP). Publica los
   cambios.

## 2. Registrar la app web y obtener la configuración

1. En la página principal del proyecto, pulsa el icono **</>** ("Añadir
   app" → Web).
2. Dale un nombre (p. ej. "INTRUSO Web") y **no** actives Firebase
   Hosting en este paso (usaremos GitHub Pages, como con SplitGuasa).
3. Copia el objeto `firebaseConfig` que te muestra.
4. Pégalo en `js/firebase-config.js`, sustituyendo los valores de
   ejemplo (`TU_API_KEY`, etc.) por los tuyos reales.

## 3. Subir la app (GitHub Pages, igual que SplitGuasa)

1. Crea un repositorio nuevo en GitHub (puede ser público — no hay nada
   sensible en el código, la `apiKey` de Firebase no es secreta, está
   pensada para ir en el cliente).
2. Sube todos los archivos de este ZIP a la raíz del repositorio (`main`
   branch), igual que hiciste con Splitguasa.
3. En **Settings → Pages**, activa GitHub Pages sobre la rama `main`,
   carpeta raíz.
4. Tu app quedará publicada en
   `https://TU-USUARIO.github.io/TU-REPO/`.

## 4. URL fácil bajo tu propio dominio

Para tener algo tipo `intruso.viajaporlibre.com` en vez de la URL larga
de GitHub Pages:

1. En tu proveedor de DNS de `viajaporlibre.com`, añade un registro
   **CNAME**: `intruso` → `TU-USUARIO.github.io`.
2. En el repositorio de GitHub, en **Settings → Pages → Custom domain**,
   escribe `intruso.viajaporlibre.com` y guarda. GitHub emite el
   certificado HTTPS automáticamente (puede tardar unos minutos).
3. Añade un archivo `CNAME` (sin extensión) en la raíz del repo con el
   contenido `intruso.viajaporlibre.com` — GitHub Pages lo pide para que
   el dominio personalizado sobreviva a futuros despliegues.

A partir de aquí, compartir una partida es tan fácil como mandar
`intruso.viajaporlibre.com/#ABCDE` — el enlace lleva el código de sala
incluido y entra directo.

**No** lo metas en un subdirectorio de tu WordPress: los plugins de
caché/seguridad reescriben rutas y rompen el enrutado de una SPA. Un
subdominio (como arriba) es tan "tuyo" como un subdirectorio, pero no
choca con WordPress.

## 5. Probarlo en local antes de subir

Los módulos ES (`type="module"`) no funcionan abriendo `index.html`
directamente con doble clic (`file://`) por restricciones de CORS del
navegador. Necesitas un servidor local mínimo:

```bash
cd intruso-web
python3 -m http.server 8080
# abre http://localhost:8080 en el navegador
```

O si tienes Node: `npx serve .`

---

## ⚠️ Aviso de seguridad (léelo antes de decidir)

Con las reglas de `firebase-rules.json`, **cualquiera que sepa el código
de una sala puede leer y escribir directamente en su nodo de la base de
datos**, sin pasar por la interfaz de la app — igual que en SplitGuasa.
Para un gestor de gastos eso es un riesgo menor; para un juego de
deducción es más relevante, porque:

- La **palabra secreta** y **quién es el intruso** se guardan en la sala
  para que cada móvil pueda leer su propio rol. Un jugador con
  conocimientos técnicos podría abrir las herramientas de desarrollador
  del navegador y consultar `rooms/CÓDIGO/game/term` o
  `rooms/CÓDIGO/game/roles` para hacer trampa.
- El código de sala (5 caracteres) actúa como única barrera — nadie
  puede *adivinar* una sala al azar, pero cualquiera *dentro* de la
  partida (o con el enlace) puede técnicamente leerlo todo.

Para un grupo de amigos que juega de buena fe, esto es exactamente el
mismo nivel de confianza que ya aceptas en SplitGuasa, y es totalmente
razonable no complicarse más. Si en algún momento te preocupa (por
ejemplo, si alguien del grupo es muy curioso con el móvil), la solución
real requiere una **Cloud Function** que reparta los roles desde el
servidor y nunca envíe al cliente el rol de los demás — eso ya implica
Firebase de pago (plan Blaze) y bastante más código. No lo he montado
porque cambia bastante la arquitectura; dímelo si quieres que lo
prepare en otra entrega.

## Qué cambia respecto a la versión de un solo móvil

- Cada jugador ve su propio rol en su propio dispositivo — **ya no hace
  falta pasarse el móvil** para la revelación de roles.
- La ronda de pistas y el debate se ven sincronizados en todos los
  móviles a la vez (mismo temporizador, mismo turno resaltado).
- La votación es **en paralelo**: todos votan a la vez desde su propio
  móvil, en vez de ir pasándose el teléfono.
- El **anfitrión** (quien crea la sala) controla el ritmo: avanza de
  pistas a debate, de debate a votación, y decide cuándo continuar tras
  cada resultado. El resto de jugadores ven todo en tiempo real pero sin
  esos botones de control.
- Si el anfitrión cierra la sala (o sale), la partida termina para
  todos — no hay estado que sobreviva sin un anfitrión conectado.

## Qué falta / simplificaciones de esta primera versión

- No hay animación de cuenta atrás dramática en el resultado de la
  votación (se muestra el resultado directamente); es puramente
  cosmético, fácil de añadir después.
- No se han portado las Categorías personalizadas ni la pantalla de
  Estadísticas históricas de la versión React Native — esta entrega se
  centró en que el multijugador en tiempo real funcione bien.
- Si el anfitrión pierde la conexión a mitad de partida, la partida
  queda parada (nadie más puede avanzar fases) hasta que vuelva. No hay
  todavía traspaso automático de anfitrión.
- Reglas de seguridad abiertas — ver aviso arriba.
