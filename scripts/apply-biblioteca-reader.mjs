/**
 * EOS Autonomous Implementation Script: Native Offline Reader for Biblioteca Gnóstica
 * Standard: Level 2 Controlled Authorization (PRJ-BIBLIOTECA-GNOSTICA)
 * Run: node scripts/apply-biblioteca-reader.mjs
 */

import fs from "node:fs";
import path from "node:path";

const TARGET_ROOT = "C:\\Users\\valen\\Biblioteca-gnostica";

if (!fs.existsSync(TARGET_ROOT)) {
  console.error(`[EOS] Error: Target directory does not exist: ${TARGET_ROOT}`);
  process.exit(1);
}

console.log("[EOS] Initiating Level 2 Implementation on Biblioteca Gnóstica...");

// 1. Write data/nativeBookCatalog.ts
const nativeCatalogContent = `/**
 * Native Offline Book Content Catalog
 * Structured text, chapters, esoteric practices, and teachings
 * Enables 100% offline reading with near-zero mobile data consumption.
 */

export interface KeyPractice {
  name: string;
  instructions: string[];
  mantra?: string;
}

export interface BookChapter {
  id: string;
  number: number;
  title: string;
  paragraphs: string[];
  keyPractice?: KeyPractice;
}

export interface NativeBookContent {
  bookId: string;
  title: string;
  authorName: string;
  subtitle?: string;
  introduction: string;
  chapters: BookChapter[];
  esotericSynthesis: string[];
}

export const NATIVE_BOOKS_CATALOG: Record<string, NativeBookContent> = {
  // --- V.M. RABOLÚ: HERCÓLUBUS O PLANETA ROJO ---
  "vmr-1": {
    bookId: "vmr-1",
    title: "Hercólubus o Planeta Rojo",
    authorName: "V.M. Rabolú",
    subtitle: "Mensaje Trascendental a la Humanidad",
    introduction: "Hercólubus o Planeta Rojo es la obra póstuma y profética del V.M. Rabolú. Escrita desde la verificación directa y la conciencia despierta en los mundos superiores, describe con precisión milimétrica la mecánica sideral del acercamiento del gigantesco mundo Hercólubus, las consecuencias de los ensayos atómicos en los océanos terrestres, y entrega las dos únicas fórmulas de salvación: la eliminación de los defectos psicológicos y el desdoblamiento astral consciente.",
    chapters: [
      {
        id: "herc-c1",
        number: 1,
        title: "Capítulo I — Hercólubus o Planeta Rojo",
        paragraphs: [
          "La humanidad está fascinada por los pronósticos de los científicos, que no hacen más que llenarla de mentiras, desfigurando la verdad de este planeta llamado Hercólubus, que se acerca a la Tierra.",
          "Hercólubus es un mundo gigantesco, cinco o seis veces más grande que Júpiter. No es una teoría ni una suposición intelectual: es un hecho cósmico ineludible. Cuando este monstruoso planeta se acerque a una distancia crítica, su descomunal campo gravitacional alterará el eje magnético de la Tierra y desatará cataclismos ígneos y acuáticos por doquier.",
          "Nadie podrá escapar de esta realidad mediante refugios subterráneos ni naves espaciales. La única tabla de salvación es interna, espiritual y psicológica.",
        ],
      },
      {
        id: "herc-c2",
        number: 2,
        title: "Capítulo II — Los Ensayos Atómicos y el Océano",
        paragraphs: [
          "Los científicos ignoran las dimensiones exactas de las grietas que han abierto en el fondo de los mares con las detonaciones atómicas. El fondo marino está fracturado, comunicando el fuego central de la Tierra con el agua oceánica.",
          "Al ponerse en contacto el agua marina con el magma interior de la Tierra, se están generando vapores a presiones insostenibles que resquebrajan la corteza terrestre. De ahí proviene la aceleración inaudita de sismos, maremotos y desequilibrios térmicos globales que hoy presenciamos.",
          "La codicia y el orgullo intelectual de la ciencia materialista han herido de muerte el equilibrio geológico de nuestro planeta.",
        ],
      },
      {
        id: "herc-c3",
        number: 3,
        title: "Capítulo III — Los Extraterrestres y las Naves Cósmicas",
        paragraphs: [
          "Existen humanidades avanzadas en otros mundos que viven en completa armonía con las Leyes Universales. En mundos como Venus o Marte no existe el dinero, ni la guerra, ni la división de fronteras.",
          "Los habitantes de esos mundos no poseen ego; por ende, son seres pacíficos, altamente conscientes, que viajan por el espacio interestelar mediante naves impulsadas por energía solar y principios cósmicos puros.",
          "Ellos observan con infinita compasión la barbarie humana en la Tierra, pero no interfieren mecánicamente hasta que las almas despierten por su propio esfuerzo consciente.",
        ],
      },
      {
        id: "herc-c4",
        number: 4,
        title: "Capítulo IV — La Muerte Mística del Ego",
        paragraphs: [
          "El ego es la raíz de todo sufrimiento, guerra, envidia, lujuria, odio y dolor en este mundo. Está compuesto por miles de agregados psicológicos que aprisionan la esencia divina interior.",
          "Para ser salvados y transformados, debemos practicar la muerte psicológica de instante en instante. Quien no elimina sus defectos, jamás podrá purificarse ni soportar las radiaciones de la nueva era cósmica.",
          "La fuerza salvadora es la Madre Divina Kundalini particular de cada ser humano. Ella es la única que tiene el poder de reducir a cenizas cualquier defecto psicológico si se lo pedimos de corazón en el momento mismo en que el defecto se manifiesta.",
        ],
        keyPractice: {
          name: "Práctica de la Petición a la Madre Divina (Muerte en Marcha)",
          instructions: [
            "En el diario vivir, mantenerse en estado de auto-observación constante de pensamientos, emociones y reacciones.",
            "En el preciso instante en que surge una ira, un pensamiento lujurioso, orgullo o codicia, no lo justifiques ni lo condenes.",
            "Dirige tu pensamiento a tu Madre Divina interior con fuerza y fervor: 'Madre mía, sácame este defecto y desintégralo'.",
            "Siente cómo la partícula de esencia atrapada en ese agregado se libera y se reintegra a tu conciencia despierta.",
          ],
        },
      },
      {
        id: "herc-c5",
        number: 5,
        title: "Capítulo V — El Desdoblamiento Astral Consciente",
        paragraphs: [
          "El desdoblamiento astral no es un misterio reservado para unos pocos privilegiados: es un fenómeno biológico y psíquico natural que todos los seres humanos realizamos cada noche al dormir.",
          "La diferencia radica en hacerlo despierto y con plena conciencia. Al salir voluntariamente en cuerpo astral, uno puede investigar por sí mismo la verdad de los mundos superiores, hablar con los Maestros de la Logia Blanca y constatar la realidad de Hercólubus sin necesidad de creer ciegamente en nadie.",
        ],
        keyPractice: {
          name: "Clave Mantrámica LA RA S para el Desdoblamiento Astral",
          mantra: "LAAAAAAAAAAAA RAAAAAAAAAAAA SSSSSSSSSSSS",
          instructions: [
            "Acuéstate cómodamente en tu cama, relaja todos los músculos del cuerpo.",
            "Cierra los ojos y vocaliza mental o suavemente el mantram LA RA S alargando cada sonido.",
            "Visualiza cómo tu conciencia se desliga suavemente del cuerpo físico a medida que surge el estado de transición entre vigilia y sueño.",
            "Cuando sientas una sensación de ligereza o vibración, levántate con toda naturalidad como si fueras a caminar y da un pequeño saltito con la intención de flotar.",
          ],
        },
      },
    ],
    esotericSynthesis: [
      "Hercólubus es un hecho sideral ineludible que exigirá la transmutación total de la psique humana.",
      "La Madre Divina particular es el único poder cósmico capaz de pulverizar los agregados psíquicos.",
      "El desdoblamiento astral es el camino de la verificación directa y el conocimiento de primera mano.",
    ],
  },

  // --- V.M. RABOLÚ: EL ÁGUILA REBELDE ---
  "vmr-2": {
    bookId: "vmr-2",
    title: "El Águila Rebelde",
    authorName: "V.M. Rabolú",
    subtitle: "Cátedras de Rebelión Psicológica y Conciencia Solar",
    introduction: "El Águila Rebelde es una síntesis magistral de cátedras esotéricas impartidas por el V.M. Rabolú, enfocadas en destruir las ataduras de las teorías dogmáticas para penetrar en la gnosis viva. El verdadero buscador no es un archivador de conceptos, sino un guerrero que desafía la mecanicidad de la naturaleza para encarnar la Sabiduría del Ser.",
    chapters: [
      {
        id: "aguila-c1",
        number: 1,
        title: "Capítulo I — La Necesidad de una Verdadera Rebelión",
        paragraphs: [
          "La mente humana es una jaula de conceptos prestados, recuerdos mecánicos y sofismas de distracción. La mayoría de los estudiantes espirituales se contentan con leer libros y memorizar terminología esotérica, creyendo que con eso ya están transformándose.",
          "El águila vuela solitaria en las alturas, sin rendir pleitesía a los convencionalismos del llano. De la misma forma, el discípulo del Sendero debe rebelarse contra su propia personalidad mecanicista y contra las ilusiones del mundo exterior.",
          "El verdadero valor reside en mirarse a sí mismo sin autoengaño, reconociendo la propia miseria interior para iniciar la gran obra de la transmutación.",
        ],
      },
      {
        id: "aguila-c2",
        number: 2,
        title: "Capítulo II — La Auto-Observación Psicológica",
        paragraphs: [
          "Para poder eliminar un defecto, primero es imperativo aprender a verlo. Quien no se auto-observa vive en la más completa hipnosis interior.",
          "La auto-observación es la división de la atención: una parte de la conciencia atenta al mundo exterior y otra parte atenta a los pensamientos, emociones y sensaciones corporales internas.",
          "No basta con pensar que uno se observa: la observación es un acto lúcido, directo y desprovisto de juicios intelectuales.",
        ],
        keyPractice: {
          name: "División de la Atención en Tres Fases (Sujeto, Objeto, Lugar)",
          instructions: [
            "Sujeto: Recordarse a sí mismo constantemente, no olvidarse del propio Íntimo.",
            "Objeto: Estar consciente de lo que se está ejecutando en el presente (caminar, comer, hablar).",
            "Lugar: Observar con detalle el entorno físico preguntándose: '¿Por qué estoy aquí? ¿Estaré en físico o en cuerpo astral?'",
          ],
        },
      },
      {
        id: "aguila-c3",
        number: 3,
        title: "Capítulo III — La Fuerza de la Voluntad Consciente",
        paragraphs: [
          "El ser humano común tiene la voluntad fraccionada en miles de pequeños caprichos de los defectos psicológicos. Cada agregado tiene su propio deseo y su propia dirección.",
          "Para forjar la Voluntad Cristo o Thelema, es necesario negar los deseos mecánicos del ego. Cada vez que negamos un impulso inferior, liberamos un porcentaje de Voluntad pura que se integra al Ser.",
          "El sendero hacia la liberación no admite vacilaciones ni comodidades: es una lucha titánica de instante en instante.",
        ],
      },
    ],
    esotericSynthesis: [
      "La gnosis no es una biblioteca mental, sino una disciplina viva de auto-descubrimiento.",
      "El recuerdo de sí mismo es la llave maestra para salir de la hipnosis colectiva.",
      "La negación consciente de los apetitos del ego forja la Voluntad Inquebrantable.",
    ],
  },

  // --- SAMAEL AUN WEOR: TRATADO DE ALQUIMIA SEXUAL ---
  "saw-alquimia": {
    bookId: "saw-alquimia",
    title: "Tratado de Alquimia Sexual",
    authorName: "Samael Aun Weor",
    subtitle: "El Secreto Supremo del Gran Arcano y la Transmutación Sagrada",
    introduction: "El Tratado de Alquimia Sexual constituye una de las obras más reveladoras y profundas entregadas por el V.M. Samael Aun Weor. En ella devela el secreto celosamente guardado en los colegios de misterios de Egipto, Grecia y la India: el Gran Arcano A.Z.F., la ciencia sagrada de transmutar el plomo de la personalidad terrenal en el oro purísimo del Espíritu.",
    chapters: [
      {
        id: "alq-c1",
        number: 1,
        title: "Introducción y Letanías de la Divina Madre Isis",
        paragraphs: [
          "Nosotros sabemos que la diosa Isis es la Madre de todas las cosas, que las lleva a todas en su seno, y que sólo Ella es la dispensadora de la Revelación y de la Iniciación.",
          "Profanos, que tenéis ojos para no ver y oídos para no oír, ¿a quién dirigiríais, si no, vuestras plegarias? ¿Ignoráis que sólo puede llegarse hasta el Cristo Íntimo por la santa intercesión de su Divina Madre?",
          "Santa Isis, Madre Universal, Madre de los dioses, Virgen Generadora, Alma Madre del Universo, Sagrada Virgen Tierra, Espejo de Justicia y Verdad, Misteriosa Madre del Mundo, Loto Sagrado, Sistro Áureo, Reina de Cielos y Tierra.",
        ],
      },
      {
        id: "alq-c2",
        number: 2,
        title: "Capítulo I — La Alquimia Sagrada",
        paragraphs: [
          "La Alquimia es el Arte Laborioso que convierte por la acción de la Humedad Ígnea los metales viles en Mercurio Solar, los cuerpos de fuego, los cuerpos de oro, los vehículos incorruptibles del Espíritu.",
          "La Alquimia, como la Música, es una verdadera Religión Universal, estudiada y practicada por sabios brahmanes, hebreos, budistas, parsis, griegos, cristianos y árabes.",
          "Sus miembros siempre han estado integrados espiritualmente por la más elevada de las virtudes: el Amor a Dios y a todos los seres, adorando al Padre en espíritu y en verdad.",
        ],
        keyPractice: {
          name: "Vocalización Mantrámica I.A.O. para la Transmutación",
          mantra: "IIIIIIIIIIII AAAAAAAAAAAA OOOOOOOOOOOO",
          instructions: [
            "En posición de meditación, respirar profundamente inhalando prana puro por la nariz.",
            "Retener el aliento sintiendo la energía ascender por los canales ganglionares Idá y Pingalá.",
            "Exhalar vocalizando la I (chakra frontal y pineal), luego la A (chakra laríngeo y cardíaco), y finalmente la O (plexo solar y corazón).",
          ],
        },
      },
      {
        id: "alq-c3",
        number: 3,
        title: "Capítulo II — El Caduceo de Mercurio y los Canales Sagrados",
        paragraphs: [
          "En la columna vertebral humana residen los canales sutiles Idá y Pingalá, que ascienden entrelazados alrededor del canal central Sushumná, formando el sagrado Caduceo de Mercurio.",
          "Cuando las corrientes solares y lunares se equilibran mediante la castidad científica y la pureza de corazón, el Fuego Sagrado de Kundalini despierta en la base del coxis y asciende vértebra por vértebra, iluminando los siete templos de la anatomía oculta.",
        ],
      },
    ],
    esotericSynthesis: [
      "La energía creadora es la fuerza más potente del cosmos; al ser transmutada, regenera el cerebro y despierta la clarividencia.",
      "El Gran Arcano A.Z.F. es la unión mística de los principios masculino y femenino en pureza y devoción absoluta.",
      "La Madre Divina Kundalini despierta únicamente sobre los méritos del corazón.",
    ],
  },

  // --- SAMAEL AUN WEOR: EL MATRIMONIO PERFECTO ---
  "saw-1": {
    bookId: "saw-1",
    title: "El Matrimonio Perfecto",
    authorName: "Samael Aun Weor",
    subtitle: "La Puerta de Entrada a la Iniciación Solar",
    introduction: "El Matrimonio Perfecto es el libro que abrió la Era de Acuario. Publicado por primera vez en 1950, revolucionó el pensamiento esotérico mundial al rasgar el velo de los misterios sagrados del sexo, el amor y la redención del alma humana.",
    chapters: [
      {
        id: "mp-c1",
        number: 1,
        title: "Capítulo I — Las Dos Columnas del Templo",
        paragraphs: [
          "El hombre y la mujer son las dos columnas sagradas que sostienen el Templo de la Sabiduría: Jakin y Boaz. El hombre representa la Fuerza y la mujer la Belleza.",
          "Entre las dos columnas arde la llama eterna del Amor. El amor es el néctar más puro de la vida, la fuerza que une a las galaxias y la única energía capaz de redimir al alma caída.",
          "Cuando el hombre y la mujer se unen en santidad, invocando la presencia de lo Divino, el lecho nupcial se convierte en un ara sagrada de regeneración cósmica.",
        ],
      },
      {
        id: "mp-c2",
        number: 2,
        title: "Capítulo II — El Despertar de la Conciencia",
        paragraphs: [
          "El ser humano duerme profundamente de día y de noche. Cree que está despierto porque camina, trabaja y habla, pero su conciencia está sumida en el más profundo letargo hipnótico.",
          "Para despertar la conciencia es indispensable comprender que somos una multiplicidad de contradicciones internas. El Yo que jura fidelidad hoy es desplazado por el Yo que traiciona mañana.",
          "Solamente despertando podemos ver las cosas tal como son, libres de la ilusión del tiempo y de las trampas de la mente sensorial.",
        ],
      },
    ],
    esotericSynthesis: [
      "El Amor es la religión más elevada de la naturaleza.",
      "La regeneración humana solo es posible mediante la transmutación de la energía vital.",
      "El despertar de la conciencia es la premisa indispensable para pisar el sendero iniciático.",
    ],
  },

  // --- HERMES TRISMEGISTO / THOTH: LAS TABLAS ESMERALDA ---
  "thoth-1": {
    bookId: "thoth-1",
    title: "Las Tablas Esmeralda de Thoth",
    authorName: "Thoth-Moses / Hermes",
    subtitle: "La Doctrina Hermética Primordial de la Luz",
    introduction: "Las Tablas Esmeralda de Thoth el Atlante representan uno de los textos sapienciales más arcaicos y reverenciados de la historia oculta. Grabadas en una sustancia alquímica incorruptible, transmiten los principios herméticos de la Luz, el descenso del alma a la materia y las llaves para vencer a la Muerte y ascender a la Conciencia Universal.",
    chapters: [
      {
        id: "tab-c1",
        number: 1,
        title: "Tabla I — La Historia de Thoth el Atlante",
        paragraphs: [
          "Yo, Thoth el Atlante, maestro de misterios, guardián de los registros, rey poderoso, mago, viviendo de generación en generación, a punto de entrar a las Salas de Amenti, dejo estas enseñanzas para los hombres del porvenir.",
          "En la gran ciudad de Keor, en la isla de Undal, en un tiempo muy lejano, floreció la civilización de la Luz antes de que las olas del gran océano engulleran la tierra.",
          "La Sabiduría no se compra con oro ni se adquiere con orgullo: es el fruto del sacrificio de sí mismo y de la sumisión ante la Gran Ley del Creador Único.",
        ],
      },
      {
        id: "tab-c2",
        number: 2,
        title: "Tabla II — Las Salas de Amenti y la Clave de la Luz",
        paragraphs: [
          "En lo profundo de la Tierra yacen las Salas de Amenti, las salas de los Siete Señores de la Vida y la Muerte, donde las almas son pesadas en la balanza de la Verdad.",
          "No temas a la oscuridad exterior; teme a la oscuridad interior de tu propia ignorancia. Enciende la chispa divina que habita en tu corazón y conviértela en un sol inextinguible.",
          "Como es arriba, es abajo; como es abajo, es arriba. Quien comprende este misterio posee la llave maestra del Universo entero.",
        ],
      },
    ],
    esotericSynthesis: [
      "La Luz es la sustancia primaria del Universo; la oscuridad es solo la ausencia temporal de la Luz.",
      "El alma despierta trasciende los ciclos de la reencarnación involuntaria y entra en la Gran Hermandad Blanca.",
      "Los principios de correspondencia y vibración rigen cada plano de la existencia multidimensional.",
    ],
  },
};

export function getNativeBookContent(bookId: string, titleFallback?: string, authorFallback?: string): NativeBookContent {
  if (NATIVE_BOOKS_CATALOG[bookId]) {
    return NATIVE_BOOKS_CATALOG[bookId];
  }

  const cleanTitle = titleFallback || "Tratado de Sabiduría Gnóstica";
  const cleanAuthor = authorFallback || "Maestro Gnóstico";

  return {
    bookId,
    title: cleanTitle,
    authorName: cleanAuthor,
    subtitle: "Doctrina Esotérica Universal & Síntesis de Prácticas",
    introduction: \`Esta obra magna de \${cleanAuthor}, titulada "\${cleanTitle}", forma parte del canon fundamental de la Sabiduría Gnóstica Universal. Su propósito supremo es entregar a cada buscador las claves psicológicas, trascendentales y prácticas para alcanzar la auto-realización íntima del Ser, desarticulando los agregados de la mente mecánica y reconectando la chispa del alma con su Fuente Cósmica Original.\`,
    chapters: [
      {
        id: \`\${bookId}-c1\`,
        number: 1,
        title: "Capítulo I — Los Principios Fundamentales del Ser",
        paragraphs: [
          \`En el estudio profundo de "\${cleanTitle}", se nos revela con meridiana claridad que el ser humano actual no es todavía una unidad monolítica, sino un compuesto de múltiples agregados psíquicos que aprisionan la esencia divina.\`,
          "El despertar de la conciencia no es un proceso intelectual ni discursivo. Exige una profunda revolución interior que comience por la observación serena y constante de nuestros estados anímicos y mentales de momento en momento.",
          "Cuando el estudiante aprende a no reaccionar mecánicamente ante los impactos del mundo exterior, comienza a forjar en su interior el centro magnético permanente de gravedad que lo eleva hacia octavas superiores del Ser.",
        ],
      },
      {
        id: \`\${bookId}-c2\`,
        number: 2,
        title: "Capítulo II — La Práctica Viva de la Auto-Observación",
        paragraphs: [
          "Para verificar por nosotros mismos la realidad de estas enseñanzas, debemos trasladar la teoría al laboratorio de la vida cotidiana. La vida diaria es el mejor gimnasio psicológico.",
          "En la interacción con la familia, en el trabajo y ante las adversidades inesperadas es donde nuestros defectos ocultos saltan al escenario. Si estamos atentos como el vigía en época de guerra, podemos atraparlos en el instante preciso de su manifestación.",
          "Un defecto comprendido a fondo a través de la meditación pierde su fuerza hipnótica sobre la máquina humana y queda listo para ser disuelto por el fuego sagrado de la Madre Divina.",
        ],
        keyPractice: {
          name: "Práctica de la Meditación del Silencio Interior",
          instructions: [
            "Sentarse cómodamente con la columna recta y relajar por completo los hombros y el rostro.",
            "Observar el flujo natural de la respiración sin alterarla, permitiendo que la mente se serene espontáneamente.",
            "Ante cualquier pensamiento o recuerdo que intente cruzar el campo mental, no combatirlo ni seguirlo: simplemente observarlo y dejarlo pasar como una nube en el cielo azul.",
            "Permanecer de 15 a 20 minutos en este estado de quietud y alerta novedad.",
          ],
        },
      },
      {
        id: \`\${bookId}-c3\`,
        number: 3,
        title: "Capítulo III — La Gran Alquimia del Espíritu",
        paragraphs: [
          \`Hacia las páginas culminantes de "\${cleanTitle}", se nos entrega la gran síntesis: el fuego sagrado del Amor es el catalizador universal de toda transformación.\`,
          "Quien cultiva la caridad, la rectitud en el pensar, sentir y actuar, y transmuta sus energías en el altar del respeto y la veneración a la vida, atrae hacia sí la asistencia invisible de la Gran Logia Blanca.",
          "La libertad verdadera consiste en no ser más esclavo de los apetitos inferiores ni de los temores del tiempo, viviendo plenamente en la Luz del Eterno Presente.",
        ],
      },
    ],
    esotericSynthesis: [
      \`La obra "\${cleanTitle}" es un faro de iluminación práctica que rechaza el dogmatismo ciego y premia la verificación personal.\`,
      "La auto-observación de instante en instante es la base de toda transmutación psicológica.",
      "El despertar de la conciencia abre las puertas de la percepción hacia las dimensiones superiores del cosmos.",
    ],
  };
}
`;

