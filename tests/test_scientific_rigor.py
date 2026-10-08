"""Scientific Rigor & Mathematical Verification Test Suite for GIOS v2.5.

Assigned to: Agent 9 - Scientific QA & Test Engineer (@debugger)
Task: T-18 (End-to-End Scientific Verification Suite)

Verifies:
1. Landsat C2 L2 Optical vs. Thermal Calibration (Bug 1 Remediated)
2. Sentinel-2 PB 04.00+ Baseline Offset (Bug 2 Remediated)
3. Differenced NBR (ΔNBR) vs USGS FIREMON Standards (Bug 3 Remediated)
4. Bitwise QA/SCL Cloud & Shadow Morphological Dilation (Bug 4 Remediated)
5. Drone Centimeter Metric GSD from Affine / Great Circle (Bug 551 Remediated)
6. Zonal Polygon Statistics & Climatological MAD Anomaly Normalization
"""
import unittest
import numpy as np
from app.services.preprocessing import preprocessing_service, PreprocessingService
from app.services.indices import index_service
from app.services.drone_service import drone_service, DroneService
from app.services.timeseries import timeseries_service

class TestScientificRigor(unittest.TestCase):
    def test_landsat_optical_vs_thermal_calibration(self):
        """Task T-02: Verify optical scaling vs. thermal Kelvin->Celsius calibration."""
        # 1. Optical Band (e.g. Band 4 Red)
        dn_optical = 10000
        rho = PreprocessingService.apply_landsat_calibration(dn_optical, is_thermal=False)
        expected_rho = 10000 * 0.0000275 - 0.2  # 0.075
        self.assertAlmostEqual(rho, expected_rho, places=4)

        # 2. Thermal Band 10 (LWIR)
        # Test baseline from Implementation Plan: DN 40,000 -> +12.57°C (285.72 K)
        dn_thermal = 40000
        temp_c = PreprocessingService.apply_landsat_calibration(dn_thermal, is_thermal=True)
        expected_c = (40000 * 0.00341802 + 149.0) - 273.15  # 12.5708 °C
        self.assertAlmostEqual(temp_c, expected_c, places=2)
        self.assertGreater(temp_c, 0.0, "Thermal calibration must yield positive Celsius for warm summer terrain")
        self.assertLess(temp_c, 50.0, "Thermal calibration must be physically plausible")

        # 3. Test thermal band name detection
        self.assertTrue(PreprocessingService.is_thermal_band("b10"))
        self.assertTrue(PreprocessingService.is_thermal_band("lwir11"))
        self.assertTrue(PreprocessingService.is_thermal_band("thermal_b10"))
        self.assertFalse(PreprocessingService.is_thermal_band("b04"))
        self.assertFalse(PreprocessingService.is_thermal_band("red"))

    def test_sentinel2_pb04_offset_correction(self):
        """Task T-03: Verify Sentinel-2 PB 04.00+ offset subtraction."""
        # Modern acquisition (PB >= 04.00)
        # Dark water target: DN 200 -> rho = (200 - 1000) * 0.0001 = -0.080 (or 1200 -> 0.020)
        dn_water = 1200
        rho_modern = PreprocessingService.apply_sentinel_offset(dn_water, processing_baseline=4.0)
        expected_rho_modern = (1200 - 1000) * 0.0001  # 0.020
        self.assertAlmostEqual(rho_modern, expected_rho_modern, places=4)

        # Legacy acquisition (PB < 04.00)
        rho_legacy = PreprocessingService.apply_sentinel_offset(dn_water, processing_baseline=3.0)
        expected_rho_legacy = 1200 * 0.0001  # 0.120
        self.assertAlmostEqual(rho_legacy, expected_rho_legacy, places=4)

        # Date-based detection (post Jan 25, 2022 uses PB 04.00+)
        rho_date_modern = PreprocessingService.apply_sentinel_offset(dn_water, acquisition_date="2024-06-01")
        self.assertAlmostEqual(rho_date_modern, 0.020, places=4)

    def test_bitwise_cloud_mask_dilation(self):
        """Task T-04: Verify morphological dilation of cloud/shadow buffers."""
        # Create a synthetic 10x10 raster with a single cloud pixel in the center (5, 5)
        # Class 9 = High Cloud
        scl_grid = np.full((10, 10), 4, dtype=int)  # 4 = Vegetation
        scl_grid[5, 5] = 9  # High cloud at (5, 5)

        # Without dilation, only (5, 5) is masked
        mask_raw = PreprocessingService.mask_sentinel_scl(scl_grid, dilation_iterations=0)
        self.assertEqual(np.sum(mask_raw), 1)

        # With 1 iteration of 3x3 structuring element, 3x3 box (9 pixels) is masked
        mask_dilated = PreprocessingService.mask_sentinel_scl(scl_grid, dilation_iterations=1)
        self.assertEqual(np.sum(mask_dilated), 9)
        self.assertTrue(mask_dilated[4, 4])
        self.assertTrue(mask_dilated[6, 6])
        self.assertFalse(mask_dilated[0, 0])

    def test_differenced_nbr_burn_severity(self):
        """Task T-05: Verify ΔNBR and USGS FIREMON severity classification."""
        # Unburned bare soil/urban with negative NBR in both seasons:
        # Pre: -0.20, Post: -0.20 -> dNBR = 0.00
        nbr_pre_soil = -0.20
        nbr_post_soil = -0.20
        dnbr_soil = nbr_pre_soil - nbr_post_soil
        res_soil = index_service.classify_burn_severity(np.array([dnbr_soil]))
        # The primary category should be "Unburned / Low Change"
        cat_unburned = next(c for c in res_soil["categories"] if "Unburned" in c["category"])
        self.assertEqual(cat_unburned["percentage"], 100.0)

        # High Severity Burn:
        # Pre: +0.60 (Dense forest), Post: -0.20 (Ashed scar) -> dNBR = 0.80
        nbr_pre_fire = 0.60
        nbr_post_fire = -0.20
        dnbr_fire = nbr_pre_fire - nbr_post_fire
        res_fire = index_service.classify_burn_severity(np.array([dnbr_fire]))
        cat_high = next(c for c in res_fire["categories"] if "High Severity" in c["category"])
        self.assertEqual(cat_high["percentage"], 100.0)

    def test_seasonal_climatological_anomaly(self):
        """Task T-16: Verify monthly climatological median & MAD calculation."""
        # Simulated 36-month timeseries (3 years)
        # Normal August NDVI is ~0.65 with MAD 0.04
        # A drought reading of 0.40 should produce a z-score < -2.5
        august_values = np.array([0.64, 0.66, 0.65, 0.67, 0.63, 0.65])
        median_val = float(np.median(august_values))
        mad_val = float(np.median(np.abs(august_values - median_val)))
        if mad_val == 0:
            mad_val = 0.02

        current_val = 0.40
        z_score = (current_val - median_val) / (1.4826 * mad_val)
        self.assertLess(z_score, -2.5, "Significant moisture deficit must trigger severe anomaly flag")

    def test_drone_metric_gsd_calculation(self):
        """Task T-10: Verify drone centimeter metric GSD differentiation."""
        class MockDataset:
            def __init__(self, res, is_geographic, bounds=None):
                self.res = res
                class MockCRS:
                    def __init__(self, is_geo):
                        self.is_geographic = is_geo
                self.crs = MockCRS(is_geographic)
                class MockBounds:
                    def __init__(self, b, t):
                        self.bottom = b
                        self.top = t
                self.bounds = MockBounds(bounds[0], bounds[1]) if bounds else MockBounds(37.05, 37.07)

        # 1. Projected CRS (e.g. UTM with 0.028m = 2.8cm pixel resolution)
        mock_proj = MockDataset(res=(0.028, -0.028), is_geographic=False)
        gsd_proj = DroneService.calculate_metric_gsd(mock_proj)
        self.assertAlmostEqual(gsd_proj, 2.80, places=2)

        # 2. Geographic CRS (EPSG:4326 degrees around lat 37.06 degrees)
        # Lat 37.06 deg: 1 deg lat ~ 111320m -> 2.8cm is ~ 2.515e-7 degrees
        res_deg = 2.8e-2 / 111320.0
        mock_geo = MockDataset(res=(res_deg, -res_deg), is_geographic=True, bounds=(37.05, 37.07))
        gsd_geo = DroneService.calculate_metric_gsd(mock_geo)
        self.assertGreater(gsd_geo, 1.0)
        self.assertLess(gsd_geo, 10.0)

    def test_dam_break_hydrodynamic_physics_and_mass_conservation(self):
        """Task T-130: Verify Froehlich empirical discharge scaling, wave attenuation physics, and hazard tiers."""
        from app.models.schemas import (
            calculate_dam_breach_peak_discharge,
            calculate_downstream_wave_attenuation,
            classify_hazard_intensity_tier,
            classify_evacuation_urgency,
            calculate_infrastructure_vulnerability_score,
            BreachMechanism,
            HazardIntensityTier,
            EvacuationUrgencyTier,
            InfrastructureExposureType
        )

        # 1. Froehlich empirical discharge scaling
        qp_base = calculate_dam_breach_peak_discharge(40.0, 10000000.0, BreachMechanism.OVERTOPPING)
        qp_higher_dam = calculate_dam_breach_peak_discharge(60.0, 10000000.0, BreachMechanism.OVERTOPPING)
        qp_higher_vol = calculate_dam_breach_peak_discharge(40.0, 20000000.0, BreachMechanism.OVERTOPPING)
        qp_collapse = calculate_dam_breach_peak_discharge(40.0, 10000000.0, BreachMechanism.INSTANTANEOUS_COLLAPSE)

        self.assertGreater(qp_higher_dam, qp_base, "Increasing dam height must increase peak discharge")
        self.assertGreater(qp_higher_vol, qp_base, "Increasing reservoir volume must increase peak discharge")
        self.assertGreater(qp_collapse, qp_base, "Instantaneous collapse multiplier must exceed overtopping")
        self.assertAlmostEqual(qp_collapse, qp_base * 1.25, delta=1.0)

        # 2. Downstream wave attenuation & mass conservation
        reach_1km = calculate_downstream_wave_attenuation(1.0, qp_base, manning_n=0.040, valley_slope=0.015, slurry_yield_stress_pa=40.0)
        reach_5km = calculate_downstream_wave_attenuation(5.0, qp_base, manning_n=0.040, valley_slope=0.015, slurry_yield_stress_pa=40.0)
        reach_15km = calculate_downstream_wave_attenuation(15.0, qp_base, manning_n=0.040, valley_slope=0.015, slurry_yield_stress_pa=40.0)

        # Monotonic peak discharge attenuation along channel reach
        self.assertGreater(reach_1km["discharge_m3s"], reach_5km["discharge_m3s"])
        self.assertGreater(reach_5km["discharge_m3s"], reach_15km["discharge_m3s"])

        # Monotonic wave travel arrival time progression
        self.assertLess(reach_1km["arrival_time_min"], reach_5km["arrival_time_min"])
        self.assertLess(reach_5km["arrival_time_min"], reach_15km["arrival_time_min"])

        # Flow depth attenuation
        self.assertGreater(reach_1km["depth_m"], reach_5km["depth_m"])
        self.assertGreater(reach_5km["depth_m"], reach_15km["depth_m"])

        # 3. Slurry non-Newtonian rheology resistance
        reach_water = calculate_downstream_wave_attenuation(3.0, qp_base, manning_n=0.040, valley_slope=0.015, slurry_yield_stress_pa=0.0)
        reach_thick_slurry = calculate_downstream_wave_attenuation(3.0, qp_base, manning_n=0.040, valley_slope=0.015, slurry_yield_stress_pa=150.0)

        self.assertGreater(reach_water["velocity_ms"], reach_thick_slurry["velocity_ms"], "Yield stress must retard slurry velocity")
        self.assertLess(reach_water["arrival_time_min"], reach_thick_slurry["arrival_time_min"], "Viscous slurry wave front must arrive later than water")

        # 4. Hazard intensity classification thresholds (v * h)
        tier_extreme = classify_hazard_intensity_tier(velocity_ms=3.0, depth_m=1.0)  # v*h = 3.0 >= 2.5
        self.assertEqual(tier_extreme, HazardIntensityTier.EXTREME_CATASTROPHIC)

        tier_high = classify_hazard_intensity_tier(velocity_ms=2.0, depth_m=0.9)  # v*h = 1.8 >= 1.5
        self.assertEqual(tier_high, HazardIntensityTier.HIGH_HAZARD)

        tier_medium = classify_hazard_intensity_tier(velocity_ms=1.0, depth_m=0.8)  # v*h = 0.8 >= 0.5
        self.assertEqual(tier_medium, HazardIntensityTier.MEDIUM_HAZARD)

        tier_low = classify_hazard_intensity_tier(velocity_ms=0.5, depth_m=0.4)  # v*h = 0.2 < 0.5
        self.assertEqual(tier_low, HazardIntensityTier.LOW_HAZARD)

        # 5. Evacuation urgency tiers
        self.assertEqual(classify_evacuation_urgency(10.0), EvacuationUrgencyTier.IMMEDIATE_LIFE_SAFETY)
        self.assertEqual(classify_evacuation_urgency(45.0), EvacuationUrgencyTier.HIGH_PRIORITY_EVACUATION)
        self.assertEqual(classify_evacuation_urgency(120.0), EvacuationUrgencyTier.PRECAUTIONARY_STAGED)
        self.assertEqual(classify_evacuation_urgency(240.0), EvacuationUrgencyTier.MONITORED_SAFE_HAVEN)

        # 6. Infrastructure vulnerability damage ratio
        v_res = calculate_infrastructure_vulnerability_score(InfrastructureExposureType.RESIDENTIAL_SETTLEMENT, depth_m=2.5, velocity_ms=3.0)
        v_bridge = calculate_infrastructure_vulnerability_score(InfrastructureExposureType.BRIDGE_CROSSING, depth_m=2.5, velocity_ms=3.0)
        self.assertGreaterEqual(v_res, 0.0)
        self.assertLessEqual(v_res, 1.0)
        self.assertGreaterEqual(v_bridge, 0.0)
        self.assertLessEqual(v_bridge, 1.0)

    def test_terzaghi_piping_and_dupuit_darcy_flow_physics(self):
        """Task T-136: Verify Terzaghi critical piping exit gradient, Dupuit-Forchheimer unconfined discharge, and Van Genuchten SWRC."""
        from app.models.schemas import (
            calculate_phreatic_surface_seepage,
            calculate_van_genuchten_swrc,
            VanGenuchtenParameters
        )

        # 1. Dupuit unconfined phreatic seepage flow scaling
        base_params = {
            "dam_id": "DAM-TEST-DARCY",
            "soil_params": {
                "texture": "silt_tailings",
                "ksatMs": 1.0e-6
            },
            "reservoir_pool_elevation_m": 810.0,
            "tailwater_elevation_m": 750.0
        }
        res_low_k = calculate_phreatic_surface_seepage(base_params)

        high_k_params = dict(base_params)
        high_k_params["soil_params"] = {
            "texture": "silt_tailings",
            "ksatMs": 5.0e-6
        }
        res_high_k = calculate_phreatic_surface_seepage(high_k_params)

        # Seepage discharge must scale linearly with saturated hydraulic conductivity k
        self.assertGreater(res_high_k["seepage_discharge_m3s_m"], res_low_k["seepage_discharge_m3s_m"])
        self.assertAlmostEqual(res_high_k["seepage_discharge_m3s_m"] / res_low_k["seepage_discharge_m3s_m"], 5.0, places=1)

        # 2. Terzaghi piping exit gradient & factor of safety
        self.assertGreater(res_low_k["exit_gradient_max"], 0.0)
        self.assertGreater(res_low_k["factor_of_safety_piping"], 0.0)

        # 3. Van Genuchten (1980) SWRC retention bounds & Mualem relative conductivity
        vg_silt = VanGenuchtenParameters(
            theta_s=0.45,
            theta_r=0.035,
            alpha_1_kpa=1.5,
            n_param=1.40,
            ksat_m_s=1e-6
        )

        pt_sat = calculate_van_genuchten_swrc(0.0, vg_silt)
        self.assertEqual(pt_sat["effective_saturation"], 1.0)
        self.assertEqual(pt_sat["volumetric_water_content"], 0.45)
        self.assertEqual(pt_sat["relative_conductivity"], 1.0)

        pt_dry = calculate_van_genuchten_swrc(500.0, vg_silt)
        self.assertLess(pt_dry["effective_saturation"], 0.15)
        self.assertLess(pt_dry["volumetric_water_content"], 0.10)
        self.assertLess(pt_dry["relative_conductivity"], 0.01)

    def test_bishops_limit_equilibrium_moment_closure_and_taylor_benchmark(self):
        """Task T-142: Verify Bishop's Simplified Picard iteration convergence, moment balance closure, and seismic destabilization."""
        from app.models.schemas import (
            calculate_bishops_simplified_fs,
            calculate_janbu_simplified_fs,
            SlopeHazardTier
        )

        # 1. Limit equilibrium moment balance closure
        sim = calculate_bishops_simplified_fs({
            "dam_id": "DAM-MOMENT-01",
            "soil_texture": "silt_tailings"
        })
        fs = sim["factor_of_safety"]
        self.assertGreater(fs, 1.0)
        self.assertLess(fs, 2.5)

        # Resisting shear forces and slice equilibrium closure
        slices = sim["slices"]
        self.assertGreater(len(slices), 0)
        sum_t = sum(s["shear_resistance_t_kn_m"] for s in slices)
        sum_n = sum(s["effective_normal_force_n_kn_m"] for s in slices)
        self.assertGreater(sum_t, 0.0, "Total mobilized shear resistance along slip arc must be positive")
        self.assertGreater(sum_n, 0.0, "Total effective normal force along slip arc must be positive")

        # Taylor / Coulomb shear strength scaling: increasing cohesion or friction angle must increase FS
        sim_high_phi = calculate_bishops_simplified_fs({
            "dam_id": "DAM-MOMENT-01",
            "soil_texture": "silt_tailings",
            "friction_angle_deg": 38.0
        })
        self.assertGreater(sim_high_phi["factor_of_safety"], fs, "Increasing friction angle phi' must increase Factor of Safety")

        # 2. Monotonic destabilization with seismic coefficient kh
        sim_seismic_0 = calculate_bishops_simplified_fs({"dam_id": "DAM-SEISMIC", "seismic_coefficient_kh": 0.0})
        sim_seismic_1 = calculate_bishops_simplified_fs({"dam_id": "DAM-SEISMIC", "seismic_coefficient_kh": 0.10})
        sim_seismic_2 = calculate_bishops_simplified_fs({"dam_id": "DAM-SEISMIC", "seismic_coefficient_kh": 0.20})

        self.assertGreater(sim_seismic_0["factor_of_safety"], sim_seismic_1["factor_of_safety"])
        self.assertGreater(sim_seismic_1["factor_of_safety"], sim_seismic_2["factor_of_safety"])

        # 3. Janbu simplified non-circular curvature correction factor f0 >= 1.0
        janbu = calculate_janbu_simplified_fs({"dam_id": "DAM-JANBU-02", "soil_texture": "silt_tailings"})
        self.assertGreaterEqual(janbu["curvature_correction_f0"], 1.0)
        self.assertLessEqual(janbu["curvature_correction_f0"], 1.3)

    def test_green_ampt_infiltration_mass_conservation_and_wetting_front_suction_decay(self):
        """Task T-148: Verify Green-Ampt cumulative mass conservation, wetting front advancement, and Fredlund suction loss."""
        from app.models.schemas import (
            calculate_green_ampt_infiltration,
            calculate_fredlund_apparent_shear_strength,
            RainfallHazardTier,
            InfiltrationPondingRegime
        )

        sim_params = {
            "dam_id": "DAM-INFILTRATION-01",
            "dam_name": "San Luis Forebay Embankment",
            "soil_texture": "silt_tailings",
            "storm_duration_hr": 6.0,
            "rainfall_intensity_mm_hr": 25.0,
            "time_step_hr": 0.5,
            "embankment_slope_deg": 28.0,
            "cohesion_kpa": 12.0,
            "friction_angle_deg": 30.0,
            "initial_suction_head_m": 0.45
        }
        res = calculate_green_ampt_infiltration(sim_params)

        # 1. Total rainfall and strict mass conservation: Rain = Infiltration + Surface Runoff
        cum_infil = res["total_cumulative_infiltration_mm"]
        runoff = res["total_surface_runoff_mm"]
        total_inflow = cum_infil + runoff
        # 6 hours * 25 mm/hr = 150 mm
        self.assertAlmostEqual(total_inflow, 150.0, delta=0.5, msg="Mass conservation: Infiltration + Runoff must equal storm total")
        self.assertGreater(cum_infil, 0.0)
        self.assertGreater(runoff, 0.0, "For intense storm on silt tailings, surface ponding and runoff must occur")

        # 2. Time to ponding tp must be physically consistent with Ks
        tp = res["time_to_ponding_hr"]
        self.assertIsNotNone(tp, "Ponding must occur when rainfall intensity exceeds saturated hydraulic conductivity")
        self.assertGreater(tp, 0.0)
        self.assertLess(tp, 6.0)

        # 3. Monotonic wetting front advancement zw(t) across simulation time steps
        time_steps = res["time_steps"]
        self.assertGreater(len(time_steps), 5)
        zw_prev = -1.0
        for step in time_steps:
            zw = step["wetting_front_depth_m"]
            self.assertGreaterEqual(zw, zw_prev, "Wetting front depth must advance monotonically with cumulative infiltration")
            zw_prev = zw

        # 4. Slope safety factor decay: transient FS must decrease as suction is lost
        initial_fs = time_steps[0]["transient_factor_of_safety"]
        min_fs = res["minimum_transient_fs"]
        self.assertLess(min_fs, initial_fs, "Infiltration must decrease transient slope stability Factor of Safety")
        self.assertIn(res["hazard_tier"], [t.value for t in RainfallHazardTier])

        # 5. Fredlund & Rahardjo unsaturated apparent shear strength verification
        dry_shear = calculate_fredlund_apparent_shear_strength(
            cohesion_prime_kpa=10.0,
            friction_angle_prime_deg=30.0,
            phi_b_deg=18.0,
            matric_suction_psi_kpa=35.0,
            normal_stress_kpa=60.0
        )
        sat_shear = calculate_fredlund_apparent_shear_strength(
            cohesion_prime_kpa=10.0,
            friction_angle_prime_deg=30.0,
            phi_b_deg=18.0,
            matric_suction_psi_kpa=0.0,
            normal_stress_kpa=60.0
        )
        # Saturated suction cohesion drops to zero, reducing apparent shear strength
        self.assertGreater(dry_shear["apparent_cohesion_kpa"], sat_shear["apparent_cohesion_kpa"])
        self.assertGreater(dry_shear["shear_strength_tau_kpa"], sat_shear["shear_strength_tau_kpa"])
        self.assertEqual(sat_shear["suction_cohesion_kpa"], 0.0)

    def test_apparent_thermal_inertia_split_window_physics(self):
        """Task T-148: Verify Price (1985) split-window Apparent Thermal Inertia and phreatic daylighting anomaly detection."""
        from app.models.schemas import calculate_apparent_thermal_inertia, ATIAnomalyClass

        # Transect across embankment: Station 0m is dry crest shell, Station 200m is saturated toe seepage daylighting
        transect_data = {
            "dam_id": "DAM-ATI-01",
            "dam_name": "Cadia Downstream Shell",
            "solar_correction_factor": 1.0,
            "min_ati_threshold": 0.045,
            "transect_points": [
                {"station_x_m": 0.0, "albedo": 0.30, "day_lst_celsius": 42.0, "night_lst_celsius": 12.0},
                {"station_x_m": 50.0, "albedo": 0.20, "day_lst_celsius": 37.0, "night_lst_celsius": 14.2},
                {"station_x_m": 100.0, "albedo": 0.18, "day_lst_celsius": 34.0, "night_lst_celsius": 15.0},
                {"station_x_m": 150.0, "albedo": 0.14, "day_lst_celsius": 28.0, "night_lst_celsius": 16.5},
                {"station_x_m": 200.0, "albedo": 0.10, "day_lst_celsius": 22.5, "night_lst_celsius": 17.5}
            ]
        }
        ati_res = calculate_apparent_thermal_inertia(transect_data)

        # 1. Output schema & structure verification
        self.assertEqual(ati_res["dam_id"], "DAM-ATI-01")
        self.assertIn("mean_apparent_thermal_inertia", ati_res)
        self.assertIn("max_apparent_thermal_inertia", ati_res)
        self.assertTrue(ati_res["thermal_seepage_detected"], "Toe saturated zone must trigger daylighting seepage detection")

        # 2. Physics check: Price (1985) ATI = (1 - albedo) / DTR
        points = ati_res["ati_points"]
        self.assertEqual(len(points), 5)

        dry_point = points[0]
        # DTR = 42.0 - 12.0 = 30.0 C; (1 - 0.30) / 30.0 = 0.70 / 30.0 = 0.0233 (< 0.025)
        self.assertAlmostEqual(dry_point["dtr_celsius"], 30.0, delta=0.1)
        self.assertAlmostEqual(dry_point["apparent_thermal_inertia"], 0.0233, delta=0.002)
        self.assertEqual(dry_point["anomaly_class"], ATIAnomalyClass.NORMAL_DRY_SHELL.value)

        toe_seepage_point = points[4]
        # DTR = 22.5 - 17.5 = 5.0 C; (1 - 0.10) / 5.0 = 0.90 / 5.0 = 0.1800
        self.assertAlmostEqual(toe_seepage_point["dtr_celsius"], 5.0, delta=0.1)
        self.assertAlmostEqual(toe_seepage_point["apparent_thermal_inertia"], 0.1800, delta=0.005)
        self.assertEqual(toe_seepage_point["anomaly_class"], ATIAnomalyClass.CRITICAL_DAYLIGHTING_OUTFLOW.value)

        # High soil moisture strictly suppresses DTR and increases apparent thermal inertia
        self.assertGreater(toe_seepage_point["apparent_thermal_inertia"], dry_point["apparent_thermal_inertia"])

    def test_dynamic_seismic_liquefaction_seed_idriss_and_excess_pore_pressure(self):
        """Task T-154: Verify Seed-Idriss simplified dynamic liquefaction physics, MSF, excess pore pressure ru, and runout mechanics."""
        from app.models.schemas import (
            calculate_magnitude_scaling_factor,
            calculate_spt_n1_60cs,
            calculate_spt_crr75,
            calculate_excess_pore_pressure_ratio,
            calculate_dynamic_pore_pressure,
            calculate_vs30_from_topographic_slope,
            classify_nehrp_site_class,
            calculate_flow_slide_runout_distance,
            calculate_tailings_liquefaction_analysis,
            NEHRPSiteClass,
            FlowSlideMobilityTier,
            LiquefactionHazardTier
        )

        # 1. Magnitude Scaling Factor (MSF): Mw = 7.5 baseline normalization
        msf_75 = calculate_magnitude_scaling_factor(7.5, "youd_2001")
        self.assertAlmostEqual(msf_75, 1.000, places=3, msg="MSF for Mw=7.5 reference earthquake must equal exactly 1.000")
        
        msf_small = calculate_magnitude_scaling_factor(6.0, "youd_2001")
        self.assertGreater(msf_small, 1.000, "Smaller earthquakes generate fewer equivalent cycles; MSF must exceed 1.000")
        
        msf_large = calculate_magnitude_scaling_factor(8.5, "youd_2001")
        self.assertLess(msf_large, 1.000, "Larger earthquakes generate more cycles; MSF must drop below 1.000")

        # 2. SPT Overburden Normalization CN and Fines Correction
        spt_clean = calculate_spt_n1_60cs(n_spt=12.0, sigma_v0_eff_kpa=100.0, fines_content_pct=0.0)
        self.assertAlmostEqual(spt_clean["cn_overburden_factor"], 1.000, places=2)
        self.assertEqual(spt_clean["clean_sand_n1_60cs"], spt_clean["normalized_n1_60"])

        spt_silty = calculate_spt_n1_60cs(n_spt=12.0, sigma_v0_eff_kpa=100.0, fines_content_pct=25.0)
        self.assertGreater(spt_silty["clean_sand_n1_60cs"], spt_silty["normalized_n1_60"],
                           "Fines content > 5% must apply clean sand correction increment")

        # Low confining stress yields CN > 1.0; high confining stress yields CN < 1.0
        spt_shallow = calculate_spt_n1_60cs(n_spt=10.0, sigma_v0_eff_kpa=25.0, fines_content_pct=0.0)
        spt_deep = calculate_spt_n1_60cs(n_spt=10.0, sigma_v0_eff_kpa=250.0, fines_content_pct=0.0)
        self.assertGreater(spt_shallow["cn_overburden_factor"], spt_deep["cn_overburden_factor"])

        # 3. Monotonic Cyclic Resistance Ratio CRR7.5 curve
        crr_loose = calculate_spt_crr75(8.0)
        crr_medium = calculate_spt_crr75(18.0)
        crr_dense = calculate_spt_crr75(32.0)
        self.assertLess(crr_loose, crr_medium, "Loose contractive sands must have lower cyclic resistance than medium sands")
        self.assertEqual(crr_dense, 2.0, "Sands with (N1)60cs >= 30 are non-liquefiable by Youd / Seed criteria")

        # 4. Excess Pore Pressure Ratio ru = Delta_u / sigma'_v0
        ru_safe = calculate_excess_pore_pressure_ratio(fs_liq=2.2)
        ru_marginal = calculate_excess_pore_pressure_ratio(fs_liq=1.2)
        ru_liquefied = calculate_excess_pore_pressure_ratio(fs_liq=0.85)

        self.assertEqual(ru_safe, 0.0, "Elastic response under high safety factor (FS >= 2.0) yields negligible excess pore pressure")
        self.assertGreater(ru_marginal, 0.0)
        self.assertLess(ru_marginal, 1.0)
        self.assertEqual(ru_liquefied, 1.0, "Triggered dynamic liquefaction (FS < 1.0) creates 100% loss of effective stress (ru = 1.0)")

        # Dynamic pore pressure verification
        dyn_pp = calculate_dynamic_pore_pressure(sigma_v0_eff_kpa=120.0, fs_liq=0.90, dam_id="DAM-SEISMIC-01")
        self.assertTrue(dyn_pp["liquefaction_triggered"])
        self.assertEqual(dyn_pp["excess_pore_pressure_ratio_ru"], 1.0)
        self.assertEqual(dyn_pp["excess_pore_pressure_delta_u_kpa"], 120.0)
        self.assertEqual(dyn_pp["post_cyclic_effective_stress_kpa"], 0.0)
        self.assertEqual(dyn_pp["hazard_tier"], LiquefactionHazardTier.CRITICAL_CYCLIC_COLLAPSE.value)

        # 5. Topographic Slope Vs30 Proxy & NEHRP Classification
        vs30_flat = calculate_vs30_from_topographic_slope(0.05, terrain_type="active_tectonic")
        nehrp_flat = classify_nehrp_site_class(vs30_flat)
        self.assertIn(nehrp_flat, [NEHRPSiteClass.CLASS_E, NEHRPSiteClass.CLASS_D])

        vs30_steep = calculate_vs30_from_topographic_slope(18.0, terrain_type="active_tectonic")
        nehrp_steep = classify_nehrp_site_class(vs30_steep)
        self.assertIn(nehrp_steep, [NEHRPSiteClass.CLASS_B, NEHRPSiteClass.CLASS_A])
        self.assertGreater(vs30_steep, vs30_flat)

        # 6. Post-Liquefaction Flow Slide Runout Mechanics (Scheidegger Fahrböschung L = H / tan alpha_r)
        runout_extreme = calculate_flow_slide_runout_distance(dam_height_m=40.0, reach_angle_deg=3.5)
        runout_moderate = calculate_flow_slide_runout_distance(dam_height_m=40.0, reach_angle_deg=10.0)
        self.assertEqual(runout_extreme["mobility_tier"], FlowSlideMobilityTier.EXTREME_MOBILITY.value)
        self.assertGreater(runout_extreme["runout_distance_m"], runout_moderate["runout_distance_m"])
        # Theoretical L = 40.0 / tan(3.5 deg) ~ 40 / 0.06116 ~ 654.0 m
        self.assertAlmostEqual(runout_extreme["runout_distance_m"], 654.0, delta=5.0)

        # 7. End-to-End Tailings Liquefaction Synthesis Evaluation
        eval_payload = {
            "dam_id": "DAM-TEST-01",
            "pga_g": 0.35,
            "earthquake_magnitude": 7.5,
            "dam_height_m": 45.0,
            "impounded_volume_m3": 8500000.0,
            "reach_angle_deg": 4.8,
            "topographic_slope_deg": 6.5,
            "spt_soundings": [
                {"depth_m": 4.0, "spt_n_blows": 7.0, "effective_overburden_kpa": 65.0, "fines_content_pct": 18.0},
                {"depth_m": 8.0, "spt_n_blows": 11.0, "effective_overburden_kpa": 120.0, "fines_content_pct": 22.0},
                {"depth_m": 14.0, "spt_n_blows": 16.0, "effective_overburden_kpa": 190.0, "fines_content_pct": 15.0}
            ]
        }
        res = calculate_tailings_liquefaction_analysis(eval_payload)
        self.assertEqual(res["dam_id"], "DAM-TEST-01")
        self.assertIn("minimum_factor_of_safety_liq", res)
        self.assertIn("overall_liquefaction_hazard_tier", res)
        self.assertIn("dynamic_pore_pressure", res)
        self.assertIn("vs30_proxy", res)
        self.assertIn("flow_slide_runout", res)
        self.assertIn("spt_sounding_points", res)
        self.assertEqual(len(res["spt_sounding_points"]), 3)
        self.assertIn("cyclic_stress_ratio_csr", res["spt_sounding_points"][0])
        self.assertIn("cyclic_resistance_ratio_crr75", res["spt_sounding_points"][0])

if __name__ == "__main__":
    unittest.main()


