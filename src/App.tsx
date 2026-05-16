import { useEffect, useMemo, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { useAuthActions, useConvexAuth } from '@convex-dev/auth/react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../convex/_generated/api'
import { chileRegions, defaultRegionCode, getRegionByCode } from './data/chileLocations'
import { worldCup2026Catalog, type StickerCatalogItem } from './data/worldCup2026Stickers'

type AppSection = 'inicio' | 'album' | 'matches' | 'perfil'
type StickerStatus = 'owned' | 'duplicate' | 'wanted' | 'match'
type AlbumFilter = 'all' | 'missing' | 'owned' | 'duplicates' | 'wanted'
type WantedMode = 'allMissing' | 'specific'
type AlbumEditMode = 'owned' | 'duplicate' | 'wanted'
type MatchScope = 'short' | 'medium' | 'long'
type AuthStep = 'signIn' | 'signUp'

type StoredAlbumState = {
  owned: string[]
  duplicates: string[]
  wanted: string[]
  wantedMode: WantedMode
}

type AlbumSyncStatus = 'pending' | 'syncing' | 'synced' | 'offline'

type AlbumSnapshot = {
  ownedCount: number
  duplicateCount: number
  wantedCount: number
  missingCount: number
  completionPercent: number
}

type Sticker = {
  id: string
  name: string
  group: string
  status: StickerStatus
  quantity?: number
}

type Match = {
  id: string
  collector: string
  location: string
  compatibility: number
  offers: string[]
  receives: string[]
  hasContact?: boolean
  whatsapp?: string
  instagram?: string | null
  featured?: boolean
}

type AlbumTeam = {
  section: string
  name: string
}

type AlbumGroup = {
  id: string
  name: string
  teams: AlbumTeam[]
}

type SalesPoint = {
  name: string
  address: string
  commune: string
  region: string
}

type VisibleAlbumTeam = AlbumTeam & {
  stickers: StickerCatalogItem[]
}

type VisibleAlbumGroup = Omit<AlbumGroup, 'teams'> & {
  teams: VisibleAlbumTeam[]
}

const navigation: { id: AppSection; label: string }[] = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'album', label: 'Mi álbum' },
  { id: 'matches', label: 'Matches' },
  { id: 'perfil', label: 'Perfil' },
]

const albumFilters: { id: AlbumFilter; label: string }[] = [
  { id: 'all', label: 'Todas' },
  { id: 'missing', label: 'Faltantes' },
  { id: 'owned', label: 'Tengo' },
  { id: 'duplicates', label: 'Repetidas' },
  { id: 'wanted', label: 'Buscadas' },
]

const wantedModes: { id: WantedMode; label: string; description: string }[] = [
  { id: 'allMissing', label: 'Todas las faltantes', description: 'Cualquier lámina que no tengas sirve para match.' },
  { id: 'specific', label: 'Solo específicas', description: 'Tú marcas exactamente cuáles estás buscando.' },
]

const albumEditModes: { id: AlbumEditMode; label: string; description: string }[] = [
  { id: 'owned', label: 'Tengo', description: 'Toca para marcar o quitar' },
  { id: 'duplicate', label: 'Repetida', description: 'Solo si ya la tienes' },
  { id: 'wanted', label: 'Busco', description: 'Marca faltantes específicas' },
]

const teamCodes: Record<string, string> = {
  ALGERIA: 'ALG',
  ARGENTINA: 'ARG',
  AUSTRALIA: 'AUS',
  AUSTRIA: 'AUT',
  BELGIUM: 'BEL',
  'BOSNIA-HERZEGOVINA': 'BIH',
  BRAZIL: 'BRA',
  CANADA: 'CAN',
  'CAPE VERDE': 'CPV',
  COLOMBIA: 'COL',
  'CONGO DR': 'COD',
  CROATIA: 'CRO',
  CURACAO: 'CUW',
  CZECHIA: 'CZE',
  ECUADOR: 'ECU',
  EGYPT: 'EGY',
  ENGLAND: 'ENG',
  FRANCE: 'FRA',
  GERMANY: 'GER',
  GHANA: 'GHA',
  HAITI: 'HAI',
  IRAN: 'IRN',
  IRAQ: 'IRQ',
  'IVORY COAST': 'CIV',
  JAPAN: 'JPN',
  JORDAN: 'JOR',
  'KOREA REPUBLIC': 'KOR',
  MEXICO: 'MEX',
  MOROCCO: 'MAR',
  NETHERLANDS: 'NED',
  'NEW ZEALAND': 'NZL',
  NORWAY: 'NOR',
  PANAMA: 'PAN',
  PARAGUAY: 'PAR',
  PORTUGAL: 'POR',
  QATAR: 'QAT',
  'SAUDI ARABIA': 'KSA',
  SCOTLAND: 'SCO',
  SENEGAL: 'SEN',
  'SOUTH AFRICA': 'RSA',
  SPAIN: 'ESP',
  SWEDEN: 'SWE',
  SWITZERLAND: 'SUI',
  TUNISIA: 'TUN',
  TURKEY: 'TUR',
  URUGUAY: 'URU',
  USA: 'USA',
  UZBEKISTAN: 'UZB',
}

const albumGroups: AlbumGroup[] = [
  {
    id: 'A',
    name: 'Grupo A',
    teams: [
      { section: 'MEXICO', name: 'México' },
      { section: 'SOUTH AFRICA', name: 'Sudáfrica' },
      { section: 'KOREA REPUBLIC', name: 'República de Corea' },
      { section: 'CZECHIA', name: 'Chequia' },
    ],
  },
  {
    id: 'B',
    name: 'Grupo B',
    teams: [
      { section: 'CANADA', name: 'Canadá' },
      { section: 'BOSNIA-HERZEGOVINA', name: 'Bosnia y Herzegovina' },
      { section: 'QATAR', name: 'Catar' },
      { section: 'SWITZERLAND', name: 'Suiza' },
    ],
  },
  {
    id: 'C',
    name: 'Grupo C',
    teams: [
      { section: 'BRAZIL', name: 'Brasil' },
      { section: 'MOROCCO', name: 'Marruecos' },
      { section: 'HAITI', name: 'Haití' },
      { section: 'SCOTLAND', name: 'Escocia' },
    ],
  },
  {
    id: 'D',
    name: 'Grupo D',
    teams: [
      { section: 'USA', name: 'EE. UU.' },
      { section: 'PARAGUAY', name: 'Paraguay' },
      { section: 'AUSTRALIA', name: 'Australia' },
      { section: 'TURKEY', name: 'Turquía' },
    ],
  },
  {
    id: 'E',
    name: 'Grupo E',
    teams: [
      { section: 'GERMANY', name: 'Alemania' },
      { section: 'CURACAO', name: 'Curazao' },
      { section: 'IVORY COAST', name: 'Costa de Marfil' },
      { section: 'ECUADOR', name: 'Ecuador' },
    ],
  },
  {
    id: 'F',
    name: 'Grupo F',
    teams: [
      { section: 'NETHERLANDS', name: 'Países Bajos' },
      { section: 'JAPAN', name: 'Japón' },
      { section: 'SWEDEN', name: 'Suecia' },
      { section: 'TUNISIA', name: 'Túnez' },
    ],
  },
  {
    id: 'G',
    name: 'Grupo G',
    teams: [
      { section: 'BELGIUM', name: 'Bélgica' },
      { section: 'EGYPT', name: 'Egipto' },
      { section: 'IRAN', name: 'RI de Irán' },
      { section: 'NEW ZEALAND', name: 'Nueva Zelanda' },
    ],
  },
  {
    id: 'H',
    name: 'Grupo H',
    teams: [
      { section: 'SPAIN', name: 'España' },
      { section: 'CAPE VERDE', name: 'Islas de Cabo Verde' },
      { section: 'SAUDI ARABIA', name: 'Arabia Saudí' },
      { section: 'URUGUAY', name: 'Uruguay' },
    ],
  },
  {
    id: 'I',
    name: 'Grupo I',
    teams: [
      { section: 'FRANCE', name: 'Francia' },
      { section: 'SENEGAL', name: 'Senegal' },
      { section: 'IRAQ', name: 'Irak' },
      { section: 'NORWAY', name: 'Noruega' },
    ],
  },
  {
    id: 'J',
    name: 'Grupo J',
    teams: [
      { section: 'ARGENTINA', name: 'Argentina' },
      { section: 'ALGERIA', name: 'Argelia' },
      { section: 'AUSTRIA', name: 'Austria' },
      { section: 'JORDAN', name: 'Jordania' },
    ],
  },
  {
    id: 'K',
    name: 'Grupo K',
    teams: [
      { section: 'PORTUGAL', name: 'Portugal' },
      { section: 'CONGO DR', name: 'RD Congo' },
      { section: 'UZBEKISTAN', name: 'Uzbekistán' },
      { section: 'COLOMBIA', name: 'Colombia' },
    ],
  },
  {
    id: 'L',
    name: 'Grupo L',
    teams: [
      { section: 'ENGLAND', name: 'Inglaterra' },
      { section: 'CROATIA', name: 'Croacia' },
      { section: 'GHANA', name: 'Ghana' },
      { section: 'PANAMA', name: 'Panamá' },
    ],
  },
  {
    id: 'specials',
    name: 'Especiales',
    teams: [
      { section: 'PANINI', name: 'Especial 00' },
      { section: 'FIFA WORLD CUP', name: 'Torneo' },
      { section: 'COCA COLA', name: 'Coca-Cola' },
      { section: 'WORLD CUP HISTORY', name: 'Historia' },
    ],
  },
]

