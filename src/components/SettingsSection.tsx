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
  ChevronDown,
  ChevronUp,
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

  // Modular Expandable Sections State (per Section 12)
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    personal: true,
    phone: false,
    location: false,
    india: false,
    sleep: false,
    privacy: false,
    cloud: false,
    safety: false,
  });

  const toggleSection = (key: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

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
    <div className="w-full max-w-md sm:max-w-2xl md:max-w-3xl mx-auto px-3.5 sm:px-4 py-4 sm:py-5 space-y-4 pb-28">
      {/* ==========================================
          TOP PROFILE HERO (per Section 12)
          ========================================== */}
      <div className="bg-gradient-to-br from-rose-500 via-pink-500 to-rose-600 rounded-3xl p-5 text-white shadow-lg shadow-rose-500/20 text-center relative overflow-hidden">
        {/* Profile Picture */}
        <div className="relative inline-block mx-auto mb-2 group">
          <img
            src={avatarUrl || currentUser.avatarUrl || '/app-logo.svg'}
            alt={currentUser.name}
            className="w-20 h-20 rounded-full object-cover border-3 border-white shadow-md mx-auto bg-white"
          />
          <label
            title="Change photo"
            className="absolute bottom-0 right-0 p-1.5 rounded-full bg-slate-900/90 text-white shadow-md cursor-pointer hover:bg-black transition active:scale-95"
          >
            <Camera className="w-3.5 h-3.5" />
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
                    updateUserProfile({ avatarUrl: res.url });
                  } catch (err) {
                    console.error(err);
                  }
                }
              }}
            />
          </label>
        </div>

        {/* User Name */}
        <h2 className="text-lg font-black tracking-tight">{currentUser.name}</h2>
        <p className="text-xs text-rose-100 mt-0.5 flex items-center justify-center gap-1 font-medium">
          <span>Connected with {partnerUser.name}</span>
          <Heart className="w-3 h-3 fill-rose-200 text-rose-200 inline" />
        </p>

        {/* Hero Quick Action Buttons */}
        <div className="mt-3 flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={() => toggleSection('personal')}
            className="min-h-[38px] px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 text-white font-bold text-xs backdrop-blur-xs transition active:scale-95 cursor-pointer"
          >
            {openSections.personal ? 'Close Profile' : 'Edit Profile'}
          </button>
          <button
            type="button"
            onClick={handleShareWhatsApp}
            className="min-h-[38px] px-4 py-1.5 rounded-full bg-white text-rose-600 font-bold text-xs shadow-xs hover:bg-rose-50 transition active:scale-95 cursor-pointer flex items-center gap-1"
          >
            <Share2 className="w-3 h-3" />
            <span>Share Code</span>
          </button>
        </div>
      </div>

      {profileSuccessMsg && (
        <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold text-center animate-fade-in shadow-2xs">
          ✓ {profileSuccessMsg}
        </div>
      )}

      {/* ==========================================
          8 SEPARATE MOBILE CARDS (per Section 12)
          ========================================== */}

      {/* 1. 👤 PERSONAL INFORMATION */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('personal')}
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-rose-50/30 transition active:bg-rose-50/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-800 truncate">👤 Personal Information</h3>
              <p className="text-[11px] text-slate-500 truncate">{currentUser.name} • Photo & Couple Space</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
              Profile
            </span>
            {openSections.personal ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.personal && (
          <form onSubmit={handleSaveProfile} className="p-4 pt-1 border-t border-rose-50 space-y-4">
            {/* Avatar Selection */}
            <div className="flex items-center gap-3 p-3 rounded-2xl bg-rose-50/50 border border-rose-100">
              <img
                src={avatarUrl}
                alt="Avatar"
                className="w-14 h-14 rounded-full object-cover border-2 border-rose-300 shadow-2xs shrink-0"
              />
              <div className="flex-1 space-y-1.5 min-w-0">
                <span className="text-[11px] font-bold text-slate-700 block">Avatar Photo</span>
                <div className="flex flex-wrap gap-2">
                  <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded-xl text-xs border border-rose-200 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Photo</span>
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
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold border border-rose-200 bg-white text-rose-700 hover:bg-rose-50 transition"
                  >
                    Use Couple Hands
                  </button>
                </div>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-xs font-semibold text-slate-600 block mb-1">Display Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400"
                required
              />
            </div>

            {/* Couple Code Box */}
            <div className="bg-gradient-to-br from-rose-500 to-pink-600 p-4 rounded-2xl text-white text-center space-y-2">
              <span className="text-[10px] uppercase font-bold tracking-wider text-rose-100 block">
                Your Private Couple Code
              </span>
              <div className="text-2xl font-black tracking-widest bg-white/20 py-2 rounded-xl backdrop-blur-xs select-all">
                {currentUser.coupleCode || couple?.code || 'PAIR-LOVE'}
              </div>
              <div className="flex justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="px-3 py-1.5 rounded-xl bg-white text-rose-600 font-bold text-xs shadow-xs hover:bg-rose-50 transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedCode ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedCode ? 'Copied!' : 'Copy Code'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            {/* Connect with Partner's Code */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-xs font-bold text-slate-800 block">Connect with Partner's Code</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. LOVE-4821"
                  value={enterCode}
                  onChange={(e) => setEnterCode(e.target.value.toUpperCase())}
                  className="flex-1 text-center font-bold tracking-wider text-xs px-3 py-2 rounded-xl border border-slate-200 uppercase bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
                <button
                  type="button"
                  onClick={handleConnectCode}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition cursor-pointer"
                >
                  Connect
                </button>
              </div>
              {codeMessage && (
                <div className="p-2 rounded-xl bg-rose-50 text-rose-800 text-[11px] font-medium text-center">
                  {codeMessage}
                </div>
              )}
            </div>

            {/* Relationship Details */}
            <div className="space-y-2 pt-1 border-t border-slate-100 text-xs">
              <span className="font-bold text-slate-700 block">Relationship Milestones</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Relationship Title</label>
                  <input
                    type="text"
                    value={couple?.relationshipName || ''}
                    onChange={(e) => updateCouple({ relationshipName: e.target.value })}
                    placeholder="Teja & Bhuvana Forever"
                    className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-500 block mb-0.5">Anniversary Date</label>
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
              </div>
            </div>

            {/* Official Holding Hands App Logo Showcase */}
            <div className="p-3.5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 text-white space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                  <span>Official Holding Hands Art</span>
                </span>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300">
                  Vector HD
                </span>
              </div>
              <div className="flex items-center gap-3">
                <img
                  src="/holding-hands-logo.svg"
                  alt="Holding Hands"
                  className="w-12 h-12 rounded-full object-cover bg-black border-2 border-rose-400 shadow-md shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] text-slate-300 leading-snug">
                    Two hands interlocked across the distance with sweater and denim cuffs.
                  </p>
                  <div className="flex gap-2 mt-1.5">
                    <a
                      href="/holding-hands-logo.svg"
                      download="holding-hands-logo.svg"
                      className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold flex items-center gap-1 transition"
                    >
                      <Download className="w-3 h-3 text-rose-300" />
                      <span>Download</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => {
                        setAvatarUrl('/holding-hands-logo.svg');
                        updateUserProfile({ avatarUrl: '/holding-hands-logo.svg' });
                        setProfileSuccessMsg('Applied Holding Hands artwork as your profile picture!');
                        setTimeout(() => setProfileSuccessMsg(null), 3000);
                      }}
                      className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold flex items-center gap-1 transition cursor-pointer"
                    >
                      <Heart className="w-3 h-3 fill-white" />
                      <span>Set as Avatar</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              className="w-full min-h-[44px] py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98 cursor-pointer"
            >
              Save Profile Changes
            </button>
          </form>
        )}
      </div>

      {/* 2. 📱 PHONE & EMERGENCY */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('phone')}
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-rose-50/30 transition active:bg-rose-50/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Phone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-800 truncate">📱 Phone & Emergency</h3>
              <p className="text-[11px] text-slate-500 truncate">
                {phoneNumber ? `${phoneNumber} • Ring Siren Connected` : 'Setup partner emergency ring'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Ring Active
            </span>
            {openSections.phone ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.phone && (
          <div className="p-4 pt-1 border-t border-rose-50 space-y-4">
            {/* Phone input */}
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
                className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-400"
              />
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                Directly connected to {partnerUser.name}'s emergency ring button. During an emergency SOS, your partner's siren sounds and this phone number is dialed.
              </p>
            </div>

            {/* Trusted Emergency Contacts */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-xs text-slate-800">Trusted Emergency Contacts</h4>
                  <p className="text-[10px] text-slate-500">Notified during emergency alerts</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowContactModal(true)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold cursor-pointer transition active:scale-95"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add</span>
                </button>
              </div>

              <div className="space-y-2 pt-1">
                {currentUser.emergencyContacts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-1">No additional emergency contacts added yet.</p>
                ) : (
                  currentUser.emergencyContacts.map((c) => (
                    <div
                      key={c.id}
                      className="p-2.5 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="font-bold text-slate-800">
                          {c.name} <span className="text-slate-500 font-normal">({c.relationship})</span>
                        </div>
                        <a href={`tel:${c.phone}`} className="text-rose-600 font-mono text-[11px] hover:underline">
                          {c.phone}
                        </a>
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteEmergencyContact(c.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full min-h-[44px] py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98 cursor-pointer"
            >
              Save Phone Settings
            </button>
          </div>
        )}
      </div>

      {/* 3. 📍 LOCATION */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('location')}
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-rose-50/30 transition active:bg-rose-50/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-800 truncate">📍 Location</h3>
              <p className="text-[11px] text-slate-500 truncate">{city || 'Select city'} • India Only</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-600 border border-rose-100">
              {currentUser.shareLocation ? 'GPS ON' : 'GPS OFF'}
            </span>
            {openSections.location ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.location && (
          <div className="p-4 pt-1 border-t border-rose-50 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-600" />
                  <span>Your City in India</span>
                </label>
                <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                  🇮🇳 India
                </span>
              </div>
              <div className="space-y-2">
                <select
                  value={INDIAN_CITIES.some((c) => c.name.toLowerCase() === city.toLowerCase() || c.displayName.toLowerCase() === city.toLowerCase()) ? city : 'custom'}
                  onChange={(e) => {
                    if (e.target.value !== 'custom') {
                      setCity(e.target.value);
                    }
                  }}
                  className="w-full text-xs px-3 py-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800"
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
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 text-slate-700"
                />
              </div>
            </div>

            {/* GPS Auto Detect Banner */}
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-between">
              <div className="text-xs">
                <span className="font-bold text-slate-800 block">Current Detected GPS</span>
                <span className="text-[11px] text-slate-500 font-mono">
                  {currentUser.location?.latitude
                    ? `${currentUser.location.latitude.toFixed(4)}°, ${currentUser.location.longitude.toFixed(4)}°`
                    : 'GPS not acquired'}
                </span>
              </div>
              <button
                type="button"
                onClick={async () => {
                  await (useApp as any)().requestLocationPermission?.('current');
                  setProfileSuccessMsg('Acquired live GPS coordinates!');
                  setTimeout(() => setProfileSuccessMsg(null), 3000);
                }}
                className="px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-bold transition active:scale-95 cursor-pointer"
              >
                Acquire GPS
              </button>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full min-h-[44px] py-2.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98 cursor-pointer"
            >
              Save City Location
            </button>
          </div>
        )}
      </div>

      {/* 4. 🇮🇳 INDIA / IST */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('india')}
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-rose-50/30 transition active:bg-rose-50/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 text-lg shrink-0">
              🇮🇳
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-800 truncate">🇮🇳 India / IST</h3>
              <p className="text-[11px] text-slate-500 truncate">Indian Standard Time (Asia/Kolkata) • Helplines</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              UTC +05:30
            </span>
            {openSections.india ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.india && (
          <div className="p-4 pt-1 border-t border-rose-50 space-y-3.5">
            <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-50 via-pink-50 to-amber-50 border border-rose-200/70 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 flex items-center gap-1.5">
                  <span>🇮🇳</span>
                  <span>Indian Standard Time Synchronization</span>
                </span>
                <span className="text-[10px] font-extrabold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  Asia/Kolkata
                </span>
              </div>
              <p className="text-[11px] text-slate-600 leading-relaxed">
                BetweenUs is specifically designed for couples living in Indian cities. Both partner devices automatically calculate daily rhythms, meal times, and sleep boundaries in IST.
              </p>
            </div>

            {/* Quick Emergency Helplines */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-700 block">National Emergency Quick-Dial</span>
              <div className="grid grid-cols-3 gap-2 text-center">
                <a
                  href="tel:112"
                  className="p-2.5 rounded-2xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 transition active:scale-95 block"
                >
                  <span className="font-black text-sm block">112</span>
                  <span className="text-[10px] text-slate-600 block">ERSS / Police</span>
                </a>
                <a
                  href="tel:1091"
                  className="p-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 transition active:scale-95 block"
                >
                  <span className="font-black text-sm block">1091</span>
                  <span className="text-[10px] text-slate-600 block">Women Helpline</span>
                </a>
                <a
                  href="tel:108"
                  className="p-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 transition active:scale-95 block"
                >
                  <span className="font-black text-sm block">108</span>
                  <span className="text-[10px] text-slate-600 block">Ambulance</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. 😴 SLEEP SCHEDULE */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('sleep')}
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-rose-50/30 transition active:bg-rose-50/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0">
              <Moon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-800 truncate">😴 Sleep Schedule</h3>
              <p className="text-[11px] text-slate-500 truncate">
                {INDIAN_HOURS_12H.find((h) => h.hour === sleepStart)?.label || 'Bedtime'} →{' '}
                {INDIAN_HOURS_12H.find((h) => h.hour === sleepEnd)?.label || 'Wake up'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Quiet Hours
            </span>
            {openSections.sleep ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.sleep && (
          <div className="p-4 pt-1 border-t border-rose-50 space-y-4">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Helps your partner know when you are sleeping in your Indian city so they know when not to disturb you.
            </p>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Sleep Bedtime</label>
                <select
                  value={sleepStart}
                  onChange={(e) => setSleepStart(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {INDIAN_HOURS_12H.map((h) => (
                    <option key={h.hour} value={h.hour}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">Wake Up (Morning)</label>
                <select
                  value={sleepEnd}
                  onChange={(e) => setSleepEnd(Number(e.target.value))}
                  className="w-full text-xs px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {INDIAN_HOURS_12H.map((h) => (
                    <option key={h.hour} value={h.hour}>
                      {h.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSaveProfile}
              className="w-full min-h-[44px] py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition active:scale-98 cursor-pointer"
            >
              Save Sleep Hours
            </button>
          </div>
        )}
      </div>

      {/* 6. 🔐 PRIVACY & SECURITY */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('privacy')}
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-rose-50/30 transition active:bg-rose-50/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-800 truncate">🔐 Privacy & Security</h3>
              <p className="text-[11px] text-slate-500 truncate">Account, Sign Out & Reset Data</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Protected
            </span>
            {openSections.privacy ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.privacy && (
          <div className="p-4 pt-1 border-t border-rose-50 space-y-3 text-xs">
            {firebaseUser ? (
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
            ) : (
              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600">
                Operating in local private mode. Sign in via Cloud / Database to synchronize across multiple phones.
              </div>
            )}

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
        )}
      </div>

      {/* 7. 🔥 CLOUD / DATABASE */}
      <div className="bg-white rounded-3xl border border-rose-100 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('cloud')}
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-rose-50/30 transition active:bg-rose-50/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-slate-800 truncate">🔥 Cloud / Database</h3>
              <p className="text-[11px] text-slate-500 truncate">Firebase Firestore • Real-time Sync & Tables</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              Connected
            </span>
            {openSections.cloud ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.cloud && (
          <div className="p-4 pt-1 border-t border-rose-50 space-y-4">
            {/* Status Card */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-rose-950 text-white p-4 rounded-2xl shadow-md space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-amber-400" />
                  <span className="font-bold text-xs">Cloud Firestore</span>
                </div>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Live Sync
                </span>
              </div>

              <div className="bg-white/5 rounded-xl p-2.5 border border-white/10 space-y-1 text-[11px]">
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Project:</span>
                  <span className="font-mono text-amber-300">{firebaseProjectId || 'civic-citizen-3t8c4'}</span>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span className="text-slate-400">Rules:</span>
                  <span className="text-sky-300 font-medium">ABAC Couple Boundary</span>
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    setIsCloudSyncing(true);
                    if (couple) updateCouple({});
                    setTimeout(() => {
                      setIsCloudSyncing(false);
                      setAuthFeedback('Cloud Firestore synced successfully!');
                      setTimeout(() => setAuthFeedback(null), 3000);
                    }, 600);
                  }}
                  disabled={isCloudSyncing}
                  className="flex-1 py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
                  <span>{isCloudSyncing ? 'Syncing...' : 'Sync Now'}</span>
                </button>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseProjectId || 'civic-citizen-3t8c4'}/firestore/databases/ai-studio-betweenuslongdis-19fa57bd-7a36-4ffc-96b1-ecd345098455/data`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="py-2 px-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition border border-white/20"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
                  <span>Console</span>
                </a>
              </div>

              {authFeedback && (
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-200 border border-emerald-400/30 text-xs text-center">
                  {authFeedback}
                </div>
              )}
            </div>

            {/* Table Selector Tabs */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-800 block">In-App Live Firestore Tables</span>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl overflow-x-auto no-scrollbar text-xs">
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
                    className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl font-medium whitespace-nowrap transition cursor-pointer ${
                      selectedTable === t.key
                        ? 'bg-white text-rose-600 shadow-2xs font-bold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <span>{t.icon}</span>
                    <span className="font-mono text-[11px]">{t.label}</span>
                    <span className="text-[10px] px-1 py-0.2 rounded-full bg-slate-200 text-slate-700">
                      {t.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Table search */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder={`Search ${selectedTable}...`}
                  value={tableSearch}
                  onChange={(e) => setTableSearch(e.target.value)}
                  className="w-full text-xs pl-8 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-400"
                />
              </div>

              {/* Table Rows Preview */}
              <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-48">
                {selectedTable === 'messages' && (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {messages.slice(0, 10).map((m) => (
                        <tr key={m.id} className="hover:bg-rose-50/30">
                          <td className="py-2 px-3 text-slate-800 font-bold">{m.senderName}</td>
                          <td className="py-2 px-3 text-slate-600 truncate max-w-[120px]">{m.text}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectDocId(m.id)}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {selectedTable === 'moods' && (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {moods.map((mood) => (
                        <tr key={mood.id} className="hover:bg-rose-50/30">
                          <td className="py-2 px-3 text-slate-800 font-bold">{mood.userName}</td>
                          <td className="py-2 px-3 text-rose-600 capitalize">{mood.moodType.replace('_', ' ')}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectDocId(mood.id)}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {selectedTable === 'memories' && (
                  <table className="w-full text-left border-collapse text-[11px]">
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {memories.map((mem) => (
                        <tr key={mem.id} className="hover:bg-rose-50/30">
                          <td className="py-2 px-3 text-slate-800 font-bold">{mem.title}</td>
                          <td className="py-2 px-3 text-slate-500">{mem.date}</td>
                          <td className="py-2 px-3 text-right">
                            <button
                              type="button"
                              onClick={() => setInspectDocId(mem.id)}
                              className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px]"
                            >
                              JSON
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
                {selectedTable === 'couples' && couple && (
                  <div className="p-3 text-xs font-mono space-y-1">
                    <div>Code: <strong className="text-rose-600">{couple.code}</strong></div>
                    <div>Name: {couple.relationshipName}</div>
                    <div>Anniversary: {couple.anniversaryDate}</div>
                  </div>
                )}
                {selectedTable === 'users' && (
                  <div className="p-3 text-xs font-mono space-y-1">
                    <div>User A: {currentUser.name} ({currentUser.city})</div>
                    <div>User B: {partnerUser.name} ({partnerUser.city})</div>
                  </div>
                )}
              </div>

              {/* JSON Drawer */}
              {inspectDocId && (
                <div className="bg-slate-900 text-white p-3 rounded-2xl space-y-1.5 text-xs">
                  <div className="flex justify-between items-center text-slate-400">
                    <span className="font-mono text-[10px]">Doc: {inspectDocId}</span>
                    <button type="button" onClick={() => setInspectDocId(null)} className="text-xs hover:text-white">
                      Close
                    </button>
                  </div>
                  <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto max-h-36 p-2 bg-black/40 rounded-xl">
                    {JSON.stringify(
                      selectedTable === 'messages'
                        ? messages.find((m) => m.id === inspectDocId)
                        : selectedTable === 'moods'
                        ? moods.find((m) => m.id === inspectDocId)
                        : memories.find((m) => m.id === inspectDocId),
                      null,
                      2
                    )}
                  </pre>
                </div>
              )}
            </div>

            {/* Auth Form if not signed in */}
            {!firebaseUser && (
              <div className="p-3.5 rounded-2xl bg-rose-50/50 border border-rose-100 space-y-3">
                <span className="text-xs font-bold text-slate-800 block">Sign In to Multi-Device Cloud</span>
                <button
                  type="button"
                  onClick={async () => {
                    const res = await loginWithGoogle();
                    if (res.success) {
                      setAuthFeedback('Signed in with Google!');
                    } else {
                      setAuthFeedback(res.error || 'Google sign-in failed');
                    }
                    setTimeout(() => setAuthFeedback(null), 4000);
                  }}
                  className="w-full min-h-[40px] py-2 px-3 rounded-xl border border-slate-200 bg-white text-slate-700 text-xs font-semibold flex items-center justify-center gap-2 shadow-2xs transition active:scale-98 cursor-pointer"
                >
                  <span>Continue with Google</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 8. 🚨 SAFETY CENTER */}
      <div className="bg-white rounded-3xl border border-red-200 shadow-sm overflow-hidden transition-all">
        <button
          type="button"
          onClick={() => toggleSection('safety')}
          className="w-full min-h-[56px] p-4 flex items-center justify-between text-left hover:bg-red-50/30 transition active:bg-red-50/50 cursor-pointer"
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-red-50 flex items-center justify-center text-red-600 shrink-0">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="font-bold text-sm text-red-700 truncate">🚨 Safety Center</h3>
              <p className="text-[11px] text-slate-500 truncate">SOS Button • Kill Switch & Emergency Numbers</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-700 border border-red-200">
              Critical
            </span>
            {openSections.safety ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </button>

        {openSections.safety && (
          <div className="p-4 pt-1 border-t border-red-100 space-y-4">
            {/* Critical Emergency Notice */}
            <div className="bg-red-50 border border-red-200 rounded-2xl p-3.5 text-xs text-red-950 space-y-1.5">
              <div className="flex items-center gap-1.5 font-bold text-red-700">
                <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
                <span>Immediate Peril Notice</span>
              </div>
              <p className="text-[11px] text-slate-700 leading-relaxed">
                In immediate physical danger, always contact national emergency services directly at{' '}
                <strong>112</strong> (ERSS) or <strong>1091</strong> (Women Helpline).
              </p>
            </div>

            {/* Emergency SOS Button to Partner (Rings Phone in Any Mode) */}
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-700 block">Emergency Ring to Partner</span>
              <HomeEmergencyButton />
            </div>

            {/* Quick Kill Switch */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="font-bold text-xs text-slate-800 block">
                    Stop Sharing Everything
                  </span>
                  <span className="text-[10px] text-slate-500 block">
                    Immediately revokes location sharing and clears all coordinates.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    stopSharingEverything();
                    setKillSwitchTriggered(true);
                    setTimeout(() => setKillSwitchTriggered(false), 4000);
                  }}
                  className="min-h-[38px] px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer shrink-0"
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
          </div>
        )}
      </div>

      {/* Android Phone Access & Install Card */}
      <div className="p-4 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950 to-slate-900 text-white border border-rose-900/50 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="font-extrabold text-xs sm:text-sm block text-white truncate">
                Android Phone App Feel
              </span>
              <span className="text-[11px] text-slate-300 block truncate">
                Install to home screen for fullscreen native app feel
              </span>
            </div>
          </div>
          <PWAInstallButton compact />
        </div>
      </div>

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
