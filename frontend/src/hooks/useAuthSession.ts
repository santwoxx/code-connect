/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth, isBusinessHours, isAdmin, runDailyBackup, getBackupInfo } from '../firebase';
import {
  checkEmailIsAllowed,
  getUserRole,
  fetchSellers,
  fetchMontadores,
  fetchDeliverers,
  fetchEstoquistas,
  fetchCaixas,
  seedDatabaseIfEmpty,
  migrateUserPinsToFirestore
} from '../db';
import { Seller, Montador, Deliverer } from '../types';

// Dono de toda a sessão de autenticação: login (Google + operadores customizados como
// entregador/montador/estoquista/caixa vinculados por e-mail), bloqueio por horário
// comercial, auto-lock por inatividade, e o backup diário disparado para admins.
// Recebe setActiveTab por fora porque a navegação de abas é uma preocupação do App
// inteiro, não só da sessão -- o hook só decide PARA QUAL aba ir após login.
export function useAuthSession(setActiveTab: (tab: string) => void) {
  const [user, setUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<string>('admin');
  const [authLoading, setAuthLoading] = useState(true);
  const [sessionUnlocked, setSessionUnlocked] = useState(false);
  const [blockedByTime, setBlockedByTime] = useState(false);
  const [currentSeller, setCurrentSeller] = useState<Seller | null>(null);
  const [currentMontador, setCurrentMontador] = useState<Montador | null>(null);
  const [currentDeliverer, setCurrentDeliverer] = useState<Deliverer | null>(null);

  const loadFirestoreData = async (role: string) => {
    try {
      await seedDatabaseIfEmpty();
    } catch (e) {
      console.warn("Seeding failed or skipped:", e);
    }
    // One-time migration: move per-user PINs from source code to Firestore
    if (isAdmin(role)) {
      migrateUserPinsToFirestore().catch(e => console.warn('Pin migration skipped:', e));
    }
  };

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      // Prioritize restoring cached custom role operator (like 'entregador' or custom credential)
      const storedCustom = localStorage.getItem('centralsync_custom_user');
      if (storedCustom) {
        try {
          const parsed = JSON.parse(storedCustom);
          if (parsed && parsed.user && parsed.role) {
            if (!isAdmin(parsed.role) && parsed.role !== 'entregador' && parsed.role !== 'montador' && !isBusinessHours()) {
              localStorage.removeItem('centralsync_custom_user');
              await signOut(auth);
              setBlockedByTime(true);
              setAuthLoading(false);
              return;
            }
            setUser(parsed.user as User);
            setUserRole(parsed.role);
            setSessionUnlocked(true);

            if (parsed.role === 'estoquista') {
              setActiveTab('estoque');
            } else if (parsed.role === 'entregador' || parsed.role === 'montador') {
              setActiveTab('entregas');
            } else if (parsed.role === 'vendedor') {
              setActiveTab('vendedor-dashboard');
            } else if (parsed.role === 'caixa') {
              setActiveTab('caixa-dashboard');
            } else {
              setActiveTab('dashboard');
            }

            await loadFirestoreData(parsed.role);

            if (parsed.role === 'vendedor') {
              const sellersList = await fetchSellers();
              const matched = sellersList.find(s => (parsed.entityId && s.id === parsed.entityId) || s.googleEmail?.toLowerCase() === parsed.user.email?.toLowerCase());
              if (matched && matched.active !== false) {
                setCurrentSeller(matched);
              } else {
                localStorage.removeItem('centralsync_custom_user');
                await signOut(auth);
                setUser(null);
                setSessionUnlocked(false);
                return;
              }
            } else if (parsed.role === 'entregador') {
              const deliverersList = await fetchDeliverers();
              const matched = deliverersList.find(d => (parsed.entityId && d.id === parsed.entityId) || d.googleEmail?.toLowerCase() === parsed.user.email?.toLowerCase());
              if (matched && matched.active !== false) {
                setActiveTab('entregas');
                setCurrentDeliverer(matched);
              } else {
                localStorage.removeItem('centralsync_custom_user');
                await signOut(auth);
                setUser(null);
                setSessionUnlocked(false);
                return;
              }
            } else if (parsed.role === 'estoquista') {
              const estoquistasList = await fetchEstoquistas();
              const matched = estoquistasList.find(e => (parsed.entityId && e.id === parsed.entityId) || e.googleEmail?.toLowerCase() === parsed.user.email?.toLowerCase());
              if (matched && matched.active !== false) {
                setActiveTab('estoque');
              } else {
                localStorage.removeItem('centralsync_custom_user');
                await signOut(auth);
                setUser(null);
                setSessionUnlocked(false);
                return;
              }
            } else if (parsed.role === 'caixa') {
              const caixasList = await fetchCaixas();
              const matched = caixasList.find(c => (parsed.entityId && c.id === parsed.entityId) || c.googleEmail?.toLowerCase() === parsed.user.email?.toLowerCase());
              if (matched && matched.active !== false) {
                setActiveTab('caixa-dashboard');
              } else {
                localStorage.removeItem('centralsync_custom_user');
                await signOut(auth);
                setUser(null);
                setSessionUnlocked(false);
                return;
              }
            } else if (parsed.role === 'montador') {
              const montadoresList = await fetchMontadores();
              const matched = montadoresList.find(m => (parsed.entityId && m.id === parsed.entityId) || m.googleEmail?.toLowerCase() === parsed.user.email?.toLowerCase());
              if (matched && matched.active !== false) {
                setActiveTab('entregas');
                setCurrentMontador(matched);
              } else {
                localStorage.removeItem('centralsync_custom_user');
                await signOut(auth);
                setUser(null);
                setSessionUnlocked(false);
                return;
              }
            } else {
              setActiveTab('dashboard');
            }

            setAuthLoading(false);
            return;
          }
        } catch (e) {
          console.error("Erro ao restaurar operador customizado caje:", e);
        }
      }

      if (currentUser && currentUser.email) {
        const isAllowed = await checkEmailIsAllowed(currentUser.email);
        if (isAllowed) {
          const role = await getUserRole(currentUser.email);
          setUserRole(role);
          setUser(currentUser);

          // Check if session has been unlocked with master password during this tab lifetime
          const unlockedKey = `centralsync_unlocked_${currentUser.uid}`;
          const alreadyUnlocked = sessionStorage.getItem(unlockedKey) === 'true';

          if (alreadyUnlocked) {
            setSessionUnlocked(true);
            const customUserRaw = localStorage.getItem('centralsync_custom_user');
            const savedEntityId = customUserRaw ? JSON.parse(customUserRaw).entityId : null;

            if (role === 'estoquista') {
              setActiveTab('estoque');
            } else if (role === 'entregador' || role === 'montador') {
              setActiveTab('entregas');
              if (role === 'montador') {
                const montadoresList = await fetchMontadores();
                const matched = montadoresList.find(m => savedEntityId ? m.id === savedEntityId : m.googleEmail?.toLowerCase() === currentUser.email?.toLowerCase());
                if (matched) {
                  setCurrentMontador(matched);
                }
              }
            } else if (role === 'vendedor') {
              setActiveTab('vendedor-dashboard');
              const sellersList = await fetchSellers();
              const matched = sellersList.find(s => savedEntityId ? s.id === savedEntityId : s.googleEmail?.toLowerCase() === currentUser.email?.toLowerCase());
              if (matched) {
                setCurrentSeller(matched);
              }
            } else if (role === 'caixa') {
              setActiveTab('caixa-dashboard');
            }
            await loadFirestoreData(role);
          } else {
            // Not unlocked, force LoginView step 2
            setSessionUnlocked(false);
          }
        } else {
          // If not directly whitelisted (admin), check if this email is a linked seller, deliverer, estoquista or caixa
          // Try to get specific entity ID from storage first to handle shared accounts
          const customUserRaw = localStorage.getItem('centralsync_custom_user');
          const savedEntityId = customUserRaw ? JSON.parse(customUserRaw).entityId : null;

          const sellersList = await fetchSellers();
          const matchedSeller = sellersList.find(s => savedEntityId ? s.id === savedEntityId : s.googleEmail?.toLowerCase() === currentUser.email?.toLowerCase());

          const deliverersList = await fetchDeliverers();
          const matchedDeliverer = deliverersList.find(d => savedEntityId ? d.id === savedEntityId : d.googleEmail?.toLowerCase() === currentUser.email?.toLowerCase());

          const estoquistasList = await fetchEstoquistas();
          const matchedEstoquista = estoquistasList.find(e => savedEntityId ? e.id === savedEntityId : e.googleEmail?.toLowerCase() === currentUser.email?.toLowerCase());

          const caixasList = await fetchCaixas();
          const matchedCaixa = caixasList.find(c => savedEntityId ? c.id === savedEntityId : c.googleEmail?.toLowerCase() === currentUser.email?.toLowerCase());

          const unlockedKey = `centralsync_unlocked_${currentUser.uid}`;
          const alreadyUnlocked = sessionStorage.getItem(unlockedKey) === 'true';

          if (matchedSeller) {
            if (matchedSeller.active !== false) {
              setUserRole('vendedor');
              setUser(currentUser);
              setCurrentSeller(matchedSeller);
              if (alreadyUnlocked) {
                setSessionUnlocked(true);
                setActiveTab('vendedor-dashboard');
                localStorage.setItem('centralsync_custom_user', JSON.stringify({ user: currentUser, role: 'vendedor', entityId: matchedSeller.id, entityName: matchedSeller.name }));
                await loadFirestoreData('vendedor');
              }
            } else {
              await signOut(auth);
              setUser(null);
              setSessionUnlocked(false);
            }
          } else if (matchedDeliverer) {
            if (matchedDeliverer.active !== false) {
              setUserRole('entregador');
              setUser(currentUser);
              setCurrentDeliverer(matchedDeliverer);
              if (alreadyUnlocked) {
                setSessionUnlocked(true);
                setActiveTab('entregas');
                localStorage.setItem('centralsync_custom_user', JSON.stringify({ user: currentUser, role: 'entregador', entityId: matchedDeliverer.id, entityName: matchedDeliverer.name }));
                await loadFirestoreData('entregador');
              }
            } else {
              await signOut(auth);
              setUser(null);
              setSessionUnlocked(false);
            }
          } else if (matchedEstoquista) {
            if (matchedEstoquista.active !== false) {
              setUserRole('estoquista');
              setUser(currentUser);
              if (alreadyUnlocked) {
                setSessionUnlocked(true);
                setActiveTab('estoque');
                localStorage.setItem('centralsync_custom_user', JSON.stringify({ user: currentUser, role: 'estoquista', entityId: matchedEstoquista.id, entityName: matchedEstoquista.name }));
                await loadFirestoreData('estoquista');
              }
            } else {
              await signOut(auth);
              setUser(null);
              setSessionUnlocked(false);
            }
          } else if (matchedCaixa) {
            if (matchedCaixa.active !== false) {
              setUserRole('caixa');
              setUser(currentUser);
              if (alreadyUnlocked) {
                setSessionUnlocked(true);
                setActiveTab('caixa-dashboard');
                localStorage.setItem('centralsync_custom_user', JSON.stringify({ user: currentUser, role: 'caixa', entityId: matchedCaixa.id, entityName: matchedCaixa.name }));
                await loadFirestoreData('caixa');
              }
            } else {
              await signOut(auth);
              setUser(null);
              setSessionUnlocked(false);
            }
          } else {
            const montadoresList = await fetchMontadores();
            const matchedMontador = montadoresList.find(m => m.googleEmail?.toLowerCase() === currentUser.email?.toLowerCase());

            if (matchedMontador) {
              if (matchedMontador.active !== false) {
                setUserRole('montador');
                setUser(currentUser);
                setCurrentMontador(matchedMontador);
                if (alreadyUnlocked) {
                  setSessionUnlocked(true);
                  setActiveTab('entregas');
                  localStorage.setItem('centralsync_custom_user', JSON.stringify({ user: currentUser, role: 'montador', entityId: matchedMontador.id, entityName: matchedMontador.name }));
                  await loadFirestoreData('montador');
                }
              } else {
                await signOut(auth);
                setUser(null);
                setSessionUnlocked(false);
              }
            } else if (localStorage.getItem('centralsync_linking') === 'true') {
              // In the process of linking credentials, preserve Google user state
              setUser(currentUser);
            } else {
              await signOut(auth);
              setUser(null);
              setSessionUnlocked(false);
            }
          }
        }
      } else {
        setUser(null);
        setSessionUnlocked(false);
      }
      setAuthLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Periodic time check to block non-admin users after 18:00
  useEffect(() => {
    if (!user) return;

    const check = () => {
      if (!isAdmin(userRole) && userRole !== 'entregador' && userRole !== 'montador' && !isBusinessHours()) {
        setBlockedByTime(true);
        handleLogout();
      }
    };

    check();
    const interval = setInterval(check, 60000);
    return () => clearInterval(interval);
  }, [user, userRole]);

  // Auto-Lock on Inactivity.
  // Field workers (entregador/montador) get 60 min — they can't interact with screen while working.
  // Office/admin users get 5 minutes for tighter security.
  useEffect(() => {
    if (!user) return;
    if (isAdmin(userRole)) return; // Administrators never auto-lock

    const isFieldWorker = userRole === 'entregador' || userRole === 'montador';
    const TIMEOUT_MS = isFieldWorker ? 60 * 60 * 1000 : 5 * 60 * 1000;
    const TIMEOUT_LABEL = isFieldWorker ? '60 minutos' : '5 minutos';

    let timeoutId: NodeJS.Timeout;

    const resetTimer = () => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        console.log(`[Auto-Lock] User inactive for ${TIMEOUT_LABEL}. Logging out...`);
        handleLogout();
        alert(`Sessão expirada por inatividade (${TIMEOUT_LABEL}). Por segurança, você foi desconectado.`);
      }, TIMEOUT_MS);
    };

    // Initial set
    resetTimer();

    const events = ['mousemove', 'mousedown', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      window.addEventListener(event, resetTimer);
    });

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, [user, userRole]);

  // Daily backup trigger for admin users
  useEffect(() => {
    if (!user || !isAdmin(userRole)) return;

    getBackupInfo().then(info => {
      if (!info.todayBackupExists) {
        runDailyBackup().then(result => {
          if (result.success) {
            console.log('Daily backup completed:', result.message);
          } else {
            console.warn('Daily backup failed:', result.message);
          }
        });
      }
    });
  }, [user, userRole]);

  const handleLoginSuccess = async (loggedInUser: User, customRole?: string, entityId?: string, entityName?: string) => {
    const role = customRole || await getUserRole(loggedInUser.email || '');

    if (!isAdmin(role) && role !== 'entregador' && role !== 'montador' && !isBusinessHours()) {
      setBlockedByTime(true);
      await signOut(auth);
      return;
    }

    setUser(loggedInUser);
    setUserRole(role);
    if (customRole) {
      localStorage.setItem('centralsync_custom_user', JSON.stringify({ user: loggedInUser, role: customRole, entityId, entityName }));
    }
    const unlockedKey = `centralsync_unlocked_${loggedInUser.uid}`;
    sessionStorage.setItem(unlockedKey, 'true');
    setSessionUnlocked(true);
    if (role === 'estoquista') {
      setActiveTab('estoque');
    } else if (role === 'entregador' || role === 'montador') {
      setActiveTab('entregas');
    } else if (role === 'vendedor') {
      setActiveTab('vendedor-dashboard');
    } else if (role === 'caixa') {
      setActiveTab('caixa-dashboard');
    } else {
      setActiveTab('dashboard');
    }
    await loadFirestoreData(role);
    if (role === 'vendedor') {
      const sellersList = await fetchSellers();
      const matched = sellersList.find(s => entityId ? s.id === entityId : s.googleEmail?.toLowerCase() === loggedInUser.email?.toLowerCase());
      if (matched) {
        setCurrentSeller(matched);
      }
    }
    if (role === 'montador') {
      const montadoresList = await fetchMontadores();
      const matched = montadoresList.find(m => entityId ? m.id === entityId : (m.id === loggedInUser.uid || m.googleEmail?.toLowerCase() === loggedInUser.email?.toLowerCase()));
      if (matched) {
        setCurrentMontador(matched);
      }
    }
    if (role === 'entregador') {
      const deliverersList = await fetchDeliverers();
      const matched = deliverersList.find(d => entityId ? d.id === entityId : (d.id === loggedInUser.uid || d.googleEmail?.toLowerCase() === loggedInUser.email?.toLowerCase()));
      if (matched) {
        setCurrentDeliverer(matched);
      }
    }
  };

  const handleLogout = async () => {
    localStorage.removeItem('centralsync_custom_user');
    if (user) {
      const unlockedKey = `centralsync_unlocked_${user.uid}`;
      sessionStorage.removeItem(unlockedKey);
    }
    // Vendedores compartilham uma única conta Google (vendacentralmoveis@gmail.com).
    // Manter essa sessão do Firebase ativa entre trocas de vendedor evita reabrir o
    // popup do Google a cada troca -- LoginView pula direto para usuário/senha
    // (Passo 2), que continua sendo obrigatório para identificar o vendedor.
    const isSharedVendedorAccount = userRole === 'vendedor' && user?.email?.toLowerCase() === 'vendacentralmoveis@gmail.com';
    if (!isSharedVendedorAccount) {
      await signOut(auth);
    }
    setUser(null);
    setUserRole('vendedor');
    setCurrentSeller(null);
    setCurrentMontador(null);
    setCurrentDeliverer(null);
    setSessionUnlocked(false);
  };

  return {
    user,
    userRole,
    authLoading,
    sessionUnlocked,
    blockedByTime,
    currentSeller,
    currentMontador,
    currentDeliverer,
    handleLoginSuccess,
    handleLogout
  };
}
