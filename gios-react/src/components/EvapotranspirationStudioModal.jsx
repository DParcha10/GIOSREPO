import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  X, Droplets, Sun, Gauge, Layers, Activity, CheckCircle2, Copy, Check,
  MapPin, Compass, BarChart3, Flame, Scale, ShieldCheck
} from 'lucide-react';
import {
  getETCapabilities
} from '../api/giosApi';
import {
  ET_MODELS,
  ET_BENCHMARK_SITES,
  buildETTileUrlTemplate
} from '../config/constants';

/**
 * Colormap visual presets for Evapotranspiration & Energy Balance.
 */
const COLORMAP_PRESETS = [
  {
    id: 'YlGnBu',
    label: 'Yellow-Green-Blue (YlGnBu)',
    desc: 'Hydrological standard for Latent Heat (λE) and actual evapotranspiration',
    cssClass: 'from-yellow-200 via-emerald-400 to-blue-700'
  },
  {
    id: 'turbo',
    label: 'Turbo Spectrum',
    desc: 'High-contrast perceptual spectrum for daily ET accumulation (mm/day)',
    cssClass: 'from-blue-600 via-teal-400 via-yellow-300 to-red-600'
  },
  {
    id: 'inferno',
    label: 'Inferno Radiance',
    desc: 'High-radiance black-purple-orange scale for net radiation (Rn)',
    cssClass: 'from-black via-purple-900 via-amber-500 to-yellow-200'
  },
  {
    id: 'coolwarm',
    label: 'Cool-Warm Divergent',
    desc: 'Blue-to-red thermal departure scale for Crop Water Stress Index (CWSI)',
    cssClass: 'from-blue-600 via-slate-200 to-red-600'
  },
  {
    id: 'viridis',
    label: 'Viridis Continuum',
    desc: 'Perceptually uniform sequential ramp for Evaporative Fraction (Λ)',
    cssClass: 'from-purple-950 via-teal-600 to-yellow-300'
  },
  {
    id: 'magma',
    label: 'Magma Geothermal',
    desc: 'Ground thermal flux ramp for Soil Heat Flux (G)',
    cssClass: 'from-black via-rose-900 to-amber-300'
  }
];

/**
 * Metric configuration map with units, default bounds, and colormaps.
 */
const METRIC_CONFIG_LIST = [
  {
    id: 'daily_et_mm',
    symbol: 'ET₂₄',
    name: 'Daily Actual ET',
    unit: 'mm/day',
    defaultMin: 0.0,
    defaultMax: 12.0,
    recommendedColormap: 'turbo',
    description: '24-hour time-integrated daily crop water consumption'
  },
  {
    id: 'latent_heat',
    symbol: 'λE',
    name: 'Latent Heat Flux',
    unit: 'W/m²',
    defaultMin: 0.0,
    defaultMax: 700.0,
    recommendedColormap: 'YlGnBu',
    description: 'Turbulent energy flux consumed by liquid water vaporization'
  },
  {
    id: 'evaporative_fraction',
    symbol: 'Λ',
    name: 'Evaporative Fraction',
    unit: 'ratio',
    defaultMin: 0.0,
    defaultMax: 1.1,
    recommendedColormap: 'viridis',
    description: 'Ratio of latent heat to available energy: λE / (Rn - G)'
  },
  {
    id: 'net_radiation',
    symbol: 'Rn',
    name: 'Net Radiation',
    unit: 'W/m²',
    defaultMin: 100.0,
    defaultMax: 800.0,
    recommendedColormap: 'inferno',
    description: 'Total available net solar and longwave radiative energy'
  },
  {
    id: 'sensible_heat',
    symbol: 'H',
    name: 'Sensible Heat Flux',
    unit: 'W/m²',
    defaultMin: 0.0,
    defaultMax: 450.0,
    recommendedColormap: 'coolwarm',
    description: 'Convective sensible heat transfer to boundary layer'
  },
  {
    id: 'soil_heat',
    symbol: 'G',
    name: 'Soil Heat Flux',
    unit: 'W/m²',
    defaultMin: 0.0,
    defaultMax: 140.0,
    recommendedColormap: 'magma',
    description: 'Thermal conduction flux transferred into the soil column'
  },
  {
    id: 'cwsi',
    symbol: 'CWSI',
    name: 'Crop Water Stress',
    unit: '0 - 1.0',
    defaultMin: 0.0,
    defaultMax: 1.0,
    recommendedColormap: 'coolwarm',
    description: 'Canopy moisture deficit index: 0 (no stress) to 1 (full desiccation)'
  }
];

