import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import TopBar from './components/TopBar';
import FilterBar from './components/FilterBar';
import ProjectCard, { ProjectSkeleton } from './components/ProjectCard';
import MusicPlayer from './components/MusicPlayer';
import ProfilePage from './components/ProfilePage';
import UploadPage from './components/UploadPage';
import DiscoverGrid from './components/DiscoverGrid';
import DiscoverFeed from './components/DiscoverFeed';
import DashboardPage from './components/DashboardPage';
import MessagesPage from './components/MessagesPage';
import ManageServicesPage from './components/ManageServicesPage';
import ContractsPage from './components/ContractsPage';
import PostServicePage from './components/PostServicePage';
import NotesPage from './components/NotesPage';
import ViewAllPage from './components/ViewAllPage';
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
import ListenPage from './components/ListenPage';
import ConnectStorefront from './components/ConnectStorefront';
import { getProjects, getUserProfile, supabase, signOut, updateUserProfile, getCurrentUser, searchProfiles, searchServices, claimDailyReward } from './services/supabaseService';
import { Project, FilterState, View, UserProfile, TalentProfile, Service } from './types';
import { TOP_BAR_HEIGHT, BOTTOM_NAV_HEIGHT, PLAYER_HEIGHT_MOBILE, PLAYER_HEIGHT_DESKTOP_EXPANDED } from './constants';

import { CartProvider } from './contexts/CartContext';
import { PurchaseModalProvider } from './contexts/PurchaseModalContext';
import { ToastProvider } from './contexts/ToastContext';
import { FileOperationProvider } from './contexts/FileOperationContext';
import { PlayerProvider } from './contexts/PlayerContext';
import { FileOperationNotificationContainer } from './components/FileOperationNotification';
import { Verified, Star, UserPlus, MessageCircle, MoreHorizontal } from 'lucide-react';
import { followUser, unfollowUser } from './services/supabaseService';

