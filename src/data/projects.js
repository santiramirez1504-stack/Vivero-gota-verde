export const PROJECT_CATEGORIES = [
  { id: 'todos', label: 'Todos' },
  { id: 'residencial', label: 'Residencial' },
  { id: 'comercial', label: 'Comercial' },
  { id: 'eventos', label: 'Eventos' },
  { id: 'vertical', label: 'Jardinería vertical' },
]

// Los campos "emoji" son marcadores de posición. Cuando conectemos Cloudinary
// (módulo de almacenamiento de imágenes/videos), cada media llevará un campo
// "src" con la URL real y se mostrará una <img>/<video> en su lugar.
export const PROJECTS = [
  {
    id: 'proy-1',
    title: 'Jardín zen residencial',
    category: 'residencial',
    location: 'Zona Norte',
    description: 'Rediseño completo de patio trasero con senderos de piedra, iluminación y vegetación de bajo mantenimiento.',
    cover: '🏡',
    media: [
      { type: 'image', emoji: '🏡' },
      { type: 'image', emoji: '🌿' },
      { type: 'video', src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
    ],
  },
  {
    id: 'proy-2',
    title: 'Terraza corporativa moderna',
    category: 'comercial',
    location: 'Centro empresarial',
    description: 'Diseño de área verde para zona de descanso de oficinas, combinando ornamentales y mobiliario exterior.',
    cover: '🏢',
    media: [
      { type: 'image', emoji: '🏢' },
      { type: 'image', emoji: '🪴' },
      { type: 'image', emoji: '🌳' },
    ],
  },
  {
    id: 'proy-3',
    title: 'Boda al aire libre',
    category: 'eventos',
    location: 'Finca Los Robles',
    description: 'Decoración vegetal temporal para ceremonia y recepción, con arcos florales y senderos iluminados.',
    cover: '🎉',
    media: [
      { type: 'image', emoji: '🎉' },
      { type: 'image', emoji: '💐' },
      { type: 'video', src: 'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4' },
    ],
  },
  {
    id: 'proy-4',
    title: 'Muro verde para oficina',
    category: 'vertical',
    location: 'Torre Andina',
    description: 'Instalación de jardín vertical interior con sistema de riego integrado, mejorando el aire del espacio.',
    cover: '🪴',
    media: [
      { type: 'image', emoji: '🪴' },
      { type: 'image', emoji: '🌿' },
    ],
  },
  {
    id: 'proy-5',
    title: 'Patio familiar con huerto',
    category: 'residencial',
    location: 'Urbanización El Sauce',
    description: 'Integración de huerto de hierbas y frutales junto a una zona de juegos infantiles.',
    cover: '🍋',
    media: [
      { type: 'image', emoji: '🍋' },
      { type: 'image', emoji: '🌳' },
      { type: 'image', emoji: '🌻' },
    ],
  },
  {
    id: 'proy-6',
    title: 'Recepción hotelera',
    category: 'comercial',
    location: 'Hotel Vista Verde',
    description: 'Renovación del lobby exterior con palmeras, macetas decorativas y ornamentales de temporada.',
    cover: '🌴',
    media: [
      { type: 'image', emoji: '🌴' },
      { type: 'image', emoji: '🏺' },
    ],
  },
]