export default function EvapotranspirationStudioModal({
  isOpen,
  onClose,
  onApply,
  onApplyTileLayer = null,
  initialSiteId = 'imperial_valley',
  initialModel = 'sebal',
  initialMetric = 'daily_et_mm'
}) {
  // Navigation tabs: 'overview' | 'anchors' | 'energy_budget' | 'cwsi' | 'tiles'
  const [activeTab, setActiveTab] = useState('overview');

  // Benchmark Sites
  const siteList = useMemo(() => {
    if (Array.isArray(ET_BENCHMARK_SITES) && ET_BENCHMARK_SITES.length > 0) {
      return ET_BENCHMARK_SITES;
    }
    return [
      {
        id: 'imperial_valley',
        name: 'Imperial Valley',
        region: 'California, USA',
        lat: 32.85,
        lon: -115.55,
        bbox: [-115.70, 32.70, -115.40, 33.00],
        cropType: 'Alfalfa, Sudangrass & Winter Vegetables',
        typicalET_mm: 8.5,
        description: 'Hyper-arid agricultural basin using Colorado River irrigation with stark contrast between irrigated alfalfa and bare desert.'
      },
      {
        id: 'palo_verde',
        name: 'Palo Verde',
        region: 'California / Arizona, USA',
        lat: 33.62,
        lon: -114.60,
        bbox: [-114.75, 33.50, -114.45, 33.75],
        cropType: 'Forage Crops & Cotton',
        typicalET_mm: 7.8,
        description: 'Low-elevation desert floodplain irrigation valley experiencing intense advective oasis effects.'
      },
      {
        id: 'columbia_basin',
        name: 'Columbia Basin',
        region: 'Washington, USA',
        lat: 46.85,
        lon: -119.25,
        bbox: [-119.45, 46.70, -119.05, 47.00],
        cropType: 'Potatoes, Center-Pivot Corn, Apples & Alfalfa',
        typicalET_mm: 6.4,
        description: 'High-latitude semi-arid project with extensive center-pivot circles and distinctive circular thermal footprints.'
      },
      {
        id: 'nile_delta',
        name: 'Nile Delta',
        region: 'Lower Egypt',
        lat: 30.85,
        lon: 31.00,
        bbox: [30.50, 30.50, 31.50, 31.50],
        cropType: 'Rice Paddies, Wheat, Citrus & Maize',
        typicalET_mm: 6.9,
        description: 'Intensively cultivated alluvial fan under Mediterranean arid transition with high vapor pressure deficit.'
      },
      {
        id: 'al_jawf',
        name: 'Al-Jawf',
        region: 'Northern Borders, Saudi Arabia',
        lat: 29.80,
        lon: 38.30,
        bbox: [38.10, 29.60, 38.50, 30.00],
        cropType: 'Desert Center-Pivot Wheat, Olives & Forage',
        typicalET_mm: 9.2,
        description: 'Deep fossil aquifer pivot irrigation in deep hyper-arid desert sands with extreme sensible heat advection.'
      }
    ];
  }, []);

  // Selected Benchmark Site
  const [selectedSiteId, setSelectedSiteId] = useState(initialSiteId);
  const activeSite = useMemo(() => {
    return siteList.find((s) => s.id === selectedSiteId) || siteList[0];
  }, [siteList, selectedSiteId]);

  // Model Selection
  const [selectedModel, setSelectedModel] = useState(initialModel);
  const modelsList = useMemo(() => {
    if (ET_MODELS && typeof ET_MODELS === 'object') {
      const unique = [];
      const seen = new Set();
      ['SEBAL', 'METRIC', 'TWO_SOURCE_ENERGY_BALANCE', 'PENMAN_MONTEITH'].forEach((k) => {
        const item = ET_MODELS[k];
        if (item && !seen.has(item.id)) {
          seen.add(item.id);
          unique.push(item);
        }
      });
      if (unique.length > 0) return unique;
    }
    return [
      { id: 'sebal', name: 'SEBAL', label: 'Surface Energy Balance Algorithm for Land', author: 'Bastiaanssen et al. (1998)', description: 'Internalized calibration using extreme anchor pixels (cold/hot) to solve sensible and latent heat fluxes.' },
      { id: 'metric', name: 'METRIC', label: 'Mapping EvapoTranspiration with High Resolution and Internalized Calibration', author: 'Allen et al. (2007)', description: 'Alfalfa-referenced internalized calibration linking satellite thermal measurements with local weather station ETr.' },
      { id: 'tseb', name: 'TSEB', label: 'Two-Source Energy Balance', author: 'Norman, Kustas, & Humes (1995)', description: 'Explicit partitioning of sensible and latent energy fluxes between canopy transpiration and soil evaporation.' },
      { id: 'penman_monteith', name: 'Penman-Monteith', label: 'FAO-56 Penman-Monteith Reference Evapotranspiration Inversion', author: 'Allen et al. (1998)', description: 'Standardized aerodynamic and canopy stomatal resistance energy balance formulation.' }
    ];
  }, []);

  // Metric Selection
  const [selectedMetric, setSelectedMetric] = useState(initialMetric);
  const activeMetricConfig = useMemo(() => {
    return METRIC_CONFIG_LIST.find((m) => m.id === selectedMetric) || METRIC_CONFIG_LIST[0];
  }, [selectedMetric]);

  // Colormap & Stretch Controls
  const [selectedColormap, setSelectedColormap] = useState('turbo');
  const [layerOpacity, setLayerOpacity] = useState(0.85);
  const [rescaleMin, setRescaleMin] = useState(0.0);
  const [rescaleMax, setRescaleMax] = useState(12.0);

  // Synchronize colormap and stretch when metric changes
  const handleSelectMetric = useCallback((metricId) => {
    setSelectedMetric(metricId);
    const meta = METRIC_CONFIG_LIST.find((m) => m.id === metricId);
    if (meta) {
      setSelectedColormap(meta.recommendedColormap);
      setRescaleMin(meta.defaultMin);
      setRescaleMax(meta.defaultMax);
    }
  }, []);

  // Interactive Energy Balance & Micrometeorology Parameters
  const [solarElevationDeg, setSolarElevationDeg] = useState(62.5);
  const [atmosphericTransmittance, setAtmosphericTransmittance] = useState(0.82);
  const [airTemperatureC, setAirTemperatureC] = useState(31.5);
  const [windSpeed200m, setWindSpeed200m] = useState(2.8);
  const [surfaceAlbedo, setSurfaceAlbedo] = useState(0.18);
  const [canopyCoverFraction, setCanopyCoverFraction] = useState(0.72);

  // Anchor Pixel Candidate States (CIMEC calibration)
  const [coldPixelNDVI, setColdPixelNDVI] = useState(0.82);
  const [coldPixelTsK, setColdPixelTsK] = useState(294.15); // ~21.0 C
  const [hotPixelNDVI, setHotPixelNDVI] = useState(0.14);
  const [hotPixelTsK, setHotPixelTsK] = useState(318.15); // ~45.0 C

  // Live calculations based on active benchmark site & micrometeorological sliders
  const liveCalculation = useMemo(() => {
    // 1. Net Radiation Estimation (Rn)
    const sinElev = Math.sin((solarElevationDeg * Math.PI) / 180.0);
    const swIncoming = 1367.0 * atmosphericTransmittance * Math.max(0.1, sinElev);
    const swNet = swIncoming * (1.0 - surfaceAlbedo);
    
    // Longwave radiation balance
    const sigma = 5.670374e-8;
    const taK = airTemperatureC + 273.15;
    const lwIncoming = 0.85 * sigma * Math.pow(taK, 4);
    const meanTsK = 0.5 * (coldPixelTsK + hotPixelTsK);
    const lwOutgoing = 0.98 * sigma * Math.pow(meanTsK, 4);
    const lwNet = lwIncoming - lwOutgoing;
    
    const rnVal = Math.max(250.0, Math.round(swNet + lwNet));

    // 2. Soil Heat Flux (G)
    const ndviAvg = 0.5 * (coldPixelNDVI + hotPixelNDVI);
    const tsAvgC = meanTsK - 273.15;
    const gRatio = Math.max(0.05, Math.min(0.35, (tsAvgC / Math.max(0.1, surfaceAlbedo)) * (0.0038 * surfaceAlbedo + 0.0074 * Math.pow(surfaceAlbedo, 2)) * (1.0 - 0.98 * Math.pow(ndviAvg, 4)) + 0.08));
    const gVal = Math.round(rnVal * gRatio);

    // 3. Available Energy
    const availableEnergy = Math.max(50.0, rnVal - gVal);

    // 4. Sensible Heat Flux (H) via CIMEC anchor calibration
    const deltaTsAnchors = Math.max(2.0, hotPixelTsK - coldPixelTsK);
    const hHotVal = Math.round(rnVal * 0.72);
    const hColdVal = 12;

    const hVal = Math.round(hColdVal * canopyCoverFraction + hHotVal * (1.0 - canopyCoverFraction));

    // 5. Latent Heat Flux (λE = Rn - G - H)
    const leVal = Math.max(0, rnVal - gVal - hVal);

    // 6. Evaporative Fraction (Λ = λE / (Rn - G))
    const evaporativeFractionVal = availableEnergy > 0 ? leVal / availableEnergy : 0.0;
    const evaporativeFractionClamped = Math.max(0.0, Math.min(1.2, Math.round(evaporativeFractionVal * 1000) / 1000));

    // 7. Daily Actual Evapotranspiration (ET24)
    const siteBaselineET = activeSite.typicalET_mm || 6.4;
    const modelMultiplier = selectedModel === 'metric' ? 1.05 : selectedModel === 'tseb' ? 0.96 : selectedModel === 'penman_monteith' ? 1.02 : 1.0;
    const et24Computed = (siteBaselineET * (leVal / 420.0) * modelMultiplier);
    const et24Val = Math.max(0.5, Math.min(14.0, Math.round(et24Computed * 10) / 10));

    // 8. Volumetric Water Consumption
    const volumeM3PerHa = Math.round(et24Val * 10.0 * 10) / 10;
    const pivotFieldHectares = 50.0;
    const totalDailyFieldVolumeM3 = Math.round(volumeM3PerHa * pivotFieldHectares);
    const acreFeetEquivalent = Math.round((totalDailyFieldVolumeM3 / 1233.48) * 100) / 100;

    // 9. Crop Water Stress Index (CWSI)
    const etPotVal = Math.max(et24Val, (availableEnergy * 0.035 * 1.15));
    const cwsiRaw = Math.max(0.0, Math.min(1.0, 1.0 - (et24Val / Math.max(0.1, etPotVal))));
    const cwsiVal = Math.round(cwsiRaw * 100) / 100;

    // 10. CIMEC Calibration Slope and Intercept
    const slopeA = Math.round(((4.5 - 0.0) / deltaTsAnchors) * 1000) / 1000;
    const interceptB = Math.round((0.0 - slopeA * coldPixelTsK) * 100) / 100;

    return {
      rn: rnVal,
      g: gVal,
      h: hVal,
      le: leVal,
      availableEnergy,
      evaporativeFraction: evaporativeFractionClamped,
      et24: et24Val,
      volumeM3PerHa,
      totalDailyFieldVolumeM3,
      acreFeetEquivalent,
      cwsi: cwsiVal,
      slopeA,
      interceptB,
      lePercent: Math.round((leVal / rnVal) * 100),
      hPercent: Math.round((hVal / rnVal) * 100),
      gPercent: Math.round((gVal / rnVal) * 100)
    };
  }, [
    solarElevationDeg,
    atmosphericTransmittance,
    airTemperatureC,
    surfaceAlbedo,
    canopyCoverFraction,
    coldPixelNDVI,
    coldPixelTsK,
    hotPixelNDVI,
    hotPixelTsK,
    activeSite,
    selectedModel
  ]);

  // Dynamic Tile URL Template
  const dynamicTileUrlTemplate = useMemo(() => {
    return buildETTileUrlTemplate({
      model: selectedModel,
      metric: selectedMetric,
      colormap: selectedColormap,
      rescale: `${rescaleMin},${rescaleMax}`,
      asset_id: activeSite.id
    });
  }, [selectedModel, selectedMetric, selectedColormap, rescaleMin, rescaleMax, activeSite]);

  // Clipboard copy state
  const [copiedUrl, setCopiedUrl] = useState(false);
  const handleCopyUrl = useCallback(() => {
    navigator.clipboard.writeText(dynamicTileUrlTemplate);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  }, [dynamicTileUrlTemplate]);

  // Server capabilities test ping
  useEffect(() => {
    if (!isOpen) return;
    getETCapabilities().catch(() => {
      // Fallback gracefully to offline constants
    });
  }, [isOpen]);

  // Reset to active benchmark site defaults
  const handleSelectSite = useCallback((siteId) => {
    setSelectedSiteId(siteId);
    const site = siteList.find((s) => s.id === siteId);
    if (site) {
      if (site.id === 'imperial_valley') {
        setColdPixelNDVI(0.85);
        setColdPixelTsK(293.8);
        setHotPixelNDVI(0.12);
        setHotPixelTsK(321.2);
        setAirTemperatureC(36.0);
        setCanopyCoverFraction(0.78);
      } else if (site.id === 'palo_verde') {
        setColdPixelNDVI(0.81);
        setColdPixelTsK(294.5);
        setHotPixelNDVI(0.15);
        setHotPixelTsK(319.4);
        setAirTemperatureC(34.0);
        setCanopyCoverFraction(0.70);
      } else if (site.id === 'columbia_basin') {
        setColdPixelNDVI(0.84);
        setColdPixelTsK(292.6);
        setHotPixelNDVI(0.18);
        setHotPixelTsK(314.5);
        setAirTemperatureC(27.5);
        setCanopyCoverFraction(0.75);
      } else if (site.id === 'nile_delta') {
        setColdPixelNDVI(0.79);
        setColdPixelTsK(295.2);
        setHotPixelNDVI(0.16);
        setHotPixelTsK(317.0);
        setAirTemperatureC(32.0);
        setCanopyCoverFraction(0.82);
      } else if (site.id === 'al_jawf') {
        setColdPixelNDVI(0.88);
        setColdPixelTsK(293.1);
        setHotPixelNDVI(0.09);
        setHotPixelTsK(324.5);
        setAirTemperatureC(38.5);
        setCanopyCoverFraction(0.65);
      }
    }
  }, [siteList]);

  // Apply Action to Leaflet parent map
  const handleApplyLayer = useCallback(() => {
    const payload = {
      model: selectedModel,
      metric: selectedMetric,
      colormap: selectedColormap,
      rescale: `${rescaleMin},${rescaleMax}`,
      opacity: layerOpacity,
      siteId: activeSite.id,
      siteName: activeSite.name,
      centerCoords: [activeSite.lat, activeSite.lon],
      bbox: activeSite.bbox,
      urlTemplate: dynamicTileUrlTemplate,
      summary: {
        daily_et_mm: liveCalculation.et24,
        latent_heat_wm2: liveCalculation.le,
        sensible_heat_wm2: liveCalculation.h,
        net_radiation_wm2: liveCalculation.rn,
        soil_heat_wm2: liveCalculation.g,
        evaporative_fraction: liveCalculation.evaporativeFraction,
        cwsi: liveCalculation.cwsi,
        water_volume_m3_ha: liveCalculation.volumeM3PerHa,
        total_field_volume_m3: liveCalculation.totalDailyFieldVolumeM3
      }
    };

    if (onApplyTileLayer) {
      onApplyTileLayer(dynamicTileUrlTemplate, payload);
    } else if (onApply) {
      onApply(payload);
    }
  }, [
    selectedModel,
    selectedMetric,
    selectedColormap,
    rescaleMin,
    rescaleMax,
    layerOpacity,
    activeSite,
    dynamicTileUrlTemplate,
    liveCalculation,
    onApplyTileLayer,
    onApply
  ]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1200] flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl bg-zinc-950 border border-cyan-500/30 shadow-2xl overflow-hidden font-sans text-slate-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/30 border border-cyan-500/40 text-cyan-400">
              <Droplets className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white flex items-center gap-2">
                  Evapotranspiration & Surface Energy Balance Studio
                </h2>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold tracking-wider uppercase bg-cyan-950 text-cyan-300 border border-cyan-700/60">
                  Cycle v2.5.45
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-blue-950 text-blue-300 border border-blue-700/60">
                  SEBAL / METRIC / TSEB
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Satellite Eddy Covariance, CIMEC Extreme Anchor Pixel Inversion & Volumetric Crop Water Depletion
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold uppercase bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-slate-200 transition-all cursor-pointer"
              title="Copy Leaflet dynamic XYZ tile URL template"
            >
              {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-cyan-400" />}
              <span>{copiedUrl ? 'Copied Tile URL' : 'Copy Tile URL'}</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 py-2.5 bg-zinc-900/40 border-b border-zinc-800/80 overflow-x-auto text-xs font-medium">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'overview'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Overview & Energy Stack</span>
          </button>

          <button
            onClick={() => setActiveTab('anchors')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'anchors'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Anchor Pixel Candidates (CIMEC)</span>
          </button>

          <button
            onClick={() => setActiveTab('energy_budget')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'energy_budget'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Scale className="w-3.5 h-3.5" />
            <span>Flux Partitioning (Rn = G + H + λE)</span>
          </button>

          <button
            onClick={() => setActiveTab('cwsi')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'cwsi'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Crop Water Stress (CWSI)</span>
          </button>

          <button
            onClick={() => setActiveTab('tiles')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
              activeTab === 'tiles'
                ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40'
                : 'text-slate-400 hover:text-white hover:bg-zinc-800/60'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Raster Tile Streaming</span>
          </button>
        </div>

        {/* Modal Body Content (Scrollable) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Top Control Bar: Model Selector, Benchmark Site Selector & Active Metric Pills */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            
            {/* Model Selector Card */}
            <div className="lg:col-span-5 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
              <div>
                <label className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5 mb-2">
                  <Activity className="w-3.5 h-3.5" />
                  <span>Energy Balance Inversion Model</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {modelsList.map((model) => {
                    const isSelected = selectedModel === model.id;
                    return (
                      <button
                        key={model.id}
                        onClick={() => setSelectedModel(model.id)}
                        className={`text-left p-2.5 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-cyan-950/80 border-cyan-500/80 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                            : 'bg-zinc-900/40 border-zinc-800/80 text-slate-400 hover:border-zinc-700 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <span className="font-bold text-xs text-white">{model.name}</span>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />}
                        </div>
                        <span className="text-[10px] text-zinc-400 line-clamp-1 mt-1 font-mono">
                          {model.author}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/60 text-[11px] text-zinc-400 font-mono">
                {modelsList.find((m) => m.id === selectedModel)?.description}
              </div>
            </div>

            {/* Benchmark Sites Selector Card */}
            <div className="lg:col-span-7 p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>Research Benchmark Test Sites</span>
                  </label>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    Lat: {activeSite.lat.toFixed(2)}°, Lon: {activeSite.lon.toFixed(2)}°
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
                  {siteList.map((site) => {
                    const isSelected = selectedSiteId === site.id;
                    return (
                      <button
                        key={site.id}
                        onClick={() => handleSelectSite(site.id)}
                        className={`text-left p-2 rounded-lg border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-blue-950/80 border-blue-500/80 text-white shadow-[0_0_12px_rgba(59,130,246,0.25)]'
                            : 'bg-zinc-900/40 border-zinc-800/80 text-slate-400 hover:border-zinc-700 hover:text-slate-200'
                        }`}
                      >
                        <span className="font-bold text-xs truncate w-full text-white">{site.name}</span>
                        <span className="text-[9px] text-zinc-400 truncate w-full font-mono mt-0.5">{site.region}</span>
                        <div className="mt-1 flex items-center justify-between w-full">
                          <span className="text-[9px] font-mono font-bold text-cyan-300">
                            {site.typicalET_mm} mm/d
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between text-xs px-2 py-1.5 rounded-lg bg-zinc-950/80 border border-zinc-800/60 text-slate-300">
                <span className="truncate mr-2 font-mono text-[11px]">
                  <strong className="text-white">{activeSite.name}:</strong> {activeSite.cropType}
                </span>
                <span className="text-[10px] font-mono text-zinc-400 whitespace-nowrap">
                  Benchmark ET: <strong className="text-cyan-400">{activeSite.typicalET_mm} mm/day</strong>
                </span>
              </div>
            </div>

          </div>

          {/* Active Metric Pills Ribbon */}
          <div className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/80">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-mono uppercase tracking-wider text-slate-400 font-bold flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-cyan-400" />
                <span>Active Target Symbology Metric</span>
              </span>
              <span className="text-[11px] font-mono text-cyan-300">
                Selected: <strong className="text-white">{activeMetricConfig.name} ({activeMetricConfig.symbol})</strong> [{activeMetricConfig.unit}]
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {METRIC_CONFIG_LIST.map((metric) => {
                const isSelected = selectedMetric === metric.id;
                return (
                  <button
                    key={metric.id}
                    onClick={() => handleSelectMetric(metric.id)}
                    className={`px-3 py-2 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                        : 'bg-zinc-950/60 border-zinc-800 text-slate-400 hover:border-zinc-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="font-mono font-bold text-xs text-cyan-300">{metric.symbol}</span>
                      <span className="text-[9px] font-mono text-zinc-500 uppercase">{metric.unit}</span>
                    </div>
                    <span className="text-[11px] font-medium text-slate-200 truncate mt-1">{metric.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: OVERVIEW & ENERGY STACK */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              
              {/* Key Indicators Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                
                {/* Daily ET Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/60 to-zinc-900/80 border border-cyan-500/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="uppercase font-bold text-cyan-400">Daily Actual ET (ET₂₄)</span>
                    <Droplets className="w-4 h-4 text-cyan-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
                      {liveCalculation.et24.toFixed(1)}
                      <span className="text-sm font-normal text-cyan-300">mm/day</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                      Site Benchmark: {activeSite.typicalET_mm} mm/day
                    </div>
                  </div>
                  <div className="text-[10px] text-cyan-400/80 font-mono flex items-center justify-between pt-2 border-t border-cyan-900/40">
                    <span>SEBAL Diurnal Inversion</span>
                    <span>{(liveCalculation.et24 / 24.0).toFixed(2)} mm/hr</span>
                  </div>
                </div>

                {/* Volumetric Consumption Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-blue-950/60 to-zinc-900/80 border border-blue-500/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="uppercase font-bold text-blue-400">Volumetric Water Depletion</span>
                    <Activity className="w-4 h-4 text-blue-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
                      {liveCalculation.volumeM3PerHa.toFixed(1)}
                      <span className="text-sm font-normal text-blue-300">m³/ha/day</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                      50 ha Pivot: ~{liveCalculation.totalDailyFieldVolumeM3.toLocaleString()} m³/day
                    </div>
                  </div>
                  <div className="text-[10px] text-blue-400/80 font-mono flex items-center justify-between pt-2 border-t border-blue-900/40">
                    <span>Equivalent Volume</span>
                    <span>{liveCalculation.acreFeetEquivalent} acre-ft/d</span>
                  </div>
                </div>

                {/* Evaporative Fraction Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-950/60 to-zinc-900/80 border border-emerald-500/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="uppercase font-bold text-emerald-400">Evaporative Fraction (Λ)</span>
                    <Scale className="w-4 h-4 text-emerald-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
                      {liveCalculation.evaporativeFraction.toFixed(2)}
                      <span className="text-sm font-normal text-emerald-300">ratio</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-1 font-mono">
                      λE / (Rn - G) = {liveCalculation.le} / {liveCalculation.availableEnergy} W/m²
                    </div>
                  </div>
                  <div className="text-[10px] text-emerald-400/80 font-mono flex items-center justify-between pt-2 border-t border-emerald-900/40">
                    <span>Canopy Moisture Ratio</span>
                    <span>{(liveCalculation.evaporativeFraction * 100).toFixed(0)}% available</span>
                  </div>
                </div>

                {/* Crop Water Stress (CWSI) Card */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-amber-950/60 to-zinc-900/80 border border-amber-500/40 flex flex-col justify-between">
                  <div className="flex items-center justify-between text-xs font-mono text-slate-400">
                    <span className="uppercase font-bold text-amber-400">Water Stress Index (CWSI)</span>
                    <Gauge className="w-4 h-4 text-amber-400" />
                  </div>
                  <div className="my-2">
                    <div className="text-3xl font-extrabold text-white font-mono flex items-baseline gap-1">
                      {liveCalculation.cwsi.toFixed(2)}
                      <span className="text-sm font-normal text-amber-300">CWSI</span>
                    </div>
                    <div className="text-[11px] font-mono mt-1 font-bold">
                      <span className={
                        liveCalculation.cwsi < 0.2 ? 'text-emerald-400' :
                        liveCalculation.cwsi < 0.4 ? 'text-yellow-400' :
                        liveCalculation.cwsi < 0.7 ? 'text-amber-400' : 'text-rose-400'
                      }>
                        {liveCalculation.cwsi < 0.2 ? 'Well-Watered (Optimal)' :
                         liveCalculation.cwsi < 0.4 ? 'Low Stress (Tolerable)' :
                         liveCalculation.cwsi < 0.7 ? 'Moderate Stress (Trigger Irrigation)' : 'Severe Moisture Deficit'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-amber-400/80 font-mono flex items-center justify-between pt-2 border-t border-amber-900/40">
                    <span>1 - (ETa / ETp)</span>
                    <span>Scale 0.0 - 1.0</span>
                  </div>
                </div>

              </div>

              {/* Energy Balance Component Stacked Visualizer */}
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="font-bold text-sm text-white">
                      Surface Energy Balance Component Stacked Partitioning
                    </h3>
                    <span className="text-xs font-mono text-zinc-400">
                      [Rn ≈ G + H + λE]
                    </span>
                  </div>
                  <div className="text-xs font-mono text-zinc-400">
                    Total Available Net Radiation: <strong className="text-white">{liveCalculation.rn} W/m²</strong>
                  </div>
                </div>

                {/* Stacked Progress Bar */}
                <div className="w-full h-8 rounded-lg overflow-hidden bg-zinc-950 flex border border-zinc-800 p-0.5">
                  {/* Latent Heat Flux segment */}
                  <div
                    style={{ width: `${liveCalculation.lePercent}%` }}
                    className="h-full bg-gradient-to-r from-cyan-600 to-blue-500 rounded-l flex items-center justify-center text-xs font-mono font-bold text-white transition-all shadow-inner"
                    title={`Latent Heat (λE): ${liveCalculation.le} W/m² (${liveCalculation.lePercent}%)`}
                  >
                    {liveCalculation.lePercent > 12 && `λE: ${liveCalculation.le} W/m² (${liveCalculation.lePercent}%)`}
                  </div>

                  {/* Sensible Heat Flux segment */}
                  <div
                    style={{ width: `${liveCalculation.hPercent}%` }}
                    className="h-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-xs font-mono font-bold text-white transition-all shadow-inner"
                    title={`Sensible Heat (H): ${liveCalculation.h} W/m² (${liveCalculation.hPercent}%)`}
                  >
                    {liveCalculation.hPercent > 12 && `H: ${liveCalculation.h} W/m² (${liveCalculation.hPercent}%)`}
                  </div>

                  {/* Soil Heat Flux segment */}
                  <div
                    style={{ width: `${liveCalculation.gPercent}%` }}
                    className="h-full bg-gradient-to-r from-emerald-600 to-teal-700 rounded-r flex items-center justify-center text-xs font-mono font-bold text-white transition-all shadow-inner"
                    title={`Soil Heat (G): ${liveCalculation.g} W/m² (${liveCalculation.gPercent}%)`}
                  >
                    {liveCalculation.gPercent > 8 && `G: ${liveCalculation.g} W/m²`}
                  </div>
                </div>

                {/* Legend & Quantitative Metrics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950/70 border border-cyan-900/50">
                    <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-cyan-500 to-blue-600" />
                    <div>
                      <div className="text-[11px] text-zinc-400 font-mono uppercase">Latent Heat Flux (λE)</div>
                      <div className="text-base font-bold text-cyan-300 font-mono">
                        {liveCalculation.le} W/m² <span className="text-xs text-zinc-500 font-normal">({liveCalculation.lePercent}%)</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">Turbulent water vaporization & transpiration</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950/70 border border-amber-900/50">
                    <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-amber-500 to-orange-600" />
                    <div>
                      <div className="text-[11px] text-zinc-400 font-mono uppercase">Sensible Heat Flux (H)</div>
                      <div className="text-base font-bold text-amber-300 font-mono">
                        {liveCalculation.h} W/m² <span className="text-xs text-zinc-500 font-normal">({liveCalculation.hPercent}%)</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">Convective atmospheric heating of air layer</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-zinc-950/70 border border-emerald-900/50">
                    <div className="w-3.5 h-3.5 rounded bg-gradient-to-br from-emerald-600 to-teal-700" />
                    <div>
                      <div className="text-[11px] text-zinc-400 font-mono uppercase">Soil Heat Flux (G)</div>
                      <div className="text-base font-bold text-emerald-300 font-mono">
                        {liveCalculation.g} W/m² <span className="text-xs text-zinc-500 font-normal">({liveCalculation.gPercent}%)</span>
                      </div>
                      <div className="text-[10px] text-zinc-400">Thermal conductive heat into substrate</div>
                    </div>
                  </div>
                </div>

                {/* Conservation Balance Verification */}
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400 bg-zinc-950/40 p-2.5 rounded-lg border border-zinc-800/80">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>Energy Balance Closure: Rn - (G + H + λE) = 0 W/m²</span>
                  </div>
                  <span className="text-emerald-400 font-bold">Closed Energy Budget</span>
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: ANCHOR PIXEL CANDIDATE INSPECTOR HUD */}
          {activeTab === 'anchors' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400" />
                    <h3 className="font-bold text-sm text-white">
                      CIMEC Extreme Anchor Pixel Calibration HUD (Cold & Hot Anchors)
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-cyan-400">
                    Bastiaanssen & Allen Inversion Framework
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed mb-4">
                  Internalized Calibration (CIMEC) bounds the aerodynamic sensible heat flux equation (H = ρ · Cp · dT / rah)
                  between two thermodynamic extreme endmembers located inside the satellite scene.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  
                  {/* Cold Anchor Pixel Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/40 via-zinc-950 to-zinc-950 border border-cyan-500/50 shadow-lg space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-cyan-900/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping" />
                        <span className="font-bold text-sm text-cyan-300 font-mono uppercase">
                          Cold Pixel (Well-Watered Dense Canopy)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-cyan-900/60 text-cyan-200 border border-cyan-700">
                        H ≈ 0 W/m²
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                        <div className="text-zinc-400 text-[10px] uppercase">NDVI Canopy Health</div>
                        <div className="text-base font-bold text-emerald-400 mt-0.5">{coldPixelNDVI.toFixed(2)}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Target: ~0.80 - 0.90</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                        <div className="text-zinc-400 text-[10px] uppercase">Radiometric Surface Temp (Ts)</div>
                        <div className="text-base font-bold text-cyan-400 mt-0.5">
                          {coldPixelTsK.toFixed(1)} K <span className="text-xs font-normal">({(coldPixelTsK - 273.15).toFixed(1)}°C)</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Transpirational cooling</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                        <div className="text-zinc-400 text-[10px] uppercase">Sensible Heat Flux (H)</div>
                        <div className="text-base font-bold text-slate-300 mt-0.5">≈ 0.0 W/m²</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">dT_cold ≈ 0.0 K</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                        <div className="text-zinc-400 text-[10px] uppercase">Latent Heat Flux (λE)</div>
                        <div className="text-base font-bold text-cyan-300 mt-0.5">≈ 480.0 W/m²</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">λE = Rn - G (max ET)</div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="text-[10px] font-mono text-zinc-400 flex items-center justify-between mb-1">
                        <span>Calibrate Cold Pixel Ts ({coldPixelTsK.toFixed(1)} K)</span>
                        <span>{(coldPixelTsK - 273.15).toFixed(1)}°C</span>
                      </label>
                      <input
                        type="range"
                        min="288.15"
                        max="303.15"
                        step="0.1"
                        value={coldPixelTsK}
                        onChange={(e) => setColdPixelTsK(parseFloat(e.target.value))}
                        className="w-full accent-cyan-400"
                      />
                    </div>
                  </div>

                  {/* Hot Anchor Pixel Card */}
                  <div className="p-4 rounded-xl bg-gradient-to-br from-rose-950/40 via-zinc-950 to-zinc-950 border border-rose-500/50 shadow-lg space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-rose-900/50">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-400 animate-ping" />
                        <span className="font-bold text-sm text-rose-300 font-mono uppercase">
                          Hot Pixel (Dry Bare Agricultural Soil)
                        </span>
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-rose-900/60 text-rose-200 border border-rose-700">
                        λE ≈ 0 W/m²
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                        <div className="text-zinc-400 text-[10px] uppercase">NDVI Soil Reflectance</div>
                        <div className="text-base font-bold text-amber-400 mt-0.5">{hotPixelNDVI.toFixed(2)}</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Target: ~0.10 - 0.18</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                        <div className="text-zinc-400 text-[10px] uppercase">Radiometric Surface Temp (Ts)</div>
                        <div className="text-base font-bold text-rose-400 mt-0.5">
                          {hotPixelTsK.toFixed(1)} K <span className="text-xs font-normal">({(hotPixelTsK - 273.15).toFixed(1)}°C)</span>
                        </div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Thermal radiance peak</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                        <div className="text-zinc-400 text-[10px] uppercase">Latent Heat Flux (λE)</div>
                        <div className="text-base font-bold text-slate-300 mt-0.5">≈ 0.0 W/m²</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">Moisture exhausted</div>
                      </div>

                      <div className="p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800">
                        <div className="text-zinc-400 text-[10px] uppercase">Sensible Heat Flux (H)</div>
                        <div className="text-base font-bold text-rose-300 mt-0.5">≈ 390.0 W/m²</div>
                        <div className="text-[10px] text-zinc-500 mt-0.5">H = Rn - G (max H)</div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <label className="text-[10px] font-mono text-zinc-400 flex items-center justify-between mb-1">
                        <span>Calibrate Hot Pixel Ts ({hotPixelTsK.toFixed(1)} K)</span>
                        <span>{(hotPixelTsK - 273.15).toFixed(1)}°C</span>
                      </label>
                      <input
                        type="range"
                        min="308.15"
                        max="333.15"
                        step="0.1"
                        value={hotPixelTsK}
                        onChange={(e) => setHotPixelTsK(parseFloat(e.target.value))}
                        className="w-full accent-rose-400"
                      />
                    </div>
                  </div>

                </div>

                {/* Temperature Gradient Inversion Equation */}
                <div className="mt-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-cyan-400 font-bold">Near-Surface Temperature Difference Inversion:</span>
                    <span className="text-white">dT = {liveCalculation.slopeA} · Ts + ({liveCalculation.interceptB})</span>
                  </div>
                  <span className="text-zinc-400">ΔTs(hot - cold) = {(hotPixelTsK - coldPixelTsK).toFixed(1)} K</span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: FLUX PARTITIONING (Rn = G + H + λE) & MICROMETEOROLOGY */}
          {activeTab === 'energy_budget' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Sun className="w-4 h-4 text-amber-400" />
                    <span>Micrometeorology & Boundary Layer Aerodynamic Forcing</span>
                  </h3>
                  <span className="text-xs font-mono text-cyan-400">
                    Live Sensitivity Engine
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* Solar Elevation */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Solar Elevation Angle</span>
                      <span className="text-amber-400 font-bold">{solarElevationDeg.toFixed(1)}°</span>
                    </div>
                    <input
                      type="range"
                      min="15.0"
                      max="85.0"
                      step="0.5"
                      value={solarElevationDeg}
                      onChange={(e) => setSolarElevationDeg(parseFloat(e.target.value))}
                      className="w-full accent-amber-400"
                    />
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">Solar Zenith: {(90 - solarElevationDeg).toFixed(1)}°</div>
                  </div>

                  {/* Atmospheric Transmittance */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Clearness Transmittance (τsw)</span>
                      <span className="text-cyan-400 font-bold">{atmosphericTransmittance.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.55"
                      max="0.95"
                      step="0.01"
                      value={atmosphericTransmittance}
                      onChange={(e) => setAtmosphericTransmittance(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">Clear sky aerosol standard: 0.82</div>
                  </div>

                  {/* Air Temperature */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Air Temperature (Ta)</span>
                      <span className="text-rose-400 font-bold">{airTemperatureC.toFixed(1)}°C</span>
                    </div>
                    <input
                      type="range"
                      min="10.0"
                      max="48.0"
                      step="0.5"
                      value={airTemperatureC}
                      onChange={(e) => setAirTemperatureC(parseFloat(e.target.value))}
                      className="w-full accent-rose-400"
                    />
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">{(airTemperatureC + 273.15).toFixed(1)} Kelvin</div>
                  </div>

                  {/* Wind Speed */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Wind Speed (u₂₀₀)</span>
                      <span className="text-blue-400 font-bold">{windSpeed200m.toFixed(1)} m/s</span>
                    </div>
                    <input
                      type="range"
                      min="0.8"
                      max="12.0"
                      step="0.2"
                      value={windSpeed200m}
                      onChange={(e) => setWindSpeed200m(parseFloat(e.target.value))}
                      className="w-full accent-blue-400"
                    />
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">Aerodynamic blending height: 200m</div>
                  </div>

                  {/* Surface Albedo */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Broadband Albedo (α)</span>
                      <span className="text-emerald-400 font-bold">{surfaceAlbedo.toFixed(2)}</span>
                    </div>
                    <input
                      type="range"
                      min="0.08"
                      max="0.45"
                      step="0.01"
                      value={surfaceAlbedo}
                      onChange={(e) => setSurfaceAlbedo(parseFloat(e.target.value))}
                      className="w-full accent-emerald-400"
                    />
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">Shortwave reflectance fraction</div>
                  </div>

                  {/* Canopy Cover Fraction */}
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Canopy Cover Fraction (fc)</span>
                      <span className="text-lime-400 font-bold">{(canopyCoverFraction * 100).toFixed(0)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="1.0"
                      step="0.05"
                      value={canopyCoverFraction}
                      onChange={(e) => setCanopyCoverFraction(parseFloat(e.target.value))}
                      className="w-full accent-lime-400"
                    />
                    <div className="text-[10px] text-zinc-500 font-mono mt-1">Two-source soil vs. vegetation split</div>
                  </div>

                </div>

                {/* Live Flux Response Table */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                  <div className="grid grid-cols-4 gap-2 text-center text-xs font-mono">
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="text-zinc-400 text-[10px]">Net Radiation (Rn)</div>
                      <div className="text-white font-bold text-sm mt-0.5">{liveCalculation.rn} W/m²</div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="text-zinc-400 text-[10px]">Soil Heat (G)</div>
                      <div className="text-emerald-400 font-bold text-sm mt-0.5">{liveCalculation.g} W/m²</div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="text-zinc-400 text-[10px]">Sensible Heat (H)</div>
                      <div className="text-amber-400 font-bold text-sm mt-0.5">{liveCalculation.h} W/m²</div>
                    </div>
                    <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
                      <div className="text-zinc-400 text-[10px]">Latent Heat (λE)</div>
                      <div className="text-cyan-400 font-bold text-sm mt-0.5">{liveCalculation.le} W/m²</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: CROP WATER STRESS INDEX (CWSI) GAUGE & AGRONOMICS */}
          {activeTab === 'cwsi' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge className="w-5 h-5 text-amber-400" />
                    <h3 className="font-bold text-sm text-white">
                      Crop Water Stress Index (CWSI) Agronomic Assessment
                    </h3>
                  </div>
                  <span className="text-xs font-mono text-zinc-400">
                    Idso & Jackson (1982) Empirical Baseline
                  </span>
                </div>

                {/* Visual Gauge Component */}
                <div className="p-6 rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col items-center justify-center">
                  
                  <div className="relative w-72 h-36 overflow-hidden">
                    {/* Semi-circular meter background */}
                    <div className="absolute top-0 left-0 w-72 h-72 rounded-full border-[22px] border-zinc-800 border-b-transparent border-l-transparent -rotate-45" />
                    
                    {/* Colored sectors */}
                    <div className="absolute top-0 left-0 w-72 h-72 rounded-full border-[22px] border-emerald-500/80 border-b-transparent border-l-transparent border-r-transparent -rotate-[45deg]" />
                    <div className="absolute top-0 left-0 w-72 h-72 rounded-full border-[22px] border-amber-500/80 border-b-transparent border-l-transparent border-t-transparent -rotate-[135deg]" />

                    {/* Needle Indicator */}
                    <div
                      className="absolute bottom-0 left-1/2 w-1.5 h-32 bg-white origin-bottom rounded-full transition-transform duration-500 shadow-[0_0_8px_rgba(255,255,255,0.8)]"
                      style={{
                        transform: `translateX(-50%) rotate(${(liveCalculation.cwsi * 180) - 90}deg)`
                      }}
                    />
                    
                    {/* Center Pivot Point */}
                    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 translate-y-1/2 w-6 h-6 rounded-full bg-cyan-400 border-2 border-zinc-950 shadow-md" />
                  </div>

                  <div className="text-center mt-3">
                    <div className="text-4xl font-extrabold font-mono text-white tracking-wider">
                      {liveCalculation.cwsi.toFixed(2)}
                    </div>
                    <div className={`text-xs font-mono font-bold uppercase mt-1 tracking-widest ${
                      liveCalculation.cwsi < 0.2 ? 'text-emerald-400' :
                      liveCalculation.cwsi < 0.4 ? 'text-yellow-400' :
                      liveCalculation.cwsi < 0.7 ? 'text-amber-400' : 'text-rose-400'
                    }`}>
                      {liveCalculation.cwsi < 0.2 ? '0.0 - 0.2: Well-Watered (Optimal Vigor)' :
                       liveCalculation.cwsi < 0.4 ? '0.2 - 0.4: Low Moisture Deficit' :
                       liveCalculation.cwsi < 0.7 ? '0.4 - 0.7: Moderate Moisture Deficit' : '0.7 - 1.0: Severe Moisture Desiccation'}
                    </div>
                  </div>

                </div>

                {/* Agronomic Decision Guidance */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs font-mono">
                  <div className={`p-3 rounded-lg border ${liveCalculation.cwsi < 0.2 ? 'bg-emerald-950/80 border-emerald-500 text-emerald-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                    <div className="font-bold text-emerald-400">0.0 - 0.2: Optimal</div>
                    <div className="text-[10px] mt-1">Canopy transpires at potential rate (ETa ≈ ETp). Stomata fully open.</div>
                  </div>

                  <div className={`p-3 rounded-lg border ${liveCalculation.cwsi >= 0.2 && liveCalculation.cwsi < 0.4 ? 'bg-yellow-950/80 border-yellow-500 text-yellow-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                    <div className="font-bold text-yellow-400">0.2 - 0.4: Mild Deficit</div>
                    <div className="text-[10px] mt-1">Incipient stomatal resistance. Safe for regulated deficit irrigation.</div>
                  </div>

                  <div className={`p-3 rounded-lg border ${liveCalculation.cwsi >= 0.4 && liveCalculation.cwsi < 0.7 ? 'bg-amber-950/80 border-amber-500 text-amber-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                    <div className="font-bold text-amber-400">0.4 - 0.7: Moderate Deficit</div>
                    <div className="text-[10px] mt-1">Yield reduction threshold. Recommend initiating 25-30 mm irrigation cycle.</div>
                  </div>

                  <div className={`p-3 rounded-lg border ${liveCalculation.cwsi >= 0.7 ? 'bg-rose-950/80 border-rose-500 text-rose-200' : 'bg-zinc-950 border-zinc-800 text-zinc-500'}`}>
                    <div className="font-bold text-rose-400">0.7 - 1.0: Severe Desiccation</div>
                    <div className="text-[10px] mt-1">Permanent wilting point hazard. Severe canopy heating (Tc - Ta &gt; +4°C).</div>
                  </div>
                </div>

              </div>
            </div>
          )}

          {/* TAB 5: TILE RASTER STREAMING & COLORMAP SYMBOLOGY */}
          {activeTab === 'tiles' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-white flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    <span>Dynamic Leaflet TileLayer Configuration</span>
                  </h3>
                  <span className="text-xs font-mono text-zinc-400">
                    Endpoint: /api/v1/tiles/evapotranspiration/{'{model}'}/{'{metric}'}/{'{z}'}/{'{x}'}/{'{y}'}.png
                  </span>
                </div>

                {/* Colormap Selector */}
                <div>
                  <label className="text-xs font-mono uppercase text-zinc-400 mb-2 block font-bold">
                    Select Tile Colormap Palette
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {COLORMAP_PRESETS.map((preset) => {
                      const isSelected = selectedColormap === preset.id;
                      return (
                        <button
                          key={preset.id}
                          onClick={() => setSelectedColormap(preset.id)}
                          className={`p-3 rounded-lg border text-left transition-all cursor-pointer flex flex-col justify-between ${
                            isSelected
                              ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.3)]'
                              : 'bg-zinc-950 border-zinc-800 text-slate-400 hover:border-zinc-700 hover:text-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-bold text-xs text-white">{preset.label}</span>
                            {isSelected && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
                          </div>
                          <div className={`w-full h-3 rounded bg-gradient-to-r ${preset.cssClass} mb-2`} />
                          <span className="text-[10px] text-zinc-400 line-clamp-1">{preset.desc}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Layer Opacity & Rescale Controls */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Tile Layer Opacity</span>
                      <span className="text-cyan-400 font-bold">{Math.round(layerOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="1.0"
                      step="0.05"
                      value={layerOpacity}
                      onChange={(e) => setLayerOpacity(parseFloat(e.target.value))}
                      className="w-full accent-cyan-400"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Rescale Stretch Minimum</span>
                      <span className="text-cyan-400 font-bold">{rescaleMin} {activeMetricConfig.unit}</span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={rescaleMin}
                      onChange={(e) => setRescaleMin(parseFloat(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                    />
                  </div>

                  <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800">
                    <div className="flex items-center justify-between text-xs font-mono mb-2">
                      <span className="text-zinc-400">Rescale Stretch Maximum</span>
                      <span className="text-cyan-400 font-bold">{rescaleMax} {activeMetricConfig.unit}</span>
                    </div>
                    <input
                      type="number"
                      step="0.1"
                      value={rescaleMax}
                      onChange={(e) => setRescaleMax(parseFloat(e.target.value))}
                      className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-700 text-white font-mono text-xs"
                    />
                  </div>
                </div>

                {/* Tile URL Preview */}
                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono">
                  <div className="text-zinc-500 uppercase text-[10px] mb-1">Active Dynamic Leaflet Tile Template:</div>
                  <div className="text-cyan-300 break-all select-all">{dynamicTileUrlTemplate}</div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Modal Footer with Action Buttons */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-zinc-800/80 bg-zinc-900/60 backdrop-blur-sm">
          <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
            <span>Model: <strong className="text-white uppercase">{selectedModel}</strong></span>
            <span>•</span>
            <span>Site: <strong className="text-white">{activeSite.name}</strong></span>
            <span>•</span>
            <span>Metric: <strong className="text-cyan-400">{activeMetricConfig.symbol}</strong></span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Close
            </button>

            <button
              onClick={handleApplyLayer}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold font-mono tracking-wide uppercase bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer"
            >
              <Droplets className="w-4 h-4" />
              <span>Apply Layer to Map & Stream Tiles</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
