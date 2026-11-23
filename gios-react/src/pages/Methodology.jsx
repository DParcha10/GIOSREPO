import React from 'react';

const SOURCES = [
  ['Sentinel-2 L2A', 'ESA Copernicus', 'Surface reflectance, 13 bands', '10–20 m', '~5 days', 'Microsoft Planetary Computer (STAC + tiles)'],
  ['Sentinel-1 RTC', 'ESA Copernicus', 'C-band radar backscatter, VV and VH, terrain corrected', '10 m', '6–12 days', 'Microsoft Planetary Computer'],
  ['Copernicus DEM GLO-30', 'ESA / Airbus / DLR', 'Digital surface model (TanDEM-X)', '30 m', 'Static (2011–2015 acquisition)', 'Microsoft Planetary Computer'],
  ['USGS NWIS daily values', 'U.S. Geological Survey', 'Stream discharge (parameter 00060)', 'Point (gauge)', 'Daily', 'waterservices.usgs.gov (retiring Feb 2027)'],
  ['USGS earthquake feed', 'U.S. Geological Survey', 'Earthquakes M2.5+, past 24 h', 'Point (epicentre)', 'Every minute', 'earthquake.usgs.gov GeoJSON'],
  ['Basemaps', 'Esri', 'World Imagery, Light Gray, World Topographic', 'Varies', '—', 'ArcGIS Online tile services'],
];

const INDICES = [
  ['MNDWI', '(Green − SWIR1) / (Green + SWIR1)', '(B03 − B11) / (B03 + B11)', 'Open water above 0; less confused by built-up land than NDWI', 'Xu (2006)'],
  ['NDWI', '(Green − NIR) / (Green + NIR)', '(B03 − B08) / (B03 + B08)', 'Open water above 0', 'McFeeters (1996)'],
  ['NDVI', '(NIR − Red) / (NIR + Red)', '(B08 − B04) / (B08 + B04)', 'Green vegetation density', 'Rouse et al. (1974)'],
  ['NDMI', '(NIR − SWIR1) / (NIR + SWIR1)', '(B08 − B11) / (B08 + B11)', 'Vegetation and surface moisture; not meaningful over open water', 'Gao (1996)'],
  ['NDCI', '(RedEdge1 − Red) / (RedEdge1 + Red)', '(B05 − B04) / (B05 + B04)', 'Chlorophyll-a proxy in water; not a toxin measurement', 'Mishra & Mishra (2012)'],
  ['NBR', '(NIR − SWIR2) / (NIR + SWIR2)', '(B08 − B12) / (B08 + B12)', 'Burn severity when differenced', 'Key & Benson (2006)'],
];

function H2({ id, children }) {
  return <h2 id={id} className="font-serif text-2xl text-stone-50 mt-12 mb-3 scroll-mt-6">{children}</h2>;
}

