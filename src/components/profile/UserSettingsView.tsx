import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Crown,
  Settings,
  Shield,
  Layers,
  Plus,
  RefreshCw,
  Search,
  ExternalLink,
  Edit3,
  Trash2,
  Check,
  Copy,
  TrendingUp,
  MousePointer,
  Eye,
  Sliders,
  QrCode,
  ArrowRight,
  LogOut,
  Save,
  X,
  BadgePercent,
  Sun,
  Moon,
  Laptop,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { Room, AffiliateRecommendation, AffiliatePlacement } from '../../types';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  dbFetchRooms,
  dbCreateRoom,
  dbDeleteRoom,
  isUserRoomAdmin,
  dbFetchAllAffiliateRecommendations,
  dbCreateAffiliateRecommendation,
  dbUpdateAffiliateRecommendation,
  dbDeleteAffiliateRecommendation,
  dbToggleAffiliateActive,
  dbResetAffiliateTelemetry,
} from '../../lib/supabase';
import {
  playClickSound,
  playPopSound,
  playWhoosh,
} from '../../lib/soundFx';
import { useTheme } from '../../lib/theme';

export interface UserSettingsViewProps {
  userName: string;
  setUserName: (name: string) => void;
  userRole: 'host' | 'attendee';
  setUserRole: (role: 'host' | 'attendee') => void;
  currentUser: SupabaseUser | null;
  sessionId: string;
  currentRoomCode: string;
  onSwitchRoom: (roomCode: string, roomTitle?: string) => Promise<void>;
  onOpenQRCodeForRoom: (code: string, title: string) => void;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onNavigateToRoomSettings: () => void;
}

