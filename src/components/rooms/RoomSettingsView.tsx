import React, { useState } from 'react';
import {
  Settings,
  QrCode,
  Copy,
  Check,
  Crown,
  UserPlus,
  UserX,
  BadgePercent,
  Trash2,
  RotateCcw,
  ArrowRightLeft,
  ExternalLink,
  Shield,
  Radio,
  Eye,
  Save,
} from 'lucide-react';
import { motion } from 'motion/react';
import type { Room, SponsorCTA } from '../../types';
import type { User } from '@supabase/supabase-js';
import {
  dbUpdateRoomTitle,
  dbUpdateRoomAdmins,
  dbUpdateRoomSponsorCTA,
} from '../../lib/supabase';
import { playClickSound, playPopSound, playWhoosh } from '../../lib/soundFx';

interface RoomSettingsViewProps {
  room: Room;
  onUpdateRoomTitle?: (newTitle: string) => void;
  onUpdateRoomAdmins?: (newAdmins: string[]) => void;
  onUpdateRoomSponsor?: (cta: SponsorCTA | null) => void;
  onOpenQRCode: () => void;
  onOpenChangeRoom?: () => void;
  onDeleteCurrentRoom?: () => void;
  onResetRoomState?: () => void;
  isHost?: boolean;
  currentUser?: User | null;
  userName: string;
}

