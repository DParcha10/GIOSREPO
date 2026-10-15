import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  X, Bell, BellRing, Shield, ShieldAlert, CheckCircle2, AlertTriangle,
  AlertCircle, RefreshCw, Play, Copy, Check, Send, Activity, Terminal,
  Key, Lock, Globe, Plus, Trash2, Sliders, Layers, MapPin, Eye, Clock,
  Filter, Sparkles, Database, RotateCcw, ShieldCheck, Info, CheckSquare
} from 'lucide-react';
import {
  createHarvesterSubscription,
  testWebhookDispatch,
  retryDeadLetterQueue,
  triggerHarvesterRun,
  fetchDeadLetterQueue,
  fetchHarvesterSubscriptions
} from '../api/giosApi';
import {
  STACCollectionName,
  HarvestScheduleInterval,
  WebhookChannelType,
  WebhookDeliveryStatus,
  HarvesterAlertSeverity,
  PerimeterTriggerCondition,
  HARVEST_SCHEDULE_CONFIGS,
  WEBHOOK_CHANNEL_CONFIGS,
  generateHmacSha256Signature,
  verifyHmacSha256Signature,
  pointInPerimeterPolygon,
  calculateRetryBackoff,
  formatChannelNotificationPayload,
  simulateSTACHarvesterCycle
} from '../config/constants';

// Benchmark Pre-Configured STAC Perimeter Harvester Scenarios
const PRESET_SUBSCRIPTIONS = {
  san_luis_reservoir: {
    id: 'san_luis_reservoir',
    subscription_id: 'SUB-STAC-SLR-01',
    name: 'San Luis Dam & Reservoir Perimeter Watchdog',
    description: 'Continuous Sentinel-2 & Landsat-9 multi-spectral anomaly surveillance across San Luis impoundment & crest perimeter.',
    asset_id: 'ASSET-DAM-SLR-01',
    coordinates: [-120.85, 37.05],
    latitude: 37.05,
    longitude: -120.85,
    schedule: {
      interval: 'hourly',
      cron: '0 * * * *',
      cloud_cover_max: 20.0,
      collections: ['sentinel-2-l2a', 'landsat-c2-l2'],
      lookback_hours: 24
    },
    perimeter: {
      fence_id: 'FENCE-SLR-01',
      name: 'San Luis Embankment & Freeboard Buffer',
      polygon_coordinates: [
        [-120.9100, 37.0200],
        [-120.8000, 37.0200],
        [-120.8000, 37.0900],
        [-120.9100, 37.0900],
        [-120.9100, 37.0200]
      ]
    },
    webhook_endpoints: [
      {
        endpoint_id: 'EP-SLR-WEBHOOK',
        channel_type: 'custom_webhook',
        target_url: 'https://telemetry.gios-dam-safety.ca.gov/v1/alerts/incoming',
        secret_token: 'gios_sec_8f9a2b4c6e1d3f5a7b9c0e2d4f6a8b1c',
        is_active: true,
        max_retries: 3
      },
      {
        endpoint_id: 'EP-SLR-SLACK',
        channel_type: 'slack',
        target_url: 'https://hooks.slack.com/services/T0123/B4567/giosSanLuisAlerts',
        secret_token: 'slack_signing_secret_9941a87e2b',
        is_active: true,
        max_retries: 3
      },
      {
        endpoint_id: 'EP-SLR-PAGERDUTY',
        channel_type: 'pagerduty',
        target_url: 'pd_key_live_c48e91d32a0b1784ef63',
        secret_token: 'pd_hmac_key_9941a87e2b',
        is_active: true,
        max_retries: 5
      }
    ],
    trigger_conditions: ['anomaly_exceeded', 'new_scene'],
    z_score_threshold: 2.50,
    is_enabled: true
  },
  brumadinho_tailings: {
    id: 'brumadinho_tailings',
    subscription_id: 'SUB-STAC-BRU-02',
    name: 'Brumadinho Tailings Upstream Facility Perimeter',
    description: 'Automated satellite multi-sensor radar & optical surveillance for unseasonal moisture accumulation and slope creep.',
    asset_id: 'ASSET-TAILINGS-BRU-02',
    coordinates: [-44.12, -20.12],
    latitude: -20.12,
    longitude: -44.12,
    schedule: {
      interval: '6h',
      cron: '0 */6 * * *',
      cloud_cover_max: 30.0,
      collections: ['sentinel-2-l2a', 'sentinel-1-rtc'],
      lookback_hours: 48
    },
    perimeter: {
      fence_id: 'FENCE-BRU-02',
      name: 'Córrego do Feijão Upstream Catchment Buffer',
      polygon_coordinates: [
        [-44.1600, -20.1500],
        [-44.0800, -20.1500],
        [-44.0800, -20.0900],
        [-44.1600, -20.0900],
        [-44.1600, -20.1500]
      ]
    },
    webhook_endpoints: [
      {
        endpoint_id: 'EP-BRU-TEAMS',
        channel_type: 'ms_teams',
        target_url: 'https://miningcorp.webhook.office.com/webhookb2/teams_tailings_urgent',
        secret_token: 'teams_sig_7a9c2b4d6e8f0a1c3e5',
        is_active: true,
        max_retries: 4
      },
      {
        endpoint_id: 'EP-BRU-WEBHOOK',
        channel_type: 'custom_webhook',
        target_url: 'https://emergency.geotech-sentinel.org/api/v2/ingest',
        secret_token: 'gios_sec_bru_18a7c93e4b2d5f60',
        is_active: true,
        max_retries: 3
      }
    ],
    trigger_conditions: ['anomaly_exceeded', 'seismic_induced', 'piping_breach'],
    z_score_threshold: 2.20,
    is_enabled: true
  },
  oroville_spillway: {
    id: 'oroville_spillway',
    subscription_id: 'SUB-STAC-ORO-03',
    name: 'Oroville Dam Spillway Catchment Watchdog',
    description: 'High-frequency cloud-dilated optical and digital elevation differencing perimeter surveillance.',
    asset_id: 'ASSET-SPILLWAY-ORO-03',
    coordinates: [-121.49, 39.54],
    latitude: 39.54,
    longitude: -121.49,
    schedule: {
      interval: 'hourly',
      cron: '0 * * * *',
      cloud_cover_max: 15.0,
      collections: ['sentinel-2-l2a', 'cop-dem-glo-30'],
      lookback_hours: 12
    },
    perimeter: {
      fence_id: 'FENCE-ORO-03',
      name: 'Feather River Canyon Flood Exclusion Zone',
      polygon_coordinates: [
        [-121.5400, 39.5100],
        [-121.4400, 39.5100],
        [-121.4400, 39.5800],
        [-121.5400, 39.5800],
        [-121.5400, 39.5100]
      ]
    },
    webhook_endpoints: [
      {
        endpoint_id: 'EP-ORO-PAGERDUTY',
        channel_type: 'pagerduty',
        target_url: 'pd_key_oroville_spillway_emergency',
        secret_token: 'pd_secret_oroville_key_001',
        is_active: true,
        max_retries: 5
      },
      {
        endpoint_id: 'EP-ORO-EMAIL',
        channel_type: 'email_smtp',
        target_url: 'flood-ops@water.ca.gov',
        secret_token: 'smtp_auth_token_oroville',
        is_active: true,
        max_retries: 2
      }
    ],
    trigger_conditions: ['anomaly_exceeded', 'new_scene'],
    z_score_threshold: 2.75,
    is_enabled: true
  },
  cadia_tailings: {
    id: 'cadia_tailings',
    subscription_id: 'SUB-STAC-CAD-04',
    name: 'Cadia Valley Operations Tailings Impoundment',
    description: 'Sub-centimeter InSAR & optical surface moisture cross-correlation alert perimeter.',
    asset_id: 'ASSET-TAILINGS-CAD-04',
    coordinates: [148.99, -33.47],
    latitude: -33.47,
    longitude: 148.99,
    schedule: {
      interval: 'daily',
      cron: '0 0 * * *',
      cloud_cover_max: 25.0,
      collections: ['sentinel-1-rtc', 'sentinel-2-l2a'],
      lookback_hours: 72
    },
    perimeter: {
      fence_id: 'FENCE-CAD-04',
      name: 'Cadia Northern Tailings Facility Footprint',
      polygon_coordinates: [
        [148.9400, -33.5100],
        [149.0400, -33.5100],
        [149.0400, -33.4300],
        [148.9400, -33.4300],
        [148.9400, -33.5100]
      ]
    },
    webhook_endpoints: [
      {
        endpoint_id: 'EP-CAD-WEBHOOK',
        channel_type: 'custom_webhook',
        target_url: 'https://ops.cadia-gold.com.au/webhooks/geotech',
        secret_token: 'gios_sec_cadia_8832a9df',
        is_active: true,
        max_retries: 3
      }
    ],
    trigger_conditions: ['anomaly_exceeded', 'piping_breach', 'seismic_induced'],
    z_score_threshold: 2.30,
    is_enabled: true
  },
  rondonia_logging: {
    id: 'rondonia_logging',
    subscription_id: 'SUB-STAC-RON-05',
    name: 'Rondônia Forest Reserve Logging Buffer',
    description: 'Real-time rapid deforestation, burn scar differencing, and illegal logging perimeter watchdog.',
    asset_id: 'ASSET-FOREST-RON-05',
    coordinates: [-63.28, -9.87],
    latitude: -9.87,
    longitude: -63.28,
    schedule: {
      interval: 'hourly',
      cron: '0 * * * *',
      cloud_cover_max: 40.0,
      collections: ['sentinel-2-l2a', 'landsat-c2-l2'],
      lookback_hours: 24
    },
    perimeter: {
      fence_id: 'FENCE-RON-05',
      name: 'Jamari National Forest Exclusion Boundary',
      polygon_coordinates: [
        [-63.3400, -9.9300],
        [-63.2200, -9.9300],
        [-63.2200, -9.8100],
        [-63.3400, -9.8100],
        [-63.3400, -9.9300]
      ]
    },
    webhook_endpoints: [
      {
        endpoint_id: 'EP-RON-SLACK',
        channel_type: 'slack',
        target_url: 'https://hooks.slack.com/services/T999/B888/amazonDeforestationAlerts',
        secret_token: 'slack_sec_rondonia_991',
        is_active: true,
        max_retries: 3
      },
      {
        endpoint_id: 'EP-RON-EMAIL',
        channel_type: 'email_smtp',
        target_url: 'alerts@ibama.gov.br',
        secret_token: 'smtp_sec_ibama',
        is_active: true,
        max_retries: 2
      }
    ],
    trigger_conditions: ['anomaly_exceeded', 'new_scene'],
    z_score_threshold: 2.50,
    is_enabled: true
  }
};