const catalogStickersBySection = new Map<string, StickerCatalogItem[]>()

for (const sticker of worldCup2026Catalog.stickers) {
  const stickers = catalogStickersBySection.get(sticker.section) ?? []
  stickers.push(sticker)
  catalogStickersBySection.set(sticker.section, stickers)
}

function getTeamCode(section: string) {
  return teamCodes[section]
}

function getStickerDisplayNumber(sticker: StickerCatalogItem) {
  const code = getTeamCode(sticker.section)

  return code ? `${code} ${sticker.number}` : sticker.number
}

const matchScopes: { id: MatchScope; label: string; description: string }[] = [
  { id: 'short', label: 'Corto', description: 'Comuna' },
  { id: 'medium', label: 'Medio', description: 'Región' },
  { id: 'long', label: 'Largo', description: 'Todo Chile' },
]

const stickerStats = [
  { label: 'Láminas registradas', value: '128', hint: 'de tu colección' },
  { label: 'Repetidas listas', value: '34', hint: 'para ofrecer' },
  { label: 'Matches posibles', value: '12', hint: 'en tu zona' },
]

const sampleStickers: Sticker[] = [
  { id: 'CHI-012', name: 'Defensa central', group: 'Chile', status: 'duplicate', quantity: 2 },
  { id: 'ARG-044', name: 'Mediocampista', group: 'Argentina', status: 'wanted' },
  { id: 'BRA-108', name: 'Arquero titular', group: 'Brasil', status: 'owned' },
]

const matches: Match[] = [
  {
    id: 'match-1',
    collector: 'Martina R.',
    location: 'Ñuñoa, RM',
    compatibility: 8,
    offers: ['ARG-044', 'CHI-018', 'URU-076'],
    receives: ['CHI-012', 'COL-052'],
    hasContact: true,
    whatsapp: '+56 9 1234 5678',
    instagram: 'albumtraderchile',
    featured: true,
  },
  {
    id: 'match-2',
    collector: 'Felipe A.',
    location: 'Providencia, RM',
    compatibility: 5,
    offers: ['BRA-108', 'PER-021'],
    receives: ['COL-052', 'CHI-012', 'ECU-033'],
    hasContact: true,
    whatsapp: '+56 9 8765 4321',
  },
  {
    id: 'match-3',
    collector: 'Camila S.',
    location: 'Viña del Mar, Valparaíso',
    compatibility: 2,
    offers: ['URU-076'],
    receives: ['CHI-012'],
    hasContact: true,
    whatsapp: '+56 9 1111 2222',
  },
]

const salesPoints: SalesPoint[] = [
  { name: 'Galería Costa Azul', address: 'Carvallo 559, Local 10', commune: 'Copiapó', region: 'Copiapó' },
  { name: 'Stripcenter Petrobras', address: 'Av. 4 esquinas 1580, Local 8', commune: 'La Serena', region: 'La Serena' },
  { name: 'Mall Paseo Balmaceda', address: 'Balmaceda 2885, Local 219A', commune: 'La Serena', region: 'La Serena' },
  { name: 'Mall Paseo Viña centro', address: 'Av. Valparaíso 1070, Local 3036', commune: 'Viña del Mar', region: 'Valparaíso' },
  { name: 'Mall paseo Ross', address: 'Av Argentina 540, Local 102', commune: 'Valparaíso', region: 'Valparaíso' },
  { name: 'Strip Center Curauma', address: 'Av. Curauma Norte 2961, Local 11', commune: 'Curauma', region: 'Valparaíso' },
  { name: 'Galería Drugstore', address: 'Las Urbinas 37, local 41 y 42', commune: 'Providencia', region: 'Metropolitana De Santiago' },
  { name: 'Mall Plaza Norte', address: 'Av. Américo Vespucio 1737, Local 2153 - 2157A', commune: 'Huechuraba', region: 'Metropolitana De Santiago' },
  { name: 'Mall Plaza Egaña', address: 'Av. Larraín 5862, Local A-3049', commune: 'La Reina', region: 'Metropolitana De Santiago' },
  { name: 'Espacio Urbano Maipú', address: 'Av. Los Pajaritos 1790, Local 2008', commune: 'Maipú', region: 'Metropolitana De Santiago' },
  { name: 'Espacio Urbano La Dehesa', address: 'El Rodeo 12850, Local 27', commune: 'Lo Barnechea', region: 'Metropolitana De Santiago' },
  { name: 'Mall Plaza Los Dominicos', address: 'Av. Padre Hurtado Sur 875, Local B-3060', commune: 'Las Condes', region: 'Metropolitana De Santiago' },
  { name: 'Mall Plaza Vespucio', address: 'Av. Vicuña Mackenna Oriente N°7110, Local 380-381A', commune: 'La Florida', region: 'Metropolitana De Santiago' },
  { name: 'Mall Plaza Oeste', address: 'Av. Américo Vespucio 1501, Local 373', commune: 'Cerrillos', region: 'Metropolitana De Santiago' },
  { name: 'Stripcenter Santa Isabel', address: 'Av. Virginia Subercaseux 475, Local 4', commune: 'Pirque', region: 'Metropolitana De Santiago' },
  { name: 'Tienda', address: 'Campos 489-B', commune: 'Rancagua', region: "Lib. Gral. Bernardo O'Higgins" },
  { name: 'Mall Paseo Parque Machalí', address: 'Avenida San Juan 133, Local 23', commune: 'Rancagua', region: "Lib. Gral. Bernardo O'Higgins" },
  { name: 'Galería Diego Portales', address: 'El Roble 868, Local 14', commune: 'Chillán', region: 'Ñuble' },
  { name: 'Galeria Babaria', address: '6 Oriente 1050, Local 27', commune: 'Talca', region: 'Maule' },
  { name: 'Boulevard Central', address: 'Peña 459, Local 11', commune: 'Curicó', region: 'Maule' },
  { name: 'Tienda', address: 'Freire 522, Local 156', commune: 'Concepción', region: 'Biobío' },
  { name: 'Galería Altamira', address: 'Bulnes 314, Local 4', commune: 'Temuco', region: 'La Araucanía' },
  { name: 'Tienda', address: 'Concepción 902', commune: 'Puerto Montt', region: 'Los Lagos' },
  { name: 'Mall Zona Franca', address: 'Manzana 18, Zona Franca, Local 245', commune: 'Punta Arenas', region: 'Magallanes y De La Antártica Chilena' },
]

const steps = [
  'Crea tu cuenta con correo y contraseña, sin esperar verificaciones.',
  'Marca las láminas que tienes, repetidas y buscadas.',
  'Encuentra matches y decide a quién contactar para intercambiar.',
]

const landingBenefits = [
  'Perfil chileno con región y comuna para priorizar cercanía.',
  'Contactos privados: WhatsApp e Instagram aparecen solo con compatibilidad real.',
  'PWA instalable para revisar tu álbum desde el celular.',
]

const statusLabels: Record<StickerStatus, string> = {
  owned: 'La tienes',
  duplicate: 'Repetida',
  wanted: 'Buscada',
  match: 'Match',
}

const statusStyles: Record<StickerStatus, string> = {
  owned: 'bg-blue-100 text-blue-950',
  duplicate: 'bg-[#D90429] text-white',
  wanted: 'bg-[#DBEAFE] text-[#0B1739]',
  match: 'bg-green-600 text-white',
}

const albumStorageKey = 'album-trader-chile.album.v1'
const albumPendingSyncKey = 'album-trader-chile.album.pending-sync.v1'
const matchesStorageKey = 'album-trader-chile.matches.v1'
const localAppAccessKey = 'album-trader-chile.local-app-access.v1'

const defaultAlbumState: StoredAlbumState = {
  owned: ['MEXICO-1', 'MEXICO-7', 'SOUTH AFRICA-3', 'KOREA REPUBLIC-18', 'CANADA-20'],
  duplicates: ['MEXICO-7'],
  wanted: ['QATAR-1', 'ARGENTINA-10'],
  wantedMode: 'allMissing',
}

function readStoredAlbumState(): StoredAlbumState {
  if (typeof window === 'undefined') return defaultAlbumState

  try {
    const rawState = window.localStorage.getItem(albumStorageKey)

    if (!rawState) return defaultAlbumState

    const parsedState = JSON.parse(rawState) as Partial<StoredAlbumState>

    return {
      owned: Array.isArray(parsedState.owned) ? parsedState.owned : defaultAlbumState.owned,
      duplicates: Array.isArray(parsedState.duplicates) ? parsedState.duplicates : defaultAlbumState.duplicates,
      wanted: Array.isArray(parsedState.wanted) ? parsedState.wanted : defaultAlbumState.wanted,
      wantedMode: parsedState.wantedMode === 'specific' ? 'specific' : 'allMissing',
    }
  } catch {
    return defaultAlbumState
  }
}

