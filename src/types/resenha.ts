export type EventCategoryId =
  | 'funk'
  | 'eletronica'
  | 'pagode-samba'
  | 'sertanejo'
  | 'rock-indie'
  | 'hip-hop'
  | 'pop'
  | 'bares'
  | 'shows'
  | 'cultura'
  | 'gratuitos';

export type PriceType = 'free' | 'paid' | 'unconfirmed';
export type AgeRating = 'Livre' | '16+' | '18+' | 'Não informado';
export type EventStatus = 'draft' | 'pending' | 'published' | 'rejected' | 'cancelled' | 'ended';
export type QuickDateFilter =
  | 'all'
  | 'today'
  | 'tomorrow'
  | 'weekend'
  | 'friday'
  | 'saturday'
  | 'sunday';

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  category: EventCategoryId;
  dateISO: string; // YYYY-MM-DD in America/Sao_Paulo
  startTime: string; // HH:mm
  endTime?: string;
  neighborhood: string;
  venueName: string;
  address: string;
  lat?: number;
  lng?: number;
  priceType: PriceType;
  priceMin?: number;
  priceLabel?: string;
  ageRating: AgeRating;
  ticketUrl?: string;
  lineup?: string[];
  imageUrl?: string;
  sourceName: string;
  sourceUrl?: string;
  lastVerifiedAt?: string;
  isVerified: boolean;
  isDemoExample: boolean;
  isSponsored: boolean;
  isFeatured: boolean;
  status: EventStatus;
  organizerId: string;
  organizerName: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface OpeningHourSlot {
  open: string; // HH:mm
  close: string; // HH:mm (may be next day e.g. 02:00)
}

export type WeeklyOpeningHours = Partial<Record<0 | 1 | 2 | 3 | 4 | 5 | 6, OpeningHourSlot | null>>;

export interface VenueItem {
  id: string;
  slug: string;
  name: string;
  category: string;
  environmentType: string;
  neighborhood: string;
  address: string;
  lat?: number;
  lng?: number;
  priceRange: '$' | '$$' | '$$$' | 'Não informado';
  musicStyle?: string;
  hoursSummary?: string;
  openingHours?: WeeklyOpeningHours;
  hoursVerified: boolean;
  features?: string[];
  description: string;
  imageUrl?: string;
  instagramUrl?: string;
  websiteUrl?: string;
  phone?: string;
  sourceName: string;
  lastVerifiedAt?: string;
  isDemoExample: boolean;
  status: 'published' | 'hidden';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface CategoryMeta {
  id: EventCategoryId;
  label: string;
  tagline: string;
  accentHex: string;
  active: boolean;
}

export interface NeighborhoodMeta {
  id: string;
  name: string;
  vibeTag: string;
  editorialSummary: string;
  center: { lat: number; lng: number };
  active: boolean;
}

export interface FavoriteItem {
  id: string;
  userId: string;
  targetType: 'event' | 'venue';
  targetId: string;
  title: string;
  createdAt?: unknown;
}

export interface PollOption {
  id: string;
  targetType: 'event' | 'venue';
  targetId: string;
  title: string;
  subtitle: string;
  neighborhood: string;
  slug: string;
}

export interface PollListItem {
  id: string;
  title: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  options: PollOption[];
  isOpen: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface PollVoteItem {
  voterId: string;
  voterLabel: string;
  optionId: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface VenueReviewItem {
  id: string;
  venueId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface ReportItem {
  id: string;
  targetType: 'event' | 'venue' | 'review';
  targetId: string;
  reason: string;
  reporterId: string;
  status: 'open' | 'resolved' | 'dismissed';
  createdAt?: unknown;
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  photoURL?: string;
  role: 'user' | 'organizer' | 'admin';
  favoriteCategories?: string[];
  favoriteNeighborhoods?: string[];
}

export interface OrganizerProfile {
  ownerId: string;
  orgName: string;
  bio?: string;
  instagram?: string;
  website?: string;
  contactEmail: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
}