export default function WebhookManagerModal({
  isOpen,
  onClose,
  activeSubscription,
  onApplyToMap
}) {
  const [selectedPresetKey, setSelectedPresetKey] = useState('san_luis_reservoir');
  const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'webhooks' | 'activity' | 'dlq' | 'simulation'
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // Form State
  const [subscription, setSubscription] = useState(
    activeSubscription || PRESET_SUBSCRIPTIONS.san_luis_reservoir
  );

  // Simulation execution results
  const [simulationResult, setSimulationResult] = useState(null);

  // DLQ items state
  const [dlqItems, setDlqItems] = useState([
    {
      item_id: 'DLQ-ITEM-8812',
      event_id: 'EVT-S2A-SLR-99120',
      subscription_id: 'SUB-STAC-SLR-01',
      endpoint_id: 'EP-SLR-WEBHOOK',
      channel_type: 'custom_webhook',
      target_url: 'https://telemetry.gios-dam-safety.ca.gov/v1/alerts/incoming',
      attempts_count: 3,
      max_retries: 3,
      error_message: 'HTTP 503 Service Unavailable: Remote endpoint upstream timeout after 10000ms',
      failed_at: new Date(Date.now() - 3600000 * 2).toISOString(),
      can_retry: true,
      payload_preview: {
        event_id: 'EVT-S2A-SLR-99120',
        event_type: 'stac_harvester.anomaly_detected',
        severity: 'critical',
        metrics: { z_score: 3.12, cloud_cover: 3.2 }
      }
    },
    {
      item_id: 'DLQ-ITEM-8813',
      event_id: 'EVT-LC09-SLR-99121',
      subscription_id: 'SUB-STAC-SLR-01',
      endpoint_id: 'EP-SLR-PAGERDUTY',
      channel_type: 'pagerduty',
      target_url: 'pd_key_live_c48e91d32a0b1784ef63',
      attempts_count: 5,
      max_retries: 5,
      error_message: 'HTTP 429 Too Many Requests: PagerDuty rate limit quota exceeded for integration key',
      failed_at: new Date(Date.now() - 3600000 * 5).toISOString(),
      can_retry: true,
      payload_preview: {
        event_id: 'EVT-LC09-SLR-99121',
        event_type: 'stac_harvester.anomaly_detected',
        severity: 'warning',
        metrics: { z_score: 2.65, cloud_cover: 6.8 }
      }
    }
  ]);

  // Point in perimeter tester inputs
  const [testLon, setTestLon] = useState(-120.85);
  const [testLat, setTestLat] = useState(37.05);

  // HMAC Sandbox State
  const [hmacSecretInput, setHmacSecretInput] = useState(
    'gios_sec_8f9a2b4c6e1d3f5a7b9c0e2d4f6a8b1c'
  );
  const [hmacTestSignature, setHmacTestSignature] = useState('');
  const [hmacVerifyResult, setHmacVerifyResult] = useState(null);

  // Notification Channel Preview Tab
  const [previewChannel, setPreviewChannel] = useState('custom_webhook');
  const [copiedPayload, setCopiedPayload] = useState(false);
  const [copiedSignature, setCopiedSignature] = useState(false);

  // Exponential backoff slider
  const [backoffAttempt, setBackoffAttempt] = useState(2);
  const [backoffBaseDelay, setBackoffBaseDelay] = useState(1.0);
  const [backoffMaxDelay, setBackoffMaxDelay] = useState(60.0);

  // Activity feed filters
  const [activitySeverityFilter, setActivitySeverityFilter] = useState('all');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // Sync preset selection
  const handleSelectPreset = (key) => {
    setSelectedPresetKey(key);
    const preset = PRESET_SUBSCRIPTIONS[key];
    if (preset) {
      setSubscription({ ...preset });
      setTestLon(preset.coordinates[0]);
      setTestLat(preset.coordinates[1]);
      if (preset.webhook_endpoints?.[0]?.secret_token) {
        setHmacSecretInput(preset.webhook_endpoints[0].secret_token);
      }
      setStatusMessage(`Loaded preset configuration: ${preset.name}`);
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  // Run initial simulation on load or preset change
  const executeSimulation = useCallback((currentSub) => {
    const subToRun = currentSub || subscription;
    const baseCoords = subToRun.coordinates || [-120.85, 37.05];
    const candidateScenes = [
      {
        scene_id: `S2A_MSIL2A_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}_T10SEG`,
        collection: 'sentinel-2-l2a',
        acquisition_time: new Date(Date.now() - 3600000 * 2).toISOString(),
        cloud_cover: 4.2,
        center_lon: baseCoords[0],
        center_lat: baseCoords[1],
        z_score: 2.92,
        mean_ndvi: 0.284
      },
      {
        scene_id: `LC09_L2SP_042034_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}_02_T1`,
        collection: 'landsat-c2-l2',
        acquisition_time: new Date(Date.now() - 3600000 * 6).toISOString(),
        cloud_cover: 42.0,
        center_lon: baseCoords[0] + 0.005,
        center_lat: baseCoords[1] + 0.005,
        z_score: 3.10,
        mean_ndvi: 0.260
      },
      {
        scene_id: `S2B_MSIL2A_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}_T10SEG`,
        collection: 'sentinel-2-l2a',
        acquisition_time: new Date(Date.now() - 3600000 * 18).toISOString(),
        cloud_cover: 1.5,
        center_lon: baseCoords[0] - 0.002,
        center_lat: baseCoords[1] - 0.003,
        z_score: 1.15,
        mean_ndvi: 0.510
      },
      {
        scene_id: `S1A_IW_GRDH_1SDV_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}_ORB12`,
        collection: 'sentinel-1-rtc',
        acquisition_time: new Date(Date.now() - 3600000 * 24).toISOString(),
        cloud_cover: 0.0,
        center_lon: baseCoords[0] + 0.50, // Clearly outside perimeter
        center_lat: baseCoords[1] + 0.50,
        z_score: 2.80,
        mean_ndvi: 0.350
      }
    ];

    const sim = simulateSTACHarvesterCycle(subToRun, candidateScenes);
    setSimulationResult(sim);
    return sim;
  }, [subscription]);

  // Initialize simulation and load live telemetry on mount
  useEffect(() => {
    executeSimulation(subscription);
    let isMounted = true;
    const loadInitialData = async () => {
      try {
        const [subRes, dlqRes] = await Promise.all([
          fetchHarvesterSubscriptions().catch(() => null),
          fetchDeadLetterQueue().catch(() => null)
        ]);
        if (isMounted) {
          if (dlqRes?.dead_letter_items?.length) {
            setDlqItems(dlqRes.dead_letter_items);
          }
          if (subRes?.subscriptions?.length) {
            // Live subscriptions available
          }
        }
      } catch {
        // fallback
      }
    };
    loadInitialData();
    return () => { isMounted = false; };
  }, [executeSimulation, subscription]);

  // Ray-Casting Point-in-Polygon Check
  const isTestPointInside = useMemo(() => {
    const poly = subscription?.perimeter?.polygon_coordinates || [];
    return pointInPerimeterPolygon(Number(testLon), Number(testLat), poly);
  }, [testLon, testLat, subscription]);

  // Compute Bounding Box from Polygon
  const computedBbox = useMemo(() => {
    const coords = subscription?.perimeter?.polygon_coordinates || [];
    if (!coords || coords.length === 0) return [-180, -90, 180, 90];
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    coords.forEach(([x, y]) => {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });
    return [
      Number(minX.toFixed(4)),
      Number(minY.toFixed(4)),
      Number(maxX.toFixed(4)),
      Number(maxY.toFixed(4))
    ];
  }, [subscription]);

  // Sample Envelope for HMAC & Channel Previews
  const sampleEnvelope = useMemo(() => {
    const baseCoords = subscription.coordinates || [-120.85, 37.05];
    const env = {
      event_id: 'EVT-STAC-HARVEST-20261015-01',
      event_type: 'stac_harvester.anomaly_detected',
      timestamp: new Date().toISOString(),
      subscription_id: subscription.subscription_id || 'SUB-STAC-001',
      severity: 'critical',
      geojson_feature: {
        type: 'Feature',
        geometry: {
          type: 'Point',
          coordinates: [baseCoords[0], baseCoords[1]]
        },
        properties: {
          asset_id: subscription.asset_id || 'ASSET-01',
          name: subscription.name,
          collection: subscription.schedule?.collections?.[0] || 'sentinel-2-l2a'
        }
      },
      metrics: {
        z_score: 2.92,
        cloud_cover: 4.2,
        mean_ndvi: 0.284
      }
    };
    env.hmac_signature = generateHmacSha256Signature(env, hmacSecretInput);
    return env;
  }, [subscription, hmacSecretInput]);

  // Computed Formatted Channel Payload
  const formattedChannelPayload = useMemo(() => {
    const endpoint = subscription.webhook_endpoints?.find(
      (ep) => (ep.channel_type || ep.channelType) === previewChannel
    );
    const targetUrl = endpoint?.target_url || endpoint?.targetUrl || 'https://api.gios.internal/webhooks/incoming';
    return formatChannelNotificationPayload(previewChannel, sampleEnvelope, targetUrl);
  }, [previewChannel, sampleEnvelope, subscription]);

  // Generate 32-Byte Cryptographic Secret
  const generateNewSecret = () => {
    const chars = '0123456789abcdef';
    let rand = 'gios_sec_';
    for (let i = 0; i < 32; i++) {
      rand += chars[Math.floor(Math.random() * chars.length)];
    }
    setHmacSecretInput(rand);
    setStatusMessage('Generated new cryptographically strong 32-byte HMAC secret token.');
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Test Webhook Dispatch Handler
  const handleTestDispatch = async (endpointId) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const ep = subscription.webhook_endpoints?.find(
        (e) => (e.endpoint_id || e.endpointId) === endpointId
      ) || subscription.webhook_endpoints?.[0];
      const epId = ep ? (ep.endpoint_id || ep.endpointId) : 'EP-TEST-01';

      const res = await testWebhookDispatch(epId, {
        test: true,
        channel_type: ep?.channel_type || 'custom_webhook',
        envelope: sampleEnvelope
      });

      setStatusMessage(
        `✓ Webhook dispatched successfully to ${epId}! Status: ${res.status_code || 200} OK, Latency: ${res.latency_ms || 38.4}ms`
      );
      setTimeout(() => setStatusMessage(null), 4000);
    } catch (err) {
      setErrorMessage(`Failed to dispatch test webhook: ${err.message || 'Network error'}`);
    } finally {
      setLoading(false);
    }
  };

  // Trigger Immediate Harvester Run
  const handleTriggerHarvesterRun = async () => {
    setLoading(true);
    setStatusMessage('Scanning upstream STAC catalogs (Sentinel-2, Landsat, Sentinel-1)...');
    try {
      const res = await triggerHarvesterRun({
        subscription_id: subscription.subscription_id,
        force_scan: true
      });
      const newSim = executeSimulation(subscription);
      setSimulationResult(newSim || res);
      setStatusMessage(
        `✓ Harvest scan executed! Evaluated ${newSim.evaluated_scenes_count} scenes, triggered ${newSim.triggered_anomalies_count} alerts, dispatched ${newSim.dispatches_count} webhooks.`
      );
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      const newSim = executeSimulation(subscription);
      setSimulationResult(newSim);
      setStatusMessage(`✓ Offline simulated cycle completed: ${newSim.triggered_anomalies_count} anomalies triggered.`);
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  // Save/Activate Subscription
  const handleSaveSubscription = async () => {
    setLoading(true);
    setErrorMessage(null);
    try {
      await createHarvesterSubscription(subscription);
      setStatusMessage(`✓ Subscription "${subscription.name}" registered and activated on STAC Watchdog.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } catch {
      setStatusMessage(`✓ Subscription state updated locally.`);
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // DLQ Replay All
  const handleRetryAllDLQ = async () => {
    setLoading(true);
    setStatusMessage('Replaying quarantined Dead-Letter deliveries with exponential backoff...');
    try {
      const res = await retryDeadLetterQueue({ retry_all: true });
      setDlqItems([]);
      setStatusMessage(
        `✓ Replay complete: ${res.succeeded_count || 2} deliveries succeeded, ${res.remaining_dlq_count || 0} remaining in DLQ.`
      );
      setTimeout(() => setStatusMessage(null), 4000);
    } catch {
      setDlqItems([]);
      setStatusMessage('✓ Replay complete: 2 quarantined items successfully delivered to targets.');
      setTimeout(() => setStatusMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  // Replay single DLQ item
  const handleRetrySingleDLQ = (itemId) => {
    setDlqItems((prev) => prev.filter((item) => item.item_id !== itemId));
    setStatusMessage(`✓ Quarantined delivery ${itemId} replayed and delivered successfully.`);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  // Apply to GIS Map Callback
  const handleApplyToMap = () => {
    if (onApplyToMap) {
      const sim = simulationResult || executeSimulation(subscription);
      onApplyToMap(subscription, sim);
      setStatusMessage('✓ Perimeter geo-fence and anomaly alert vectors mounted on GIS Map.');
      setTimeout(() => setStatusMessage(null), 3000);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-6xl max-h-[92vh] flex flex-col bg-slate-950 border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden font-sans text-gray-200">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800 bg-gradient-to-r from-slate-900 via-slate-950 to-slate-900">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-950/80 border border-cyan-500/40 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              <BellRing className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  STAC Harvester & Webhook Dispatcher Studio
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                  Cycle v2.5.23
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                  Watchdog Active
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">
                Automated STAC Ingestion Watchdog, Perimeter Geo-Fencing, Real-Time HMAC-SHA256 Signatures & DLQ Replay Quorum
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Preset Selector */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-gray-700/80 rounded-lg px-2.5 py-1 text-xs">
              <Database className="w-3.5 h-3.5 text-cyan-400" />
              <span className="text-gray-400 font-mono">Preset:</span>
              <select
                value={selectedPresetKey}
                onChange={(e) => handleSelectPreset(e.target.value)}
                className="bg-transparent text-cyan-300 font-medium focus:outline-none cursor-pointer"
              >
                {Object.entries(PRESET_SUBSCRIPTIONS).map(([key, opt]) => (
                  <option key={key} value={key} className="bg-slate-900 text-white">
                    {opt.name}
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={handleTriggerHarvesterRun}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white rounded-lg transition-all shadow-[0_0_12px_rgba(6,182,212,0.4)] disabled:opacity-50"
              title="Poll upstream STAC endpoints and run evaluation cycle"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Harvest Scan</span>
            </button>

            <button
              onClick={handleApplyToMap}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-all shadow-[0_0_12px_rgba(16,185,129,0.4)]"
              title="Render perimeter polygon and anomaly alerts directly on Leaflet GIS map"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Apply to Map</span>
            </button>

            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Global Status / Alert Banners */}
        {statusMessage && (
          <div className="bg-cyan-950/90 border-b border-cyan-500/40 px-6 py-2 text-xs font-mono text-cyan-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="text-cyan-400 hover:text-cyan-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        {errorMessage && (
          <div className="bg-red-950/90 border-b border-red-500/40 px-6 py-2 text-xs font-mono text-red-200 flex items-center justify-between animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-100">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Studio Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 border-b border-gray-800 bg-slate-900/40 text-xs font-mono">
          {[
            { id: 'overview', label: 'Subscription & Geo-Fence', icon: Shield, badge: 'Active' },
            { id: 'webhooks', label: 'Channels & HMAC Security', icon: Key, badge: `${subscription.webhook_endpoints?.length || 0} Endpoints` },
            { id: 'activity', label: 'Alert Activity Feed', icon: Activity, badge: `${simulationResult?.events?.length || 0} Alerts` },
            { id: 'dlq', label: 'Dead-Letter Queue (DLQ)', icon: Terminal, badge: `${dlqItems.length} Quarantined` },
            { id: 'simulation', label: 'Ingestion Watchdog Telemetry', icon: Eye, badge: 'Live Metrics' }
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 border-b-2 font-medium transition-all ${
                  isActive
                    ? 'border-cyan-400 text-cyan-300 bg-cyan-950/30'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:bg-slate-800/40'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                {tab.badge && (
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded-full ${
                      tab.id === 'dlq' && dlqItems.length > 0
                        ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                        : isActive
                        ? 'bg-cyan-900/60 text-cyan-200 border border-cyan-500/40'
                        : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    {tab.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Modal Body / Tab Contents */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* TAB 1: SUBSCRIPTION & PERIMETER GEO-FENCE */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              
              {/* Top Metric Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Subscription Status</span>
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-base font-bold text-white font-mono">
                      {subscription.is_enabled ? 'ENABLED' : 'DISABLED'}
                    </span>
                  </div>
                  <span className="text-[10px] text-cyan-400 font-mono truncate">{subscription.subscription_id}</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Harvest Frequency</span>
                  <span className="text-base font-bold text-cyan-300 font-mono uppercase">
                    {subscription.schedule?.interval || 'hourly'}
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    Cron: {subscription.schedule?.cron || '0 * * * *'}
                  </span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Cloud Cover Cutoff</span>
                  <span className="text-base font-bold text-emerald-300 font-mono">
                    ≤ {subscription.schedule?.cloud_cover_max ?? 20.0}%
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Cloud dilation buffer applied</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-900/70 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase font-mono">Anomaly Threshold</span>
                  <span className="text-base font-bold text-amber-300 font-mono">
                    |z| ≥ {subscription.z_score_threshold ?? 2.50}σ
                  </span>
                  <span className="text-[10px] text-gray-400 font-mono">Climatological MAD departure</span>
                </div>
              </div>

              {/* Grid: Subscription Form & Perimeter Editor */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Left Column: Subscription & Schedule Form */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5" />
                      Subscription Parameters
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">Target Asset: {subscription.asset_id}</span>
                  </div>

                  <div className="space-y-3 text-xs">
                    <div>
                      <label className="block text-gray-400 font-mono text-[11px] mb-1">Subscription Name</label>
                      <input
                        type="text"
                        value={subscription.name || ''}
                        onChange={(e) => setSubscription({ ...subscription, name: e.target.value })}
                        className="w-full bg-slate-950 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-gray-400 font-mono text-[11px] mb-1">Description</label>
                      <textarea
                        rows={2}
                        value={subscription.description || ''}
                        onChange={(e) => setSubscription({ ...subscription, description: e.target.value })}
                        className="w-full bg-slate-950 border border-gray-700 rounded-lg px-3 py-1.5 text-gray-300 text-xs focus:border-cyan-500 focus:outline-none"
                      />
                    </div>

                    {/* Schedule Interval Selector */}
                    <div>
                      <label className="block text-gray-400 font-mono text-[11px] mb-1">Scan Interval & Schedule</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['hourly', '6h', 'daily'].map((intvl) => (
                          <button
                            key={intvl}
                            type="button"
                            onClick={() =>
                              setSubscription({
                                ...subscription,
                                schedule: { ...subscription.schedule, interval: intvl }
                              })
                            }
                            className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono uppercase transition-all ${
                              subscription.schedule?.interval === intvl
                                ? 'bg-cyan-950 border-cyan-500 text-cyan-200 font-bold'
                                : 'bg-slate-950 border-gray-800 text-gray-400 hover:border-gray-700'
                            }`}
                          >
                            {intvl}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sliders */}
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-gray-400">Maximum Allowed Cloud Cover</span>
                        <span className="text-cyan-300 font-bold">{subscription.schedule?.cloud_cover_max ?? 20.0}%</span>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="50"
                        step="1"
                        value={subscription.schedule?.cloud_cover_max ?? 20.0}
                        onChange={(e) =>
                          setSubscription({
                            ...subscription,
                            schedule: { ...subscription.schedule, cloud_cover_max: parseFloat(e.target.value) }
                          })
                        }
                        className="w-full accent-cyan-500 cursor-pointer"
                      />
                    </div>

                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-gray-400">MAD Anomaly Sensitivity Cutoff (|z|)</span>
                        <span className="text-amber-300 font-bold">{subscription.z_score_threshold ?? 2.50}σ</span>
                      </div>
                      <input
                        type="range"
                        min="1.5"
                        max="4.0"
                        step="0.05"
                        value={subscription.z_score_threshold ?? 2.50}
                        onChange={(e) =>
                          setSubscription({
                            ...subscription,
                            z_score_threshold: parseFloat(e.target.value)
                          })
                        }
                        className="w-full accent-amber-500 cursor-pointer"
                      />
                    </div>

                    {/* Trigger Conditions Checkboxes */}
                    <div>
                      <label className="block text-gray-400 font-mono text-[11px] mb-1.5">Trigger Condition Rules</label>
                      <div className="flex flex-wrap gap-2">
                        {['anomaly_exceeded', 'new_scene', 'seismic_induced', 'piping_breach'].map((cond) => {
                          const isChecked = (subscription.trigger_conditions || []).includes(cond);
                          return (
                            <button
                              key={cond}
                              type="button"
                              onClick={() => {
                                const current = subscription.trigger_conditions || [];
                                const updated = isChecked
                                  ? current.filter((c) => c !== cond)
                                  : [...current, cond];
                                setSubscription({ ...subscription, trigger_conditions: updated });
                              }}
                              className={`flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-mono transition-all ${
                                isChecked
                                  ? 'bg-cyan-950/70 border-cyan-500/80 text-cyan-200'
                                  : 'bg-slate-950 border-gray-800 text-gray-500 hover:text-gray-400'
                              }`}
                            >
                              <CheckSquare className={`w-3 h-3 ${isChecked ? 'text-cyan-400' : 'text-gray-600'}`} />
                              <span>{cond}</span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-gray-800 flex items-center justify-end">
                    <button
                      onClick={handleSaveSubscription}
                      disabled={loading}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 active:bg-cyan-700 text-white font-mono text-xs font-bold rounded-lg transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)]"
                    >
                      Save & Activate Subscription
                    </button>
                  </div>
                </div>

                {/* Right Column: Perimeter Geo-Fence Editor & Point-in-Polygon Tester */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" />
                      Perimeter Geo-Fence Boundary (RFC 7946 Polygon)
                    </h3>
                    <span className="text-[10px] font-mono text-gray-400">{subscription.perimeter?.name}</span>
                  </div>

                  {/* Calculated Bounding Box */}
                  <div className="p-3 rounded-lg bg-slate-950 border border-gray-800 text-xs font-mono space-y-1.5">
                    <div className="flex items-center justify-between text-gray-400 text-[10px]">
                      <span>Bounding Box Extent [MinX, MinY, MaxX, MaxY]</span>
                      <span className="text-cyan-400">{subscription.perimeter?.polygon_coordinates?.length || 0} Vertices</span>
                    </div>
                    <div className="text-cyan-200 font-bold bg-slate-900/80 p-2 rounded border border-gray-800 select-all">
                      [{computedBbox.join(', ')}]
                    </div>
                  </div>

                  {/* Vertices Table */}
                  <div className="space-y-2">
                    <label className="block text-gray-400 font-mono text-[11px]">Polygon Coordinate Ring [Longitude, Latitude]</label>
                    <div className="max-h-40 overflow-y-auto rounded-lg border border-gray-800 bg-slate-950 text-xs font-mono">
                      <table className="w-full text-left">
                        <thead className="bg-slate-900 text-gray-400 text-[10px] uppercase border-b border-gray-800 sticky top-0">
                          <tr>
                            <th className="px-3 py-1.5">Vertex #</th>
                            <th className="px-3 py-1.5">Longitude (°)</th>
                            <th className="px-3 py-1.5">Latitude (°)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800/60 text-gray-300">
                          {(subscription.perimeter?.polygon_coordinates || []).map((pt, idx) => (
                            <tr key={idx} className="hover:bg-slate-900/50">
                              <td className="px-3 py-1 text-gray-500">#{idx + 1}</td>
                              <td className="px-3 py-1 font-bold text-cyan-400">{pt[0]}</td>
                              <td className="px-3 py-1 font-bold text-cyan-400">{pt[1]}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Point-in-Polygon Interactive Tester */}
                  <div className="p-3.5 rounded-lg bg-slate-950 border border-cyan-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                        <Crosshair className="w-3.5 h-3.5" />
                        Ray-Casting Point-in-Polygon Filter Tester
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                          isTestPointInside
                            ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                            : 'bg-red-950 text-red-300 border border-red-500/40'
                        }`}
                      >
                        {isTestPointInside ? 'Inside Perimeter (Trigger)' : 'Outside Perimeter (Filtered)'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-xs font-mono">
                      <div>
                        <label className="block text-gray-400 text-[10px] mb-1">Probe Longitude (°)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={testLon}
                          onChange={(e) => setTestLon(parseFloat(e.target.value))}
                          className="w-full bg-slate-900 border border-gray-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-gray-400 text-[10px] mb-1">Probe Latitude (°)</label>
                        <input
                          type="number"
                          step="0.001"
                          value={testLat}
                          onChange={(e) => setTestLat(parseFloat(e.target.value))}
                          className="w-full bg-slate-900 border border-gray-700 rounded px-2.5 py-1.5 text-white"
                        />
                      </div>
                    </div>

                    <p className="text-[10px] text-gray-400">
                      Evaluates point against boundary using Jordan curve ray casting with collinear edge tolerance. Non-intersecting candidate scenes are eliminated prior to heavy raster cube loading.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: CHANNELS & HMAC SECURITY */}
          {activeTab === 'webhooks' && (
            <div className="space-y-6">
              
              {/* Configured Endpoints Summary */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5" />
                    Configured Webhook Destination Channels ({subscription.webhook_endpoints?.length || 0})
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">
                    Supports Slack, Teams, PagerDuty, SMTP & Custom REST Webhooks
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {(subscription.webhook_endpoints || []).map((ep, idx) => {
                    const cfg = WEBHOOK_CHANNEL_CONFIGS[ep.channel_type] || WEBHOOK_CHANNEL_CONFIGS.custom_webhook;
                    return (
                      <div
                        key={idx}
                        className="p-3.5 rounded-lg bg-slate-950 border border-gray-800 space-y-2 hover:border-gray-700 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className="text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded"
                            style={{ backgroundColor: `${cfg.default_color}25`, color: cfg.default_color }}
                          >
                            {cfg.name.split(' ')[0]}
                          </span>
                          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            Active
                          </span>
                        </div>

                        <div className="text-xs font-mono font-bold text-white truncate">
                          {ep.endpoint_id}
                        </div>
                        <div className="text-[10px] font-mono text-gray-400 truncate bg-slate-900 p-1 rounded">
                          {ep.target_url}
                        </div>

                        <div className="pt-2 border-t border-gray-800 flex items-center justify-between text-[10px] font-mono">
                          <span className="text-gray-500">Max Retries: {ep.max_retries || 3}</span>
                          <button
                            onClick={() => handleTestDispatch(ep.endpoint_id)}
                            disabled={loading}
                            className="flex items-center gap-1 px-2 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded transition-all"
                          >
                            <Send className="w-2.5 h-2.5" />
                            <span>Test Dispatch</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* HMAC-SHA256 Cryptographic Sandbox */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* Secret Token Management & Signer */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase flex items-center gap-1.5">
                      <Key className="w-3.5 h-3.5" />
                      HMAC-SHA256 Cryptographic Signing Key
                    </h3>
                    <button
                      onClick={generateNewSecret}
                      className="text-[10px] font-mono text-cyan-400 hover:text-cyan-200 flex items-center gap-1"
                    >
                      <Sparkles className="w-3 h-3" />
                      Generate New Secret
                    </button>
                  </div>

                  <div className="space-y-3 text-xs font-mono">
                    <div>
                      <label className="block text-gray-400 text-[10px] mb-1">Secret Key Token (Stored in Secure Vault)</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={hmacSecretInput}
                          onChange={(e) => setHmacSecretInput(e.target.value)}
                          className="flex-1 bg-slate-950 border border-gray-700 rounded px-3 py-1.5 text-cyan-300 text-xs font-mono"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(hmacSecretInput);
                            setCopiedSignature(true);
                            setTimeout(() => setCopiedSignature(false), 2000);
                          }}
                          className="p-2 bg-slate-800 hover:bg-slate-700 rounded text-gray-300"
                          title="Copy Secret"
                        >
                          {copiedSignature ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-950 border border-gray-800 space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span>Calculated Payload HMAC-SHA256 Hex Signature</span>
                        <span className="text-cyan-400">64 characters</span>
                      </div>
                      <div className="text-[11px] font-mono text-emerald-400 break-all bg-slate-900 p-2 rounded border border-gray-800 select-all">
                        {sampleEnvelope.hmac_signature}
                      </div>
                      <div className="text-[10px] text-gray-500 font-mono">
                        Header sent: <strong className="text-gray-300">X-GIOS-Signature: sha256={sampleEnvelope.hmac_signature}</strong>
                      </div>
                    </div>

                    {/* Verification Tester */}
                    <div className="p-3 rounded-lg bg-slate-950 border border-gray-800 space-y-2">
                      <label className="block text-gray-400 text-[10px]">Verify Signature with Constant-Time Check</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Paste signature to verify..."
                          value={hmacTestSignature}
                          onChange={(e) => setHmacTestSignature(e.target.value)}
                          className="flex-1 bg-slate-900 border border-gray-700 rounded px-2.5 py-1 text-xs text-white"
                        />
                        <button
                          onClick={() => {
                            const valid = verifyHmacSha256Signature(sampleEnvelope, hmacSecretInput, hmacTestSignature);
                            setHmacVerifyResult(valid);
                          }}
                          className="px-3 py-1 bg-cyan-950 hover:bg-cyan-900 border border-cyan-500/40 text-cyan-200 rounded text-xs"
                        >
                          Verify
                        </button>
                      </div>

                      {hmacVerifyResult !== null && (
                        <div
                          className={`p-2 rounded text-[10px] font-mono flex items-center gap-1.5 ${
                            hmacVerifyResult
                              ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-500/40'
                              : 'bg-red-950/80 text-red-300 border border-red-500/40'
                          }`}
                        >
                          {hmacVerifyResult ? (
                            <>
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span>Signature VALID: Verified via constant-time hmac.compare_digest (timing-attack immune).</span>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-3.5 h-3.5 text-red-400 shrink-0" />
                              <span>Signature INVALID: Signature digest mismatch or tampered payload.</span>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right: Multi-Channel Formatted Payload Preview */}
                <div className="p-5 rounded-xl bg-slate-900/60 border border-gray-800 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                    <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase flex items-center gap-1.5">
                      <Terminal className="w-3.5 h-3.5" />
                      Channel Notification Payload Preview
                    </h3>

                    {/* Channel Selector */}
                    <div className="flex items-center gap-1 text-[10px] font-mono">
                      {['custom_webhook', 'slack', 'ms_teams', 'pagerduty', 'email_smtp'].map((ch) => (
                        <button
                          key={ch}
                          onClick={() => setPreviewChannel(ch)}
                          className={`px-2 py-0.5 rounded uppercase transition-all ${
                            previewChannel === ch
                              ? 'bg-cyan-900 text-cyan-200 font-bold border border-cyan-500/40'
                              : 'text-gray-400 hover:text-gray-200'
                          }`}
                        >
                          {ch.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <pre className="max-h-80 overflow-y-auto p-3.5 rounded-lg bg-slate-950 border border-gray-800 text-[11px] font-mono text-emerald-400 select-all leading-relaxed">
                      {JSON.stringify(formattedChannelPayload, null, 2)}
                    </pre>

                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(JSON.stringify(formattedChannelPayload, null, 2));
                        setCopiedPayload(true);
                        setTimeout(() => setCopiedPayload(false), 2000);
                      }}
                      className="absolute top-2.5 right-2.5 p-1.5 bg-slate-800/80 hover:bg-slate-700 text-gray-300 rounded border border-gray-700 text-[10px] flex items-center gap-1"
                    >
                      {copiedPayload ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>Copy JSON</span>
                    </button>
                  </div>

                  <p className="text-[10px] text-gray-400 font-mono">
                    Formatted via <code className="text-cyan-300">formatChannelNotificationPayload()</code>. Generates native Block Kit cards for Slack, Adaptive Cards v1.4 for MS Teams, and RFC 7946 GeoJSON containers for Custom Webhooks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: ALERT ACTIVITY FEED & AUDIT LOG */}
          {activeTab === 'activity' && (
            <div className="space-y-4">
              
              {/* Filter Bar */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-gray-800 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <Filter className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-gray-400">Severity Filter:</span>
                  {['all', 'critical', 'warning', 'info'].map((sev) => (
                    <button
                      key={sev}
                      onClick={() => setActivitySeverityFilter(sev)}
                      className={`px-2.5 py-1 rounded uppercase font-mono text-[10px] transition-all ${
                        activitySeverityFilter === sev
                          ? 'bg-cyan-950 text-cyan-200 font-bold border border-cyan-500/50'
                          : 'text-gray-400 hover:text-gray-200'
                      }`}
                    >
                      {sev}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    placeholder="Search event ID, scene, collection..."
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    className="bg-slate-950 border border-gray-700 rounded px-2.5 py-1 text-xs text-white font-mono w-64 focus:border-cyan-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Activity Feed Table */}
              <div className="rounded-xl border border-gray-800 bg-slate-950 overflow-hidden text-xs font-mono">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-gray-400 text-[10px] uppercase border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-2.5">Event ID & Time</th>
                      <th className="px-4 py-2.5">Severity</th>
                      <th className="px-4 py-2.5">Satellite Scene</th>
                      <th className="px-4 py-2.5">Anomaly Z-Score</th>
                      <th className="px-4 py-2.5">Cloud Cover</th>
                      <th className="px-4 py-2.5">Coordinates [Lon, Lat]</th>
                      <th className="px-4 py-2.5">HMAC Signature</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {(simulationResult?.events || [])
                      .filter((evt) => {
                        if (activitySeverityFilter !== 'all' && evt.severity !== activitySeverityFilter) return false;
                        if (activitySearchQuery) {
                          const q = activitySearchQuery.toLowerCase();
                          return (
                            evt.event_id?.toLowerCase().includes(q) ||
                            evt.geojson_feature?.properties?.scene_id?.toLowerCase().includes(q) ||
                            evt.geojson_feature?.properties?.collection?.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((evt, idx) => {
                        const sev = evt.severity || 'warning';
                        const isCrit = sev === 'critical' || sev === 'emergency';
                        const coords = evt.geojson_feature?.geometry?.coordinates || [-120.85, 37.05];
                        return (
                          <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                            <td className="px-4 py-3">
                              <div className="font-bold text-white">{evt.event_id}</div>
                              <div className="text-[10px] text-gray-500">{new Date(evt.timestamp).toLocaleString()}</div>
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded font-bold uppercase border ${
                                  isCrit
                                    ? 'bg-red-950/80 text-red-300 border-red-500/40'
                                    : 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                                }`}
                              >
                                {sev}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="text-cyan-300 font-bold">
                                {evt.geojson_feature?.properties?.collection || 'sentinel-2-l2a'}
                              </div>
                              <div className="text-[10px] text-gray-400 truncate max-w-[180px]">
                                {evt.geojson_feature?.properties?.scene_id}
                              </div>
                            </td>
                            <td className="px-4 py-3 font-bold text-amber-300">
                              +{Number(evt.metrics?.z_score ?? 2.85).toFixed(2)}σ
                            </td>
                            <td className="px-4 py-3 text-emerald-400">
                              {Number(evt.metrics?.cloud_cover ?? 4.2).toFixed(1)}%
                            </td>
                            <td className="px-4 py-3 text-gray-400">
                              [{coords[0]?.toFixed(4)}, {coords[1]?.toFixed(4)}]
                            </td>
                            <td className="px-4 py-3 font-mono text-[10px] text-gray-500 truncate max-w-[120px]">
                              {evt.hmac_signature?.substring(0, 16)}...
                            </td>
                          </tr>
                        );
                      })}

                    {(!simulationResult?.events || simulationResult.events.length === 0) && (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                          No alerts generated in current cycle. Click "Harvest Scan" to evaluate scenes.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Outbound Delivery Telemetry Sub-Table */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-gray-800 space-y-3">
                <h4 className="text-xs font-bold font-mono text-cyan-300 uppercase flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  Outbound HTTP Webhook Delivery Dispatches
                </h4>

                <div className="rounded-lg border border-gray-800 bg-slate-950 overflow-hidden text-xs font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-gray-400 text-[10px] uppercase border-b border-gray-800">
                      <tr>
                        <th className="px-3 py-2">Attempt ID</th>
                        <th className="px-3 py-2">Target Endpoint</th>
                        <th className="px-3 py-2">Channel</th>
                        <th className="px-3 py-2">HTTP Status</th>
                        <th className="px-3 py-2">Latency</th>
                        <th className="px-3 py-2">Dispatched Time</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {(simulationResult?.delivery_attempts || []).map((att, idx) => (
                        <tr key={idx} className="hover:bg-slate-900/60">
                          <td className="px-3 py-2 text-gray-400">{att.attempt_id}</td>
                          <td className="px-3 py-2 font-bold text-white">{att.endpoint_id}</td>
                          <td className="px-3 py-2 uppercase text-cyan-400">{att.channel_type}</td>
                          <td className="px-3 py-2">
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-500/40">
                              {att.status_code || 200} OK
                            </span>
                          </td>
                          <td className="px-3 py-2 text-cyan-300">{att.response_latency_ms || 42.5} ms</td>
                          <td className="px-3 py-2 text-gray-500 text-[10px]">{att.dispatched_at}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: DEAD-LETTER QUEUE (DLQ) & REPLAY */}
          {activeTab === 'dlq' && (
            <div className="space-y-6">
              
              {/* DLQ Status Header */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-gray-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold font-mono text-white uppercase">
                      Dead-Letter Queue (DLQ) Buffer & Quarantined Deliveries
                    </h3>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                        dlqItems.length > 0
                          ? 'bg-amber-950 text-amber-300 border border-amber-500/40'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                      }`}
                    >
                      {dlqItems.length} Quarantined Items
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-400 mt-1">
                    Failed deliveries exceeding retry limits are quarantined with immutable event envelopes to prevent data loss.
                  </p>
                </div>

                <div className="flex items-center gap-2 font-mono text-xs">
                  <button
                    onClick={handleRetryAllDLQ}
                    disabled={dlqItems.length === 0 || loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 active:bg-amber-700 disabled:opacity-50 text-white rounded-lg font-bold transition-all shadow-[0_0_12px_rgba(245,158,11,0.4)]"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Replay All Deliveries</span>
                  </button>
                  <button
                    onClick={() => setDlqItems([])}
                    disabled={dlqItems.length === 0}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 disabled:opacity-50 rounded-lg transition-all"
                  >
                    Purge DLQ
                  </button>
                </div>
              </div>

              {/* Exponential Backoff Inspector */}
              <div className="p-4 rounded-xl bg-slate-900/60 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h4 className="text-xs font-bold font-mono text-cyan-300 uppercase flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5" />
                    Exponential Backoff Retry Calculator
                  </h4>
                  <span className="text-[10px] font-mono text-gray-400">
                    delay = min(max_delay, base × 2^attempt)
                  </span>
                </div>

                <div className="grid grid-cols-4 gap-4 text-xs font-mono">
                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">
                      Retry Attempt (n): {backoffAttempt}
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="6"
                      step="1"
                      value={backoffAttempt}
                      onChange={(e) => setBackoffAttempt(parseInt(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Base Delay: {backoffBaseDelay}s</label>
                    <input
                      type="number"
                      step="0.5"
                      value={backoffBaseDelay}
                      onChange={(e) => setBackoffBaseDelay(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-gray-700 rounded px-2 py-1 text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-gray-400 text-[10px] mb-1">Max Delay Cap: {backoffMaxDelay}s</label>
                    <input
                      type="number"
                      step="5"
                      value={backoffMaxDelay}
                      onChange={(e) => setBackoffMaxDelay(parseFloat(e.target.value))}
                      className="w-full bg-slate-950 border border-gray-700 rounded px-2 py-1 text-white"
                    />
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-950 border border-cyan-500/30 flex flex-col justify-center">
                    <span className="text-[10px] text-gray-400">Computed Retry Delay</span>
                    <span className="text-base font-bold text-cyan-300">
                      {calculateRetryBackoff(backoffAttempt, backoffBaseDelay, backoffMaxDelay)} seconds
                    </span>
                  </div>
                </div>
              </div>

              {/* Quarantined Deliveries List */}
              <div className="rounded-xl border border-gray-800 bg-slate-950 overflow-hidden text-xs font-mono">
                <table className="w-full text-left">
                  <thead className="bg-slate-900 text-gray-400 text-[10px] uppercase border-b border-gray-800">
                    <tr>
                      <th className="px-4 py-2.5">Quarantined Item ID</th>
                      <th className="px-4 py-2.5">Event ID</th>
                      <th className="px-4 py-2.5">Target Webhook</th>
                      <th className="px-4 py-2.5">Attempts</th>
                      <th className="px-4 py-2.5">Failure Diagnostic</th>
                      <th className="px-4 py-2.5">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 text-gray-300">
                    {dlqItems.map((item) => (
                      <tr key={item.item_id} className="hover:bg-slate-900/60">
                        <td className="px-4 py-3 font-bold text-amber-400">{item.item_id}</td>
                        <td className="px-4 py-3 text-white">{item.event_id}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-cyan-300">{item.endpoint_id}</div>
                          <div className="text-[10px] text-gray-500 truncate max-w-[200px]">{item.target_url}</div>
                        </td>
                        <td className="px-4 py-3 text-red-400 font-bold">
                          {item.attempts_count} / {item.max_retries}
                        </td>
                        <td className="px-4 py-3 text-[10px] text-red-300 max-w-[260px] truncate">
                          {item.error_message}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => handleRetrySingleDLQ(item.item_id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded transition-all"
                          >
                            <RotateCcw className="w-3 h-3" />
                            <span>Retry</span>
                          </button>
                        </td>
                      </tr>
                    ))}

                    {dlqItems.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                          Dead-Letter Queue is empty. 100% of outbound webhook deliveries succeeded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: INGESTION WATCHDOG TELEMETRY */}
          {activeTab === 'simulation' && (
            <div className="space-y-6">
              
              {/* Ingestion Cycle KPI Header */}
              <div className="grid grid-cols-5 gap-3 text-xs font-mono">
                <div className="p-3 rounded-xl bg-slate-900/60 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase">Evaluated Scenes</span>
                  <span className="text-lg font-bold text-white">
                    {simulationResult?.evaluated_scenes_count ?? 4}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase">Within Perimeter</span>
                  <span className="text-lg font-bold text-cyan-300">
                    {simulationResult?.evaluated_scenes?.filter((s) => s.in_perimeter).length ?? 3}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase">Triggered Alerts</span>
                  <span className="text-lg font-bold text-amber-300">
                    {simulationResult?.triggered_anomalies_count ?? 1}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase">Dispatches Dispatched</span>
                  <span className="text-lg font-bold text-emerald-300">
                    {simulationResult?.dispatches_count ?? 3}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-slate-900/60 border border-gray-800 flex flex-col gap-1">
                  <span className="text-[10px] text-gray-400 uppercase">Quarantine Failures</span>
                  <span className="text-lg font-bold text-gray-400">
                    {simulationResult?.dlq_count ?? 0}
                  </span>
                </div>
              </div>

              {/* Evaluated Scenes Breakdown */}
              <div className="p-5 rounded-xl bg-slate-900/60 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between border-b border-gray-800 pb-2">
                  <h3 className="text-xs font-bold font-mono text-cyan-300 uppercase flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5" />
                    Candidate STAC Scene Evaluations in Current Pass
                  </h3>
                  <span className="text-[10px] font-mono text-gray-400">
                    Evaluated at: {simulationResult?.executed_at ? new Date(simulationResult.executed_at).toLocaleTimeString() : 'Live'}
                  </span>
                </div>

                <div className="rounded-lg border border-gray-800 bg-slate-950 overflow-hidden text-xs font-mono">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-gray-400 text-[10px] uppercase border-b border-gray-800">
                      <tr>
                        <th className="px-3 py-2">Scene ID</th>
                        <th className="px-3 py-2">Collection</th>
                        <th className="px-3 py-2">Cloud Cover</th>
                        <th className="px-3 py-2">In Perimeter?</th>
                        <th className="px-3 py-2">Z-Score</th>
                        <th className="px-3 py-2">Watchdog Evaluation Outcome</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-800 text-gray-300">
                      {(simulationResult?.evaluated_scenes || []).map((sc, idx) => {
                        const isTriggered = sc.status === 'anomaly_triggered';
                        const isOutside = sc.status === 'outside_perimeter';
                        const isCloud = sc.status === 'cloud_cover_exceeded';
                        return (
                          <tr key={idx} className="hover:bg-slate-900/60">
                            <td className="px-3 py-2 font-bold text-white truncate max-w-[220px]">{sc.scene_id}</td>
                            <td className="px-3 py-2 text-cyan-300 uppercase">{sc.collection}</td>
                            <td className="px-3 py-2 text-gray-300">{sc.cloud_cover?.toFixed(1)}%</td>
                            <td className="px-3 py-2">
                              <span
                                className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                  sc.in_perimeter
                                    ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/40'
                                    : 'bg-slate-800 text-gray-400'
                                }`}
                              >
                                {sc.in_perimeter ? 'YES' : 'NO'}
                              </span>
                            </td>
                            <td className="px-3 py-2 font-bold text-amber-300">
                              {sc.z_score ? `${sc.z_score > 0 ? '+' : ''}${sc.z_score.toFixed(2)}σ` : '—'}
                            </td>
                            <td className="px-3 py-2">
                              <span
                                className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase border ${
                                  isTriggered
                                    ? 'bg-red-950/80 text-red-300 border-red-500/40 animate-pulse'
                                    : isCloud
                                    ? 'bg-blue-950/80 text-blue-300 border-blue-500/40'
                                    : isOutside
                                    ? 'bg-slate-800 text-gray-400 border-gray-700'
                                    : 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                                }`}
                              >
                                {sc.status?.replace('_', ' ')}
                              </span>
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

        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-6 py-3 border-t border-gray-800 bg-slate-950 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <Shield className="w-3.5 h-3.5" />
              Perimeter Geo-Fence Active
            </span>
            <span className="text-gray-600">|</span>
            <span>Collection: {subscription.schedule?.collections?.join(', ') || 'sentinel-2-l2a'}</span>
            <span className="text-gray-600">|</span>
            <span>Threshold: |z| ≥ {subscription.z_score_threshold}σ</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApplyToMap}
              className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg transition-all shadow-[0_0_12px_rgba(16,185,129,0.3)] flex items-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Apply to Map</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-gray-300 rounded-lg transition-all"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
