import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import FilterBar from './components/FilterBar';
import ProjectCard, { ProjectSkeleton } from './components/ProjectCard';
import MusicPlayer from './components/MusicPlayer';
import ProfilePage from './components/ProfilePage';
import UploadPage from './components/UploadPage';
import DashboardPage from './components/DashboardPage';
import MessagesPage from './components/MessagesPage';
import ManageServicesPage from './components/ManageServicesPage';
import ContractsPage from './components/ContractsPage';
import PostServicePage from './components/PostServicePage';
import NotesPage from './components/NotesPage';
import BrowseTalentPage from './components/BrowseTalentPage';
import FollowingPage from './components/FollowingPage';
import CollaboratePage from './components/CollaboratePage';
import LibraryPage from './components/LibraryPage';
import CheckoutPage from './components/CheckoutPage';
import SettingsPage from './components/SettingsPage';
import GetHelpPage from './components/GetHelpPage';
import AuthModal from './components/AuthModal';
import { TermsPage, PrivacyPage } from './components/LegalPages';
import InvoicesPage from './components/InvoicesPage';
import RoadmapPage from './components/RoadmapPage';
import SubscriptionPage from './components/SubscriptionPage';
import MobileCart from './components/MobileCart';
import NotLoggedInState from './components/NotLoggedInState';
import { FloatingMessenger } from './components/FloatingMessenger';
import BottomNav from './components/BottomNav';
import PullToRefresh from './components/PullToRefresh';
import { getProjects, getUserProfile, supabase, signOut, updateUserProfile, getCurrentUser, searchProfiles, searchServices } from './services/supabaseService';
import { Project, FilterState, View, UserProfile, TalentProfile, Service } from './types';