function Table({ head, rows, mono = [] }) {
  return (
    <div className="overflow-x-auto border border-stone-800 rounded-[3px] bg-stone-900">
      <table className="w-full text-left text-[13.5px]">
        <thead>
          <tr className="text-[12px] text-stone-500 border-b border-stone-800">
            {head.map((h) => <th key={h} className="px-3 py-2 font-normal">{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[0]} className="border-t border-stone-800 align-top">
              {r.map((c, i) => <td key={i} className={`px-3 py-2 ${i === 0 ? 'text-stone-50' : 'text-stone-300'} ${mono.includes(i) ? 'font-mono text-[12.5px]' : ''}`}>{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Methodology() {
  const toc = [['sources', 'Data sources'], ['layers', 'Map layers'], ['indices', 'Spectral indices'], ['assessment', 'Site assessments'], ['series', 'Time series and agreement'], ['simulated', 'What is simulated'], ['limits', 'Known limitations'], ['credits', 'Licences and credits']];
  return (
    <div className="px-8 py-7 w-full max-w-6xl grid lg:grid-cols-[1fr_200px] gap-10">
      <article className="min-w-0 text-[15px] leading-relaxed text-stone-300">
        <h1 className="font-serif text-3xl text-stone-50">Methods</h1>
        <p className="mt-2 text-stone-400 max-w-3xl">
          How Tiepoint gets its data, what it computes, and where the limits are. Everything described here as real
          is fetched live from the source named; nothing is read from a demo file.
        </p>

        <H2 id="sources">Data sources</H2>
        <Table head={['Dataset', 'Provider', 'What it measures', 'Resolution', 'Revisit', 'Access']} rows={SOURCES} />

        <H2 id="layers">Map layers</H2>
        <p className="max-w-3xl">
          Spectral, terrain and radar layers are rendered on request by Microsoft Planetary Computer&rsquo;s tile service from a
          registered mosaic: every scene that covers a map tile is stitched, so there are no seams at scene or DEM-cell edges.
          Sentinel-2 mosaics use scenes with 20% cloud or less, clearest first, within the selected site&rsquo;s date window.
          Sentinel-1 mosaics use the most recent pass first. Elevation is shown as a hypsometric tint multiplied by a hillshade
          (sun azimuth 315°, altitude 45°), stretched between the 2nd and 98th percentile of the site&rsquo;s DEM cell.
        </p>
        <p className="max-w-3xl mt-3">
          Any map tile that does not come from one of these sources is stamped SIMULATED in the image itself by the server.
          The 3D view drapes the same tiles over Copernicus DEM terrain (Terrarium encoding) in MapLibre GL.
        </p>

        <H2 id="indices">Spectral indices</H2>
        <Table head={['Index', 'Formula', 'Sentinel-2 bands', 'Reading', 'Reference']} rows={INDICES} mono={[1, 2]} />

        <H2 id="assessment">Site assessments</H2>
        <ol className="list-decimal pl-5 space-y-2 max-w-3xl">
          <li>A fixed square around the site: about 0.8 km² for structures, 17–47 km² for floodplains and lakes. The map outline is this box.</li>
          <li>The clearest Sentinel-2 L2A scene in the site&rsquo;s date window (under 20% cloud, or under 50% if none).</li>
          <li>The clearest scene within 30 days of the same date one year earlier, so seasons match.</li>
          <li>The index mean over the box for both scenes (Planetary Computer statistics API). For water indices, the share of pixels above 0.</li>
          <li>The difference is compared with a fixed screening threshold (0.05 index units, or 5 percentage points of open water). Smaller changes are reported as no clear change. Results with a scene over 20% cloud are marked low confidence.</li>
        </ol>
        <p className="mt-3 max-w-3xl text-stone-400">This is a screening comparison. It says whether the surface signal changed, not why, and it is not an engineering or safety rating.</p>

        <H2 id="series">Time series and agreement</H2>
        <p className="max-w-3xl">
          The Analysis page measures the same box every month for 24 months, using the clearest scene each month under 30% cloud.
          Beside it is the daily mean discharge from the site&rsquo;s USGS gauge. Agreement is the Pearson correlation between
          the satellite value and log₁₀ discharge on days that have both. A gauge measures one point on a river; the box measures
          an area. Disagreement is expected and is often the interesting result.
        </p>

        <H2 id="simulated">What is simulated</H2>
        <ul className="list-disc pl-5 space-y-1.5 max-w-3xl">
          <li>Most of the roughly 80 analysis tools (slope stability, liquefaction, dam breach and others) run placeholder models. Their overlays are hidden by default and stamped SIMULATED.</li>
          <li>Terrain aspect and Sentinel-1 HH/HV have no real source yet.</li>
          <li>The bundled sample drone survey is synthetic and is not drawn; only uploaded GeoTIFFs appear.</li>
          <li>The assistant needs a language model running on the server.</li>
        </ul>

        <H2 id="limits">Known limitations</H2>
        <ul className="list-disc pl-5 space-y-1.5 max-w-3xl">
          <li>Clouds and shadows are filtered by scene-level cloud cover, not masked pixel by pixel (Sentinel-2 SCL masking is planned).</li>
          <li>Each site uses a fixed date window; there is no date picker yet.</li>
          <li>Imagery depends on Microsoft Planetary Computer, a free service with no uptime guarantee.</li>
          <li>The USGS gauges are not always at the site: Mud Slough is about 27 km from San Luis Dam, and Rillito Creek is in Tucson, not at Silver Bell.</li>
          <li>Copernicus DEM is a surface model: it includes buildings and tree canopy, not bare earth.</li>
        </ul>

        <H2 id="credits">Licences and credits</H2>
        <ul className="list-disc pl-5 space-y-1.5 max-w-3xl text-[14px]">
          <li>Contains modified Copernicus Sentinel data, processed by ESA and Microsoft Planetary Computer.</li>
          <li>Copernicus DEM: © DLR e.V. 2010–2014 and © Airbus Defence and Space GmbH 2014–2018, provided under COPERNICUS by the European Union and ESA.</li>
          <li>USGS data are in the U.S. public domain.</li>
          <li>Basemaps © Esri and its data contributors, including © OpenStreetMap contributors.</li>
          <li>3D rendering: MapLibre GL JS (BSD-3-Clause). 2D maps: Leaflet (BSD-2-Clause).</li>
        </ul>
      </article>

      <nav className="hidden lg:block sticky top-6 self-start text-[13.5px]">
        <p className="text-[12px] text-stone-500 mb-2">On this page</p>
        <ul className="space-y-1.5 border-l border-stone-800 pl-3">
          {toc.map(([id, label]) => (
            <li key={id}><a href={`#${id}`} className="text-stone-400 hover:text-stone-50">{label}</a></li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
