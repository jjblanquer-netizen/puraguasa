// ============================================================
// INTRUSO — Catálogo de datos (categorías, avatares, términos)
// ============================================================

export const CATEGORIES = [
    { id: 'animales', name: 'Animales', icon: '🦁', isCustom: false, enabled: true },
    { id: 'cine_tv', name: 'Cine y televisión', icon: '🎬', isCustom: false, enabled: true },
    { id: 'personajes', name: 'Personajes famosos', icon: '⭐', isCustom: false, enabled: true },
    { id: 'deportes', name: 'Deportes', icon: '⚽', isCustom: false, enabled: true },
    { id: 'musica', name: 'Música', icon: '🎵', isCustom: false, enabled: true },
    { id: 'comida', name: 'Comida', icon: '🍕', isCustom: false, enabled: true },
    { id: 'viajes', name: 'Viajes y lugares', icon: '✈️', isCustom: false, enabled: true },
    { id: 'objetos', name: 'Objetos', icon: '🧰', isCustom: false, enabled: true },
    { id: 'profesiones', name: 'Profesiones', icon: '👷', isCustom: false, enabled: true },
    { id: 'historia', name: 'Historia', icon: '🏛️', isCustom: false, enabled: true },
    { id: 'tecnologia', name: 'Tecnología', icon: '💻', isCustom: false, enabled: true },
    { id: 'naturaleza', name: 'Naturaleza', icon: '🌿', isCustom: false, enabled: true },
    { id: 'infantil', name: 'Infantil', icon: '🧸', isCustom: false, enabled: true },
    { id: 'cultura_espanola', name: 'Cultura española', icon: '🇪🇸', isCustom: false, enabled: true },
    { id: 'dificil', name: 'Nivel difícil', icon: '🧠', isCustom: false, enabled: true },
];

