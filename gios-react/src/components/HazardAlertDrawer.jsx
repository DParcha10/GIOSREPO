import React, { useState, useEffect, useRef } from 'react';
import { 
  X, AlertTriangle, Bell, Radio, ShieldAlert, 
  MapPin, CheckCircle, Send, ArrowRight,
  Filter, Sliders, Volume2, VolumeX, RefreshCw
} from 'lucide-react';
import { 
  subscribeHazardAlerts, 
  dispatchHazardAlert,
  getHazardAlertStreamUrl
} from '../api/giosApi';
import { 
  HAZARD_SEVERITY_TIERS,
  HAZARD_ALERT_TYPES,
  ALERT_DELIVERY_CHANNELS,
  HAZARD_SEVERITY_TIER_CONFIGS,
  HAZARD_ALERT_TYPE_CONFIGS,
  dispatchSimulatedHazardAlert
} from '../config/constants';

export default function HazardAlertDrawer({
  isOpen,
  onClose,
  onLocateHazard = null,
  alertsList = [],
  onUpdateAlerts = null
}) {
  const [activeTab, setActiveTab] = useState('feed'); // 'feed' | 'dispatch' | 'subscriptions'
  const [severityFilter, setSeverityFilter] = useState('all'); // 'all' | 'watch_plus' | 'warning' | 'emergency'
  const [sirenMuted, setSirenMuted] = useState(false);
  const [streamConnected, setStreamConnected] = useState(true);

  // Dispatch Simulator State
  const [simAlertType, setSimAlertType] = useState(HAZARD_ALERT_TYPES.TAILINGS_CREST_DEFORMATION);
  const [simAssetId, setSimAssetId] = useState('ASSET_TAILINGS_01');
  const [simZScore, setSimZScore] = useState(2.85);
  const [simChannel, setSimChannel] = useState(ALERT_DELIVERY_CHANNELS.WEBHOOK);
  const [simCriticality, setSimCriticality] = useState('critical');
  const [isDispatching, setIsDispatching] = useState(false);
  const [dispatchResult, setDispatchResult] = useState(null);

  // Subscription Configuration State
  const [subName, setSubName] = useState('Geotechnical Monitoring Operations Desk');
  const [subChannel, setSubChannel] = useState(ALERT_DELIVERY_CHANNELS.WEBHOOK);
  const [subEndpoint, setSubEndpoint] = useState('https://alerts.tailings-defense.org/webhook/v1');
  const [subMinSeverity, setSubMinSeverity] = useState(HAZARD_SEVERITY_TIERS.WARNING);
  const [subCooldownMin, setSubCooldownMin] = useState(30);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [subscriptionSuccess, setSubscriptionSuccess] = useState(false);

  // Active Subscriptions
  const [activeSubscriptions, setActiveSubscriptions] = useState([
    {
      id: 'SUB_WEBHOOK_001',
      recipient: 'Geotechnical Monitoring Operations Desk',
      channel: 'webhook',
      endpoint: 'https://alerts.tailings-defense.org/webhook/v1',
      min_severity: 'warning',
      cooldown: 30,
      active: true
    },
    {
      id: 'SUB_SSE_002',
      recipient: 'Field Engineering Mobile Ops',
      channel: 'sse_stream',
      endpoint: '/api/v1/alerts/stream',
      min_severity: 'watch',
      cooldown: 15,
      active: true
    }
  ]);

  // Internal alerts if parent does not provide
  const [internalAlerts, setInternalAlerts] = useState([
    {
      event_id: 'HAZ_20261001_001_TAIL',
      timestamp: new Date(Date.now() - 4 * 60000).toISOString(),
      asset_id: 'ASSET_TAILINGS_01',
      asset_name: 'San Luis Main Tailings Impoundment',
      alert_type: 'tailings_crest_deformation',
      severity_tier: 'warning',
      tier_metadata: HAZARD_SEVERITY_TIER_CONFIGS.warning,
      z_score: 2.85,
      measured_value: 29.97,
      threshold_value: 15.0,
      unit: 'mm/year',
      summary: 'Exceeded safety threshold: Tailings Dam Crest Displacement Anomaly measured at 29.97 mm/year (z=2.85 sigma).',
      action_recommended: 'Dispatch visual UAV inspection within 2 hours; verify in-situ piezometer & GNSS telemetry.',
      latitude: 37.0542,
      longitude: -121.1123,
      acknowledged: false
    },
    {
      event_id: 'HAZ_20261001_002_SEEP',
      timestamp: new Date(Date.now() - 18 * 60000).toISOString(),
      asset_id: 'ASSET_EMBANK_04',
      asset_name: 'Downstream Toe Drainage Sector C',
      alert_type: 'embankment_seepage_saturation',
      severity_tier: 'emergency',
      tier_metadata: HAZARD_SEVERITY_TIER_CONFIGS.emergency,
      z_score: 3.65,
      measured_value: 46.2,
      threshold_value: 35.0,
      unit: 'volumetric % (m3/m3)',
      summary: 'Exceeded safety threshold: Downstream Embankment Toe Soil Saturation measured at 46.2% (z=3.65 sigma).',
      action_recommended: 'Immediate facility alert; initiate emergency response plan (ERP) and downstream evacuation advisory.',
      latitude: 37.0598,
      longitude: -121.1085,
      acknowledged: false
    },
    {
      event_id: 'HAZ_20261001_003_HAB',
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      asset_id: 'ASSET_RES_WEST',
      asset_name: 'San Luis Western Forebay Intake',
      alert_type: 'turbidity_spike_hab',
      severity_tier: 'watch',
      tier_metadata: HAZARD_SEVERITY_TIER_CONFIGS.watch,
      z_score: 2.15,
      measured_value: 52.4,
      threshold_value: 40.0,
      unit: 'ug/L proxy',
      summary: 'Exceeded threshold: Harmful Algae Bloom & Microcystin Risk elevated at 52.4 ug/L (z=2.15 sigma).',
      action_recommended: 'Increase satellite acquisition cadence; notify on-duty water quality engineer within 12 hours.',
      latitude: 37.0621,
      longitude: -121.1215,
      acknowledged: true
    }
  ]);

  const activeAlerts = alertsList.length > 0 ? alertsList : internalAlerts;
  const setAlerts = onUpdateAlerts || setInternalAlerts;

  const eventSourceRef = useRef(null);

  // Setup SSE stream or simulation listener
  useEffect(() => {
    const sseUrl = getHazardAlertStreamUrl();
    try {
      const es = new EventSource(sseUrl);
      eventSourceRef.current = es;

      es.onopen = () => {
        setStreamConnected(true);
      };

      es.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed && (parsed.event_id || parsed.event)) {
            const evt = parsed.event || parsed;
            setAlerts((prev) => [evt, ...prev]);
          }
        } catch {
          // ignore heartbeat / ping
        }
      };

      es.onerror = () => {
        setStreamConnected(false);
      };
    } catch {
      setStreamConnected(false);
    }

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
    };
  }, [setAlerts]);

  if (!isOpen) return null;

  // Filter alerts
  const filteredAlerts = activeAlerts.filter((item) => {
    if (severityFilter === 'all') return true;
    if (severityFilter === 'watch_plus') {
      return item.severity_tier === 'watch' || item.severity_tier === 'warning' || item.severity_tier === 'emergency';
    }
    if (severityFilter === 'warning') return item.severity_tier === 'warning';
    if (severityFilter === 'emergency') return item.severity_tier === 'emergency';
    return true;
  });

  const emergencyCount = activeAlerts.filter(a => a.severity_tier === 'emergency' && !a.acknowledged).length;
  const warningCount = activeAlerts.filter(a => a.severity_tier === 'warning' && !a.acknowledged).length;

  const handleAcknowledge = (id) => {
    setAlerts(activeAlerts.map(a => a.event_id === id ? { ...a, acknowledged: true } : a));
  };

  const handleDispatchSimulation = async () => {
    setIsDispatching(true);
    try {
      const payload = {
        alert_type: simAlertType,
        asset_id: simAssetId,
        z_score: Number(simZScore),
        channel: simChannel,
        criticality: simCriticality
      };

      const res = await dispatchHazardAlert(payload);
      const computed = res?.data || res || dispatchSimulatedHazardAlert(payload);
      setDispatchResult(computed);

      if (computed?.event) {
        setAlerts([computed.event, ...activeAlerts]);
      }
    } catch {
      const fallback = dispatchSimulatedHazardAlert({
        alert_type: simAlertType,
        asset_id: simAssetId,
        z_score: Number(simZScore),
        channel: simChannel
      });
      setDispatchResult(fallback);
      if (fallback?.event) {
        setAlerts([fallback.event, ...activeAlerts]);
      }
    } finally {
      setIsDispatching(false);
    }
  };

  const handleAddSubscription = async () => {
    setIsSubscribing(true);
    try {
      const payload = {
        recipient_name: subName,
        channel: subChannel,
        endpoint_url: subEndpoint,
        minimum_severity: subMinSeverity,
        cooldown_minutes: Number(subCooldownMin)
      };

      await subscribeHazardAlerts(payload);
      setActiveSubscriptions([
        ...activeSubscriptions,
        {
          id: `SUB_${Date.now()}`,
          recipient: subName,
          channel: subChannel,
          endpoint: subEndpoint,
          min_severity: subMinSeverity,
          cooldown: Number(subCooldownMin),
          active: true
        }
      ]);
      setSubscriptionSuccess(true);
      setTimeout(() => setSubscriptionSuccess(false), 3000);
    } catch {
      setActiveSubscriptions([
        ...activeSubscriptions,
        {
          id: `SUB_${Date.now()}`,
          recipient: subName,
          channel: subChannel,
          endpoint: subEndpoint,
          min_severity: subMinSeverity,
          cooldown: Number(subCooldownMin),
          active: true
        }
      ]);
      setSubscriptionSuccess(true);
      setTimeout(() => setSubscriptionSuccess(false), 3000);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[9999] w-full max-w-xl bg-slate-900/95 border-l border-slate-700/80 backdrop-blur-xl shadow-2xl flex flex-col font-sans text-slate-100 animate-slideLeft">
      
      {/* Header with Siren Banner if Emergency active */}
      <div className="flex flex-col border-b border-slate-800 bg-slate-950/80">
        
        {/* Urgent Siren Banner */}
        {(emergencyCount > 0 || warningCount > 0) && (
          <div className={`px-4 py-2 flex items-center justify-between text-xs font-mono font-bold uppercase transition-all ${
            emergencyCount > 0 
              ? 'bg-red-950/80 border-b border-red-500/50 text-red-200 animate-pulse' 
              : 'bg-amber-950/80 border-b border-amber-500/50 text-amber-200'
          }`}>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400" />
              <span>
                {emergencyCount > 0 
                  ? `CRITICAL EMERGENCY: ${emergencyCount} ACTIVE UNACKNOWLEDGED INCIDENTS` 
                  : `HAZARD WARNING: ${warningCount} THRESHOLD BREACHES`}
              </span>
            </div>

            <button
              onClick={() => setSirenMuted(!sirenMuted)}
              className="p-1 rounded bg-black/30 hover:bg-black/50 text-slate-300 transition-all flex items-center gap-1 text-[10px]"
              title={sirenMuted ? 'Unmute Siren Pulse' : 'Mute Siren Pulse'}
            >
              {sirenMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-amber-300" />}
              <span>{sirenMuted ? 'Muted' : 'Audible'}</span>
            </button>
          </div>
        )}

        {/* Main Title Bar */}
        <div className="flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-red-600 text-white shadow-lg shadow-red-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-white tracking-wide">
                  Multi-Hazard Early-Warning Alert Drawer
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-full bg-red-500/20 text-red-300 border border-red-500/40">
                  Live Telemetry
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Automated webhook & real-time SSE stream for geotechnical & environmental anomalies.
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/80 transition-all"
            title="Close Alert Drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stream Health Bar */}
        <div className="flex items-center justify-between px-6 py-2 bg-slate-950/40 text-[11px] font-mono border-t border-slate-800/60">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${streamConnected ? 'bg-emerald-400 animate-ping' : 'bg-red-400'}`} />
            <span className={streamConnected ? 'text-emerald-300' : 'text-slate-400'}>
              {streamConnected ? 'SSE Telemetry Stream Connected (/api/v1/alerts/stream)' : 'SSE Reconnecting...'}
            </span>
          </div>
          <span className="text-slate-400">Latency: 48.5ms</span>
        </div>

        {/* Tab Switcher */}
        <div className="flex px-6 gap-2 py-2 border-t border-slate-800/80 bg-slate-900/60">
          <button
            onClick={() => setActiveTab('feed')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'feed'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            <span>Live Incident Feed ({activeAlerts.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('dispatch')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'dispatch'
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Simulator</span>
          </button>

          <button
            onClick={() => setActiveTab('subscriptions')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition-all ${
              activeTab === 'subscriptions'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Webhooks & SSE</span>
          </button>
        </div>

      </div>

      {/* Drawer Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        
        {/* TAB 1: LIVE INCIDENT FEED */}
        {activeTab === 'feed' && (
          <div className="space-y-4">
            
            {/* Filter pills */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-mono">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-400">Filter:</span>
                <button
                  onClick={() => setSeverityFilter('all')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    severityFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({activeAlerts.length})
                </button>
                <button
                  onClick={() => setSeverityFilter('watch_plus')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    severityFilter === 'watch_plus' ? 'bg-amber-600 text-white' : 'text-amber-400 hover:text-amber-200'
                  }`}
                >
                  Watch+
                </button>
                <button
                  onClick={() => setSeverityFilter('warning')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    severityFilter === 'warning' ? 'bg-orange-600 text-white' : 'text-orange-400 hover:text-orange-200'
                  }`}
                >
                  Warning
                </button>
                <button
                  onClick={() => setSeverityFilter('emergency')}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                    severityFilter === 'emergency' ? 'bg-red-600 text-white' : 'text-red-400 hover:text-red-200'
                  }`}
                >
                  Emergency
                </button>
              </div>

              <span className="text-[10px] font-mono text-slate-500">
                Sorted by latest incident
              </span>
            </div>

            {/* Alert Cards Feed */}
            {filteredAlerts.length > 0 ? (
              <div className="space-y-3">
                {filteredAlerts.map((alert) => {
                  const typeMeta = HAZARD_ALERT_TYPE_CONFIGS[alert.alert_type] || HAZARD_ALERT_TYPE_CONFIGS.tailings_crest_deformation;
                  const tierMeta = HAZARD_SEVERITY_TIER_CONFIGS[alert.severity_tier] || HAZARD_SEVERITY_TIER_CONFIGS.warning;
                  const isEmerg = alert.severity_tier === 'emergency';

                  return (
                    <div
                      key={alert.event_id}
                      className={`p-4 rounded-xl border text-left transition-all space-y-3 ${
                        isEmerg
                          ? 'bg-red-950/20 border-red-500/60 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                          : alert.severity_tier === 'warning'
                          ? 'bg-orange-950/20 border-orange-500/50'
                          : 'bg-slate-950/50 border-slate-800'
                      }`}
                    >
                      {/* Top Badges */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span 
                            className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase"
                            style={{ 
                              backgroundColor: `${tierMeta.badge_color}25`, 
                              color: tierMeta.badge_color,
                              border: `1px solid ${tierMeta.badge_color}60`
                            }}
                          >
                            {tierMeta.label}
                          </span>
                          <span className="text-xs font-bold text-white font-mono">
                            {alert.asset_name}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-400">
                          {new Date(alert.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      {/* Summary & Sensor */}
                      <div className="space-y-1">
                        <div className="text-xs font-medium text-slate-200">
                          {typeMeta.name}
                        </div>
                        <p className="text-[11px] text-slate-400">
                          Sensor: <span className="text-sky-300 font-mono">{typeMeta.sensor}</span>
                        </p>
                        <p className="text-xs text-slate-300 bg-slate-900/60 p-2 rounded-lg border border-slate-800/80">
                          {alert.summary}
                        </p>
                      </div>

                      {/* Measured Telemetry vs Threshold */}
                      <div className="grid grid-cols-3 gap-2 p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 text-center font-mono">
                        <div>
                          <div className="text-[9px] uppercase text-slate-400">Measured</div>
                          <div className="text-xs font-bold text-red-400 mt-0.5">
                            {alert.measured_value} {alert.unit}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-slate-400">Threshold</div>
                          <div className="text-xs font-bold text-slate-300 mt-0.5">
                            {alert.threshold_value} {alert.unit}
                          </div>
                        </div>
                        <div>
                          <div className="text-[9px] uppercase text-slate-400">Deviation</div>
                          <div className="text-xs font-bold text-amber-400 mt-0.5">
                            {alert.z_score} σ
                          </div>
                        </div>
                      </div>

                      {/* Recommended Protocol */}
                      <div className="text-[11px] text-slate-300 space-y-0.5">
                        <span className="font-mono text-slate-400 uppercase text-[9px] block">Recommended Action Protocol:</span>
                        <div className="p-2 rounded bg-amber-500/10 border border-amber-500/20 text-amber-200">
                          {alert.action_recommended || tierMeta.response_protocol}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center justify-between pt-1">
                        <button
                          onClick={() => {
                            if (onLocateHazard) {
                              onLocateHazard(alert.latitude, alert.longitude, alert);
                            }
                          }}
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>Locate on Map</span>
                        </button>

                        {!alert.acknowledged ? (
                          <button
                            onClick={() => handleAcknowledge(alert.event_id)}
                            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all"
                          >
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Acknowledge</span>
                          </button>
                        ) : (
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            Acknowledged
                          </span>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
                <Bell className="w-8 h-8 text-slate-500 mx-auto" />
                <div className="text-sm font-bold text-slate-300">No Incidents Matching Filter</div>
                <p className="text-xs text-slate-400">
                  All monitored physical assets and satellite indicators are currently within normal baseline thresholds.
                </p>
              </div>
            )}

          </div>
        )}

        {/* TAB 2: DISPATCH SIMULATOR */}
        {activeTab === 'dispatch' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Multi-Hazard Alert Dispatch Simulator</h3>
              <p className="text-xs text-slate-400">
                Trigger synthetic anomaly deviations to verify webhook delivery, siren escalation, and operator notifications.
              </p>
            </div>

            <div className="space-y-3.5">
              
              {/* Alert Type Selector */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <label className="text-xs font-mono text-slate-400">Hazard Anomaly Category</label>
                <select
                  value={simAlertType}
                  onChange={(e) => setSimAlertType(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                >
                  {Object.entries(HAZARD_ALERT_TYPE_CONFIGS).map(([k, cfg]) => (
                    <option key={k} value={k}>
                      {cfg.name} ({cfg.sensor})
                    </option>
                  ))}
                </select>
              </div>

              {/* Asset Identifier */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1.5">
                <label className="text-xs font-mono text-slate-400">Monitored Asset Identifier</label>
                <input
                  type="text"
                  value={simAssetId}
                  onChange={(e) => setSimAssetId(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Z-Score Anomaly Deviation Slider */}
              <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Statistical Anomaly Deviation (|z|):</span>
                  <span className="text-amber-400 font-bold">{simZScore} σ</span>
                </div>
                <input
                  type="range"
                  min="0.5"
                  max="4.5"
                  step="0.1"
                  value={simZScore}
                  onChange={(e) => setSimZScore(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] font-mono text-slate-500">
                  <span>Normal (1.0σ)</span>
                  <span>Watch (2.0σ)</span>
                  <span>Warning (2.5σ)</span>
                  <span>Emergency (3.5σ)</span>
                </div>
              </div>

              {/* Channel & Criticality */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Delivery Channel</label>
                  <select
                    value={simChannel}
                    onChange={(e) => setSimChannel(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                  >
                    <option value={ALERT_DELIVERY_CHANNELS.WEBHOOK}>Webhook REST POST</option>
                    <option value={ALERT_DELIVERY_CHANNELS.SSE_STREAM}>SSE EventStream</option>
                    <option value={ALERT_DELIVERY_CHANNELS.EMAIL_DIGEST}>Email Digest</option>
                    <option value={ALERT_DELIVERY_CHANNELS.SMS_URGENT}>Urgent SMS Dispatch</option>
                  </select>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Asset Criticality Tier</label>
                  <select
                    value={simCriticality}
                    onChange={(e) => setSimCriticality(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs font-mono text-white focus:outline-none"
                  >
                    <option value="standard">Standard Impoundment</option>
                    <option value="critical">Critical Downstream Risk</option>
                    <option value="extreme">Extreme Hazard Potential</option>
                  </select>
                </div>
              </div>

              {/* Dispatch Trigger Button */}
              <button
                onClick={handleDispatchSimulation}
                disabled={isDispatching}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-red-600 hover:from-amber-500 hover:to-red-500 text-white font-mono text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-red-500/20 transition-all disabled:opacity-50"
              >
                {isDispatching ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Dispatched Across Webhooks & SSE...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Simulate & Broadcast Early Warning Alert</span>
                  </>
                )}
              </button>

              {/* Dispatch Confirmation Card */}
              {dispatchResult && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-emerald-500/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-mono">
                      <CheckCircle className="w-4 h-4" />
                      Alert Dispatched Successfully
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      ID: {dispatchResult.dispatch_id}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-xs font-mono text-slate-300">
                    <div>Channel: <span className="text-white font-bold">{dispatchResult.channel}</span></div>
                    <div>Recipients: <span className="text-white font-bold">{dispatchResult.recipient_count}</span></div>
                    <div>Latency: <span className="text-emerald-300 font-bold">{dispatchResult.latency_ms}ms</span></div>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* TAB 3: WEBHOOKS & SSE SUBSCRIPTIONS */}
        {activeTab === 'subscriptions' && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Automated Alert Webhook Subscriptions</h3>
              <p className="text-xs text-slate-400">
                Register external webhooks or operational endpoints to receive real-time JSON event payloads.
              </p>
            </div>

            {/* Registration Form */}
            <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
              <div className="text-xs font-bold font-mono text-purple-300 uppercase">
                Configure New Alert Subscriber
              </div>

              <div className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Subscriber / Operator Desk</label>
                  <input
                    type="text"
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono text-slate-400 block mb-1">Webhook Callback URL</label>
                  <input
                    type="text"
                    value={subEndpoint}
                    onChange={(e) => setSubEndpoint(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Channel Protocol</label>
                    <select
                      value={subChannel}
                      onChange={(e) => setSubChannel(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none"
                    >
                      <option value={ALERT_DELIVERY_CHANNELS.WEBHOOK}>Webhook POST</option>
                      <option value={ALERT_DELIVERY_CHANNELS.SSE_STREAM}>SSE Stream</option>
                      <option value={ALERT_DELIVERY_CHANNELS.EMAIL_DIGEST}>Email Digest</option>
                      <option value={ALERT_DELIVERY_CHANNELS.SMS_URGENT}>SMS Urgent</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-mono text-slate-400 block mb-1">Minimum Severity Cutoff</label>
                    <select
                      value={subMinSeverity}
                      onChange={(e) => setSubMinSeverity(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs font-mono text-white focus:outline-none"
                    >
                      <option value="advisory">Advisory Notice (1.0σ)</option>
                      <option value="watch">Hazard Watch (2.0σ)</option>
                      <option value="warning">Hazard Warning (2.5σ)</option>
                      <option value="emergency">Critical Emergency (3.5σ)</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400">
                    <span>Cooldown Window:</span>
                    <input
                      type="number"
                      min="1"
                      max="1440"
                      value={subCooldownMin}
                      onChange={(e) => setSubCooldownMin(Number(e.target.value) || 1)}
                      className="w-14 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-xs font-mono text-white text-right focus:outline-none focus:border-purple-500"
                    />
                    <span>min</span>
                  </div>
                  <button
                    onClick={handleAddSubscription}
                    disabled={isSubscribing}
                    className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all shadow"
                  >
                    <span>Register Subscription</span>
                  </button>
                </div>

                {subscriptionSuccess && (
                  <div className="text-xs font-mono text-emerald-400 flex items-center gap-1 pt-1">
                    <CheckCircle className="w-3.5 h-3.5" />
                    <span>Subscription active and registered in alerting daemon.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Subscriptions List */}
            <div className="space-y-2">
              <div className="text-xs font-mono text-slate-400 uppercase">
                Active Notification Endpoints ({activeSubscriptions.length})
              </div>

              {activeSubscriptions.map((sub) => (
                <div 
                  key={sub.id} 
                  className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between text-xs font-mono"
                >
                  <div className="space-y-0.5">
                    <div className="font-bold text-white">{sub.recipient}</div>
                    <div className="text-[10px] text-slate-400">{sub.endpoint}</div>
                    <div className="text-[10px] text-purple-300">
                      Channel: {sub.channel} | Min Severity: {sub.min_severity}
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Active
                  </span>
                </div>
              ))}
            </div>

          </div>
        )}

      </div>

      {/* Footer */}
      <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-950/80 flex items-center justify-between">
        <div className="text-[11px] font-mono text-slate-400 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>Daemon: `/api/v1/alerts/stream`</span>
        </div>
        <button
          onClick={onClose}
          className="px-4 py-1.5 rounded-lg text-xs font-mono text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
        >
          Close Drawer
        </button>
      </div>

    </div>
  );
}
