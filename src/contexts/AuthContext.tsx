import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
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
import { normalizeDisplayName, normalizeEmail } from '../utils/authValidation';

const BOOTSTRAPPED_ADMIN_EMAIL = 'henrique123trindade@gmail.com';

export type AuthModalMode = 'login' | 'signup' | 'reset' | 'verify';
export type AuthProviderKind = 'google' | 'password' | 'other';

interface AuthContextValue {
  user: User | null;
  profile: UserProfile | null;
  organizerProfile: OrganizerProfile | null;
  favorites: FavoriteItem[];
  authReady: boolean;
  isAdmin: boolean;
  isEmailVerified: boolean;
  authProvider: AuthProviderKind;
  authModalOpen: boolean;
  authModalMode: AuthModalMode;
  authPromptReason: string | null;
  openAuthModal: (reason?: string, mode?: AuthModalMode) => void;
  setAuthModalMode: (mode: AuthModalMode) => void;
  closeAuthModal: () => void;
  requireVerifiedAccount: (reason: string) => boolean;
  loginWithGoogle: () => Promise<User | null>;
  loginWithEmail: (params: { email: string; password: string }) => Promise<User>;
  registerWithEmail: (params: { name: string; email: string; password: string }) => Promise<User>;
  sendPasswordReset: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthUser: () => Promise<boolean>;
  logout: () => Promise<void>;
  updateDisplayName: (displayName: string) => Promise<void>;
  updatePreferences: (favoriteCategories: string[], favoriteNeighborhoods: string[]) => Promise<void>;
  isFavorited: (targetType: 'event' | 'venue', targetId: string) => boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function detectAuthProvider(nextUser: User | null): AuthProviderKind {
  if (!nextUser) return 'other';
  const providers = nextUser.providerData.map((p) => p.providerId);
  if (providers.includes('google.com')) return 'google';
  if (providers.includes('password')) return 'password';
  return 'other';
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [organizerProfile, setOrganizerProfile] = useState<OrganizerProfile | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [authReady, setAuthReady] = useState(false);
  const [isAdminDoc, setIsAdminDoc] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>('login');
  const [authPromptReason, setAuthPromptReason] = useState<string | null>(null);

  const syncUserDocuments = useCallback(async (nextUser: User, preferredName?: string) => {
    const fallbackName = (
      preferredName ||
      nextUser.displayName ||
      nextUser.email?.split('@')[0] ||
      'Explorador POA'
    ).slice(0, 100);

    const userRef = doc(db, 'users', nextUser.uid);

    // Firestore rules require email_verified == true for creating/updating users/{uid}.
    // Unverified email/password accounts still get an in-memory profile until verified.
    if (!nextUser.emailVerified) {
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          setProfile(snap.data() as UserProfile);
          return;
        }
      } catch {
        // Fallback to in-memory profile from Firebase Auth user
      }
      setProfile((prev) => ({
        uid: nextUser.uid,
        displayName:
          prev && prev.uid === nextUser.uid && prev.displayName && prev.displayName !== 'Explorador POA'
            ? prev.displayName
            : fallbackName,
        email: (nextUser.email || '').slice(0, 200),
        photoURL: (nextUser.photoURL || '').slice(0, 500),
        role: 'user',
        favoriteCategories: prev?.uid === nextUser.uid ? prev.favoriteCategories : [],
        favoriteNeighborhoods: prev?.uid === nextUser.uid ? prev.favoriteNeighborhoods : [],
      }));
      setIsAdminDoc(false);
      return;
    }

    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      const newProfile = {
        uid: nextUser.uid,
        displayName: fallbackName,
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
  }, []);

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
        await syncUserDocuments(nextUser);
      } catch (err) {
        console.warn('Perfil de usuário não pôde ser sincronizado:', err);
      } finally {
        setAuthReady(true);
      }
    });

    return () => unsub();
  }, [syncUserDocuments]);

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

  const openAuthModal = useCallback(
    (reason?: string, mode?: AuthModalMode) => {
      setAuthPromptReason(reason ?? null);
      if (mode) {
        setAuthModalMode(mode);
      } else if (user && !user.emailVerified) {
        setAuthModalMode('verify');
      } else {
        setAuthModalMode('login');
      }
      setAuthModalOpen(true);
    },
    [user],
  );

  const closeAuthModal = useCallback(() => {
    setAuthModalOpen(false);
    setAuthPromptReason(null);
  }, []);

  const requireVerifiedAccount = useCallback(
    (reason: string): boolean => {
      if (!user) {
        openAuthModal(reason, 'login');
        return false;
      }
      if (!user.emailVerified) {
        openAuthModal(
          `Confirme seu e-mail (${user.email || 'cadastrado'}) para continuar.`,
          'verify',
        );
        return false;
      }
      return true;
    },
    [user, openAuthModal],
  );

  const loginWithGoogle = useCallback(async () => {
    auth.languageCode = 'pt-BR';
    const cred = await signInWithPopup(auth, googleProvider);
    setAuthModalOpen(false);
    setAuthPromptReason(null);
    return cred.user;
  }, []);

  const loginWithEmail = useCallback(
    async ({ email, password }: { email: string; password: string }) => {
      auth.languageCode = 'pt-BR';
      const cred = await signInWithEmailAndPassword(auth, normalizeEmail(email), password);
      if (cred.user.emailVerified) {
        setAuthModalOpen(false);
        setAuthPromptReason(null);
      } else {
        setAuthModalMode('verify');
      }
      return cred.user;
    },
    [],
  );

  const registerWithEmail = useCallback(
    async ({ name, email, password }: { name: string; email: string; password: string }) => {
      auth.languageCode = 'pt-BR';
      const cleanName = normalizeDisplayName(name).slice(0, 100);
      const cleanEmail = normalizeEmail(email);

      const cred = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      await updateProfile(cred.user, { displayName: cleanName });

      setProfile({
        uid: cred.user.uid,
        displayName: cleanName,
        email: cleanEmail,
        photoURL: cred.user.photoURL || '',
        role: 'user',
        favoriteCategories: [],
        favoriteNeighborhoods: [],
      });

      if (!cred.user.emailVerified) {
        try {
          await sendEmailVerification(cred.user);
        } catch (verifyErr) {
          console.warn('Não foi possível enviar o e-mail de confirmação imediatamente:', verifyErr);
        }
        setAuthModalMode('verify');
      } else {
        await syncUserDocuments(cred.user, cleanName);
        setAuthModalOpen(false);
        setAuthPromptReason(null);
      }

      return cred.user;
    },
    [syncUserDocuments],
  );

  const sendPasswordReset = useCallback(async (email: string) => {
    auth.languageCode = 'pt-BR';
    await sendPasswordResetEmail(auth, normalizeEmail(email));
  }, []);

  const resendVerificationEmail = useCallback(async () => {
    if (!auth.currentUser) return;
    auth.languageCode = 'pt-BR';
    await sendEmailVerification(auth.currentUser);
  }, []);

  const refreshAuthUser = useCallback(async (): Promise<boolean> => {
    if (!auth.currentUser) return false;
    await auth.currentUser.reload();
    await auth.currentUser.getIdToken(true);
    const refreshed = auth.currentUser;
    setUser(refreshed);
    if (refreshed.emailVerified) {
      await syncUserDocuments(refreshed, profile?.displayName);
      setAuthModalOpen(false);
      setAuthPromptReason(null);
      return true;
    }
    return false;
  }, [profile?.displayName, syncUserDocuments]);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const updateDisplayName = useCallback(
    async (rawName: string) => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;
      const cleanName = normalizeDisplayName(rawName).slice(0, 100);
      if (cleanName.length < 2) return;

      await updateProfile(currentUser, { displayName: cleanName });

      if (currentUser.emailVerified) {
        const uid = currentUser.uid;
        const path = `users/${uid}`;
        try {
          const userRef = doc(db, 'users', uid);
          const snap = await getDoc(userRef);
          if (snap.exists()) {
            await updateDoc(userRef, {
              displayName: cleanName,
              updatedAt: serverTimestamp(),
            });
          } else {
            await setDoc(userRef, {
              uid,
              displayName: cleanName,
              email: (currentUser.email || '').slice(0, 200),
              photoURL: (currentUser.photoURL || '').slice(0, 500),
              role: 'user',
              favoriteCategories: profile?.favoriteCategories || [],
              favoriteNeighborhoods: profile?.favoriteNeighborhoods || [],
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, path);
        }
      }

      setProfile((prev) =>
        prev
          ? { ...prev, displayName: cleanName }
          : {
              uid: currentUser.uid,
              displayName: cleanName,
              email: currentUser.email || '',
              photoURL: currentUser.photoURL || '',
              role: 'user',
              favoriteCategories: [],
              favoriteNeighborhoods: [],
            },
      );
    },
    [profile?.favoriteCategories, profile?.favoriteNeighborhoods],
  );

  const updatePreferences = useCallback(
    async (favoriteCategories: string[], favoriteNeighborhoods: string[]) => {
      if (!user) return;
      if (!user.emailVerified) {
        openAuthModal('Confirme seu e-mail para salvar suas preferências.', 'verify');
        return;
      }
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
    [user, openAuthModal],
  );

  const isFavorited = useCallback(
    (targetType: 'event' | 'venue', targetId: string) =>
      favorites.some((f) => f.targetType === targetType && f.targetId === targetId),
    [favorites],
  );

  const isEmailVerified = Boolean(user?.emailVerified);
  const authProvider = detectAuthProvider(user);

  const isAdmin = Boolean(
    user &&
      user.emailVerified &&
      (user.email === BOOTSTRAPPED_ADMIN_EMAIL || isAdminDoc || profile?.role === 'admin'),
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
        isEmailVerified,
        authProvider,
        authModalOpen,
        authModalMode,
        authPromptReason,
        openAuthModal,
        setAuthModalMode,
        closeAuthModal,
        requireVerifiedAccount,
        loginWithGoogle,
        loginWithEmail,
        registerWithEmail,
        sendPasswordReset,
        resendVerificationEmail,
        refreshAuthUser,
        logout,
        updateDisplayName,
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