export const AVATAR_COLORS = [
    { id: 'violeta', hex: '#8B5CF6' },
    { id: 'azul', hex: '#3B82F6' },
    { id: 'turquesa', hex: '#14B8A6' },
    { id: 'magenta', hex: '#EC4899' },
    { id: 'naranja', hex: '#F97316' },
    { id: 'verde', hex: '#22C55E' },
    { id: 'amarillo', hex: '#EAB308' },
    { id: 'rojo', hex: '#EF4444' },
];
export const AVATARS = [
    // Animales
    { id: 'zorro', file: 'zorro.jpg', family: 'animales', colorId: 'naranja' },
    { id: 'capibara', file: 'capibara.jpg', family: 'animales', colorId: 'amarillo' },
    { id: 'mapache', file: 'mapache.jpg', family: 'animales', colorId: 'azul' },
    { id: 'gato', file: 'gato.jpg', family: 'animales', colorId: 'violeta' },
    { id: 'buho', file: 'buho.jpg', family: 'animales', colorId: 'turquesa' },
    // Personas
    { id: 'mujer-rizos', file: 'mujer-rizos.jpg', family: 'personas', colorId: 'magenta' },
    { id: 'hombre-bigote', file: 'hombre-bigote.jpg', family: 'personas', colorId: 'verde' },
    { id: 'mujer-violeta', file: 'mujer-violeta.jpg', family: 'personas', colorId: 'violeta' },
    { id: 'mujer-mayor', file: 'mujer-mayor.jpg', family: 'personas', colorId: 'rojo' },
    { id: 'hombre-moreno', file: 'hombre-moreno.jpg', family: 'personas', colorId: 'azul' },
    // Superhéroes
    { id: 'heroina-electrica', file: 'heroina-electrica.jpg', family: 'superheroes', colorId: 'azul' },
    { id: 'heroe-naturaleza', file: 'heroe-naturaleza.jpg', family: 'superheroes', colorId: 'verde' },
    { id: 'heroe-cosmico', file: 'heroe-cosmico.jpg', family: 'superheroes', colorId: 'violeta' },
    { id: 'heroina-tecnologica', file: 'heroina-tecnologica.jpg', family: 'superheroes', colorId: 'turquesa' },
    { id: 'heroe-solar', file: 'heroe-solar.jpg', family: 'superheroes', colorId: 'amarillo' },
    // Aleatorios
    { id: 'alien', file: 'alien.jpg', family: 'aleatorios', colorId: 'verde' },
    { id: 'robot', file: 'robot.jpg', family: 'aleatorios', colorId: 'azul' },
    { id: 'nube', file: 'nube.jpg', family: 'aleatorios', colorId: 'turquesa' },
    { id: 'aguacate', file: 'aguacate.jpg', family: 'aleatorios', colorId: 'verde' },
    { id: 'maga', file: 'maga.jpg', family: 'aleatorios', colorId: 'magenta' },
];
export function getAvatar(id) {
    return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
export function getColorHex(colorId) {
    return AVATAR_COLORS.find((c) => c.id === colorId)?.hex ?? '#8B5CF6';
}

function build(category, difficulty, childFriendly, adultOnly, entries, idSuffix = '') {
    return entries.map(([word, hint], i) => ({
        id: `${category}_${difficulty}${idSuffix}_${i}`,
        word,
        category,
        difficulty,
        hintForIntruso: hint,
        contentType: 'texto',
        tags: [],
        childFriendly,
        adultOnly,
        language: 'es',
    }));
}
// ---------------------------- Animales ----------------------------
const animalesFacil = [
    ['Perro', 'Es un animal que vive en muchas casas'],
    ['Gato', 'Es un animal que maúlla'],
    ['León', 'Es el rey de la selva'],
    ['Elefante', 'Es un animal enorme con trompa'],
    ['Delfín', 'Vive en el mar y es muy inteligente'],
    ['Tortuga', 'Es un animal muy lento con caparazón'],
    ['Conejo', 'Tiene orejas muy largas'],
    ['Vaca', 'Da leche'],
    ['Caballo', 'Se puede montar'],
    ['Pingüino', 'Vive en el frío y no vuela'],
];
const animalesFacil2 = [
    ['Oveja', 'Da lana'],
    ['Cerdo', 'Vive en granjas y se revuelca en el barro'],
    ['Pato', 'Hace "cuac" y nada en el agua'],
    ['Loro', 'Ave que puede imitar palabras'],
    ['Ardilla', 'Sube a los árboles y guarda frutos secos'],
];
const animalesMedia = [
    ['Jirafa', 'Tiene el cuello muy largo'],
    ['Cocodrilo', 'Vive en ríos y tiene muchos dientes'],
    ['Canguro', 'Lleva a sus crías en una bolsa'],
    ['Murciélago', 'Es un mamífero que vuela de noche'],
    ['Águila', 'Es un ave que ve muy bien desde lejos'],
    ['Pulpo', 'Tiene ocho patas y vive en el mar'],
    ['Camaleón', 'Cambia de color'],
    ['Oso panda', 'Come bambú'],
    ['Búho', 'Es un ave nocturna'],
    ['Zorro', 'Es astuto y tiene el pelo naranja'],
];
const animalesDificil = [
    ['Ornitorrinco', 'Es un mamífero muy raro que pone huevos'],
    ['Axolote', 'Es un anfibio que puede regenerar sus extremidades'],
    ['Pangolín', 'Está cubierto de escamas'],
    ['Narval', 'Tiene un largo colmillo en espiral'],
    ['Okapi', 'Parece una mezcla de cebra y jirafa'],
    ['Cachalote', 'Es el cetáceo con dientes más grande del mundo'],
    ['Lémur', 'Primate de ojos grandes originario de Madagascar'],
    ['Suricata', 'Vive en grupos y vigila de pie sobre sus patas'],
    ['Quetzal', 'Ave de plumas muy vistosas de Centroamérica'],
    ['Tardígrado', 'Microorganismo casi indestructible'],
];
// ---------------------------- Cine y televisión ----------------------------
const cineFacil = [
    ['Palomitas', 'Se comen mucho en el cine'],
    ['Pantalla', 'Ahí se proyecta la película'],
    ['Actor', 'Interpreta un papel'],
    ['Director', 'Dirige la película'],
    ['Serie', 'Tiene varios episodios'],
];
const cineMedia = [
    ['Guion', 'Es el texto que siguen los actores'],
    ['Estreno', 'Es el primer día que se puede ver'],
    ['Subtítulos', 'Ayudan a entender otro idioma'],
    ['Doblaje', 'Cambia la voz original'],
    ['Premiere', 'Presentación especial antes del estreno'],
    ['Banda sonora', 'Es la música de la película'],
    ['Taquilla', 'Allí se compran las entradas'],
    ['Efectos especiales', 'Crean escenas imposibles'],
    ['Cortometraje', 'Es una película muy corta'],
    ['Comedia romántica', 'Combina risas y amor'],
];
const cineDificil = [
    ['Storyboard', 'Guion visual dibujado antes de rodar'],
    ['Escena post-créditos', 'Aparece cuando ya casi todos se han ido'],
    ['Plano secuencia', 'Se rueda sin cortes'],
    ['Montaje', 'Une las escenas grabadas'],
    ['Casting', 'Proceso de selección de actores'],
    ['Cameo', 'Aparición breve de una persona famosa'],
    ['Spin-off', 'Serie o película derivada de otra'],
    ['Croma', 'Fondo de color para añadir efectos después'],
];
// ---------------------------- Personajes famosos ----------------------------
const personajesFacil = [
    ['Cantante', 'Se dedica a la música'],
    ['Futbolista', 'Juega al fútbol profesionalmente'],
    ['Influencer', 'Es muy popular en redes sociales'],
    ['Presentador', 'Conduce un programa de televisión'],
];
const personajesMedia = [
    ['Astronauta', 'Ha viajado al espacio'],
    ['Premio Nobel', 'Ha recibido un reconocimiento mundial'],
    ['Campeón olímpico', 'Ha ganado una medalla en los Juegos'],
    ['Escritor best-seller', 'Sus libros se venden muchísimo'],
    ['Diseñador de moda', 'Crea ropa famosa'],
    ['Chef con estrella', 'Cocina en un restaurante muy premiado'],
];
const personajesDificil = [
    ['Premio Pulitzer', 'Reconocimiento a periodistas y escritores'],
    ['Nobel de la Paz', 'Se concede por contribuir a la paz mundial'],
    ['Icono pop', 'Figura muy influyente en la cultura popular'],
    ['Prodigio infantil', 'Persona con un talento excepcional desde muy joven'],
];
const personajesMedia2 = [
    ['Youtuber', 'Crea contenido de vídeo online'],
    ['Modelo', 'Desfila o posa para marcas de moda'],
    ['Humorista', 'Se dedica a hacer reír al público'],
    ['Empresario', 'Dirige o funda negocios'],
];
// ---------------------------- Deportes ----------------------------
const deportesFacil = [
    ['Fútbol', 'Se juega con un balón y dos porterías'],
    ['Baloncesto', 'Hay que encestar el balón'],
    ['Natación', 'Se practica en el agua'],
    ['Tenis', 'Se juega con raquetas'],
    ['Ciclismo', 'Se practica en bicicleta'],
];
const deportesMedia = [
    ['Balonmano', 'Se juega con las manos y una portería'],
    ['Atletismo', 'Incluye carreras y saltos'],
    ['Voleibol', 'Se juega con una red alta'],
    ['Esgrima', 'Se lucha con espadas'],
    ['Escalada', 'Se sube por una pared o roca'],
    ['Surf', 'Se practica sobre las olas'],
    ['Remo', 'Se avanza con palas sobre el agua'],
];
const deportesDificil = [
    ['Curling', 'Se desliza una piedra sobre hielo'],
    ['Halterofilia', 'Consiste en levantar pesas'],
    ['Piragüismo', 'Se practica en una canoa o kayak'],
    ['Esquí de fondo', 'Se practica sobre nieve durante largas distancias'],
    ['Triatlón', 'Combina natación, ciclismo y carrera'],
];
// ---------------------------- Música ----------------------------
const musicaFacil = [
    ['Guitarra', 'Instrumento de cuerda muy popular'],
    ['Piano', 'Tiene teclas blancas y negras'],
    ['Batería', 'Se toca con baquetas'],
    ['Concierto', 'Actuación musical en directo'],
    ['Micrófono', 'Se usa para cantar más fuerte'],
];
const musicaMedia = [
    ['Orquesta', 'Grupo grande de músicos'],
    ['Festival de música', 'Evento con varios artistas'],
    ['Vinilo', 'Disco musical antiguo'],
    ['Auriculares', 'Se usan para escuchar música en privado'],
    ['Reguetón', 'Género musical muy bailable'],
    ['Ópera', 'Espectáculo musical cantado'],
];
const musicaDificil = [
    ['Sinfonía', 'Composición orquestal en varios movimientos'],
    ['Contrapunto', 'Técnica de combinar varias melodías'],
    ['Solfeo', 'Práctica de leer y entonar notas musicales'],
    ['Improvisación', 'Crear música sin haberla preparado antes'],
];
// ---------------------------- Comida ----------------------------
const comidaFacil = [
    ['Pizza', 'Lleva queso y tomate encima'],
    ['Hamburguesa', 'Se sirve entre dos panes'],
    ['Helado', 'Postre frío muy dulce'],
    ['Manzana', 'Fruta roja o verde'],
    ['Chocolate', 'Dulce marrón muy popular'],
    ['Tortilla', 'Se hace con huevos'],
    ['Paella', 'Plato de arroz típico'],
];
const comidaMedia = [
    ['Sushi', 'Plato japonés con arroz y pescado'],
    ['Gazpacho', 'Sopa fría de tomate'],
    ['Croquetas', 'Fritas y con forma cilíndrica'],
    ['Tapas', 'Pequeñas raciones para compartir'],
    ['Fideuá', 'Parecido a la paella pero con fideos'],
    ['Guacamole', 'Se hace con aguacate'],
];
const comidaDificil = [
    ['Percebes', 'Marisco que se pega a las rocas'],
    ['Foie', 'Elaborado con hígado de pato u oca'],
    ['Trufa negra', 'Hongo muy valorado en alta cocina'],
    ['Kombucha', 'Bebida fermentada a partir de té'],
];
// ---------------------------- Viajes y lugares ----------------------------
const viajesFacil = [
    ['Playa', 'Tiene arena y mar'],
    ['Montaña', 'Es muy alta y a veces tiene nieve'],
    ['Aeropuerto', 'Desde allí salen los aviones'],
    ['Hotel', 'Allí te alojas de vacaciones'],
    ['Maleta', 'Se usa para llevar la ropa de viaje'],
];
const viajesMedia = [
    ['Torre Eiffel', 'Monumento muy famoso de París'],
    ['Gran Muralla China', 'Enorme muralla histórica en Asia'],
    ['Machu Picchu', 'Ciudadela antigua en los Andes'],
    ['Sagrada Familia', 'Famosa basílica de Barcelona'],
    ['Crucero', 'Viaje largo en barco'],
    ['Safari', 'Excursión para ver animales salvajes'],
];
const viajesDificil = [
    ['Fiordo', 'Valle profundo inundado por el mar, típico de Noruega'],
    ['Caravana de mercaderes', 'Grupo que viajaba antiguamente para comerciar'],
    ['Oasis', 'Zona con agua en medio de un desierto'],
    ['Trashumancia', 'Desplazamiento estacional de ganado y pastores'],
];
// ---------------------------- Objetos ----------------------------
const objetosFacil = [
    ['Silla', 'Sirve para sentarse'],
    ['Paraguas', 'Protege de la lluvia'],
    ['Reloj', 'Sirve para saber la hora'],
    ['Llave', 'Sirve para abrir puertas'],
    ['Mochila', 'Se lleva a la espalda'],
];
const objetosMedia = [
    ['Termo', 'Mantiene la temperatura de una bebida'],
    ['Linterna', 'Ilumina en la oscuridad'],
    ['Brújula', 'Indica el norte'],
    ['Cargador', 'Sirve para recargar la batería'],
    ['Bufanda', 'Se lleva alrededor del cuello'],
];
const objetosDificil = [
    ['Metrónomo', 'Marca el compás musical'],
    ['Astrolabio', 'Instrumento astronómico antiguo'],
    ['Sextante', 'Instrumento de navegación para medir ángulos'],
    ['Reloj de arena', 'Mide el tiempo con arena que cae'],
];
// ---------------------------- Profesiones ----------------------------
const profesionesFacil = [
    ['Médico', 'Cuida la salud de las personas'],
    ['Profesor', 'Enseña en un colegio'],
    ['Bombero', 'Apaga incendios'],
    ['Policía', 'Mantiene el orden y la seguridad'],
    ['Cocinero', 'Prepara comida'],
];
const profesionesMedia = [
    ['Arquitecto', 'Diseña edificios'],
    ['Veterinario', 'Cuida animales'],
    ['Programador', 'Escribe código para aplicaciones'],
    ['Fontanero', 'Repara tuberías'],
    ['Electricista', 'Trabaja con la instalación eléctrica'],
    ['Piloto', 'Conduce aviones'],
];
const profesionesDificil = [
    ['Notario', 'Da fe pública de documentos legales'],
    ['Sommelier', 'Es experto en catar vinos'],
    ['Criptógrafo', 'Trabaja cifrando y descifrando información'],
    ['Restaurador de arte', 'Repara y conserva obras de arte antiguas'],
];
// ---------------------------- Historia ----------------------------
const historiaFacil = [
    ['Castillo', 'Fortaleza donde vivían nobles'],
    ['Pirámide', 'Construcción antigua de Egipto'],
    ['Dinosaurio', 'Animal prehistórico extinto'],
    ['Rey', 'Gobernaba un reino'],
];
const historiaMedia = [
    ['Imperio Romano', 'Gran civilización de la Antigüedad'],
    ['Revolución Francesa', 'Cambió el gobierno de Francia'],
    ['Edad Media', 'Época entre la Antigüedad y el Renacimiento'],
    ['Vikingos', 'Navegantes del norte de Europa'],
    ['Descubrimiento de América', 'Viaje histórico de 1492'],
];
const historiaDificil = [
    ['Cisma de Occidente', 'División dentro de la Iglesia medieval'],
    ['Tratado de Westfalia', 'Acuerdo que terminó guerras europeas'],
    ['Ruta de la Seda', 'Antigua red comercial entre Asia y Europa'],
    ['Caída del Muro de Berlín', 'Suceso histórico de 1989'],
];
// ---------------------------- Tecnología ----------------------------
const tecnologiaFacil = [
    ['Teléfono móvil', 'Se usa para llamar y navegar por internet'],
    ['Ordenador', 'Se usa para trabajar y jugar'],
    ['Internet', 'Conecta el mundo digitalmente'],
    ['Robot', 'Máquina programada para hacer tareas'],
];
const tecnologiaMedia = [
    ['Inteligencia artificial', 'Sistemas que imitan el razonamiento humano'],
    ['Realidad virtual', 'Simula estar en otro lugar'],
    ['Código QR', 'Cuadrado que se escanea con la cámara'],
    ['Wifi', 'Conexión inalámbrica a internet'],
    ['Aplicación móvil', 'Programa que se instala en el teléfono'],
];
const tecnologiaDificil = [
    ['Blockchain', 'Registro descentralizado y encadenado de datos'],
    ['Algoritmo', 'Conjunto de instrucciones para resolver un problema'],
    ['Criptomoneda', 'Dinero digital descentralizado'],
    ['Red neuronal', 'Sistema inspirado en el cerebro para aprender de datos'],
];
// ---------------------------- Naturaleza ----------------------------
const naturalezaFacil = [
    ['Árbol', 'Tiene tronco, ramas y hojas'],
    ['Río', 'Corriente de agua natural'],
    ['Sol', 'Nos da luz y calor'],
    ['Luna', 'Se ve de noche en el cielo'],
    ['Flor', 'Parte colorida de una planta'],
];
const naturalezaMedia = [
    ['Volcán', 'Puede expulsar lava'],
    ['Glaciar', 'Enorme masa de hielo'],
    ['Desierto', 'Lugar muy seco y con arena'],
    ['Arrecife de coral', 'Ecosistema submarino colorido'],
    ['Selva tropical', 'Bosque denso y muy húmedo'],
];
const naturalezaDificil = [
    ['Fotosíntesis', 'Proceso por el que las plantas producen energía'],
    ['Estratósfera', 'Una de las capas de la atmósfera'],
    ['Simbiosis', 'Relación beneficiosa entre dos seres vivos distintos'],
    ['Erosión', 'Desgaste del terreno por el viento o el agua'],
];
// ---------------------------- Infantil ----------------------------
const infantilFacil = [
    ['Payaso', 'Hace reír en el circo'],
    ['Globo', 'Se hincha con aire y vuela'],
    ['Columpio', 'Se usa en el parque'],
    ['Cuento', 'Se lee antes de dormir'],
    ['Muñeco de peluche', 'Es suave y se abraza'],
    ['Pastel de cumpleaños', 'Tiene velas que se soplan'],
];
const infantilMedia = [
    ['Parque de atracciones', 'Tiene montañas rusas'],
    ['Disfraz', 'Se usa para Carnaval'],
    ['Cometa', 'Vuela sujeta con un hilo'],
    ['Castillo de arena', 'Se construye en la playa'],
    ['Piñata', 'Se rompe para que caigan caramelos'],
];
// ---------------------------- Cultura española ----------------------------
const culturaFacil = [
    ['Flamenco', 'Baile típico del sur de España'],
    ['Siesta', 'Descanso después de comer'],
    ['Tortilla de patatas', 'Plato muy típico español'],
    ['Corrida de toros', 'Espectáculo tradicional con toros'],
];
const culturaMedia = [
    ['San Fermín', 'Fiestas famosas con encierros'],
    ['La Tomatina', 'Fiesta donde se lanzan tomates'],
    ['Semana Santa', 'Procesiones religiosas de primavera'],
    ['Feria de Abril', 'Fiesta típica de Sevilla'],
    ['Camino de Santiago', 'Ruta de peregrinación famosa'],
];
const culturaDificil = [
    ['Movida madrileña', 'Movimiento cultural español de los años 80'],
    ['Generación del 27', 'Grupo de poetas españoles'],
    ['Siglo de Oro', 'Época de gran esplendor artístico y literario en España'],
    ['Romancero', 'Colección tradicional de poemas narrativos españoles'],
];
// ---------------------------- Nivel difícil (general / mixto) ----------------------------
const infantilFacil2 = [
    ['Trampolín', 'Se salta encima y rebota'],
    ['Tobogán', 'Se baja deslizándose'],
    ['Arenero', 'Caja llena de arena para jugar'],
    ['Osito de peluche', 'Muñeco suave con forma de oso'],
    ['Bicicleta con ruedines', 'Primera bici de los niños pequeños'],
];
const dificilExtra = [
    ['Efecto Dunning-Kruger', 'Sesgo por el que se sobreestima la propia competencia'],
    ['Teoría del caos', 'Estudio de sistemas muy sensibles a las condiciones iniciales'],
    ['Falacia del jugador', 'Creer que la suerte pasada influye en la futura'],
    ['Servidumbre voluntaria', 'Concepto filosófico sobre la sumisión al poder'],
];
const nivelExtrema = [
    ['Efecto mariposa', 'Idea de que un pequeño cambio provoca grandes consecuencias'],
    ['Paradoja del abuelo', 'Dilema clásico sobre viajar en el tiempo'],
    ['Singularidad tecnológica', 'Momento hipotético en que la IA supera a la humana'],
    ['Entropía', 'Medida del desorden de un sistema'],
    ['Efecto placebo', 'Mejora percibida sin tratamiento real'],
    ['Sesgo de confirmación', 'Tendencia a buscar información que confirme lo que ya crees'],
    ['Dilema del prisionero', 'Situación clásica de teoría de juegos'],
    ['Paradoja de Fermi', 'Pregunta sobre la ausencia de vida extraterrestre detectada'],
];
export const TERMS = [
    ...build('animales', 'facil', true, false, animalesFacil),
    ...build('animales', 'facil', true, false, animalesFacil2, '_b'),
    ...build('animales', 'media', true, false, animalesMedia),
    ...build('animales', 'dificil', true, false, animalesDificil),
    ...build('cine_tv', 'facil', true, false, cineFacil),
    ...build('cine_tv', 'media', true, false, cineMedia),
    ...build('cine_tv', 'dificil', true, false, cineDificil),
    ...build('personajes', 'facil', true, false, personajesFacil),
    ...build('personajes', 'media', true, false, personajesMedia),
    ...build('personajes', 'media', true, false, personajesMedia2, '_b'),
    ...build('personajes', 'dificil', true, false, personajesDificil),
    ...build('deportes', 'facil', true, false, deportesFacil),
    ...build('deportes', 'media', true, false, deportesMedia),
    ...build('deportes', 'dificil', true, false, deportesDificil),
    ...build('musica', 'facil', true, false, musicaFacil),
    ...build('musica', 'media', true, false, musicaMedia),
    ...build('musica', 'dificil', true, false, musicaDificil),
    ...build('comida', 'facil', true, false, comidaFacil),
    ...build('comida', 'media', true, false, comidaMedia),
    ...build('comida', 'dificil', true, false, comidaDificil),
    ...build('viajes', 'facil', true, false, viajesFacil),
    ...build('viajes', 'media', true, false, viajesMedia),
    ...build('viajes', 'dificil', true, false, viajesDificil),
    ...build('objetos', 'facil', true, false, objetosFacil),
    ...build('objetos', 'media', true, false, objetosMedia),
    ...build('objetos', 'dificil', true, false, objetosDificil),
    ...build('profesiones', 'facil', true, false, profesionesFacil),
    ...build('profesiones', 'media', true, false, profesionesMedia),
    ...build('profesiones', 'dificil', true, false, profesionesDificil),
    ...build('historia', 'facil', true, false, historiaFacil),
    ...build('historia', 'media', true, false, historiaMedia),
    ...build('historia', 'dificil', true, false, historiaDificil),
    ...build('tecnologia', 'facil', true, false, tecnologiaFacil),
    ...build('tecnologia', 'media', true, false, tecnologiaMedia),
    ...build('tecnologia', 'dificil', true, false, tecnologiaDificil),
    ...build('naturaleza', 'facil', true, false, naturalezaFacil),
    ...build('naturaleza', 'media', true, false, naturalezaMedia),
    ...build('naturaleza', 'dificil', true, false, naturalezaDificil),
    ...build('infantil', 'facil', true, false, infantilFacil),
    ...build('infantil', 'facil', true, false, infantilFacil2, '_b'),
    ...build('infantil', 'media', true, false, infantilMedia),
    ...build('cultura_espanola', 'facil', true, false, culturaFacil),
    ...build('cultura_espanola', 'media', true, false, culturaMedia),
    ...build('cultura_espanola', 'dificil', true, false, culturaDificil),
    ...build('dificil', 'extrema', true, false, nivelExtrema),
    ...build('dificil', 'extrema', true, false, dificilExtra, '_b'),
];
export function termCount() {
    return TERMS.length;
}
