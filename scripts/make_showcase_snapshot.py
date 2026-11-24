"""Build the showcase data snapshot from the real services (run from GIOSREPO)."""
import json, sys, datetime
sys.path.insert(0, '.')
from concurrent.futures import ThreadPoolExecutor
from app.services.event_service import event_service
from app.services import real_tiles
from app.services.site_assessment import assess
from app.services.site_timeseries import index_timeseries, gauge_daily

events = event_service.list_events()
snap = {"generated": datetime.date.today().isoformat(), "events": events, "sites": {}}

def build(e):
    site = {"assessment": assess(e), "timeseries": index_timeseries(e, 24)}
    site["gauge"] = gauge_daily(e["usgs_station"], 730) if e.get("usgs_station") else {"status": "unavailable", "reason": "No gauge linked"}
    site["scene"] = real_tiles.find_scene(e["lng"], e["lat"], e.get("start_date"), e.get("end_date"))
    layers = {}
    for kind, key in real_tiles.LAYERS:
        if key == "terrarium":
            continue
        info = real_tiles.layer_info(kind, key, e["lng"], e["lat"])
        if info:
            layers[f"{kind}:{key}"] = info
    site["layers"] = layers
    return e["id"], site

with ThreadPoolExecutor(4) as pool:
    for sid, site in pool.map(build, events):
        snap["sites"][sid] = site
        print(sid, site["assessment"].get("label"), len(site["timeseries"].get("points", [])), site["gauge"].get("status"), list(site["layers"]))

snap["legends"] = {k: real_tiles.legend(k) for k in real_tiles.INDICES}
json.dump(snap, open("gios-react/src/showcase/snapshot.json", "w"), separators=(",", ":"), default=str)
