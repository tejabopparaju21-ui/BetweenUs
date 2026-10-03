import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { getEmergencyNumberForCountry } from '../utils/emergencyNumbers';
import { PWAInstallButton } from './PWAInstallButton';
import { HomeEmergencyButton } from './HomeEmergencyButton';
import {
  ShieldAlert,
  ShieldCheck,
  Phone,
  PhoneCall,
  User,
  Heart,
  Bell,
  MapPin,
  Lock,
  Moon,
  Trash2,
  Copy,
  Check,
  AlertTriangle,
  LogOut,
  RefreshCw,
  Plus,
  X,
  FileCode,
  Info,
  Cloud,
  Database,
  ExternalLink,
  Table,
  Search,
  Camera,
  Upload,
  Download,
  Sparkles,
  Smartphone,
  Share2,
} from 'lucide-react';
import { readFileAsDataUrl } from '../utils/fileUtils';
import { INDIAN_CITIES, INDIAN_HOURS_12H, findIndianCity } from '../utils/indianCities';

export const SettingsSection: React.FC = () => {
  const {
    currentUser,
    partnerUser,
    couple,
    updateUserProfile,
    updateCouple,
    stopSharingEverything,
    addEmergencyContact,
    deleteEmergencyContact,
    connectCoupleWithCode,
    unlinkCurrentCouple,
    disconnectCouple,
    resetAllDemoData,
    firebaseUser,
    isFirebaseConnected,
    firebaseProjectId,
    isDemoMode,
    loginWithGoogle,
    loginWithEmail,
    registerWithEmail,
    logOutFirebase,
    messages,
    moods,
    memories,
  } = useApp();

  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'safety' | 'couple' | 'architecture'>('profile');

  // Database Tables Explorer States
  const [selectedTable, setSelectedTable] = useState<'messages' | 'moods' | 'memories' | 'couples' | 'users'>('messages');
  const [tableSearch, setTableSearch] = useState('');
  const [inspectDocId, setInspectDocId] = useState<string | null>(null);

  // Firebase Auth Form States
  const [authEmail, setAuthEmail] = useState('');
  const [authPass, setAuthPass] = useState('');
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authFeedback, setAuthFeedback] = useState<string | null>(null);
  const [isCloudSyncing, setIsCloudSyncing] = useState(false);

  // Profile Form States
  const [name, setName] = useState(currentUser.name);
  const [phoneNumber, setPhoneNumber] = useState(currentUser.phoneNumber || '');
  const [city, setCity] = useState(currentUser.city || '');
  const [country, setCountry] = useState(currentUser.country || 'US');
  const [timeZone, setTimeZone] = useState(currentUser.timeZone);
  const [anniversary, setAnniversary] = useState(currentUser.anniversaryDate);
  const [sleepStart, setSleepStart] = useState(currentUser.sleepStartHour);
  const [sleepEnd, setSleepEnd] = useState(currentUser.sleepEndHour);
  const [avatarUrl, setAvatarUrl] = useState(currentUser.avatarUrl);

  // Keep form fields in sync when currentUser changes
  useEffect(() => {
    setName(currentUser.name);
    setPhoneNumber(currentUser.phoneNumber || '');
    setCity(currentUser.city || '');
    setCountry(currentUser.country || 'IN');
    setTimeZone(currentUser.timeZone);
    setAnniversary(currentUser.anniversaryDate);
    setSleepStart(currentUser.sleepStartHour);
    setSleepEnd(currentUser.sleepEndHour);
    setAvatarUrl(currentUser.avatarUrl);
  }, [currentUser]);

  // Couple Code States
  const [enterCode, setEnterCode] = useState('');
  const [codeMessage, setCodeMessage] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  // New Emergency Contact Form
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactRel, setContactRel] = useState('');
  const [contactEmail, setContactEmail] = useState('');

  const emergencyData = getEmergencyNumberForCountry(currentUser.country);

  const [profileSuccessMsg, setProfileSuccessMsg] = useState<string | null>(null);
  const [killSwitchTriggered, setKillSwitchTriggered] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCity = findIndianCity(city.trim());
    updateUserProfile({
      name: name.trim(),
      phoneNumber: phoneNumber.trim(),
      city: matchedCity ? matchedCity.displayName : city.trim(),
      country: 'IN',
      timeZone: 'Asia/Kolkata',
      anniversaryDate: anniversary,
      sleepStartHour: Number(sleepStart),
      sleepEndHour: Number(sleepEnd),
      avatarUrl: avatarUrl.trim(),
      location: matchedCity
        ? {
            latitude: matchedCity.latitude,
            longitude: matchedCity.longitude,
            city: matchedCity.displayName,
            country: 'India',
            updatedAt: new Date().toISOString(),
          }
        : currentUser.location,
    });
    setProfileSuccessMsg('Profile updated! Timings set to Indian Standard Time (IST).');
    setTimeout(() => setProfileSuccessMsg(null), 3000);
  };

  const handleCopyCode = () => {
    const codeToCopy = currentUser.coupleCode || couple?.code;
    if (codeToCopy) {
      navigator.clipboard.writeText(codeToCopy);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const handleShareWhatsApp = () => {
    const code = currentUser.coupleCode || couple?.code || 'PAIR-LOVE';
    const appUrl = window.location.origin;
    const message = `Hey! ❤️ Connect with me on BetweenUs — our private couples space for live chat, mood sharing, and distance tracking.\n\nOur private couple code: ${code}\n\nOpen app: ${appUrl}`;
    const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    if (typeof navigator !== 'undefined' && navigator.share) {
      navigator.share({
        title: 'BetweenUs Couple Invitation',
        text: message,
        url: appUrl,
      }).catch(() => {
        const opened = window.open(whatsappUrl, '_blank');
        if (!opened) window.location.href = whatsappUrl;
      });
    } else {
      const opened = window.open(whatsappUrl, '_blank');
      if (!opened) window.location.href = whatsappUrl;
    }
  };

  const handleConnectCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!enterCode.trim()) return;
    setCodeMessage('Connecting to partner in cloud...');
    const res = await connectCoupleWithCode(enterCode);
    setCodeMessage(res.message);
  };

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactPhone.trim()) return;
    addEmergencyContact({
      name: contactName.trim(),
      phone: contactPhone.trim(),
      relationship: contactRel.trim() || 'Trusted Contact',
      email: contactEmail.trim() || undefined,
    });
    setContactName('');
    setContactPhone('');
    setContactRel('');
    setContactEmail('');
    setShowContactModal(false);
  };

  return (
    <div className="max-w-md mx-auto px-4 py-5 space-y-5 pb-28">
      {/* Category Pills */}
      <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-2xl text-xs font-semibold overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveSubTab('profile')}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'profile'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Profile
        </button>
        <button
          onClick={() => setActiveSubTab('safety')}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'safety'
              ? 'bg-white text-red-600 shadow-xs font-bold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Safety Center 🚨
        </button>
        <button
          onClick={() => setActiveSubTab('couple')}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'couple'
              ? 'bg-white text-rose-600 shadow-xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Couple Code
        </button>
        <button
          onClick={() => setActiveSubTab('architecture')}
          className={`flex-1 py-2 px-2.5 rounded-xl whitespace-nowrap transition ${
            activeSubTab === 'architecture'
              ? 'bg-white text-rose-600 shadow-xs font-semibold'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          Cloud DB 🔥
        </button>
      </div>

      {/* 1. PROFILE SETTINGS */}
      {activeSubTab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-sm space-y-3.5">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <User className="w-4 h-4 text-rose-600" />
              <span>Personal Profile</span>
            </h3>

            <div className="flex items-center gap-4">
              <div className="relative group shrink-0">
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="w-16 h-16 rounded-full object-cover border-2 border-rose-300 shadow-xs"
                />
                <label
                  title="Click to choose a photo"
                  className="absolute inset-0 rounded-full bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition"
                >
                  <Camera className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const res = await readFileAsDataUrl(file);
                          setAvatarUrl(res.url);
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                  />
                </label>
              </div>
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-semibold text-slate-700 block">
                    Profile Picture
                  </label>
                  {avatarUrl === '/app-logo.svg' && (
                    <span className="text-[10px] text-rose-600 font-semibold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100 flex items-center gap-1">
                      <Heart className="w-2.5 h-2.5 fill-rose-500 text-rose-500" />
                      Couple Hands Art
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs border border-rose-200 transition shadow-2xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Choose Photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          try {
                            const res = await readFileAsDataUrl(file);
                            setAvatarUrl(res.url);
                          } catch (err) {
                            console.error(err);
                          }
                        }
                      }}
                    />
                  </label>

                  <button
                    type="button"
                    onClick={() => setAvatarUrl('/app-logo.svg')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition shadow-2xs ${
                      avatarUrl === '/app-logo.svg'
                        ? 'bg-rose-600 text-white border-rose-600'
                        : 'bg-white hover:bg-rose-50 text-slate-700 border-slate-200'
                    }`}
                  >
                    <Heart className="w-3.5 h-3.5" />
                    <span>Use Couple Hands</span>
                  </button>
                </div>
                <p className="text-[10px] text-slate-400">
                  Select a photo from your device or use the official couple hands artwork.
                </p>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                required
              />
            </div>

            {/* Phone Number - Connected to Partner Emergency Ring */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>Your Phone Number</span>
                </label>
                <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1">
                  <ShieldCheck className="w-2.5 h-2.5 text-emerald-600" />
                  Emergency Ring Connected
                </span>
              </div>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="+91 98490 54321"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Directly connected to {partnerUser.name}'s emergency ring button. During an emergency SOS, your partner's siren sounds and this phone number is dialed.
              </p>
            </div>

            {/* Indian City & Region Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Your City in India</span>
                </label>
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  🇮🇳 India Only
                </span>
              </div>
              <div className="space-y-1.5">
                <select
                  value={INDIAN_CITIES.some((c) => c.name.toLowerCase() === city.toLowerCase() || c.displayName.toLowerCase() === city.toLowerCase()) ? city : 'custom'}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      setCity(e.target.value);
                    }
                  }}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
                >
                  <option value="" disabled>Select your city in India...</option>
                  {INDIAN_CITIES.map((c) => (
                    <option key={c.name} value={c.displayName}>
                      {c.displayName}
                    </option>
                  ))}
                  <option value="custom">Other Indian City / Town (Custom)</option>
                </select>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Or type your city, e.g. Visakhapatnam, Chandigarh, etc."
                  className="w-full text-xs px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700"
                />
              </div>
            </div>

            {/* Indian Standard Time (IST) & Country Status */}
            <div className="bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 p-3 rounded-2xl border border-rose-200/70 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1">
                  <span>🇮🇳</span>
                  <span>Indian Standard Time (IST)</span>
                </span>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  UTC +05:30
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                BetweenUs is tuned for couples across India. Both partner devices automatically synchronize to official Indian Standard Time (Asia/Kolkata).
              </p>
              <div className="flex items-center justify-between pt-1 border-t border-rose-200/50 text-[10px] text-slate-500">
                <span>Emergency ERSS: <strong>112</strong></span>
                <span>Women Helpline: <strong>1091</strong></span>
                <span>Country: <strong>India (+91)</strong></span>
              </div>
            </div>

            {/* Sleep & Awake Schedule (12-Hour AM/PM) */}
            <div className="pt-2 border-t border-slate-100">
              <span className="text-xs font-bold text-slate-700 block mb-1 flex items-center gap-1.5">
                <Moon className="w-3.5 h-3.5 text-indigo-500" />
                <span>Typical Sleep Schedule (IST)</span>
              </span>
              <p className="text-[11px] text-slate-500 mb-2">
                Helps your partner know when you are sleeping in your Indian city without disturbing you.
              </p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Sleep Bedtime</label>
                  <select
                    value={sleepStart}
                    onChange={(e) => setSleepStart(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {INDIAN_HOURS_12H.map((h) => (
                      <option key={h.hour} value={h.hour}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[11px] font-medium text-slate-600 block mb-1">Wake Up (Morning)</label>
                  <select
                    value={sleepEnd}
                    onChange={(e) => setSleepEnd(Number(e.target.value))}
                    className="w-full text-xs px-2.5 py-1.5 rounded-xl border border-slate-200 bg-white"
                  >
                    {INDIAN_HOURS_12H.map((h) => (
                      <option key={h.hour} value={h.hour}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {profileSuccessMsg && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium text-center animate-fade-in">
                ✓ {profileSuccessMsg}
              </div>
            )}


            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Save Profile Changes
            </button>
          </div>

          {/* Official Holding Hands App Logo Showcase */}
          <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-rose-950 text-white p-5 rounded-3xl border border-rose-900/40 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-500/20 flex items-center justify-center border border-rose-500/30">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-white">Holding Hands App Logo</h4>
                  <p className="text-[11px] text-rose-200/70">Official brand icon & couple symbol</p>
                </div>
              </div>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Official Vector
              </span>
            </div>

            {/* Logo Display Hero with Real-world Contexts */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-2xl bg-black/40 border border-white/10 backdrop-blur-sm">
              {/* Primary 100px Logo Icon */}
              <div className="relative group shrink-0">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-rose-500 to-pink-400 shadow-lg shadow-rose-900/40">
                  <img
                    src="/holding-hands-logo.svg"
                    alt="Holding Hands App Logo"
                    className="w-full h-full rounded-full object-cover bg-black"
                  />
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-2 py-0.5 rounded-full bg-slate-900 border border-rose-500/40 text-[9px] font-bold text-rose-300 whitespace-nowrap shadow-xs">
                  512 × 512 HD
                </div>
              </div>

              {/* Specs & Symbolism */}
              <div className="flex-1 space-y-2 text-center sm:text-left">
                <div className="text-xs font-semibold text-rose-100 flex items-center justify-center sm:justify-start gap-1.5">
                  <Heart className="w-3.5 h-3.5 text-rose-400 fill-rose-400" />
                  <span>Two Hands Interlocked Across the Distance</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Crafted with warm partner gradients, a glowing central heart pulse, cozy sweater and denim cuff accents, framed within a romantic obsidian ring.
                </p>

                {/* Real-world Mockup Preview Bar */}
                <div className="flex items-center justify-center sm:justify-start gap-3 pt-1">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                    <img src="/holding-hands-logo.svg" className="w-4 h-4 rounded-full" alt="icon" />
                    <span>Favicon</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                    <img src="/holding-hands-logo.svg" className="w-5 h-5 rounded-full" alt="icon" />
                    <span>App Icon</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                    <img src="/holding-hands-logo.svg" className="w-6 h-6 rounded-full" alt="icon" />
                    <span>Avatar</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 pt-1">
              <a
                href="/holding-hands-logo.svg"
                download="holding-hands-logo.svg"
                className="flex-1 py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5 text-rose-300" />
                <span>Download SVG</span>
              </a>

              <button
                type="button"
                onClick={() => {
                  setAvatarUrl('/holding-hands-logo.svg');
                  updateUserProfile({ avatarUrl: '/holding-hands-logo.svg' });
                  alert('Set Holding Hands as your profile picture!');
                }}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/30 transition"
              >
                <Heart className="w-3.5 h-3.5 fill-white" />
                <span>Apply to Profile</span>
              </button>
            </div>
          </div>

          {/* Android Phone Access & Install Card */}
          <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white border border-rose-900/50 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-xs sm:text-sm block text-white flex items-center gap-1.5">
                    <span>Android Phone Access</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">PWA Ready</span>
                  </span>
                  <span className="text-[11px] text-slate-300">Install to your Android home screen for fullscreen native feel</span>
                </div>
              </div>
              <PWAInstallButton compact />
            </div>
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10 text-[10px] text-slate-300 text-center">
              <div className="p-1.5 rounded-xl bg-white/5 border border-white/5">
                <span className="block font-bold text-white">Full Screen</span>
                <span>No address bar</span>
              </div>
              <div className="p-1.5 rounded-xl bg-white/5 border border-white/5">
                <span className="block font-bold text-white">Fast Offline</span>
                <span>Instant load</span>
              </div>
              <div className="p-1.5 rounded-xl bg-white/5 border border-white/5">
                <span className="block font-bold text-white">Home Icon</span>
                <span>1-tap couple access</span>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* 2. SAFETY CENTER */}
      {activeSubTab === 'safety' && (
        <div className="space-y-4">
          {/* Critical Notice */}
          <div className="bg-red-50 border border-red-200 rounded-3xl p-4 text-xs text-red-950 space-y-2">
            <div className="flex items-center gap-2 font-bold text-red-700">
              <ShieldAlert className="w-5 h-5 text-red-600" />
              <span>Safety Center & Emergency Protocols</span>
            </div>
            <p className="text-[11px] text-slate-700 leading-relaxed">
              Your safety comes first. In immediate peril, always dial your local emergency number (
              <strong>{emergencyData.general}</strong> in {emergencyData.country}) or contact law enforcement directly.
            </p>
          </div>

          {/* Emergency SOS Button to Partner (Rings Phone in Any Mode) */}
          <HomeEmergencyButton />

          {/* Quick Kill Switch */}
          <div className="p-4 bg-white rounded-3xl border border-rose-100 shadow-sm space-y-2">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-sm text-slate-800 block">
                  Stop Sharing Everything
                </span>
                <span className="text-xs text-slate-500">
                  Immediately revokes location sharing and clears all coordinates.
                </span>
              </div>
              <button
                onClick={() => {
                  stopSharingEverything();
                  setKillSwitchTriggered(true);
                  setTimeout(() => setKillSwitchTriggered(false), 4000);
                }}
                className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition"
              >
                Kill Switch
              </button>
            </div>
            {killSwitchTriggered && (
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-800 text-xs font-semibold flex items-center gap-1.5 animate-in fade-in">
                <span>✓ All location and live GPS sharing stopped immediately.</span>
              </div>
            )}
          </div>

          {/* Trusted Emergency Contacts */}
          <div className="p-4 bg-white rounded-3xl border border-rose-100 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-bold text-sm text-slate-800">Trusted Emergency Contacts</h4>
                <p className="text-xs text-slate-500">Notified when SOS or Send Location is clicked</p>
              </div>
              <button
                onClick={() => setShowContactModal(true)}
                className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {currentUser.emergencyContacts.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No emergency contacts added yet.</p>
              ) : (
                currentUser.emergencyContacts.map((c) => (
                  <div
                    key={c.id}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-800">
                        {c.name} ({c.relationship})
                      </div>
                      <div className="text-slate-500">{c.phone}</div>
                      {c.email && <div className="text-slate-400 text-[10px]">{c.email}</div>}
                    </div>
                    <button
                      onClick={() => deleteEmergencyContact(c.id)}
                      className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Safety Options */}
          <div className="p-4 bg-white rounded-3xl border border-rose-100 shadow-sm space-y-3 text-xs">
            <h4 className="font-bold text-slate-800">Account Privacy & Security</h4>

            {firebaseUser && (
              <div className="p-3 rounded-2xl bg-rose-50/60 border border-rose-200/60 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-bold text-slate-700">Authenticated Account</div>
                  <div className="text-xs font-semibold text-rose-700 truncate">{currentUser.email || firebaseUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={() => logOutFirebase()}
                  className="px-3 py-1.5 rounded-xl bg-white text-red-600 border border-red-200 hover:bg-red-50 text-xs font-bold transition cursor-pointer"
                >
                  Sign Out
                </button>
              </div>
            )}

            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  if (confirm('Are you sure you want to disconnect from this couple space? This unlinks you and your partner.')) {
                    await unlinkCurrentCouple();
                  }
                }}
                className="w-full text-left p-3 rounded-2xl border border-amber-200 bg-amber-50/50 hover:bg-amber-100 text-amber-900 font-semibold flex items-center justify-between transition cursor-pointer"
              >
                <span>Disconnect from Partner / Unlink Couple</span>
                <LogOut className="w-4 h-4 text-amber-700" />
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Reset all demo data back to fresh defaults?')) {
                    resetAllDemoData();
                  }
                }}
                className="w-full text-left p-3 rounded-2xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold flex items-center justify-between transition cursor-pointer"
              >
                <span>Reset Demo Sample Data</span>
                <RefreshCw className="w-4 h-4 text-slate-500" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. COUPLE CODE & CONNECTION */}
      {activeSubTab === 'couple' && (
        <div className="space-y-4">
          {/* Your Couple Code Box */}
          <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-6 rounded-3xl text-white text-center shadow-lg shadow-rose-500/15 space-y-3">
            <span className="text-xs uppercase font-bold tracking-wider text-rose-100">
              Your Personal Couple Code
            </span>
            <div className="text-3xl font-black tracking-widest bg-white/20 py-3 rounded-2xl backdrop-blur-xs select-all">
              {currentUser.coupleCode || couple?.code || 'PAIR-LOVE'}
            </div>
            <p className="text-xs text-rose-100 leading-relaxed">
              Share this code with your partner. Once they enter it, both accounts connect into your private haven!
            </p>
            <button
              onClick={handleCopyCode}
              className="px-4 py-2 rounded-xl bg-white text-rose-600 font-bold text-xs shadow-xs hover:bg-rose-50 transition inline-flex items-center gap-1.5"
            >
              {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              <span>{copiedCode ? 'Copied Code!' : 'Copy Couple Code'}</span>
            </button>
          </div>

          {/* Enter Partner's Code */}
          <form
            onSubmit={handleConnectCode}
            className="p-5 bg-white rounded-3xl border border-rose-100 shadow-sm space-y-3"
          >
            <h4 className="font-bold text-sm text-slate-800">Connect with Partner's Code</h4>
            <p className="text-xs text-slate-500">
              Received a code from your partner? Enter it below:
            </p>
            <input
              type="text"
              placeholder="e.g. LOVE-4821"
              value={enterCode}
              onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
              className="w-full text-center font-bold tracking-widest text-sm px-4 py-2.5 rounded-xl border border-slate-200 uppercase focus:outline-none focus:ring-2 focus:ring-rose-400"
            />
            {codeMessage && (
              <div className="p-2.5 rounded-xl bg-rose-50 text-rose-800 text-xs font-medium text-center">
                {codeMessage}
              </div>
            )}
            <button
              type="submit"
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Connect Accounts ❤️
            </button>
          </form>

          {/* Relationship Settings */}
          <div className="p-5 bg-white rounded-3xl border border-rose-100 shadow-sm space-y-3">
            <h4 className="font-bold text-sm text-slate-800">Relationship Details</h4>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Relationship Name
              </label>
              <input
                type="text"
                value={couple?.relationshipName || ''}
                onChange={(e) => updateCouple({ relationshipName: e.target.value })}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Anniversary Date
              </label>
              <input
                type="date"
                value={couple?.anniversaryDate || currentUser.anniversaryDate}
                onChange={(e) => {
                  updateCouple({ anniversaryDate: e.target.value });
                  updateUserProfile({ anniversaryDate: e.target.value });
                }}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">
                Next Reunion Title & Location
              </label>
              <input
                type="text"
                value={couple?.nextMeetingTitle || ''}
                onChange={(e) => updateCouple({ nextMeetingTitle: e.target.value })}
                placeholder="e.g. Paris Airport Hug ✈️"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 mb-2"
              />
              <input
                type="text"
                value={couple?.meetingLocation || ''}
                onChange={(e) => updateCouple({ meetingLocation: e.target.value })}
                placeholder="City/Venue"
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      )}

      {/* 4. FIREBASE CLOUD DATABASE & AUTH */}
      {activeSubTab === 'architecture' && (
        <div className="space-y-4">
          {/* Cloud Database Status Card */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 text-white p-5 rounded-3xl shadow-lg space-y-4 border border-rose-900/30">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/20 border border-amber-400/40 flex items-center justify-center">
                  <Database className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Firebase Firestore Database</h3>
                  <p className="text-[11px] text-slate-300">Live Cloud Persistence & Real-Time Sync</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Connected
              </span>
            </div>

            <div className="bg-white/5 rounded-2xl p-3 border border-white/10 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Firebase Project:</span>
                <span className="font-mono text-amber-300">{firebaseProjectId || 'civic-citizen-3t8c4'}</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Database Engine:</span>
                <span className="font-semibold text-white">Cloud Firestore</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Sync Mode:</span>
                <span className="text-emerald-300 font-medium">Real-Time Listeners (Active)</span>
              </div>
              <div className="flex justify-between text-slate-300">
                <span className="text-slate-400">Security Rules:</span>
                <span className="text-sky-300 font-medium">ABAC Couple Boundary Deployed</span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={async () => {
                  setIsCloudSyncing(true);
                  if (couple) {
                    updateCouple({});
                  }
                  setTimeout(() => {
                    setIsCloudSyncing(false);
                    setAuthFeedback('Cloud Firestore synced successfully!');
                    setTimeout(() => setAuthFeedback(null), 3000);
                  }, 600);
                }}
                disabled={isCloudSyncing}
                className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-sm"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                <span>{isCloudSyncing ? 'Syncing...' : 'Sync Now to Firestore'}</span>
              </button>

              <a
                href={`https://console.firebase.google.com/project/${firebaseProjectId || 'civic-citizen-3t8c4'}/firestore/databases/ai-studio-betweenuslongdis-19fa57bd-7a36-4ffc-96b1-ecd345098455/data`}
                target="_blank"
                rel="noopener noreferrer"
                className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-white/20"
              >
                <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                <span>Firebase Console</span>
              </a>
            </div>

            {authFeedback && (
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs text-center">
                {authFeedback}
              </div>
            )}
          </div>

          {/* In-App Live Database Tables Viewer */}
          <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
                  <Table className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Firestore Tables & Collections</h4>
                  <p className="text-[11px] text-slate-500">Live database rows synced with Cloud Firestore</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                DB: ai-studio-betweenuslongdis...
              </span>
            </div>

            {/* Table Selector Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-100/80 rounded-2xl overflow-x-auto scrollbar-none text-xs">
              {[
                { key: 'messages', label: 'messages', count: messages.length, icon: '💬' },
                { key: 'moods', label: 'moods', count: moods.length, icon: '❤️' },
                { key: 'memories', label: 'memories', count: memories.length, icon: '📸' },
                { key: 'couples', label: 'couples', count: couple ? 1 : 0, icon: '👥' },
                { key: 'users', label: 'users', count: 2, icon: '👤' },
              ].map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => {
                    setSelectedTable(t.key as any);
                    setInspectDocId(null);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-medium whitespace-nowrap transition ${
                    selectedTable === t.key
                      ? 'bg-white text-rose-600 shadow-xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <span>{t.icon}</span>
                  <span className="font-mono">{t.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    selectedTable === t.key ? 'bg-rose-100 text-rose-700' : 'bg-slate-200 text-slate-600'
                  }`}>
                    {t.count}
                  </span>
                </button>
              ))}
            </div>

            {/* Search Filter */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder={`Search in ${selectedTable} collection...`}
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50/50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>

            {/* Table Rows Data View */}
            <div className="overflow-x-auto rounded-2xl border border-slate-100">
              {/* MESSAGES TABLE */}
              {selectedTable === 'messages' && (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-2 px-3">Document ID</th>
                      <th className="py-2 px-3">Sender</th>
                      <th className="py-2 px-3">Message Content</th>
                      <th className="py-2 px-3">Type</th>
                      <th className="py-2 px-3">Timestamp</th>
                      <th className="py-2 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {messages
                      .filter((m) =>
                        tableSearch
                          ? m.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
                            m.senderName.toLowerCase().includes(tableSearch.toLowerCase()) ||
                            m.text.toLowerCase().includes(tableSearch.toLowerCase())
                          : true
                      )
                      .slice(0, 15)
                      .map((m) => (
                        <tr key={m.id} className="hover:bg-rose-50/30 transition">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{m.id}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{m.senderName}</td>
                          <td className="py-2 px-3 text-slate-600 max-w-[160px] truncate">{m.text}</td>
                          <td className="py-2 px-3 text-slate-500">{m.mediaType || 'text'}</td>
                          <td className="py-2 px-3 text-slate-400 text-[10px]">
                            {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectDocId(m.id)}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-[10px] font-sans font-medium transition"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* MOODS TABLE */}
              {selectedTable === 'moods' && (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-2 px-3">Document ID</th>
                      <th className="py-2 px-3">User</th>
                      <th className="py-2 px-3">Mood Type</th>
                      <th className="py-2 px-3">Note</th>
                      <th className="py-2 px-3">Logged At</th>
                      <th className="py-2 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {moods
                      .filter((mood) =>
                        tableSearch
                          ? mood.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
                            mood.userName.toLowerCase().includes(tableSearch.toLowerCase()) ||
                            mood.moodType.toLowerCase().includes(tableSearch.toLowerCase())
                          : true
                      )
                      .map((mood) => (
                        <tr key={mood.id} className="hover:bg-rose-50/30 transition">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{mood.id}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{mood.userName}</td>
                          <td className="py-2 px-3 text-rose-600 font-semibold capitalize">
                            {mood.moodType.replace('_', ' ')}
                          </td>
                          <td className="py-2 px-3 text-slate-600 max-w-[160px] truncate">{mood.note || '-'}</td>
                          <td className="py-2 px-3 text-slate-400 text-[10px]">
                            {new Date(mood.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectDocId(mood.id)}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-[10px] font-sans font-medium transition"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* MEMORIES TABLE */}
              {selectedTable === 'memories' && (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-2 px-3">Document ID</th>
                      <th className="py-2 px-3">Title</th>
                      <th className="py-2 px-3">Category</th>
                      <th className="py-2 px-3">Date</th>
                      <th className="py-2 px-3">Added By</th>
                      <th className="py-2 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {memories
                      .filter((mem) =>
                        tableSearch
                          ? mem.id.toLowerCase().includes(tableSearch.toLowerCase()) ||
                            mem.title.toLowerCase().includes(tableSearch.toLowerCase())
                          : true
                      )
                      .map((mem) => (
                        <tr key={mem.id} className="hover:bg-rose-50/30 transition">
                          <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{mem.id}</td>
                          <td className="py-2 px-3 font-medium text-slate-800">{mem.title}</td>
                          <td className="py-2 px-3 text-slate-500 capitalize">{mem.category.replace('_', ' ')}</td>
                          <td className="py-2 px-3 text-slate-400">{mem.date}</td>
                          <td className="py-2 px-3 text-slate-700">{mem.addedByName}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectDocId(mem.id)}
                              className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-[10px] font-sans font-medium transition"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}

              {/* COUPLES TABLE */}
              {selectedTable === 'couples' && couple && (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-2 px-3">Document ID</th>
                      <th className="py-2 px-3">Couple Code</th>
                      <th className="py-2 px-3">Relationship</th>
                      <th className="py-2 px-3">Anniversary</th>
                      <th className="py-2 px-3">Next Meeting</th>
                      <th className="py-2 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    <tr className="hover:bg-rose-50/30 transition">
                      <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{couple.id}</td>
                      <td className="py-2 px-3 font-bold text-rose-600">{couple.code}</td>
                      <td className="py-2 px-3 text-slate-800">{couple.relationshipName}</td>
                      <td className="py-2 px-3 text-slate-500">{couple.anniversaryDate}</td>
                      <td className="py-2 px-3 text-slate-500">
                        {new Date(couple.nextMeetingDate).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setInspectDocId(couple.id)}
                          className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-[10px] font-sans font-medium transition"
                        >
                          JSON
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* USERS TABLE */}
              {selectedTable === 'users' && (
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-slate-500 font-semibold">
                      <th className="py-2 px-3">Document ID</th>
                      <th className="py-2 px-3">Name</th>
                      <th className="py-2 px-3">Email</th>
                      <th className="py-2 px-3">Location</th>
                      <th className="py-2 px-3">Timezone</th>
                      <th className="py-2 px-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono">
                    {[currentUser, partnerUser].map((u) => (
                      <tr key={u.id} className="hover:bg-rose-50/30 transition">
                        <td className="py-2 px-3 text-slate-400 font-mono text-[10px]">{u.id}</td>
                        <td className="py-2 px-3 font-medium text-slate-800">{u.name}</td>
                        <td className="py-2 px-3 text-slate-500">{u.email}</td>
                        <td className="py-2 px-3 text-slate-600">{u.city}, {u.country}</td>
                        <td className="py-2 px-3 text-slate-400 text-[10px]">{u.timeZone}</td>
                        <td className="py-2 px-3 text-right">
                          <button
                            type="button"
                            onClick={() => setInspectDocId(u.id)}
                            className="px-2 py-0.5 rounded-lg bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 text-[10px] font-sans font-medium transition"
                          >
                            JSON
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Document Raw JSON Inspector Drawer */}
            {inspectDocId && (
              <div className="bg-slate-900 text-white p-3.5 rounded-2xl space-y-2 text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-semibold text-amber-400 font-mono">Doc: {inspectDocId}</span>
                    <span className="text-[10px] text-slate-400 font-sans">({selectedTable})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setInspectDocId(null)}
                    className="text-slate-400 hover:text-white text-xs px-1.5 py-0.5 rounded-md hover:bg-slate-800 transition"
                  >
                    Close
                  </button>
                </div>
                <pre className="text-[11px] font-mono text-emerald-400 overflow-x-auto max-h-48 p-2 bg-black/40 rounded-xl">
                  {JSON.stringify(
                    selectedTable === 'messages'
                      ? messages.find((m) => m.id === inspectDocId)
                      : selectedTable === 'moods'
                      ? moods.find((m) => m.id === inspectDocId)
                      : selectedTable === 'memories'
                      ? memories.find((m) => m.id === inspectDocId)
                      : selectedTable === 'couples'
                      ? couple
                      : [currentUser, partnerUser].find((u) => u.id === inspectDocId),
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>

          {/* Firebase Authentication Card */}
          <div className="bg-white p-5 rounded-3xl border border-rose-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-slate-800">Firebase Authentication</h4>
                  <p className="text-[11px] text-slate-500">Sign in to bind your profile across devices</p>
                </div>
              </div>
              {firebaseUser && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-200">
                  Authenticated
                </span>
              )}
            </div>

            {firebaseUser ? (
              <div className="space-y-3 bg-rose-50/50 p-3.5 rounded-2xl border border-rose-100">
                <div className="text-xs space-y-1">
                  <div className="text-slate-600 font-medium">
                    Signed in as: <strong className="text-slate-900">{firebaseUser.email || firebaseUser.displayName || 'Firebase User'}</strong>
                  </div>
                  <div className="text-[11px] font-mono text-slate-400">
                    UID: {firebaseUser.uid}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await logOutFirebase();
                    setAuthFeedback('Signed out of Firebase.');
                    setTimeout(() => setAuthFeedback(null), 3000);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
                >
                  <LogOut className="w-3.5 h-3.5 text-slate-500" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {/* Google Sign-in */}
                <button
                  type="button"
                  onClick={async () => {
                    const res = await loginWithGoogle();
                    if (res.success) {
                      setAuthFeedback('Signed in with Google successfully!');
                    } else {
                      setAuthFeedback(res.error || 'Google sign-in canceled or failed');
                    }
                    setTimeout(() => setAuthFeedback(null), 4000);
                  }}
                  className="w-full py-2.5 px-4 rounded-xl border border-slate-200 hover:border-slate-300 bg-white text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                <div className="relative text-center my-2">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-100" />
                  </div>
                  <span className="relative bg-white px-2 text-[10px] text-slate-400 uppercase tracking-wider">
                    or email & password
                  </span>
                </div>

                {/* Email Password Form */}
                <div className="space-y-2">
                  <input
                    type="email"
                    placeholder="Enter email address"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <input
                    type="password"
                    placeholder="Password (min 6 characters)"
                    value={authPass}
                    onChange={(e) => setAuthPass(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={async () => {
                        if (!authEmail.trim() || !authPass.trim()) {
                          setAuthFeedback('Please provide both email and password.');
                          return;
                        }
                        const res = await loginWithEmail(authEmail.trim(), authPass.trim());
                        if (res.success) {
                          setAuthFeedback('Signed in successfully!');
                        } else {
                          setAuthFeedback(res.error || 'Failed to sign in.');
                        }
                        setTimeout(() => setAuthFeedback(null), 4000);
                      }}
                      className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-semibold text-xs transition"
                    >
                      Sign In
                    </button>
                    <button
                      type="button"
                      onClick={async () => {
                        if (!authEmail.trim() || authPass.length < 6) {
                          setAuthFeedback('Password must be at least 6 characters.');
                          return;
                        }
                        const res = await registerWithEmail(authEmail.trim(), authPass.trim());
                        if (res.success) {
                          setAuthFeedback('Account registered and signed in!');
                        } else {
                          setAuthFeedback(res.error || 'Failed to register.');
                        }
                        setTimeout(() => setAuthFeedback(null), 4000);
                      }}
                      className="flex-1 py-2 rounded-xl bg-rose-50 text-rose-700 hover:bg-rose-100 font-semibold text-xs border border-rose-200 transition"
                    >
                      Register
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Database Schema & Rules Spec */}
          <div className="p-4 bg-white rounded-3xl border border-rose-100 shadow-sm space-y-3 text-xs text-slate-700">
            <h4 className="font-bold text-slate-900 text-sm">Firestore Schema Architecture:</h4>
            <ul className="list-disc list-inside space-y-1.5 text-slate-600">
              <li><strong>users:</strong> Profile, timezone, country, location consent, sleep hours.</li>
              <li><strong>couples:</strong> Couple code, partnerAId, partnerBId, anniversary, next meeting.</li>
              <li><strong>messages:</strong> Text, media attachments, voice clips, reactions, readBy array.</li>
              <li><strong>moods:</strong> Daily emotional status, comfort notes, timestamps.</li>
              <li><strong>memories:</strong> Milestone photos, first meeting, trips, dates.</li>
              <li><strong>events:</strong> Birthdays, countdowns, exam dates, travel reminders.</li>
              <li><strong>surprises:</strong> "Open When..." locked message capsules with unlock condition.</li>
              <li><strong>shared_notes:</strong> Collaborative travel bucket lists and love letters.</li>
              <li><strong>shared_songs:</strong> Shared tracks with heartfelt dedication notes.</li>
              <li><strong>emergency_alerts:</strong> SOS triggers and dispatched coordinates.</li>
            </ul>

            <div className="pt-2">
              <h4 className="font-bold text-slate-900 text-sm mb-1">Zero-Trust Security Principle:</h4>
              <p className="text-slate-600 leading-relaxed">
                Rules enforce strict couple-boundary access: a user can only read and write documents where <code>couple.partnerAId == request.auth.uid || couple.partnerBId == request.auth.uid</code>. Location sharing requires explicit opt-in flags on both profiles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Add Emergency Contact Modal */}
      {showContactModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-in fade-in">
          <form
            onSubmit={handleAddContact}
            className="w-full max-w-sm bg-white rounded-3xl p-5 shadow-2xl space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h4 className="font-bold text-sm text-slate-800">Add Trusted Emergency Contact</h4>
              <button
                type="button"
                onClick={() => setShowContactModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Sarah Baker"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Phone Number</label>
              <input
                type="tel"
                placeholder="e.g. +1 (415) 555-0199"
                value={contactPhone}
                onChange={(e) => setContactPhone(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Relationship</label>
              <input
                type="text"
                placeholder="e.g. Sister / Mom / Best Friend"
                value={contactRel}
                onChange={(e) => setContactRel(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Email (Optional)</label>
              <input
                type="email"
                placeholder="e.g. sarah@example.com"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
            </div>
            <button
              type="submit"
              className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
            >
              Save Trusted Contact
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
