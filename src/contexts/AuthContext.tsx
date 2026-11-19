import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import { auth, db, googleProvider, handleFirestoreError, OperationType } from '../firebase';
import type { FavoriteItem, OrganizerProfile, UserProfile } from '../types/resenha';

const BOOTSTRAPPED_ADMIN_EMAIL = 'henrique123trindade@gmail.com';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  organizerProfile: OrganizerProfile | null;
  favorites: FavoriteItem[];
  authReady: boolean;
  isAdmin: boolean;
  authModalOpen: boolean;
  authPromptReason: string | null;
  openAuthModal: (reason?: string) => void;
  closeAuthModal: () => void;
  loginWithGoogle: () => Promise<User | null>;
  logout: () => Promise<void>;
  updatePreferences: (favoriteCategories: string[], favoriteNeighborhoods: string[]) => Promise<void>;
  isFavorited: (targetType: 'event' | 'venue', targetId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authPromptReason, setAuthPromptReason] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setOrganizerProfile(null);
        setFavorites([]);
        setIsAdminDoc(false);
        setAuthReady(true);
        return;
      }

      try {
        const userRef = doc(db, 'users', nextUser.uid);
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          const newProfile = {
            uid: nextUser.uid,
            displayName: (nextUser.displayName || 'Explorador POA').slice(0, 100),
            email: (nextUser.email || '').slice(0, 200),
            photoURL: (nextUser.photoURL || '').slice(0, 500),
            role: 'user' as const,
            favoriteCategories: [] as string[],
            favoriteNeighborhoods: [] as string[],
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          };
          await setDoc(userRef, newProfile);
          setProfile({
            uid: newProfile.uid,
            displayName: newProfile.displayName,
            email: newProfile.email,
            photoURL: newProfile.photoURL,
            role: 'user',
            favoriteCategories: [],
            favoriteNeighborhoods: [],
          });
        } else {
          setProfile(snap.data() as UserProfile);
        }

        const adminSnap = await getDoc(doc(db, 'admins', nextUser.uid));
        setIsAdminDoc(adminSnap.exists());
      } catch (err) {
        console.warn('Perfil de usuário não pôde ser sincronizado:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, []);

  // Attach protected user listeners ONLY when authReady && user
  useEffect(() => {
    if (!authReady || !user) return;

    const favPath = 'favorites';
    const favQ = query(collection(db, favPath), where('userId', '==', user.uid));
    const unsubFavs = onSnapshot(
      favQ,
      (snapshot) => {
        const items: FavoriteItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<FavoriteItem, 'id'>),
        }));
        setFavorites(items);
      },
      (error) => handleFirestoreError(error, OperationType.LIST, favPath),
    );

    const orgPath = `organizerProfiles/${user.uid}`;
    const unsubOrg = onSnapshot(
      doc(db, 'organizerProfiles', user.uid),
      (snapshot) => {
        setOrganizerProfile(snapshot.exists() ? (snapshot.data() as OrganizerProfile) : null);
      },
      (error) => handleFirestoreError(error, OperationType.GET, orgPath),
    );

    return () => {
      unsubFavs();
      unsubOrg();
    };
  }, [authReady, user]);

  const openAuthModal = useCallback((reason?: string) => {
    setAuthPromptReason(reason ?? null);
    setAuthModalOpen(true);
  }, []);

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthPromptReason(null);
  }, []);

  const loginWithGoogle = useCallback(async () => {
    const cred = await signInWithPopup(auth, googleProvider);
    setAuthModalOpen(false);
    setAuthPromptReason(null);
    return cred.user;
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updatePreferences = useCallback(
    async (favoriteCategories: string[], favoriteNeighborhoods: string[]) => {
      if (!user) return;
      const path = `users/${user.uid}`;
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          favoriteCategories: favoriteCategories.slice(0, 11),
          favoriteNeighborhoods: favoriteNeighborhoods.slice(0, 8),
          updatedAt: serverTimestamp(),
        });
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                favoriteCategories: favoriteCategories.slice(0, 11),
                favoriteNeighborhoods: favoriteNeighborhoods.slice(0, 8),
              }
            : prev,
        );
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, path);
      }
    },
    [user],
  );

  const isFavorited = useCallback(
    (targetType: 'event' | 'venue', targetId: string) =>
      favorites.some((f) => f.targetType === targetType && f.targetId === targetId),
    [favorites],
  );

  const isAdmin = Boolean(
    user &&
      ((user.email === BOOTSTRAPPED_ADMIN_EMAIL && user.emailVerified) ||
        isAdminDoc ||
        profile?.role === 'admin'),
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        organizerProfile,
        favorites,
        authReady,
        isAdmin,
        authModalOpen,
        authPromptReason,
        openAuthModal,
        closeAuthModal,
        loginWithGoogle,
        logout,
        updatePreferences,
        isFavorited,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