export const UserSettingsView: React.FC<UserSettingsViewProps> = ({
  userName,
  setUserName,
  userRole,
  setUserRole,
  currentUser,
  sessionId,
  currentRoomCode,
  onSwitchRoom,
  onOpenQRCodeForRoom,
  onOpenAuthModal,
  onSignOut,
  onNavigateToRoomSettings,
}) => {
  // Navigation tabs within User Settings
  const [activeSubTab, setActiveSubTab] = useState<'affiliate' | 'rooms' | 'preferences'>('affiliate');
  const { theme, resolvedTheme, setTheme } = useTheme();

  // Profile editing state
  const [prevUserName, setPrevUserName] = useState(userName);
  const [displayNameInput, setDisplayNameInput] = useState(userName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSavedFeedback, setNameSavedFeedback] = useState(false);
  const [copiedSessionId, setCopiedSessionId] = useState(false);

  // Sync displayNameInput when userName changes
  if (userName !== prevUserName) {
    setPrevUserName(userName);
    setDisplayNameInput(userName);
  }

  // -------------------------------------------------------------
  // TAB 1: Affiliate & Partner Monetization State
  // -------------------------------------------------------------
  const [affiliateList, setAffiliateList] = useState<AffiliateRecommendation[]>([]);
  const [isLoadingAffiliates, setIsLoadingAffiliates] = useState(false);
  const [affiliateSearch, setAffiliateSearch] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Create / Edit Recommendation Modal
  const [isAffiliateModalOpen, setIsAffiliateModalOpen] = useState(false);
  const [editingAffiliateId, setEditingAffiliateId] = useState<string | null>(null);

  // Modal form fields
  const [formCategory, setFormCategory] = useState('cloud_devops');
  const [formProvider, setFormProvider] = useState('');
  const [formTitle, setFormTitle] = useState('');
  const [formHeadline, setFormHeadline] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formAffiliateUrl, setFormAffiliateUrl] = useState('');
  const [formBadgeText, setFormBadgeText] = useState('RECOMMENDED TOOL');
  const [formDiscountCode, setFormDiscountCode] = useState('');
  const [formKeywords, setFormKeywords] = useState('');
  const [formThemeColor, setFormThemeColor] = useState<'blue' | 'purple' | 'emerald' | 'amber' | 'rose'>('blue');
  const [formPriority, setFormPriority] = useState<number>(10);
  const [formIsActive, setFormIsActive] = useState<boolean>(true);
  const [formPlacements, setFormPlacements] = useState<AffiliatePlacement[]>([
    'quiz_takeaway',
    'certificate',
    'report',
    'leaderboard',
  ]);
  const [isSavingAffiliate, setIsSavingAffiliate] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: My Arena Rooms State
  // -------------------------------------------------------------
  const [myRooms, setMyRooms] = useState<Room[]>([]);
  const [isLoadingRooms, setIsLoadingRooms] = useState(false);
  const [isCreateRoomModalOpen, setIsCreateRoomModalOpen] = useState(false);
  const [newRoomCode, setNewRoomCode] = useState('');
  const [newRoomTitle, setNewRoomTitle] = useState('');
  const [copiedRoomCode, setCopiedRoomCode] = useState<string | null>(null);

  // -------------------------------------------------------------
  // Loaders
  // -------------------------------------------------------------
  const loadAffiliates = useCallback(async () => {
    setIsLoadingAffiliates(true);
    try {
      const recs = await dbFetchAllAffiliateRecommendations();
      setAffiliateList(recs);
    } catch {
      setAffiliateList([]);
    } finally {
      setIsLoadingAffiliates(false);
    }
  }, []);

  const loadRooms = useCallback(async () => {
    setIsLoadingRooms(true);
    try {
      const remoteRooms = await dbFetchRooms();
      if (remoteRooms && remoteRooms.length > 0) {
        const filtered = remoteRooms.filter((r) => isUserRoomAdmin(r, currentUser, userName));
        setMyRooms(filtered);
      } else {
        setMyRooms([]);
      }
    } catch {
      setMyRooms([]);
    } finally {
      setIsLoadingRooms(false);
    }
  }, [currentUser, userName]);

  useEffect(() => {
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) setIsLoadingAffiliates(true);
    });
    dbFetchAllAffiliateRecommendations()
      .then((recs) => {
        if (isMounted) setAffiliateList(recs);
      })
      .catch(() => {
        if (isMounted) setAffiliateList([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingAffiliates(false);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (activeSubTab !== 'rooms') return;
    let isMounted = true;
    queueMicrotask(() => {
      if (isMounted) setIsLoadingRooms(true);
    });
    dbFetchRooms()
      .then((remoteRooms) => {
        if (!isMounted) return;
        if (remoteRooms && remoteRooms.length > 0) {
          const filtered = remoteRooms.filter((r) => isUserRoomAdmin(r, currentUser, userName));
          setMyRooms(filtered);
        } else {
          setMyRooms([]);
        }
      })
      .catch(() => {
        if (isMounted) setMyRooms([]);
      })
      .finally(() => {
        if (isMounted) setIsLoadingRooms(false);
      });
    return () => {
      isMounted = false;
    };
  }, [activeSubTab, currentUser, userName]);

  // Profile Name Save
  const handleSaveDisplayName = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = displayNameInput.trim();
    if (!clean) return;
    setIsSavingName(true);
    playClickSound();
    setUserName(clean);
    try {
      localStorage.setItem('sketchcast_username', clean);
    } catch {
      // ignore
    }
    setTimeout(() => {
      setIsSavingName(false);
      setNameSavedFeedback(true);
      playPopSound();
      setTimeout(() => setNameSavedFeedback(false), 2000);
    }, 250);
  };

  const handleCopySessionId = () => {
    playPopSound();
    navigator.clipboard.writeText(sessionId);
    setCopiedSessionId(true);
    setTimeout(() => setCopiedSessionId(false), 2000);
  };

  // -------------------------------------------------------------
  // Affiliate CRUD Handlers
  // -------------------------------------------------------------
  const handleOpenCreateAffiliate = () => {
    playClickSound();
    setEditingAffiliateId(null);
    setFormCategory('cloud_devops');
    setFormProvider('');
    setFormTitle('');
    setFormHeadline('');
    setFormDescription('');
    setFormAffiliateUrl('');
    setFormBadgeText('RECOMMENDED TOOL');
    setFormDiscountCode('');
    setFormKeywords('');
    setFormThemeColor('blue');
    setFormPriority(10);
    setFormIsActive(true);
    setFormPlacements(['quiz_takeaway', 'certificate', 'report', 'leaderboard']);
    setIsAffiliateModalOpen(true);
  };

  const handleOpenEditAffiliate = (rec: AffiliateRecommendation) => {
    playClickSound();
    setEditingAffiliateId(rec.id);
    setFormCategory(rec.category);
    setFormProvider(rec.provider);
    setFormTitle(rec.title);
    setFormHeadline(rec.headline);
    setFormDescription(rec.description || '');
    setFormAffiliateUrl(rec.affiliate_url);
    setFormBadgeText(rec.badge_text || 'RECOMMENDED TOOL');
    setFormDiscountCode(rec.discount_code || '');
    setFormKeywords(rec.keywords ? rec.keywords.join(', ') : '');
    setFormThemeColor((rec.theme_color as any) || 'blue');
    setFormPriority(rec.priority || 10);
    setFormIsActive(rec.is_active);
    setFormPlacements(rec.target_placements || ['quiz_takeaway']);
    setIsAffiliateModalOpen(true);
  };

  const handleTogglePlacement = (placement: AffiliatePlacement) => {
    playClickSound();
    setFormPlacements((prev) =>
      prev.includes(placement) ? prev.filter((p) => p !== placement) : [...prev, placement]
    );
  };

  const handleSaveAffiliate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim() || !formAffiliateUrl.trim() || !formProvider.trim()) return;

    setIsSavingAffiliate(true);
    playClickSound();

    const keywordsArray = formKeywords
      .split(',')
      .map((k) => k.trim().toLowerCase())
      .filter(Boolean);

    if (editingAffiliateId) {
      // Update existing
      const updates: Partial<AffiliateRecommendation> = {
        category: formCategory,
        provider: formProvider.trim(),
        title: formTitle.trim(),
        headline: formHeadline.trim() || formTitle.trim(),
        description: formDescription.trim() || undefined,
        affiliate_url: formAffiliateUrl.trim(),
        badge_text: formBadgeText.trim() || 'RECOMMENDED',
        discount_code: formDiscountCode.trim() || undefined,
        keywords: keywordsArray,
        theme_color: formThemeColor,
        priority: Number(formPriority) || 10,
        is_active: formIsActive,
        target_placements: formPlacements,
      };

      const success = await dbUpdateAffiliateRecommendation(editingAffiliateId, updates);
      if (success) {
        setAffiliateList((prev) =>
          prev.map((item) => (item.id === editingAffiliateId ? { ...item, ...updates } : item))
        );
        playPopSound();
      }
    } else {
      // Create new
      const generatedId = `aff_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
      const newRec: AffiliateRecommendation = {
        id: generatedId,
        category: formCategory,
        provider: formProvider.trim(),
        title: formTitle.trim(),
        headline: formHeadline.trim() || formTitle.trim(),
        description: formDescription.trim() || undefined,
        affiliate_url: formAffiliateUrl.trim(),
        badge_text: formBadgeText.trim() || 'RECOMMENDED',
        discount_code: formDiscountCode.trim() || undefined,
        keywords: keywordsArray,
        theme_color: formThemeColor,
        priority: Number(formPriority) || 10,
        is_active: formIsActive,
        target_placements: formPlacements,
        click_count: 0,
        impression_count: 0,
        created_at: new Date().toISOString(),
      };

      const success = await dbCreateAffiliateRecommendation(newRec);
      if (success) {
        setAffiliateList((prev) => [newRec, ...prev]);
        playPopSound();
      }
    }

    setIsSavingAffiliate(false);
    setIsAffiliateModalOpen(false);
  };

  const handleToggleActive = async (id: string, currentVal: boolean) => {
    playClickSound();
    const next = !currentVal;
    setAffiliateList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, is_active: next } : item))
    );
    await dbToggleAffiliateActive(id, next);
  };

  const handleDeleteAffiliate = async (id: string, title: string) => {
    if (!confirm(`Delete affiliate recommendation "${title}"? This cannot be undone.`)) return;
    playWhoosh();
    setAffiliateList((prev) => prev.filter((item) => item.id !== id));
    await dbDeleteAffiliateRecommendation(id);
  };

  const handleResetTelemetry = async (id: string) => {
    if (!confirm('Reset clicks and impressions count for this recommendation?')) return;
    playClickSound();
    setAffiliateList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, click_count: 0, impression_count: 0 } : item))
    );
    await dbResetAffiliateTelemetry(id);
  };

  // Filtered affiliate recommendations
  const filteredAffiliates = useMemo(() => {
    return affiliateList.filter((item) => {
      const matchSearch =
        !affiliateSearch.trim() ||
        item.title.toLowerCase().includes(affiliateSearch.toLowerCase()) ||
        item.provider.toLowerCase().includes(affiliateSearch.toLowerCase()) ||
        item.headline.toLowerCase().includes(affiliateSearch.toLowerCase()) ||
        (item.keywords && item.keywords.some((k) => k.toLowerCase().includes(affiliateSearch.toLowerCase())));

      const matchCategory =
        selectedCategoryFilter === 'all' || item.category.toLowerCase() === selectedCategoryFilter.toLowerCase();

      return matchSearch && matchCategory;
    });
  }, [affiliateList, affiliateSearch, selectedCategoryFilter]);

  // Aggregate KPI stats
  const totalImpressions = useMemo(
    () => affiliateList.reduce((acc, curr) => acc + (curr.impression_count || 0), 0),
    [affiliateList]
  );
  const totalClicks = useMemo(
    () => affiliateList.reduce((acc, curr) => acc + (curr.click_count || 0), 0),
    [affiliateList]
  );
  const activeCount = useMemo(
    () => affiliateList.filter((a) => a.is_active).length,
    [affiliateList]
  );
  const aggregateCTR = totalImpressions > 0 ? ((totalClicks / totalImpressions) * 100).toFixed(1) : '0.0';

  // -------------------------------------------------------------
  // Room Creation Handlers (My Arena Rooms)
  // -------------------------------------------------------------
  const generateUniqueCode = (existingRooms: Room[] = myRooms): string => {
    const prefixes = ['SKT', 'ARENA', 'DEV', 'TECH', 'ARCH', 'CYBER', 'NODE', 'FLOW', 'VOTE', 'PULSE', 'STAGE', 'LAB'];
    const existingCodes = new Set(existingRooms.map((r) => r.code.toUpperCase().trim()));

    for (let i = 0; i < 100; i++) {
      const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
      const num = Math.floor(1000 + Math.random() * 9000);
      const candidate = `${prefix}-${num}`;
      if (!existingCodes.has(candidate)) {
        return candidate;
      }
    }
    return `SKT-${Date.now().toString(36).toUpperCase().slice(-5)}`;
  };

  const handleOpenCreateRoomModal = () => {
    playClickSound();
    const fresh = generateUniqueCode(myRooms);
    setNewRoomCode(fresh);
    setNewRoomTitle('');
    setIsCreateRoomModalOpen(true);
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    playClickSound();

    let finalCode = newRoomCode.trim().toUpperCase();
    if (!finalCode) {
      finalCode = generateUniqueCode(myRooms);
    }

    const cleanTitle = newRoomTitle.trim() || `Masterclass Arena • ${finalCode}`;
    const hostEmail = currentUser?.email || undefined;
    const hostId = currentUser?.id || `host_${Date.now()}`;

    const newRoom: Room = {
      id: `room-${finalCode}`,
      code: finalCode,
      title: cleanTitle,
      host_id: hostId,
      host_name: userName || 'Host Admin',
      host_email: hostEmail,
      admins: hostEmail ? [hostEmail, userName] : [userName],
      created_at: new Date().toISOString(),
    };

    await dbCreateRoom(newRoom);
    await loadRooms();
    playPopSound();
    setIsCreateRoomModalOpen(false);

    // Switch to new room
    await onSwitchRoom(finalCode, cleanTitle);
  };

  const handleDeleteRoom = async (roomId: string, code: string) => {
    if (!confirm(`Are you sure you want to delete Room [${code}]? All child questions, polls, and quiz history will be erased.`)) {
      return;
    }
    playWhoosh();
    await dbDeleteRoom(roomId, code);
    await loadRooms();
  };

  const handleCopyCode = (code: string) => {
    playPopSound();
    navigator.clipboard.writeText(code);
    setCopiedRoomCode(code);
    setTimeout(() => setCopiedRoomCode(null), 2000);
  };

  const userInitial = (userName.trim()[0] || 'U').toUpperCase();

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto no-scrollbar bg-paper font-sans text-ink select-none">
      {/* Top Banner: User Profile Header */}
      <div className="border-b border-hairline bg-paper-surface/80 backdrop-blur-md px-4 sm:px-8 py-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          {/* User Identity info */}
          <div className="flex items-center space-x-4">
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center font-serif font-bold text-xl border shadow-sm ${
                userRole === 'host'
                  ? 'bg-orange/10 text-orange border-orange/20 ring-4 ring-orange/10'
                  : 'bg-paper text-ink border-hairline ring-4 ring-ink/5'
              }`}
            >
              {userInitial}
            </div>

            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <form onSubmit={handleSaveDisplayName} className="flex items-center space-x-2">
                  <input
                    type="text"
                    value={displayNameInput}
                    onChange={(e) => setDisplayNameInput(e.target.value)}
                    placeholder="Enter display name..."
                    className="bg-paper hover:bg-paper-surface focus:bg-paper px-3 py-1.5 rounded-xl border border-hairline focus:border-ink text-ink font-mono text-sm font-bold tracking-tight outline-none transition-all w-48 sm:w-60"
                  />
                  {displayNameInput.trim() !== userName && (
                    <button
                      type="submit"
                      disabled={isSavingName}
                      className="btn-noma-ink px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center space-x-1 cursor-pointer transition-colors shadow-xs"
                      title="Save display name"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingName ? '...' : 'Save'}</span>
                    </button>
                  )}
                  {nameSavedFeedback && (
                    <span className="text-lime-700 font-mono text-xs flex items-center space-x-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved</span>
                    </span>
                  )}
                </form>

                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    userRole === 'host'
                      ? 'bg-orange/10 text-orange border-orange/20'
                      : 'bg-paper text-muted border-hairline'
                  }`}
                >
                  {userRole}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted font-mono">
                <span>{currentUser?.email || 'Guest Session (Local Device)'}</span>
                <span>•</span>
                <button
                  onClick={handleCopySessionId}
                  className="hover:text-ink transition-colors flex items-center space-x-1 cursor-pointer"
                  title="Click to copy Session ID"
                >
                  <span>ID: {sessionId.slice(0, 10)}...</span>
                  {copiedSessionId ? (
                    <Check className="w-3 h-3 text-lime-700" />
                  ) : (
                    <Copy className="w-3 h-3 text-muted" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Quick Header Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                playClickSound();
                setUserRole(userRole === 'host' ? 'attendee' : 'host');
              }}
              className="px-3.5 py-2 rounded-full bg-paper hover:bg-paper-surface text-ink border border-hairline font-mono text-xs font-medium flex items-center space-x-2 cursor-pointer transition-colors"
            >
              <Crown className="w-3.5 h-3.5 text-orange" />
              <span>Switch to {userRole === 'host' ? 'Attendee' : 'Host'}</span>
            </button>

            {currentUser && !currentUser.is_anonymous ? (
              <button
                onClick={onSignOut}
                className="px-3.5 py-2 rounded-full bg-paper hover:bg-red-50 text-red-600 border border-hairline font-mono text-xs font-medium flex items-center space-x-1.5 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Log Out</span>
              </button>
            ) : (
              <button
                onClick={onOpenAuthModal}
                className="btn-noma-orange px-4 py-2 rounded-full font-mono text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors shadow-xs"
              >
                <Shield className="w-3.5 h-3.5" />
                <span>Sign In / Link Account</span>
              </button>
            )}
          </div>
        </div>

        {/* Sub-Tabs Navigation Bar */}
        <div className="max-w-6xl mx-auto mt-6 flex items-center space-x-3 border-b border-hairline -mb-6">
          <button
            onClick={() => {
              playClickSound();
              setActiveSubTab('affiliate');
            }}
            className={`px-4 py-3 font-mono text-xs font-bold flex items-center space-x-2 border-b-2 cursor-pointer transition-all ${
              activeSubTab === 'affiliate'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <BadgePercent className="w-4 h-4 text-orange" />
            <span>Affiliate & Partner Hub</span>
            <span className="px-2 py-0.5 rounded-full bg-orange/10 text-orange border border-orange/20 text-[9px] font-bold">
              MONETIZE
            </span>
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActiveSubTab('rooms');
            }}
            className={`px-4 py-3 font-mono text-xs font-bold flex items-center space-x-2 border-b-2 cursor-pointer transition-all ${
              activeSubTab === 'rooms'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Layers className="w-4 h-4 text-ink" />
            <span>My Arena Rooms</span>
            {myRooms.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-paper text-muted border border-hairline text-[9px]">
                {myRooms.length}
              </span>
            )}
          </button>

          <button
            onClick={() => {
              playClickSound();
              setActiveSubTab('preferences');
            }}
            className={`px-4 py-3 font-mono text-xs font-bold flex items-center space-x-2 border-b-2 cursor-pointer transition-all ${
              activeSubTab === 'preferences'
                ? 'border-ink text-ink font-semibold'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <Sliders className="w-4 h-4 text-orange" />
            <span>Preferences</span>
          </button>
        </div>
      </div>

      {/* Main Tab Content Body */}
      <div className="flex-1 max-w-6xl mx-auto w-full p-4 sm:p-8 space-y-6 pb-24">
        {/* ============================================================== */}
        {/* TAB 1: AFFILIATE & PARTNER MONETIZATION                        */}
        {/* ============================================================== */}
        {activeSubTab === 'affiliate' && (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
              <div className="bg-paper-surface border border-hairline rounded-3xl p-5 space-y-1 shadow-sm">
                <div className="text-[10px] font-mono text-muted uppercase font-bold tracking-wider">
                  Active Tracks
                </div>
                <div className="text-2xl font-serif font-bold text-ink flex items-center space-x-2">
                  <span>{activeCount}</span>
                  <span className="text-xs text-muted font-mono">/ {affiliateList.length}</span>
                </div>
                <div className="text-[11px] text-muted">Curated recommendations</div>
              </div>

              <div className="bg-paper-surface border border-hairline rounded-3xl p-5 space-y-1 shadow-sm">
                <div className="text-[10px] font-mono text-muted uppercase font-bold tracking-wider">
                  Total Impressions
                </div>
                <div className="text-2xl font-serif font-bold text-ink flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-orange" />
                  <span>{totalImpressions}</span>
                </div>
                <div className="text-[11px] text-muted">Post-quiz views recorded</div>
              </div>

              <div className="bg-paper-surface border border-hairline rounded-3xl p-5 space-y-1 shadow-sm">
                <div className="text-[10px] font-mono text-muted uppercase font-bold tracking-wider">
                  Outbound Clicks
                </div>
                <div className="text-2xl font-serif font-bold text-orange flex items-center space-x-2">
                  <MousePointer className="w-4 h-4 text-orange" />
                  <span>{totalClicks}</span>
                </div>
                <div className="text-[11px] text-muted">Attendee referrals sent</div>
              </div>

              <div className="bg-paper-surface border border-hairline rounded-3xl p-5 space-y-1 shadow-sm">
                <div className="text-[10px] font-mono text-muted uppercase font-bold tracking-wider">
                  Average CTR
                </div>
                <div className="text-2xl font-serif font-bold text-ink flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4 text-orange" />
                  <span>{aggregateCTR}%</span>
                </div>
                <div className="text-[11px] text-muted">Click-through engagement</div>
              </div>
            </div>

            {/* Action Bar & Filter Toolbar */}
            <div className="bg-paper-surface border border-hairline rounded-3xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
              <div className="flex flex-1 items-center space-x-3">
                <div className="relative flex-1 max-w-md">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
                  <input
                    type="text"
                    value={affiliateSearch}
                    onChange={(e) => setAffiliateSearch(e.target.value)}
                    placeholder="Search by course, tool, provider or keyword..."
                    className="w-full bg-paper border border-hairline rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-ink placeholder:text-muted/60 focus:border-ink outline-none transition-colors"
                  />
                </div>

                <select
                  value={selectedCategoryFilter}
                  onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                  className="bg-paper border border-hairline rounded-xl px-3 py-2 text-xs font-mono text-ink focus:border-ink outline-none cursor-pointer"
                >
                  <option value="all">All Categories</option>
                  <option value="cloud_devops">Cloud & DevOps</option>
                  <option value="frontend">Frontend & React</option>
                  <option value="system_design">System Design</option>
                  <option value="backend">Backend & Architecture</option>
                  <option value="ai_ml">AI & ML</option>
                  <option value="cybersecurity">Cybersecurity</option>
                  <option value="general">General</option>
                </select>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    playClickSound();
                    loadAffiliates();
                  }}
                  disabled={isLoadingAffiliates}
                  className="p-2 rounded-full bg-paper hover:bg-paper-surface text-muted hover:text-ink border border-hairline cursor-pointer transition-colors"
                  title="Refresh recommendations"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingAffiliates ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handleOpenCreateAffiliate}
                  className="btn-noma-orange px-4 py-2 rounded-full font-mono text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create Recommendation</span>
                </button>
              </div>
            </div>

            {/* Recommendations List Grid */}
            {isLoadingAffiliates ? (
              <div className="py-16 text-center space-y-3 font-mono text-xs text-muted">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange" />
                <p>Loading affiliate recommendations from Supabase...</p>
              </div>
            ) : filteredAffiliates.length === 0 ? (
              <div className="bg-paper-surface border border-dashed border-hairline rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-orange/10 text-orange border border-orange/20 flex items-center justify-center mx-auto">
                  <BadgePercent className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-base font-bold text-ink">
                    No Recommendations Found
                  </h3>
                  <p className="text-xs text-muted max-w-md mx-auto">
                    {affiliateSearch || selectedCategoryFilter !== 'all'
                      ? 'No items matched your current filter criteria.'
                      : 'You have not created any affiliate tracks yet. Add your first course or dev tool to monetize attendees.'}
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateAffiliate}
                  className="btn-noma-orange px-4 py-2 rounded-full font-mono text-xs font-bold inline-flex items-center space-x-2 cursor-pointer transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create First Recommendation</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAffiliates.map((rec) => {
                  const ctr =
                    rec.impression_count && rec.impression_count > 0
                      ? (((rec.click_count || 0) / rec.impression_count) * 100).toFixed(1)
                      : '0.0';

                  return (
                    <motion.div
                      key={rec.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`bg-paper-surface rounded-3xl border transition-all p-6 flex flex-col justify-between space-y-4 shadow-sm relative ${
                        rec.is_active
                          ? 'border-hairline hover:border-ink/20'
                          : 'border-hairline opacity-60'
                      }`}
                    >
                      {/* Top Row: Category, Status, Priority & Badges */}
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center space-x-1.5 flex-wrap">
                          <span className="px-2.5 py-0.5 rounded-full bg-paper text-ink border border-hairline font-mono text-[9px] font-bold uppercase">
                            {rec.category.replace('_', ' ')}
                          </span>

                          <span className="px-2.5 py-0.5 rounded-full bg-paper text-muted border border-hairline font-mono text-[9px] font-bold uppercase">
                            {rec.provider}
                          </span>

                          {rec.badge_text && (
                            <span className="px-2.5 py-0.5 rounded-full bg-orange/10 text-orange border border-orange/20 font-mono text-[9px] font-bold">
                              {rec.badge_text}
                            </span>
                          )}

                          {rec.discount_code && (
                            <span className="px-2.5 py-0.5 rounded-full bg-lime/20 text-ink border border-lime/40 font-mono text-[9px] font-bold">
                              CODE: {rec.discount_code}
                            </span>
                          )}
                        </div>

                        {/* Active Toggle Switch */}
                        <button
                          onClick={() => handleToggleActive(rec.id, rec.is_active)}
                          className={`px-2.5 py-0.5 rounded-full font-mono text-[9px] font-bold flex items-center space-x-1 cursor-pointer transition-colors border ${
                            rec.is_active
                              ? 'bg-lime/20 text-ink border-lime/40'
                              : 'bg-paper text-muted border-hairline'
                          }`}
                          title={rec.is_active ? 'Click to disable' : 'Click to enable'}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              rec.is_active ? 'bg-orange' : 'bg-muted'
                            }`}
                          />
                          <span>{rec.is_active ? 'ACTIVE' : 'INACTIVE'}</span>
                        </button>
                      </div>

                      {/* Content Section */}
                      <div className="space-y-1.5">
                        <h4 className="font-serif text-base font-bold text-ink tracking-tight line-clamp-1">
                          {rec.title}
                        </h4>
                        <p className="text-xs text-muted font-medium line-clamp-2">
                          {rec.headline || rec.description}
                        </p>
                        {rec.description && rec.headline && (
                          <p className="text-[11px] text-muted line-clamp-2">
                            {rec.description}
                          </p>
                        )}
                      </div>

                      {/* Target URL with Test External Link */}
                      <div className="p-3 bg-paper rounded-2xl border border-hairline flex items-center justify-between text-xs font-mono">
                        <div className="truncate text-muted text-[11px] flex-1 mr-2">
                          {rec.affiliate_url}
                        </div>
                        <a
                          href={rec.affiliate_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded-full bg-paper-surface hover:bg-paper text-ink border border-hairline text-[10px] flex items-center space-x-1 shrink-0 transition-colors"
                          title="Open affiliate destination URL in a new tab"
                        >
                          <span>Test</span>
                          <ExternalLink className="w-3 h-3 text-orange" />
                        </a>
                      </div>

                      {/* Keywords pills */}
                      {rec.keywords && rec.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {rec.keywords.slice(0, 4).map((kw) => (
                            <span
                              key={`${rec.id}-${kw}`}
                              className="px-2 py-0.5 rounded-full bg-paper text-muted border border-hairline font-mono text-[9px]"
                            >
                              #{kw}
                            </span>
                          ))}
                          {rec.keywords.length > 4 && (
                            <span className="text-[9px] text-muted font-mono self-center">
                              +{rec.keywords.length - 4} more
                            </span>
                          )}
                        </div>
                      )}

                      {/* Bottom Footer: Telemetry & Actions */}
                      <div className="pt-3 border-t border-hairline flex items-center justify-between">
                        {/* Telemetry Stats */}
                        <div className="flex items-center space-x-3 text-[11px] font-mono text-muted">
                          <span title="Impressions">
                            <span className="text-muted font-bold">IMP:</span>{' '}
                            <span className="text-ink font-bold">{rec.impression_count || 0}</span>
                          </span>
                          <span>•</span>
                          <span title="Clicks">
                            <span className="text-muted font-bold">CLK:</span>{' '}
                            <span className="text-orange font-bold">{rec.click_count || 0}</span>
                          </span>
                          <span>•</span>
                          <span title="Click-Through Rate">
                            <span className="text-muted font-bold">CTR:</span>{' '}
                            <span className="text-ink font-bold">{ctr}%</span>
                          </span>

                          <button
                            onClick={() => handleResetTelemetry(rec.id)}
                            className="text-muted hover:text-ink cursor-pointer p-0.5"
                            title="Reset telemetry"
                          >
                            <RefreshCw className="w-2.5 h-2.5" />
                          </button>
                        </div>

                        {/* Action buttons: Edit, Delete */}
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => handleOpenEditAffiliate(rec)}
                            className="p-2 rounded-full bg-paper hover:bg-paper-surface text-muted hover:text-ink border border-hairline cursor-pointer transition-colors"
                            title="Edit recommendation"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteAffiliate(rec.id, rec.title)}
                            className="p-2 rounded-full bg-paper hover:bg-red-50 text-muted hover:text-red-600 border border-hairline cursor-pointer transition-colors"
                            title="Delete recommendation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: MY ARENA ROOMS (GLOBAL ROOMS MANAGER)                   */}
        {/* ============================================================== */}
        {activeSubTab === 'rooms' && (
          <div className="space-y-6">
            <div className="bg-paper-surface border border-hairline rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div>
                <h3 className="font-serif text-base font-bold text-ink">
                  My Arena Broadcast Rooms
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Rooms created or co-managed by you. Switch rooms or configure current room settings.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    playClickSound();
                    loadRooms();
                  }}
                  disabled={isLoadingRooms}
                  className="p-2 rounded-full bg-paper hover:bg-paper-surface text-muted hover:text-ink border border-hairline cursor-pointer transition-colors"
                  title="Refresh rooms"
                >
                  <RefreshCw className={`w-4 h-4 ${isLoadingRooms ? 'animate-spin' : ''}`} />
                </button>

                <button
                  onClick={handleOpenCreateRoomModal}
                  className="btn-noma-orange px-4 py-2 rounded-full font-mono text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create New Room</span>
                </button>
              </div>
            </div>

            {isLoadingRooms ? (
              <div className="py-16 text-center space-y-3 font-mono text-xs text-muted">
                <RefreshCw className="w-6 h-6 animate-spin mx-auto text-orange" />
                <p>Loading your rooms from Supabase...</p>
              </div>
            ) : myRooms.length === 0 ? (
              <div className="bg-paper-surface border border-dashed border-hairline rounded-3xl p-12 text-center space-y-4 shadow-sm">
                <div className="w-12 h-12 rounded-2xl bg-orange/10 text-orange border border-orange/20 flex items-center justify-center mx-auto">
                  <Layers className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-base font-bold text-ink">
                    No Rooms Found
                  </h3>
                  <p className="text-xs text-muted max-w-md mx-auto">
                    You haven&apos;t created any rooms yet under this profile. Create a new arena room to start hosting.
                  </p>
                </div>
                <button
                  onClick={handleOpenCreateRoomModal}
                  className="btn-noma-orange px-4 py-2 rounded-full font-mono text-xs font-bold inline-flex items-center space-x-2 cursor-pointer transition-all shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Create First Room</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {myRooms.map((r) => {
                  const isCurrent = r.code.toUpperCase().trim() === currentRoomCode.toUpperCase().trim();

                  return (
                    <div
                      key={r.code}
                      className={`bg-paper-surface rounded-3xl border p-6 space-y-4 transition-all shadow-sm ${
                        isCurrent
                          ? 'border-2 border-orange/40 bg-orange/5'
                          : 'border-hairline hover:border-ink/20'
                      }`}
                    >
                      {/* Top row */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleCopyCode(r.code)}
                            className="px-3 py-1 rounded-full bg-paper hover:bg-paper-surface text-ink border border-hairline font-mono text-xs font-bold flex items-center space-x-1.5 cursor-pointer transition-colors"
                            title="Click to copy room code"
                          >
                            <span>{r.code}</span>
                            {copiedRoomCode === r.code ? (
                              <Check className="w-3 h-3 text-lime-700" />
                            ) : (
                              <Copy className="w-3 h-3 text-muted" />
                            )}
                          </button>

                          {isCurrent && (
                            <span className="px-2.5 py-0.5 rounded-full bg-lime/20 text-ink border border-lime/40 font-mono text-[9px] font-bold uppercase flex items-center space-x-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange animate-pulse" />
                              <span>CURRENT ACTIVE</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => onOpenQRCodeForRoom(r.code, r.title)}
                            className="p-2 rounded-full bg-paper hover:bg-paper-surface text-muted hover:text-ink border border-hairline cursor-pointer transition-colors"
                            title="View Attendee QR"
                          >
                            <QrCode className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleDeleteRoom(r.id, r.code)}
                            className="p-2 rounded-full bg-paper hover:bg-red-50 text-muted hover:text-red-600 border border-hairline cursor-pointer transition-colors"
                            title="Delete Room"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Title & Host info */}
                      <div className="space-y-1">
                        <h4 className="font-serif text-base font-bold text-ink truncate">
                          {r.title}
                        </h4>
                        <div className="text-xs text-muted font-mono flex items-center space-x-2">
                          <span>Host: {r.host_name || 'Admin'}</span>
                          <span>•</span>
                          <span>
                            Created {new Date(r.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Sponsor CTA status indicator */}
                      {r.sponsor_cta?.enabled && (
                        <div className="p-2.5 bg-paper rounded-2xl border border-hairline text-xs font-mono flex items-center justify-between text-ink">
                          <span className="flex items-center space-x-1.5 truncate">
                            <BadgePercent className="w-3.5 h-3.5 text-orange shrink-0" />
                            <span className="truncate">Sponsor: {r.sponsor_cta.sponsorName || r.sponsor_cta.title}</span>
                          </span>
                          <span className="text-[10px] text-orange uppercase font-bold shrink-0">
                            CTA ACTIVE
                          </span>
                        </div>
                      )}

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-hairline flex items-center space-x-2">
                        {!isCurrent ? (
                          <button
                            onClick={() => onSwitchRoom(r.code, r.title)}
                            className="flex-1 py-2 px-4 rounded-full btn-noma-ink font-mono text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <span>Switch to Room</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={onNavigateToRoomSettings}
                            className="flex-1 py-2 px-4 rounded-full bg-paper hover:bg-paper-surface text-ink border border-hairline font-mono text-xs font-bold flex items-center justify-center space-x-1.5 cursor-pointer transition-colors"
                          >
                            <Settings className="w-3.5 h-3.5 text-orange" />
                            <span>Edit Room Settings</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 3: PREFERENCES                                             */}
        {/* ============================================================== */}
        {activeSubTab === 'preferences' && (
          <div className="space-y-6">
            {/* Appearance & Visual Theme Card */}
            <div className="bg-paper-surface border border-hairline rounded-3xl p-7 space-y-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-serif text-base font-bold text-ink flex items-center space-x-2">
                    <Sun className="w-5 h-5 text-orange" />
                    <span>Appearance & Visual Theme</span>
                  </h3>
                  <p className="text-xs text-muted mt-1">
                    Select your preferred visual atmosphere for keynotes, live quizzing, and audience engagement.
                  </p>
                </div>

                <div className="self-start sm:self-auto px-3 py-1 rounded-full font-mono text-[11px] font-bold border border-hairline bg-paper-card text-ink flex items-center space-x-1.5 shrink-0 shadow-2xs">
                  <span className="w-2 h-2 rounded-full bg-lime shrink-0" />
                  <span className="uppercase">{resolvedTheme} MODE ACTIVE</span>
                </div>
              </div>

              {/* 3-Theme Mode Selector Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                {/* Light Option */}
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    setTheme('light');
                  }}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    theme === 'light'
                      ? 'bg-paper border-2 border-orange text-ink shadow-sm'
                      : 'bg-paper-card border-hairline text-muted hover:text-ink hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-orange/10 text-orange flex items-center justify-center">
                      <Sun className="w-4 h-4" />
                    </div>
                    {theme === 'light' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-orange" />
                    )}
                  </div>
                  <div>
                    <div className="font-serif text-sm font-bold text-ink">Light Mode</div>
                    <div className="text-[11px] text-muted mt-0.5 leading-snug">
                      Studio Paper &amp; Ink tactile risograph cream canvas.
                    </div>
                  </div>
                </button>

                {/* Dark Option */}
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    setTheme('dark');
                  }}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    theme === 'dark'
                      ? 'bg-paper border-2 border-orange text-ink shadow-sm'
                      : 'bg-paper-card border-hairline text-muted hover:text-ink hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-lime/10 text-lime flex items-center justify-center">
                      <Moon className="w-4 h-4" />
                    </div>
                    {theme === 'dark' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-orange" />
                    )}
                  </div>
                  <div>
                    <div className="font-serif text-sm font-bold text-ink">Dark Mode</div>
                    <div className="text-[11px] text-muted mt-0.5 leading-snug">
                      Obsidian Monolith carbon noir with neon accents.
                    </div>
                  </div>
                </button>

                {/* System Auto Option */}
                <button
                  type="button"
                  onClick={() => {
                    playPopSound();
                    setTheme('system');
                  }}
                  className={`p-4 rounded-2xl border text-left cursor-pointer transition-all flex flex-col justify-between space-y-3 ${
                    theme === 'system'
                      ? 'bg-paper border-2 border-orange text-ink shadow-sm'
                      : 'bg-paper-card border-hairline text-muted hover:text-ink hover:border-hairline-strong'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="w-8 h-8 rounded-xl bg-sky/20 text-sky flex items-center justify-center">
                      <Laptop className="w-4 h-4" />
                    </div>
                    {theme === 'system' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-orange" />
                    )}
                  </div>
                  <div>
                    <div className="font-serif text-sm font-bold text-ink">System Auto</div>
                    <div className="text-[11px] text-muted mt-0.5 leading-snug">
                      Automatically follows your operating system theme.
                    </div>
                  </div>
                </button>
              </div>
            </div>

            {/* Account & Security Card */}
            <div className="bg-paper-surface border border-hairline rounded-3xl p-7 space-y-4 shadow-sm">
              <h3 className="font-serif text-base font-bold text-ink flex items-center space-x-2">
                <Shield className="w-5 h-5 text-orange" />
                <span>Account & Session Info</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
                <div className="p-4 bg-paper rounded-2xl border border-hairline space-y-1">
                  <div className="text-[10px] text-muted uppercase">Authentication Provider</div>
                  <div className="text-ink font-bold">
                    {currentUser ? currentUser.app_metadata?.provider || 'Supabase Auth' : 'Guest Device'}
                  </div>
                </div>

                <div className="p-4 bg-paper rounded-2xl border border-hairline space-y-1">
                  <div className="text-[10px] text-muted uppercase">Active Room Code</div>
                  <div className="text-orange font-bold">{currentRoomCode}</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ============================================================== */}
      {/* MODAL: CREATE / EDIT AFFILIATE RECOMMENDATION                   */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isAffiliateModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl max-h-[92vh] flex flex-col bg-paper text-ink border border-hairline rounded-3xl shadow-2xl overflow-hidden font-sans"
            >
              {/* Modal Header */}
              <div className="px-6 py-5 border-b border-hairline flex items-center justify-between shrink-0 bg-paper-surface">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-orange/10 text-orange border border-orange/20 flex items-center justify-center">
                    <BadgePercent className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-serif text-base font-bold text-ink">
                      {editingAffiliateId ? 'Edit Affiliate Recommendation' : 'Create Affiliate Recommendation'}
                    </h3>
                    <p className="text-[11px] text-muted font-mono">
                      Curate high-intent tool or certification for quiz takeaway & reports
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsAffiliateModalOpen(false)}
                  className="p-2 rounded-full bg-paper hover:bg-paper-surface text-muted hover:text-ink border border-hairline cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Form Scrollable Area */}
              <form onSubmit={handleSaveAffiliate} className="flex-1 overflow-y-auto p-6 space-y-5">
                {/* Row 1: Category & Provider */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-muted uppercase">
                      Subject / Domain Category *
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none cursor-pointer"
                    >
                      <option value="cloud_devops">Cloud & DevOps (Kubernetes, AWS, Docker)</option>
                      <option value="frontend">Frontend & React (Next.js, UI/UX, TypeScript)</option>
                      <option value="system_design">System Design & Distributed Systems</option>
                      <option value="backend">Backend & Microservices (Go, Node, Python)</option>
                      <option value="ai_ml">AI & Machine Learning (LLMs, PyTorch, LangChain)</option>
                      <option value="cybersecurity">Cybersecurity & Ethical Hacking</option>
                      <option value="general">General Software Engineering</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-muted uppercase">
                      Brand / Platform / Provider *
                    </label>
                    <input
                      type="text"
                      required
                      value={formProvider}
                      onChange={(e) => setFormProvider(e.target.value)}
                      placeholder="e.g. Coursera, Datadog, ByteByteGo, Udemy"
                      className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none placeholder:text-muted/60"
                    />
                  </div>
                </div>

                {/* Row 2: Title & Headline */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-muted uppercase">
                    Title / Course / Tool Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Certified Kubernetes Administrator (CKA) Masterclass"
                    className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none placeholder:text-muted/60"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-muted uppercase">
                    Hook / Headline
                  </label>
                  <input
                    type="text"
                    value={formHeadline}
                    onChange={(e) => setFormHeadline(e.target.value)}
                    placeholder="e.g. Want to go deeper into Kubernetes container architecture?"
                    className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none placeholder:text-muted/60"
                  />
                </div>

                {/* Pitch / Description */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-muted uppercase">
                    Takeaway Pitch & Description
                  </label>
                  <textarea
                    rows={2}
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="e.g. Master production cluster management, container networking, and pass the official Linux Foundation exam."
                    className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs text-ink focus:border-ink outline-none font-sans placeholder:text-muted/60"
                  />
                </div>

                {/* Affiliate Target URL */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-muted uppercase">
                    Affiliate Destination URL *
                  </label>
                  <input
                    type="url"
                    required
                    value={formAffiliateUrl}
                    onChange={(e) => setFormAffiliateUrl(e.target.value)}
                    placeholder="https://coursera.org/learn/kubernetes?ref=arena"
                    className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none placeholder:text-muted/60"
                  />
                </div>

                {/* Row 3: Badge, Discount Code & Priority */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-muted uppercase">
                      Badge Text
                    </label>
                    <input
                      type="text"
                      value={formBadgeText}
                      onChange={(e) => setFormBadgeText(e.target.value)}
                      placeholder="e.g. OFFICIAL CERT"
                      className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-muted uppercase">
                      Promo / Discount Code
                    </label>
                    <input
                      type="text"
                      value={formDiscountCode}
                      onChange={(e) => setFormDiscountCode(e.target.value)}
                      placeholder="e.g. SKETCH25"
                      className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none uppercase"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-mono font-bold text-muted uppercase">
                      Priority Weight (1-100)
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100}
                      value={formPriority}
                      onChange={(e) => setFormPriority(Number(e.target.value))}
                      className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none"
                    />
                  </div>
                </div>

                {/* Keywords Tagging */}
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-muted uppercase">
                    Matching Keywords (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={formKeywords}
                    onChange={(e) => setFormKeywords(e.target.value)}
                    placeholder="kubernetes, k8s, docker, containers, devops, cka"
                    className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none placeholder:text-muted/60"
                  />
                  <p className="text-[10px] text-muted font-mono">
                    Used by AI to contextually match questions and round topics to this recommendation.
                  </p>
                </div>

                {/* Target Placements */}
                <div className="space-y-2">
                  <label className="text-xs font-mono font-bold text-muted uppercase">
                    Active Placements
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {(
                      [
                        { id: 'quiz_takeaway', label: 'Quiz Key Takeaway' },
                        { id: 'report', label: 'Executive Report' },
                        { id: 'certificate', label: 'Masterclass Pass' },
                        { id: 'leaderboard', label: 'Podium Footer' },
                      ] as const
                    ).map((placement) => {
                      const selected = formPlacements.includes(placement.id);
                      return (
                        <button
                          key={placement.id}
                          type="button"
                          onClick={() => handleTogglePlacement(placement.id)}
                          className={`px-3 py-1.5 rounded-full font-mono text-xs font-medium border cursor-pointer transition-colors ${
                            selected
                              ? 'bg-ink text-paper border-ink'
                              : 'bg-paper text-muted border-hairline hover:text-ink'
                          }`}
                        >
                          {selected ? '✓ ' : '+ '}
                          {placement.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Active Switch */}
                <div className="flex items-center space-x-3 pt-2">
                  <input
                    type="checkbox"
                    id="formIsActiveCheckbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-orange focus:ring-orange border-hairline cursor-pointer"
                  />
                  <label
                    htmlFor="formIsActiveCheckbox"
                    className="text-xs font-mono font-medium text-ink cursor-pointer"
                  >
                    Enable recommendation immediately upon saving
                  </label>
                </div>

                {/* Live Preview Card */}
                <div className="p-4 bg-paper-surface rounded-2xl border border-hairline space-y-2">
                  <div className="text-[10px] font-mono text-muted uppercase font-bold tracking-wider flex items-center justify-between">
                    <span>LIVE ATTENDEE CARD PREVIEW</span>
                    <span className="text-orange">QUIZ TAKEAWAY</span>
                  </div>

                  <div className="bg-paper border-2 border-orange/40 rounded-2xl p-4 space-y-2 shadow-sm">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-0.5 rounded-full bg-orange/10 text-orange border border-orange/20 font-mono text-[9px] font-bold uppercase">
                        {formBadgeText || 'RECOMMENDED RESOURCE'}
                      </span>
                      <span className="text-[10px] font-mono text-muted">
                        via {formProvider || 'Platform'}
                      </span>
                    </div>

                    <h4 className="font-serif text-sm font-bold text-ink">
                      {formTitle || 'Example Certification Name'}
                    </h4>
                    <p className="text-[11px] text-muted line-clamp-2">
                      {formHeadline || formDescription || 'Recommendation pitch copy shown to attendees.'}
                    </p>

                    <div className="flex items-center justify-between pt-1">
                      {formDiscountCode ? (
                        <span className="font-mono text-[10px] text-lime-700 font-bold">
                          Promo: {formDiscountCode}
                        </span>
                      ) : <span />}
                      <span className="text-xs font-mono font-bold text-orange flex items-center space-x-1">
                        <span>Explore →</span>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Modal Actions */}
                <div className="pt-4 border-t border-hairline flex items-center justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsAffiliateModalOpen(false)}
                    className="px-4 py-2 rounded-full bg-paper hover:bg-paper-surface text-muted hover:text-ink font-mono text-xs font-medium border border-hairline cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={isSavingAffiliate}
                    className="btn-noma-orange px-5 py-2 rounded-full font-mono text-xs font-bold flex items-center space-x-2 cursor-pointer transition-all shadow-sm"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingAffiliate ? 'Saving to Supabase...' : 'Save Recommendation'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ============================================================== */}
      {/* MODAL: CREATE ARENA ROOM                                       */}
      {/* ============================================================== */}
      <AnimatePresence>
        {isCreateRoomModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md bg-paper text-ink border border-hairline rounded-3xl p-6 sm:p-7 shadow-2xl space-y-5 font-sans"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-orange/10 text-orange border border-orange/20 flex items-center justify-center">
                    <Layers className="w-4 h-4" />
                  </div>
                  <h3 className="font-serif text-base font-bold text-ink">
                    Create New Arena Room
                  </h3>
                </div>
                <button
                  onClick={() => setIsCreateRoomModalOpen(false)}
                  className="p-1.5 rounded-full text-muted hover:text-ink hover:bg-paper-surface border border-hairline cursor-pointer transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-muted uppercase">
                    Unique Passcode
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      required
                      value={newRoomCode}
                      onChange={(e) => setNewRoomCode(e.target.value.toUpperCase())}
                      className="flex-1 bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs font-mono text-ink focus:border-ink outline-none font-bold"
                    />
                    <button
                      type="button"
                      onClick={() => setNewRoomCode(generateUniqueCode(myRooms))}
                      className="p-2.5 rounded-xl bg-paper hover:bg-paper-surface text-muted hover:text-ink border border-hairline cursor-pointer transition-colors"
                      title="Generate new code"
                    >
                      <RefreshCw className="w-4 h-4 text-orange" />
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-mono font-bold text-muted uppercase">
                    Room Session Title
                  </label>
                  <input
                    type="text"
                    value={newRoomTitle}
                    onChange={(e) => setNewRoomTitle(e.target.value)}
                    placeholder="e.g. Distributed Systems Architecture Arena"
                    className="w-full bg-paper border border-hairline rounded-xl px-3.5 py-2 text-xs text-ink focus:border-ink outline-none font-sans placeholder:text-muted/60"
                  />
                </div>

                <div className="pt-3 flex items-center justify-end space-x-2 border-t border-hairline">
                  <button
                    type="button"
                    onClick={() => setIsCreateRoomModalOpen(false)}
                    className="px-4 py-2 rounded-full bg-paper hover:bg-paper-surface text-muted hover:text-ink font-mono text-xs font-medium border border-hairline cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-noma-orange px-4 py-2 rounded-full font-mono text-xs font-bold flex items-center space-x-2 cursor-pointer shadow-sm"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Create & Enter</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
