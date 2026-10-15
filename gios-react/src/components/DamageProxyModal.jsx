import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  X, ShieldAlert, Layers, Eye, Copy, Check,
  AlertTriangle, Info, Play, RefreshCw, BarChart3,
  TrendingUp, Search, Sliders, MapPin, Download,
  Building, FileCode, CheckSquare, Shield
} from 'lucide-react';
import { 
  simulateDamageProxyMapping
} from '../api/giosApi';
import { 
  SAR_DAMAGE_TIER_CONFIGS,
  SARCoherenceDamageTier,
  DAMAGE_PROXY_TILE_METRICS,
  DAMAGE_PROXY_TILE_METRIC_CONFIGS,
  buildDamageProxyTileUrlTemplate,
  calculateDamageProxySummary
} from '../config/constants';
import {
  Chart as ChartJS, CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler
} from 'chart.js';
import { Bar, Radar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, RadialLinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend, Filler);

// Benchmark Pre-Configured SAR Damage Proxy Disaster Scenarios
const PRESET_SCENARIOS = {
  kahramanmaras_quake: {
    id: 'kahramanmaras_quake',
    name: 'Kahramanmaraş M7.8 Earthquake Structural Collapse (Türkiye 2023)',
    event_id: 'EVENT_2023_TURKEY_EQ',
    event_name: 'Kahramanmaraş M7.8 Co-Seismic Fault Rupture & Building Collapse',
    coordinates: [36.9312, 37.5858],
    latitude: 37.5858,
    longitude: 36.9312,
    satellite_mission: 'sentinel-1',
    orbit_direction: 'descending',
    polarization: 'VV',
    pre_event_date: '2023-01-28',
    event_date: '2023-02-09',
    footprint_sample_count: 24,
    description: 'Catastrophic urban building collapse and structural rubble decorrelation across city center along East Anatolian Fault.'
  },
  beirut_port_blast: {
    id: 'beirut_port_blast',
    name: 'Beirut Port Ammonium Nitrate Explosion Shockwave (Lebanon 2020)',
    event_id: 'EVENT_2020_BEIRUT_BLAST',
    event_name: 'Beirut Port Explosion Blast Overpressure & Silo Damage',
    coordinates: [35.5189, 33.9015],
    latitude: 33.9015,
    longitude: 35.5189,
    satellite_mission: 'sentinel-1',
    orbit_direction: 'ascending',
    polarization: 'VV',
    pre_event_date: '2020-07-24',
    event_date: '2020-08-05',
    footprint_sample_count: 22,
    description: 'Extreme blast pressure wave obliterating grain silos, port warehouses, and proximate commercial/residential quarters.'
  },
  san_luis_seismic: {
    id: 'san_luis_seismic',
    name: 'San Luis Dam Crest Seismic Shaking & Substation Stress (California)',
    event_id: 'EVENT_2026_SAN_LUIS_SEISMIC',
    event_name: 'San Luis Dam Seismic Stress & Settlement Assessment',
    coordinates: [-121.0745, 37.0585],
    latitude: 37.0585,
    longitude: -121.0745,
    satellite_mission: 'sentinel-1',
    orbit_direction: 'descending',
    polarization: 'VV',
    pre_event_date: '2026-08-10',
    event_date: '2026-08-22',
    footprint_sample_count: 20,
    description: 'Embankment crest settlement, intake tower concrete strain, and downstream utility substation structural decorrelation.'
  },
  petropolis_landslide: {
    id: 'petropolis_landslide',
    name: 'Petrópolis Intense Flash Flood & Hillslope Debris Flow (Brazil 2022)',
    event_id: 'EVENT_2022_PETROPOLIS',
    event_name: 'Petrópolis Cloudburst Landslide & Structural Scour',
    coordinates: [-43.1789, -22.5050],
    latitude: -22.5050,
    longitude: -43.1789,
    satellite_mission: 'sentinel-1',
    orbit_direction: 'descending',
    polarization: 'VH',
    pre_event_date: '2022-02-03',
    event_date: '2022-02-15',
    footprint_sample_count: 18,
    description: 'Catastrophic hillside debris flows destroying residential hillside communities and municipal bridge infrastructure.'
  },
  cadia_tailings_failure: {
    id: 'cadia_tailings_failure',
    name: 'Cadia Valley NTSF Embankment Foundation Slump (Australia)',
    event_id: 'EVENT_2026_CADIA_SLUMP',
    event_name: 'Cadia NTSF Tailings Dam Shear Failure & Liquefaction',
    coordinates: [148.9950, -33.4730],
    latitude: -33.4730,
    longitude: 148.9950,
    satellite_mission: 'alos-2',
    orbit_direction: 'ascending',
    polarization: 'HH',
    pre_event_date: '2026-07-15',
    event_date: '2026-08-02',
    footprint_sample_count: 20,
    description: 'L-band SAR penetration detecting deep foundation shear slump and tailings slumping decorrelation.'
  }
};