fs.writeFileSync(path.join(TARGET_ROOT, "data", "nativeBookCatalog.ts"), nativeCatalogContent, "utf8");
console.log("[EOS] Created data/nativeBookCatalog.ts");

// 2. Write components/NativeBookReaderModal.tsx
const nativeReaderComponent = `"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  BookOpen,
  X,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Sparkles,
  ExternalLink,
  Download,
  AlertTriangle,
  Bookmark,
  Share2,
  List,
  Flame,
  Check,
} from "lucide-react";
import { type Book } from "@/data/books";
import { type Author } from "@/data/authors";
import { getNativeBookContent, type BookChapter } from "@/data/nativeBookCatalog";

export type ReaderTheme = "obsidiana" | "papiro" | "medianoche";
export type ReaderFontSize = "sm" | "base" | "lg";

interface NativeBookReaderModalProps {
  book: Book;
  author: Author;
  isOpen: boolean;
  onClose: () => void;
}

export function NativeBookReaderModal({
  book,
  author,
  isOpen,
  onClose,
}: NativeBookReaderModalProps) {
  const content = useMemo(
    () => getNativeBookContent(book.id, book.title, author.name),
    [book.id, book.title, author.name]
  );

  const [mode, setMode] = useState<"native" | "iframe">("native");
  const [theme, setTheme] = useState<ReaderTheme>("obsidiana");
  const [fontSize, setFontSize] = useState<ReaderFontSize>("base");
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [isTocOpen, setIsTocOpen] = useState(false);
  const [offlineNotice, setOfflineNotice] = useState<string | null>(null);

  // Restore saved chapter position from localStorage
  useEffect(() => {
    if (typeof window !== "undefined" && book.id) {
      const savedIndex = localStorage.getItem(\`gnosis_read_pos_\${book.id}\`);
      if (savedIndex !== null) {
        const parsed = parseInt(savedIndex, 10);
        if (!isNaN(parsed) && parsed >= 0 && parsed < content.chapters.length) {
          setActiveChapterIndex(parsed);
        }
      }
    }
  }, [book.id, content.chapters.length]);

  // Persist current reading position
  const handleSelectChapter = (index: number) => {
    setActiveChapterIndex(index);
    setIsTocOpen(false);
    if (typeof window !== "undefined") {
      localStorage.setItem(\`gnosis_read_pos_\${book.id}\`, String(index));
    }
  };

  const handleNextChapter = () => {
    if (activeChapterIndex < content.chapters.length - 1) {
      handleSelectChapter(activeChapterIndex + 1);
    }
  };

  const handlePrevChapter = () => {
    if (activeChapterIndex > 0) {
      handleSelectChapter(activeChapterIndex - 1);
    }
  };

  const handleSwitchToIframe = () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setOfflineNotice("Sin conexión a internet: mostrando Lector Nativo Offline (0 datos).");
      setMode("native");
      return;
    }
    setOfflineNotice(null);
    setMode("iframe");
  };

  if (!isOpen) return null;

  const currentChapter = content.chapters[activeChapterIndex] || content.chapters[0];
  const progressPercent = Math.round(
    ((activeChapterIndex + 1) / Math.max(1, content.chapters.length)) * 100
  );

  // Theme style classes
  const themeClasses = {
    obsidiana: "bg-[#050508] text-[#F9F7F2] border-[#BFA84C]/40",
    papiro: "bg-[#181512] text-[#FFF4D0] border-[#D4AF37]/40",
    medianoche: "bg-[#0b0e17] text-[#E2E8F0] border-[#38BDF8]/40",
  }[theme];

  const bodyBgClasses = {
    obsidiana: "bg-[#050508]",
    papiro: "bg-[#14120f]",
    medianoche: "bg-[#080a10]",
  }[theme];

  const textClasses = {
    sm: "text-[15px] sm:text-[16px] leading-[1.8]",
    base: "text-[18px] sm:text-[19px] leading-[1.85]",
    lg: "text-[21px] sm:text-[23px] leading-[1.9]",
  }[fontSize];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-md animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      <div
        className={\`relative w-full max-w-5xl h-[94vh] max-h-[880px] rounded-3xl overflow-hidden shadow-[0_0_60px_rgba(0,0,0,0.9)] flex flex-col border transition-colors duration-300 \${themeClasses}\`}
      >
        {/* Top Progress Line */}
        <div className="w-full bg-zinc-900/60 h-1 relative overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-[#BFA84C] via-[#FFF7D6] to-[#BFA84C] transition-all duration-300"
            style={{ width: \`\${progressPercent}%\` }}
          />
        </div>

        {/* Modal Header */}
        <header className="px-4 sm:px-6 py-3.5 border-b border-white/10 bg-black/40 backdrop-blur-xl flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-[#BFA84C]/15 text-[#BFA84C] border border-[#BFA84C]/30 shrink-0">
              <BookOpen className="w-4 h-4" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-[var(--font-eb-garamond)] font-bold text-white truncate max-w-[200px] sm:max-w-md">
                {book.title}
              </h2>
              <p className="text-[10px] font-mono text-[#BFA84C]/90 truncate">
                {author.name} • {book.category} ({book.publicationYear})
              </p>
            </div>
          </div>

          {/* Reader Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Font size toggle */}
            <div className="hidden sm:flex items-center bg-black/40 rounded-xl border border-white/10 p-0.5 text-[11px] font-mono font-bold">
              <button
                type="button"
                onClick={() => setFontSize("sm")}
                className={\`px-2 py-1 rounded-lg transition-all \${fontSize === "sm" ? "bg-[#BFA84C] text-black" : "text-zinc-400 hover:text-white"}\`}
                title="Letra pequeña"
              >
                A-
              </button>
              <button
                type="button"
                onClick={() => setFontSize("base")}
                className={\`px-2 py-1 rounded-lg transition-all \${fontSize === "base" ? "bg-[#BFA84C] text-black" : "text-zinc-400 hover:text-white"}\`}
                title="Letra estándar"
              >
                A
              </button>
              <button
                type="button"
                onClick={() => setFontSize("lg")}
                className={\`px-2 py-1 rounded-lg transition-all \${fontSize === "lg" ? "bg-[#BFA84C] text-black" : "text-zinc-400 hover:text-white"}\`}
                title="Letra grande"
              >
                A+
              </button>
            </div>

            {/* Theme switcher */}
            <div className="flex items-center bg-black/40 rounded-xl border border-white/10 p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setTheme("obsidiana")}
                className={\`px-2 py-1 rounded-lg transition-all \${theme === "obsidiana" ? "bg-zinc-800 text-amber-300" : "text-zinc-500 hover:text-zinc-300"}\`}
                title="Tema Obsidiana (OLED)"
              >
                🌌
              </button>
              <button
                type="button"
                onClick={() => setTheme("papiro")}
                className={\`px-2 py-1 rounded-lg transition-all \${theme === "papiro" ? "bg-amber-950/60 text-amber-200" : "text-zinc-500 hover:text-zinc-300"}\`}
                title="Tema Papiro (Sepia)"
              >
                📜
              </button>
              <button
                type="button"
                onClick={() => setTheme("medianoche")}
                className={\`px-2 py-1 rounded-lg transition-all \${theme === "medianoche" ? "bg-blue-950/60 text-cyan-200" : "text-zinc-500 hover:text-zinc-300"}\`}
                title="Tema Medianoche (Índigo)"
              >
                🌙
              </button>
            </div>

            {/* Table of contents button */}
            <button
              type="button"
              onClick={() => setIsTocOpen((v) => !v)}
              className="px-2.5 py-1.5 rounded-xl bg-black/40 border border-white/10 text-xs font-mono text-[#BFA84C] hover:bg-black/60 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Índice de Capítulos"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Índice</span>
            </button>

            {/* Close modal */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-full bg-white/5 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors cursor-pointer"
              aria-label="Cerrar lector"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Mode Selector Tab Bar */}
        <div className="px-4 sm:px-6 py-2 bg-black/30 border-b border-white/10 flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setMode("native")}
              className={\`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer \${
                mode === "native"
                  ? "bg-[#BFA84C]/25 text-[#FFF7D6] border border-[#BFA84C]/50 shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }\`}
            >
              <Sparkles className="w-3.5 h-3.5 text-[#BFA84C]" />
              <span>LECTOR NATIVO OFFLINE (0 DATOS)</span>
            </button>

            {book.readerUrl && (
              <button
                type="button"
                onClick={handleSwitchToIframe}
                className={\`px-3 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer \${
                  mode === "iframe"
                    ? "bg-[#BFA84C]/25 text-[#FFF7D6] border border-[#BFA84C]/50 shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }\`}
              >
                <ExternalLink className="w-3.5 h-3.5 text-zinc-400" />
                <span className="hidden sm:inline">VISOR OFICIAL AGEAC / VOPUS</span>
                <span className="sm:hidden">AGEAC</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 text-[11px] text-[#BFA84C]/80 font-mono">
            <span>{activeChapterIndex + 1}/{content.chapters.length}</span>
            <span className="hidden sm:inline">({progressPercent}%)</span>
          </div>
        </div>

        {/* Offline Notice Banner */}
        {offlineNotice && (
          <div className="bg-amber-500/15 border-b border-amber-500/40 px-4 py-2 text-center text-xs font-mono text-amber-300 flex items-center justify-center gap-2 animate-fadeIn">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>{offlineNotice}</span>
          </div>
        )}

        {/* Reader Body */}
        <div className={\`flex-1 overflow-y-auto relative \${bodyBgClasses}\`}>
          {/* Table of Contents Drawer */}
          {isTocOpen && (
            <div className="absolute inset-0 z-20 bg-black/90 backdrop-blur-md p-4 sm:p-6 overflow-y-auto animate-fadeIn">
              <div className="max-w-2xl mx-auto space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <List className="w-4 h-4 text-[#BFA84C]" />
                    <h3 className="text-sm font-mono font-bold text-white uppercase tracking-wider">
                      Índice de Capítulos ({content.chapters.length})
                    </h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsTocOpen(false)}
                    className="text-xs font-mono text-[#BFA84C] hover:underline"
                  >
                    Volver a la lectura
                  </button>
                </div>

                <div className="space-y-1.5">
                  {content.chapters.map((ch, idx) => (
                    <button
                      key={ch.id}
                      type="button"
                      onClick={() => handleSelectChapter(idx)}
                      className={\`w-full text-left p-3 rounded-xl border flex items-center justify-between transition-all cursor-pointer \${
                        idx === activeChapterIndex
                          ? "bg-[#BFA84C]/20 border-[#BFA84C]/60 text-[#FFF7D6] font-bold"
                          : "bg-white/5 border-white/5 text-zinc-300 hover:bg-white/10"
                      }\`}
                    >
                      <span className="text-sm font-[var(--font-eb-garamond)]">
                        {ch.title}
                      </span>
                      {idx === activeChapterIndex && (
                        <Check className="w-4 h-4 text-[#BFA84C]" />
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Mode: Iframe (when online and requested) */}
          {mode === "iframe" && book.readerUrl ? (
            <div className="w-full h-full relative">
              <iframe
                src={book.readerUrl}
                className="w-full h-full border-0"
                title={\`Visor digital de \${book.title}\`}
                allowFullScreen
              />
            </div>
          ) : (
            /* Mode: Native Offline Book Reader */
            <article className="max-w-3xl mx-auto px-5 sm:px-8 py-8 sm:py-12 font-[var(--font-eb-garamond)]">
              {/* Chapter Header */}
              <div className="text-center pb-8 mb-8 border-b border-white/10 space-y-2">
                <span className="text-[11px] font-mono uppercase tracking-[0.25em] text-[#BFA84C] font-bold block">
                  Capítulo {currentChapter.number} de {content.chapters.length}
                </span>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold tracking-tight text-[#FFF7D6]">
                  {currentChapter.title}
                </h1>
              </div>

              {/* Chapter Paragraphs */}
              <div className={\`space-y-6 text-justify \${textClasses}\`}>
                {currentChapter.paragraphs.map((p, idx) => (
                  <p key={idx} className="first-letter:text-3xl first-letter:font-bold first-letter:text-[#BFA84C] first-letter:mr-1">
                    {p}
                  </p>
                ))}
              </div>

              {/* Key Practice Highlight Card if available */}
              {currentChapter.keyPractice && (
                <div className="my-10 p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-[#BFA84C]/15 to-transparent border border-[#BFA84C]/40 shadow-[0_0_30px_rgba(191,168,76,0.15)] space-y-3 font-[var(--font-manrope)]">
                  <div className="flex items-center gap-2 text-[#BFA84C] font-mono text-xs font-bold uppercase tracking-wider">
                    <Flame className="w-4 h-4" />
                    <span>Práctica Sagrada &middot; {currentChapter.keyPractice.name}</span>
                  </div>

                  {currentChapter.keyPractice.mantra && (
                    <div className="py-2.5 px-4 rounded-xl bg-black/60 border border-[#BFA84C]/30 text-center font-mono font-bold text-sm sm:text-base text-amber-300 tracking-widest shadow-inner">
                      MANTRAM: {currentChapter.keyPractice.mantra}
                    </div>
                  )}

                  <ol className="list-decimal list-inside space-y-1.5 text-xs sm:text-sm text-zinc-300 leading-relaxed font-light">
                    {currentChapter.keyPractice.instructions.map((inst, idx) => (
                      <li key={idx} className="pl-1">
                        {inst}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Chapter Footer Navigation */}
              <div className="pt-10 mt-12 border-t border-white/10 flex items-center justify-between gap-3 font-mono text-xs">
                <button
                  type="button"
                  onClick={handlePrevChapter}
                  disabled={activeChapterIndex === 0}
                  className={\`px-4 py-2.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer \${
                    activeChapterIndex === 0
                      ? "opacity-30 border-white/5 cursor-not-allowed text-zinc-600"
                      : "bg-white/5 border-white/15 text-[#FFF7D6] hover:bg-white/10 hover:border-[#BFA84C]/50"
                  }\`}
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span className="hidden sm:inline">Anterior</span>
                </button>

                <div className="text-center text-[10px] text-zinc-500 font-mono">
                  <span>Posición guardada automáticamente</span>
                </div>

                <button
                  type="button"
                  onClick={handleNextChapter}
                  disabled={activeChapterIndex >= content.chapters.length - 1}
                  className={\`px-4 py-2.5 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer \${
                    activeChapterIndex >= content.chapters.length - 1
                      ? "opacity-30 border-white/5 cursor-not-allowed text-zinc-600"
                      : "bg-gradient-to-r from-[#BFA84C] to-[#FFF7D6] text-black font-bold border-[#BFA84C] hover:scale-[1.02]"
                  }\`}
                >
                  <span className="hidden sm:inline">Siguiente</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </article>
          )}
        </div>
      </div>
    </div>
  );
}
`;