const normalizeString = (str: string) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const mainRef = useRef<HTMLElement>(null);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isPlayerExpanded, setIsPlayerExpanded] = useState(false);
  const [discoverViewMode, setDiscoverViewMode] = useState<'grid' | 'feed'>('feed');
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // User State
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [gemsClaimedToday, setGemsClaimedToday] = useState(false);
  const [profileLoading, setProfileLoading] = useState(true);

  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [currentTrackId, setCurrentTrackId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
  const [isShuffling, setIsShuffling] = useState(false);
  const [shuffledQueue, setShuffledQueue] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);


  // Search State
  const [searchedProfiles, setSearchedProfiles] = useState<TalentProfile[]>([]);
  const [searchedServices, setSearchedServices] = useState<Service[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Swipe Gesture Logic for Opening Sidebar
  const touchStartRef = useRef<number | null>(null);
  const touchEndRef = useRef<number | null>(null);
  const MIN_SWIPE_DISTANCE = 30;

  const onTouchStart = (e: React.TouchEvent) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches[0].clientX;
  };

  const onTouchMove = (e: React.TouchEvent) => {
    touchEndRef.current = e.targetTouches[0].clientX;
  };

  const onTouchEnd = () => {
    if (!touchStartRef.current || !touchEndRef.current) return;
    const distance = touchEndRef.current - touchStartRef.current;
    const isRightSwipe = distance > MIN_SWIPE_DISTANCE;

    if (isRightSwipe && !isMobileMenuOpen) {
      setIsMobileMenuOpen(true);
    }
  };

  // Get current view from URL path
  const getCurrentViewFromPath = (pathname: string): View => {
    // Handle profile routes - both @username and /profile
    if (pathname.startsWith('/@') || pathname === '/profile') return 'profile';
    if (pathname === '/upload') return 'upload';
    if (pathname === '/browse-talent') return 'browse-talent';
    if (pathname === '/browse/talent') return 'browse-all-talent';
    if (pathname === '/browse/projects') return 'browse-all-projects';
    if (pathname === '/browse/soundpacks') return 'browse-all-soundpacks';
    if (pathname === '/browse/releases') return 'browse-all-releases';
    if (pathname === '/browse/services') return 'browse-all-services';
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
      if (pathname === '/dashboard/goals') return 'dashboard-goals';
      if (pathname === '/dashboard/orders') return 'dashboard-orders';
      if (pathname === '/dashboard/studio') return 'dashboard-studio';
      if (pathname === '/dashboard/sales') return 'dashboard-sales';

      if (pathname === '/dashboard/wallet') return 'dashboard-wallet';
      if (pathname === '/dashboard/analytics') return 'dashboard-analytics';
      return 'dashboard-overview';
    }
    if (pathname.startsWith('/store/')) return 'storefront';
    if (pathname.startsWith('/listen/')) return 'listen';
    return 'home';
  };

  // Derive current view and profile identifier in sync with location
  const [currentView, profileUsername] = useMemo(() => {
    const pathname = location.pathname;
    const view = getCurrentViewFromPath(pathname);

    let username: string | null = null;
    if (pathname.startsWith('/@')) {
      try {
        username = decodeURIComponent(pathname.substring(2));
      } catch (e) {
        username = pathname.substring(2);
      }
    } else if (pathname.startsWith('/store/')) {
      try {
        username = decodeURIComponent(pathname.substring(7));
      } catch (e) {
        username = pathname.substring(7);
      }
    }

    return [view, username] as const;
  }, [location.pathname]);

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

  // Handle side effects of route changes
  useEffect(() => {
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
      // EXCLUDE RELEASES FROM DISCOVER - Show them only on Browse page per user request
      if (p.type === 'release') return false;

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

      const query = normalizeString(filters.searchQuery.trim());
      if (!query) return matchesGenre && matchesKey;

      const searchableContent = normalizeString(`${p.title} ${p.producer} ${p.genre} ${p.key} ${p.tags.join(' ')} ${p.description || ''} ${p.type.replace('_', ' ')}`);

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

  // Shuffle Queue Generation
  useEffect(() => {
    if (isShuffling && currentProject) {
      const ids = currentProject.tracks.map((t, i) => t.id || `track-${i}`);
      // Fisher-Yates Shuffle
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      setShuffledQueue(ids);
    }
  }, [isShuffling, currentProject?.id]);

  const handleToggleShuffle = () => {
    setIsShuffling(!isShuffling);
  };

  const handleToggleRepeat = () => {
    setRepeatMode(prev => {
      if (prev === 'off') return 'all';
      if (prev === 'all') return 'one';
      return 'off';
    });
  };

  const handleNextTrack = () => {
    if (!currentProject || !currentTrackId) return;

    const trackList = isShuffling
      ? shuffledQueue
      : currentProject.tracks.map((t, i) => t.id || `track-${i}`);

    const currentIndex = trackList.indexOf(currentTrackId);

    // Safety check
    if (currentIndex === -1) {
      if (trackList.length > 0) {
        setCurrentTrackId(trackList[0]);
        setIsPlaying(true);
      }
      return;
    }

    if (currentIndex < trackList.length - 1) {
      setCurrentTrackId(trackList[currentIndex + 1]);
      setIsPlaying(true);
    } else {
      // End of playlist
      if (repeatMode === 'all') {
        setCurrentTrackId(trackList[0]);
        setIsPlaying(true);
      } else {
        setIsPlaying(false);
      }
    }
  };

  const hasPrev = useMemo(() => {
    if (!currentProject || !currentTrackId) return false;
    const trackList = isShuffling
      ? shuffledQueue
      : currentProject.tracks.map((t, i) => t.id || `track-${i}`);
    const currentIndex = trackList.indexOf(currentTrackId);
    if (repeatMode === 'all' && trackList.length > 1) return true;
    return currentIndex > 0;
  }, [currentProject, currentTrackId, isShuffling, shuffledQueue, repeatMode]);

  const handlePrevTrack = () => {
    if (!currentProject || !currentTrackId) return;

    const trackList = isShuffling
      ? shuffledQueue
      : currentProject.tracks.map((t, i) => t.id || `track-${i}`);

    const currentIndex = trackList.indexOf(currentTrackId);
    if (currentIndex === -1) return;

    if (currentIndex > 0) {
      setCurrentTrackId(trackList[currentIndex - 1]);
      setIsPlaying(true);
    } else {
      // Start of playlist
      if (repeatMode === 'all') {
        setCurrentTrackId(trackList[trackList.length - 1]);
        setIsPlaying(true);
      }
    }
  };

  const handleSearch = (query: string) => {
    setFilters(prev => ({ ...prev, searchQuery: query }));
    if (currentView !== 'home') navigate('/');
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
          const newBalance = await claimDailyReward(currentUser.id);
          setUserProfile({
            ...userProfile,
            gems: newBalance,
            lastGemClaimDate: new Date().toISOString()
          });
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
          'dashboard-goals': '/dashboard/goals',
          'dashboard-help': '/dashboard/help'
        };
        const path = pathMap[view] || '/';
        navigate(path);
      }
    } else {
      // Handle View enum values
      if (view === 'BACK') {
        navigate(-1);
        return;
      }

      const pathMap: Record<View, string> = {
        'home': '/',
        'profile': '/profile', // Special route for current user's profile
        'upload': '/upload',
        'browse-talent': '/browse-talent',
        'browse-all-talent': '/browse/talent',
        'browse-all-projects': '/browse/projects',
        'browse-all-soundpacks': '/browse/soundpacks',
        'browse-all-releases': '/browse/releases',
        'browse-all-services': '/browse/services',
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
        'dashboard-goals': '/dashboard/goals',
        'dashboard-help': '/dashboard/help',
        'listen': '/listen',
        'storefront': '/'
      };
      const path = pathMap[view as View] || '/';
      navigate(path);
    }
    setIsMobileMenuOpen(false);
  };


  const getBottomStackHeightCSS = () => {
    // Base bottom nav height (mobile)
    const mobileNavHeight = BOTTOM_NAV_HEIGHT; // matched to BottomNav h-[50px]
    const playerHeightMobile = PLAYER_HEIGHT_MOBILE; // approx h-16
    const playerHeightDesktopExpanded = PLAYER_HEIGHT_DESKTOP_EXPANDED;
    const SAFETY_BUFFER = 0; // Removing buffer to ensure exact fit for Feed

    let baseHeight = 0;

    if (window.innerWidth < 1024) {
      // Mobile Logic
      baseHeight = mobileNavHeight + SAFETY_BUFFER;
      if (currentTrackId) baseHeight += playerHeightMobile;
    } else {
      // Desktop Logic
      if (isPlayerExpanded) {
        baseHeight = playerHeightDesktopExpanded;
      }
      if (currentTrackId && !isPlayerExpanded) {
        // Floating player is bottom-6 right-6. It covers content.
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
          <PlayerProvider>
            <FileOperationProvider>
              <div className="h-screen h-[100dvh] w-full flex overflow-hidden overscroll-y-none selection:bg-primary/30 selection:text-primary transition-colors duration-500">
                <MobileCart onNavigate={handleNavigate} projects={projects} />

                {/* Edge Swipe Zone for opening Sidebar */}
                {!isMobileMenuOpen && (
                  <div
                    className="fixed top-0 bottom-0 left-0 w-[40px] z-[190] lg:hidden touch-none"
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  />
                )}

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
                    onToggleDiscoverView={() => setDiscoverViewMode(prev => prev === 'grid' ? 'feed' : 'grid')}
                    isDiscoverFeedMode={discoverViewMode === 'feed'}
                  />


                  <main ref={mainRef} style={{ paddingBottom: getBottomStackHeightCSS(), '--top-bar-height': `${TOP_BAR_HEIGHT}px` } as any} className={`flex-1 ${(currentView === 'home' && discoverViewMode === 'feed' && !filters.searchQuery && isMobile) ? 'overflow-hidden pt-[calc(var(--top-bar-height)+env(safe-area-inset-top))]' : (currentView === 'notes' ? 'h-[calc(100vh-3.5rem)] overflow-hidden pt-[calc(var(--top-bar-height)+env(safe-area-inset-top))]' : (currentView === 'dashboard-messages' || currentView === 'dashboard-orders') ? 'overflow-hidden pt-[calc(var(--top-bar-height)+env(safe-area-inset-top))] lg:pt-[80px]' : 'overflow-y-auto overscroll-y-contain pt-[calc(var(--top-bar-height)+env(safe-area-inset-top))] lg:pt-[56px]')} scroll-smooth`}>

                    {currentView === 'listen' && (
                      <ListenPage
                        key={location.pathname}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                        currentProject={currentProject}
                        onNavigate={handleNavigate}
                      />
                    )}

                    {currentView === 'storefront' && profileUsername && (
                      <ConnectStorefront
                        handle={profileUsername}
                        currentUser={userProfile}
                        onNavigate={handleNavigate}
                      />
                    )}


                    {currentView === 'home' && (
                      <PullToRefresh onRefresh={fetchProjects} disabled={window.innerWidth >= 1024 || (discoverViewMode === 'feed' && isMobile)}>
                        {discoverViewMode === 'feed' && !filters.searchQuery && isMobile ? (
                          <div className="w-full h-full animate-in fade-in duration-500">
                            <DiscoverFeed
                              projects={filteredProjects}
                              currentTrackId={currentTrackId}
                              isPlaying={isPlaying}
                              onPlayTrack={handlePlayTrack}
                              onTogglePlay={handleTogglePlay}
                              userProfile={userProfile}
                              onOpenSidebar={() => setIsMobileMenuOpen(true)}
                            />
                          </div>
                        ) : (
                          <div className="w-full max-w-[1900px] mx-auto px-4 lg:px-10 xl:px-14 pt-4 lg:pt-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                            {isLoggedIn && !gemsClaimedToday && !profileLoading && userProfile && (
                              <div className="mb-6 mt-[2px] lg:mt-[2px] px-3 py-3 lg:px-5 lg:py-3 bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 rounded-xl flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 lg:w-10 lg:h-10 bg-primary/20 rounded-full flex items-center justify-center text-primary animate-pulse shrink-0">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 lg:w-4 lg:h-4"><path d="M6 3h12l4 6-10 13L2 9Z" /></svg>
                                  </div>
                                  <div>
                                    <h3 className="font-bold text-white text-sm lg:text-base">Daily Reward Available!</h3>
                                    <p className="text-sm text-neutral-300 hidden sm:block">Claim your 10 free Gems for today.</p>
                                  </div>
                                </div>
                                <button
                                  onClick={handleClaimDailyGems}
                                  className="px-3 py-1.5 lg:px-4 lg:py-2 bg-primary text-black font-bold rounded-lg text-xs lg:text-sm hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
                                >
                                  Claim
                                </button>
                              </div>
                            )}

                            <div className="hidden mb-8 px-4 lg:px-8">
                              <h1 className="text-3xl lg:text-5xl font-black text-white mb-2 tracking-tighter">Discover</h1>
                              <p className="text-neutral-500 text-sm lg:text-base max-w-2xl leading-relaxed">
                                The future of sound is here. Browse trending loop kits, beats, and collaborative projects from the industries top creators.
                              </p>
                            </div>

                            <FilterBar filters={filters} onFilterChange={setFilters} />

                            <DiscoverGrid
                              loading={loading}
                              error={error}
                              projects={projects}
                              filteredProjects={filteredProjects}
                              filters={filters}
                              setFilters={setFilters}
                              searchedProfiles={searchedProfiles}
                              searchedServices={searchedServices}
                              handleNavigate={handleNavigate}
                              currentTrackId={currentTrackId}
                              currentProject={currentProject}
                              isPlaying={isPlaying}
                              handlePlayTrack={handlePlayTrack}
                              handleTogglePlay={handleTogglePlay}
                              userProfile={userProfile}
                              setSearchedProfiles={setSearchedProfiles}
                              unfollowUser={unfollowUser}
                              followUser={followUser}
                              setIsAuthModalOpen={setIsAuthModalOpen}
                            />
                          </div>
                        )}
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
                        onOpenAuth={() => setIsAuthModalOpen(true)}
                      />
                    )}

                    {/* View All Pages */}
                    {currentView === 'browse-all-talent' && (
                      <ViewAllPage
                        type="talent"
                        title="Featured Creators"
                        description="Discover the best emerging producers, vocalists, and engineers."
                        currentProject={currentProject}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                        onOpenAuth={() => setIsAuthModalOpen(true)}
                      />
                    )}
                    {currentView === 'browse-all-projects' && (
                      <ViewAllPage
                        type="projects"
                        title="Trending Projects"
                        description="Explore the latest and most popular projects from our community."
                        currentProject={currentProject}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                        onOpenAuth={() => setIsAuthModalOpen(true)}
                      />
                    )}
                    {currentView === 'browse-all-soundpacks' && (
                      <ViewAllPage
                        type="soundpacks"
                        title="Sound Kits"
                        description="High-quality drum kits, loop packs, and presets for your production."
                        currentProject={currentProject}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                        onOpenAuth={() => setIsAuthModalOpen(true)}
                      />
                    )}
                    {currentView === 'browse-all-releases' && (
                      <ViewAllPage
                        type="releases"
                        title="Releases"
                        description="Fresh releases from artists across the platform."
                        currentProject={currentProject}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                        onOpenAuth={() => setIsAuthModalOpen(true)}
                      />
                    )}
                    {currentView === 'browse-all-services' && (
                      <ViewAllPage
                        type="services"
                        title="Services"
                        description="Hire talented professionals for your next project."
                        currentProject={currentProject}
                        currentTrackId={currentTrackId}
                        isPlaying={isPlaying}
                        onPlayTrack={handlePlayTrack}
                        onTogglePlay={handleTogglePlay}
                        onOpenAuth={() => setIsAuthModalOpen(true)}
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
                      <TermsPage onBack={() => handleNavigate('help')} />
                    )}

                    {currentView === 'privacy' && (
                      <PrivacyPage onBack={() => handleNavigate('help')} />
                    )}

                    {/* Handle remaining Dashboard sub-views via DashboardPage or specifically if needed */}
                    {(currentView.startsWith('dashboard') &&
                      currentView !== 'dashboard-messages' &&
                      currentView !== 'dashboard-manage' &&
                      currentView !== 'dashboard-settings' &&
                      currentView !== 'dashboard-help' &&
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
                  hasPrev={hasPrev}
                  repeatMode={repeatMode}
                  isShuffling={isShuffling}
                  onToggleRepeat={handleToggleRepeat}
                  onToggleShuffle={handleToggleShuffle}
                  isExpanded={isPlayerExpanded}
                  onExpandToggle={() => setIsPlayerExpanded(!isPlayerExpanded)}
                  isHidden={false}
                  autoMinimize={currentView === 'home' && discoverViewMode === 'feed'}
                  hideCloseButton={isMobile && currentView === 'home' && discoverViewMode === 'feed'}
                />

                <BottomNav
                  currentView={currentView}
                  onNavigate={handleNavigate}
                />
              </div >
            </FileOperationProvider>
          </PlayerProvider>
        </ToastProvider>
      </PurchaseModalProvider>
    </CartProvider >
  );
};

export default App;