function writeStoredAlbumState(state: StoredAlbumState) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(albumStorageKey, JSON.stringify(state))
}

function markAlbumPendingSync() {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(albumPendingSyncKey, 'true')
}

function clearAlbumPendingSync() {
  if (typeof window === 'undefined') return

  window.localStorage.removeItem(albumPendingSyncKey)
}

function hasPendingAlbumSync() {
  if (typeof window === 'undefined') return false

  return window.localStorage.getItem(albumPendingSyncKey) === 'true'
}

function readStoredMatches(): Match[] {
  if (typeof window === 'undefined') return []

  try {
    const rawMatches = window.localStorage.getItem(matchesStorageKey)
    if (!rawMatches) return []

    const parsedMatches = JSON.parse(rawMatches)

    return Array.isArray(parsedMatches) ? parsedMatches : []
  } catch {
    return []
  }
}

function writeStoredMatches(nextMatches: Match[]) {
  if (typeof window === 'undefined') return

  window.localStorage.setItem(matchesStorageKey, JSON.stringify(nextMatches))
}

function normalizeText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

function sortSalesPointsForProfile(points: SalesPoint[], profile: { commune: string; regionName: string } | null | undefined) {
  if (!profile) return points

  const profileCommune = normalizeText(profile.commune)
  const profileRegion = normalizeText(profile.regionName)

  return [...points].sort((a, b) => {
    const aCommuneMatch = normalizeText(a.commune) === profileCommune
    const bCommuneMatch = normalizeText(b.commune) === profileCommune
    const aRegionMatch = profileRegion.includes(normalizeText(a.region)) || normalizeText(a.region).includes(profileRegion)
    const bRegionMatch = profileRegion.includes(normalizeText(b.region)) || normalizeText(b.region).includes(profileRegion)

    if (aCommuneMatch !== bCommuneMatch) return aCommuneMatch ? -1 : 1
    if (aRegionMatch !== bRegionMatch) return aRegionMatch ? -1 : 1

    return a.commune.localeCompare(b.commune, 'es-CL') || a.name.localeCompare(b.name, 'es-CL')
  })
}

function getShortRegion(regionName: string) {
  if (normalizeText(regionName).includes('metropolitana')) return 'RM'
  if (normalizeText(regionName).includes('valparaiso')) return 'Valparaíso'
  return regionName.replace(/^Región de |^Región del |^Región /, '')
}

function getAlbumSnapshot(state = readStoredAlbumState()): AlbumSnapshot {
  const ownedCount = state.owned.length
  const duplicateCount = state.duplicates.length
  const missingCount = Math.max(worldCup2026Catalog.totalStickers - ownedCount, 0)
  const wantedCount = state.wantedMode === 'allMissing' ? missingCount : state.wanted.length

  return {
    ownedCount,
    duplicateCount,
    wantedCount,
    missingCount,
    completionPercent: Math.round((ownedCount / worldCup2026Catalog.totalStickers) * 100),
  }
}

function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine)

    window.addEventListener('online', updateOnlineStatus)
    window.addEventListener('offline', updateOnlineStatus)

    return () => {
      window.removeEventListener('online', updateOnlineStatus)
      window.removeEventListener('offline', updateOnlineStatus)
    }
  }, [])

  return isOnline
}

function App() {
  const { isAuthenticated, isLoading } = useConvexAuth()
  const { signOut } = useAuthActions()
  const currentProfile = useQuery(api.profiles.current)
  const [activeSection, setActiveSection] = useState<AppSection>('inicio')
  const isOnline = useOnlineStatus()
  const [hasLocalAppAccess, setHasLocalAppAccess] = useState(() => {
    if (typeof window === 'undefined') return false

    return window.localStorage.getItem(localAppAccessKey) === 'true'
  })
  const isAppPreview =
    import.meta.env.DEV && new URLSearchParams(window.location.search).get('preview') === 'app'

  useEffect(() => {
    if (!isAuthenticated && !isAppPreview) return

    window.localStorage.setItem(localAppAccessKey, 'true')
  }, [isAppPreview, isAuthenticated])

  const canUseLocalApp =
    hasLocalAppAccess || isAuthenticated || isAppPreview || window.localStorage.getItem(localAppAccessKey) === 'true'

  const handleSignOut = () => {
    window.localStorage.removeItem(localAppAccessKey)
    setHasLocalAppAccess(false)
    void signOut()
  }

  if (isAuthenticated || isAppPreview || (!isOnline && canUseLocalApp)) {
    return (
      <AuthenticatedApp
        activeSection={activeSection}
        currentLocation={currentProfile ? `${currentProfile.commune} · ${getShortRegion(currentProfile.regionName)}` : 'Completa tu perfil'}
        currentUserName={currentProfile?.displayName ?? (isAppPreview ? 'Preview' : 'Coleccionista')}
        onNavigate={setActiveSection}
        onSignOut={handleSignOut}
      />
    )
  }

  return <LandingPage isLoading={isLoading} />
}

function LandingPage({ isLoading }: { isLoading: boolean }) {
  return (
    <main className="min-h-screen overflow-hidden bg-[#0B1739] text-white">
      <section className="relative isolate min-h-screen px-5 py-6 sm:px-8 lg:px-12">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_86%_17%,rgba(255,255,255,0.18),transparent_12rem),linear-gradient(140deg,transparent_0_45%,#d90429_45%_65%,#ffffff_65%_69%,transparent_69%_100%)]" />
        <div className="absolute left-1/2 top-20 -z-10 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-400/10 blur-3xl" />

        <PublicNav />

        <div className="mx-auto grid w-full max-w-7xl items-center gap-12 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
          <div className="max-w-3xl">
            <p className="mb-5 inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/85 backdrop-blur">
              App para coleccionistas en Chile
            </p>
            <h1 className="text-5xl font-black leading-[0.92] tracking-[-0.08em] sm:text-7xl lg:text-8xl">
              Busca, ofrece y encuentra matches en Chile.
            </h1>
            <p className="mt-7 max-w-2xl text-lg leading-8 text-white/75">
              Registra las láminas que tienes, tus repetidas y las que buscas.
              Album Trader Chile encuentra coleccionistas compatibles para que
              coordinen el intercambio por WhatsApp o Instagram.
            </p>
            <div className="mt-9 flex flex-col gap-3 sm:flex-row">
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full bg-white px-6 text-base font-black text-[#0B1739] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-blue-50"
                href="#crear-cuenta"
              >
                Crear cuenta gratis
              </a>
              <a
                className="inline-flex min-h-12 items-center justify-center rounded-full border border-white/25 px-6 text-base font-black text-white transition hover:-translate-y-0.5 hover:bg-white/10"
                href="#como-funciona"
              >
                Ver cómo funciona
              </a>
            </div>
            <p className="mt-5 text-sm font-semibold text-white/55">
              Matches, grupos y mercado para coordinar fuera de la app.
            </p>
            <AuthCard isLoading={isLoading} />
          </div>

          <HeroPreview />
        </div>
      </section>

      <HowItWorks />
      <LandingBenefits />
      <PublicTrustSection />
    </main>
  )
}

function PublicNav() {
  return (
    <nav className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4" aria-label="Principal">
      <a className="flex items-center gap-3 font-black tracking-[-0.04em]" href="#top">
        <LogoMark />
        <span>Album Trader Chile</span>
      </a>
      <div className="hidden items-center gap-2 md:flex">
        <a className="rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-bold text-white/85 backdrop-blur transition hover:bg-white/15" href="#como-funciona">
          Cómo funciona
        </a>
        <a className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#0B1739] transition hover:bg-blue-50" href="#crear-cuenta">
          Entrar
        </a>
      </div>
    </nav>
  )
}

function AuthCard({ isLoading }: { isLoading: boolean }) {
  const { signIn } = useAuthActions()
  const [step, setStep] = useState<AuthStep>('signIn')
  const [errorMessage, setErrorMessage] = useState('')

  const submitCredentials = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setErrorMessage('')
    const formData = new FormData(event.currentTarget)

    void signIn('password', formData)
      .catch(() => {
        if (step !== 'signUp') {
          setErrorMessage('No se pudo iniciar sesión. Revisa tu correo y contraseña.')
          return
        }

        const retryFormData = new FormData(event.currentTarget)
        retryFormData.set('flow', 'signIn')

        void signIn('password', retryFormData)
          .catch(() => setErrorMessage('No se pudo crear la cuenta. Si ya existe, entra con la misma contraseña.'))
      })
  }

  return (
    <div id="crear-cuenta" className="mt-8 scroll-mt-6 rounded-[2rem] border border-white/20 bg-white/10 p-5 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-100">Acceso</p>
          <h2 className="mt-1 text-2xl font-black tracking-[-0.05em]">{step === 'signIn' ? 'Inicia sesión' : 'Crea tu cuenta'}</h2>
          <p className="mt-1 text-sm font-semibold text-white/65">Sin correo de verificación: crea tu cuenta y vuelve a entrar con tu contraseña.</p>
        </div>
        <button
          className="shrink-0 rounded-full bg-white/10 px-3 py-2 text-xs font-black text-white transition hover:bg-white/15"
          onClick={() => setStep(step === 'signIn' ? 'signUp' : 'signIn')}
          type="button"
        >
          {step === 'signIn' ? 'Crear cuenta' : 'Ya tengo cuenta'}
        </button>
      </div>

      <form className="mt-4 grid gap-3" onSubmit={submitCredentials}>
        <input name="flow" type="hidden" value={step} />
        <AuthInput autoComplete="email" label="Correo" name="email" placeholder="tu@email.cl" type="email" />
        <AuthInput autoComplete={step === 'signIn' ? 'current-password' : 'new-password'} label="Contraseña" name="password" placeholder="Mínimo 8 caracteres" type="password" />
        <button
          className="min-h-12 rounded-full bg-white px-6 text-base font-black text-[#0B1739] shadow-xl shadow-black/20 transition hover:-translate-y-0.5 hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-70"
          disabled={isLoading}
          type="submit"
        >
          {isLoading ? 'Conectando...' : step === 'signIn' ? 'Iniciar sesión' : 'Crear cuenta'}
        </button>
      </form>

      {errorMessage ? <p className="mt-3 rounded-2xl bg-red-500/20 px-4 py-3 text-sm font-bold text-red-50">{errorMessage}</p> : null}
    </div>
  )
}

