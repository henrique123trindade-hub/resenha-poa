import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import type {
  CategoryMeta,
  EventItem,
  EventStatus,
  NeighborhoodMeta,
  OrganizerProfile,
  PollListItem,
  PollOption,
  PollVoteItem,
  ReportItem,
  VenueItem,
  VenueReviewItem,
} from '../types/resenha';
import { slugify } from '../utils/eventFilters';

function makeSafeId(prefix: string): string {
  const rand = Math.random().toString(36).slice(2, 8);
  return `${prefix}-${Date.now().toString(36)}-${rand}`.replace(/[^a-zA-Z0-9_-]/g, '');
}

// --- Favorites ---
export async function toggleFavoriteInFirestore(params: {
  userId: string;
  targetType: 'event' | 'venue';
  targetId: string;
  title: string;
  currentlySaved: boolean;
}): Promise<boolean> {
  const favId = `${params.userId}_${params.targetType}_${params.targetId}`.replace(
    /[^a-zA-Z0-9_-]/g,
    '-',
  );
  const path = `favorites/${favId}`;
  try {
    if (params.currentlySaved) {
      await deleteDoc(doc(db, 'favorites', favId));
      return false;
    }
    await setDoc(doc(db, 'favorites', favId), {
      userId: params.userId,
      targetType: params.targetType,
      targetId: params.targetId,
      title: params.title.slice(0, 140),
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Organizer Profile ---
export async function upsertOrganizerProfile(
  uid: string,
  payload: {
    orgName: string;
    bio?: string;
    instagram?: string;
    website?: string;
    contactEmail: string;
  },
  isExisting: boolean,
): Promise<void> {
  const path = `organizerProfiles/${uid}`;
  try {
    if (isExisting) {
      await updateDoc(doc(db, 'organizerProfiles', uid), {
        orgName: payload.orgName.trim().slice(0, 120),
        bio: (payload.bio ?? '').trim().slice(0, 600),
        instagram: (payload.instagram ?? '').trim().slice(0, 120),
        website: (payload.website ?? '').trim().slice(0, 300),
        contactEmail: payload.contactEmail.trim().slice(0, 200),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(doc(db, 'organizerProfiles', uid), {
        ownerId: uid,
        orgName: payload.orgName.trim().slice(0, 120),
        bio: (payload.bio ?? '').trim().slice(0, 600),
        instagram: (payload.instagram ?? '').trim().slice(0, 120),
        website: (payload.website ?? '').trim().slice(0, 300),
        contactEmail: payload.contactEmail.trim().slice(0, 200),
        verificationStatus: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Events CRUD ---
export async function createEventInFirestore(
  input: Omit<EventItem, 'id' | 'slug' | 'createdAt' | 'updatedAt'>,
  options?: { isAdmin?: boolean },
): Promise<EventItem> {
  const id = makeSafeId('ev');
  const slugBase = slugify(input.title) || id;
  const slug = `${slugBase}-${id.slice(-4)}`;
  const path = `events/${id}`;

  const status: EventStatus = options?.isAdmin
    ? input.status
    : input.status === 'draft'
      ? 'draft'
      : 'pending';

  const docData = {
    id,
    slug,
    title: input.title.trim().slice(0, 120),
    ...(input.subtitle ? { subtitle: input.subtitle.trim().slice(0, 200) } : {}),
    description: input.description.trim().slice(0, 3000),
    category: input.category,
    dateISO: input.dateISO,
    startTime: input.startTime,
    ...(input.endTime ? { endTime: input.endTime.slice(0, 5) } : {}),
    neighborhood: input.neighborhood.trim().slice(0, 80),
    venueName: input.venueName.trim().slice(0, 120),
    address: input.address.trim().slice(0, 200),
    ...(typeof input.lat === 'number' ? { lat: input.lat } : {}),
    ...(typeof input.lng === 'number' ? { lng: input.lng } : {}),
    priceType: input.priceType,
    ...(typeof input.priceMin === 'number' ? { priceMin: input.priceMin } : {}),
    ...(input.priceLabel ? { priceLabel: input.priceLabel.trim().slice(0, 80) } : {}),
    ageRating: input.ageRating,
    ...(input.ticketUrl ? { ticketUrl: input.ticketUrl.trim().slice(0, 400) } : {}),
    ...(input.lineup && input.lineup.length > 0
      ? { lineup: input.lineup.slice(0, 12).map((s) => s.slice(0, 80)) }
      : {}),
    ...(input.imageUrl ? { imageUrl: input.imageUrl.trim().slice(0, 500) } : {}),
    sourceName: input.sourceName.trim().slice(0, 120),
    ...(input.sourceUrl ? { sourceUrl: input.sourceUrl.trim().slice(0, 400) } : {}),
    ...(input.lastVerifiedAt ? { lastVerifiedAt: input.lastVerifiedAt.slice(0, 40) } : {}),
    isVerified: options?.isAdmin ? Boolean(input.isVerified) : false,
    isDemoExample: Boolean(input.isDemoExample),
    isSponsored: options?.isAdmin ? Boolean(input.isSponsored) : false,
    isFeatured: options?.isAdmin ? Boolean(input.isFeatured) : false,
    status,
    organizerId: input.organizerId,
    organizerName: input.organizerName.trim().slice(0, 120),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'events', id), docData);
    return { ...docData } as EventItem;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updateEventAsOrganizer(
  eventId: string,
  updates: Partial<EventItem>,
  nextStatus: 'draft' | 'pending' | 'cancelled',
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    if (nextStatus === 'cancelled') {
      await updateDoc(doc(db, 'events', eventId), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const payload: Record<string, unknown> = {
      status: nextStatus,
      updatedAt: serverTimestamp(),
    };
    if (updates.title) payload.title = updates.title.trim().slice(0, 120);
    if (updates.subtitle !== undefined) payload.subtitle = updates.subtitle.trim().slice(0, 200);
    if (updates.description) payload.description = updates.description.trim().slice(0, 3000);
    if (updates.category) payload.category = updates.category;
    if (updates.dateISO) payload.dateISO = updates.dateISO;
    if (updates.startTime) payload.startTime = updates.startTime;
    if (updates.endTime !== undefined) payload.endTime = updates.endTime.slice(0, 5);
    if (updates.neighborhood) payload.neighborhood = updates.neighborhood.trim().slice(0, 80);
    if (updates.venueName) payload.venueName = updates.venueName.trim().slice(0, 120);
    if (updates.address) payload.address = updates.address.trim().slice(0, 200);
    if (updates.priceType) payload.priceType = updates.priceType;
    if (updates.priceMin !== undefined) payload.priceMin = updates.priceMin;
    if (updates.priceLabel !== undefined) payload.priceLabel = updates.priceLabel.trim().slice(0, 80);
    if (updates.ageRating) payload.ageRating = updates.ageRating;
    if (updates.ticketUrl !== undefined) payload.ticketUrl = updates.ticketUrl.trim().slice(0, 400);
    if (updates.organizerName) payload.organizerName = updates.organizerName.trim().slice(0, 120);

    await updateDoc(doc(db, 'events', eventId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateEventAsAdmin(
  eventId: string,
  updates: Partial<EventItem>,
): Promise<void> {
  const path = `events/${eventId}`;
  try {
    const clean: Record<string, unknown> = {
      ...updates,
      updatedAt: serverTimestamp(),
    };
    delete clean.id;
    delete clean.createdAt;
    await updateDoc(doc(db, 'events', eventId), clean);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deleteEventAsAdmin(eventId: string): Promise<void> {
  const path = `events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- Venues CRUD (Admin) ---
export async function createVenueInFirestore(
  input: Omit<VenueItem, 'id' | 'slug' | 'createdAt' | 'updatedAt'>,
): Promise<VenueItem> {
  const id = makeSafeId('bar');
  const slugBase = slugify(input.name) || id;
  const slug = `${slugBase}-${id.slice(-4)}`;
  const path = `venues/${id}`;

  const docData = {
    id,
    slug,
    name: input.name.trim().slice(0, 120),
    category: input.category.trim().slice(0, 60),
    environmentType: input.environmentType.trim().slice(0, 60),
    neighborhood: input.neighborhood.trim().slice(0, 80),
    address: input.address.trim().slice(0, 200),
    ...(typeof input.lat === 'number' ? { lat: input.lat } : {}),
    ...(typeof input.lng === 'number' ? { lng: input.lng } : {}),
    priceRange: input.priceRange,
    ...(input.musicStyle ? { musicStyle: input.musicStyle.trim().slice(0, 120) } : {}),
    ...(input.hoursSummary ? { hoursSummary: input.hoursSummary.trim().slice(0, 200) } : {}),
    hoursVerified: Boolean(input.hoursVerified),
    description: input.description.trim().slice(0, 2000),
    ...(input.imageUrl ? { imageUrl: input.imageUrl.trim().slice(0, 500) } : {}),
    ...(input.instagramUrl ? { instagramUrl: input.instagramUrl.trim().slice(0, 300) } : {}),
    ...(input.websiteUrl ? { websiteUrl: input.websiteUrl.trim().slice(0, 300) } : {}),
    sourceName: input.sourceName.trim().slice(0, 120),
    ...(input.lastVerifiedAt ? { lastVerifiedAt: input.lastVerifiedAt.slice(0, 40) } : {}),
    isDemoExample: Boolean(input.isDemoExample),
    status: input.status,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'venues', id), docData);
    return { ...docData } as VenueItem;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Bora Junto Poll Lists ---
export async function createPollListInFirestore(params: {
  title: string;
  description?: string;
  creatorId: string;
  creatorName: string;
  options: PollOption[];
}): Promise<PollListItem> {
  const id = makeSafeId('bora');
  const path = `pollLists/${id}`;
  const docData = {
    id,
    title: params.title.trim().slice(0, 120),
    ...(params.description ? { description: params.description.trim().slice(0, 400) } : {}),
    creatorId: params.creatorId,
    creatorName: params.creatorName.trim().slice(0, 100),
    options: params.options.slice(0, 8),
    isOpen: true,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'pollLists', id), docData);
    return { ...docData } as PollListItem;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchPollListById(listId: string): Promise<PollListItem | null> {
  const path = `pollLists/${listId}`;
  try {
    const snap = await getDoc(doc(db, 'pollLists', listId));
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as PollListItem) : null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function fetchPollVotes(listId: string): Promise<PollVoteItem[]> {
  const path = `pollLists/${listId}/votes`;
  try {
    const snap = await getDocs(collection(db, 'pollLists', listId, 'votes'));
    return snap.docs.map((d) => d.data() as PollVoteItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function castPollVote(params: {
  listId: string;
  voterId: string;
  voterLabel: string;
  optionId: string;
}): Promise<void> {
  const voteId = params.voterId.replace(/[^a-zA-Z0-9_-]/g, '');
  const path = `pollLists/${params.listId}/votes/${voteId}`;
  try {
    const ref = doc(db, 'pollLists', params.listId, 'votes', voteId);
    const existing = await getDoc(ref);
    if (existing.exists()) {
      await updateDoc(ref, {
        optionId: params.optionId,
        voterLabel: params.voterLabel.trim().slice(0, 60),
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(ref, {
        voterId: voteId,
        voterLabel: params.voterLabel.trim().slice(0, 60),
        optionId: params.optionId,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// --- Venue Reviews (Moderated) ---
export async function submitVenueReview(params: {
  venueId: string;
  authorId: string;
  authorName: string;
  rating: number;
  comment: string;
}): Promise<void> {
  const id = makeSafeId('rev');
  const path = `venueReviews/${id}`;
  try {
    await setDoc(doc(db, 'venueReviews', id), {
      venueId: params.venueId,
      authorId: params.authorId,
      authorName: params.authorName.trim().slice(0, 80),
      rating: Math.min(5, Math.max(1, Math.round(params.rating))),
      comment: params.comment.trim().slice(0, 500),
      status: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function fetchApprovedVenueReviews(venueId: string): Promise<VenueReviewItem[]> {
  const path = 'venueReviews';
  try {
    const q = query(
      collection(db, 'venueReviews'),
      where('venueId', '==', venueId),
      where('status', '==', 'approved'),
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VenueReviewItem, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

// --- Reports ---
export async function submitReport(params: {
  targetType: 'event' | 'venue' | 'review';
  targetId: string;
  reason: string;
  reporterId: string;
}): Promise<void> {
  const id = makeSafeId('rep');
  const path = `reports/${id}`;
  try {
    await setDoc(doc(db, 'reports', id), {
      targetType: params.targetType,
      targetId: params.targetId,
      reason: params.reason.trim().slice(0, 400),
      reporterId: params.reporterId,
      status: 'open',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

// --- Admin Queries & Moderation ---
export async function fetchAllAdminData(): Promise<{
  events: EventItem[];
  venues: VenueItem[];
  reviews: VenueReviewItem[];
  reports: ReportItem[];
  organizers: OrganizerProfile[];
  usersCount: number;
  categories: CategoryMeta[];
  neighborhoods: NeighborhoodMeta[];
}> {
  try {
    const [evSnap, venSnap, revSnap, repSnap, orgSnap, usrSnap, catSnap, neiSnap] =
      await Promise.all([
        getDocs(collection(db, 'events')),
        getDocs(collection(db, 'venues')),
        getDocs(collection(db, 'venueReviews')),
        getDocs(collection(db, 'reports')),
        getDocs(collection(db, 'organizerProfiles')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'categories')),
        getDocs(collection(db, 'neighborhoods')),
      ]);

    return {
      events: evSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventItem, 'id'>) })),
      venues: venSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VenueItem, 'id'>) })),
      reviews: revSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<VenueReviewItem, 'id'>) })),
      reports: repSnap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<ReportItem, 'id'>) })),
      organizers: orgSnap.docs.map((d) => d.data() as OrganizerProfile),
      usersCount: usrSnap.size,
      categories: catSnap.docs.map((d) => d.data() as CategoryMeta),
      neighborhoods: neiSnap.docs.map((d) => d.data() as NeighborhoodMeta),
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'admin-bundle');
  }
}

export async function moderateReviewAsAdmin(
  reviewId: string,
  status: 'approved' | 'rejected',
): Promise<void> {
  const path = `venueReviews/${reviewId}`;
  try {
    await updateDoc(doc(db, 'venueReviews', reviewId), {
      status,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resolveReportAsAdmin(
  reportId: string,
  status: 'resolved' | 'dismissed',
): Promise<void> {
  const path = `reports/${reportId}`;
  try {
    await updateDoc(doc(db, 'reports', reportId), { status });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function verifyOrganizerAsAdmin(
  ownerId: string,
  verificationStatus: 'verified' | 'rejected',
): Promise<void> {
  const path = `organizerProfiles/${ownerId}`;
  try {
    await updateDoc(doc(db, 'organizerProfiles', ownerId), {
      verificationStatus,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function upsertCategoryAsAdmin(cat: {
  id: string;
  label: string;
  tagline?: string;
  active: boolean;
}): Promise<void> {
  const cleanId = slugify(cat.id || cat.label);
  const path = `categories/${cleanId}`;
  try {
    await setDoc(doc(db, 'categories', cleanId), {
      id: cleanId,
      label: cat.label.trim().slice(0, 60),
      ...(cat.tagline ? { tagline: cat.tagline.trim().slice(0, 140) } : {}),
      active: cat.active,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function upsertNeighborhoodAsAdmin(nei: {
  id: string;
  name: string;
  editorialSummary: string;
  vibeTag?: string;
  active: boolean;
}): Promise<void> {
  const cleanId = slugify(nei.id || nei.name);
  const path = `neighborhoods/${cleanId}`;
  try {
    await setDoc(doc(db, 'neighborhoods', cleanId), {
      id: cleanId,
      name: nei.name.trim().slice(0, 80),
      editorialSummary: nei.editorialSummary.trim().slice(0, 400),
      ...(nei.vibeTag ? { vibeTag: nei.vibeTag.trim().slice(0, 80) } : {}),
      active: nei.active,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function fetchOrganizerEvents(organizerId: string): Promise<EventItem[]> {
  const path = 'events';
  try {
    const q = query(collection(db, 'events'), where('organizerId', '==', organizerId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<EventItem, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function fetchUserPollLists(creatorId: string): Promise<PollListItem[]> {
  const path = 'pollLists';
  try {
    const q = query(collection(db, 'pollLists'), where('creatorId', '==', creatorId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<PollListItem, 'id'>) }));
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}
