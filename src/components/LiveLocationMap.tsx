import React, { useEffect, useRef, useState, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useApp } from '../context/AppContext';
import {
  MapPin,
  Navigation,
  Compass,
  Crosshair,
  Layers,
  Shield,
  Wifi,
  WifiOff,
  AlertCircle,
  Clock,
  Sparkles,
  Maximize2,
  RefreshCw,
  ExternalLink,
} from 'lucide-react';
import { calculateDistanceKm, kmToMiles } from '../utils/distance';

interface LiveLocationMapProps {
  onStartSharing?: () => void;
  onStopSharing?: () => void;
}

export const LiveLocationMap: React.FC<LiveLocationMapProps> = () => {
  const {
    currentUser,
    partnerUser,
    isLocating,
    locationError,
    requestLocationPermission,
    stopSharingLocation,
    isOnline,
    rtdbPartnerLocation,
  } = useApp();

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const partnerMarkerRef = useRef<L.Marker | null>(null);
  const userAccuracyCircleRef = useRef<L.Circle | null>(null);
  const partnerAccuracyCircleRef = useRef<L.Circle | null>(null);
  const connectionLineRef = useRef<L.Polyline | null>(null);

  const hasAutoCenteredRef = useRef<boolean>(false);
  const [lastUpdatedSeconds, setLastUpdatedSeconds] = useState<number>(0);
  const [mapTileSource, setMapTileSource] = useState<'geoapify' | 'osm'>('geoapify');
  const [hasGeoapifyKey, setHasGeoapifyKey] = useState<boolean>(true);

  // Geoapify API key from environment variable
  const geoapifyApiKey =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_GEOAPIFY_API_KEY) || '';

  const isUserSharing = !!currentUser.shareLocation && !!currentUser.location?.latitude;
  const partnerLocationData = rtdbPartnerLocation || (partnerUser.shareLocation ? partnerUser.location : null);
  const isPartnerSharing = !!partnerLocationData?.latitude && (rtdbPartnerLocation ? rtdbPartnerLocation.sharing : partnerUser.shareLocation);

  // Tick time elapsed for "Updated X seconds ago"
  useEffect(() => {
    const timer = setInterval(() => {
      if (currentUser.location?.updatedAt) {
        const elapsed = Math.max(0, Math.floor((Date.now() - new Date(currentUser.location.updatedAt).getTime()) / 1000));
        setLastUpdatedSeconds(elapsed);
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [currentUser.location?.updatedAt]);

  // Create custom HTML DivIcon for markers
  const createUserDivIcon = useCallback((name: string, avatarUrl: string, isSelf: boolean) => {
    const borderColor = isSelf ? 'border-rose-500 ring-rose-300' : 'border-indigo-600 ring-indigo-300';
    const badgeBg = isSelf ? 'bg-rose-600' : 'bg-indigo-600';
    const pulseBg = isSelf ? 'bg-rose-500' : 'bg-indigo-500';

    const html = `
      <div class="relative flex flex-col items-center group cursor-pointer" style="transform: translate(-50%, -100%);">
        <!-- Floating name badge -->
        <div class="px-2 py-0.5 rounded-full ${badgeBg} text-white text-[10px] font-extrabold shadow-md whitespace-nowrap mb-1 flex items-center gap-1 border border-white/60">
          <span>${isSelf ? 'You' : `📍 ${name}`}</span>
        </div>
        <!-- Avatar Pin with pulse -->
        <div class="relative flex items-center justify-center">
          <span class="animate-ping absolute inline-flex h-10 w-10 rounded-full ${pulseBg} opacity-50"></span>
          <div class="relative w-9 h-9 rounded-full overflow-hidden border-2 ${borderColor} ring-2 shadow-lg bg-white">
            <img src="${avatarUrl || '/app-logo.svg'}" class="w-full h-full object-cover" onerror="this.src='/app-logo.svg'" />
          </div>
        </div>
        <!-- Pointer triangle -->
        <div class="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] ${isSelf ? 'border-t-rose-600' : 'border-t-indigo-600'} -mt-0.5"></div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-live-marker',
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
  }, []);

  // Initialize Leaflet map
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Default center: India or user coords if available
    const initLat = currentUser.location?.latitude || 17.385044;
    const initLng = currentUser.location?.longitude || 78.486671;
    const initZoom = currentUser.location?.latitude ? 14 : 5;

    const map = L.map(mapContainerRef.current, {
      center: [initLat, initLng],
      zoom: initZoom,
      zoomControl: false,
      attributionControl: false,
    });

    // Add custom zoom controls in top right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Attribution
    const attributionControl = L.control.attribution({ position: 'bottomright' });
    attributionControl.addTo(map);

    // Geoapify Carto Tile Layer
    const validGeoapifyKey = geoapifyApiKey && geoapifyApiKey !== 'YOUR_GEOAPIFY_API_KEY';
    if (validGeoapifyKey) {
      setHasGeoapifyKey(true);
      const geoapifyUrl = `https://maps.geoapify.com/v1/tile/carto/{z}/{x}/{y}.png?apiKey=${geoapifyApiKey}`;
      const tileLayer = L.tileLayer(geoapifyUrl, {
        maxZoom: 20,
        attribution:
          'Powered by <a href="https://www.geoapify.com/" target="_blank">Geoapify</a> | © <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
      });

      tileLayer.on('tileerror', () => {
        // Fallback to OSM if Geoapify key quota exceeded or invalid
        console.warn('Geoapify tile error, falling back to OpenStreetMap tiles.');
        setMapTileSource('osm');
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        }).addTo(map);
      });

      tileLayer.addTo(map);
    } else {
      setHasGeoapifyKey(false);
      setMapTileSource('osm');
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);
    }

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Markers, Accuracy Circles, and Connecting Polyline
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const userLat = currentUser.location?.latitude;
    const userLng = currentUser.location?.longitude;
    const userAccuracy = currentUser.location?.accuracyMeters || 15;

    const partnerLat = partnerLocationData?.latitude;
    const partnerLng = partnerLocationData?.longitude;
    const partnerAccuracy = (partnerLocationData as any)?.accuracy || (partnerLocationData as any)?.accuracyMeters || 20;

    // 1. Current User Marker
    if (userLat && userLng && isUserSharing) {
      const userIcon = createUserDivIcon(currentUser.name, currentUser.avatarUrl, true);

      if (!userMarkerRef.current) {
        userMarkerRef.current = L.marker([userLat, userLng], { icon: userIcon }).addTo(map);
        userMarkerRef.current.bindPopup(`<b>You (${currentUser.name})</b><br/>GPS Accuracy: ~${Math.round(userAccuracy)}m`);
      } else {
        userMarkerRef.current.setLatLng([userLat, userLng]);
        userMarkerRef.current.setIcon(userIcon);
      }

      // Accuracy Circle
      if (!userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current = L.circle([userLat, userLng], {
          radius: userAccuracy,
          color: '#f43f5e',
          weight: 1.5,
          fillColor: '#fb7185',
          fillOpacity: 0.12,
        }).addTo(map);
      } else {
        userAccuracyCircleRef.current.setLatLng([userLat, userLng]);
        userAccuracyCircleRef.current.setRadius(userAccuracy);
      }

      // First-time auto centering on user
      if (!hasAutoCenteredRef.current) {
        map.setView([userLat, userLng], 15);
        hasAutoCenteredRef.current = true;
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userAccuracyCircleRef.current) {
        userAccuracyCircleRef.current.remove();
        userAccuracyCircleRef.current = null;
      }
    }

    // 2. Partner User Marker
    if (partnerLat && partnerLng && isPartnerSharing) {
      const partnerIcon = createUserDivIcon(partnerUser.name, partnerUser.avatarUrl, false);

      if (!partnerMarkerRef.current) {
        partnerMarkerRef.current = L.marker([partnerLat, partnerLng], { icon: partnerIcon }).addTo(map);
        partnerMarkerRef.current.bindPopup(
          `<b>${partnerUser.name}</b><br/>Live GPS Accuracy: ~${Math.round(partnerAccuracy)}m`
        );
      } else {
        partnerMarkerRef.current.setLatLng([partnerLat, partnerLng]);
        partnerMarkerRef.current.setIcon(partnerIcon);
      }

      // Partner Accuracy Circle
      if (!partnerAccuracyCircleRef.current) {
        partnerAccuracyCircleRef.current = L.circle([partnerLat, partnerLng], {
          radius: partnerAccuracy,
          color: '#6366f1',
          weight: 1.5,
          fillColor: '#818cf8',
          fillOpacity: 0.12,
        }).addTo(map);
      } else {
        partnerAccuracyCircleRef.current.setLatLng([partnerLat, partnerLng]);
        partnerAccuracyCircleRef.current.setRadius(partnerAccuracy);
      }
    } else {
      if (partnerMarkerRef.current) {
        partnerMarkerRef.current.remove();
        partnerMarkerRef.current = null;
      }
      if (partnerAccuracyCircleRef.current) {
        partnerAccuracyCircleRef.current.remove();
        partnerAccuracyCircleRef.current = null;
      }
    }

    // 3. Distance Connection Line between Partners
    if (userLat && userLng && partnerLat && partnerLng && isUserSharing && isPartnerSharing) {
      const distKm = Math.round(calculateDistanceKm(userLat, userLng, partnerLat, partnerLng));
      const latLngs: L.LatLngExpression[] = [
        [userLat, userLng],
        [partnerLat, partnerLng],
      ];

      if (!connectionLineRef.current) {
        connectionLineRef.current = L.polyline(latLngs, {
          color: '#e11d48',
          weight: 2.5,
          dashArray: '6, 8',
          opacity: 0.8,
        }).addTo(map);
        connectionLineRef.current.bindTooltip(`${distKm.toLocaleString()} km apart ❤️`, {
          permanent: true,
          direction: 'center',
          className: 'couple-distance-tooltip',
        });
      } else {
        connectionLineRef.current.setLatLngs(latLngs);
        connectionLineRef.current.setTooltipContent(`${distKm.toLocaleString()} km apart ❤️`);
      }
    } else {
      if (connectionLineRef.current) {
        connectionLineRef.current.remove();
        connectionLineRef.current = null;
      }
    }
  }, [
    currentUser.location,
    isUserSharing,
    partnerLocationData,
    isPartnerSharing,
    partnerUser.name,
    partnerUser.avatarUrl,
    currentUser.name,
    currentUser.avatarUrl,
    createUserDivIcon,
  ]);

  // Handle "Center on Me"
  const handleCenterOnMe = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    if (currentUser.location?.latitude && currentUser.location?.longitude) {
      map.flyTo([currentUser.location.latitude, currentUser.location.longitude], 16, {
        duration: 1.2,
      });
    } else {
      handleToggleSharing();
    }
  };

  // Handle "Fit Both Partners"
  const handleFitBoth = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const userLat = currentUser.location?.latitude;
    const userLng = currentUser.location?.longitude;
    const partnerLat = partnerLocationData?.latitude;
    const partnerLng = partnerLocationData?.longitude;

    if (userLat && userLng && partnerLat && partnerLng) {
      const bounds = L.latLngBounds([
        [userLat, userLng],
        [partnerLat, partnerLng],
      ]);
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 16 });
    } else if (userLat && userLng) {
      map.flyTo([userLat, userLng], 15);
    }
  };

  // Toggle Live Location Sharing
  const handleToggleSharing = async () => {
    if (isUserSharing) {
      stopSharingLocation('current');
    } else {
      hasAutoCenteredRef.current = false;
      await requestLocationPermission('current');
    }
  };

  // Distance computation
  const userLat = currentUser.location?.latitude;
  const userLng = currentUser.location?.longitude;
  const partnerLat = partnerLocationData?.latitude;
  const partnerLng = partnerLocationData?.longitude;
  let distanceKm: number | null = null;
  if (userLat && userLng && partnerLat && partnerLng && isUserSharing && isPartnerSharing) {
    distanceKm = Math.round(calculateDistanceKm(userLat, userLng, partnerLat, partnerLng));
  }

  return (
    <div className="relative rounded-3xl bg-white border border-rose-100 shadow-xl overflow-hidden flex flex-col">
      {/* Top Header Bar */}
      <div className="p-4 bg-gradient-to-r from-rose-50/90 via-pink-50/80 to-indigo-50/90 border-b border-rose-100 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-500 to-pink-600 flex items-center justify-center text-white shadow-md shadow-rose-500/20 shrink-0">
            <Compass className={`w-5 h-5 ${isUserSharing ? 'animate-spin' : ''}`} style={{ animationDuration: '15s' }} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-sm text-slate-800">Two-Person Live Location</span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                  isUserSharing
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isUserSharing ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                <span>{isUserSharing ? '🟢 Live location ON' : '⚪ Live location OFF'}</span>
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Real-time GPS synchronization powered by Geoapify &amp; Firebase
            </p>
          </div>
        </div>

        {/* Start / Stop Button */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleSharing}
            disabled={isLocating}
            className={`px-4 py-2 rounded-2xl font-black text-xs shadow-md transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer ${
              isUserSharing
                ? 'bg-red-500 hover:bg-red-600 text-white shadow-red-500/20'
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
            }`}
          >
            {isLocating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Navigation className="w-4 h-4" />
            )}
            <span>{isUserSharing ? 'Stop Live Location' : 'Start Live Location'}</span>
          </button>
        </div>
      </div>

      {/* Map Error Banner */}
      {locationError && (
        <div className="p-3 bg-red-50 border-b border-red-200 text-red-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span className="flex-1 font-medium">{locationError}</span>
        </div>
      )}

      {/* Map Tile notice if Geoapify key needs configuration */}
      {!hasGeoapifyKey && (
        <div className="px-4 py-1.5 bg-amber-50 border-b border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
          <span>ℹ️ Using OpenStreetMap fallback tiles. Add <code>VITE_GEOAPIFY_API_KEY</code> in <code>.env</code> for Geoapify Carto tiles.</span>
          <span className="font-bold text-[10px] bg-amber-100 px-2 py-0.5 rounded-full">OSM Active</span>
        </div>
      )}

      {/* Interactive Leaflet Map Container */}
      <div className="relative w-full h-[380px] sm:h-[440px] bg-slate-100">
        <div ref={mapContainerRef} className="w-full h-full z-0" />

        {/* Map Floating Overlay Controls */}
        <div className="absolute bottom-4 right-4 z-10 flex flex-col gap-2">
          {/* Fit Both Partners button */}
          {userLat && partnerLat && isUserSharing && isPartnerSharing && (
            <button
              type="button"
              onClick={handleFitBoth}
              className="p-2.5 rounded-2xl bg-white/95 hover:bg-white text-slate-700 shadow-lg border border-slate-200/80 backdrop-blur-xs font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
              title="Fit both partners on map"
            >
              <Maximize2 className="w-4 h-4 text-indigo-600" />
              <span className="text-[11px]">Fit Both</span>
            </button>
          )}

          {/* Center on Me Button */}
          <button
            type="button"
            onClick={handleCenterOnMe}
            className="p-2.5 rounded-2xl bg-white/95 hover:bg-white text-slate-800 shadow-lg border border-slate-200/80 backdrop-blur-xs font-bold text-xs flex items-center gap-1.5 transition active:scale-95 cursor-pointer"
            title="Center map on my live GPS position"
          >
            <Crosshair className="w-4 h-4 text-rose-600 animate-pulse" />
            <span className="text-[11px]">Center on me</span>
          </button>
        </div>

        {/* Floating Distance Badge on Map */}
        {distanceKm !== null && (
          <div className="absolute top-4 left-4 z-10 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg border border-rose-200 flex items-center gap-2">
            <span className="text-base">❤️</span>
            <div className="text-xs">
              <span className="font-extrabold text-slate-800 block">
                {distanceKm.toLocaleString()} km apart
              </span>
              <span className="text-[10px] text-slate-500 font-medium">
                ({kmToMiles(distanceKm).toLocaleString()} miles)
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Live Status & Accuracy Footer */}
      <div className="p-3.5 bg-slate-50 border-t border-slate-200/80 text-xs space-y-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {/* Status */}
          <div className="p-2 rounded-xl bg-white border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              Live Location
            </span>
            <span className={`font-bold text-xs flex items-center gap-1 mt-0.5 ${isUserSharing ? 'text-emerald-600' : 'text-slate-600'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isUserSharing ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
              <span>{isUserSharing ? 'ACTIVE (ON)' : 'PAUSED (OFF)'}</span>
            </span>
          </div>

          {/* GPS Accuracy */}
          <div className="p-2 rounded-xl bg-white border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              GPS Accuracy
            </span>
            <span className="font-bold text-xs text-slate-800 mt-0.5 block truncate">
              {currentUser.location?.accuracyMeters
                ? `~${Math.round(currentUser.location.accuracyMeters)} meters`
                : isUserSharing
                ? 'Acquiring...'
                : '—'}
            </span>
          </div>

          {/* Last Updated */}
          <div className="p-2 rounded-xl bg-white border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              Last Updated
            </span>
            <span className="font-bold text-xs text-slate-800 mt-0.5 block truncate">
              {isUserSharing && currentUser.location?.updatedAt
                ? lastUpdatedSeconds === 0
                  ? 'Just now'
                  : `${lastUpdatedSeconds}s ago`
                : '—'}
            </span>
          </div>

          {/* Partner Sharing Status */}
          <div className="p-2 rounded-xl bg-white border border-slate-200/70">
            <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">
              {partnerUser.name}'s Status
            </span>
            <span className={`font-bold text-xs mt-0.5 flex items-center gap-1 truncate ${isPartnerSharing ? 'text-indigo-600' : 'text-slate-500'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isPartnerSharing ? 'bg-indigo-500' : 'bg-slate-300'}`} />
              <span>{isPartnerSharing ? 'Sharing Live' : 'Not sharing'}</span>
            </span>
          </div>
        </div>

        {/* Human Readable Address (Geoapify reverse geocoding) */}
        {currentUser.location?.city && (
          <div className="flex items-center justify-between text-[11px] text-slate-600 px-1 pt-1">
            <span className="flex items-center gap-1 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0" />
              <span className="font-semibold text-slate-700">Detected Location:</span>
              <span className="truncate">{currentUser.city || 'Acquiring city...'}</span>
            </span>
            <span className="text-[10px] text-slate-400 shrink-0 ml-2">
              Sensor: Browser Geolocation GPS
            </span>
          </div>
        )}

        {/* Background Location honest clarification */}
        <p className="text-[10px] text-slate-400 italic px-1">
          💡 Note: Web browsers update live GPS while this tab is active. Background tracking when the browser is fully closed requires a native Android/iOS app.
        </p>
      </div>
    </div>
  );
};