export const RoomSettingsView: React.FC<RoomSettingsViewProps> = ({
  room,
  onUpdateRoomTitle,
  onUpdateRoomAdmins,
  onUpdateRoomSponsor,
  onOpenQRCode,
  onOpenChangeRoom,
  onDeleteCurrentRoom,
  onResetRoomState,
  isHost = false,
  currentUser,
  userName,
}) => {
  // Title state
  const [prevRoomCode, setPrevRoomCode] = useState(room.code);
  const [titleInput, setTitleInput] = useState(room.title);
  const [isSavingTitle, setIsSavingTitle] = useState(false);
  const [titleSaved, setTitleSaved] = useState(false);

  // Co-Admins state
  const [adminInput, setAdminInput] = useState('');
  const [isSavingAdmin, setIsSavingAdmin] = useState(false);

  // Sponsor CTA State
  const initialSponsor = room.sponsor_cta;
  const [sponsorEnabled, setSponsorEnabled] = useState(Boolean(initialSponsor?.enabled));
  const [sponsorName, setSponsorName] = useState(initialSponsor?.sponsorName || '');
  const [sponsorTitle, setSponsorTitle] = useState(initialSponsor?.title || '');
  const [sponsorDescription, setSponsorDescription] = useState(initialSponsor?.description || '');
  const [sponsorCtaText, setSponsorCtaText] = useState(initialSponsor?.ctaText || 'Learn More');
  const [sponsorCtaUrl, setSponsorCtaUrl] = useState(initialSponsor?.url || initialSponsor?.ctaUrl || '');
  const [sponsorDiscountCode, setSponsorDiscountCode] = useState(initialSponsor?.discountCode || '');
  const [sponsorOverrideDefault, setSponsorOverrideDefault] = useState(initialSponsor?.overrideDefault ?? true);
  const [isSavingSponsor, setIsSavingSponsor] = useState(false);
  const [sponsorSaved, setSponsorSaved] = useState(false);

  // Sync if room changes
  if (room.code !== prevRoomCode) {
    setPrevRoomCode(room.code);
    setTitleInput(room.title);
    const s = room.sponsor_cta;
    setSponsorEnabled(Boolean(s?.enabled));
    setSponsorName(s?.sponsorName || '');
    setSponsorTitle(s?.title || '');
    setSponsorDescription(s?.description || '');
    setSponsorCtaText(s?.ctaText || 'Learn More');
    setSponsorCtaUrl(s?.url || s?.ctaUrl || '');
    setSponsorDiscountCode(s?.discountCode || '');
    setSponsorOverrideDefault(s?.overrideDefault ?? true);
  }

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const attendeeUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/?room=${encodeURIComponent(room.code)}`
    : `https://sketchcast.live/?room=${encodeURIComponent(room.code)}`;

  const handleCopyCode = () => {
    playPopSound();
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const handleCopyLink = () => {
    playPopSound();
    navigator.clipboard.writeText(attendeeUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSaveTitle = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = titleInput.trim();
    if (!cleanTitle || cleanTitle === room.title) return;

    setIsSavingTitle(true);
    playClickSound();
    const success = await dbUpdateRoomTitle(room.code, cleanTitle);
    setIsSavingTitle(false);
    if (success) {
      playPopSound();
      setTitleSaved(true);
      onUpdateRoomTitle?.(cleanTitle);
      setTimeout(() => setTitleSaved(false), 2500);
    }
  };

  const handleAddCoAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanAdmin = adminInput.trim();
    if (!cleanAdmin) return;

    const currentAdmins = room.admins || [];
    if (currentAdmins.includes(cleanAdmin)) {
      setAdminInput('');
      return;
    }

    setIsSavingAdmin(true);
    playClickSound();
    const updated = [...currentAdmins, cleanAdmin];
    await dbUpdateRoomAdmins(room.code, updated);
    setIsSavingAdmin(false);
    setAdminInput('');
    playPopSound();
    onUpdateRoomAdmins?.(updated);
  };

  const handleRemoveCoAdmin = async (adminToRemove: string) => {
    playClickSound();
    const currentAdmins = room.admins || [];
    const updated = currentAdmins.filter((a) => a !== adminToRemove);
    await dbUpdateRoomAdmins(room.code, updated);
    playPopSound();
    onUpdateRoomAdmins?.(updated);
  };

  const handleSaveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSponsor(true);
    playClickSound();

    const ctaPayload: SponsorCTA = {
      enabled: sponsorEnabled,
      sponsorName: sponsorName.trim(),
      title: sponsorTitle.trim(),
      description: sponsorDescription.trim(),
      ctaText: sponsorCtaText.trim() || 'Learn More',
      ctaUrl: sponsorCtaUrl.trim(),
      url: sponsorCtaUrl.trim(),
      discountCode: sponsorDiscountCode.trim() || undefined,
      overrideDefault: sponsorOverrideDefault,
    };

    await dbUpdateRoomSponsorCTA(room.code, ctaPayload);
    setIsSavingSponsor(false);
    setSponsorSaved(true);
    playPopSound();
    onUpdateRoomSponsor?.(ctaPayload);
    setTimeout(() => setSponsorSaved(false), 2500);
  };

  const handleClearSponsor = async () => {
    playWhoosh();
    setIsSavingSponsor(true);
    await dbUpdateRoomSponsorCTA(room.code, null);
    setIsSavingSponsor(false);
    setSponsorEnabled(false);
    setSponsorName('');
    setSponsorTitle('');
    setSponsorDescription('');
    setSponsorCtaText('Learn More');
    setSponsorCtaUrl('');
    setSponsorDiscountCode('');
    onUpdateRoomSponsor?.(null);
  };

  const isOwner =
    Boolean(currentUser?.id && room.host_id === currentUser.id) ||
    Boolean(currentUser?.email && room.host_email && room.host_email.toLowerCase() === currentUser.email.toLowerCase()) ||
    Boolean(room.host_name && room.host_name.toLowerCase() === userName.toLowerCase());

  return (
    <div className="w-full max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 flex flex-col flex-1 space-y-6">
      {/* ================= Header Banner ================= */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/[0.08]">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/25 text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
            <Settings className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center space-x-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Room Settings
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/25 font-mono text-xs font-bold">
                {room.code}
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 text-[10px] font-bold">
                <Radio className="w-3 h-3 animate-pulse" />
                <span>ACTIVE SESSION</span>
              </span>
            </div>
            <p className="text-xs text-zinc-400 mt-1">
              Configure parameters, co-hosts, and custom brand monetization for this active arena.
            </p>
          </div>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center space-x-2 flex-wrap gap-y-2">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => {
              playClickSound();
              onOpenQRCode();
            }}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
            title="Open Room QR Code"
          >
            <QrCode className="w-4 h-4 text-blue-400" />
            <span>Join QR</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={handleCopyLink}
            className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-200 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center space-x-1.5 cursor-pointer transition-colors"
            title="Copy Attendee Direct URL"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
            <span>{copiedLink ? 'Copied Link!' : 'Share Link'}</span>
          </motion.button>

          {onOpenChangeRoom && (
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => {
                playClickSound();
                onOpenChangeRoom();
              }}
              className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md shadow-blue-500/20 transition-all"
              title="Switch to another room"
            >
              <ArrowRightLeft className="w-3.5 h-3.5" />
              <span>Switch Room</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* ================= SECTION 1: Room Identity ================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0E0E12] border border-white/[0.08] shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Room Identification & Title
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            {isOwner ? (
              <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold flex items-center gap-1">
                <Crown className="w-3 h-3 text-blue-400" />
                <span>Room Owner</span>
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full bg-white/[0.04] text-zinc-400 border border-white/[0.08] text-[10px] font-bold flex items-center gap-1">
                <Shield className="w-3 h-3 text-blue-400" />
                <span>Authorized Co-Admin</span>
              </span>
            )}
          </div>
        </div>

        <form onSubmit={handleSaveTitle} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Session Display Title
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={titleInput}
                  onChange={(e) => setTitleInput(e.target.value)}
                  placeholder="e.g. Distributed Systems & High-Scale Architecture"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-white text-xs sm:text-sm placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
                />
                <motion.button
                  type="submit"
                  disabled={isSavingTitle || titleInput.trim() === room.title}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`px-4 py-2.5 rounded-xl text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer ${
                    titleInput.trim() !== room.title
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20'
                      : 'bg-white/[0.04] text-zinc-500 border border-white/[0.06] cursor-not-allowed'
                  }`}
                >
                  {titleSaved ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Saved</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingTitle ? 'Saving...' : 'Save Title'}</span>
                    </>
                  )}
                </motion.button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-300 block mb-1.5">
                Room Passcode (Read-Only)
              </label>
              <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08]">
                <span className="font-mono text-xs font-bold text-blue-400 tracking-wider">
                  {room.code}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  title="Copy room code"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-400 font-mono">
            <div>
              Primary Host: <strong className="text-zinc-200 font-sans">{room.host_name || 'Host'}</strong>
              {room.host_email && <span className="text-zinc-500 ml-1.5 font-mono">({room.host_email})</span>}
            </div>
            <div>
              Created: <span className="text-zinc-300 font-mono">{new Date(room.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </form>
      </div>

      {/* ================= SECTION 2: Authorized Co-Admins ================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0E0E12] border border-white/[0.08] shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center space-x-2.5">
            <Crown className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
              Authorized Co-Admins ({(room.admins || []).length})
            </h2>
          </div>
          <span className="text-xs text-zinc-400">
            Co-hosts have full privileges to launch challenges and manage Q&A
          </span>
        </div>

        {/* Add Co-Admin Form */}
        <form onSubmit={handleAddCoAdmin} className="flex items-center gap-2">
          <input
            type="text"
            value={adminInput}
            onChange={(e) => setAdminInput(e.target.value)}
            placeholder="Enter co-host display name or registered email..."
            className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 transition-colors"
          />
          <motion.button
            type="submit"
            disabled={isSavingAdmin || !adminInput.trim()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold flex items-center space-x-1.5 transition-all cursor-pointer shadow-sm"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Add Admin</span>
          </motion.button>
        </form>

        {/* Admins List */}
        <div className="flex flex-wrap gap-2 pt-1">
          {(room.admins || []).length === 0 ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center text-xs text-zinc-500 italic w-full">
              No additional co-admins added yet. Add trusted colleagues above so they can co-host this session.
            </div>
          ) : (
            (room.admins || []).map((adminName) => (
              <div
                key={adminName}
                className="px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.08] flex items-center space-x-2 text-xs text-zinc-200"
              >
                <Crown className="w-3 h-3 text-blue-400 shrink-0" />
                <span className="font-medium">{adminName}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveCoAdmin(adminName)}
                  className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
                  title={`Remove ${adminName} as admin`}
                >
                  <UserX className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ================= SECTION 3: Room Sponsor & Monetization CTA ================= */}
      <div className="p-5 sm:p-6 rounded-2xl bg-[#0E0E12] border border-white/[0.08] shadow-md space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06] flex-wrap gap-2">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
              <BadgePercent className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Room Sponsor & Custom Monetization CTA
              </h2>
              <p className="text-xs text-zinc-400">
                Monetize your masterclass with a featured partner, direct sponsor, or course discount
              </p>
            </div>
          </div>

          {/* Enable Toggle Switch */}
          <div className="flex items-center space-x-3 bg-white/[0.02] border border-white/[0.08] px-3.5 py-1.5 rounded-xl">
            <span className="text-xs font-semibold text-zinc-300">
              {sponsorEnabled ? 'Sponsor Enabled' : 'Sponsor Disabled'}
            </span>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={sponsorEnabled}
                onChange={(e) => setSponsorEnabled(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
            </label>
          </div>
        </div>

        {/* Live Preview Card */}
        {sponsorEnabled && (
          <div className="space-y-2">
            <div className="flex items-center space-x-1.5 text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-500">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span>LIVE ATTENDEE CARD PREVIEW</span>
            </div>

            <div className="p-4 rounded-xl bg-[#121218] border border-emerald-500/30 space-y-2 relative overflow-hidden">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold uppercase">
                  {sponsorName || 'FEATURED SPONSOR'}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  Presented by Session Host
                </span>
              </div>

              <div className="text-sm font-bold text-white">
                {sponsorTitle || 'Your Custom Campaign Title'}
              </div>

              <p className="text-xs text-zinc-400 line-clamp-2">
                {sponsorDescription || 'Add a compelling description of what attendees will gain, discount codes, or free cloud credits.'}
              </p>

              <div className="flex items-center justify-between pt-1 flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-sm">
                    <span>{sponsorCtaText || 'Learn More'}</span>
                    <ExternalLink className="w-3 h-3" />
                  </span>
                  {sponsorDiscountCode && (
                    <span className="px-2.5 py-1 rounded-lg bg-white/[0.04] text-emerald-400 font-mono text-[11px] border border-emerald-500/20">
                      Code: {sponsorDiscountCode}
                    </span>
                  )}
                </div>
                <span className="text-[10px] text-zinc-500">Official Session Sponsor</span>
              </div>
            </div>
          </div>
        )}

        {/* Sponsor Form */}
        <form onSubmit={handleSaveSponsor} className="space-y-3.5 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1">
                Sponsor / Brand Name
              </label>
              <input
                type="text"
                value={sponsorName}
                onChange={(e) => setSponsorName(e.target.value)}
                placeholder="e.g. Supabase, Docker, Exponent, Datadog"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1">
                Button Text
              </label>
              <input
                type="text"
                value={sponsorCtaText}
                onChange={(e) => setSponsorCtaText(e.target.value)}
                placeholder="e.g. Claim Free Tier, Enroll 30% Off"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-300 block mb-1">
              Headline / Campaign Title
            </label>
            <input
              type="text"
              value={sponsorTitle}
              onChange={(e) => setSponsorTitle(e.target.value)}
              placeholder="e.g. Accelerate Your Backend with Serverless Postgres & Edge Functions"
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="text-[11px] font-medium text-zinc-300 block mb-1">
              Value Proposition / Pitch Description
            </label>
            <textarea
              rows={2}
              value={sponsorDescription}
              onChange={(e) => setSponsorDescription(e.target.value)}
              placeholder="e.g. Get $50 in free cloud credits when starting your next production prototype."
              className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 resize-none"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1">
                Destination URL
              </label>
              <input
                type="url"
                value={sponsorCtaUrl}
                onChange={(e) => setSponsorCtaUrl(e.target.value)}
                placeholder="https://sponsor.com/?ref=sketchcast"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-zinc-300 block mb-1">
                Promo / Discount Code (Optional)
              </label>
              <input
                type="text"
                value={sponsorDiscountCode}
                onChange={(e) => setSponsorDiscountCode(e.target.value)}
                placeholder="e.g. SKETCHCAST30"
                className="w-full px-3.5 py-2 rounded-xl bg-zinc-900/90 border border-white/[0.08] text-white text-xs placeholder:text-zinc-600 focus:outline-none focus:border-blue-500 font-mono uppercase"
              />
            </div>
          </div>

          {/* Priority Override Switch */}
          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/[0.08] flex items-center justify-between">
            <div className="pr-3">
              <span className="text-xs font-semibold text-zinc-200 block">
                Override Platform Affiliate Recommendations
              </span>
              <span className="text-[11px] text-zinc-500 block">
                Prioritizes this custom sponsor across quiz takeaways, leaderboard, certificate, and reports in this room.
              </span>
            </div>
            <input
              type="checkbox"
              checked={sponsorOverrideDefault}
              onChange={(e) => setSponsorOverrideDefault(e.target.checked)}
              className="w-4 h-4 rounded text-blue-600 bg-zinc-900 border-zinc-700"
            />
          </div>

          {/* Sponsor Actions */}
          <div className="pt-2 flex items-center justify-between gap-2">
            {room.sponsor_cta?.enabled ? (
              <button
                type="button"
                onClick={handleClearSponsor}
                className="px-3 py-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium border border-red-500/20 transition-colors cursor-pointer"
              >
                Remove Sponsor
              </button>
            ) : <div />}

            <motion.button
              type="submit"
              disabled={isSavingSponsor}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold uppercase tracking-wider flex items-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition-all"
            >
              {sponsorSaved ? (
                <>
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Sponsor Saved</span>
                </>
              ) : (
                <>
                  <BadgePercent className="w-3.5 h-3.5" />
                  <span>{isSavingSponsor ? 'Saving...' : 'Save Sponsor Settings'}</span>
                </>
              )}
            </motion.button>
          </div>
        </form>
      </div>

      {/* ================= SECTION 4: Danger Zone ================= */}
      {isHost && (
        <div className="p-5 sm:p-6 rounded-2xl bg-red-950/20 border border-red-500/30 shadow-md space-y-4">
          <div className="flex items-center space-x-2.5 pb-3 border-b border-red-500/20">
            <Trash2 className="w-4 h-4 text-red-400" />
            <h2 className="text-sm sm:text-base font-bold text-red-400 tracking-tight">
              Danger Zone
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-zinc-200">
                Reset Session Responses
              </div>
              <div className="text-[11px] text-zinc-400">
                Clears live quiz answers, poll votes, and attendee history for a fresh masterclass session.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Reset session data for Room [${room.code}]?`)) {
                  onResetRoomState?.();
                }
              }}
              className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-zinc-300 hover:text-white border border-white/[0.08] text-xs font-semibold flex items-center space-x-1.5 shrink-0 cursor-pointer transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5 text-zinc-400" />
              <span>Reset Session State</span>
            </button>
          </div>

          <div className="pt-2 border-t border-red-500/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-red-400">
                Delete This Room
              </div>
              <div className="text-[11px] text-zinc-400">
                Permanently deletes Room [{room.code}] and removes all questions, polls, and leaderboard history.
              </div>
            </div>
            <button
              type="button"
              onClick={() => {
                if (confirm(`Permanently delete Room [${room.code}]? This action cannot be undone.`)) {
                  onDeleteCurrentRoom?.();
                }
              }}
              className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold flex items-center space-x-1.5 shrink-0 cursor-pointer shadow-md shadow-red-500/20 transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Delete Room</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