import { CartProvider } from './contexts/CartContext';
import { PurchaseModalProvider } from './contexts/PurchaseModalContext';
import { ToastProvider } from './contexts/ToastContext';
import { FileOperationProvider } from './contexts/FileOperationContext';
import { FileOperationNotificationContainer } from './components/FileOperationNotification';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);

  // User State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gemsClaimedToday, setGemsClaimedToday] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Search State
  const [searchedProfiles, setSearchedProfiles] = useState<TalentProfile[]>([]);
  const [searchedServices, setSearchedServices] = useState<Service[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  // Get current view from URL path
  const getCurrentViewFromPath = (pathname: string): View => {
    // Handle profile routes - both @username and /profile
    if (pathname.startsWith('/@') || pathname === '/profile') return 'profile';
    if (pathname === '/upload') return 'upload';
    if (pathname === '/browse-talent') return 'browse-talent';
    if (pathname === '/following') return 'following';
    if (pathname === '/collaborate') return 'collaborate';
    if (pathname === '/library') return 'library';
    if (pathname === '/checkout') return 'checkout';
    if (pathname === '/contracts') return 'contracts';
    if (pathname === '/post-service') return 'post-service';
    if (pathname === '/notes') return 'notes';
    if (pathname === '/settings') return 'settings';
    if (pathname === '/help') return 'help';
    if (pathname === '/terms') return 'terms';
    if (pathname === '/privacy') return 'privacy';
    if (pathname === '/subscription') return 'subscription';
    if (pathname.startsWith('/dashboard')) {
      if (pathname === '/dashboard/messages') return 'dashboard-messages';
      if (pathname === '/dashboard/manage') return 'dashboard-manage';
      if (pathname === '/dashboard/settings') return 'dashboard-settings';
      if (pathname === '/dashboard/help') return 'dashboard-help';
      if (pathname === '/dashboard/invoices') return 'dashboard-invoices';
      if (pathname === '/dashboard/invoices') return 'dashboard-invoices';
      if (pathname === '/dashboard/roadmap') return 'dashboard-roadmap';
      if (pathname === '/dashboard/orders') return 'dashboard-orders';
      if (pathname === '/dashboard/studio') return 'dashboard-studio';
      if (pathname === '/dashboard/sales') return 'dashboard-sales';
      if (pathname === '/dashboard/wallet') return 'dashboard-wallet';
      if (pathname === '/dashboard/analytics') return 'dashboard-analytics';
      return 'dashboard-overview';
    }
    return 'home';
  };

  const [currentView, setCurrentView] = useState<View>(getCurrentViewFromPath(location.pathname));
  const [profileUsername, setProfileUsername] = useState<string | null>(
    location.pathname.startsWith('/@') ? decodeURIComponent(location.pathname.substring(2)) : null
  );

  const [filters, setFilters] = useState<FilterState>({
    genre: "All Genres",
    rootKey: "All Keys",
    scaleType: "All Scales",
    minBpm: 0,
    maxBpm: 300,
    minPrice: 0,
    maxPrice: 1000,
    searchQuery: ""
  });

  // Update view and profile username when location changes
  useEffect(() => {
    const newView = getCurrentViewFromPath(location.pathname);
    let newProfileUsername: string | null = null;

    if (location.pathname.startsWith('/@')) {
      try {
        // Extract username from path and decode URI components
        const encodedUsername = location.pathname.substring(2);
        newProfileUsername = decodeURIComponent(encodedUsername);
      } catch (error) {
        console.warn('Failed to decode profile username:', location.pathname);
        // Fallback to raw username if decoding fails
        newProfileUsername = location.pathname.substring(2);
      }
    }

    setCurrentView(newView);
    setProfileUsername(newProfileUsername);

    // Reset scroll position to top on every view change
    if (mainRef.current) {
      mainRef.current.scrollTo(0, 0);
    }
  }, [location.pathname]);

  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error("Failed to fetch projects:", err);
      setError("Could not connect to database. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Check for existing auth session on app load
  useEffect(() => {
    const checkAuthState = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setIsLoggedIn(true);
        }
      } catch (error) {
        console.error('Error checking auth state:', error);
      }
    };

    checkAuthState();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.id);

        if (event === 'SIGNED_IN' && session?.user) {
          setIsLoggedIn(true);
        } else if (event === 'SIGNED_OUT') {
          setIsLoggedIn(false);
          setUserProfile(null);
        }
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const fetchUserProfile = async () => {
      setProfileLoading(true);
      if (isLoggedIn) {
        try {
          const profile = await getUserProfile();
          if (profile) {
            setUserProfile(profile);
            // Check if gems were claimed today
            if (profile.lastGemClaimDate) {
              const lastClaim = new Date(profile.lastGemClaimDate);
              const today = new Date();
              const isToday = lastClaim.toDateString() === today.toDateString();
              setGemsClaimedToday(isToday);
            } else {
              setGemsClaimedToday(false);
            }
          }
        } catch (err) {
          console.error("Failed to fetch user profile:", err);
        }
      } else {
        setUserProfile(null);
        setGemsClaimedToday(false);
      }
      setProfileLoading(false);
    };
    fetchUserProfile();

    const handleProfileUpdate = () => fetchUserProfile();
    window.addEventListener('profile-updated', handleProfileUpdate);

    return () => {
      window.removeEventListener('profile-updated', handleProfileUpdate);
    };
  }, [isLoggedIn]);

  // Auth Guard for protected routes
  useEffect(() => {
    // Specifically redirect /upload if not logged in as requested
    if (!profileLoading && !isLoggedIn && currentView === 'upload') {
      navigate('/');
    }
  }, [isLoggedIn, profileLoading, currentView, navigate]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesGenre = filters.genre === "All Genres" || p.genre === filters.genre;
      // Key Filtering Logic
      let matchesKey = true;
      if (filters.rootKey !== "All Keys") {
        if (filters.scaleType === "Major") {
          // Exact match for Major (e.g., "C")
          matchesKey = p.key === filters.rootKey;
        } else if (filters.scaleType === "Minor") {
          // Match Root + "m" (e.g., "Cm")
          matchesKey = p.key === `${filters.rootKey}m`;
        } else {
          // Match either Major or Minor (e.g., "C" or "Cm")
          matchesKey = p.key === filters.rootKey || p.key === `${filters.rootKey}m`;
        }
      } else if (filters.scaleType !== "All Scales") {
        // Root is "All", but Scale is specific
        if (filters.scaleType === "Major") {
          // Major keys usually don't have 'm' at the end (simplistic assumption for this mock data)
          // Actually, we should check if it DOESNT end in 'm'
          matchesKey = !p.key?.endsWith('m');
        } else if (filters.scaleType === "Minor") {
          matchesKey = !!p.key?.endsWith('m');
        }
      }

      const query = filters.searchQuery.toLowerCase().trim();
      if (!query) return matchesGenre && matchesKey;

      const searchableContent = `${p.title} ${p.producer} ${p.genre} ${p.key} ${p.tags.join(' ')}`.toLowerCase();

      const searchTerms = query.split(/\s+/).filter(t => t.length > 0);
      const matchesSearch = searchTerms.every(term => searchableContent.includes(term));

      return matchesGenre && matchesKey && matchesSearch;
    });
  }, [projects, filters]);

  // Effect to handle unified search
  useEffect(() => {
    const performSearch = async () => {
      const query = filters.searchQuery.trim();
      if (!query) {
        setSearchedProfiles([]);
        setSearchedServices([]);
        setIsSearching(false);
        return;
      }

      setIsSearching(true);
      try {
        const [profiles, services] = await Promise.all([
          searchProfiles(query),
          searchServices(query)
        ]);
        setSearchedProfiles(profiles);
        setSearchedServices(services);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    };

    // Debounce search
    const timer = setTimeout(() => {
      performSearch();
    }, 500);

    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // Plays a specific track from a project
  const handlePlayTrack = (project: Project, trackId: string) => {
    if (currentProject?.id === project.id && currentTrackId === trackId) {
      setIsPlaying(!isPlaying);
    } else {
      setCurrentProject(project);
      setCurrentTrackId(trackId);
      setIsPlaying(true);
    }
  };

  // Toggles play/pause for the currently active track/project
  const handleTogglePlay = () => {
    if (currentProject && currentTrackId) {
      setIsPlaying(!isPlaying);
    }
  };

  const handleNextTrack = () => {
    if (!currentProject || !currentTrackId) return;

    const currentIndex = currentProject.tracks.findIndex(t => (t.id || `track-${currentProject.tracks.indexOf(t)}`) === currentTrackId);
    if (currentIndex === -1) return;

    if (currentIndex < currentProject.tracks.length - 1) {
      const nextTrack = currentProject.tracks[currentIndex + 1];
      setCurrentTrackId(nextTrack.id || `track-${currentIndex + 1}`);
      setIsPlaying(true);
    } else {
      // Loop back to start or stop? Let's loop for now as it's friendlier
      const firstTrack = currentProject.tracks[0];
      setCurrentTrackId(firstTrack.id || `track-0`);
      setIsPlaying(true);
    }
  };

  const handlePrevTrack = () => {
    if (!currentProject || !currentTrackId) return;

    const currentIndex = currentProject.tracks.findIndex(t => (t.id || `track-${currentProject.tracks.indexOf(t)}`) === currentTrackId);
    if (currentIndex === -1) return;

    if (currentIndex > 0) {
      const prevTrack = currentProject.tracks[currentIndex - 1];
      setCurrentTrackId(prevTrack.id || `track-${currentIndex - 1}`);
      setIsPlaying(true);
    } else {
      // Go to last track if at start (loop)
      const lastTrack = currentProject.tracks[currentProject.tracks.length - 1];
      setCurrentTrackId(lastTrack.id || `track-${currentProject.tracks.length - 1}`);
      setIsPlaying(true);
    }
  };

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    if (currentView !== 'home') setCurrentView('home');
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setIsAuthModalOpen(false);
  };

  const handleLogout = async () => {
    try {
      await signOut();
      // The auth state change listener will handle setting isLoggedIn to false
      navigate('/'); // Redirect to home on logout
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleClaimDailyGems = async () => {
    if (!gemsClaimedToday && userProfile) {
      try {
        const currentUser = await getCurrentUser();
        if (currentUser) {
          const now = new Date().toISOString();
          await updateUserProfile(currentUser.id, {
            gems: userProfile.gems + 10,
            lastGemClaimDate: now
          });
          setUserProfile({ ...userProfile, gems: userProfile.gems + 10, lastGemClaimDate: now });
          setGemsClaimedToday(true);
        }
      } catch (error) {
        console.error('Error claiming gems:', error);
      }
    }
  };

  const handleNavigate = (view: View | string) => {
    // Handle profile routes like @username
    if (typeof view === 'string' && view.startsWith('@')) {
      navigate(`/${view}`); // Navigate to /@username
    } else if (typeof view === 'string') {
      // Handle strings with query params or known paths
      // If it contains '?', simply navigate to it as a raw path
      if (view.includes('?')) {
        navigate(view);
      } else {
        const pathMap: Record<string, string> = {
          'home': '/',
          'upload': '/upload',
          'browse-talent': '/browse-talent',
          'following': '/following',
          'collaborate': '/collaborate',
          'library': '/library',
          'checkout': '/checkout',
          'contracts': '/contracts',
          'post-service': '/post-service',
          'notes': '/notes',
          'subscription': '/subscription',
          'settings': '/settings',
          'help': '/help',
          'terms': '/terms',
          'privacy': '/privacy',
          'dashboard-overview': '/dashboard',
          'dashboard-studio': '/dashboard/studio',
          'dashboard-sales': '/dashboard/sales',
          'dashboard-manage': '/dashboard/manage',
          'dashboard-orders': '/dashboard/orders',
          'dashboard-invoices': '/dashboard/invoices',
          'dashboard-messages': '/dashboard/messages',
          'dashboard-analytics': '/dashboard/analytics',
          'dashboard-wallet': '/dashboard/wallet',
          'dashboard-settings': '/dashboard/settings',
          'dashboard-roadmap': '/dashboard/roadmap',
          'dashboard-help': '/dashboard/help'
        };
        const path = pathMap[view] || '/';
        navigate(path);
      }
    } else {
      // Handle View enum values
      const pathMap: Record<View, string> = {
        'home': '/',
        'profile': '/profile', // Special route for current user's profile
        'upload': '/upload',
        'browse-talent': '/browse-talent',
        'following': '/following',
        'collaborate': '/collaborate',
        'library': '/library',
        'checkout': '/checkout',
        'contracts': '/contracts',
        'post-service': '/post-service',
        'notes': '/notes',
        'subscription': '/subscription',
        'settings': '/settings',
        'help': '/help',
        'terms': '/terms',
        'privacy': '/privacy',
        'dashboard-overview': '/dashboard',
        'dashboard-studio': '/dashboard/studio',
        'dashboard-sales': '/dashboard/sales',
        'dashboard-manage': '/dashboard/manage',
        'dashboard-orders': '/dashboard/orders',
        'dashboard-invoices': '/dashboard/invoices',
        'dashboard-messages': '/dashboard/messages',
        'dashboard-analytics': '/dashboard/analytics',
        'dashboard-wallet': '/dashboard/wallet',
        'dashboard-settings': '/dashboard/settings',
        'dashboard-roadmap': '/dashboard/roadmap',
        'dashboard-help': '/dashboard/help'
      };
      const path = pathMap[view] || '/';
      navigate(path);
    }
    setIsMobileMenuOpen(false);
  };

  const getBottomStackHeightCSS = () => {
    // Base bottom nav height (mobile)
    const mobileNavHeight = 56; // approx 3.5rem
    const playerHeightMobile = 64; // approx h-16
    const playerHeightDesktopExpanded = 90;

    let baseHeight = 0;

    if (window.innerWidth < 1024) {
      // Mobile Logic
      baseHeight = mobileNavHeight;
      if (currentTrackId) baseHeight += playerHeightMobile;
    } else {
      // Desktop Logic
      if (isPlayerExpanded) {
        baseHeight = playerHeightDesktopExpanded;
      }
      // If floating, it doesn't push main content by default, but we might want to if we want clear view?
      // User said "prevent overlap... page content".
      // Let's add a small buffer if floating player is there?
      if (currentTrackId && !isPlayerExpanded) {
        // Floating player is bottom-6 right-6. It covers content.
        // Maybe we don't pad purely for floating player as it's meant to float over?
        // But user asked for "push each other out of way".
        // Let's safe-guard: if floating player, add 100px?
        // Actually, standard behavior is float over.
        // NOTE: FileNotification pushes UP from whatever player state is.
        // So if Player is floating, Notification is above it.
      }
    }

    return `calc(${baseHeight}px + var(--file-op-height, 0px) + env(safe-area-inset-bottom))`;
  };

  const uploadNotificationBottom = useMemo(() => {
    // Calculate where the notification should sit
    // Mobile: Above Player + Nav
    // Desktop Expanded: Above Player bar
    // Desktop Floating: Above floating player (approx 180px gap?)
    if (window.innerWidth < 1024) {
      return currentTrackId
        ? 'calc(130px + env(safe-area-inset-bottom))'
        : 'calc(70px + env(safe-area-inset-bottom))';
    }

    if (isPlayerExpanded) return '110px';
    if (currentTrackId) return '160px'; // Floating player clearance
    return '24px';
  }, [currentTrackId, isPlayerExpanded]);

  return (
    <CartProvider>
      <PurchaseModalProvider>
        <ToastProvider>
          <FileOperationProvider>
            <div className="h-screen h-[100dvh] w-full flex overflow-hidden overscroll-y-none selection:bg-primary/30 selection:text-primary transition-colors duration-500">
              <MobileCart onNavigate={handleNavigate} projects={projects} />
              <AuthModal
                isOpen={isAuthModalOpen}
                onClose={() => setIsAuthModalOpen(false)}
                onLogin={handleLogin}
              />

              <FileOperationNotificationContainer bottomOffset={uploadNotificationBottom} />

              <Sidebar
                currentView={currentView}
                onNavigate={handleNavigate}
                isLoggedIn={isLoggedIn}
                onOpenAuth={() => setIsAuthModalOpen(true)}
                userProfile={userProfile}
                profileLoading={profileLoading}
                isOpen={isMobileMenuOpen}
                onClose={() => setIsMobileMenuOpen(false)}
                isPlayerActive={!!currentTrackId}
              />

              {/* Main Layout Container - Adjusted padding for mobile and smaller sidebar */}
              <div className="flex-1 flex flex-col relative w-full">
                <TopBar
                  projects={projects}
                  currentView={currentView}
                  onSearch={handleSearch}
                  onNavigate={handleNavigate}
                  isLoggedIn={isLoggedIn}
                  userProfile={userProfile}
                  onOpenAuth={() => setIsAuthModalOpen(true)}
                  onLogout={handleLogout}
                  onClaimGems={handleClaimDailyGems}
                  gemsClaimedToday={gemsClaimedToday}
                  profileLoading={profileLoading}
                  onMenuClick={() => setIsMobileMenuOpen(true)}
                />

                <main ref={mainRef} style={{ paddingBottom: getBottomStackHeightCSS() }} className={`flex-1 ${currentView === 'notes' ? 'h-[calc(100vh-3.5rem)] overflow-hidden pt-[calc(56px+env(safe-area-inset-top))]' : currentView === 'dashboard-messages' ? 'overflow-hidden pt-[calc(56px+env(safe-area-inset-top))] lg:pt-[80px]' : 'overflow-y-auto overscroll-y-contain pt-[calc(80px+env(safe-area-inset-top))] lg:pt-[80px]'} scroll-smooth`}>

                  {currentView === 'home' && (
                    <PullToRefresh onRefresh={fetchProjects}>
                      <div className="w-full max-w-[1900px] mx-auto px-4 lg:px-10 xl:px-14 pt-4 lg:pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                        {isLoggedIn && !gemsClaimedToday && !profileLoading && userProfile && (
                          <div className="mb-4 mt-6 lg:mt-0 pt-3 pb-4 px-5 bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 rounded-xl flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-10 h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary animate-pulse">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z" /></svg>
                              </div>
                              <div>
                                <h3 className="font-bold text-white text-base">Daily Reward Available!</h3>
                                <p className="text-sm text-neutral-300 hidden sm:block">Claim your 10 free Gems for today.</p>
                              </div>
                            </div>
                            <button
                              onClick={handleClaimDailyGems}
                              className="px-4 py-2 bg-primary text-black font-bold rounded-lg text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                            >
                              Claim 10 Gems
                            </button>
                          </div>
                        )}

                        <FilterBar filters={filters} onFilterChange={setFilters} />

                        {error && (
                          <div className="mb-3 p-2 bg-yellow-500/10 border border-yellow-500/20 text-yellow-300 text-xs rounded-lg font-mono text-center">
                            {error}
                          </div>
                        )}

                        {loading ? (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6 pb-20">
                            {[...Array(12)].map((_, i) => (
                              <div key={i} className="h-auto md:h-[282px]">
                                <ProjectSkeleton />
                              </div>
                            ))}
                          </div>
                        ) : null}

                        {/* Search Results Sections */}
                        {filters.searchQuery && (
                          <div className="space-y-10 pb-20 mt-8">

                            {/* Profiles Section */}
                            {searchedProfiles.length > 0 && (
                              <section>
                                <div className="flex items-center gap-2 mb-4 px-1">
                                  <h2 className="text-lg font-bold text-white">Profiles</h2>
                                  <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">{searchedProfiles.length}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                  {searchedProfiles.map(profile => (
                                    <div
                                      key={profile.id}
                                      className="group bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl transition-all cursor-pointer"
                                      onClick={() => handleNavigate(`@${profile.handle}`)}
                                    >
                                      <div className="flex items-center gap-4">
                                        <div className="relative">
                                          <img
                                            src={profile.avatar}
                                            alt={profile.username}
                                            className="w-12 h-12 rounded-full object-cover border border-neutral-700 group-hover:border-primary/50 transition-colors"
                                          />
                                          {profile.isVerified && (
                                            <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-neutral-900"> <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg></div>
                                          )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <h3 className="font-bold text-white group-hover:text-primary transition-colors text-sm truncate">{profile.username}</h3>
                                          <p className="text-xs text-neutral-400 truncate">@{profile.handle}</p>
                                          <div className="flex gap-1 mt-1 flex-wrap">
                                            {profile.tags.slice(0, 2).map(tag => (
                                              <span key={tag} className="text-[10px] bg-neutral-800 text-neutral-300 px-1.5 py-0.5 rounded">{tag}</span>
                                            ))}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </section>
                            )}

                            {/* Services Section */}
                            {searchedServices.length > 0 && (
                              <section>
                                <div className="flex items-center gap-2 mb-4 px-1">
                                  <h2 className="text-lg font-bold text-white">Services</h2>
                                  <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">{searchedServices.length}</span>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                                  {searchedServices.map(service => (
                                    <div
                                      key={service.id}
                                      className="group bg-neutral-900/50 hover:bg-neutral-800/80 border border-neutral-800 hover:border-neutral-700 p-4 rounded-xl transition-all flex flex-col h-full"
                                    >
                                      <div className="flex items-start justify-between mb-2">
                                        <h3 className="font-bold text-white group-hover:text-primary text-sm line-clamp-2">{service.title}</h3>
                                        <span className="text-xs font-mono bg-primary/10 text-primary px-2 py-1 rounded ml-2 whitespace-nowrap">
                                          ${service.price}{service.rateType === 'hourly' ? '/hr' : ''}
                                        </span>
                                      </div>

                                      <p className="text-xs text-neutral-400 line-clamp-2 mb-3 flex-1">{service.description}</p>

                                      {service.user && (
                                        <div className="flex items-center gap-2 pt-3 border-t border-neutral-800/50 mt-auto">
                                          <img src={service.user.avatar || 'https://upload.wikimedia.org/wikipedia/commons/7/7c/Profile_avatar_placeholder_large.png?20150327203541'} className="w-5 h-5 rounded-full" />
                                          <span className="text-xs text-neutral-500 hover:text-white cursor-pointer transition-colors" onClick={() => handleNavigate(`@${service.user?.handle}`)}>
                                            {service.user.username}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </section>
                            )}

                            {/* Projects Section */}
                            <section>
                              <div className="flex items-center gap-2 mb-4 px-1">
                                <h2 className="text-lg font-bold text-white">Projects</h2>
                                <span className="text-xs text-neutral-500 bg-neutral-900 px-2 py-0.5 rounded-full border border-neutral-800">{filteredProjects.length}</span>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                                {filteredProjects.length > 0 ? (
                                  filteredProjects.map(project => (
                                    <div key={project.id} className="h-auto md:h-[282px]">
                                      <ProjectCard
                                        project={project}
                                        currentTrackId={currentTrackId}
                                        isPlaying={currentProject?.id === project.id && isPlaying}
                                        onPlayTrack={(trackId) => handlePlayTrack(project, trackId)}
                                        onTogglePlay={handleTogglePlay}
                                      />
                                    </div>
                                  ))
                                ) : (
                                  <div className="col-span-full py-10 text-center border border-dashed border-neutral-800 rounded-xl bg-white/5">
                                    <p className="text-neutral-500 font-mono text-xs">No projects found matching query.</p>
                                  </div>
                                )}
                              </div>
                            </section>

                          </div>
                        )}

                        {/* Existing Project Grid (Only show if NO search query is active) */}
                        {!filters.searchQuery && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 mt-6 pb-20">
                            {filteredProjects.length > 0 ? (
                              filteredProjects.map(project => (
                                <div key={project.id} className="h-auto md:h-[282px]">
                                  <ProjectCard
                                    project={project}
                                    currentTrackId={currentTrackId}
                                    isPlaying={currentProject?.id === project.id && isPlaying}
                                    onPlayTrack={(trackId) => handlePlayTrack(project, trackId)}
                                    onTogglePlay={handleTogglePlay}
                                  />
                                </div>
                              ))
                            ) : (
                              <div className="col-span-full py-20 text-center border border-dashed border-neutral-800 rounded-xl bg-white/5">
                                <p className="text-neutral-500 font-mono text-xs mb-4">No data found matching query parameters.</p>
                                <button
                                  onClick={() => setFilters({ ...filters, genre: "All Genres", rootKey: "All Keys", scaleType: "All Scales", searchQuery: "" })}
                                  className="px-4 py-2 bg-primary/10 text-primary border border-primary/50 rounded hover:bg-primary hover:text-black transition-colors font-mono text-xs uppercase tracking-wider"
                                >
                                  Reset Search Query
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    </PullToRefresh>
                  )}

                  {currentView === 'profile' && (
                    <ProfilePage
                      profile={(!profileUsername || (userProfile && userProfile.handle === profileUsername)) ? userProfile : null} // Use local profile if it matches URL, else fetch
                      profileUsername={profileUsername}
                      currentProject={currentProject}
                      currentTrackId={currentTrackId}
                      isPlaying={isPlaying}
                      onPlayTrack={handlePlayTrack}
                      onTogglePlay={handleTogglePlay}
                    />
                  )}

                  {currentView === 'browse-talent' && (
                    <BrowseTalentPage
                      currentProject={currentProject}
                      currentTrackId={currentTrackId}
                      isPlaying={isPlaying}
                      onPlayTrack={handlePlayTrack}
                      onTogglePlay={handleTogglePlay}
                    />
                  )}

                  {currentView === 'following' && (
                    <FollowingPage
                      currentProject={currentProject}
                      currentTrackId={currentTrackId}
                      isPlaying={isPlaying}
                      onPlayTrack={handlePlayTrack}
                      onTogglePlay={handleTogglePlay}
                    />
                  )}

                  {currentView === 'collaborate' && (
                    <CollaboratePage />
                  )}

                  {currentView === 'library' && (
                    isLoggedIn ? (
                      <LibraryPage
                        currentProject={currentProject}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                      />
                    ) : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                  )}

                  {currentView === 'upload' && (
                    isLoggedIn ? (
                      <UploadPage
                        currentProject={currentProject}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                        userProfile={userProfile}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-[60vh]">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                      </div>
                    )
                  )}

                  {currentView === 'contracts' && (
                    isLoggedIn ? <ContractsPage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                  )}

                  {currentView === 'post-service' && (
                    isLoggedIn ? <PostServicePage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                  )}

                  {currentView === 'notes' && (
                    isLoggedIn ? (
                      <NotesPage
                        userProfile={userProfile}
                        currentProject={currentProject}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                      />
                    ) : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                  )}

                  {currentView === 'checkout' && (
                    <CheckoutPage />
                  )}

                  {currentView === 'dashboard-messages' && (
                    isLoggedIn ? <MessagesPage isPlayerActive={!!currentTrackId} isPlayerExpanded={isPlayerExpanded} /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                  )}

                  {currentView === 'dashboard-manage' && (
                    isLoggedIn ? <ManageServicesPage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                  )}

                  {/* Settings & Help Views */}
                  {(currentView === 'settings' || currentView === 'dashboard-settings') && (
                    <SettingsPage userProfile={userProfile} />
                  )}

                  {(currentView === 'help' || currentView === 'dashboard-help') && (
                    <GetHelpPage onNavigate={handleNavigate} />
                  )}

                  {currentView === 'terms' && (
                    <TermsPage onBack={() => setCurrentView('help')} />
                  )}

                  {currentView === 'privacy' && (
                    <PrivacyPage onBack={() => setCurrentView('help')} />
                  )}

                  {/* Handle remaining Dashboard sub-views via DashboardPage or specifically if needed */}
                  {(currentView.startsWith('dashboard') &&
                    currentView !== 'dashboard-messages' &&
                    currentView !== 'dashboard-manage' &&
                    currentView !== 'dashboard-settings' &&
                    currentView !== 'dashboard-help' &&
                    currentView !== 'dashboard-invoices' &&
                    currentView !== 'dashboard-invoices' &&
                    currentView !== 'dashboard-roadmap') && (
                      isLoggedIn ? (
                        <DashboardPage
                          view={currentView}
                          projects={projects}
                          setProjects={setProjects}
                          currentTrackId={currentTrackId}
                          isPlaying={isPlaying}
                          onPlayTrack={handlePlayTrack}
                          onTogglePlay={handleTogglePlay}
                          userProfile={userProfile}
                          onNavigate={handleNavigate}
                        />
                      ) : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                    )}

                  {/* Invoices Page */}
                  {currentView === 'dashboard-invoices' && (
                    isLoggedIn ? <InvoicesPage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                  )}
                  {/* Subscription Page */}
                  {currentView === 'subscription' && (
                    <SubscriptionPage onNavigate={handleNavigate} userProfile={userProfile} />
                  )}

                  {/* Roadmap & Planning Page */}
                  {currentView === 'dashboard-roadmap' && (
                    isLoggedIn ? <RoadmapPage onNavigate={(view) => handleNavigate(view as View)} /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
                  )}

                </main>
              </div>

              <MusicPlayer
                currentProject={currentProject}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                togglePlay={handleTogglePlay}
                currentView={currentView}
                onClose={() => {
                  setIsPlaying(false);
                  setCurrentProject(null);
                  setCurrentTrackId(null);
                }}
                onNavigate={handleNavigate}
                isSidebarOpen={isMobileMenuOpen}
                onNext={handleNextTrack}
                onPrev={handlePrevTrack}
                isExpanded={isPlayerExpanded}
                onExpandToggle={() => setIsPlayerExpanded(!isPlayerExpanded)}
              />

              <BottomNav
                currentView={currentView}
                onNavigate={handleNavigate}
              />
            </div >
          </FileOperationProvider>
        </ToastProvider>
      </PurchaseModalProvider>
    </CartProvider >
  );
};

export default App;