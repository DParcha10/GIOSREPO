export const mockEvents = [
  {
    id: 'SEEPAGE-01',
    category: 'seepage',
    lat: 37.0582,
    lng: -121.0744,
    severity: 'critical',
    severity_label: 'HIGH HAZARD',
    title: 'San Luis Dam Embankment',
    subtitle: 'Santa Nella, CA | Subsurface Seepage',
    description: 'Pore-pressure and moisture anomaly detected along downstream toe following reservoir hydraulic cycling.',
    impact_area: '34.2 Hectares',
    peak_zscore: '+2.8 σ',
    sensor: 'Sentinel-2 L2A',
    metric: 'NDMI',
    usgs_station: '11270900'
  },
  {
    id: 'HAB-02',
    category: 'hab',
    lat: 41.762,
    lng: -83.21,
    severity: 'critical',
    severity_label: 'SEVERE BLOOM',
    title: 'Lake Erie Western Basin',
    subtitle: 'Toledo, OH | Microcystin Concentration',
    description: 'Widespread Harmful Algal Bloom expanding towards public water intake zones. High microcystin risk.',
    impact_area: '240.5 Sq Miles',
    peak_zscore: '+4.1 σ',
    sensor: 'Sentinel-3 OLCI',
    metric: 'NDCI',
    usgs_station: '04191500'
  },
  {
    id: 'INUNDATION-01',
    category: 'inundation',
    lat: 29.58,
    lng: -95.76,
    severity: 'warning',
    severity_label: 'ACTION STAGE',
    title: 'Lower Brazos River Basin',
    subtitle: 'Richmond, TX | Flash Flood Watch',
    description: 'River stage exceeding minor flood threshold due to consecutive intense rainfall events upstream.',
    impact_area: '8,420 Acres',
    peak_zscore: '+1.9 σ',
    sensor: 'Landsat-9 / Sentinel-1',
    metric: 'MNDWI',
    usgs_station: '08114000'
  }
];

export const mockInfrastructure = [
  { properties: { name: 'Pumping Plant A', type: 'Pump Station', status: 'Active' }, geometry: { coordinates: [-121.07, 37.06] } },
  { properties: { name: 'Substation 42', type: 'Electrical', status: 'Warning' }, geometry: { coordinates: [-121.065, 37.055] } },
];

export const mockDroneMissions = [
  { id: 'DRN-7A', status: 'In Progress', radius_km: 2.5, estimated_time_mins: 14, flight_path: [[37.0582, -121.0744], [37.06, -121.07], [37.062, -121.08]] }
];

export const mockTimeseries = {
  timeseries: [
    { timestamp: '2026-08-01', value: 0.1 },
    { timestamp: '2026-08-05', value: 0.15 },
    { timestamp: '2026-08-10', value: 0.3 },
    { timestamp: '2026-08-15', value: 0.6 },
    { timestamp: '2026-08-20', value: 0.8 },
    { timestamp: '2026-08-25', value: 0.95 },
  ]
};

export const mockUSGS = {
  station: '11270900',
  data: [
    { timestamp: '2026-08-01', value: 120 },
    { timestamp: '2026-08-05', value: 125 },
    { timestamp: '2026-08-10', value: 130 },
    { timestamp: '2026-08-15', value: 140 },
    { timestamp: '2026-08-20', value: 135 },
  ]
};

export const mockAgentChat = {
  response: "I've analyzed the geospatial telemetry. The NDMI indices show a stark increase in moisture content consistent with subsurface seepage. I recommend dispatching a drone mission immediately for thermal imaging validation."
};

// USGS FIREMON Section 4 Contract 2 Mock Data
export const mockBurnSeverity = {
  aoi_id: 'TAILINGS-04',
  pre_event_date: '2025-08-15',
  post_event_date: '2026-08-20',
  mean_dnbr: 0.482,
  mean_rdnbr: 0.612,
  burned_area_hectares: 1420.5,
  categories: [
    { category: 'High Severity', min_dnbr: 0.660, percentage: 28.4, hectares: 403.4 },
    { category: 'Moderate-High Severity', min_dnbr: 0.440, percentage: 34.1, hectares: 484.4 },
    { category: 'Moderate-Low Severity', min_dnbr: 0.270, percentage: 22.0, hectares: 312.5 },
    { category: 'Low Severity', min_dnbr: 0.100, percentage: 11.2, hectares: 159.1 },
    { category: 'Unburned / Low Change', min_dnbr: -0.100, percentage: 4.3, hectares: 61.1 }
  ],
  tile_url_template: '/api/v1/tiles/wildfire/dnbr/{z}/{x}/{y}.png?pre=2025-08-15&post=2026-08-20'
};

// Interactive Pixel Probe Section 4 Contract 3 Mock Data
export const mockPixelProbe = {
  coordinates: { latitude: 39.521, longitude: -121.482 },
  acquisition_date: '2026-08-20T18:42:11Z',
  surface_reflectance: {
    blue: 0.038,
    green: 0.052,
    red: 0.041,
    rededge1: 0.098,
    nir: 0.320,
    swir1: 0.142,
    swir2: 0.081
  },
  indices: {
    ndvi: 0.773,
    ndmi: 0.385,
    mndwi: -0.464,
    ndci: 0.410
  },
  climatological_context: {
    historical_august_median_ndmi: 0.210,
    seasonal_z_score: 2.84,
    anomaly_flag: 'HIGH_MOISTURE_ANOMALY'
  }
};

// Polygon Zonal Statistics Section 4 Contract 4 Mock Data
export const mockZonalStats = {
  index: 'ndmi',
  area_hectares: 384.2,
  valid_pixels: 38420,
  cloud_covered_pixels: 0,
  statistics: {
    mean: 0.312,
    median: 0.298,
    std_dev: 0.084,
    min: 0.051,
    max: 0.684,
    percentile_10: 0.182,
    percentile_90: 0.441
  },
  histogram: {
    bin_edges: [-0.2, -0.1, 0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7],
    counts: [0, 0, 210, 1420, 8900, 16400, 8500, 2800, 190]
  }
};

// Drone Orthomosaic Ingestion Metadata Mock Data
export const mockDroneOrthomosaic = {
  ortho_id: 'ORTHO-SLD-202609-01',
  filename: 'san_luis_dam_crest_ortho_cm.tif',
  crs: 'EPSG:3857',
  bounds: [-121.082, 37.054, -121.066, 37.062],
  metric_gsd_cm: 2.85,
  bands: 4,
  is_cog: true,
  status: 'READY'
};