export default function DamageProxyModal({
  isOpen,
  onClose,
  activeSimulation,
  onApplyToMap
}) {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState('kahramanmaras_quake');
  const [activeTab, setActiveTab] = useState('summary');
  const [loading, setLoading] = useState(false);
  const [simulation, setSimulation] = useState(activeSimulation || null);
  const [error, setError] = useState(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedGeoJson, setCopiedGeoJson] = useState(false);

  // Form Parameters
  const [formData, setFormData] = useState({
    satellite_mission: 'sentinel-1',
    orbit_direction: 'descending',
    polarization: 'VV',
    pre_event_date: '2023-01-28',
    event_date: '2023-02-09',
    footprint_sample_count: 24,
    latitude: 37.5858,
    longitude: 36.9312,
    threshold_negligible: 0.15,
    threshold_moderate: 0.35,
    threshold_severe: 0.55
  });

  // Dynamic Tile Options
  const [selectedMetric, setSelectedMetric] = useState('coherence_delta');
  const [tileOpacity, setTileOpacity] = useState(0.85);

  // Table Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [sortField, setSortField] = useState('loss'); // 'loss' | 'coherence' | 'area' | 'collapse'

  // Sync activeSimulation if passed from parent
  useEffect(() => {
    if (activeSimulation) {
      setSimulation(activeSimulation);
    }
  }, [activeSimulation]);

  // Load preset scenario into form
  const handleSelectScenario = useCallback((key) => {
    setSelectedScenarioKey(key);
    const sc = PRESET_SCENARIOS[key];
    if (sc) {
      setFormData((prev) => ({
        ...prev,
        satellite_mission: sc.satellite_mission,
        orbit_direction: sc.orbit_direction,
        polarization: sc.polarization,
        pre_event_date: sc.pre_event_date,
        event_date: sc.event_date,
        footprint_sample_count: sc.footprint_sample_count,
        latitude: sc.latitude,
        longitude: sc.longitude
      }));
    }
  }, []);

  // Execute DPM simulation
  const handleExecuteSimulation = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const scenario = PRESET_SCENARIOS[selectedScenarioKey] || PRESET_SCENARIOS.kahramanmaras_quake;
      const payload = {
        simulation_id: `DPM_${Date.now().toString(36).toUpperCase()}`,
        event_id: scenario.event_id,
        event_name: scenario.event_name,
        pre_event_date: formData.pre_event_date,
        event_date: formData.event_date,
        satellite_mission: formData.satellite_mission,
        orbit_direction: formData.orbit_direction,
        polarization: formData.polarization,
        latitude: Number(formData.latitude),
        longitude: Number(formData.longitude),
        footprint_sample_count: Number(formData.footprint_sample_count),
        coherence_threshold_negligible: Number(formData.threshold_negligible),
        coherence_threshold_moderate: Number(formData.threshold_moderate),
        coherence_threshold_severe: Number(formData.threshold_severe)
      };

      const result = await simulateDamageProxyMapping(payload);
      setSimulation(result);
    } catch (err) {
      setError(err?.response?.data?.detail || err?.message || 'Simulation execution failed');
    } finally {
      setLoading(false);
    }
  }, [selectedScenarioKey, formData]);

  // Initial trigger if modal opens and no simulation exists
  useEffect(() => {
    if (isOpen && !simulation && !loading) {
      handleExecuteSimulation();
    }
  }, [isOpen, simulation, loading, handleExecuteSimulation]);

  // Live threshold re-classification logic
  const handleThresholdChange = (key, val) => {
    const num = Math.max(0.01, Math.min(0.99, Number(val)));
    setFormData((prev) => ({ ...prev, [key]: num }));
  };

  const resetThresholds = () => {
    setFormData((prev) => ({
      ...prev,
      threshold_negligible: 0.15,
      threshold_moderate: 0.35,
      threshold_severe: 0.55
    }));
  };

  // Re-evaluate footprints dynamically if custom thresholds are applied
  const evaluatedFootprints = useMemo(() => {
    if (!simulation?.building_footprints) return [];
    const tNeg = formData.threshold_negligible;
    const tMod = formData.threshold_moderate;
    const tSev = formData.threshold_severe;

    return simulation.building_footprints.map((fp) => {
      const cl = Number(fp.mean_coherence_loss ?? 0);
      let tier = SARCoherenceDamageTier.NEGLIGIBLE;
      if (cl >= tSev) tier = SARCoherenceDamageTier.CATASTROPHIC_COLLAPSE;
      else if (cl >= tMod) tier = SARCoherenceDamageTier.SEVERE;
      else if (cl >= tNeg) tier = SARCoherenceDamageTier.MODERATE;

      return {
        ...fp,
        damage_severity_tier: tier
      };
    });
  }, [simulation, formData.threshold_negligible, formData.threshold_moderate, formData.threshold_severe]);

  // Recalculate dynamic summary
  const dynamicSummary = useMemo(() => {
    if (!evaluatedFootprints.length) return simulation?.summary || null;
    return calculateDamageProxySummary(evaluatedFootprints);
  }, [evaluatedFootprints, simulation?.summary]);

  // Filtered and sorted footprints for registry
  const filteredFootprints = useMemo(() => {
    return evaluatedFootprints.filter((fp) => {
      const name = (fp.building_name || '').toLowerCase();
      const id = (fp.building_id || '').toLowerCase();
      const s = searchTerm.toLowerCase();
      const matchesSearch = !searchTerm || name.includes(s) || id.includes(s);

      const matchesType = typeFilter === 'all' 
        ? true 
        : typeFilter === 'critical_only' 
          ? fp.is_critical 
          : fp.building_type === typeFilter;

      const matchesTier = tierFilter === 'all' ? true : fp.damage_severity_tier === tierFilter;

      return matchesSearch && matchesType && matchesTier;
    }).sort((a, b) => {
      if (sortField === 'loss') return (b.estimated_loss_usd || 0) - (a.estimated_loss_usd || 0);
      if (sortField === 'coherence') return (b.mean_coherence_loss || 0) - (a.mean_coherence_loss || 0);
      if (sortField === 'area') return (b.footprint_area_m2 || 0) - (a.footprint_area_m2 || 0);
      if (sortField === 'collapse') return (b.collapse_probability || 0) - (a.collapse_probability || 0);
      return 0;
    });
  }, [evaluatedFootprints, searchTerm, typeFilter, tierFilter, sortField]);

  // Coherence Histogram Data
  const histogramChartData = useMemo(() => {
    const bins = ['0.0-0.1', '0.1-0.2', '0.2-0.3', '0.3-0.4', '0.4-0.5', '0.5-0.6', '0.6-0.7', '0.7-0.8', '0.8-0.9', '0.9-1.0'];
    const preCounts = new Array(10).fill(0);
    const eventCounts = new Array(10).fill(0);
    const lossCounts = new Array(10).fill(0);

    evaluatedFootprints.forEach((fp) => {
      const gPre = Math.max(0, Math.min(0.999, fp.mean_coherence_pre ?? 0.82));
      const gEvent = Math.max(0, Math.min(0.999, fp.mean_coherence_event ?? 0.35));
      const gLoss = Math.max(0, Math.min(0.999, fp.mean_coherence_loss ?? 0.47));

      preCounts[Math.floor(gPre * 10)] += 1;
      eventCounts[Math.floor(gEvent * 10)] += 1;
      lossCounts[Math.floor(gLoss * 10)] += 1;
    });

    return {
      labels: bins,
      datasets: [
        {
          label: 'Pre-Event Coherence (γ_pre)',
          data: preCounts,
          backgroundColor: 'rgba(52, 211, 153, 0.65)',
          borderColor: '#10b981',
          borderWidth: 1.5
        },
        {
          label: 'Co-Event Coherence (γ_event)',
          data: eventCounts,
          backgroundColor: 'rgba(167, 139, 250, 0.65)',
          borderColor: '#8b5cf6',
          borderWidth: 1.5
        },
        {
          label: 'Coherence Loss (Δγ)',
          data: lossCounts,
          backgroundColor: 'rgba(244, 63, 94, 0.75)',
          borderColor: '#f43f5e',
          borderWidth: 1.5
        }
      ]
    };
  }, [evaluatedFootprints]);

  // Radar Chart Data (Multi-Asset Vulnerability Profile)
  const radarChartData = useMemo(() => {
    const nTotal = evaluatedFootprints.length || 1;
    const nCrit = evaluatedFootprints.filter((f) => f.is_critical).length;
    const nCollapse = evaluatedFootprints.filter((f) => f.damage_severity_tier === 'catastrophic_collapse' || f.damage_severity_tier === 'severe').length;
    const meanCl = dynamicSummary?.mean_coherence_loss || 0.45;
    const meanLossRatio = evaluatedFootprints.reduce((acc, f) => acc + (f.structural_damage_ratio || 0), 0) / nTotal;
    const meanCollapseProb = evaluatedFootprints.reduce((acc, f) => acc + (f.collapse_probability || 0), 0) / nTotal;

    return {
      labels: [
        'Coherence Loss (Δγ)',
        'Severe Damage Ratio',
        'Critical Asset Exposure',
        'Economic Impact',
        'Collapse Risk Index'
      ],
      datasets: [
        {
          label: 'Pre-Disaster Baseline',
          data: [15, 5, 20, 10, 5],
          backgroundColor: 'rgba(16, 185, 129, 0.2)',
          borderColor: '#10b981',
          pointBackgroundColor: '#10b981',
          borderWidth: 1.5
        },
        {
          label: 'Post-Disaster Assessed',
          data: [
            Math.min(100, Math.round(meanCl * 100)),
            Math.min(100, Math.round((nCollapse / nTotal) * 100)),
            Math.min(100, Math.round((nCrit / nTotal) * 100)),
            Math.min(100, Math.round(meanLossRatio * 100)),
            Math.min(100, Math.round(meanCollapseProb * 100))
          ],
          backgroundColor: 'rgba(245, 158, 11, 0.35)',
          borderColor: '#f59e0b',
          pointBackgroundColor: '#f59e0b',
          borderWidth: 2
        }
      ]
    };
  }, [evaluatedFootprints, dynamicSummary]);

  // Copy XYZ Tile URL
  const tileUrlTemplate = useMemo(() => {
    if (!simulation?.simulation_id) return '';
    return buildDamageProxyTileUrlTemplate(simulation.simulation_id, selectedMetric);
  }, [simulation?.simulation_id, selectedMetric]);

  const handleCopyTileUrl = () => {
    if (tileUrlTemplate) {
      navigator.clipboard.writeText(tileUrlTemplate);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    }
  };

  const handleCopyGeoJson = () => {
    if (simulation?.footprints_geojson) {
      navigator.clipboard.writeText(JSON.stringify(simulation.footprints_geojson, null, 2));
      setCopiedGeoJson(true);
      setTimeout(() => setCopiedGeoJson(false), 2000);
    }
  };

  const handleDownloadGeoJson = () => {
    if (!simulation?.footprints_geojson) return;
    const blob = new Blob([JSON.stringify(simulation.footprints_geojson, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${simulation.simulation_id || 'dpm_simulation'}_footprints.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-950 border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-100">
        
        {/* HEADER BAR */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-inner">
              <ShieldAlert className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold tracking-tight text-white">
                  SAR Damage Proxy Mapping (DPM) Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  Cycle v2.5.21
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Interferometric Coherence Loss (Δγ = γ_pre − γ_event), Copernicus/ARIA Damage Tiers & Structural Vulnerability
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Preset Scenarios Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-slate-400">Disaster Scenario:</span>
              <select
                value={selectedScenarioKey}
                onChange={(e) => handleSelectScenario(e.target.value)}
                className="bg-slate-800 border border-slate-700 text-amber-300 text-xs rounded-lg px-2.5 py-1.5 font-mono focus:outline-none focus:border-amber-500"
              >
                {Object.entries(PRESET_SCENARIOS).map(([key, sc]) => (
                  <option key={key} value={key}>
                    {sc.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleExecuteSimulation}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition shadow-lg shadow-amber-600/30 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Computing...</span>
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  <span>Run Inversion</span>
                </>
              )}
            </button>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Close Studio"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="flex items-center gap-1 px-6 border-b border-slate-800 bg-slate-900/50 text-xs font-mono">
          {[
            { id: 'summary', label: '1. Executive Disaster Telemetry', icon: ShieldAlert },
            { id: 'histogram', label: '2. Coherence Histogram & Thresholds', icon: BarChart3 },
            { id: 'exposure', label: '3. Asset Exposure Radar', icon: Building },
            { id: 'footprints', label: '4. Collapse Footprints & GeoJSON', icon: FileCode },
            { id: 'tiles', label: '5. Dynamic DPM TileLayer Studio', icon: Layers }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-bold transition ${
                  isActive
                    ? 'border-amber-500 text-amber-400 bg-amber-500/10'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ERROR BANNER */}
        {error && (
          <div className="mx-6 mt-3 p-3 rounded-lg bg-rose-950/80 border border-rose-600/60 text-xs font-mono text-rose-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* TAB CONTENTS (SCROLLABLE BODY) */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          
          {/* TAB 1: EXECUTIVE SUMMARY & TELEMETRY */}
          {activeTab === 'summary' && (
            <div className="space-y-6">
              
              {/* Event Description Card */}
              <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">
                      {simulation?.event_id || 'EVENT_2026_01'}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {simulation?.event_name || 'Co-Seismic SAR Coherence Decorrelation Event'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400">
                    {PRESET_SCENARIOS[selectedScenarioKey]?.description || 'Automated interferometric coherence differencing inversion across European Space Agency (ESA) Sentinel-1 SLC paired acquisitions.'}
                  </p>
                </div>

                <div className="text-right font-mono text-xs text-slate-400 space-y-0.5 whitespace-nowrap">
                  <div>Mission: <strong className="text-slate-200">{simulation?.satellite_mission?.toUpperCase() || 'SENTINEL-1'} ({simulation?.polarization || 'VV'})</strong></div>
                  <div>Orbit: <strong className="text-slate-200">{simulation?.orbit_direction?.toUpperCase() || 'DESCENDING'}</strong></div>
                  <div>Pre / Event: <strong className="text-slate-200">{simulation?.pre_event_date} ➔ {simulation?.event_date}</strong></div>
                  <div>Center: <strong className="text-amber-300">{Number(simulation?.latitude || 0).toFixed(4)}°N, {Number(simulation?.longitude || 0).toFixed(4)}°E</strong></div>
                </div>
              </div>

              {/* KPI Telemetry Metric Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 font-mono">
                
                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Evaluated Buildings</div>
                  <div className="text-xl font-bold text-white mt-1">
                    {dynamicSummary?.total_footprints_evaluated ?? 0}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">High-res footprints</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Damaged Buildings</div>
                  <div className="text-xl font-bold text-amber-400 mt-1">
                    {dynamicSummary?.damaged_footprints_count ?? 0}
                  </div>
                  <div className="text-[10px] text-amber-500/80 mt-0.5">
                    {dynamicSummary?.total_footprints_evaluated ? Math.round((dynamicSummary.damaged_footprints_count / dynamicSummary.total_footprints_evaluated) * 100) : 0}% affected
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Critical Facilities</div>
                  <div className="text-xl font-bold text-rose-400 mt-1">
                    {dynamicSummary?.critical_facilities_affected ?? 0}
                  </div>
                  <div className="text-[10px] text-rose-500/80 mt-0.5">Hospitals/Tailings (2.0x)</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Total Economic Loss</div>
                  <div className="text-xl font-bold text-emerald-400 mt-1">
                    ${(dynamicSummary?.total_estimated_loss_usd || 0) >= 1e6 
                      ? `${((dynamicSummary?.total_estimated_loss_usd || 0) / 1e6).toFixed(2)}M`
                      : `${Math.round((dynamicSummary?.total_estimated_loss_usd || 0) / 1000)}k`}
                  </div>
                  <div className="text-[10px] text-emerald-500/80 mt-0.5">USD replacement est.</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Mean Coherence Loss</div>
                  <div className="text-xl font-bold text-orange-400 mt-1">
                    {dynamicSummary?.mean_coherence_loss != null ? Number(dynamicSummary.mean_coherence_loss).toFixed(3) : '0.000'}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">Δγ = γ_pre − γ_event</div>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800">
                  <div className="text-[10px] text-slate-400 uppercase">Worst ARIA Tier</div>
                  {(() => {
                    const wt = dynamicSummary?.worst_damage_tier || 'negligible';
                    const cfg = SAR_DAMAGE_TIER_CONFIGS[wt] || SAR_DAMAGE_TIER_CONFIGS.negligible;
                    return (
                      <div className="text-sm font-bold uppercase mt-1 truncate" style={{ color: cfg.color }}>
                        {cfg.name}
                      </div>
                    );
                  })()}
                  <div className="text-[10px] text-slate-500 mt-0.5">Copernicus / ARIA Tier</div>
                </div>

              </div>

              {/* ARIA Damage Tier Distribution Cards */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-mono font-bold text-slate-300 uppercase">
                    Copernicus / NASA JPL ARIA Damage Severity Tiers
                  </h4>
                  <span className="text-[10px] font-mono text-slate-500">
                    Thresholded against interferometric decorrelation magnitude
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
                  {Object.entries(SAR_DAMAGE_TIER_CONFIGS).map(([tierKey, cfg]) => {
                    const count = dynamicSummary?.tier_distribution?.[tierKey] || 0;
                    const total = dynamicSummary?.total_footprints_evaluated || 1;
                    const pct = Math.round((count / total) * 100);

                    return (
                      <div 
                        key={tierKey} 
                        className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-slate-700 transition"
                      >
                        <div className="flex items-center justify-between">
                          <span 
                            className="px-2 py-0.5 text-[10px] font-bold rounded"
                            style={{ backgroundColor: `${cfg.color}22`, color: cfg.color, border: `1px solid ${cfg.color}66` }}
                          >
                            {cfg.badge}
                          </span>
                          <span className="text-xs text-slate-400">
                            {cfg.min_delta_coherence} ≤ Δγ &lt; {cfg.max_delta_coherence}
                          </span>
                        </div>

                        <div>
                          <div className="text-sm font-bold text-white">{cfg.name}</div>
                          <div className="text-xs text-slate-400 mt-1 line-clamp-2">
                            {cfg.description}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                          <span className="text-slate-400">Footprints: <strong className="text-white">{count}</strong> ({pct}%)</span>
                          <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                            <div 
                              className="h-full rounded-full transition-all" 
                              style={{ width: `${pct}%`, backgroundColor: cfg.color }}
                            />
                          </div>
                        </div>

                        <div className="text-[10px] text-slate-500">
                          Action: <span className="text-slate-300">{cfg.action_required}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: COHERENCE HISTOGRAM & THRESHOLDING */}
          {activeTab === 'histogram' && (
            <div className="space-y-6">
              
              {/* Threshold Sliders Control Bar */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 font-mono">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">
                      Interactive ARIA Threshold Tuner (Δγ Cutoffs)
                    </span>
                  </div>
                  <button
                    onClick={resetThresholds}
                    className="text-[10px] px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
                  >
                    Reset ARIA Standards
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                  
                  {/* Negligible / Moderate Threshold */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-emerald-400">Negligible Cutoff (θ_neg):</span>
                      <strong className="text-white font-bold">{formData.threshold_negligible.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.05"
                      max="0.25"
                      step="0.01"
                      value={formData.threshold_negligible}
                      onChange={(e) => handleThresholdChange('threshold_negligible', e.target.value)}
                      className="w-full accent-emerald-500 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500">
                      Decorrelation below this value classified as Negligible.
                    </div>
                  </div>

                  {/* Moderate / Severe Threshold */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-amber-400">Moderate Cutoff (θ_mod):</span>
                      <strong className="text-white font-bold">{formData.threshold_moderate.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.20"
                      max="0.45"
                      step="0.01"
                      value={formData.threshold_moderate}
                      onChange={(e) => handleThresholdChange('threshold_moderate', e.target.value)}
                      className="w-full accent-amber-500 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500">
                      Transition point between non-structural damage and partial collapse.
                    </div>
                  </div>

                  {/* Severe / Catastrophic Threshold */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-rose-400">Severe Cutoff (θ_sev):</span>
                      <strong className="text-white font-bold">{formData.threshold_severe.toFixed(2)}</strong>
                    </div>
                    <input
                      type="range"
                      min="0.45"
                      max="0.75"
                      step="0.01"
                      value={formData.threshold_severe}
                      onChange={(e) => handleThresholdChange('threshold_severe', e.target.value)}
                      className="w-full accent-rose-500 h-1 bg-slate-800 rounded cursor-pointer"
                    />
                    <div className="text-[10px] text-slate-500">
                      Total scatterer decorrelation triggering SAR exclusion zone.
                    </div>
                  </div>

                </div>
              </div>

              {/* Chart.js Histogram */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-mono font-bold text-white uppercase">
                      Interferometric Complex Coherence Distribution Histogram
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Binned in [0.0, 1.0] intervals across pre-event, co-event, and differential loss
                  </span>
                </div>

                <div className="h-72 w-full">
                  <Bar
                    data={histogramChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'top',
                          labels: { color: '#94a3b8', font: { family: 'monospace', size: 11 } }
                        },
                        tooltip: {
                          callbacks: {
                            label: (ctx) => `${ctx.dataset.label}: ${ctx.raw} building footprints`
                          }
                        }
                      },
                      scales: {
                        x: {
                          grid: { color: 'rgba(255,255,255,0.05)' },
                          ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
                        },
                        y: {
                          grid: { color: 'rgba(255,255,255,0.05)' },
                          ticks: { color: '#94a3b8', font: { family: 'monospace', size: 10 } }
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Mathematical Methodology Explainer */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-mono text-slate-400 space-y-2">
                <div className="font-bold text-amber-400 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  <span>NASA JPL ARIA & Copernicus Remote Sensing Formulation</span>
                </div>
                <p>
                  Interferometric coherence loss is calculated as Δγ = max(0.0, min(1.0, γ_pre − γ_event)). Relative decorrelation loss is defined as Δγ / γ_pre × 100%. Structural damage ratio DR follows the non-linear relationship: DR = min(1.0, 1.25 × Δγ^1.35).
                </p>
                <p>
                  Collapse probability follows a calibrated logistic sigmoid function: P(collapse) = 1 / (1 + exp(−12(Δγ − 0.50))). Building replacement loss is scaled by 2.0x for critical infrastructure assets (hospitals, schools, tailings impoundments, power substations).
                </p>
              </div>

            </div>
          )}

          {/* TAB 3: ASSET EXPOSURE RADAR & REGISTRY */}
          {activeTab === 'exposure' && (
            <div className="space-y-6">
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Radar Chart */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 flex flex-col justify-between">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-mono font-bold text-white uppercase">
                        Multi-Metric Structural Vulnerability Radar
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-500">
                      Calibrated [0 to 100%]
                    </span>
                  </div>

                  <div className="h-64 w-full flex items-center justify-center">
                    <Radar
                      data={radarChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        scales: {
                          r: {
                            angleLines: { color: 'rgba(255, 255, 255, 0.1)' },
                            grid: { color: 'rgba(255, 255, 255, 0.08)' },
                            pointLabels: { color: '#cbd5e1', font: { family: 'monospace', size: 10 } },
                            ticks: { display: false, maxTicksLimit: 5 }
                          }
                        },
                        plugins: {
                          legend: {
                            position: 'bottom',
                            labels: { color: '#94a3b8', font: { family: 'monospace', size: 11 } }
                          }
                        }
                      }}
                    />
                  </div>

                  <div className="text-[11px] font-mono text-slate-400 text-center">
                    Quantifies post-disaster shift across coherence loss, structural damage, critical exposure, and collapse risk.
                  </div>
                </div>

                {/* Critical Infrastructure Breakdown */}
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 font-mono">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-rose-400" />
                      <span className="text-xs font-bold text-white uppercase">
                        Critical Infrastructure Fragility Breakdown
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-400">2.0x Amplification Factor</span>
                  </div>

                  <div className="space-y-2 text-xs">
                    {[
                      { type: 'Hospital / Healthcare', key: 'hospital', count: 2, icon: '🏥' },
                      { type: 'School / Academic', key: 'school', count: 2, icon: '🏫' },
                      { type: 'Power Substation', key: 'power_substation', count: 2, icon: '⚡' },
                      { type: 'Tailings Storage Facility', key: 'tailings_facility', count: 2, icon: '🌊' },
                      { type: 'Commercial Center', key: 'commercial', count: 4, icon: '🏢' },
                      { type: 'Residential Quarter', key: 'residential', count: 8, icon: '🏠' }
                    ].map((item) => {
                      const fps = evaluatedFootprints.filter((f) => f.building_type === item.key);
                      const totalLoss = fps.reduce((a, b) => a + (b.estimated_loss_usd || 0), 0);
                      const meanCl = fps.length ? fps.reduce((a, b) => a + (b.mean_coherence_loss || 0), 0) / fps.length : 0;
                      return (
                        <div key={item.key} className="p-2 rounded bg-slate-800/60 border border-slate-700/50 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span>{item.icon}</span>
                            <div>
                              <div className="font-bold text-slate-200">{item.type}</div>
                              <div className="text-[10px] text-slate-400">{fps.length} structures • Mean Δγ: {meanCl.toFixed(2)}</div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-emerald-400">${Math.round(totalLoss).toLocaleString()}</div>
                            <div className="text-[10px] text-slate-500">Est. Loss</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              {/* Searchable and Filterable Building Footprint Registry */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-4 font-mono">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">
                      Building Footprint Registry ({filteredFootprints.length} of {evaluatedFootprints.length})
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    {/* Search */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        placeholder="Search building..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8 pr-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    {/* Type Filter */}
                    <select
                      value={typeFilter}
                      onChange={(e) => setTypeFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="all">All Types</option>
                      <option value="critical_only">Critical Only</option>
                      <option value="residential">Residential</option>
                      <option value="commercial">Commercial</option>
                      <option value="hospital">Hospital</option>
                      <option value="school">School</option>
                      <option value="power_substation">Substation</option>
                      <option value="tailings_facility">Tailings</option>
                    </select>

                    {/* Tier Filter */}
                    <select
                      value={tierFilter}
                      onChange={(e) => setTierFilter(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="all">All Damage Tiers</option>
                      <option value="catastrophic_collapse">Collapse</option>
                      <option value="severe">Severe</option>
                      <option value="moderate">Moderate</option>
                      <option value="negligible">Negligible</option>
                    </select>

                    {/* Sort */}
                    <select
                      value={sortField}
                      onChange={(e) => setSortField(e.target.value)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-200 focus:outline-none focus:border-amber-500"
                    >
                      <option value="loss">Sort: Loss USD</option>
                      <option value="coherence">Sort: Coherence Loss</option>
                      <option value="area">Sort: Footprint Area</option>
                      <option value="collapse">Sort: Collapse Risk</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-72 border border-slate-800 rounded-lg">
                  <table className="w-full text-left text-xs text-slate-300">
                    <thead className="bg-slate-800/80 uppercase text-[10px] text-slate-400 sticky top-0">
                      <tr>
                        <th className="p-2.5">Building ID & Name</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5">Coherence Loss (Δγ)</th>
                        <th className="p-2.5">Damage Tier</th>
                        <th className="p-2.5">Collapse Prob</th>
                        <th className="p-2.5 text-right">Est. Loss (USD)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 font-mono">
                      {filteredFootprints.map((fp) => {
                        const tierCfg = SAR_DAMAGE_TIER_CONFIGS[fp.damage_severity_tier] || SAR_DAMAGE_TIER_CONFIGS.negligible;
                        return (
                          <tr key={fp.building_id} className="hover:bg-slate-800/30 transition">
                            <td className="p-2.5">
                              <div className="font-bold text-white">{fp.building_name || fp.building_id}</div>
                              <div className="text-[10px] text-slate-500">{fp.building_id} • {fp.footprint_area_m2} m²</div>
                            </td>
                            <td className="p-2.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                fp.is_critical ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {fp.building_type ? fp.building_type.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className="font-bold text-amber-300">
                                {Number(fp.mean_coherence_loss ?? 0).toFixed(4)}
                              </span>
                              <div className="text-[10px] text-slate-500">
                                γ_pre: {Number(fp.mean_coherence_pre ?? 0).toFixed(2)} ➔ γ_event: {Number(fp.mean_coherence_event ?? 0).toFixed(2)}
                              </div>
                            </td>
                            <td className="p-2.5">
                              <span 
                                className="px-2 py-0.5 text-[10px] font-bold rounded"
                                style={{ backgroundColor: `${tierCfg.color}22`, color: tierCfg.color, border: `1px solid ${tierCfg.color}66` }}
                              >
                                {tierCfg.badge}
                              </span>
                            </td>
                            <td className="p-2.5">
                              <span className={fp.collapse_probability >= 0.5 ? 'text-rose-400 font-bold' : 'text-slate-300'}>
                                {Math.round((fp.collapse_probability || 0) * 100)}%
                              </span>
                              <span className="text-[10px] text-slate-500 ml-1">({fp.collapse_risk})</span>
                            </td>
                            <td className="p-2.5 text-right font-bold text-emerald-400">
                              ${Number(fp.estimated_loss_usd || 0).toLocaleString()}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

              </div>

            </div>
          )}

          {/* TAB 4: COLLAPSE FOOTPRINTS & RFC 7946 GEOJSON */}
          {activeTab === 'footprints' && (
            <div className="space-y-6 font-mono">
              
              {/* High Risk Structural Collapse Registry */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-400" />
                    <span className="text-xs font-bold text-white uppercase">
                      High-Risk Collapse Priority Structures (P(collapse) ≥ 40%)
                    </span>
                  </div>
                  <span className="text-[10px] text-rose-400">Search and Rescue Emergency Priority</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {evaluatedFootprints
                    .filter((f) => f.damage_severity_tier === 'catastrophic_collapse' || f.damage_severity_tier === 'severe')
                    .map((fp) => (
                      <div key={fp.building_id} className="p-3 rounded-lg bg-rose-950/20 border border-rose-800/40 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{fp.building_name || fp.building_id}</span>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-rose-500/30 text-rose-300 font-bold">
                            COLLAPSE {Math.round((fp.collapse_probability || 0) * 100)}%
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-400 space-y-0.5">
                          <div>Type: <strong className="text-slate-200">{fp.building_type?.toUpperCase()}</strong></div>
                          <div>Loss: <strong className="text-emerald-400">${Number(fp.estimated_loss_usd || 0).toLocaleString()}</strong></div>
                          <div>Coordinates: <strong className="text-amber-300">{Number(fp.latitude).toFixed(4)}°N, {Number(fp.longitude).toFixed(4)}°E</strong></div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              {/* RFC 7946 GeoJSON FeatureCollection Previewer */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <FileCode className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">
                      RFC 7946 Standard GeoJSON FeatureCollection
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleCopyGeoJson}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                    >
                      {copiedGeoJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedGeoJson ? 'Copied GeoJSON!' : 'Copy GeoJSON'}</span>
                    </button>

                    <button
                      onClick={handleDownloadGeoJson}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold rounded bg-amber-600 hover:bg-amber-500 text-white transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download .geojson</span>
                    </button>
                  </div>
                </div>

                <pre className="p-3 bg-black/60 rounded-lg text-[10px] text-amber-300/90 font-mono overflow-x-auto max-h-60 border border-slate-800">
                  {simulation?.footprints_geojson 
                    ? JSON.stringify(simulation.footprints_geojson, null, 2) 
                    : '// No GeoJSON generated yet. Run Inversion.'}
                </pre>
              </div>

            </div>
          )}

          {/* TAB 5: DYNAMIC DPM TILELAYER STUDIO */}
          {activeTab === 'tiles' && (
            <div className="space-y-6 font-mono">
              
              {/* Dynamic Tile URL Display */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white uppercase">
                      Dynamic XYZ Raster Tile Template (Slippy Map Standard)
                    </span>
                  </div>
                  <button
                    onClick={handleCopyTileUrl}
                    className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-bold rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copied URL!' : 'Copy XYZ Template'}</span>
                  </button>
                </div>

                <div className="p-3 bg-black/80 rounded-lg text-xs text-amber-400 font-bold border border-slate-800 break-all select-all">
                  {tileUrlTemplate || '/api/v1/tiles/geotechnical/dpm/{simulation_id}/{metric}/{z}/{x}/{y}.png'}
                </div>

                <div className="text-[11px] text-slate-400">
                  Memory-safe single-precision float32 tiles served with sub-50ms latency and high-performance LRU cache.
                </div>
              </div>

              {/* Metric Selector Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase">
                  Select Visualized Raster Metric:
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                  {Object.entries(DAMAGE_PROXY_TILE_METRICS).map(([metricKey, label]) => {
                    const cfg = DAMAGE_PROXY_TILE_METRIC_CONFIGS[metricKey] || {};
                    const isSelected = selectedMetric === metricKey;
                    return (
                      <button
                        key={metricKey}
                        onClick={() => setSelectedMetric(metricKey)}
                        className={`p-3.5 rounded-xl border text-left flex flex-col justify-between space-y-2 transition ${
                          isSelected
                            ? 'bg-amber-500/20 border-amber-500 text-white shadow-lg shadow-amber-500/20'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-amber-300">{metricKey}</span>
                          {isSelected && <CheckSquare className="w-4 h-4 text-amber-400" />}
                        </div>
                        <div className="text-[11px] text-slate-400 font-sans">
                          {label}
                        </div>
                        <div className="text-[10px] text-slate-500 flex justify-between pt-1 border-t border-slate-800">
                          <span>Unit: {cfg.unit || 'ratio'}</span>
                          <span>Colormap: {cfg.colormap || 'turbo'}</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Opacity Control */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-300">Tile Layer Opacity:</span>
                  <strong className="text-amber-400">{Math.round(tileOpacity * 100)}%</strong>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={tileOpacity}
                  onChange={(e) => setTileOpacity(Number(e.target.value))}
                  className="w-full accent-amber-500 h-1.5 bg-slate-800 rounded cursor-pointer"
                />
              </div>

              {/* Apply to Map Action Banner */}
              <div className="p-5 rounded-xl bg-gradient-to-r from-amber-950/60 via-slate-900 to-slate-900 border border-amber-500/40 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="space-y-1 text-center md:text-left">
                  <h4 className="text-sm font-bold text-white flex items-center justify-center md:justify-start gap-2">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    <span>Overlay SAR Damage Proxy Mapping on Web GIS</span>
                  </h4>
                  <p className="text-xs text-slate-400 font-sans">
                    Mounts dynamic XYZ tile layer, overlays {evaluatedFootprints.length} building polygons, and anchors HUD telemetry.
                  </p>
                </div>

                <button
                  onClick={() => {
                    if (simulation && onApplyToMap) {
                      onApplyToMap(simulation, {
                        selectedMetric,
                        opacity: tileOpacity
                      });
                      onClose();
                    }
                  }}
                  className="px-5 py-2.5 text-xs font-mono font-bold rounded-xl bg-amber-500 hover:bg-amber-400 text-black transition flex items-center gap-2 shadow-lg shadow-amber-500/30 whitespace-nowrap"
                >
                  <Eye className="w-4 h-4" />
                  <span>Apply DPM Layer to GIS Map</span>
                </button>
              </div>

            </div>
          )}

        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs font-mono text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span>SAR Coherence Inversion Engine: Ready</span>
          </div>

          <div className="flex items-center gap-4">
            <span>Simulation: <strong className="text-slate-200">{simulation?.simulation_id || 'DPM_PENDING'}</strong></span>
            <button
              onClick={onClose}
              className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