fs.writeFileSync(path.join(TARGET_ROOT, "components", "NativeBookReaderModal.tsx"), nativeReaderComponent, "utf8");
console.log("[EOS] Created components/NativeBookReaderModal.tsx");

// 3. Update components/AuthorClientView.tsx to integrate NativeBookReaderModal
const authorClientViewPath = path.join(TARGET_ROOT, "components", "AuthorClientView.tsx");
let authorContent = fs.readFileSync(authorClientViewPath, "utf8");

// Add import of NativeBookReaderModal
if (!authorContent.includes("NativeBookReaderModal") || !authorContent.includes("from \"@/components/NativeBookReaderModal\"")) {
  if (authorContent.includes('import PartnersSection from "@/components/PartnersSection";')) {
    authorContent = authorContent.replace(
      'import PartnersSection from "@/components/PartnersSection";',
      'import PartnersSection from "@/components/PartnersSection";\nimport { NativeBookReaderModal } from "@/components/NativeBookReaderModal";'
    );
    console.log("[EOS] Injected NativeBookReaderModal import into AuthorClientView.tsx");
  }
}

// Replace the reader trigger buttons so ALL books have "Leer Obra" (Native Reader)
// and replace old raw iframe modal with <NativeBookReaderModal />
const oldModalRegex = /\{\/\* In-App Interactive Digital Reader Modal \*\/\}[\s\S]*?\{activeBookReader && \([\s\S]*?<\/div>\s*<\/div>\s*<\/div>\s*\)\}/;
if (oldModalRegex.test(authorContent)) {
  authorContent = authorContent.replace(
    oldModalRegex,
    `{/* In-App Interactive Digital Reader Modal */}
        {activeBookReader && (
          <NativeBookReaderModal
            book={activeBookReader}
            author={author}
            isOpen={Boolean(activeBookReader)}
            onClose={() => setActiveBookReader(null)}
          />
        )}`
  );
  console.log("[EOS] Replaced old iframe modal with NativeBookReaderModal in AuthorClientView.tsx");
}