function AuthInput({ label, ...inputProps }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-white/85">
      {label}
      <input
        className="min-h-12 rounded-2xl border border-white/20 bg-white px-4 font-semibold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-white focus:ring-4 focus:ring-white/20"
        required
        {...inputProps}
      />
    </label>
  )
}

function LogoMark() {
  return (
    <span className="grid size-11 -rotate-6 place-items-center rounded-2xl bg-white text-lg font-black text-[#D90429] shadow-[0_8px_0_#D90429]">
      AT
    </span>
  )
}

function HeroPreview() {
  return (
    <div className="grid gap-4 lg:justify-self-end">
      <div className="rounded-[2rem] border border-white/20 bg-white/10 p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-black text-white">Tu resumen</p>
            <p className="mt-1 text-sm text-white/60">Actividad en vivo</p>
          </div>
          <span className="rounded-full bg-[#D90429] px-3 py-1 text-xs font-black">
            Match activo
          </span>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          {stickerStats.map((stat) => (
            <div key={stat.label} className="rounded-3xl bg-[#D90429] p-4">
              <strong className="block text-3xl leading-none">{stat.value}</strong>
              <span className="mt-2 block text-xs font-black text-white/80">{stat.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[0.95fr_1.05fr]">
        <StickerStack stickers={sampleStickers} title="Tus láminas" variant="dark" />
        <MatchSnapshot />
      </div>
    </div>
  )
}

function StickerStack({ stickers, title, variant = 'light' }: { stickers: Sticker[]; title: string; variant?: 'dark' | 'light' }) {
  const isDark = variant === 'dark'

  return (
    <div className={isDark ? 'rounded-[2rem] border border-white/20 bg-white/10 p-5 backdrop-blur-xl' : 'rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm'}>
      <p className={isDark ? 'mb-4 text-sm font-black text-white' : 'mb-4 text-sm font-black text-slate-950'}>{title}</p>
      <div className="grid gap-3">
        {stickers.map((sticker) => (
          <StickerRow key={sticker.id} sticker={sticker} variant={variant} />
        ))}
      </div>
    </div>
  )
}

function StickerRow({ sticker, variant = 'light' }: { sticker: Sticker; variant?: 'dark' | 'light' }) {
  const isDark = variant === 'dark'

  return (
    <div className={isDark ? 'flex items-center justify-between gap-3 rounded-3xl border border-white/15 bg-white/10 p-4' : 'flex items-center justify-between gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4'}>
      <div>
        <strong className={isDark ? 'block text-white' : 'block text-slate-950'}>{sticker.id}</strong>
        <span className={isDark ? 'mt-1 block text-xs text-white/60' : 'mt-1 block text-xs text-slate-500'}>{sticker.group}</span>
      </div>
      <span className={`rounded-full px-3 py-1 text-xs font-black ${statusStyles[sticker.status]}`}>
        {statusLabels[sticker.status]}
      </span>
    </div>
  )
}

function MatchSnapshot() {
  return (
    <div className="rounded-[2rem] border border-white/20 bg-white/10 p-5 backdrop-blur-xl">
      <div className="flex items-center gap-3">
        <div className="grid size-12 place-items-center rounded-full bg-[#D90429] font-black">M</div>
        <div>
          <p className="font-black">Match en Ñuñoa</p>
          <p className="text-sm text-white/60">Contactos desbloqueados</p>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <MetricCard label="Te ofrece" value="5" tone="light" />
        <MetricCard label="Tú ofreces" value="3" tone="red" />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-black">WhatsApp</span>
        <span className="rounded-full bg-white/15 px-3 py-2 text-xs font-black">Instagram</span>
      </div>
    </div>
  )
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'light' | 'red' }) {
  return (
    <div className={tone === 'light' ? 'rounded-3xl bg-white p-4 text-[#0B1739]' : 'rounded-3xl bg-[#D90429] p-4 text-white'}>
      <strong className="block text-3xl leading-none">{value}</strong>
      <span className="mt-2 block text-xs font-black opacity-80">{label}</span>
    </div>
  )
}

function HowItWorks() {
  return (
    <section id="como-funciona" className="bg-white px-5 py-20 text-[#0F172A] sm:px-8 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-[#D90429]">Cómo funciona</p>
          <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.06em] sm:text-6xl">
            Intercambios coordinados fuera de la app.
          </h2>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {steps.map((step, index) => (
            <article className="rounded-[2rem] border border-slate-200 bg-slate-50 p-6" key={step}>
              <span className="grid size-11 place-items-center rounded-2xl bg-[#0B1739] font-black text-white">
                {index + 1}
              </span>
              <p className="mt-6 text-lg font-black leading-7">{step}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function LandingBenefits() {
  return (
    <section className="bg-[#0B1739] px-5 py-18 text-white sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[2rem] border border-white/15 bg-white/10 p-6 backdrop-blur-xl">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-100">Listo para producción</p>
          <h2 className="mt-4 text-4xl font-black leading-none tracking-[-0.06em] sm:text-5xl">
            Tu álbum, tus repetidas y tus matches en un solo lugar.
          </h2>
          <p className="mt-5 text-sm font-semibold leading-6 text-white/65">
            Pensado para coleccionistas en Chile: rápido de actualizar, claro para comparar y simple para coordinar fuera de la plataforma.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-1">
          {landingBenefits.map((benefit) => (
            <article className="rounded-[1.75rem] border border-white/15 bg-white p-5 text-slate-950 shadow-xl shadow-black/10" key={benefit}>
              <p className="text-lg font-black leading-7 tracking-[-0.03em]">{benefit}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

function PublicTrustSection() {
  return (
    <section className="bg-slate-50 px-5 py-16 text-slate-950 sm:px-8 lg:px-12">
      <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.85fr_1.15fr]">
        <div className="rounded-[2rem] bg-[#0B1739] p-6 text-white">
          <p className="text-sm font-black uppercase tracking-[0.18em] text-blue-200">Privacidad</p>
          <h2 className="mt-4 text-3xl font-black tracking-[-0.05em] sm:text-5xl">Contacto externo, sin chat interno.</h2>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {['Sin chat interno', 'Sin logos oficiales', 'Hecho para Chile'].map((label) => (
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6" key={label}>
              <p className="text-lg font-black">{label}</p>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                Una experiencia enfocada en registrar láminas, encontrar compatibilidad y coordinar fuera de la plataforma.
              </p>
            </div>
          ))}
        </div>
        <p className="text-sm text-slate-500 lg:col-span-2">
          Album Trader Chile is an independent project and is not affiliated with Panini, FIFA, or related brands.
        </p>
      </div>
    </section>
  )
}

function AuthenticatedApp({
  activeSection,
  currentLocation,
  currentUserName,
  onNavigate,
  onSignOut,
}: {
  activeSection: AppSection
  currentLocation: string
  currentUserName: string
  onNavigate: (section: AppSection) => void
  onSignOut: () => void
}) {
  const activeLabel = navigation.find((item) => item.id === activeSection)?.label ?? 'Mi álbum'

  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <AppTopBar activeLabel={activeLabel} currentLocation={currentLocation} currentUserName={currentUserName} onSignOut={onSignOut} />

      <div className="mx-auto min-h-screen w-full max-w-6xl px-4 pb-28 pt-24 sm:px-6 lg:px-8">
        <section>
          <ActiveSection section={activeSection} />
        </section>
      </div>

      <BottomNav activeSection={activeSection} onNavigate={onNavigate} />
    </main>
  )
}

function AppTopBar({
  activeLabel,
  currentLocation,
  currentUserName,
  onSignOut,
}: {
  activeLabel: string
  currentLocation: string
  currentUserName: string
  onSignOut: () => void
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-slate-200/80 bg-white/90 px-4 py-3 shadow-sm shadow-slate-950/5 backdrop-blur-xl sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <img className="size-11 shrink-0 rounded-2xl shadow-[0_5px_0_#D90429]" src="/icon.svg" alt="Album Trader Chile" />
          <div className="min-w-0">
            <p className="truncate text-xs font-black uppercase tracking-[0.14em] text-[#D90429]">{activeLabel}</p>
            <h1 className="truncate text-xl font-black tracking-[-0.05em] text-slate-950">{currentUserName}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="hidden rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 sm:inline-flex">
            {currentLocation}
          </span>
          <button
            className="grid min-h-11 min-w-11 place-items-center rounded-full border border-slate-200 bg-white text-sm font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
            onClick={onSignOut}
            title="Cerrar sesión"
          >
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}

function BottomNav({ activeSection, onNavigate }: { activeSection: AppSection; onNavigate: (section: AppSection) => void }) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200/80 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_40px_rgba(15,23,42,0.12)] backdrop-blur-xl" aria-label="Navegación principal">
      <div className="mx-auto grid max-w-xl grid-cols-4 gap-1">
        {navigation.map((item) => {
          const isActive = activeSection === item.id

          return (
            <button
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-2xl px-1 text-[0.68rem] font-black leading-none transition ${
                isActive ? 'bg-[#0B1739] text-white shadow-lg shadow-slate-950/20' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-950'
              }`}
              key={item.id}
              onClick={() => onNavigate(item.id)}
            >
              <NavIcon section={item.id} />
              <span>{item.label}</span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

function NavIcon({ section }: { section: AppSection }) {
  const commonProps = {
    className: 'size-5',
    fill: 'none',
    stroke: 'currentColor',
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    strokeWidth: 2.2,
    viewBox: '0 0 24 24',
  }

  if (section === 'inicio') {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="m3 10 9-7 9 7" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-6h4v6" />
      </svg>
    )
  }

  if (section === 'album') {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M4 5a2 2 0 0 1 2-2h12v18H6a2 2 0 0 1-2-2z" />
        <path d="M8 7h6" />
        <path d="M8 11h8" />
      </svg>
    )
  }

  if (section === 'matches') {
    return (
      <svg {...commonProps} aria-hidden="true">
        <path d="M8 7h8" />
        <path d="M8 12h5" />
        <path d="M12 21a9 9 0 1 0-8.5-6" />
        <path d="m3 21 2.5-5.5" />
        <path d="m16 16 2 2 4-5" />
      </svg>
    )
  }

  return (
    <svg {...commonProps} aria-hidden="true">
      <path d="M20 21a8 8 0 0 0-16 0" />
      <path d="M12 13a5 5 0 1 0 0-10 5 5 0 0 0 0 10" />
    </svg>
  )
}

function ProfileOnboarding() {
  return (
    <section className="rounded-[2rem] border border-amber-200 bg-amber-50 p-5 text-amber-950">
      <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-700">Perfil pendiente</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.04em]">Completa tu perfil para activar matches.</h2>
          <p className="mt-2 text-sm leading-6 text-amber-800">
            Necesitamos nombre visible, región, comuna y WhatsApp. Instagram es opcional para contactos por matches o publicaciones.
          </p>
        </div>
        <button className="min-h-12 rounded-full bg-[#0B1739] px-5 text-sm font-black text-white">Completar perfil</button>
      </div>
    </section>
  )
}

function ActiveSection({ section }: { section: AppSection }) {
  if (section === 'album') return <AlbumSection />
  if (section === 'matches') return <MatchesSection />
  if (section === 'perfil') return <ProfileSection />
  return <DashboardSection />
}

function DashboardSection() {
  const snapshot = getAlbumSnapshot()

  return (
    <div className="grid gap-4">
      <section className="rounded-[2rem] bg-[#0B1739] p-5 text-white shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
              <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-200">Resumen</p>
              <h2 className="mt-2 text-3xl font-black tracking-[-0.06em]">Álbum Mundial 2026</h2>
            </div>
            <strong className="rounded-full bg-white px-4 py-2 text-sm font-black text-[#0B1739]">
            {snapshot.completionPercent}%
          </strong>
        </div>
        <div className="mt-5 h-4 overflow-hidden rounded-full bg-white/15">
          <div className="h-full rounded-full bg-[#D90429]" style={{ width: `${snapshot.completionPercent}%` }} />
        </div>
        <div className="mt-3 flex items-center justify-between text-sm font-bold text-white/70">
          <span>{snapshot.ownedCount} registradas</span>
          <span>{snapshot.missingCount} faltantes</span>
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <SummaryCard label="Repetidas" value={`${snapshot.duplicateCount}`} hint="para ofrecer" tone="red" />
        <SummaryCard label="Buscadas" value={`${snapshot.wantedCount}`} hint="prioritarias" tone="blue" />
        <SummaryCard label="Compatibles" value="12" hint="en tu alcance" tone="green" />
      </div>

      <div className="rounded-[2rem] border border-slate-200 bg-white p-4 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#D90429]">Siguiente paso</p>
        <h3 className="mt-2 text-2xl font-black tracking-[-0.05em] text-slate-950">Marca tus repetidas antes de buscar matches.</h3>
        <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
          Mientras más exacto tengas tu álbum, mejores compatibilidades aparecen. Tu checklist queda guardado en este dispositivo aunque estés sin internet.
        </p>
      </div>

      <MatchesSection compact />
      <StoresSection />
    </div>
  )
}

function SummaryCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: 'red' | 'blue' | 'green' | 'dark' }) {
  const toneClass = {
    red: 'bg-[#D90429] text-white',
    blue: 'bg-blue-100 text-blue-950',
    green: 'bg-green-100 text-green-900',
    dark: 'bg-slate-950 text-white',
  }[tone]

  return (
    <article className={`rounded-[1.6rem] p-4 shadow-sm ${toneClass}`}>
      <p className="text-xs font-black uppercase tracking-[0.12em] opacity-70">{label}</p>
      <strong className="mt-2 block text-4xl font-black tracking-[-0.07em]">{value}</strong>
      <span className="mt-1 block text-xs font-bold opacity-70">{hint}</span>
    </article>
  )
}

function AlbumSection() {
  const remoteAlbumState = useQuery(api.album.mine)
  const hasLocalPendingSync = hasPendingAlbumSync()
  const fallbackAlbumState = readStoredAlbumState()
  const initialAlbumState = !hasLocalPendingSync && remoteAlbumState ? remoteAlbumState : fallbackAlbumState
  const editorKey = !hasLocalPendingSync && remoteAlbumState
    ? `remote-${remoteAlbumState.owned.length}-${remoteAlbumState.duplicates.length}-${remoteAlbumState.wanted.length}-${remoteAlbumState.wantedMode}`
    : 'local-first'

  return <AlbumEditor initialAlbumState={initialAlbumState} key={editorKey} />
}

function AlbumEditor({ initialAlbumState }: { initialAlbumState: StoredAlbumState }) {
  const saveSticker = useMutation(api.album.setSticker)
  const saveWantedMode = useMutation(api.album.setWantedMode)
  const saveAlbumSnapshot = useMutation(api.album.saveSnapshot)
  const isOnline = useOnlineStatus()
  const [activeFilter, setActiveFilter] = useState<AlbumFilter>('all')
  const [wantedMode, setWantedMode] = useState<WantedMode>(initialAlbumState.wantedMode)
  const [editMode, setEditMode] = useState<AlbumEditMode>('owned')
  const [searchTerm, setSearchTerm] = useState('')
  const [ownedStickerIds, setOwnedStickerIds] = useState<Set<string>>(() => new Set(initialAlbumState.owned))
  const [duplicateStickerIds, setDuplicateStickerIds] = useState<Set<string>>(() => new Set(initialAlbumState.duplicates))
  const [wantedStickerIds, setWantedStickerIds] = useState<Set<string>>(() => new Set(initialAlbumState.wanted))
  const [collapsedGroupIds, setCollapsedGroupIds] = useState<Set<string>>(() => new Set())
  const [collapsedTeamIds, setCollapsedTeamIds] = useState<Set<string>>(() => new Set())
  const [syncStatus, setSyncStatus] = useState<AlbumSyncStatus>(() => (hasPendingAlbumSync() ? 'pending' : 'synced'))
  const normalizedSearch = searchTerm.trim().toLowerCase()
  const missingStickerCount = worldCup2026Catalog.totalStickers - ownedStickerIds.size
  const wantedStickerCount = wantedMode === 'allMissing' ? missingStickerCount : wantedStickerIds.size
  const currentAlbumState = useMemo<StoredAlbumState>(
    () => ({
      owned: [...ownedStickerIds],
      duplicates: [...duplicateStickerIds].filter((stickerId) => ownedStickerIds.has(stickerId)),
      wanted: [...wantedStickerIds].filter((stickerId) => !ownedStickerIds.has(stickerId)),
      wantedMode,
    }),
    [duplicateStickerIds, ownedStickerIds, wantedMode, wantedStickerIds],
  )

  useEffect(() => {
    writeStoredAlbumState(currentAlbumState)
  }, [currentAlbumState])

  useEffect(() => {
    if (!hasPendingAlbumSync()) return

    if (!isOnline) {
      return
    }

    const syncTimer = window.setTimeout(() => {
      setSyncStatus('syncing')
      void saveAlbumSnapshot(currentAlbumState)
        .then(() => {
          clearAlbumPendingSync()
          setSyncStatus('synced')
        })
        .catch(() => setSyncStatus('pending'))
    }, 700)

    return () => window.clearTimeout(syncTimer)
  }, [currentAlbumState, isOnline, saveAlbumSnapshot])

  const markLocalAlbumChange = () => {
    markAlbumPendingSync()
    setSyncStatus(isOnline ? 'pending' : 'offline')
  }
  const visibleSyncStatus: AlbumSyncStatus = !isOnline && hasPendingAlbumSync() ? 'offline' : syncStatus

  const visibleGroups = albumGroups
    .map((group) => ({
      ...group,
      teams: group.teams
        .map((team) => {
          const stickers = (catalogStickersBySection.get(team.section) ?? []).filter((sticker) => {
            const isOwned = ownedStickerIds.has(sticker.id)
            const isDuplicate = duplicateStickerIds.has(sticker.id)
            const isWanted = wantedMode === 'allMissing' ? !isOwned : wantedStickerIds.has(sticker.id)
            const matchesFilter =
              activeFilter === 'all' ||
              (activeFilter === 'owned' && isOwned) ||
              (activeFilter === 'missing' && !isOwned) ||
              (activeFilter === 'duplicates' && isDuplicate) ||
              (activeFilter === 'wanted' && isWanted)

            if (!matchesFilter) return false
            if (!normalizedSearch) return true

            return `${team.name} ${getTeamCode(team.section) ?? ''} ${sticker.section} ${getStickerDisplayNumber(sticker)} ${sticker.name}`
              .toLowerCase()
              .includes(normalizedSearch)
          })

          return { ...team, stickers }
        })
        .filter((team) => team.stickers.length > 0),
    }))
    .filter((group) => group.teams.length > 0)
  const totalVisibleStickers = visibleGroups.reduce(
    (groupTotal, group) => groupTotal + group.teams.reduce((teamTotal, team) => teamTotal + team.stickers.length, 0),
    0,
  )

  const toggleOwnedSticker = (stickerId: string) => {
    setOwnedStickerIds((current) => {
      const next = toggleSetValue(current, stickerId)
      const isOwned = next.has(stickerId)

      if (!isOwned) {
        setDuplicateStickerIds((duplicates) => removeSetValue(duplicates, stickerId))
      } else {
        setWantedStickerIds((wanted) => removeSetValue(wanted, stickerId))
      }

      void saveSticker({
        stickerId,
        isOwned,
        isDuplicate: isOwned && duplicateStickerIds.has(stickerId),
        isWanted: !isOwned && wantedStickerIds.has(stickerId),
      }).catch(() => undefined)
      markLocalAlbumChange()

      return next
    })
  }

  const toggleDuplicateSticker = (stickerId: string) => {
    if (!ownedStickerIds.has(stickerId)) return

    setDuplicateStickerIds((current) => {
      const next = toggleSetValue(current, stickerId)

      void saveSticker({ stickerId, isOwned: true, isDuplicate: next.has(stickerId), isWanted: false }).catch(() => undefined)
      markLocalAlbumChange()

      return next
    })
  }

  const toggleWantedSticker = (stickerId: string) => {
    if (ownedStickerIds.has(stickerId)) return

    setWantedStickerIds((current) => {
      const next = toggleSetValue(current, stickerId)

      void saveSticker({ stickerId, isOwned: false, isDuplicate: false, isWanted: next.has(stickerId) }).catch(() => undefined)
      markLocalAlbumChange()

      return next
    })
  }

  const applyStickerEdit = (stickerId: string) => {
    if (editMode === 'owned') {
      toggleOwnedSticker(stickerId)
      return
    }

    if (editMode === 'duplicate') {
      toggleDuplicateSticker(stickerId)
      return
    }

    if (wantedMode !== 'specific') {
      setWantedMode('specific')
      void saveWantedMode({ wantedMode: 'specific' }).catch(() => undefined)
      markLocalAlbumChange()
    }
    toggleWantedSticker(stickerId)
  }

  const expandAll = () => {
    setCollapsedGroupIds(new Set())
    setCollapsedTeamIds(new Set())
  }

  const collapseAll = () => {
    setCollapsedGroupIds(new Set(albumGroups.map((group) => group.id)))
  }

  return (
    <section className="grid gap-4">
      <div className="sticky top-20 z-30 rounded-[1.75rem] border border-slate-200 bg-white/95 p-4 shadow-lg shadow-slate-950/10 backdrop-blur-xl">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.14em] text-[#D90429]">Mi álbum</p>
            <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-950">Checklist rápido</h2>
            <p className="mt-1 text-xs font-bold text-slate-500">
              {ownedStickerIds.size}/{worldCup2026Catalog.totalStickers} tengo · {duplicateStickerIds.size} repetidas · {wantedStickerCount} busco · {totalVisibleStickers} visibles
            </p>
          </div>
          <span className={`inline-flex w-fit rounded-full px-3 py-2 text-xs font-black ${visibleSyncStatus === 'synced' ? 'bg-green-100 text-green-800' : visibleSyncStatus === 'syncing' ? 'bg-blue-100 text-blue-950' : 'bg-amber-100 text-amber-800'}`}>
            {visibleSyncStatus === 'syncing'
              ? 'Sincronizando'
              : visibleSyncStatus === 'synced'
                ? 'Sincronizado'
                : visibleSyncStatus === 'offline'
                  ? 'Guardado local'
                  : 'Pendiente'}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2 rounded-[1.4rem] bg-slate-100 p-1">
          {albumEditModes.map((mode) => (
            <button
              className={`rounded-[1.1rem] px-3 py-2 text-center transition ${
                editMode === mode.id ? 'bg-[#0B1739] text-white shadow-sm' : 'text-slate-500 hover:bg-white'
              }`}
              key={mode.id}
              onClick={() => setEditMode(mode.id)}
              type="button"
            >
              <span className="block text-sm font-black">{mode.label}</span>
              <span className="mt-0.5 hidden text-[0.65rem] font-bold opacity-70 sm:block">{mode.description}</span>
            </button>
          ))}
        </div>

        <label className="mt-3 block">
          <span className="sr-only">Buscar lámina</span>
          <input
            className="min-h-11 w-full rounded-2xl border border-slate-300 bg-slate-50 px-4 text-base font-bold text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[#0B1739] focus:bg-white focus:ring-4 focus:ring-blue-100"
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Buscar país, número o nombre"
            type="search"
            value={searchTerm}
          />
        </label>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {albumFilters.map((filter) => (
            <button
              className={`whitespace-nowrap rounded-full px-4 py-2 text-sm font-black transition ${
                activeFilter === filter.id ? 'bg-[#0B1739] text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              key={filter.id}
              onClick={() => setActiveFilter(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {wantedModes.map((mode) => (
              <button
                className={`whitespace-nowrap rounded-full px-3 py-2 text-xs font-black transition ${
                  wantedMode === mode.id ? 'bg-blue-100 text-blue-950' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                }`}
                key={mode.id}
                onClick={() => {
                  setWantedMode(mode.id)
                  void saveWantedMode({ wantedMode: mode.id }).catch(() => undefined)
                  markLocalAlbumChange()
                }}
                type="button"
              >
                Busco: {mode.id === 'allMissing' ? 'faltantes' : 'específicas'}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600" onClick={expandAll} type="button">Expandir</button>
            <button className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-600" onClick={collapseAll} type="button">Contraer</button>
          </div>
        </div>
      </div>

      {visibleGroups.map((group) => (
        <AlbumGroupPanel
          collapsedGroupIds={collapsedGroupIds}
          collapsedTeamIds={collapsedTeamIds}
          group={group}
          key={group.id}
          onGroupToggle={(groupId) => setCollapsedGroupIds((current) => toggleSetValue(current, groupId))}
          duplicateStickerIds={duplicateStickerIds}
          editMode={editMode}
          onStickerEdit={applyStickerEdit}
          onTeamToggle={(teamId) => setCollapsedTeamIds((current) => toggleSetValue(current, teamId))}
          ownedStickerIds={ownedStickerIds}
          searchIsActive={normalizedSearch.length > 0}
          wantedMode={wantedMode}
          wantedStickerIds={wantedStickerIds}
        />
      ))}

      {visibleGroups.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-bold text-slate-500">
          No hay láminas para este filtro.
        </div>
      ) : null}
    </section>
  )
}

function toggleSetValue(current: Set<string>, value: string) {
  const next = new Set(current)

  if (next.has(value)) {
    next.delete(value)
  } else {
    next.add(value)
  }

  return next
}

function removeSetValue(current: Set<string>, value: string) {
  if (!current.has(value)) return current

  const next = new Set(current)
  next.delete(value)

  return next
}

function getWhatsAppUrl(whatsapp: string) {
  const digits = whatsapp.replace(/\D/g, '')

  return `https://wa.me/${digits.startsWith('56') ? digits : `56${digits}`}`
}

function AlbumGroupPanel({
  group,
  ownedStickerIds,
  duplicateStickerIds,
  wantedStickerIds,
  wantedMode,
  editMode,
  collapsedGroupIds,
  collapsedTeamIds,
  searchIsActive,
  onGroupToggle,
  onTeamToggle,
  onStickerEdit,
}: {
  group: VisibleAlbumGroup
  ownedStickerIds: Set<string>
  duplicateStickerIds: Set<string>
  wantedStickerIds: Set<string>
  wantedMode: WantedMode
  editMode: AlbumEditMode
  collapsedGroupIds: Set<string>
  collapsedTeamIds: Set<string>
  searchIsActive: boolean
  onGroupToggle: (groupId: string) => void
  onTeamToggle: (teamId: string) => void
  onStickerEdit: (stickerId: string) => void
}) {
  const isCollapsed = collapsedGroupIds.has(group.id) && !searchIsActive
  const groupTotal = group.teams.reduce((total, team) => total + team.stickers.length, 0)
  const groupOwned = group.teams.reduce(
    (total, team) => total + team.stickers.filter((sticker) => ownedStickerIds.has(sticker.id)).length,
    0,
  )

  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-slate-200 bg-white shadow-sm">
      <button
        className="flex w-full items-center justify-between gap-4 bg-[#0B1739] px-4 py-3 text-left text-white"
        onClick={() => onGroupToggle(group.id)}
      >
        <div>
          <h3 className="text-lg font-black tracking-[-0.04em]">{group.name}</h3>
          <p className="mt-1 text-xs font-bold text-white/65">
            {groupOwned}/{groupTotal} marcadas · {group.teams.length} secciones
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-2 text-xs font-black">{isCollapsed ? 'Abrir' : 'Cerrar'}</span>
      </button>

      {!isCollapsed ? (
        <div className="grid gap-2 p-2">
          {group.teams.map((team) => (
            <AlbumTeamPanel
              duplicateStickerIds={duplicateStickerIds}
              editMode={editMode}
              isCollapsed={collapsedTeamIds.has(team.section) && !searchIsActive}
              key={team.section}
              onStickerEdit={onStickerEdit}
              onToggle={onTeamToggle}
              ownedStickerIds={ownedStickerIds}
              team={team}
              wantedMode={wantedMode}
              wantedStickerIds={wantedStickerIds}
            />
          ))}
        </div>
      ) : null}
    </article>
  )
}

function AlbumTeamPanel({
  team,
  ownedStickerIds,
  duplicateStickerIds,
  wantedStickerIds,
  wantedMode,
  editMode,
  isCollapsed,
  onToggle,
  onStickerEdit,
}: {
  team: VisibleAlbumTeam
  ownedStickerIds: Set<string>
  duplicateStickerIds: Set<string>
  wantedStickerIds: Set<string>
  wantedMode: WantedMode
  editMode: AlbumEditMode
  isCollapsed: boolean
  onToggle: (teamId: string) => void
  onStickerEdit: (stickerId: string) => void
}) {
  const ownedCount = team.stickers.filter((sticker) => ownedStickerIds.has(sticker.id)).length
  const duplicateCount = team.stickers.filter((sticker) => duplicateStickerIds.has(sticker.id)).length
  const wantedCount = team.stickers.filter((sticker) => (wantedMode === 'allMissing' ? !ownedStickerIds.has(sticker.id) : wantedStickerIds.has(sticker.id))).length
  const teamCode = getTeamCode(team.section) ?? team.section

  return (
    <section className="overflow-hidden rounded-[1.25rem] border border-slate-200 bg-slate-50">
      <button className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left" onClick={() => onToggle(team.section)}>
        <div>
          <h4 className="text-base font-black tracking-[-0.04em] text-slate-950">{team.name}</h4>
          <p className="mt-1 text-xs font-bold text-slate-500">
            {ownedCount}/{team.stickers.length} tengo · {duplicateCount} rep. · {wantedCount} busco · {teamCode}
          </p>
        </div>
        <span className="rounded-full bg-white px-3 py-2 text-xs font-black text-slate-600 shadow-sm">
          {isCollapsed ? 'Abrir' : 'Cerrar'}
        </span>
      </button>

      {!isCollapsed ? (
        <div className="grid grid-cols-5 gap-1.5 border-t border-slate-200 bg-white p-2 min-[420px]:grid-cols-6 sm:grid-cols-8 md:grid-cols-10 lg:grid-cols-12">
          {team.stickers.map((sticker) => (
            <AlbumStickerTile
              editMode={editMode}
              isDuplicate={duplicateStickerIds.has(sticker.id)}
              isOwned={ownedStickerIds.has(sticker.id)}
              isWanted={wantedMode === 'allMissing' ? !ownedStickerIds.has(sticker.id) : wantedStickerIds.has(sticker.id)}
              key={sticker.id}
              onStickerEdit={onStickerEdit}
              sticker={sticker}
            />
          ))}
        </div>
      ) : null}
    </section>
  )
}

function AlbumStickerTile({
  sticker,
  isOwned,
  isDuplicate,
  isWanted,
  editMode,
  onStickerEdit,
}: {
  sticker: StickerCatalogItem
  isOwned: boolean
  isDuplicate: boolean
  isWanted: boolean
  editMode: AlbumEditMode
  onStickerEdit: (stickerId: string) => void
}) {
  const displayNumber = getStickerDisplayNumber(sticker)
  const stateLabel = isDuplicate ? 'Rep.' : isOwned ? 'Tengo' : isWanted ? 'Busco' : 'Falta'
  const canApplyEdit = editMode !== 'duplicate' || isOwned

  return (
    <button
      className={`relative flex min-h-14 flex-col items-center justify-center rounded-xl border px-1.5 py-2 text-center transition active:scale-95 ${
        isOwned
          ? isDuplicate
            ? 'border-[#D90429] bg-[#D90429] text-white shadow-md shadow-red-900/10'
            : 'border-[#0B1739] bg-[#0B1739] text-white shadow-md shadow-slate-950/10'
          : isWanted
            ? 'border-blue-200 bg-blue-50 text-slate-800'
            : 'border-slate-200 bg-slate-50 text-slate-500 hover:border-slate-300 hover:bg-white'
      } ${canApplyEdit ? '' : 'cursor-not-allowed opacity-45'}`}
      disabled={!canApplyEdit}
      onClick={() => onStickerEdit(sticker.id)}
      title={`${displayNumber} · ${sticker.name} · ${stateLabel}`}
      type="button"
    >
      <span className="text-[0.72rem] font-black leading-none tracking-[-0.03em]">{displayNumber}</span>
      <span className={`mt-1 rounded-full px-1.5 py-0.5 text-[0.56rem] font-black uppercase leading-none ${
        isOwned ? 'bg-white/15 text-white' : isWanted ? 'bg-blue-100 text-blue-700' : 'bg-white text-slate-400'
      }`}
      >
        {stateLabel}
      </span>
      {editMode === 'duplicate' && isOwned ? <span className="absolute right-1 top-1 size-2 rounded-full bg-white/80" /> : null}
    </button>
  )
}

function MatchesSection({ compact = false }: { compact?: boolean }) {
  const [scope, setScope] = useState<MatchScope>('medium')
  const isOnline = useOnlineStatus()
  const backendMatches = useQuery(api.matches.list, { scope })
  const cachedMatches = readStoredMatches()
  const visibleMatches: Match[] = backendMatches === undefined ? (cachedMatches.length > 0 ? cachedMatches : matches) : backendMatches
  const activeScope = matchScopes.find((item) => item.id === scope) ?? matchScopes[1]

  useEffect(() => {
    if (backendMatches !== undefined) writeStoredMatches(backendMatches)
  }, [backendMatches])

  return (
    <section className="grid gap-4">
      {!isOnline ? (
        <div className="rounded-[1.75rem] border border-amber-200 bg-amber-50 p-5 text-amber-950 shadow-sm">
          <p className="text-sm font-black uppercase tracking-[0.14em] text-amber-700">Estás desconectado</p>
          <h2 className="mt-2 text-2xl font-black tracking-[-0.05em]">Los matches pueden estar desactualizados.</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-amber-800">
            Puedes revisar el último resultado guardado, pero los contactos y nuevos cruces se validan cuando vuelva la conexión.
          </p>
        </div>
      ) : null}

      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#D90429]">Matches globales</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Por comuna, región o Chile</h2>
          <p className="mt-2 text-sm font-bold text-slate-500">
            Mostramos personas que tienen láminas que buscas y necesitan láminas que tienes repetidas.
          </p>
        </div>
        <span className={`rounded-full px-4 py-2 text-sm font-black ${isOnline ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
          {isOnline ? `${visibleMatches.length} posibles` : 'Vista offline'}
        </span>
      </div>

        <div className="mt-5 grid grid-cols-3 gap-2 rounded-[1.5rem] bg-slate-100 p-1">
          {matchScopes.map((item) => (
            <button
              className={`rounded-[1.25rem] px-3 py-3 text-center text-sm font-black transition ${
                scope === item.id ? 'bg-[#0B1739] text-white shadow-sm' : 'text-slate-500 hover:bg-white'
              }`}
              key={item.id}
              onClick={() => setScope(item.id)}
            >
              <span className="block">{item.label}</span>
              <span className="mt-1 block text-[0.68rem] opacity-70">{item.description}</span>
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs font-bold text-slate-500">
          Alcance activo: {activeScope.description}. Se filtra usando la ubicación de tu perfil.
        </p>
      </div>

      <div className={`mt-5 grid gap-4 ${compact ? '' : 'xl:grid-cols-3'}`}>
        {visibleMatches.map((match) => (
          <article className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-5" key={match.id}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-black tracking-[-0.04em]">{match.collector}</h3>
                  {match.featured ? <span className="rounded-full bg-amber-400 px-2 py-1 text-xs font-black text-amber-950">Destacado</span> : null}
                </div>
                <p className="mt-1 text-sm font-semibold text-slate-500">{match.location}</p>
              </div>
              <strong className="rounded-2xl bg-[#0B1739] px-3 py-2 text-sm font-black text-white">{match.compatibility} cruces</strong>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
              <MatchList label="Te ofrece" items={match.offers} />
              <MatchList label="Tú ofreces" items={match.receives} />
            </div>

            {(match.hasContact ?? true) ? (
              <div className="mt-5 flex flex-wrap gap-2">
                {isOnline ? (
                  <>
                    {match.whatsapp ? (
                      <a className="inline-flex min-h-11 items-center rounded-full bg-green-600 px-4 text-sm font-black text-white" href={getWhatsAppUrl(match.whatsapp)} rel="noreferrer" target="_blank">
                        WhatsApp
                      </a>
                    ) : null}
                    {match.instagram ? (
                      <a className="inline-flex min-h-11 items-center rounded-full border border-slate-300 px-4 text-sm font-black text-slate-700" href={`https://instagram.com/${match.instagram.replace(/^@/, '')}`} rel="noreferrer" target="_blank">
                        Instagram
                      </a>
                    ) : null}
                  </>
                ) : (
                  <p className="rounded-2xl bg-amber-100 px-4 py-3 text-sm font-bold text-amber-900">
                    Contactos pausados hasta recuperar conexión.
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-5 rounded-2xl bg-white px-4 py-3 text-sm font-bold text-slate-500">
                Contacto no disponible para este usuario.
              </p>
            )}
          </article>
        ))}
      </div>

      {visibleMatches.length === 0 ? (
        <div className="rounded-[1.6rem] border border-dashed border-slate-300 bg-white p-6 text-center text-sm font-bold text-slate-500">
          Aún no hay matches. Completa tu perfil, marca repetidas y define qué láminas buscas.
        </div>
      ) : null}

    </section>
  )
}

function MatchList({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {items.map((item) => (
          <span className="rounded-full bg-[#DBEAFE] px-3 py-1 text-xs font-black text-[#0B1739]" key={item}>
            {item}
          </span>
        ))}
      </div>
    </div>
  )
}

function StoresSection() {
  const currentProfile = useQuery(api.profiles.current)
  const stores = sortSalesPointsForProfile(salesPoints, currentProfile).slice(0, currentProfile ? 8 : 12)

  return (
    <section className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black uppercase tracking-[0.14em] text-[#D90429]">Dónde comprar</p>
          <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Locales Cercanos</h2>
          <p className="mt-2 text-sm font-bold leading-6 text-slate-500">
            {currentProfile
              ? `Mostramos primero puntos en ${currentProfile.commune} y luego referencias cercanas por región.`
              : 'Completa tu perfil para ordenar puntos de venta por cercanía.'}
          </p>
        </div>
        <span className="rounded-full bg-blue-100 px-4 py-2 text-sm font-black text-blue-950">Cercanos</span>
      </div>

      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {stores.map((store) => (
          <article className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-4" key={`${store.name}-${store.address}`}>
            <h3 className="text-lg font-black tracking-[-0.04em] text-slate-950">{store.name}</h3>
            <p className="mt-1 text-sm font-bold text-slate-500">{store.address}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{store.commune} · {store.region}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-600">Punto de venta</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function ProfileSection() {
  const currentProfile = useQuery(api.profiles.current)
  const saveProfile = useMutation(api.profiles.upsert)
  const [regionCode, setRegionCode] = useState(defaultRegionCode)
  const selectedRegion = getRegionByCode(regionCode)
  const [commune, setCommune] = useState(() => selectedRegion.communes[0] ?? '')
  const [saveMessage, setSaveMessage] = useState('')

  const handleRegionChange = (nextRegionCode: string) => {
    const nextRegion = getRegionByCode(nextRegionCode)

    setRegionCode(nextRegion.code)
    setCommune(nextRegion.communes[0] ?? '')
  }

  const submitProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSaveMessage('')
    const formData = new FormData(event.currentTarget)

    void saveProfile({
      displayName: String(formData.get('displayName') ?? ''),
      regionCode: selectedRegion.code,
      regionName: selectedRegion.name,
      commune,
      whatsapp: String(formData.get('whatsapp') ?? ''),
      instagram: String(formData.get('instagram') ?? '') || undefined,
    })
      .then(() => setSaveMessage('Perfil guardado. Ya puedes aparecer en matches.'))
      .catch(() => setSaveMessage('No se pudo guardar el perfil. Revisa los datos e intenta nuevamente.'))
  }

  return (
    <section className="grid gap-5">
      {!currentProfile ? <ProfileOnboarding /> : null}
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-[#D90429]">Perfil</p>
        <h2 className="mt-2 text-3xl font-black tracking-[-0.05em]">Datos de intercambio</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">Estos datos habilitan matches, grupos y mercado. El contacto se usa para coordinar fuera de la app.</p>
        <form className="mt-5 grid gap-4" onSubmit={submitProfile}>
          <FormField defaultValue={currentProfile?.displayName ?? ''} label="Nombre visible" name="displayName" placeholder="Ej: Bruno T." />
          <SelectField
            label="Región"
            onChange={handleRegionChange}
            options={chileRegions.map((region) => ({ label: region.name, value: region.code }))}
            value={regionCode}
          />
          <SelectField
            label="Comuna"
            onChange={setCommune}
            options={selectedRegion.communes.map((regionCommune) => ({ label: regionCommune, value: regionCommune }))}
            value={commune}
          />
          <FormField defaultValue={currentProfile?.whatsapp ?? ''} label="WhatsApp" name="whatsapp" placeholder="+56 9 1234 5678" />
          <FormField defaultValue={currentProfile?.instagram ? `@${currentProfile.instagram}` : ''} label="Instagram opcional" name="instagram" placeholder="@albumtrader" />
          <button className="min-h-12 rounded-full bg-[#D90429] px-5 text-sm font-black text-white" type="submit">Guardar perfil</button>
          {saveMessage ? <p className="rounded-2xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-600">{saveMessage}</p> : null}
        </form>
      </div>
      <div className="rounded-[2rem] bg-[#0B1739] p-5 text-white shadow-sm">
        <p className="text-sm font-black uppercase tracking-[0.14em] text-blue-200">Vista pública</p>
        <h3 className="mt-2 text-3xl font-black tracking-[-0.05em]">Coleccionista en {commune}</h3>
        <p className="mt-3 text-sm leading-6 text-white/65">Otros usuarios podrán contactarte desde matches válidos o publicaciones del mercado.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <MetricCard label="Repetidas" value={`${getAlbumSnapshot().duplicateCount}`} tone="red" />
          <MetricCard label="Buscadas" value={`${getAlbumSnapshot().wantedCount}`} tone="light" />
        </div>
      </div>
      </div>
    </section>
  )
}

function FormField({ defaultValue, label, name, placeholder }: { defaultValue?: string; label: string; name: string; placeholder: string }) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <input
        className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 font-semibold text-slate-950 outline-none transition focus:border-[#0B1739] focus:ring-4 focus:ring-blue-100"
        defaultValue={defaultValue}
        name={name}
        placeholder={placeholder}
        type="text"
        required={label !== 'Instagram opcional'}
      />
    </label>
  )
}

function SelectField({
  label,
  onChange,
  options,
  value,
}: {
  label: string
  onChange: (value: string) => void
  options: { label: string; value: string }[]
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm font-black text-slate-700">
      {label}
      <select
        className="min-h-12 rounded-2xl border border-slate-300 bg-white px-4 font-semibold text-slate-950 outline-none transition focus:border-[#0B1739] focus:ring-4 focus:ring-blue-100"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default App
