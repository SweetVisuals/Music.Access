import React, { useState, useMemo, useEffect } from 'react';
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
import CollaboratePage from './components/CollaboratePage';
import LibraryPage from './components/LibraryPage';
import CheckoutPage from './components/CheckoutPage';
import SettingsPage from './components/SettingsPage';
import GetHelpPage from './components/GetHelpPage';
import AuthModal from './components/AuthModal';
import { TermsPage, PrivacyPage } from './components/LegalPages';
import InvoicesPage from './components/InvoicesPage';
import RoadmapPage from './components/RoadmapPage';
import NotLoggedInState from './components/NotLoggedInState';
import { getProjects, getUserProfile, supabase, signOut, updateUserProfile, getCurrentUser } from './services/supabaseService';
import { Project, FilterState, View, UserProfile } from './types';

import { CartProvider } from './contexts/CartContext';

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  // Get current view from URL path
  const getCurrentViewFromPath = (pathname: string): View => {
    // Handle profile routes - both @username and /profile
    if (pathname.startsWith('/@') || pathname === '/profile') return 'profile';
    if (pathname === '/upload') return 'upload';
    if (pathname === '/browse-talent') return 'browse-talent';
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
    key: "All Keys",
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
  }, [location.pathname]);

  useEffect(() => {
    const fetchProjects = async () => {
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
    };
    fetchProjects();
  }, []);

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
  }, [isLoggedIn]);

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesGenre = filters.genre === "All Genres" || p.genre === filters.genre;
      const matchesKey = filters.key === "All Keys" || p.key === filters.key;

      const query = filters.searchQuery.toLowerCase().trim();
      if (!query) return matchesGenre && matchesKey;

      const searchableContent = `${p.title} ${p.producer} ${p.genre} ${p.key} ${p.tags.join(' ')}`.toLowerCase();

      const searchTerms = query.split(/\s+/).filter(t => t.length > 0);
      const matchesSearch = searchTerms.every(term => searchableContent.includes(term));

      return matchesGenre && matchesKey && matchesSearch;
    });
  }, [projects, filters]);

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
      // Handle other string routes
      const pathMap: Record<string, string> = {
        'home': '/',
        'upload': '/upload',
        'browse-talent': '/browse-talent',
        'collaborate': '/collaborate',
        'library': '/library',
        'checkout': '/checkout',
        'contracts': '/contracts',
        'post-service': '/post-service',
        'notes': '/notes',
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
    } else {
      // Handle View enum values
      const pathMap: Record<View, string> = {
        'home': '/',
        'profile': '/profile', // Special route for current user's profile
        'upload': '/upload',
        'browse-talent': '/browse-talent',
        'collaborate': '/collaborate',
        'library': '/library',
        'checkout': '/checkout',
        'contracts': '/contracts',
        'post-service': '/post-service',
        'notes': '/notes',
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

  return (
    <CartProvider>
      <div className="h-screen w-full flex overflow-hidden selection:bg-primary/30 selection:text-primary transition-colors duration-500">
        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          onLogin={handleLogin}
        />

        <Sidebar
          currentView={currentView}
          onNavigate={handleNavigate}
          isLoggedIn={isLoggedIn}
          onOpenAuth={() => setIsAuthModalOpen(true)}
          userProfile={userProfile}
          profileLoading={profileLoading}
          isOpen={isMobileMenuOpen}
          onClose={() => setIsMobileMenuOpen(false)}
        />

        {/* Main Layout Container - Adjusted padding for mobile and smaller sidebar */}
        <div className="flex-1 flex flex-col lg:pl-64 relative w-full">
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

          <main className="flex-1 overflow-y-auto pt-20 lg:pt-28 pb-32 scroll-smooth">

            {currentView === 'home' && (
              <div className="max-w-[1800px] mx-auto px-3 lg:px-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {isLoggedIn && !gemsClaimedToday && !profileLoading && userProfile && (
                  <div className="mb-4 mt-3 lg:mt-0 p-3 bg-gradient-to-r from-primary/20 to-transparent border border-primary/20 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-primary/20 rounded-full flex items-center justify-center text-primary animate-pulse">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h12l4 6-10 13L2 9Z" /></svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-sm">Daily Reward Available!</h3>
                        <p className="text-xs text-neutral-300 hidden sm:block">Claim your 10 free Gems for today.</p>
                      </div>
                    </div>
                    <button
                      onClick={handleClaimDailyGems}
                      className="px-3 py-1.5 bg-primary text-black font-bold rounded-lg text-xs hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 whitespace-nowrap"
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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mt-3 pb-20">
                    {[...Array(12)].map((_, i) => (
                      <div key={i} className="h-[320px]">
                        <ProjectSkeleton />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mt-3 pb-20">
                    {filteredProjects.length > 0 ? (
                      filteredProjects.map(project => (
                        <div key={project.id} className="h-[320px]">
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
                      <div className="col-span-full py-32 text-center border border-dashed border-neutral-800 rounded-xl bg-white/5">
                        <p className="text-neutral-500 font-mono mb-4">No data found matching query parameters.</p>
                        <button
                          onClick={() => setFilters({ ...filters, genre: "All Genres", key: "All Keys", searchQuery: "" })}
                          className="px-4 py-2 bg-primary/10 text-primary border border-primary/50 rounded hover:bg-primary hover:text-black transition-colors font-mono text-xs uppercase tracking-wider"
                        >
                          Reset Search Query
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {currentView === 'profile' && (
              <ProfilePage
                profile={profileUsername ? null : userProfile} // Use null for other users' profiles
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
              <UploadPage
                currentProject={currentProject}
                currentTrackId={currentTrackId}
                isPlaying={isPlaying}
                onPlayTrack={handlePlayTrack}
                onTogglePlay={handleTogglePlay}
              />
            )}

            {currentView === 'contracts' && (
              isLoggedIn ? <ContractsPage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
            )}

            {currentView === 'post-service' && (
              isLoggedIn ? <PostServicePage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
            )}

            {currentView === 'notes' && (
              isLoggedIn ? <NotesPage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
            )}

            {currentView === 'checkout' && (
              isLoggedIn ? <CheckoutPage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
            )}

            {currentView === 'dashboard-messages' && (
              isLoggedIn ? <MessagesPage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
            )}

            {currentView === 'dashboard-manage' && (
              isLoggedIn ? <ManageServicesPage /> : <NotLoggedInState onOpenAuth={() => setIsAuthModalOpen(true)} />
            )}

            {/* Settings & Help Views */}
            {(currentView === 'settings' || currentView === 'dashboard-settings') && (
              <SettingsPage />
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
        />
      </div>
    </CartProvider>
  );
};

export default App;