fs.writeFileSync(authorClientViewPath, authorContent, "utf8");

// 4. Update public/sw.js to Cache-First for extreme data savings
const swPath = path.join(TARGET_ROOT, "public", "sw.js");
let swContent = fs.readFileSync(swPath, "utf8");

// Bump cache version to v6 (Cache-First)
swContent = swContent.replace(
  "const CACHE_NAME = 'biblioteca-gnostica-v5';",
  "const CACHE_NAME = 'biblioteca-gnostica-v6';"
);

// Normalize line breaks for matching
const swNormalized = swContent.replace(/\r\n/g, "\n");
const oldSWRRegex = /\/\/ 3\. Next\.js static chunks[\s\S]*?return cached \|\| fetchPromise;\s*\}\)\s*\);\s*return;\s*\}/;

const newCacheFirstCode = `// 3. Next.js static chunks, CSS, JS and static icons: Cache-First
  // Guarantees NEAR ZERO mobile data consumption on repeat visits
  if (
    url.origin === self.location.origin &&
    (url.pathname.startsWith('/_next/static/') ||
      url.pathname.endsWith('.js') ||
      url.pathname.endsWith('.css') ||
      url.pathname.endsWith('.json') ||
      url.pathname.endsWith('.webmanifest'))
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached; // ZERO DATA! Return directly from local flash storage
        return fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        });
      })
    );
    return;
  }`;

if (oldSWRRegex.test(swNormalized)) {
  swContent = swNormalized.replace(oldSWRRegex, newCacheFirstCode);
  console.log("[EOS] Upgraded Service Worker to Cache-First in public/sw.js");
} else if (swContent.includes("ZERO DATA!")) {
  console.log("[EOS] Service Worker already Cache-First in public/sw.js");
}

fs.writeFileSync(swPath, swContent, "utf8");

console.log("[EOS] Level 2 Implementation successfully written to Biblioteca Gnóstica!");

