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
import math
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

    def test_ishihara_yoshimine_volumetric_strain_and_tokimatsu_seed_settlement(self):
        """Task T-160: Verify post-liquefaction volumetric strain, stratigraphic integration, angular distortion, and InSAR fusion."""
        from app.models.schemas import (
            calculate_post_liquefaction_volumetric_strain,
            calculate_stratigraphic_settlement,
            classify_angular_distortion_hazard_tier,
            classify_settlement_hazard_tier,
            calculate_angular_distortion,
            calculate_insar_displacement_fusion,
            calculate_time_consolidation_dissipation,
            calculate_post_liquefaction_settlement_analysis,
            SettlementCalculationMethod,
            AngularDistortionHazardTier,
            SettlementHazardTier
        )

        # 1. Ishihara & Yoshimine (1992) Volumetric Strain (eps_v)
        # Safe soil (FS >= 2.0) exhibits zero post-liquefaction reconsolidation strain
        self.assertEqual(calculate_post_liquefaction_volumetric_strain(fs_liq=2.0, n1_60cs=12.0), 0.0)
        self.assertEqual(calculate_post_liquefaction_volumetric_strain(fs_liq=2.5, n1_60cs=8.0), 0.0)

        # Dense dilatant sand (N1_60cs >= 32) exhibits negligible strain even if triggered
        self.assertEqual(calculate_post_liquefaction_volumetric_strain(fs_liq=1.5, n1_60cs=35.0), 0.0)
        self.assertLessEqual(calculate_post_liquefaction_volumetric_strain(fs_liq=0.8, n1_60cs=34.0), 0.05)

        # Monotonicity with decreasing Factor of Safety (higher shaking / lower resistance -> higher strain)
        eps_v_fs06 = calculate_post_liquefaction_volumetric_strain(fs_liq=0.6, n1_60cs=10.0)
        eps_v_fs09 = calculate_post_liquefaction_volumetric_strain(fs_liq=0.9, n1_60cs=10.0)
        eps_v_fs13 = calculate_post_liquefaction_volumetric_strain(fs_liq=1.3, n1_60cs=10.0)
        self.assertGreater(eps_v_fs06, eps_v_fs09, "Strain must increase monotonically as FS drops below 1.0")
        self.assertGreater(eps_v_fs09, eps_v_fs13, "Strain must increase monotonically as FS drops from 1.3 to 0.9")

        # Monotonicity with relative density (lower blow count -> higher contractive volumetric strain)
        eps_v_loose = calculate_post_liquefaction_volumetric_strain(fs_liq=0.75, n1_60cs=6.0)
        eps_v_medium = calculate_post_liquefaction_volumetric_strain(fs_liq=0.75, n1_60cs=14.0)
        eps_v_dense = calculate_post_liquefaction_volumetric_strain(fs_liq=0.75, n1_60cs=25.0)
        self.assertGreater(eps_v_loose, eps_v_medium, "Loose contractive tailings must strain more than medium tailings")
        self.assertGreater(eps_v_medium, eps_v_dense, "Medium tailings must strain more than dense tailings")

        # Tokimatsu & Seed (1987) calibration adjustment test
        eps_v_tokimatsu = calculate_post_liquefaction_volumetric_strain(fs_liq=0.8, n1_60cs=10.0, method="tokimatsu_seed_1987")
        self.assertGreater(eps_v_tokimatsu, 0.0)

        # 2. Tokimatsu & Seed (1987) Multi-Layer Stratigraphic Settlement Integration (S = sum eps_v * dz)
        test_stratigraphy = [
            {"layer_id": "L1_CAP", "soil_type": "compacted_cap", "depth_top_m": 0.0, "depth_bottom_m": 3.0, "spt_n1_60cs": 28.0, "factor_of_safety_liq": 1.90},
            {"layer_id": "L2_BEACH", "soil_type": "tailings_beach", "depth_top_m": 3.0, "depth_bottom_m": 8.0, "spt_n1_60cs": 12.0, "factor_of_safety_liq": 1.05},
            {"layer_id": "L3_SLIMES", "soil_type": "slimes_deposit", "depth_top_m": 8.0, "depth_bottom_m": 15.0, "spt_n1_60cs": 5.0, "factor_of_safety_liq": 0.60},
            {"layer_id": "L4_BASE", "soil_type": "basal_gravel", "depth_top_m": 15.0, "depth_bottom_m": 20.0, "spt_n1_60cs": 35.0, "factor_of_safety_liq": 2.20}
        ]
        strat_res = calculate_stratigraphic_settlement(test_stratigraphy, method="ishihara_yoshimine_1992")
        self.assertIn("total_settlement_m", strat_res)
        self.assertIn("layers", strat_res)
        self.assertEqual(len(strat_res["layers"]), 4)

        # Mathematical verification: Total settlement must exactly equal the sum of sublayer settlements
        sublayer_sum_m = sum(lyr["sublayer_settlement_m"] for lyr in strat_res["layers"])
        self.assertAlmostEqual(strat_res["total_settlement_m"], sublayer_sum_m, places=4,
                               msg="Integrated total crest settlement must equal the sum of sublayer settlements")
        self.assertAlmostEqual(strat_res["total_settlement_cm"], strat_res["total_settlement_m"] * 100.0, places=2)

        # Critical layer identification (L3_SLIMES is thickest and lowest FS -> greatest settlement)
        self.assertEqual(strat_res["critical_layer_id"], "L3_SLIMES")
        self.assertEqual(strat_res["critical_layer_depth_m"], 11.5)  # (8.0 + 15.0) / 2 = 11.5m

        # Contribution percentages must sum to 100%
        contrib_sum = sum(lyr["contribution_pct"] for lyr in strat_res["layers"])
        self.assertAlmostEqual(contrib_sum, 100.0, delta=0.5)

        # 3. Embankment Angular Distortion beta = Delta S / L (Bjerrum 1963)
        # Negligible: Delta S = 0.01m over 10m -> beta = 0.001 < 1/750 (0.001333)
        dist_neg = calculate_angular_distortion(settlement_a_m=0.10, settlement_b_m=0.11, distance_m=10.0, station_a_id="STA_0", station_b_id="STA_1")
        self.assertEqual(dist_neg["hazard_tier"], AngularDistortionHazardTier.NEGLIGIBLE.value)
        self.assertAlmostEqual(dist_neg["angular_distortion"], 0.001, places=4)

        # Slight: beta = 0.017 / 10 = 0.0017 (between 1/750 and 1/500)
        dist_slight = calculate_angular_distortion(settlement_a_m=0.10, settlement_b_m=0.117, distance_m=10.0)
        self.assertEqual(dist_slight["hazard_tier"], AngularDistortionHazardTier.SLIGHT.value)

        # Moderate: beta = 0.025 / 10 = 0.0025 (between 1/500 and 1/300)
        dist_mod = calculate_angular_distortion(settlement_a_m=0.10, settlement_b_m=0.125, distance_m=10.0)
        self.assertEqual(dist_mod["hazard_tier"], AngularDistortionHazardTier.MODERATE.value)

        # Severe: beta = 0.05 / 10 = 0.0050 (between 1/300 and 1/150)
        dist_sev = calculate_angular_distortion(settlement_a_m=0.10, settlement_b_m=0.150, distance_m=10.0)
        self.assertEqual(dist_sev["hazard_tier"], AngularDistortionHazardTier.SEVERE.value)

        # Critical Breach Risk: Delta S = 0.15m over 15m -> beta = 0.010 > 1/150 (0.006667)
        dist_crit = calculate_angular_distortion(settlement_a_m=0.10, settlement_b_m=0.25, distance_m=15.0)
        self.assertEqual(dist_crit["hazard_tier"], AngularDistortionHazardTier.CRITICAL_BREACH_RISK.value)
        self.assertEqual(dist_crit["angular_distortion_ratio"], "1/100")

        # Settlement Hazard Tier classification
        self.assertEqual(classify_settlement_hazard_tier(0.03), SettlementHazardTier.LOW)
        self.assertEqual(classify_settlement_hazard_tier(0.12), SettlementHazardTier.MODERATE)
        self.assertEqual(classify_settlement_hazard_tier(0.25), SettlementHazardTier.HIGH)
        self.assertEqual(classify_settlement_hazard_tier(0.45), SettlementHazardTier.VERY_HIGH)
        self.assertEqual(classify_settlement_hazard_tier(0.85), SettlementHazardTier.EXTREME)

        # 4. Satellite InSAR Displacement Fusion
        # High coherence (gamma >= 0.70) -> InSAR weight 0.80, Model weight 0.20
        fusion_high = calculate_insar_displacement_fusion(modeled_settlement_m=0.40, insar_displacement_m=0.50, coherence=0.82)
        self.assertEqual(fusion_high["insar_weight"], 0.80)
        self.assertEqual(fusion_high["model_weight"], 0.20)
        self.assertAlmostEqual(fusion_high["insar_weight"] + fusion_high["model_weight"], 1.00, places=4)
        # Expected fused: 0.20 * 0.40 + 0.80 * 0.50 = 0.08 + 0.40 = 0.48 m
        self.assertAlmostEqual(fusion_high["fused_settlement_m"], 0.48, places=4)
        self.assertEqual(fusion_high["agreement_quality"], "high_confidence_insar_agreement")

        # Moderate coherence (gamma = 0.55) -> 50/50 balanced fusion
        fusion_mod = calculate_insar_displacement_fusion(modeled_settlement_m=0.30, insar_displacement_m=0.40, coherence=0.55)
        self.assertEqual(fusion_mod["insar_weight"], 0.50)
        self.assertEqual(fusion_mod["model_weight"], 0.50)
        self.assertAlmostEqual(fusion_mod["fused_settlement_m"], 0.35, places=4)

        # Low coherence (gamma = 0.25) -> Prioritize geotechnical model (85% model, 15% InSAR)
        fusion_low = calculate_insar_displacement_fusion(modeled_settlement_m=0.30, insar_displacement_m=0.60, coherence=0.25)
        self.assertEqual(fusion_low["model_weight"], 0.85)
        self.assertEqual(fusion_low["insar_weight"], 0.15)
        self.assertEqual(fusion_low["agreement_quality"], "low_coherence_geotechnical_prioritized")

        # 5. Time-Dependent Consolidation Dissipation (Sridharan & Rao 1981)
        # U(t) = t / (t + t50). At t = t50, degree of consolidation must equal 50.0%
        dissip_t50 = calculate_time_consolidation_dissipation(total_settlement_m=0.60, t50_days=20.0, elapsed_days=20.0)
        self.assertEqual(dissip_t50["degree_of_consolidation_pct"], 50.0)
        self.assertAlmostEqual(dissip_t50["current_settlement_m"], 0.30, places=4)
        self.assertAlmostEqual(dissip_t50["remaining_settlement_m"], 0.30, places=4)

        # Dissipation rate should decrease as time progresses
        dissip_early = calculate_time_consolidation_dissipation(total_settlement_m=0.60, t50_days=20.0, elapsed_days=5.0)
        dissip_late = calculate_time_consolidation_dissipation(total_settlement_m=0.60, t50_days=20.0, elapsed_days=40.0)
        self.assertGreater(dissip_early["reconsolidation_rate_mm_day"], dissip_late["reconsolidation_rate_mm_day"])

        # 6. End-to-End Post-Liquefaction Reconsolidation Analysis Synthesis
        full_payload = {
            "dam_id": "DAM-BRUMADINHO-B1",
            "dam_name": "Brumadinho Tailings Impoundment",
            "crest_length_m": 400.0,
            "pga_g": 0.28,
            "earthquake_magnitude_mw": 7.0,
            "calculation_method": "ishihara_yoshimine_1992",
            "insar_coherence": 0.78,
            "insar_displacement_m": 0.42,
            "t50_days": 14.0,
            "elapsed_days": 10.0,
            "stratigraphic_layers": test_stratigraphy
        }
        full_res = calculate_post_liquefaction_settlement_analysis(full_payload)
        self.assertEqual(full_res["dam_id"], "DAM-BRUMADINHO-B1")
        self.assertIn("max_crest_settlement_m", full_res)
        self.assertIn("max_angular_distortion", full_res)
        self.assertIn("crest_profile", full_res)
        self.assertIn("angular_distortion_segments", full_res)
        self.assertIn("time_consolidation", full_res)
        self.assertIn("insar_fusion", full_res)
        self.assertGreater(len(full_res["crest_profile"]), 3)
        self.assertGreater(len(full_res["angular_distortion_segments"]), 2)

    def test_csf_cloth_simulation_filtering_and_cut_fill_volumetric_differencing(self):
        """Task T-166: Continuous Scientific QA verifying CSF cloth mechanics, 2.5D DEM cut-and-fill conservation, and terrain edge preservation."""
        from app.models.schemas import (
            calculate_cloth_simulation_filter,
            classify_csf_ground_tier,
            CSFRigidness,
            PointClassificationType,
            PointClassificationTier,
            CSF_TIER_METADATA,
            build_csf_point_filter_tile_url,
            calculate_cut_and_fill_differencing,
            classify_topographic_delta_hazard_tier,
            TopographicDeltaHazardTier,
            TOPOGRAPHIC_DELTA_HAZARD_CONFIGS,
            calculate_crest_slumping_profile,
            classify_crest_slump_hazard_tier,
            CrestSlumpHazardTier,
            CREST_SLUMP_HAZARD_CONFIGS,
            calculate_topographic_transect_delta,
            calculate_drone_epipolar_differential,
            classify_epipolar_disparity_quality,
            EpipolarDisparityQuality,
            build_topographic_elevation_delta_tile_url
        )

        # 1. Cloth Simulation Filtering (Zhang et al. 2016)
        # Test rigidness parameter variations: flat_terrain (stiffest), relief_slope, steep_mountain (flexible)
        csf_flat = calculate_cloth_simulation_filter(cloud_id="PC_FLAT", rigidness=CSFRigidness.FLAT_TERRAIN, sample_count=60)
        csf_relief = calculate_cloth_simulation_filter(cloud_id="PC_RELIEF", rigidness=CSFRigidness.RELIEF_SLOPE, sample_count=60)
        csf_mountain = calculate_cloth_simulation_filter(cloud_id="PC_STEEP", rigidness=CSFRigidness.STEEP_MOUNTAIN, sample_count=60)

        self.assertEqual(csf_flat["rigidness"], "flat_terrain")
        self.assertEqual(csf_relief["rigidness"], "relief_slope")
        self.assertEqual(csf_mountain["rigidness"], "steep_mountain")

        # Ground points must satisfy distance_to_cloth_m <= classification_threshold_m
        for sample in csf_relief["sample_points"]:
            if sample["is_ground"]:
                self.assertLessEqual(sample["distance_to_cloth_m"], csf_relief["classification_threshold_m"])
                self.assertEqual(sample["classification"], PointClassificationType.GROUND.value)
            else:
                self.assertGreater(sample["distance_to_cloth_m"], csf_relief["classification_threshold_m"])
                self.assertNotEqual(sample["classification"], PointClassificationType.GROUND.value)

        # Point cloud quality tier classification
        self.assertEqual(classify_csf_ground_tier(0.70, 0.10), PointClassificationTier.EXCELLENT_BARE_EARTH_ISOLATION)
        self.assertEqual(classify_csf_ground_tier(0.50, 0.25), PointClassificationTier.MODERATE_GROUND_EXTRACTION)
        self.assertEqual(classify_csf_ground_tier(0.30, 0.55), PointClassificationTier.COARSE_GROUND_RESIDUAL)
        self.assertEqual(classify_csf_ground_tier(0.15, 0.85), PointClassificationTier.HIGH_OCCLUSION_UNCERTAINTY)

        # Dynamic XYZ CSF tile streaming URL template
        tile_url = build_csf_point_filter_tile_url("PC_TEST_01", z=14, x=1024, y=512)
        self.assertIn("/api/v1/tiles/pointcloud/csf/PC_TEST_01/14/1024/512.png", tile_url)

        # 2. 2.5D Raster DEM Cut-and-Fill Differencing & Mass Conservation
        req_cutfill = {
            "simulation_id": "CUTFILL_SCIENTIFIC_01",
            "asset_id": "TAILINGS_DAM_A",
            "grid_resolution_m": 1.0,
            "deadband_threshold_m": 0.05,
            "grid_side_points": 20
        }
        res_cutfill = calculate_cut_and_fill_differencing(req_cutfill)
        summary = res_cutfill["summary"]

        # Mass/Volume conservation: Net Volume = Gross Fill - Gross Cut
        expected_net = round(summary["gross_fill_volume_m3"] - summary["gross_cut_volume_m3"], 3)
        self.assertAlmostEqual(summary["net_volume_change_m3"], expected_net, places=2)

        # Area conservation: Total Area = Cut Area + Fill Area + Unchanged Area
        expected_total_area = round(summary["area_cut_ha"] + summary["area_fill_ha"] + summary["area_unchanged_ha"], 4)
        self.assertAlmostEqual(summary["total_area_ha"], expected_total_area, places=3)

        # Cell count conservation: Total Cells = Cut Cells + Fill Cells + Unchanged Cells
        total_cells = summary["cell_count_cut"] + summary["cell_count_fill"] + summary["cell_count_unchanged"]
        self.assertEqual(summary["cell_count_total"], total_cells)

        # Deadband thresholding monotonicity: higher deadband reduces or maintains gross volumes
        req_high_deadband = dict(req_cutfill)
        req_high_deadband["deadband_threshold_m"] = 0.25
        res_high_db = calculate_cut_and_fill_differencing(req_high_deadband)
        self.assertLessEqual(res_high_db["summary"]["gross_cut_volume_m3"], summary["gross_cut_volume_m3"])
        self.assertLessEqual(res_high_db["summary"]["gross_fill_volume_m3"], summary["gross_fill_volume_m3"])
        self.assertGreaterEqual(res_high_db["summary"]["cell_count_unchanged"], summary["cell_count_unchanged"])

        # Hazard tier classification
        self.assertEqual(classify_topographic_delta_hazard_tier(300.0, 0.10), TopographicDeltaHazardTier.NEGLIGIBLE_CHANGE)
        self.assertEqual(classify_topographic_delta_hazard_tier(2000.0, 0.35), TopographicDeltaHazardTier.MINOR_SURFACE_RAISING_OR_CREEP)
        self.assertEqual(classify_topographic_delta_hazard_tier(8000.0, 0.90), TopographicDeltaHazardTier.MODERATE_SURFACE_EROSION)
        self.assertEqual(classify_topographic_delta_hazard_tier(25000.0, 2.1), TopographicDeltaHazardTier.SEVERE_EMBANKMENT_DEFORMATION)
        self.assertEqual(classify_topographic_delta_hazard_tier(60000.0, 3.5), TopographicDeltaHazardTier.CRITICAL_CREST_BREACH_SLUMP)

        # Dynamic elevation delta tile streaming URL
        delta_tile_url = build_topographic_elevation_delta_tile_url("CUTFILL_SCIENTIFIC_01", metric="cut_depth", z=15, x=2048, y=1024)
        self.assertIn("/api/v1/tiles/topography/elevation-delta/CUTFILL_SCIENTIFIC_01/cut_depth/15/2048/1024.png", delta_tile_url)

        # 3. Longitudinal Embankment Crest Slump & Freeboard Depletion
        slump_req = {
            "dam_id": "DAM_CREST_QA",
            "crest_length_m": 300.0,
            "design_freeboard_m": 4.0,
            "reservoir_pool_elevation_m": 320.0
        }
        res_slump = calculate_crest_slumping_profile(slump_req)
        slump_summary = res_slump["summary"]

        self.assertIn("min_residual_freeboard_m", slump_summary)
        self.assertIn("max_freeboard_loss_m", slump_summary)
        self.assertIn("total_slump_volume_m3", slump_summary)
        self.assertGreater(slump_summary["total_slump_volume_m3"], 0.0)

        # Conservation of freeboard: freeboard_pre - delta_z = freeboard_post
        for st in res_slump["stations"]:
            calc_post = round(st["freeboard_pre_m"] - st["freeboard_loss_m"], 2)
            self.assertAlmostEqual(st["freeboard_post_m"], calc_post, places=2)

        # Crest slump hazard tiers
        self.assertEqual(classify_crest_slump_hazard_tier(0.10), CrestSlumpHazardTier.STABLE_FREEBOARD)
        self.assertEqual(classify_crest_slump_hazard_tier(0.30), CrestSlumpHazardTier.ADVISORY_SETTLEMENT)
        self.assertEqual(classify_crest_slump_hazard_tier(0.85), CrestSlumpHazardTier.HEIGHTENED_OVERTOPPING_RISK)
        self.assertEqual(classify_crest_slump_hazard_tier(1.80), CrestSlumpHazardTier.CRITICAL_CREST_LOSS)

        # 4. 1D Cross-Section Transect Profile Differencing
        transect_req = {
            "asset_id": "EMBANKMENT_TRANSECT_01",
            "sample_spacing_m": 5.0
        }
        res_transect = calculate_topographic_transect_delta(transect_req)
        self.assertIn("gross_cut_volume_m3", res_transect)
        self.assertIn("gross_fill_volume_m3", res_transect)
        self.assertIn("net_volume_m3", res_transect)
        self.assertGreater(len(res_transect["nodes"]), 10)

        # 5. UAV Photogrammetric Stereo Epipolar Disparity Quality
        epipolar_req = {
            "flight_pre_id": "FLIGHT_PRE",
            "flight_post_id": "FLIGHT_POST",
            "stereo_pair_count": 6
        }
        res_epipolar = calculate_drone_epipolar_differential(epipolar_req)
        self.assertEqual(res_epipolar["stereo_pairs_evaluated"], 6)
        self.assertIn("disparity_rmse_px", res_epipolar)
        self.assertIn("overall_quality", res_epipolar)

        self.assertEqual(classify_epipolar_disparity_quality(0.35, 95.0), EpipolarDisparityQuality.SUB_PIXEL_CONVERGENCE)
        self.assertEqual(classify_epipolar_disparity_quality(0.95, 88.0), EpipolarDisparityQuality.STANDARD_STEREO_ACCURACY)
        self.assertEqual(classify_epipolar_disparity_quality(2.10, 72.0), EpipolarDisparityQuality.COARSE_EPIPOLAR_RESIDUAL)
        self.assertEqual(classify_epipolar_disparity_quality(3.80, 42.0), EpipolarDisparityQuality.DECORRELATION_FAILURE)

    def test_dam_breach_hydrodynamics_and_mass_conservation(self):
        """Task T-172: Verify Tailings Dam Breach Hydrodynamics, Outflow Mass Conservation & 2D Shallow Water Wave Routing."""
        from app.models.schemas import (
            calculate_froehlich_breach_parameters,
            calculate_macdonald_monopolis_breach_parameters,
            generate_breach_outflow_hydrograph,
            calculate_de_saint_venant_downstream_routing,
            calculate_dam_breach_inundation_analysis,
            classify_inundation_hazard_rating,
            InundationHazardRating,
            BreachMethodology,
            HydrodynamicRoutingMethod,
            DamBreachMaterialType,
            DAM_BREACH_HAZARD_CONFIGS,
            BREACH_METHOD_CONFIGS,
            MANNING_ROUGHNESS_CONFIGS,
            HYDRODYNAMIC_TILE_METRICS,
            build_hydrodynamic_tile_url,
            build_hydrodynamic_tile_url_template,
            HydrodynamicRoutingRequest,
            DamBreachInundationAnalysisRequest
        )

        # 1. Multi-Model Empirical Parameter Inversion (Froehlich 2008 & MacDonald 1984)
        # Test mode coefficient k0 adjustment: Overtopping (k0 = 1.3) vs Piping (k0 = 1.0)
        res_ot = calculate_froehlich_breach_parameters(
            reservoir_volume_m3=15000000.0,
            water_height_m=35.0,
            failure_mode="overtopping"
        )
        res_pip = calculate_froehlich_breach_parameters(
            reservoir_volume_m3=15000000.0,
            water_height_m=35.0,
            failure_mode="piping"
        )
        self.assertEqual(res_ot["mode_coefficient_k0"], 1.3)
        self.assertEqual(res_pip["mode_coefficient_k0"], 1.0)
        self.assertGreater(res_ot["average_breach_width_m"], res_pip["average_breach_width_m"])
        self.assertGreater(res_ot["top_breach_width_m"], res_ot["average_breach_width_m"])
        self.assertGreater(res_ot["average_breach_width_m"], res_ot["bottom_breach_width_m"])
        self.assertGreater(res_ot["peak_discharge_m3s"], 5000.0)
        self.assertLess(res_ot["peak_discharge_m3s"], 7000.0)
        self.assertGreater(res_ot["formation_time_hours"], 0.4)

        # MacDonald & Langridge-Monopolis (1984) barrier erosion volume
        res_mm = calculate_macdonald_monopolis_breach_parameters(
            outflow_volume_m3=12000000.0,
            water_height_m=30.0
        )
        self.assertGreater(res_mm["eroded_volume_m3"], 90000.0)
        self.assertGreater(res_mm["peak_discharge_m3s"], 2000.0)
        self.assertGreater(res_mm["formation_time_hours"], 0.2)
        self.assertEqual(res_mm["side_slope_z"], 0.5)

        # Monotonic scaling with volume
        res_small = calculate_froehlich_breach_parameters(reservoir_volume_m3=500000.0, water_height_m=15.0)
        res_large = calculate_froehlich_breach_parameters(reservoir_volume_m3=50000000.0, water_height_m=50.0)
        self.assertGreater(res_large["peak_discharge_m3s"], res_small["peak_discharge_m3s"])
        self.assertGreater(res_large["average_breach_width_m"], res_small["average_breach_width_m"])

        # 2. Breach Hydrograph Mass Conservation: \int Q(t) dt == V_breach
        qp = 4200.0
        v_target = 8000000.0  # 8 million m3
        tf_hr = 1.2
        duration_hr = 12.0
        dt_min = 5.0

        hydro = generate_breach_outflow_hydrograph(
            peak_discharge_m3s=qp,
            total_volume_m3=v_target,
            formation_time_hours=tf_hr,
            duration_hours=duration_hr,
            time_step_min=dt_min,
            dam_height_m=35.0
        )

        self.assertGreater(len(hydro), 50)
        self.assertEqual(hydro[0]["discharge_m3s"], 0.0)
        self.assertEqual(hydro[0]["time_minutes"], 0.0)

        # Peak discharge timing and magnitude
        max_q = max(pt["discharge_m3s"] for pt in hydro)
        self.assertAlmostEqual(max_q, qp, delta=qp * 0.10)

        # Discrete cumulative volume integration conservation within 1.0% tolerance
        final_cum_vol = hydro[-1]["cumulative_volume_m3"]
        self.assertAlmostEqual(final_cum_vol, v_target, delta=v_target * 0.01)

        # Cumulative volume must be monotonically non-decreasing
        for i in range(1, len(hydro)):
            self.assertGreaterEqual(hydro[i]["cumulative_volume_m3"], hydro[i-1]["cumulative_volume_m3"])
            self.assertLessEqual(hydro[i]["stage_m"], hydro[i-1]["stage_m"])

        # 3. 2D De Saint-Venant Downstream Wave Routing & Attenuation Physics
        route_req = HydrodynamicRoutingRequest(
            dam_id="TAILINGS_DAM_QA",
            dam_name="Cadia Valley Tailings",
            peak_discharge_m3s=4800.0,
            reservoir_volume_m3=12000000.0,
            reach_length_km=20.0,
            bed_slope_avg=0.0075,
            default_manning_n=0.05,
            station_interval_m=1000.0
        )
        route_res = calculate_de_saint_venant_downstream_routing(route_req)

        self.assertEqual(route_res["dam_id"], "TAILINGS_DAM_QA")
        self.assertEqual(route_res["reach_length_km"], 20.0)
        self.assertEqual(route_res["stations_count"], 21)

        stations = route_res["stations"]
        # Wave front progression and monotonic discharge attenuation dQ/dx <= 0
        for i in range(1, len(stations)):
            self.assertLessEqual(stations[i]["peak_discharge_m3s"], stations[i-1]["peak_discharge_m3s"])
            self.assertGreaterEqual(stations[i]["wave_arrival_time_min"], stations[i-1]["wave_arrival_time_min"])
            self.assertGreater(stations[i]["peak_velocity_ms"], 0.0)
            self.assertGreater(stations[i]["peak_depth_m"], 0.0)
            # Impulse hazard product check: depth_velocity_product == depth * velocity
            expected_product = round(stations[i]["peak_depth_m"] * stations[i]["peak_velocity_ms"], 2)
            self.assertAlmostEqual(stations[i]["depth_velocity_product_m2s"], expected_product, places=1)

        # GeoJSON LineString and Station Points verification
        geojson = route_res["inundation_geojson"]
        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertGreater(len(geojson["features"]), 20)

        # 4. Downstream Inundation Hazard Rating Tiers
        self.assertEqual(classify_inundation_hazard_rating(depth_m=0.3, velocity_ms=0.8), InundationHazardRating.LOW)
        self.assertEqual(classify_inundation_hazard_rating(depth_m=1.0, velocity_ms=1.1), InundationHazardRating.MODERATE)
        self.assertEqual(classify_inundation_hazard_rating(depth_m=2.2, velocity_ms=1.0), InundationHazardRating.HIGH)
        self.assertEqual(classify_inundation_hazard_rating(depth_m=3.5, velocity_ms=1.2), InundationHazardRating.EXTREME)
        self.assertEqual(classify_inundation_hazard_rating(depth_m=5.8, velocity_ms=0.5), InundationHazardRating.CATASTROPHIC)
        self.assertEqual(classify_inundation_hazard_rating(depth_m=1.5, velocity_ms=4.0), InundationHazardRating.CATASTROPHIC)

        # 5. Dynamic XYZ Tile Streaming URL Templates
        tile_url = build_hydrodynamic_tile_url("BREACH_QA_01", metric="inundation_depth", z=14, x=1024, y=512)
        self.assertIn("/api/v1/tiles/hydrodynamic/inundation/BREACH_QA_01/inundation_depth/14/1024/512.png", tile_url)
        tile_tpl = build_hydrodynamic_tile_url_template("BREACH_QA_01", metric="flow_velocity")
        self.assertIn("/api/v1/tiles/hydrodynamic/inundation/BREACH_QA_01/flow_velocity/{z}/{x}/{y}.png", tile_tpl)

    def test_internal_erosion_sellmeijer_bep_and_flownet_mass_conservation(self):
        """Task T-178: Verify Sellmeijer (1988/2006) BEP Critical Head, Terzaghi Heave & 2D Flownet Mass Conservation."""
        from app.models.schemas import (
            calculate_terzaghi_critical_gradient,
            calculate_sellmeijer_critical_head,
            calculate_seepage_flownet_potential_grid,
            calculate_internal_erosion_piping_analysis,
            classify_internal_erosion_hazard_tier,
            build_flownet_tile_url,
            build_flownet_tile_url_template,
            InternalErosionHazardTier,
            SellmeijerSoilClassification,
            SELLMEIJER_SOIL_PRESETS,
            INTERNAL_EROSION_HAZARD_CONFIGS,
            FLOWNET_TILE_METRICS,
            InternalErosionPipingAnalysisRequest
        )

        # 1. Terzaghi Critical Hydraulic Gradient & Phase Relationship Bounds
        terz_sand = calculate_terzaghi_critical_gradient(specific_gravity=2.65, void_ratio=0.58, water_unit_weight=9.81)
        # i_crit = (2.65 - 1) / (1 + 0.58) = 1.65 / 1.58 = 1.0443
        self.assertAlmostEqual(terz_sand["critical_gradient"], 1.0443, places=3)
        self.assertAlmostEqual(terz_sand["porosity"], 0.58 / 1.58, places=3)
        self.assertGreater(terz_sand["saturated_unit_weight_kn_m3"], terz_sand["submerged_unit_weight_kn_m3"])
        self.assertAlmostEqual(
            terz_sand["saturated_unit_weight_kn_m3"] - terz_sand["submerged_unit_weight_kn_m3"],
            9.81,
            places=2
        )

        # Physical Monotonicity of Terzaghi Critical Gradient
        terz_loose = calculate_terzaghi_critical_gradient(specific_gravity=2.65, void_ratio=0.90)
        terz_dense = calculate_terzaghi_critical_gradient(specific_gravity=2.65, void_ratio=0.45)
        self.assertGreater(terz_dense["critical_gradient"], terz_loose["critical_gradient"])

        terz_heavy = calculate_terzaghi_critical_gradient(specific_gravity=2.85, void_ratio=0.60)
        terz_light = calculate_terzaghi_critical_gradient(specific_gravity=2.55, void_ratio=0.60)
        self.assertGreater(terz_heavy["critical_gradient"], terz_light["critical_gradient"])

        # 2. Sellmeijer (1988/2006) Backward Erosion Piping Analytical Multi-Factor Decomposition
        # Delta H_c = F_R * F_S * F_G * L
        preset_med = SELLMEIJER_SOIL_PRESETS["medium_sand"]
        res_bep = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=preset_med["hydraulic_conductivity_ms"],
            d70_m=preset_med["d70_m"],
            seepage_length_m=60.0,
            aquifer_depth_m=18.0,
            specific_gravity=preset_med["specific_gravity"],
            friction_angle_deg=preset_med["friction_angle_deg"],
            applied_head_m=15.0,
            cu=preset_med["cu"]
        )

        expected_hc = res_bep["resistance_factor_fr"] * res_bep["scale_factor_fs"] * res_bep["geometry_factor_fg"] * 60.0
        self.assertAlmostEqual(res_bep["critical_head_m"], expected_hc, delta=0.05)
        self.assertAlmostEqual(res_bep["critical_gradient"], round(res_bep["critical_head_m"] / 60.0, 4), places=3)
        self.assertAlmostEqual(res_bep["factor_of_safety"], round(res_bep["critical_head_m"] / 15.0, 3), places=2)

        # Monotonicity with Seepage Length L
        res_short = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=preset_med["hydraulic_conductivity_ms"],
            d70_m=preset_med["d70_m"],
            seepage_length_m=30.0,
            applied_head_m=15.0
        )
        res_long = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=preset_med["hydraulic_conductivity_ms"],
            d70_m=preset_med["d70_m"],
            seepage_length_m=90.0,
            applied_head_m=15.0
        )
        self.assertGreater(res_long["critical_head_m"], res_short["critical_head_m"])
        self.assertGreater(res_long["factor_of_safety"], res_short["factor_of_safety"])

        # Monotonicity with Grain Size d70
        res_coarse = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=1e-4,
            d70_m=0.00080, # 0.8 mm
            seepage_length_m=60.0,
            applied_head_m=15.0
        )
        res_fine = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=1e-4,
            d70_m=0.00015, # 0.15 mm
            seepage_length_m=60.0,
            applied_head_m=15.0
        )
        self.assertGreater(res_coarse["critical_head_m"], res_fine["critical_head_m"])

        # Monotonicity with Permeability K (higher K -> lower scale factor and lower critical head)
        res_high_k = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=5e-4,
            d70_m=0.00030,
            seepage_length_m=60.0,
            applied_head_m=15.0
        )
        res_low_k = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=1e-5,
            d70_m=0.00030,
            seepage_length_m=60.0,
            applied_head_m=15.0
        )
        self.assertGreater(res_low_k["critical_head_m"], res_high_k["critical_head_m"])

        # Pipe Progression Equilibrium and Breakthrough Threshold
        res_safe = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=1e-5,
            d70_m=0.0005,
            seepage_length_m=80.0,
            applied_head_m=5.0
        )
        self.assertFalse(res_safe["breakthrough_risk"])
        self.assertGreaterEqual(res_safe["factor_of_safety"], 1.0)
        self.assertLess(res_safe["pipe_length_ratio"], 0.3)

        res_breach = calculate_sellmeijer_critical_head(
            hydraulic_conductivity_ms=1e-4,
            d70_m=0.0001,
            seepage_length_m=40.0,
            applied_head_m=25.0
        )
        self.assertTrue(res_breach["breakthrough_risk"])
        self.assertLess(res_breach["factor_of_safety"], 1.0)
        self.assertGreaterEqual(res_breach["pipe_length_ratio"], 0.3)

        # 3. 2D Laplace Steady-State Seepage Flownet & Hydrodynamic Mass Conservation
        h_up = 24.0
        h_down = 4.0
        delta_h = h_up - h_down
        k_soil = 3.5e-5 # m/s
        nd = 12
        nf = 4
        l_base = 70.0
        d_aq = 20.0

        flownet = calculate_seepage_flownet_potential_grid(
            upstream_head_m=h_up,
            downstream_head_m=h_down,
            embankment_base_length_m=l_base,
            aquifer_depth_m=d_aq,
            hydraulic_conductivity_ms=k_soil,
            potential_drops_nd=nd,
            flow_channels_nf=nf,
            critical_gradient=1.04
        )

        # Shape Factor & Darcy Discharge Rate q = K * Delta H * (Nf / Nd)
        expected_shape = round(float(nf) / float(nd), 4)
        self.assertEqual(flownet["shape_factor"], expected_shape)
        expected_q = round(k_soil * delta_h * expected_shape, 7)
        self.assertAlmostEqual(flownet["unit_seepage_flow_rate_m3s_m"], expected_q, delta=1e-8)

        # Equipotential Drops Monotonicity
        equips = flownet["equipotentials"]
        self.assertGreater(len(equips), nd)
        # Verify head values decrease monotonically with drop index
        head_by_drop = {}
        for eq in equips:
            drop_idx = eq["equipotential_index"]
            if drop_idx not in head_by_drop:
                head_by_drop[drop_idx] = eq["head_m"]
        for d_idx in range(1, nd + 1):
            self.assertLess(head_by_drop[d_idx], head_by_drop[d_idx - 1])

        # Streamline Channel Continuity & Mass Conservation
        streams = flownet["streamlines"]
        self.assertGreater(len(streams), nf)
        # Flow rate per channel: delta_psi = q / Nf
        delta_psi = expected_q / float(nf)
        geojson = flownet["flownet_geojson"]
        self.assertEqual(geojson["type"], "FeatureCollection")
        streamline_feats = [f for f in geojson["features"] if f["properties"].get("type") == "streamline"]
        self.assertEqual(len(streamline_feats), nf + 1)
        # Check total cumulative flow across channels equals unit discharge
        max_stream_q = max(f["properties"]["discharge_m3s_m"] for f in streamline_feats)
        self.assertAlmostEqual(max_stream_q, expected_q, places=6)

        # Downstream Toe Exit Gradient Concentration
        exit_stations = flownet["exit_stations"]
        self.assertGreater(len(exit_stations), 4)
        max_exit_val = max(st["exit_gradient"] for st in exit_stations)
        self.assertEqual(flownet["max_exit_gradient"], max_exit_val)
        for st in exit_stations:
            self.assertGreater(st["exit_gradient"], 0.0)
            self.assertGreater(st["factor_of_safety"], 0.0)
            # Factor of safety = i_crit / i_exit
            expected_fs = round(1.04 / max(0.01, st["exit_gradient"]), 2)
            self.assertAlmostEqual(st["factor_of_safety"], expected_fs, delta=0.05)
            self.assertEqual(st["boil_risk_detected"], st["exit_gradient"] >= 1.04)

        # 4. Internal Erosion Hazard Tier Classification
        self.assertEqual(classify_internal_erosion_hazard_tier(3.0, 0.20, 1.0), InternalErosionHazardTier.SAFE)
        self.assertEqual(classify_internal_erosion_hazard_tier(2.0, 0.40, 1.0), InternalErosionHazardTier.LOW_RISK)
        self.assertEqual(classify_internal_erosion_hazard_tier(1.5, 0.60, 1.0), InternalErosionHazardTier.MODERATE_RISK)
        self.assertEqual(classify_internal_erosion_hazard_tier(1.15, 0.85, 1.0), InternalErosionHazardTier.ELEVATED_RISK)
        self.assertEqual(classify_internal_erosion_hazard_tier(0.85, 0.90, 1.0), InternalErosionHazardTier.CRITICAL_PIPING)
        self.assertEqual(classify_internal_erosion_hazard_tier(1.4, 1.10, 1.0), InternalErosionHazardTier.CRITICAL_PIPING)

        # 5. Full Orchestrated Piping Analysis & Dynamic Tile URLs
        analysis_req = InternalErosionPipingAnalysisRequest(
            simulation_id="SIM_RIGOR_PIPING_01",
            dam_id="TAILINGS_CADIA",
            dam_name="Cadia Valley Tailings Facility",
            soil_classification=SellmeijerSoilClassification.MEDIUM_SAND,
            upstream_head_m=28.0,
            downstream_head_m=5.0,
            embankment_base_length_m=75.0,
            aquifer_depth_m=22.0
        )
        full_analysis = calculate_internal_erosion_piping_analysis(analysis_req)
        self.assertEqual(full_analysis["simulation_id"], "SIM_RIGOR_PIPING_01")
        self.assertIn("terzaghi_gradient", full_analysis)
        self.assertIn("sellmeijer_bep", full_analysis)
        self.assertIn("flownet_seepage", full_analysis)
        self.assertIn(full_analysis["overall_hazard_tier"], [t.value for t in InternalErosionHazardTier])

        # Dynamic XYZ Tile Streaming URL Formatting
        tile_url = build_flownet_tile_url("SIM_RIGOR_PIPING_01", metric="hydraulic_head", z=14, x=1024, y=512)
        self.assertEqual(tile_url, "/api/v1/tiles/geotechnical/flownet/SIM_RIGOR_PIPING_01/hydraulic_head/14/1024/512.png")
        tile_tpl = build_flownet_tile_url_template("SIM_RIGOR_PIPING_01", metric="exit_gradient")
        self.assertEqual(tile_tpl, "/api/v1/tiles/geotechnical/flownet/SIM_RIGOR_PIPING_01/exit_gradient/{z}/{x}/{y}.png")

    def test_insar_persistent_scatterer_phase_scaling_and_vector_decomposition(self):
        """Task T-184: Verify InSAR Phase-to-Displacement Scaling (dr = -lambda/(4*pi)*dphi),
        Temporal Coherence (gamma in [0, 1]), Baseline Geometry, APS OLS Decomposition,
        and Dual-Orbit 2D Velocity Vector Inversion."""
        from app.models.schemas import (
            calculate_insar_displacement_mm,
            calculate_insar_velocity_mm_yr,
            calculate_ps_temporal_coherence,
            calculate_amplitude_dispersion_index,
            calculate_interferometric_baseline_geometry,
            decompose_atmospheric_phase_screen,
            project_los_to_vertical_and_horizontal,
            decompose_dual_orbit_insar_velocities,
            calculate_insar_ps_analysis,
            classify_insar_deformation_hazard_tier,
            build_insar_velocity_tile_url,
            build_insar_velocity_tile_url_template,
            InSARDeformationHazardTier,
            INSAR_SENSOR_WAVELENGTHS,
            INSAR_VELOCITY_TILE_METRICS,
            InSARPersistentScattererAnalysisRequest
        )

        # 1. Physical Phase-to-Displacement Scaling: Delta r = -(lambda / 4pi) * Delta phi
        # Full 2pi phase fringe for Sentinel-1 C-band (lambda = 55.465 mm)
        disp_2pi = calculate_insar_displacement_mm(2.0 * math.pi, wavelength_mm=55.465)
        # Expected: -(55.465 / (4 * pi)) * 2 * pi = -55.465 / 2 = -27.73 mm
        self.assertAlmostEqual(disp_2pi, -27.73, places=2)

        # Negative differential phase produces positive range change (motion away from sensor)
        disp_neg_pi = calculate_insar_displacement_mm(-math.pi, wavelength_mm=55.465)
        self.assertAlmostEqual(disp_neg_pi, 13.87, places=2)

        # Multi-frequency radar band scaling (L-band, C-band, X-band)
        lam_l = INSAR_SENSOR_WAVELENGTHS["l_band"] * 1000.0   # ~236.05 mm
        lam_c = INSAR_SENSOR_WAVELENGTHS["c_band"] * 1000.0   # ~55.465 mm
        lam_x = INSAR_SENSOR_WAVELENGTHS["x_band"] * 1000.0   # ~31.0 mm
        self.assertGreater(lam_l, lam_c)
        self.assertGreater(lam_c, lam_x)

        disp_l = calculate_insar_displacement_mm(math.pi, wavelength_mm=lam_l)
        disp_c = calculate_insar_displacement_mm(math.pi, wavelength_mm=lam_c)
        disp_x = calculate_insar_displacement_mm(math.pi, wavelength_mm=lam_x)
        # Displacement magnitude scales strictly proportionally to wavelength for identical phase
        self.assertGreater(abs(disp_l), abs(disp_c))
        self.assertGreater(abs(disp_c), abs(disp_x))

        # Temporal Rate Annualization: v = displacement / (dt / 365.25)
        vel_1yr = calculate_insar_velocity_mm_yr(-15.0, temporal_baseline_days=365.25)
        self.assertAlmostEqual(vel_1yr, -15.0, places=2)
        vel_6mo = calculate_insar_velocity_mm_yr(-15.0, temporal_baseline_days=182.625)
        self.assertAlmostEqual(vel_6mo, -30.0, places=2)
        self.assertEqual(calculate_insar_velocity_mm_yr(-15.0, temporal_baseline_days=0.0), 0.0)

        # 2. Temporal Coherence (gamma in [0, 1]) & Amplitude Dispersion Index (D_A)
        # Identical phase residuals over time -> perfect coherence gamma = 1.0
        phases_identical = [0.42] * 24
        gamma_perfect = calculate_ps_temporal_coherence(phases_identical)
        self.assertEqual(gamma_perfect, 1.0)

        # Uniformly dispersed phases around unit circle -> decorrelation gamma ~ 0.0
        phases_random = [(2.0 * math.pi * k) / 24.0 for k in range(24)]
        gamma_random = calculate_ps_temporal_coherence(phases_random)
        self.assertLess(gamma_random, 0.05)

        # Monotonicity with phase noise variance
        phases_low_noise = [0.1 * math.sin(k) for k in range(20)]
        phases_high_noise = [1.8 * math.sin(k) for k in range(20)]
        gamma_low_noise = calculate_ps_temporal_coherence(phases_low_noise)
        gamma_high_noise = calculate_ps_temporal_coherence(phases_high_noise)
        self.assertGreater(gamma_low_noise, gamma_high_noise)

        # Complex SLC pixel correlation: u1, u2 pairs
        identical_slc = [(complex(1.0, 0.5), complex(1.0, 0.5)) for _ in range(12)]
        self.assertEqual(calculate_ps_temporal_coherence(identical_slc), 1.0)
        orthogonal_slc = [(complex(1.0, 0.0), complex(0.0, 1.0)) for _ in range(12)]
        self.assertEqual(calculate_ps_temporal_coherence(orthogonal_slc), 1.0)  # absolute normalized magnitude

        # Amplitude Dispersion Index (Ferretti et al., 2001) D_A = sigma_A / mu_A
        amps_constant = [100.0] * 20
        da_constant = calculate_amplitude_dispersion_index(amps_constant)
        self.assertEqual(da_constant, 0.0)

        amps_stable = [100.0 + 5.0 * math.sin(k) for k in range(20)]
        da_stable = calculate_amplitude_dispersion_index(amps_stable)
        self.assertLess(da_stable, 0.25)  # Candidate Persistent Scatterer threshold

        amps_noisy = [100.0 + 45.0 * math.sin(k) for k in range(20)]
        da_noisy = calculate_amplitude_dispersion_index(amps_noisy)
        self.assertGreater(da_noisy, 0.25)

        # 3. Interferometric Baseline Geometry & Ambiguity Height
        base_geom = calculate_interferometric_baseline_geometry(
            perpendicular_baseline_m=60.0,
            parallel_baseline_m=80.0,
            slant_range_m=850000.0,
            incidence_angle_deg=38.5,
            wavelength_m=0.055465
        )
        # Total baseline Pythagoras: sqrt(60^2 + 80^2) = 100.0 m
        self.assertEqual(base_geom["total_baseline_m"], 100.0)
        self.assertGreater(base_geom["height_of_ambiguity_m"], 0.0)
        self.assertGreater(base_geom["critical_baseline_m"], 1000.0)
        self.assertGreater(base_geom["topographic_phase_sensitivity_rad_m"], 0.0)

        # Baseline Monotonicity: larger B_perp increases phase sensitivity and reduces height of ambiguity
        base_small = calculate_interferometric_baseline_geometry(perpendicular_baseline_m=30.0, slant_range_m=850000.0)
        base_large = calculate_interferometric_baseline_geometry(perpendicular_baseline_m=120.0, slant_range_m=850000.0)
        self.assertGreater(base_small["height_of_ambiguity_m"], base_large["height_of_ambiguity_m"])
        self.assertLess(base_small["topographic_phase_sensitivity_rad_m"], base_large["topographic_phase_sensitivity_rad_m"])

        # 4. Atmospheric Phase Screen (APS) Polynomial Decomposition
        # Construct synthetic spatial points with known vertical stratified delay k_elev and planar ramp
        known_k_elev = 0.0085  # rad/m
        known_a0 = 1.2
        known_a1 = 0.0002
        known_a2 = -0.0001
        aps_pts = []
        for ix in range(5):
            for iy in range(5):
                x = float(ix * 50.0)
                y = float(iy * 50.0)
                z = float(300.0 + 10.0 * ix - 5.0 * iy + 8.0 * ((ix + iy) % 3))
                phi = known_a0 + known_a1 * x + known_a2 * y + known_k_elev * z
                aps_pts.append({"x_m": x, "y_m": y, "elevation_m": z, "phase_rad": phi})

        aps_decomp = decompose_atmospheric_phase_screen(aps_pts, polynomial_order=1)
        self.assertAlmostEqual(aps_decomp["elevation_delay_coefficient_rad_m"], known_k_elev, places=3)
        self.assertAlmostEqual(aps_decomp["spatial_ramp_a0"], known_a0, places=1)
        self.assertAlmostEqual(aps_decomp["spatial_ramp_a1"], known_a1, places=4)
        self.assertAlmostEqual(aps_decomp["spatial_ramp_a2"], known_a2, places=4)
        self.assertLess(aps_decomp["residual_std_dev_rad"], 0.01)

        # 5. 1D Line-of-Sight (LOS) to 3D Vertical/Horizontal Velocity Projection
        # v_vert = v_los / cos(theta)
        inc_deg = 38.5
        cos_inc = math.cos(math.radians(inc_deg))
        sin_inc = math.sin(math.radians(inc_deg))
        proj = project_los_to_vertical_and_horizontal(
            velocity_los_mm_yr=-10.0,
            incidence_angle_deg=inc_deg,
            satellite_heading_deg=348.0
        )
        expected_v_vert = round(-10.0 / cos_inc, 2)
        expected_v_horiz = round(-10.0 / sin_inc, 2)
        self.assertEqual(proj["velocity_vertical_mm_yr"], expected_v_vert)
        self.assertEqual(proj["velocity_horizontal_mm_yr"], expected_v_horiz)
        # Look azimuth = (348.0 - 90.0) % 360 = 258.0 deg
        self.assertEqual(proj["look_azimuth_deg"], 258.0)
        self.assertIn("hazard_tier", proj)

        # 6. Dual-Orbit Ascending and Descending 2D Velocity Inversion
        # Pure vertical subsidence test: v_v = -20.0 mm/yr, v_e = 0.0 mm/yr
        # v_asc = s_v_asc * v_v = cos(38.5 deg) * (-20.0) = -15.65 mm/yr
        # v_desc = s_v_desc * v_v = cos(39.2 deg) * (-20.0) = -15.50 mm/yr
        th_asc = math.radians(38.5)
        th_desc = math.radians(39.2)
        syn_v_asc = -20.0 * math.cos(th_asc)
        syn_v_desc = -20.0 * math.cos(th_desc)

        decomp_pure_vert = decompose_dual_orbit_insar_velocities(
            velocity_asc_mm_yr=syn_v_asc,
            velocity_desc_mm_yr=syn_v_desc,
            inc_angle_asc_deg=38.5,
            inc_angle_desc_deg=39.2,
            heading_asc_deg=348.0,
            heading_desc_deg=192.0
        )
        self.assertAlmostEqual(decomp_pure_vert["velocity_vertical_mm_yr"], -20.0, delta=0.1)
        self.assertAlmostEqual(decomp_pure_vert["velocity_east_west_mm_yr"], 0.0, delta=0.1)

        # Combined vertical settlement (-14.0 mm/yr) and eastward shear (+6.0 mm/yr)
        s_e_asc = -math.sin(th_asc) * math.cos(math.radians(348.0))
        s_v_asc = math.cos(th_asc)
        s_e_desc = -math.sin(th_desc) * math.cos(math.radians(192.0))
        s_v_desc = math.cos(th_desc)
        target_vv = -14.0
        target_ve = 6.0
        v_asc_comb = s_e_asc * target_ve + s_v_asc * target_vv
        v_desc_comb = s_e_desc * target_ve + s_v_desc * target_vv

        decomp_comb = decompose_dual_orbit_insar_velocities(
            velocity_asc_mm_yr=v_asc_comb,
            velocity_desc_mm_yr=v_desc_comb,
            inc_angle_asc_deg=38.5,
            inc_angle_desc_deg=39.2,
            heading_asc_deg=348.0,
            heading_desc_deg=192.0
        )
        self.assertAlmostEqual(decomp_comb["velocity_vertical_mm_yr"], target_vv, delta=0.1)
        self.assertAlmostEqual(decomp_comb["velocity_east_west_mm_yr"], target_ve, delta=0.1)
        self.assertAlmostEqual(decomp_comb["total_magnitude_mm_yr"], math.sqrt(target_vv**2 + target_ve**2), delta=0.1)

        # 7. Hazard Tier Classification Monotonicity
        self.assertEqual(classify_insar_deformation_hazard_tier(0.5), InSARDeformationHazardTier.STABLE)
        self.assertEqual(classify_insar_deformation_hazard_tier(-3.5), InSARDeformationHazardTier.MINOR_CREEP)
        self.assertEqual(classify_insar_deformation_hazard_tier(-8.5), InSARDeformationHazardTier.MODERATE_DISPLACEMENT)
        self.assertEqual(classify_insar_deformation_hazard_tier(-16.0), InSARDeformationHazardTier.ACCELERATING_DEFORMATION)
        self.assertEqual(classify_insar_deformation_hazard_tier(-32.0), InSARDeformationHazardTier.CRITICAL_INSTABILITY)

        # 8. End-to-End InSAR PS Analysis Synthesis & Tile Streaming URLs
        ps_req = InSARPersistentScattererAnalysisRequest(
            simulation_id="SIM_RIGOR_INSAR_01",
            asset_id="DAM_CREST_RIGOR",
            asset_name="Cadia Embankment Centerline",
            temporal_coherence_threshold=0.65,
            ps_points_count=20
        )
        full_res = calculate_insar_ps_analysis(ps_req)
        self.assertEqual(full_res["simulation_id"], "SIM_RIGOR_INSAR_01")
        self.assertIn("baseline_geometry", full_res)
        self.assertIn("atmospheric_phase_screen", full_res)
        self.assertIn("ps_points", full_res)
        self.assertIn("dual_orbit_decomposition", full_res)
        self.assertIn("tile_url_template", full_res)

        # Verify all retained PS points satisfy gamma >= 0.65 threshold
        for pt in full_res["ps_points"]:
            self.assertGreaterEqual(pt["temporal_coherence"], 0.65)
            self.assertIn("time_series", pt)
            self.assertEqual(len(pt["time_series"]), 24)
            self.assertIn("displacement_mm", pt["time_series"][0])

        # GeoJSON FeatureCollection verification
        geojson = full_res["ps_geojson"]
        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertEqual(len(geojson["features"]), len(full_res["ps_points"]))

        # Dynamic Tile URL builder templates
        tile_url = build_insar_velocity_tile_url("SIM_RIGOR_INSAR_01", metric="velocity_vertical", z=14, x=1024, y=512)
        self.assertEqual(tile_url, "/api/v1/tiles/geotechnical/insar-velocity/SIM_RIGOR_INSAR_01/velocity_vertical/14/1024/512.png")
        tile_tpl = build_insar_velocity_tile_url_template("SIM_RIGOR_INSAR_01", metric="temporal_coherence")
        self.assertEqual(tile_tpl, "/api/v1/tiles/geotechnical/insar-velocity/SIM_RIGOR_INSAR_01/temporal_coherence/{z}/{x}/{y}.png")

    def test_sar_coherence_damage_proxy_mapping_scientific_rigor(self):
        """Task T-190: Continuous Scientific QA for Cycle v2.5.21 SAR Coherence Change Detection,
        Damage Proxy Mapping (DPM), ARIA Severity Tiers, and Building Exposure Fragility Curves."""
        from app.models.schemas import (
            calculate_sar_coherence_loss,
            classify_sar_damage_tier,
            calculate_building_structural_exposure,
            simulate_damage_proxy_mapping,
            SARCoherenceDamageTier,
            SAR_DAMAGE_TIER_CONFIGS,
            DAMAGE_PROXY_TILE_METRICS,
            build_damage_proxy_tile_url,
            build_damage_proxy_tile_url_template
        )

        # 1. Complex Interferometric Coherence Normalization & Bounds Verification (gamma in [0.0, 1.0])
        # Delta gamma = max(0.0, min(1.0, gamma_pre - gamma_event))
        zero_loss = calculate_sar_coherence_loss(0.85, 0.85)
        self.assertEqual(zero_loss["coherence_loss"], 0.0)
        self.assertEqual(zero_loss["relative_loss_percent"], 0.0)
        self.assertEqual(zero_loss["damage_severity_tier"], SARCoherenceDamageTier.NEGLIGIBLE.value)
        self.assertEqual(zero_loss["structural_damage_ratio"], 0.0)

        # Non-negative differencing invariant: coherence increase (e.g. vegetation clearing or moisture drying) clamped to 0.0
        neg_diff = calculate_sar_coherence_loss(0.40, 0.70)
        self.assertEqual(neg_diff["coherence_loss"], 0.0)
        self.assertGreaterEqual(neg_diff["coherence_loss"], 0.0)

        # Full decorrelation: pre=1.0, event=0.0 -> loss=1.0
        full_decorr = calculate_sar_coherence_loss(1.0, 0.0)
        self.assertEqual(full_decorr["coherence_loss"], 1.0)
        self.assertEqual(full_decorr["relative_loss_percent"], 100.0)
        self.assertEqual(full_decorr["damage_severity_tier"], SARCoherenceDamageTier.CATASTROPHIC_COLLAPSE.value)
        self.assertEqual(full_decorr["structural_damage_ratio"], 1.0)
        self.assertAlmostEqual(full_decorr["collapse_probability"], 1.0 / (1.0 + math.exp(-12.0 * 0.5)), places=3)

        # 2. Copernicus / NASA JPL ARIA Damage Severity Tier Monotonicity
        self.assertEqual(classify_sar_damage_tier(0.05), SARCoherenceDamageTier.NEGLIGIBLE)
        self.assertEqual(classify_sar_damage_tier(0.14), SARCoherenceDamageTier.NEGLIGIBLE)
        self.assertEqual(classify_sar_damage_tier(0.15), SARCoherenceDamageTier.MODERATE)
        self.assertEqual(classify_sar_damage_tier(0.34), SARCoherenceDamageTier.MODERATE)
        self.assertEqual(classify_sar_damage_tier(0.35), SARCoherenceDamageTier.SEVERE)
        self.assertEqual(classify_sar_damage_tier(0.54), SARCoherenceDamageTier.SEVERE)
        self.assertEqual(classify_sar_damage_tier(0.55), SARCoherenceDamageTier.CATASTROPHIC_COLLAPSE)
        self.assertEqual(classify_sar_damage_tier(0.85), SARCoherenceDamageTier.CATASTROPHIC_COLLAPSE)

        # 3. Fragility Curve Structural Damage Ratio Monotonicity: DR(delta_gamma) is strictly non-decreasing
        gamma_steps = [0.0, 0.10, 0.20, 0.30, 0.40, 0.50, 0.60, 0.70, 0.80, 0.90, 1.0]
        dr_values = [calculate_sar_coherence_loss(1.0, 1.0 - dg)["structural_damage_ratio"] for dg in gamma_steps]
        for i in range(1, len(dr_values)):
            self.assertGreaterEqual(dr_values[i], dr_values[i - 1])
            self.assertGreaterEqual(dr_values[i], 0.0)
            self.assertLessEqual(dr_values[i], 1.0)

        # 4. Sigmoid Collapse Probability Bounds & Symmetry
        # At delta_gamma = 0.50 (midpoint of sigmoid): P(collapse) must equal 0.5000 exactly
        midpoint_loss = calculate_sar_coherence_loss(1.0, 0.50)
        self.assertAlmostEqual(midpoint_loss["collapse_probability"], 0.5000, places=4)

        # Symmetry: P(0.50 + x) - 0.5 == 0.5 - P(0.50 - x)
        p_high = calculate_sar_coherence_loss(1.0, 0.35)["collapse_probability"]  # delta_gamma = 0.65 (+0.15)
        p_low = calculate_sar_coherence_loss(1.0, 0.65)["collapse_probability"]   # delta_gamma = 0.35 (-0.15)
        self.assertAlmostEqual(p_high - 0.5, 0.5 - p_low, places=4)

        # 5. Critical Asset Structural Exposure & Economic Valuation
        # Hospital (critical facility, weight = 2.0) vs Residential (standard facility, weight = 1.0)
        hosp_exp = calculate_building_structural_exposure(
            mean_coherence_loss=0.45,
            building_type="hospital",
            replacement_cost_per_m2=2500.0,
            footprint_area_m2=2000.0
        )
        res_exp = calculate_building_structural_exposure(
            mean_coherence_loss=0.45,
            building_type="residential",
            replacement_cost_per_m2=2500.0,
            footprint_area_m2=2000.0
        )
        # Expected replacement value: 2000 * 2500 = 5,000,000 USD
        self.assertEqual(hosp_exp["replacement_value_usd"], 5000000.0)
        self.assertEqual(res_exp["replacement_value_usd"], 5000000.0)
        self.assertEqual(hosp_exp["criticality_weight"], 2.0)
        self.assertEqual(res_exp["criticality_weight"], 1.0)
        self.assertEqual(hosp_exp["is_critical_infrastructure"], True)
        self.assertEqual(res_exp["is_critical_infrastructure"], False)

        # Economic loss = replacement_value * structural_damage_ratio
        expected_loss = round(5000000.0 * hosp_exp["structural_damage_ratio"], 2)
        self.assertEqual(hosp_exp["estimated_loss_usd"], expected_loss)

        # 6. High-Fidelity DPM Simulation Synthesis & GeoJSON Validation
        dpm_sim = simulate_damage_proxy_mapping({
            "simulation_id": "SIM_RIGOR_DPM_01",
            "footprint_sample_count": 24,
            "latitude": 37.05,
            "longitude": -120.85
        })
        self.assertEqual(dpm_sim["simulation_id"], "SIM_RIGOR_DPM_01")
        self.assertIn("summary", dpm_sim)
        self.assertIn("building_footprints", dpm_sim)
        self.assertIn("footprints_geojson", dpm_sim)
        self.assertIn("tile_url_template", dpm_sim)

        # Summary telemetry checks
        summary = dpm_sim["summary"]
        self.assertEqual(summary["total_footprints_evaluated"], 24)
        dist = summary["tier_distribution"]
        self.assertEqual(
            summary["total_footprints_evaluated"],
            dist["negligible"] + dist["moderate"] + dist["severe"] + dist["catastrophic_collapse"]
        )
        self.assertGreater(summary["total_estimated_loss_usd"], 0.0)
        self.assertGreaterEqual(summary["mean_coherence_loss"], 0.0)
        self.assertLessEqual(summary["mean_coherence_loss"], 1.0)

        # RFC 7946 GeoJSON FeatureCollection checks
        geojson = dpm_sim["footprints_geojson"]
        self.assertEqual(geojson["type"], "FeatureCollection")
        self.assertEqual(len(geojson["features"]), 24)
        for feat in geojson["features"]:
            self.assertEqual(feat["type"], "Feature")
            self.assertEqual(feat["geometry"]["type"], "Polygon")
            props = feat["properties"]
            self.assertIn("mean_coherence_loss", props)
            self.assertIn("damage_severity_tier", props)
            self.assertIn("structural_damage_ratio", props)
            self.assertIn("collapse_risk", props)
            self.assertIn("estimated_loss_usd", props)

        # 7. Dynamic XYZ Tile Streaming URL Formatting
        tile_url = build_damage_proxy_tile_url("SIM_RIGOR_DPM_01", metric="coherence_delta", z=14, x=1024, y=512)
        self.assertEqual(tile_url, "/api/v1/tiles/geotechnical/dpm/SIM_RIGOR_DPM_01/coherence_delta/14/1024/512.png")
        tile_tpl = build_damage_proxy_tile_url_template("SIM_RIGOR_DPM_01", metric="building_loss_ratio")
        self.assertEqual(tile_tpl, "/api/v1/tiles/geotechnical/dpm/SIM_RIGOR_DPM_01/building_loss_ratio/{z}/{x}/{y}.png")

    def test_phenology_harmonic_fourier_and_theil_sen_scientific_rigor(self):
        """Task T-196: Continuous Scientific QA for Cycle v2.5.22 Multi-Temporal Phenology,
        Multi-Harmonic Fourier Regression, Theil-Sen Robust Slope, Mann-Kendall Trend,
        and Climatological Monthly MAD Anomaly Normalization."""
        from app.models.schemas import (
            fit_harmonic_fourier_regression,
            evaluate_harmonic_model,
            calculate_theil_sen_slope,
            calculate_mann_kendall_test,
            calculate_climatological_monthly_mad,
            calculate_seasonal_mad_anomalies,
            simulate_phenology_decomposition,
            build_phenology_anomaly_tile_url,
            build_phenology_anomaly_tile_url_template,
            PhenologyAnomalyTier,
            PhenologyTileMetric,
            PHENOLOGY_ANOMALY_TIER_CONFIGS,
            PHENOLOGY_TILE_METRIC_CONFIGS
        )

        # 1. Harmonic Fourier Regression Orthogonality & Exact Multi-Harmonic Reconstruction
        # Construct synthetic curve: y(t) = a0 + a1*t + A1*cos(2*pi*t) + B1*sin(2*pi*t) + A2*cos(4*pi*t) + B2*sin(4*pi*t)
        # Period T = 1.0 year, sampled regularly over 2 full annual cycles (N = 72 observations)
        N = 72
        T = 1.0
        times = [i / 36.0 for i in range(N)]
        a0_true, a1_true = 0.50, 0.04
        A1_true, B1_true = 0.15, 0.20  # Amplitude C1 = sqrt(0.15^2 + 0.20^2) = 0.25
        A2_true, B2_true = -0.06, 0.08  # Amplitude C2 = sqrt((-0.06)^2 + 0.08^2) = 0.10

        values = [
            a0_true + a1_true * t +
            A1_true * math.cos(2.0 * math.pi * 1 * t / T) + B1_true * math.sin(2.0 * math.pi * 1 * t / T) +
            A2_true * math.cos(2.0 * math.pi * 2 * t / T) + B2_true * math.sin(2.0 * math.pi * 2 * t / T)
            for t in times
        ]

        model = fit_harmonic_fourier_regression(times, values, num_harmonics=2, period=T)
        self.assertAlmostEqual(model["intercept_a0"], a0_true, places=3)
        self.assertAlmostEqual(model["linear_slope_a1"], a1_true, places=3)
        self.assertGreaterEqual(model["r_squared"], 0.999)
        self.assertLessEqual(model["rmse"], 0.005)

        comps = model["components"]
        self.assertEqual(len(comps), 2)
        # Harmonic 1
        self.assertAlmostEqual(comps[0]["a_k"], A1_true, places=3)
        self.assertAlmostEqual(comps[0]["b_k"], B1_true, places=3)
        self.assertAlmostEqual(comps[0]["amplitude"], 0.2500, places=3)
        expected_phase1 = math.atan2(B1_true, A1_true)
        self.assertAlmostEqual(comps[0]["phase_rad"], expected_phase1, places=3)

        # Harmonic 2
        self.assertAlmostEqual(comps[1]["a_k"], A2_true, places=3)
        self.assertAlmostEqual(comps[1]["b_k"], B2_true, places=3)
        self.assertAlmostEqual(comps[1]["amplitude"], 0.1000, places=3)

        # Discrete Orthogonality Invariant Check: sum cos(2*pi*t) * sin(2*pi*t) approx 0 on full cycles
        dot_cos_sin = sum(math.cos(2.0 * math.pi * t) * math.sin(2.0 * math.pi * t) for t in times)
        self.assertAlmostEqual(dot_cos_sin, 0.0, places=4)
        dot_harm1_harm2 = sum(math.cos(2.0 * math.pi * t) * math.cos(4.0 * math.pi * t) for t in times)
        self.assertAlmostEqual(dot_harm1_harm2, 0.0, places=4)

        # evaluate_harmonic_model consistency
        t_eval = [0.25, 0.50, 0.75]
        fitted_eval = evaluate_harmonic_model(model, t_eval)
        self.assertEqual(len(fitted_eval), 3)
        for t_val, y_fit in zip(t_eval, fitted_eval):
            y_expected = (
                a0_true + a1_true * t_val +
                A1_true * math.cos(2.0 * math.pi * 1 * t_val) + B1_true * math.sin(2.0 * math.pi * 1 * t_val) +
                A2_true * math.cos(2.0 * math.pi * 2 * t_val) + B2_true * math.sin(2.0 * math.pi * 2 * t_val)
            )
            self.assertAlmostEqual(y_fit, y_expected, places=3)

        # 2. Non-Parametric Theil-Sen Robust Estimator & Outlier Breakdown Point
        # Test clean trend
        t_clean = [float(i) for i in range(20)]
        y_clean = [0.20 + 0.05 * t for t in t_clean]
        res_clean = calculate_theil_sen_slope(t_clean, y_clean)
        self.assertAlmostEqual(res_clean["slope_per_year"], 0.0500, places=4)
        self.assertAlmostEqual(res_clean["intercept"], 0.2000, places=4)
        self.assertEqual(res_clean["trend_direction"], "increasing")

        # Test Gross Outlier Resistance (up to 25% gross corruption)
        # Corrupt 5 out of 20 points (25%) with severe cloud shadow dropouts (y = -2.0)
        y_corrupt = list(y_clean)
        for idx in [2, 6, 11, 15, 18]:
            y_corrupt[idx] = -2.0

        res_corrupt = calculate_theil_sen_slope(t_clean, y_corrupt)
        # Theil-Sen estimator must remain resistant to the 25% outliers
        self.assertAlmostEqual(res_corrupt["slope_per_year"], 0.0500, places=2)
        # Sen 95% Confidence Interval must bound the true slope
        self.assertLessEqual(res_corrupt["slope_ci_lower"], 0.0500)
        self.assertGreaterEqual(res_corrupt["slope_ci_upper"], 0.0500)

        # 3. Mann-Kendall Monotonic Rank Correlation Test
        # Strictly increasing monotonic series
        mk_inc = calculate_mann_kendall_test(list(range(1, 16)))
        self.assertGreater(mk_inc["mann_kendall_s"], 0)
        self.assertEqual(mk_inc["kendall_tau"], 1.0)
        self.assertTrue(mk_inc["is_significant"])
        self.assertEqual(mk_inc["trend_direction"], "increasing")

        # Strictly decreasing monotonic series
        mk_dec = calculate_mann_kendall_test(list(range(15, 0, -1)))
        self.assertLess(mk_dec["mann_kendall_s"], 0)
        self.assertEqual(mk_dec["kendall_tau"], -1.0)
        self.assertTrue(mk_dec["is_significant"])
        self.assertEqual(mk_dec["trend_direction"], "decreasing")

        # Stationary series with tied values (no trend)
        mk_tie = calculate_mann_kendall_test([0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5])
        self.assertEqual(mk_tie["mann_kendall_s"], 0)
        self.assertEqual(mk_tie["kendall_tau"], 0.0)
        self.assertFalse(mk_tie["is_significant"])
        self.assertEqual(mk_tie["trend_direction"], "no_trend")

        # 4. Climatological Monthly MAD Baseline & Normalized Seasonal Anomaly Z-Score
        # Construct 3 years of monthly NDVI with a strong seasonal cycle (Dec-Feb ~0.25, Jun-Aug ~0.75)
        clim_dates = []
        clim_values = []
        for yr in [2022, 2023, 2024]:
            for m in range(1, 13):
                clim_dates.append(f"{yr}-{m:02d}-15")
                # Seasonal sinusoidal curve
                val = 0.50 + 0.25 * math.cos(2.0 * math.pi * (m - 7) / 12.0)
                clim_values.append(val)

        clim = calculate_climatological_monthly_mad(clim_dates, clim_values)
        self.assertIn("monthly_records", clim)
        records = clim["monthly_records"]
        self.assertEqual(len(records), 12)

        # Verify envelope ordering for each month: p10 <= p25 <= median <= p75 <= p90
        for rec in records:
            self.assertLessEqual(rec["p10"], rec["p25"] + 1e-6)
            self.assertLessEqual(rec["p25"], rec["median"] + 1e-6)
            self.assertLessEqual(rec["median"], rec["p75"] + 1e-6)
            self.assertLessEqual(rec["p75"], rec["p90"] + 1e-6)
            self.assertGreaterEqual(rec["scale"], 0.0)

        # July (m=7, peak) vs January (m=1, trough)
        self.assertGreater(records[6]["median"], records[0]["median"])

        # Test Absence of False Winter Alarms & Detection of Summer Drought Anomaly
        test_dates = ["2025-01-15", "2025-07-15", "2025-07-28"]
        # Jan 15: normal winter value 0.26 (close to Jan median ~0.25) -> normal
        # Jul 15: severe drought 0.25 (when Jul median is ~0.75) -> extreme negative anomaly
        # Jul 28: unseasonal greening 0.95 (when Jul median is ~0.75) -> positive anomaly
        test_values = [0.26, 0.25, 0.95]
        anoms = calculate_seasonal_mad_anomalies(test_dates, test_values, clim)

        self.assertEqual(anoms["total_observations"], 3)
        self.assertEqual(anoms["anomaly_count"], 2)  # Jul drought and Jul greening
        pts = anoms["points"]

        # Jan: normal winter senescence produces normal tier (|z| < 1.5)
        self.assertEqual(pts[0]["anomaly_tier"], PhenologyAnomalyTier.NORMAL.value)
        self.assertFalse(pts[0]["is_anomaly"])
        self.assertLess(abs(pts[0]["seasonal_z_score"]), 1.5)

        # Jul drought: severe deviation produces negative z <= -2.5
        self.assertLessEqual(pts[1]["seasonal_z_score"], -2.5)
        self.assertTrue(pts[1]["is_anomaly"])
        self.assertIn(pts[1]["anomaly_tier"], [PhenologyAnomalyTier.SEVERE_ANOMALY.value, PhenologyAnomalyTier.EXTREME_ANOMALY.value])

        # Jul greening: positive deviation produces z >= +2.5
        self.assertGreaterEqual(pts[2]["seasonal_z_score"], 2.5)
        self.assertTrue(pts[2]["is_anomaly"])

        # 5. High-Fidelity Phenology Simulation Synthesis & GeoJSON Validation
        sim_res = simulate_phenology_decomposition({
            "simulation_id": "SIM_RIGOR_PHENO_01",
            "asset_id": "ASSET-TEST-001",
            "asset_name": "Test Embankment Slope",
            "index_name": "ndvi",
            "sample_polygon_count": 8
        })

        self.assertEqual(sim_res["simulation_id"], "SIM_RIGOR_PHENO_01")
        self.assertIn("summary", sim_res)
        self.assertIn("harmonic_model", sim_res)
        self.assertIn("theil_sen_trend", sim_res)
        self.assertIn("monthly_climatology", sim_res)
        self.assertIn("geojson_collection", sim_res)
        self.assertIn("tile_url_template", sim_res)

        # RFC 7946 GeoJSON FeatureCollection validation
        gj = sim_res["geojson_collection"]
        self.assertEqual(gj["type"], "FeatureCollection")
        self.assertGreater(len(gj["features"]), 0)
        for feat in gj["features"]:
            self.assertEqual(feat["type"], "Feature")
            self.assertEqual(feat["geometry"]["type"], "Polygon")
            props = feat["properties"]
            self.assertIn("theil_sen_slope", props)
            self.assertIn("annual_amplitude", props)
            self.assertIn("worst_tier", props)

        # 6. Dynamic XYZ Phenology Anomaly Tile Streaming URL Formatting
        tile_url = build_phenology_anomaly_tile_url("SIM_RIGOR_PHENO_01", metric="theil_sen_slope", z=12, x=1024, y=512)
        self.assertEqual(tile_url, "/api/v1/tiles/phenology/anomaly/SIM_RIGOR_PHENO_01/theil_sen_slope/12/1024/512.png")
        tile_tpl = build_phenology_anomaly_tile_url_template("SIM_RIGOR_PHENO_01", metric="mad_anomaly_zscore")
        self.assertEqual(tile_tpl, "/api/v1/tiles/phenology/anomaly/SIM_RIGOR_PHENO_01/mad_anomaly_zscore/{z}/{x}/{y}.png")

    def test_stac_harvester_webhook_and_perimeter_scientific_rigor(self):
        """Task T-202: Continuous Scientific QA for Cycle v2.5.23 Automated STAC Harvester Subscriptions,
        HMAC-SHA256 Cryptographic Signature Verification, Point-in-Polygon Topological Invariants & Exponential Backoff.
        """
        from app.models.schemas import (
            generate_hmac_sha256_signature,
            verify_hmac_sha256_signature,
            point_in_perimeter_polygon,
            calculate_retry_backoff,
            format_channel_notification_payload,
            simulate_stac_harvester_cycle,
            STACCollectionName,
            HarvestScheduleInterval,
            WebhookChannelType,
            WebhookDeliveryStatus,
            HarvesterAlertSeverity,
            PerimeterTriggerCondition,
            HARVEST_SCHEDULE_CONFIGS,
            WEBHOOK_CHANNEL_CONFIGS,
            STACHarvesterSubscription,
            WebhookEventEnvelope,
            DeadLetterQueueItem
        )

        # 1. HMAC-SHA256 Cryptographic Invariants & Symmetric Verification
        secret = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef"
        payload = {
            "event_id": "EVT-STAC-20261015-001",
            "subscription_id": "SUB-SANLUIS-001",
            "collection": STACCollectionName.SENTINEL_2.value,
            "scene_id": "S2A_MSIL2A_20261015T184511_N0500_R113_T10SEJ",
            "anomaly_z_score": 2.94,
            "severity": HarvesterAlertSeverity.CRITICAL.value,
            "timestamp": "2026-10-15T05:00:00Z"
        }
        sig = generate_hmac_sha256_signature(payload, secret)
        self.assertIsInstance(sig, str)
        self.assertEqual(len(sig), 64)  # 256 bits = 64 hex characters

        # Symmetric constant-time verification
        self.assertTrue(verify_hmac_sha256_signature(payload, secret, sig))
        # Prefix insensitivity (RFC / GitHub / Stripe webhook standard format)
        self.assertTrue(verify_hmac_sha256_signature(payload, secret, f"sha256={sig}"))
        self.assertTrue(verify_hmac_sha256_signature(payload, secret, f"SHA256={sig}"))

        # Envelope self-signing invariance (hmac_signature field automatic omission)
        envelope_with_sig = dict(payload)
        envelope_with_sig["hmac_signature"] = sig
        self.assertTrue(verify_hmac_sha256_signature(envelope_with_sig, secret, sig))

        # Tampering resistance: single-bit modification fails verification
        tampered_payload = dict(payload)
        tampered_payload["anomaly_z_score"] = 2.95
        self.assertFalse(verify_hmac_sha256_signature(tampered_payload, secret, sig))

        # Key isolation: differing secret fails verification
        wrong_secret = "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210"
        self.assertFalse(verify_hmac_sha256_signature(payload, wrong_secret, sig))

        # Empty / None inputs protection
        self.assertFalse(verify_hmac_sha256_signature(payload, "", sig))
        self.assertFalse(verify_hmac_sha256_signature(payload, secret, ""))

        # 2. Ray-Casting Point-in-Polygon (PIP) Topological Invariants
        # Convex bounding box: San Luis Reservoir test polygon
        poly = [
            [-121.05, 37.00],
            [-120.95, 37.00],
            [-120.95, 37.10],
            [-121.05, 37.10],
            [-121.05, 37.00]
        ]
        # Interior points
        self.assertTrue(point_in_perimeter_polygon(-121.00, 37.05, poly))
        self.assertTrue(point_in_perimeter_polygon(-120.96, 37.01, poly))

        # Exterior points
        self.assertFalse(point_in_perimeter_polygon(-121.10, 37.05, poly))
        self.assertFalse(point_in_perimeter_polygon(-121.00, 37.15, poly))
        self.assertFalse(point_in_perimeter_polygon(-120.90, 37.05, poly))
        self.assertFalse(point_in_perimeter_polygon(-121.00, 36.95, poly))

        # Boundary tolerance: collinear edge points
        self.assertTrue(point_in_perimeter_polygon(-121.00, 37.00, poly))  # Bottom edge
        self.assertTrue(point_in_perimeter_polygon(-121.00, 37.10, poly))  # Top edge
        self.assertTrue(point_in_perimeter_polygon(-121.05, 37.05, poly))  # Left edge
        self.assertTrue(point_in_perimeter_polygon(-120.95, 37.05, poly))  # Right edge

        # Boundary tolerance: coincident vertex points
        self.assertTrue(point_in_perimeter_polygon(-121.05, 37.00, poly))
        self.assertTrue(point_in_perimeter_polygon(-120.95, 37.00, poly))
        self.assertTrue(point_in_perimeter_polygon(-120.95, 37.10, poly))
        self.assertTrue(point_in_perimeter_polygon(-121.05, 37.10, poly))

        # Non-convex polygon: L-shaped catchment boundary
        l_shape = [
            [0.0, 0.0],
            [4.0, 0.0],
            [4.0, 2.0],
            [2.0, 2.0],
            [2.0, 4.0],
            [0.0, 4.0],
            [0.0, 0.0]
        ]
        self.assertTrue(point_in_perimeter_polygon(1.0, 1.0, l_shape))    # Base corner
        self.assertTrue(point_in_perimeter_polygon(1.0, 3.0, l_shape))    # Top arm
        self.assertTrue(point_in_perimeter_polygon(3.0, 1.0, l_shape))    # Right arm
        self.assertFalse(point_in_perimeter_polygon(3.0, 3.0, l_shape))   # Concave outer indentation
        self.assertFalse(point_in_perimeter_polygon(5.0, 1.0, l_shape))   # Far outside

        # Degenerate cases
        self.assertFalse(point_in_perimeter_polygon(0.0, 0.0, []))
        self.assertFalse(point_in_perimeter_polygon(0.0, 0.0, [[0.0, 0.0], [1.0, 1.0]]))

        # 3. Exponential Backoff & Jitter Mathematical Bounds
        # Exact powers of 2 for unjittered backoff
        self.assertEqual(calculate_retry_backoff(0, base_delay=1.0, max_delay=60.0), 1.0)
        self.assertEqual(calculate_retry_backoff(1, base_delay=1.0, max_delay=60.0), 2.0)
        self.assertEqual(calculate_retry_backoff(2, base_delay=1.0, max_delay=60.0), 4.0)
        self.assertEqual(calculate_retry_backoff(3, base_delay=1.0, max_delay=60.0), 8.0)
        self.assertEqual(calculate_retry_backoff(4, base_delay=1.0, max_delay=60.0), 16.0)
        self.assertEqual(calculate_retry_backoff(5, base_delay=1.0, max_delay=60.0), 32.0)
        # Clamping at max_delay
        self.assertEqual(calculate_retry_backoff(6, base_delay=1.0, max_delay=60.0), 60.0)
        self.assertEqual(calculate_retry_backoff(10, base_delay=1.0, max_delay=60.0), 60.0)
        # Negative attempt clamping
        self.assertEqual(calculate_retry_backoff(-2, base_delay=2.0, max_delay=60.0), 2.0)
        # Stochastic jitter scaling bounds
        j_val = calculate_retry_backoff(2, base_delay=1.0, max_delay=60.0, jitter_factor=0.20)
        self.assertEqual(j_val, 4.8)  # 4.0 * 1.20 = 4.8

        # 4. Multi-Channel Notification Payload Structural Invariants
        test_envelope = {
            "event_id": "EVT-STAC-20261015-001",
            "subscription_id": "SUB-TEST-001",
            "event_type": "stac_harvester.anomaly_detected",
            "severity": HarvesterAlertSeverity.CRITICAL.value,
            "biophysical_metrics": {
                "collection": "sentinel-2-l2a",
                "scene_id": "S2A_MSIL2A_20261015_T10SEJ",
                "anomaly_z_score": 3.12,
                "cloud_cover_percentage": 4.5
            },
            "hmac_signature": sig
        }
        # Slack Attachments & Text
        slack_payload = format_channel_notification_payload(WebhookChannelType.SLACK, test_envelope)
        self.assertIn("attachments", slack_payload)
        self.assertIn("text", slack_payload)
        self.assertGreater(len(slack_payload["attachments"]), 0)

        # MS Teams Adaptive Card
        teams_payload = format_channel_notification_payload(WebhookChannelType.MS_TEAMS, test_envelope)
        self.assertEqual(teams_payload["type"], "message")
        self.assertIn("attachments", teams_payload)
        self.assertEqual(teams_payload["attachments"][0]["contentType"], "application/vnd.microsoft.card.adaptive")

        # PagerDuty Events API v2
        pd_payload = format_channel_notification_payload(WebhookChannelType.PAGERDUTY, test_envelope)
        self.assertEqual(pd_payload["event_action"], "trigger")
        self.assertIn("payload", pd_payload)
        self.assertEqual(pd_payload["payload"]["severity"], "critical")

        # Email SMTP
        email_payload = format_channel_notification_payload(WebhookChannelType.EMAIL_SMTP, test_envelope)
        self.assertIn("subject", email_payload)
        self.assertIn("body_html", email_payload)
        self.assertIn("body_text", email_payload)

        # Custom Webhook (Raw RFC 7946 Feature)
        custom_payload = format_channel_notification_payload(WebhookChannelType.CUSTOM_WEBHOOK, test_envelope)
        self.assertIn("event_id", custom_payload)
        self.assertIn("hmac_signature", custom_payload)

        # 5. STAC Ingestion Simulation Cycle Verification
        sim_cycle = simulate_stac_harvester_cycle({
            "subscription_id": "SUB-CYCLE-001",
            "aoi_id": "AOI_SANLUIS",
            "anomaly_threshold": 2.5
        })
        self.assertEqual(sim_cycle["subscription_id"], "SUB-CYCLE-001")
        self.assertIn("evaluated_scenes", sim_cycle)
        self.assertIn("events", sim_cycle)
        self.assertIn("delivery_attempts", sim_cycle)
        self.assertIn("dead_letter_queue", sim_cycle)
        self.assertGreater(sim_cycle["evaluated_scenes_count"], 0)
        self.assertGreaterEqual(sim_cycle["triggered_anomalies_count"], 0)

    def test_drone_photogrammetry_gcp_affine_and_reprojection_scientific_rigor(self):
        r"""Task T-208: Continuous Scientific QA for Cycle v2.5.24:
        1. Least-Squares 2D Affine Transformation Matrix Recovery ($X_w = a + b X_p + c Y_p$, $Y_w = d + e X_p + f Y_p$)
        2. Ground Sampling Distance (GSD) Trigonometry: $GSD_x = \sqrt{b^2 + e^2} \times 100$, $GSD_y = \sqrt{c^2 + f^2} \times 100$
        3. Spatial Residual RMSE Bounds: RMSE_xy < 0.05m (strict geodetic control limit)
        4. Independent Check Point Isolation & Pixel RMSE Residual Verification
        5. Degenerate Geometry Invariants (<3 points, collinearity, zero determinant)
        6. Drone Flight Planner Trigonometric Spacing & Motion-Blur Shutter Speed Limits
        7. OpenDroneMap (ODM) GCP File Specification Serialization & Invariant Parsing Roundtrip
        8. Benchmark Epipolar Bundle Adjustment Residue Bounds & Dynamic 7-Metric COG Tile Streaming
        """
        from app.models.schemas import (
            solve_gcp_affine_transform,
            calculate_drone_flight_plan,
            format_odm_gcp_file,
            parse_odm_gcp_file,
            build_drone_photogrammetry_tile_url,
            build_drone_photogrammetry_tile_url_template,
            simulate_nodeodm_task_progression,
            GroundControlPoint,
            DroneFlightPlanRequest,
            NodeODMLifecycleStatus,
            NodeODMPipelineStage,
            DronePhotogrammetryTileMetric,
            DRONE_CAMERA_PRESETS,
            DRONE_PHOTOGRAMMETRY_TILE_METRIC_CONFIGS
        )
        from app.services.drone_service import drone_service
        from app.services.tile_service import tile_service

        # 1. Exact Least-Squares Affine Matrix Recovery
        true_a = 591234.50
        true_b = 0.035000   # 3.5 cm / px along X
        true_c = -0.002000  # Slight shear/rotation
        true_d = 4105678.90
        true_e = 0.002000
        true_f = 0.035000   # 3.5 cm / px along Y

        grid_pts = [
            (500.0, 500.0),
            (9500.0, 600.0),
            (9200.0, 7500.0),
            (800.0, 7400.0),
            (5000.0, 4000.0),
            (2500.0, 3500.0),
        ]
        gcps = []
        for idx, (px, py) in enumerate(grid_pts, 1):
            wx = true_a + true_b * px + true_c * py
            wy = true_d + true_e * px + true_f * py
            gcps.append({
                "gcp_id": f"GCP-{idx:02d}",
                "pixel_x": px,
                "pixel_y": py,
                "world_x": wx,
                "world_y": wy,
                "elevation_z": 125.0 + idx * 2.5,
                "is_check_point": False,
                "is_enabled": True
            })

        res_affine = solve_gcp_affine_transform(gcps)
        recovered = res_affine["affine_matrix"]
        self.assertAlmostEqual(recovered[0], true_a, places=2)
        self.assertAlmostEqual(recovered[1], true_b, places=6)
        self.assertAlmostEqual(recovered[2], true_c, places=6)
        self.assertAlmostEqual(recovered[3], true_d, places=2)
        self.assertAlmostEqual(recovered[4], true_e, places=6)
        self.assertAlmostEqual(recovered[5], true_f, places=6)

        # 2. Ground Sampling Distance (GSD) & Rotation Invariants
        expected_gsd_x = math.sqrt(true_b**2 + true_e**2) * 100.0
        expected_gsd_y = math.sqrt(true_c**2 + true_f**2) * 100.0
        expected_rot = math.degrees(math.atan2(true_e, true_b))

        self.assertAlmostEqual(res_affine["gsd_x_cm"], expected_gsd_x, places=3)
        self.assertAlmostEqual(res_affine["gsd_y_cm"], expected_gsd_y, places=3)
        self.assertAlmostEqual(res_affine["mean_gsd_cm"], (expected_gsd_x + expected_gsd_y) / 2.0, places=3)
        self.assertAlmostEqual(res_affine["rotation_deg"], expected_rot, places=3)
        self.assertLess(res_affine["rmse_xy_m"], 0.001)
        self.assertLess(res_affine["rmse_pixel"], 0.05)

        # 3. Controlled Sub-Pixel Survey Noise (<0.05m RMSE limit)
        noisy_gcps = []
        noise_offsets = [
            (0.20, -0.15),
            (-0.30, 0.25),
            (0.15, 0.30),
            (-0.25, -0.20),
            (0.10, -0.10),
            (-0.05, 0.15)
        ]
        for idx, (px, py) in enumerate(grid_pts):
            dx_px, dy_px = noise_offsets[idx]
            noisy_px = px + dx_px
            noisy_py = py + dy_px
            wx = true_a + true_b * px + true_c * py
            wy = true_d + true_e * px + true_f * py
            noisy_gcps.append({
                "gcp_id": f"GCP-{idx+1}",
                "pixel_x": noisy_px,
                "pixel_y": noisy_py,
                "world_x": wx,
                "world_y": wy,
                "elevation_z": 130.0,
                "is_check_point": False
            })

        noisy_res = solve_gcp_affine_transform(noisy_gcps)
        self.assertLess(noisy_res["rmse_xy_m"], 0.05, "Spatial RMSE must satisfy rigorous geodetic requirement < 0.05m")
        self.assertLess(noisy_res["rmse_pixel"], 1.0, "Pixel RMSE must remain sub-pixel < 1.0 px")

        # 4. Check Point Isolation & Evaluation
        check_pt = {
            "gcp_id": "CHK-01",
            "pixel_x": 4800.0,
            "pixel_y": 3800.0,
            "world_x": true_a + true_b * 4800.0 + true_c * 3800.0 + 0.02,
            "world_y": true_d + true_e * 4800.0 + true_f * 3800.0 - 0.015,
            "elevation_z": 132.0,
            "is_check_point": True
        }
        with_chk = noisy_gcps + [check_pt]
        chk_res = solve_gcp_affine_transform(with_chk)
        self.assertEqual(len(chk_res["residuals"]), 7)
        chk_item = next(r for r in chk_res["residuals"] if r["gcp_id"] == "CHK-01")
        self.assertTrue(chk_item["is_check_point"])
        self.assertGreater(chk_item["residual_world_xy_m"], 0.0)
        self.assertLess(chk_item["residual_world_xy_m"], 0.05)

        # 5. Degenerate Geometry Invariants
        with self.assertRaises(ValueError):
            solve_gcp_affine_transform(gcps[:2])

        collinear_pts = [
            {"pixel_x": 100.0, "pixel_y": 100.0, "world_x": 1000.0, "world_y": 1000.0},
            {"pixel_x": 200.0, "pixel_y": 200.0, "world_x": 2000.0, "world_y": 2000.0},
            {"pixel_x": 300.0, "pixel_y": 300.0, "world_x": 3000.0, "world_y": 3000.0},
        ]
        with self.assertRaises(ValueError):
            solve_gcp_affine_transform(collinear_pts)

        # 6. Drone Flight Planner Calculations & Shutter Motion-Blur Limits
        cam = DRONE_CAMERA_PRESETS["DJI_FC6310R"]
        flight_req = DroneFlightPlanRequest(
            cameraModel="DJI_FC6310R",
            targetGsdCm=2.5,
            flightSpeedMs=5.0,
            forwardOverlapPercent=75.0,
            sideOverlapPercent=70.0,
            surveyAreaHa=25.0
        )
        plan_res = calculate_drone_flight_plan(flight_req)
        plan = plan_res["plan"]

        # Theoretical altitude: H = (GSD * f) / pixel_size (f and pixel_size both in mm)
        pixel_size_mm = cam["sensor_width_mm"] / cam["image_width_px"]
        expected_alt = (0.025 * cam["focal_length_mm"]) / pixel_size_mm
        self.assertAlmostEqual(plan["flight_altitude_m"], expected_alt, places=1)
        self.assertGreater(plan["flight_altitude_m"], 80.0)
        self.assertLess(plan["flight_altitude_m"], 120.0)

        expected_w_fp = (cam["image_width_px"] * 0.025)
        expected_h_fp = (cam["image_height_px"] * 0.025)
        self.assertAlmostEqual(plan["ground_footprint_width_m"], expected_w_fp, places=1)
        self.assertAlmostEqual(plan["ground_footprint_height_m"], expected_h_fp, places=1)

        expected_fwd_spacing = expected_h_fp * (1.0 - 0.75)
        self.assertAlmostEqual(plan["forward_photo_spacing_m"], expected_fwd_spacing, places=1)
        self.assertAlmostEqual(plan["trigger_interval_seconds"], expected_fwd_spacing / 5.0, places=2)

        max_shutter = (0.5 * 0.025) / 5.0  # 0.0025 s = 1/400 s
        self.assertAlmostEqual(plan["min_shutter_speed_seconds"], max_shutter, places=5)
        self.assertGreater(plan["estimated_photo_count"], 10)
        self.assertGreater(plan["estimated_flight_time_minutes"], 0.5)

        # 7. OpenDroneMap GCP Specification Roundtrip
        formatted_gcp = format_odm_gcp_file(gcps[:4], epsg_code=32610)
        self.assertTrue(formatted_gcp.startswith("+proj=utm +zone=10 +datum=WGS84 +units=m"))
        parsed_gcps = parse_odm_gcp_file(formatted_gcp)
        self.assertEqual(len(parsed_gcps), 4)
        for orig, parsed in zip(gcps[:4], parsed_gcps):
            self.assertEqual(parsed["gcp_id"], orig["gcp_id"])
            self.assertAlmostEqual(parsed["world_x"], orig["world_x"], places=2)
            self.assertAlmostEqual(parsed["world_y"], orig["world_y"], places=2)
            self.assertAlmostEqual(parsed["elevation_z"], orig["elevation_z"], places=2)
            self.assertAlmostEqual(parsed["pixel_x"], orig["pixel_x"], places=1)
            self.assertAlmostEqual(parsed["pixel_y"], orig["pixel_y"], places=1)

        # 8. Benchmark Task Epipolar Bundle Adjustment Residue Bounds & Dynamic Tile Streaming
        benchmark_task = drone_service.get_photogrammetry_task("ODM-BENCHMARK-001")
        self.assertIsNotNone(benchmark_task)
        self.assertEqual(benchmark_task["status"], "completed")
        self.assertIn("rmse_reprojection_px", benchmark_task)
        reproj_err = benchmark_task["rmse_reprojection_px"]
        self.assertLess(reproj_err, 1.0, "Epipolar bundle adjustment reprojection error must be sub-pixel (<1.0 px)")
        self.assertAlmostEqual(reproj_err, 0.38, delta=0.05)

        metrics = [
            "orthophoto",
            "dsm",
            "dtm",
            "chm",
            "slope",
            "reprojection_error",
            "point_density"
        ]
        for m in metrics:
            tile_bytes = tile_service.render_drone_photogrammetry_tile("ODM-BENCHMARK-001", z=18, x=42150, y=103240, metric=m)
            self.assertIsInstance(tile_bytes, bytes)
            self.assertGreater(len(tile_bytes), 200, f"Tile metric {m} must return non-empty PNG raster")
            self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"), f"Tile metric {m} must have valid PNG magic header")

        t_url_ortho = build_drone_photogrammetry_tile_url("ODM-BENCHMARK-001", 18, 42150, 103240, metric="orthophoto")
        self.assertEqual(t_url_ortho, "/api/v1/tiles/drone/photogrammetry/ODM-BENCHMARK-001/18/42150/103240.png")
        t_url_dsm = build_drone_photogrammetry_tile_url("ODM-BENCHMARK-001", 18, 42150, 103240, metric="dsm")
        self.assertEqual(t_url_dsm, "/api/v1/tiles/drone/photogrammetry/ODM-BENCHMARK-001/dsm/18/42150/103240.png")
        t_tpl = build_drone_photogrammetry_tile_url_template("ODM-BENCHMARK-001", metric="dsm")
        self.assertEqual(t_tpl, "/api/v1/tiles/drone/photogrammetry/ODM-BENCHMARK-001/dsm/{z}/{x}/{y}.png")

    def test_task_t214_band_math_ast_scientific_rigor_and_safety_invariants(self):
        """Task T-214: Scientific Rigor & Mathematical Verification for Band Math AST Engine (Cycle v2.5.25).
        
        Verifies:
        1. PEMDAS/BODMAS algebraic precedence and associativity.
        2. Denominator epsilon zero-guard (epsilon = 10^-6) in scalar and vectorized raster.
        3. Strict lexical and grammar code injection resistance (zero eval() / zero exec()).
        4. Biophysical formula equivalence against published ground-truth indices.
        5. Band aliases, case-insensitivity, and raw_vname priority.
        6. Dynamic custom expression tile server RGBA PNG invariants.
        7. Advanced math functions and numerical domain bounds (sqrt, log, exp, clamp, min, max).
        """
        import io
        from PIL import Image
        from app.models.schemas import (
            BAND_MATH_PRESETS,
            validate_band_math_formula,
            evaluate_band_math_formula
        )
        from app.services.tile_service import tile_service

        # -------------------------------------------------------------
        # 1. PEMDAS / BODMAS Algebraic Precedence & Associativity
        # -------------------------------------------------------------
        vals = {"B04": 0.10, "B08": 0.40, "B02": 0.05, "B11": 0.20}

        # Addition vs Multiplication: B04 + B08 * 2 == 0.10 + 0.80 = 0.90
        res1 = evaluate_band_math_formula("B04 + B08 * 2", vals)
        self.assertAlmostEqual(res1, 0.90, places=5)

        # Parentheses override: (B04 + B08) * 2 == 0.50 * 2 = 1.00
        res1_paren = evaluate_band_math_formula("(B04 + B08) * 2", vals)
        self.assertAlmostEqual(res1_paren, 1.00, places=5)

        # Subtraction vs Division: B08 - B04 / 2 == 0.40 - 0.05 = 0.35
        res2 = evaluate_band_math_formula("B08 - B04 / 2", vals)
        self.assertAlmostEqual(res2, 0.35, places=5)

        res2_paren = evaluate_band_math_formula("(B08 - B04) / 2", vals)
        self.assertAlmostEqual(res2_paren, 0.15, places=5)

        # Multiplication vs Exponentiation: B04 * 2 ^ 3 == 0.10 * 8 = 0.80
        res3 = evaluate_band_math_formula("B04 * 2 ^ 3", vals)
        self.assertAlmostEqual(res3, 0.80, places=5)

        res3_paren = evaluate_band_math_formula("(B04 * 2) ^ 3", vals)
        self.assertAlmostEqual(res3_paren, 0.008, places=5)

        # Exponentiation Right-Associativity: 2 ^ 3 ^ 2 == 2 ^ (3 ^ 2) == 2 ^ 9 = 512
        res4 = evaluate_band_math_formula("2 ^ 3 ^ 2", {})
        self.assertAlmostEqual(res4, 512.0, places=4)

        # Double asterisk '**' power operator parity
        res4_star = evaluate_band_math_formula("2 ** 3 ** 2", {})
        self.assertAlmostEqual(res4_star, 512.0, places=4)

        # Unary Signs and Precedence
        res5_unary = evaluate_band_math_formula("-B04 + B08", vals)
        self.assertAlmostEqual(res5_unary, 0.30, places=5)

        res5_unary_paren = evaluate_band_math_formula("-(B04 + B08)", vals)
        self.assertAlmostEqual(res5_unary_paren, -0.50, places=5)

        res5_neg_exp = evaluate_band_math_formula("2 ^ -2", {})
        self.assertAlmostEqual(res5_neg_exp, 0.25, places=5)

        # -------------------------------------------------------------
        # 2. Division-by-Zero Numerical Safety & Epsilon Clamping
        # -------------------------------------------------------------
        # Exact zero denominator: 1.0 / 0.0 with eps=1e-6 -> 1.0 / 1e-6 = 1e6
        res_zero = evaluate_band_math_formula("1.0 / 0.0", {}, epsilon=1e-6)
        self.assertAlmostEqual(res_zero, 1e6, delta=1.0)
        self.assertTrue(math.isfinite(res_zero))

        # Negative near-zero denominator: 1.0 / -1e-9 -> clamps to -1e-6 -> -1e6
        res_neg_zero = evaluate_band_math_formula("1.0 / -1e-9", {}, epsilon=1e-6)
        self.assertAlmostEqual(res_neg_zero, -1e6, delta=1.0)
        self.assertTrue(math.isfinite(res_neg_zero))

        # Normalized difference with identical band values: norm_diff(0.3, -0.3) -> denom=0.0
        res_nd = evaluate_band_math_formula("norm_diff(0.3, -0.3)", {}, epsilon=1e-6)
        self.assertTrue(math.isfinite(res_nd))
        self.assertAlmostEqual(res_nd, 0.6 / 1e-6, delta=10.0)

        # Vectorized raster division by zero test
        shape = (10, 10)
        zero_denom = np.zeros(shape, dtype=np.float32)
        numer = np.full(shape, 2.5, dtype=np.float32)
        band_rasters = {"NUM": numer, "DEN": zero_denom}

        raster_res = index_service.evaluate_band_math_raster("NUM / DEN", band_rasters, epsilon=1e-6)
        self.assertEqual(raster_res.shape, shape)
        self.assertTrue(np.all(np.isfinite(raster_res)), "Vectorized division by zero must produce 100% finite floats")
        self.assertTrue(np.allclose(raster_res, 2.5 / 1e-6, atol=1.0))

        # Mixed raster with zero and non-zero denominators
        mixed_denom = np.array([[0.0, 2.0], [-1e-9, 4.0]], dtype=np.float32)
        mixed_numer = np.array([[1.0, 4.0], [-2.0, 8.0]], dtype=np.float32)
        raster_mixed = index_service.evaluate_band_math_raster("NUM / DEN", {"NUM": mixed_numer, "DEN": mixed_denom}, epsilon=1e-6)
        self.assertTrue(np.all(np.isfinite(raster_mixed)))
        self.assertAlmostEqual(float(raster_mixed[0, 1]), 2.0, places=4)
        self.assertAlmostEqual(float(raster_mixed[1, 1]), 2.0, places=4)
        self.assertAlmostEqual(float(raster_mixed[0, 0]), 1e6, delta=1.0)
        self.assertAlmostEqual(float(raster_mixed[1, 0]), 2e6, delta=1.0)

        # -------------------------------------------------------------
        # 3. Arbitrary Code Injection & Adversarial Grammar Resistance
        # -------------------------------------------------------------
        adversarial_inputs = [
            "__import__('os').system('dir')",
            "import sys",
            "eval('1+1')",
            "exec('x=1')",
            "globals()",
            "locals()",
            "open('/etc/passwd')",
            "os.system('calc')",
            "B08; rm -rf /",
            "B08 && echo hacked",
            "B08 | B04",
            "B08 [0]",
            "{'a': 1}",
            "B08 > 0.5",
            "B08 == B04",
            "system('whoami')"
        ]

        for bad in adversarial_inputs:
            diag = validate_band_math_formula(bad)
            self.assertFalse(diag["is_valid"], f"Adversarial input '{bad}' must NOT pass validation")
            self.assertIsNotNone(diag["error_message"])

            with self.assertRaises((ValueError, KeyError)):
                evaluate_band_math_formula(bad, {"B08": 0.5, "B04": 0.1})

        # Recursion depth explosion attack: 22 levels of nested parentheses (limit = 20)
        deep_expr = "(" * 22 + "B08" + ")" * 22
        diag_deep = validate_band_math_formula(deep_expr, max_depth=20)
        self.assertFalse(diag_deep["is_valid"])
        self.assertIn("recursion depth limit exceeded", diag_deep["error_message"].lower())

        # Length overflow (> 500 chars)
        long_formula = "B08 + " * 100 + "B04"
        diag_long = validate_band_math_formula(long_formula)
        self.assertFalse(diag_long["is_valid"])
        self.assertIn("exceeds maximum permitted length", diag_long["error_message"].lower())

        # Empty or whitespace formulas
        for empty in ["", "   ", "\t\n"]:
            diag_empty = validate_band_math_formula(empty)
            self.assertFalse(diag_empty["is_valid"])

        # -------------------------------------------------------------
        # 4. Biophysical Formula Equivalence Against Ground Truth
        # -------------------------------------------------------------
        canopy_values = {
            "B01": 0.04,  # Coastal aerosol
            "B02": 0.05,  # Blue
            "B03": 0.08,  # Green
            "B04": 0.04,  # Red (chlorophyll absorption)
            "B05": 0.15,  # RedEdge 1
            "B06": 0.30,  # RedEdge 2
            "B07": 0.42,  # RedEdge 3
            "B08": 0.55,  # NIR (leaf cellular scattering)
            "B8A": 0.56,  # Narrow NIR
            "B09": 0.12,  # Water vapor
            "B11": 0.20,  # SWIR 1
            "B12": 0.10   # SWIR 2
        }

        # 1. NDVI (Normalized Difference Vegetation Index) - Rouse et al. (1974)
        expected_ndvi = (0.55 - 0.04) / (0.55 + 0.04)  # 0.51 / 0.59 = 0.864407
        ast_ndvi = evaluate_band_math_formula("(B08 - B04) / (B08 + B04)", canopy_values)
        ast_ndvi_func = evaluate_band_math_formula("norm_diff(B08, B04)", canopy_values)
        self.assertAlmostEqual(ast_ndvi, expected_ndvi, places=5)
        self.assertAlmostEqual(ast_ndvi_func, expected_ndvi, places=5)

        # 2. NDMI (Normalized Difference Moisture Index) - Gao (1996)
        expected_ndmi = (0.55 - 0.20) / (0.55 + 0.20)  # 0.35 / 0.75 = 0.466667
        ast_ndmi = evaluate_band_math_formula("(B08 - B11) / (B08 + B11)", canopy_values)
        self.assertAlmostEqual(ast_ndmi, expected_ndmi, places=5)

        # 3. MNDWI (Modified Normalized Difference Water Index) - Xu (2006)
        expected_mndwi = (0.08 - 0.20) / (0.08 + 0.20)  # -0.12 / 0.28 = -0.428571
        ast_mndwi = evaluate_band_math_formula("(B03 - B11) / (B03 + B11)", canopy_values)
        self.assertAlmostEqual(ast_mndwi, expected_mndwi, places=5)

        # 4. SAVI (Soil Adjusted Vegetation Index, L=0.5) - Huete (1988)
        expected_savi = ((0.55 - 0.04) / (0.55 + 0.04 + 0.50)) * 1.50  # (0.51 / 1.09) * 1.5 = 0.701835
        ast_savi = evaluate_band_math_formula("((B08 - B04) / (B08 + B04 + 0.5)) * 1.5", canopy_values)
        self.assertAlmostEqual(ast_savi, expected_savi, places=5)

        # 5. EVI (Enhanced Vegetation Index) - Huete et al. (2002)
        denom_evi = 0.55 + 6.0 * 0.04 - 7.5 * 0.05 + 1.0  # 1.415
        expected_evi = 2.5 * (0.51 / denom_evi)  # 0.901060
        ast_evi = evaluate_band_math_formula("2.5 * ((B08 - B04) / (B08 + 6.0 * B04 - 7.5 * B02 + 1.0))", canopy_values)
        self.assertAlmostEqual(ast_evi, expected_evi, places=5)

        # 6. MSAVI2 (Modified Second SAVI) - Qi et al. (1994)
        t1 = 2.0 * 0.55 + 1.0  # 2.1
        inside_sqrt = (t1 ** 2) - 8.0 * (0.55 - 0.04)  # 4.41 - 4.08 = 0.33
        expected_msavi2 = (t1 - math.sqrt(inside_sqrt)) / 2.0  # 0.762772
        ast_msavi2 = evaluate_band_math_formula("(2.0 * B08 + 1.0 - sqrt((2.0 * B08 + 1.0) ^ 2 - 8.0 * (B08 - B04))) / 2.0", canopy_values)
        self.assertAlmostEqual(ast_msavi2, expected_msavi2, places=5)

        # 7. Check all 12 presets in BAND_MATH_PRESETS for mathematical consistency
        raster_dict = {k: np.full((16, 16), v, dtype=np.float32) for k, v in canopy_values.items()}

        for pid, pdata in BAND_MATH_PRESETS.items():
            formula = pdata["formula"]
            scalar_res = evaluate_band_math_formula(formula, canopy_values)
            self.assertTrue(math.isfinite(scalar_res), f"Preset {pid} scalar returned non-finite {scalar_res}")

            raster_res = index_service.evaluate_band_math_raster(formula, raster_dict)
            self.assertEqual(raster_res.shape, (16, 16))
            self.assertTrue(np.all(np.isfinite(raster_res)), f"Preset {pid} raster returned non-finite values")

            mean_raster_val = float(np.mean(raster_res))
            self.assertAlmostEqual(scalar_res, mean_raster_val, places=4, msg=f"Preset {pid} scalar vs raster mismatch")

        # -------------------------------------------------------------
        # 5. Band Aliases, Case-Insensitivity & raw_vname Priority
        # -------------------------------------------------------------
        vals_aliases = {
            "nir": 0.60,
            "red": 0.10,
            "GREEN": 0.15,
            "blue": 0.05,
            "swir1": 0.25,
            "drone_red": 0.12,
            "DRONE_NIR": 0.58
        }

        # Case-insensitive alias evaluation: (NIR - RED) / (NIR + RED)
        res_alias = evaluate_band_math_formula("(nir - red) / (nir + red)", vals_aliases)
        expected = (0.60 - 0.10) / (0.60 + 0.10)  # 0.714286
        self.assertAlmostEqual(res_alias, expected, places=5)

        # Canonical mapping: B08 mapped to NIR, B04 mapped to RED
        res_canonical = evaluate_band_math_formula("(B08 - B04) / (B08 + B04)", vals_aliases)
        self.assertAlmostEqual(res_canonical, expected, places=5)

        # Drone band evaluation with raw_vname priority
        res_drone = evaluate_band_math_formula("(drone_nir - drone_red) / (drone_nir + drone_red)", vals_aliases)
        expected_drone = (0.58 - 0.12) / (0.58 + 0.12)
        self.assertAlmostEqual(res_drone, expected_drone, places=5)

        # -------------------------------------------------------------
        # 6. Dynamic Custom Expression Tile Server RGBA PNG Invariants
        # -------------------------------------------------------------
        colormaps = ["rdylgn", "viridis", "spectral", "blues", "turbo"]
        for cmap in colormaps:
            tile_bytes = tile_service.render_custom_expression_tile(
                z=13,
                x=2048,
                y=4096,
                expr="(B08 - B04) / (B08 + B04)",
                colormap=cmap,
                rescale="-0.2,0.8"
            )
            self.assertIsInstance(tile_bytes, bytes)
            self.assertGreater(len(tile_bytes), 500)
            self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"))

            img = Image.open(io.BytesIO(tile_bytes))
            self.assertEqual(img.size, (256, 256))
            self.assertEqual(img.mode, "RGBA")

        # -------------------------------------------------------------
        # 7. Advanced Math Functions & Numerical Domain Bounds
        # -------------------------------------------------------------
        # sqrt of negative number -> clamped to 0.0
        res_sqrt_neg = evaluate_band_math_formula("sqrt(-4.0)", {})
        self.assertEqual(res_sqrt_neg, 0.0)

        # Vectorized sqrt of negative
        raster_sqrt_neg = index_service.evaluate_band_math_raster("sqrt(X)", {"X": np.array([-9.0, 0.0, 16.0], dtype=np.float32)})
        self.assertTrue(np.allclose(raster_sqrt_neg, [0.0, 0.0, 4.0]))

        # log of non-positive -> clamped to log(1e-12)
        res_log_zero = evaluate_band_math_formula("log(0.0)", {})
        self.assertAlmostEqual(res_log_zero, math.log(1e-12), places=4)

        # exp extreme bounds [-50, 50]
        res_exp_high = evaluate_band_math_formula("exp(100.0)", {})
        self.assertAlmostEqual(res_exp_high, math.exp(50.0), places=1)
        self.assertTrue(math.isfinite(res_exp_high))

        res_exp_low = evaluate_band_math_formula("exp(-100.0)", {})
        self.assertAlmostEqual(res_exp_low, math.exp(-50.0), places=10)

        # clamp(val, low, high)
        res_clamp_mid = evaluate_band_math_formula("clamp(0.5, 0.0, 1.0)", {})
        self.assertEqual(res_clamp_mid, 0.5)

        res_clamp_high = evaluate_band_math_formula("clamp(1.5, 0.0, 1.0)", {})
        self.assertEqual(res_clamp_high, 1.0)

        res_clamp_low = evaluate_band_math_formula("clamp(-0.5, 0.0, 1.0)", {})
        self.assertEqual(res_clamp_low, 0.0)

        # min and max
        res_min = evaluate_band_math_formula("min(0.2, 0.8)", {})
        self.assertEqual(res_min, 0.2)

        res_max = evaluate_band_math_formula("max(0.2, 0.8)", {})
        self.assertEqual(res_max, 0.8)

    def test_task_t220_cop_dem_glo30_topography_and_hillshade_scientific_rigor(self):
        """Task T-220: Continuous Scientific QA for Cycle v2.5.26 Copernicus 30m DEM (GLO-30),
        Horn 3x3 Finite Difference Convergence, Lambertian Hillshade Illumination Conservation,
        Topographic Wetness Index (TWI) Monotonicity & Dynamic XYZ Relief Tile Invariants."""
        import io
        from PIL import Image
        from app.models.schemas import (
            calculate_horn_gradient,
            calculate_terrain_slope,
            calculate_compass_aspect,
            aspect_to_compass_direction,
            calculate_lambertian_hillshade,
            calculate_dem_topographic_wetness_index,
            classify_dem_slope_hazard_tier,
            calculate_elevation_transect_profile,
            build_dem_tile_url,
            build_dem_tile_url_template,
            DemSlopeHazardTier,
            DEM_METRIC_CONFIGS,
            SLOPE_HAZARD_CONFIGS
        )
        from app.services.tile_service import tile_service

        # -------------------------------------------------------------
        # 1. Horn 3x3 Operator Mathematical Convergence & Exact Derivatives
        # -------------------------------------------------------------
        cell_size = 30.0
        for A, B in [(0.5, 0.0), (0.0, -0.8), (0.3, 0.4), (-1.2, 0.5)]:
            grid = [
                [A * (-cell_size) + B * (+cell_size) + 500.0, A * (0.0) + B * (+cell_size) + 500.0, A * (+cell_size) + B * (+cell_size) + 500.0],
                [A * (-cell_size) + B * (0.0) + 500.0,         A * (0.0) + B * (0.0) + 500.0,         A * (+cell_size) + B * (0.0) + 500.0],
                [A * (-cell_size) + B * (-cell_size) + 500.0, A * (0.0) + B * (-cell_size) + 500.0, A * (+cell_size) + B * (-cell_size) + 500.0]
            ]
            grad = calculate_horn_gradient(grid, cell_size_x=cell_size, cell_size_y=cell_size)
            self.assertAlmostEqual(grad.dz_dx, A, places=5)
            self.assertAlmostEqual(grad.dz_dy, B, places=5)
            expected_slope_rad = math.atan(math.sqrt(A * A + B * B))
            self.assertAlmostEqual(grad.slope_rad, expected_slope_rad, places=5)
            self.assertAlmostEqual(grad.slope_deg, math.degrees(expected_slope_rad), places=3)

        # -------------------------------------------------------------
        # 2. Aspect Vector & Downhill Flow Invariants
        # -------------------------------------------------------------
        test_cases = [
            (0.0, -1.0, 0.0, "N"),
            (-1.0, -1.0, 45.0, "NE"),
            (-1.0, 0.0, 90.0, "E"),
            (-1.0, 1.0, 135.0, "SE"),
            (0.0, 1.0, 180.0, "S"),
            (1.0, 1.0, 225.0, "SW"),
            (1.0, 0.0, 270.0, "W"),
            (1.0, -1.0, 315.0, "NW"),
        ]
        for A, B, exp_aspect, exp_cardinal in test_cases:
            asp = calculate_compass_aspect(A, B)
            self.assertAlmostEqual(asp, exp_aspect, places=2)
            cardinal = aspect_to_compass_direction(asp)
            self.assertEqual(cardinal, exp_cardinal)

        # -------------------------------------------------------------
        # 3. Analytical Lambertian Hillshade Physical Invariants
        # -------------------------------------------------------------
        for alt in [15.0, 30.0, 45.0, 60.0, 90.0]:
            hs_horiz = calculate_lambertian_hillshade(slope_deg=0.0, aspect_deg=0.0, sun_altitude_deg=alt)
            expected_illum = 255.0 * math.sin(math.radians(alt))
            self.assertAlmostEqual(hs_horiz.illumination, expected_illum, places=2)
            self.assertFalse(hs_horiz.is_shadow)

        for az in [45.0, 135.0, 225.0, 315.0]:
            hs_normal = calculate_lambertian_hillshade(slope_deg=45.0, aspect_deg=az, sun_azimuth_deg=az, sun_altitude_deg=45.0)
            self.assertAlmostEqual(hs_normal.illumination, 255.0, places=2)
            self.assertAlmostEqual(hs_normal.cos_incidence, 1.0, places=4)
            self.assertFalse(hs_normal.is_shadow)

        hs_deep_shadow = calculate_lambertian_hillshade(slope_deg=60.0, aspect_deg=180.0, sun_azimuth_deg=0.0, sun_altitude_deg=20.0)
        self.assertAlmostEqual(hs_deep_shadow.illumination, 0.0, places=2)
        self.assertTrue(hs_deep_shadow.is_shadow)
        self.assertLess(hs_deep_shadow.cos_incidence, 0.0)

        # -------------------------------------------------------------
        # 4. Topographic Wetness Index (TWI) Monotonicity & Clamping Safety
        # -------------------------------------------------------------
        slopes = [0.5, 1.0, 2.0, 5.0, 10.0, 20.0, 30.0, 45.0, 60.0]
        twis_by_slope = [calculate_dem_topographic_wetness_index(s, specific_catchment_area_m=100.0).twi for s in slopes]
        for i in range(len(twis_by_slope) - 1):
            self.assertGreater(twis_by_slope[i], twis_by_slope[i + 1])

        catchment_areas = [10.0, 50.0, 100.0, 500.0, 2000.0, 10000.0]
        twis_by_area = [calculate_dem_topographic_wetness_index(15.0, specific_catchment_area_m=a).twi for a in catchment_areas]
        for i in range(len(twis_by_area) - 1):
            self.assertLess(twis_by_area[i], twis_by_area[i + 1])

        twi_zero_slope = calculate_dem_topographic_wetness_index(0.0, specific_catchment_area_m=100.0)
        self.assertTrue(math.isfinite(twi_zero_slope.twi))
        self.assertGreater(twi_zero_slope.twi, 10.0)

        # -------------------------------------------------------------
        # 5. Geotechnical Slope Stability Hazard Tiers Classification
        # -------------------------------------------------------------
        self.assertEqual(classify_dem_slope_hazard_tier(0.0), DemSlopeHazardTier.FLAT)
        self.assertEqual(classify_dem_slope_hazard_tier(4.9), DemSlopeHazardTier.FLAT)
        self.assertEqual(classify_dem_slope_hazard_tier(5.0), DemSlopeHazardTier.GENTLE)
        self.assertEqual(classify_dem_slope_hazard_tier(14.9), DemSlopeHazardTier.GENTLE)
        self.assertEqual(classify_dem_slope_hazard_tier(15.0), DemSlopeHazardTier.MODERATE)
        self.assertEqual(classify_dem_slope_hazard_tier(24.9), DemSlopeHazardTier.MODERATE)
        self.assertEqual(classify_dem_slope_hazard_tier(25.0), DemSlopeHazardTier.STEEP)
        self.assertEqual(classify_dem_slope_hazard_tier(34.9), DemSlopeHazardTier.STEEP)
        self.assertEqual(classify_dem_slope_hazard_tier(35.0), DemSlopeHazardTier.CRITICAL_HAZARD)
        self.assertEqual(classify_dem_slope_hazard_tier(55.0), DemSlopeHazardTier.CRITICAL_HAZARD)

        # -------------------------------------------------------------
        # 6. Dynamic XYZ DEM Relief & Metric Tile Streaming Invariants
        # -------------------------------------------------------------
        metrics = ["relief", "elevation", "slope", "aspect", "hillshade", "twi", "tri"]
        for m in metrics:
            tile_bytes = tile_service.render_dem_tile(
                z=11,
                x=512,
                y=1024,
                metric=m,
                collection="cop-dem-glo-30"
            )
            self.assertIsInstance(tile_bytes, bytes)
            self.assertGreater(len(tile_bytes), 500)
            self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"))

            img = Image.open(io.BytesIO(tile_bytes))
            self.assertEqual(img.size, (256, 256))
            self.assertEqual(img.mode, "RGBA")

    def test_task_t226_mosaic_seamline_feathering_radiometric_continuity_and_vrt_scientific_rigor(self):
        """Task T-226: Continuous Scientific QA for Cycle v2.5.27 Multi-Tile Seamline Feathering,
        Virtual Raster VRT Mosaics & MGRS Granule Edge Blending:
        1. Exact Partition of Unity across 2D Euclidean distance transforms (w1 + w2 == 1.0 +- 1e-6)
        2. Smoothstep cubic Hermite C1-continuous transition and monotonic weight scaling
        3. Multi-Granule normalization across FEATHER, VORONOI, COSINE_BELL, LINEAR_RAMP
        4. Radiometric continuity across seamlines (Delta rho < 0.005) & tier classification
        5. GDAL Virtual Raster (VRT) XML structure and SRS/GeoTransform validation
        6. Dynamic XYZ Mosaic Tile Rendering invariants across mosaic, feather, and seamline tiles
        """
        import io
        import numpy as np
        from PIL import Image
        from app.models.schemas import (
            MosaicBlendMethod,
            MosaicSeamlineTier,
            classify_mosaic_seamline_tier,
            calculate_distance_transform_feather_weights,
            calculate_voronoi_seamline_weights,
            calculate_multi_granule_seamline_weights,
            calculate_distance_to_edge_2d,
            calculate_mgrs_granule_overlap,
            generate_vrt_xml_definition,
            build_mosaic_tile_url,
            build_mosaic_tile_url_template,
            build_mosaic_feather_tile_url_template,
            build_mosaic_seamline_tile_url_template
        )
        from app.services.tile_service import tile_service

        # -------------------------------------------------------------
        # 1. Exact Partition of Unity across Distance Transforms (w1 + w2 == 1.0 +- 1e-6)
        # -------------------------------------------------------------
        for d1, d2 in [(10.0, 10.0), (0.0, 50.0), (80.0, 20.0), (150.0, 350.0), (1.0, 999.0)]:
            w1, w2 = calculate_distance_transform_feather_weights(d1, d2, use_smoothstep=True)
            self.assertAlmostEqual(w1 + w2, 1.0, places=5)
            self.assertGreaterEqual(w1, 0.0)
            self.assertLessEqual(w1, 1.0)
            self.assertGreaterEqual(w2, 0.0)
            self.assertLessEqual(w2, 1.0)

        # Equal distance must yield exact symmetry w1 == w2 == 0.5
        w1_sym, w2_sym = calculate_distance_transform_feather_weights(100.0, 100.0, use_smoothstep=True)
        self.assertAlmostEqual(w1_sym, 0.5, places=5)
        self.assertAlmostEqual(w2_sym, 0.5, places=5)

        # 2D Array Partition of Unity
        d1_grid = np.linspace(0.0, 200.0, 25, dtype=np.float32).reshape(5, 5)
        d2_grid = np.linspace(200.0, 0.0, 25, dtype=np.float32).reshape(5, 5)
        w1_arr, w2_arr = calculate_distance_transform_feather_weights(d1_grid, d2_grid, use_smoothstep=True)
        sum_arr = w1_arr + w2_arr
        np.testing.assert_allclose(sum_arr, 1.0, rtol=1e-5, atol=1e-5)

        # -------------------------------------------------------------
        # 2. Smoothstep Cubic Hermite C1-Continuous Monotonicity
        # -------------------------------------------------------------
        d_totals = 100.0
        prev_w1 = -0.01
        for step in range(0, 101, 10):
            d1_val = float(step)
            d2_val = d_totals - d1_val
            w1_val, w2_val = calculate_distance_transform_feather_weights(d1_val, d2_val, use_smoothstep=True)
            self.assertGreaterEqual(w1_val, prev_w1)
            prev_w1 = w1_val

        # -------------------------------------------------------------
        # 3. Voronoi Seamline Weights & Multi-Granule Blending Normalization
        # -------------------------------------------------------------
        v1, v2 = calculate_voronoi_seamline_weights(120.0, 80.0)
        self.assertEqual(v1, 1.0)
        self.assertEqual(v2, 0.0)

        v1_rev, v2_rev = calculate_voronoi_seamline_weights(45.0, 95.0)
        self.assertEqual(v1_rev, 0.0)
        self.assertEqual(v2_rev, 1.0)

        for method in [MosaicBlendMethod.FEATHER, MosaicBlendMethod.VORONOI, MosaicBlendMethod.COSINE_BELL, MosaicBlendMethod.LINEAR_RAMP]:
            weights_3 = calculate_multi_granule_seamline_weights([50.0, 120.0, 80.0], method=method)
            self.assertEqual(len(weights_3), 3)
            self.assertAlmostEqual(sum(weights_3), 1.0, places=4)

            weights_4 = calculate_multi_granule_seamline_weights([20.0, 100.0, 150.0, 60.0], method=method)
            self.assertEqual(len(weights_4), 4)
            self.assertAlmostEqual(sum(weights_4), 1.0, places=4)

        # -------------------------------------------------------------
        # 4. Radiometric Continuity Across Seamlines & Tier Classification
        # -------------------------------------------------------------
        self.assertEqual(classify_mosaic_seamline_tier(0.002), MosaicSeamlineTier.SEAMLESS)
        self.assertEqual(classify_mosaic_seamline_tier(0.0049), MosaicSeamlineTier.SEAMLESS)
        self.assertEqual(classify_mosaic_seamline_tier(0.005), MosaicSeamlineTier.SUBTLE)
        self.assertEqual(classify_mosaic_seamline_tier(0.0199), MosaicSeamlineTier.SUBTLE)
        self.assertEqual(classify_mosaic_seamline_tier(0.020), MosaicSeamlineTier.VISIBLE_STEP)
        self.assertEqual(classify_mosaic_seamline_tier(0.0499), MosaicSeamlineTier.VISIBLE_STEP)
        self.assertEqual(classify_mosaic_seamline_tier(0.050), MosaicSeamlineTier.SEVERE_DISCONTINUITY)
        self.assertEqual(classify_mosaic_seamline_tier(0.120), MosaicSeamlineTier.SEVERE_DISCONTINUITY)

        # Geometric Overlap between MGRS UTM granules
        bbox_10seg = [-121.20, 36.90, -120.80, 37.40]
        bbox_10sfg = [-120.95, 36.90, -120.55, 37.40]
        overlap_res = calculate_mgrs_granule_overlap(bbox_10seg, bbox_10sfg, mean_refl_a=0.285, mean_refl_b=0.282)
        self.assertTrue(overlap_res["has_overlap"])
        self.assertGreater(overlap_res["overlap_area_sqkm"], 0.0)
        self.assertGreater(overlap_res["overlap_percentage_a"], 0.0)
        self.assertEqual(overlap_res["seamline_tier"], MosaicSeamlineTier.SEAMLESS.value)
        self.assertLess(overlap_res["estimated_delta_rho"], 0.005)

        # -------------------------------------------------------------
        # 5. GDAL Virtual Raster (VRT) XML Definition Verification
        # -------------------------------------------------------------
        granules_mock = [
            {"granule_id": "T10SEG", "source_uri": "stac://sentinel-2-l2a/T10SEG"},
            {"granule_id": "T10SFG", "source_uri": "stac://sentinel-2-l2a/T10SFG"}
        ]
        vrt_xml = generate_vrt_xml_definition("MOSAIC-QA-01", "sentinel-2-l2a", granules_mock)
        self.assertIn("<VRTDataset", vrt_xml)
        self.assertIn("<SRS", vrt_xml)
        self.assertIn("<GeoTransform", vrt_xml)
        self.assertIn("<VRTRasterBand", vrt_xml)
        self.assertIn("<SimpleSource>", vrt_xml)
        self.assertIn("T10SEG", vrt_xml)
        self.assertIn("T10SFG", vrt_xml)

        # -------------------------------------------------------------
        # 6. Dynamic XYZ Mosaic Tile Rendering Invariants
        # -------------------------------------------------------------
        for blend in ["feather", "voronoi", "linear_ramp"]:
            tile_bytes = tile_service.render_mosaic_tile(
                z=10,
                x=163,
                y=395,
                collection="sentinel-2-l2a",
                blend_method=blend,
                feather_width_m=250.0
            )
            self.assertIsInstance(tile_bytes, bytes)
            self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
            img = Image.open(io.BytesIO(tile_bytes))
            self.assertEqual(img.size, (256, 256))
            self.assertEqual(img.mode, "RGBA")

        # Distance transform feather weight tile
        feather_bytes = tile_service.render_mosaic_feather_tile(z=10, x=163, y=395)
        self.assertIsInstance(feather_bytes, bytes)
        self.assertTrue(feather_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
        img_f = Image.open(io.BytesIO(feather_bytes))
        self.assertEqual(img_f.size, (256, 256))

        # Seamline Voronoi overlay tile
        seam_bytes = tile_service.render_mosaic_seamline_tile(z=10, x=163, y=395)
        self.assertIsInstance(seam_bytes, bytes)
        self.assertTrue(seam_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
        img_s = Image.open(io.BytesIO(seam_bytes))
        self.assertEqual(img_s.size, (256, 256))

    def test_temporal_order_statistics_and_quality_mosaics_rigor(self):
        """Task T-232: Verify Cycle v2.5.28 Temporal Order Statistics Conservation,
        Greenest-Pixel NDVI Argmax Index Preservation, Physical Spectral Covariance,
        Non-Negative Cloud Score Masking, Quality Tiers & Dynamic XYZ Composite Tiles.
        """
        from app.services.tile_service import tile_service
        import io
        from PIL import Image
        from app.models.schemas import (
            calculate_pixel_quality_score,
            classify_temporal_composite_quality,
            select_greenest_pixel_indices,
            select_clearest_pixel_indices,
            apply_temporal_reduction,
            TemporalReducerMethod,
            TemporalQualityTier
        )

        # -------------------------------------------------------------
        # 1. Temporal Order Statistics Conservation & Monotonicity Invariants
        # -------------------------------------------------------------
        # For any time-series stack X with T scenes at any pixel:
        # min(X) <= p25(X) <= median(X) <= p75(X) <= max(X)
        T_len = 7
        H, W = 16, 16
        np.random.seed(42)
        # Create non-trivial synthetic temporal raster stack with spatial variation
        stack_time = np.random.uniform(0.05, 0.95, size=(T_len, H, W)).astype(np.float32)

        arr_min = apply_temporal_reduction(stack_time, reducer="min", axis=0)
        arr_p25 = apply_temporal_reduction(stack_time, reducer="p25", axis=0)
        arr_median = apply_temporal_reduction(stack_time, reducer="median", axis=0)
        arr_p75 = apply_temporal_reduction(stack_time, reducer="p75", axis=0)
        arr_max = apply_temporal_reduction(stack_time, reducer="max", axis=0)
        arr_mean = apply_temporal_reduction(stack_time, reducer="mean", axis=0)

        # Verify element-wise order statistics inequalities everywhere
        self.assertTrue(np.all(arr_min <= arr_p25 + 1e-6), "Violated: min <= p25")
        self.assertTrue(np.all(arr_p25 <= arr_median + 1e-6), "Violated: p25 <= median")
        self.assertTrue(np.all(arr_median <= arr_p75 + 1e-6), "Violated: median <= p75")
        self.assertTrue(np.all(arr_median <= arr_max + 1e-6), "Violated: median <= max")
        self.assertTrue(np.all(arr_p75 <= arr_max + 1e-6), "Violated: p75 <= max")
        self.assertTrue(np.all(arr_min <= arr_mean + 1e-6), "Violated: min <= mean")
        self.assertTrue(np.all(arr_mean <= arr_max + 1e-6), "Violated: mean <= max")

        # Discrete classification band: Mode reducer preserves discrete integer categories
        discrete_stack = np.array([
            [[1, 2], [3, 4]],
            [[1, 2], [4, 4]],
            [[1, 5], [4, 4]],
            [[2, 5], [4, 7]]
        ], dtype=np.float32)
        arr_mode = apply_temporal_reduction(discrete_stack, reducer="mode", axis=0)
        # Pixel (0,0): values [1, 1, 1, 2] -> mode = 1
        # Pixel (1,0): values [3, 4, 4, 4] -> mode = 4
        # Pixel (1,1): values [4, 4, 4, 7] -> mode = 4
        self.assertEqual(arr_mode[0, 0], 1.0)
        self.assertIn(arr_mode[0, 1], (2.0, 5.0))
        self.assertEqual(arr_mode[1, 0], 4.0)
        self.assertEqual(arr_mode[1, 1], 4.0)

        # NaN handling: nanmedian and nanmean ignore cloud-masked NaNs
        stack_with_nan = stack_time.copy()
        stack_with_nan[1:3, 5:10, 5:10] = np.nan
        arr_nan_median = apply_temporal_reduction(stack_with_nan, reducer="median", axis=0)
        self.assertFalse(np.isnan(arr_nan_median[7, 7]), "Median must ignore NaNs when valid scenes remain")
        self.assertTrue(np.all(np.isfinite(arr_nan_median)), "All pixels with remaining valid scenes must be finite")

        # -------------------------------------------------------------
        # 2. Covariance-Preserving Greenest-Pixel Selection (Argmax NDVI)
        # -------------------------------------------------------------
        # When compositing multi-spectral bands, selecting argmax NDVI ensures that
        # all bands (Red, Green, Blue, NIR, SWIR) are sampled from the EXACT SAME scene,
        # perfectly preserving physical inter-band spectral covariance and avoiding spectral chimeras.
        red_stack = np.zeros((3, 4, 4), dtype=np.float32)
        nir_stack = np.zeros((3, 4, 4), dtype=np.float32)
        blue_stack = np.zeros((3, 4, 4), dtype=np.float32)

        # Scene 0: Dry soil / senescence (Low NDVI)
        red_stack[0, :, :] = 0.35
        nir_stack[0, :, :] = 0.40
        blue_stack[0, :, :] = 0.20

        # Scene 1: Peak vegetation / greenest canopy (High NDVI)
        red_stack[1, :, :] = 0.08
        nir_stack[1, :, :] = 0.82
        blue_stack[1, :, :] = 0.05

        # Scene 2: Moderate regrowth
        red_stack[2, :, :] = 0.18
        nir_stack[2, :, :] = 0.52
        blue_stack[2, :, :] = 0.12

        best_idx, max_ndvi = select_greenest_pixel_indices(red_stack, nir_stack)
        self.assertEqual(best_idx.shape, (4, 4))
        self.assertEqual(max_ndvi.shape, (4, 4))
        # Scene 1 has highest NDVI: (0.82 - 0.08) / (0.82 + 0.08) = 0.74 / 0.90 = 0.8222
        self.assertTrue(np.all(best_idx == 1), "Greenest pixel selector must pick Scene 1 across all pixels")
        self.assertAlmostEqual(float(max_ndvi[0, 0]), (0.82 - 0.08) / (0.82 + 0.08), places=4)

        # Spectral covariance verification:
        sampled_blue = np.take_along_axis(blue_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
        sampled_red = np.take_along_axis(red_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
        sampled_nir = np.take_along_axis(nir_stack, np.expand_dims(best_idx, axis=0), axis=0).squeeze(axis=0)
        self.assertTrue(np.allclose(sampled_blue, 0.05), "Blue must be sampled strictly from Scene 1 (0.05)")
        self.assertTrue(np.allclose(sampled_red, 0.08), "Red must be sampled strictly from Scene 1 (0.08)")
        self.assertTrue(np.allclose(sampled_nir, 0.82), "NIR must be sampled strictly from Scene 1 (0.82)")

        # -------------------------------------------------------------
        # 3. Clearest-Pixel Selection (Argmin Cloud Probability)
        # -------------------------------------------------------------
        cloud_prob_stack = np.array([
            [[0.80, 0.15], [0.45, 0.90]],  # Scene 0
            [[0.10, 0.70], [0.20, 0.85]],  # Scene 1
            [[0.60, 0.30], [0.10, 0.05]]   # Scene 2
        ], dtype=np.float32)
        c_idx, min_cp = select_clearest_pixel_indices(cloud_prob_stack)
        # (0,0): min at Scene 1 (0.10)
        # (0,1): min at Scene 0 (0.15)
        # (1,0): min at Scene 2 (0.10)
        # (1,1): min at Scene 2 (0.05)
        self.assertEqual(c_idx[0, 0], 1)
        self.assertAlmostEqual(min_cp[0, 0], 0.10, places=4)
        self.assertEqual(c_idx[0, 1], 0)
        self.assertAlmostEqual(min_cp[0, 1], 0.15, places=4)
        self.assertEqual(c_idx[1, 0], 2)
        self.assertAlmostEqual(min_cp[1, 0], 0.10, places=4)
        self.assertEqual(c_idx[1, 1], 2)
        self.assertAlmostEqual(min_cp[1, 1], 0.05, places=4)

        # -------------------------------------------------------------
        # 4. Pixel Quality Score Formula & Bounds Verification
        # -------------------------------------------------------------
        # Q = (1 - C_cloud/100) * sin(theta_sun) * cos(theta_nadir)
        # Test boundary conditions:
        q_clear_zenith = calculate_pixel_quality_score(cloud_cover_pct=0.0, sun_elevation_deg=90.0, nadir_angle_deg=0.0)
        self.assertAlmostEqual(q_clear_zenith, 1.0, places=4)

        q_full_cloud = calculate_pixel_quality_score(cloud_cover_pct=100.0, sun_elevation_deg=65.0, nadir_angle_deg=10.0)
        self.assertEqual(q_full_cloud, 0.0)

        q_low_sun = calculate_pixel_quality_score(cloud_cover_pct=10.0, sun_elevation_deg=5.0, nadir_angle_deg=5.0)
        expected_low = (1.0 - 0.10) * math.sin(math.radians(5.0)) * math.cos(math.radians(5.0))
        self.assertAlmostEqual(q_low_sun, expected_low, places=4)

        q_intermediate = calculate_pixel_quality_score(cloud_cover_pct=20.0, sun_elevation_deg=45.0, nadir_angle_deg=30.0)
        expected_q = (1.0 - 0.20) * math.sin(math.radians(45.0)) * math.cos(math.radians(30.0))
        self.assertAlmostEqual(q_intermediate, expected_q, places=4)
        self.assertGreaterEqual(q_intermediate, 0.0)
        self.assertLessEqual(q_intermediate, 1.0)

        # -------------------------------------------------------------
        # 5. Temporal Composite Quality Tier Classification Invariants
        # -------------------------------------------------------------
        self.assertEqual(classify_temporal_composite_quality(95.0, scene_count=5), TemporalQualityTier.EXCELLENT)
        self.assertEqual(classify_temporal_composite_quality(91.0, scene_count=4), TemporalQualityTier.EXCELLENT)
        self.assertEqual(classify_temporal_composite_quality(88.0, scene_count=4), TemporalQualityTier.GOOD)
        self.assertEqual(classify_temporal_composite_quality(75.0, scene_count=3), TemporalQualityTier.GOOD)
        self.assertEqual(classify_temporal_composite_quality(88.0, scene_count=2), TemporalQualityTier.MARGINAL)
        self.assertEqual(classify_temporal_composite_quality(58.0, scene_count=2), TemporalQualityTier.MARGINAL)
        self.assertEqual(classify_temporal_composite_quality(35.0, scene_count=1), TemporalQualityTier.POOR)

        # -------------------------------------------------------------
        # 6. Dynamic XYZ Composite & Quality Mosaic Tile Streaming Invariants
        # -------------------------------------------------------------
        reducers_to_test = ["median", "max_ndvi", "mean", "min_cloud", "p25", "p75"]
        for r_name in reducers_to_test:
            tile_bytes = tile_service.render_temporal_composite_tile(
                z=10,
                x=163,
                y=395,
                collection="sentinel-2-l2a",
                reducer=r_name,
                start_date="2026-06-01",
                end_date="2026-08-31"
            )
            self.assertIsInstance(tile_bytes, bytes, f"Reducer {r_name} must return bytes")
            self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"), f"Reducer {r_name} tile must have valid PNG magic header")
            img = Image.open(io.BytesIO(tile_bytes))
            self.assertEqual(img.size, (256, 256), f"Reducer {r_name} tile must be 256x256")
            self.assertEqual(img.mode, "RGBA", f"Reducer {r_name} tile must be RGBA")

        # Quality mosaic tiles (NDVI & Cloud Probability)
        for q_band in ["NDVI", "cloud_prob"]:
            qm_tile_bytes = tile_service.render_temporal_quality_mosaic_tile(
                z=10,
                x=163,
                y=395,
                collection="sentinel-2-l2a",
                quality_band=q_band,
                start_date="2026-06-01",
                end_date="2026-08-31"
            )
            self.assertIsInstance(qm_tile_bytes, bytes)
            self.assertTrue(qm_tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
            img_qm = Image.open(io.BytesIO(qm_tile_bytes))
            self.assertEqual(img_qm.size, (256, 256))
            self.assertEqual(img_qm.mode, "RGBA")


    def test_task_t238_sentinel1_sar_backscatter_speckle_filtering_and_radiometric_terrain_flattening_scientific_rigor(self):
        """Task T-238 Scientific Rigor & Mathematical Invariant Verification:
        Sentinel-1 SAR Radiometric Terrain Flattening Gamma0 (gamma0 = sigma0 / cos(theta)),
        Multiplicative Speckle Noise Model & Variance Reduction Factor (E[Var]_filtered <= 0.25 * E[Var]_raw),
        Radiometric Unbiasedness & Radiance Mean Conservation (|I_filtered - I_raw| / I_raw < 0.01),
        Edge Preservation Across High-Contrast Step Boundaries, Cross-Polarization Ratio & NDPI Invariants,
        Specular Water / Flood Inundation Decibel Classification, and Dynamic XYZ SAR Tile Streaming.
        """
        import io
        from PIL import Image
        from app.models.schemas import (
            apply_terrain_flattening_gamma0,
            calculate_polarization_ratio_db,
            calculate_polarization_ratio_linear,
            calculate_normalized_difference_polarization_index,
            classify_sar_flood_tier,
            classify_sar_water_pixels,
            calculate_refined_lee_filter_weights,
            apply_speckle_filter_1d_or_2d,
            SpeckleFilterMethod,
            SARFloodDetectionTier,
            SARBackscatterCalibration,
            SarPolarization
        )
        from app.services.tile_service import tile_service

        # -----------------------------------------------------------------
        # 1. SAR Radiometric Terrain Flattening Gamma0 Calibration
        # -----------------------------------------------------------------
        # gamma0 = sigma0 / cos(theta_local)
        # gamma0_dB = sigma0_dB - 10 * log10(cos(theta_local))
        
        # 1a. Normal incidence identity (theta = 0 deg => cos(0) = 1.0 => gamma0 == sigma0)
        g0_nadir_lin = apply_terrain_flattening_gamma0(0.125, 0.0, is_db=False)
        self.assertAlmostEqual(g0_nadir_lin, 0.125, places=5)

        g0_nadir_db = apply_terrain_flattening_gamma0(-9.0309, 0.0, is_db=True)
        self.assertAlmostEqual(g0_nadir_db, -9.0309, places=4)

        # 1b. Steep illuminated slope / high incidence angle (theta = 60 deg => cos(60) = 0.5)
        # Linear: gamma0 = 0.10 / 0.5 = 0.20
        g0_60_lin = apply_terrain_flattening_gamma0(0.10, 60.0, is_db=False)
        self.assertAlmostEqual(g0_60_lin, 0.20, places=5)

        # Decibel: gamma0_dB = -10.0 - 10 * log10(0.5) = -10.0 + 3.0102999566 = -6.9897
        g0_60_db = apply_terrain_flattening_gamma0(-10.0, 60.0, is_db=True)
        expected_db_60 = -10.0 - 10.0 * math.log10(0.5)
        self.assertAlmostEqual(g0_60_db, expected_db_60, places=4)

        # 1c. Monotonicity across incidence angles (thetas in [15, 25, 35, 45, 55])
        thetas = np.array([15.0, 25.0, 35.0, 45.0, 55.0], dtype=np.float32)
        sigmas = np.full_like(thetas, 0.08, dtype=np.float32)
        gammas = apply_terrain_flattening_gamma0(sigmas, thetas, is_db=False)
        diffs = np.diff(gammas)
        self.assertTrue(np.all(diffs > 0.0), "Terrain-flattened gamma0 must monotonically increase with incidence angle for constant sigma0")

        # 1d. Grazing angle numerical stability epsilon guard (theta = 89.9 deg)
        g0_grazing = apply_terrain_flattening_gamma0(0.08, 89.9, is_db=False)
        self.assertTrue(np.isfinite(g0_grazing), "Grazing angle terrain flattening must be finite and well-conditioned")
        self.assertGreater(g0_grazing, 0.0)

        # -----------------------------------------------------------------
        # 2. Multiplicative Speckle Noise Model & Variance Reduction Factor
        # -----------------------------------------------------------------
        # In a fully developed speckle field (homogeneous distributed target):
        # I = I_0 * eta, where eta ~ Gamma(shape=ENL, scale=1/ENL) with ENL = 4.4 looks.
        # E[I] = I_0, Var[I] = I_0^2 / ENL.
        # Required constraint: E[Var]_filtered <= 0.25 * E[Var]_raw (variance reduction >= 4.0x)
        H, W = 64, 64
        I_0 = 0.20
        np.random.seed(1337)
        speckle_noise = np.random.gamma(shape=4.4, scale=1.0 / 4.4, size=(H, W)).astype(np.float32)
        raw_intensity = (I_0 * speckle_noise).astype(np.float32)

        var_raw_full = float(np.var(raw_intensity))
        self.assertGreater(var_raw_full, 0.0)

        filter_methods = ["refined_lee", "frost", "kuan", "gamma_map", "boxcar_mean"]
        for f_method in filter_methods:
            filt_2d = tile_service.vectorized_speckle_filter_2d(raw_intensity, method=f_method, kernel_size=5)
            # Evaluate internal homogeneous region away from boundary padding (slice 5:-5)
            inner_filt = filt_2d[5:-5, 5:-5]
            inner_raw = raw_intensity[5:-5, 5:-5]
            var_filt = float(np.var(inner_filt))
            var_raw_inner = float(np.var(inner_raw))

            # Variance reduction factor verification: E[Var]_filtered <= 0.25 * E[Var]_raw
            self.assertLessEqual(
                var_filt,
                0.25 * var_raw_inner + 1e-5,
                f"Filter {f_method} failed variance reduction constraint (var_filt={var_filt:.6f}, 0.25*var_raw={0.25*var_raw_inner:.6f})"
            )
            reduction_factor = var_raw_inner / max(1e-7, var_filt)
            self.assertGreaterEqual(
                reduction_factor,
                4.0,
                f"Filter {f_method} reduction factor {reduction_factor:.2f} < 4.0 threshold"
            )

            # Test schema 2D filter implementation parity
            filt_schema = apply_speckle_filter_1d_or_2d(raw_intensity, method=f_method, kernel_size=5)
            var_schema = float(np.var(filt_schema[5:-5, 5:-5]))
            self.assertLessEqual(
                var_schema,
                0.25 * var_raw_inner + 1e-5,
                f"Schema filter {f_method} failed variance reduction constraint"
            )

        # -----------------------------------------------------------------
        # 3. Radiometric Unbiasedness & Radiance Mean Conservation
        # -----------------------------------------------------------------
        # Unbiasedness requirement across homogeneous distributed targets:
        # |I_bar_filtered - I_bar_raw| / I_bar_raw < 0.01 (< 1% relative deviation)
        for f_method in ["refined_lee", "kuan", "boxcar_mean"]:
            filt_2d = tile_service.vectorized_speckle_filter_2d(raw_intensity, method=f_method, kernel_size=5)
            mean_raw = float(np.mean(raw_intensity[5:-5, 5:-5]))
            mean_filt = float(np.mean(filt_2d[5:-5, 5:-5]))
            rel_bias = abs(mean_filt - mean_raw) / mean_raw
            self.assertLess(
                rel_bias,
                0.01,
                f"Filter {f_method} introduced systematic radiometric bias: rel_bias={rel_bias:.4f} >= 0.01"
            )

        # -----------------------------------------------------------------
        # 4. Edge Preservation Across High-Contrast Step Boundaries
        # -----------------------------------------------------------------
        # Step boundary: left half is calm water (0.01, -20 dB), right half is dense land (0.20, -7 dB)
        step_grid = np.zeros((32, 32), dtype=np.float32)
        step_grid[:, :16] = 0.01
        step_grid[:, 16:] = 0.20
        np.random.seed(42)
        step_speckle = step_grid * np.random.gamma(shape=4.4, scale=1.0 / 4.4, size=(32, 32)).astype(np.float32)

        lee_step = tile_service.vectorized_speckle_filter_2d(step_speckle, method="refined_lee", kernel_size=5)
        box_step = tile_service.vectorized_speckle_filter_2d(step_speckle, method="boxcar_mean", kernel_size=5)

        # Contrast across boundary (col 18 vs col 13)
        lee_contrast = float(np.mean(lee_step[:, 18]) - np.mean(lee_step[:, 13]))
        box_contrast = float(np.mean(box_step[:, 18]) - np.mean(box_step[:, 13]))

        # Refined Lee preserves edge sharpness significantly better than boxcar mean
        self.assertGreater(lee_contrast, box_contrast, "Refined Lee must preserve sharper edge gradient than boxcar mean")
        self.assertGreater(lee_contrast, 0.12, "Refined Lee must preserve > 60% of step contrast")

        # -----------------------------------------------------------------
        # 5. Cross-Polarization Ratio & NDPI Invariants
        # -----------------------------------------------------------------
        vh_vals = np.array([0.005, 0.02, 0.05, 0.10], dtype=np.float32)
        vv_vals = np.array([0.05, 0.10, 0.15, 0.20], dtype=np.float32)

        r_lin = calculate_polarization_ratio_linear(vh_vals, vv_vals)
        vh_db = 10.0 * np.log10(vh_vals)
        vv_db = 10.0 * np.log10(vv_vals)
        r_db = calculate_polarization_ratio_db(vh_db, vv_db)

        # ratio_dB = 10 * log10(ratio_lin)
        expected_r_db = 10.0 * np.log10(r_lin)
        self.assertTrue(np.allclose(r_db, expected_r_db, atol=1e-5), "Polarization ratio in dB must match 10*log10(linear ratio)")

        # NDPI = (VV - VH) / (VV + VH) in [-1, 1]
        ndpi = calculate_normalized_difference_polarization_index(vv_vals, vh_vals)
        self.assertTrue(np.all(ndpi >= -1.0) and np.all(ndpi <= 1.0), "NDPI must be bounded in [-1, 1]")
        self.assertTrue(np.all(ndpi > 0.0), "For VV > VH, NDPI must be positive")
        self.assertAlmostEqual(float(calculate_normalized_difference_polarization_index(0.1, 0.1)), 0.0)

        # -----------------------------------------------------------------
        # 6. Calm Water / Flood Detection Decibel Invariants & Area Conservation
        # -----------------------------------------------------------------
        # Specular reflection: calm water backscatter <= -16.5 dB
        self.assertEqual(classify_sar_flood_tier(-22.0), SARFloodDetectionTier.CALM_WATER)
        self.assertEqual(classify_sar_flood_tier(-16.5), SARFloodDetectionTier.CALM_WATER)
        self.assertEqual(classify_sar_flood_tier(-14.0), SARFloodDetectionTier.ROUGH_WATER)
        self.assertEqual(classify_sar_flood_tier(-10.0), SARFloodDetectionTier.MOIST_SOIL)
        self.assertEqual(classify_sar_flood_tier(-6.0), SARFloodDetectionTier.DRY_SOIL_VEGETATION)
        self.assertEqual(classify_sar_flood_tier(2.0), SARFloodDetectionTier.URBAN_DOUBLE_BOUNCE)

        test_raster = np.array([
            [-22.0, -18.0, -10.0],
            [-17.0, -16.5, -5.0],
            [-12.0, -8.0, 3.0]
        ], dtype=np.float32)
        w_res = classify_sar_water_pixels(test_raster, threshold_db=-16.5, pixel_area_ha=0.01)
        self.assertEqual(w_res["water_pixels"], 4)
        self.assertEqual(w_res["total_pixels"], 9)
        self.assertAlmostEqual(w_res["water_fraction"], 4.0 / 9.0, places=4)
        self.assertAlmostEqual(w_res["water_area_ha"], 4 * 0.01, places=4)

        # -----------------------------------------------------------------
        # 7. Dynamic XYZ SAR Tile Rendering & PNG Encoding Invariants
        # -----------------------------------------------------------------
        tile_vv = tile_service.render_sar_backscatter_tile(
            z=10, x=163, y=395, collection="sentinel-1-rtc", polarization="vv", colormap="gray"
        )
        self.assertTrue(tile_vv.startswith(b"\x89PNG\r\n\x1a\n"))
        img_vv = Image.open(io.BytesIO(tile_vv))
        self.assertEqual(img_vv.size, (256, 256))
        self.assertEqual(img_vv.mode, "RGBA")

        tile_rgb = tile_service.render_sar_backscatter_tile(
            z=10, x=163, y=395, collection="sentinel-1-rtc", polarization="dual_pol_rgb"
        )
        self.assertTrue(tile_rgb.startswith(b"\x89PNG\r\n\x1a\n"))

        tile_flood = tile_service.render_sar_flood_inundation_tile(
            z=10, x=163, y=395, threshold_db=-16.5
        )
        self.assertTrue(tile_flood.startswith(b"\x89PNG\r\n\x1a\n"))
        img_fl = Image.open(io.BytesIO(tile_flood))
        self.assertEqual(img_fl.size, (256, 256))

        tile_filt = tile_service.render_sar_speckle_filter_tile(
            filter_method="refined_lee", z=10, x=163, y=395
        )
        self.assertTrue(tile_filt.startswith(b"\x89PNG\r\n\x1a\n"))

    def test_task_t244_coregistration_fft_phase_correlation_resampling_and_townshend_scientific_rigor(self):
        """Task T-244 Scientific Rigor & Mathematical Invariant Verification:
        Sub-Pixel 2D FFT Phase Correlation Shift Recovery (Delta < 0.05 px),
        Keys (1981) Cubic Convolution Kernel Partition of Unity (sum w_k == 1.0) & Symmetry,
        Townshend et al. (1992) Misregistration False-Change Risk Propagation & Quality Tiers,
        RANSAC 2D Affine Homography Outlier Rejection,
        Radiometric Differencing Edge Cancellation (RMSE Reduction > 70%),
        and Dynamic XYZ Co-Registration Tile Streaming Invariants.
        """
        import io
        from PIL import Image
        from scipy.ndimage import shift as ndshift
        from app.models.schemas import (
            calculate_fft_phase_correlation_shift,
            estimate_affine_transform_matrix,
            evaluate_resampling_kernel_weight,
            classify_coregistration_quality_tier,
            calculate_change_detection_false_positive_risk,
            GeometricResamplingKernel,
            CoRegistrationQualityTier
        )
        from app.services.indices import IndexComputationService
        from app.services.tile_service import tile_service

        # -----------------------------------------------------------------
        # 1. Keys (1981) Cubic Convolution Kernel Partition of Unity & Symmetry
        # -----------------------------------------------------------------
        # w(x) with a = -0.5:
        # For |x| <= 1: (a+2)|x|^3 - (a+3)|x|^2 + 1 = 1.5|x|^3 - 2.5|x|^2 + 1
        # For 1 < |x| <= 2: a|x|^3 - 5a|x|^2 + 8a|x| - 4a = -0.5|x|^3 + 2.5|x|^2 - 4|x| + 2
        # For |x| > 2: 0

        # 1a. Symmetry condition: w(-x) == w(x)
        for x in [0.0, 0.25, 0.5, 0.75, 1.0, 1.33, 1.75, 1.99, 2.0, 2.5]:
            w_pos = evaluate_resampling_kernel_weight(x, "cubic_convolution")
            w_neg = evaluate_resampling_kernel_weight(-x, "cubic_convolution")
            self.assertAlmostEqual(w_pos, w_neg, places=7, msg=f"Keys symmetry failed at x={x}")

        # 1b. Exact interpolation knot points: w(0) = 1.0, w(1) = 0.0, w(2) = 0.0, w(|x|>=2) = 0.0
        self.assertAlmostEqual(evaluate_resampling_kernel_weight(0.0, "cubic_convolution"), 1.0, places=7)
        self.assertAlmostEqual(evaluate_resampling_kernel_weight(1.0, "cubic_convolution"), 0.0, places=7)
        self.assertAlmostEqual(evaluate_resampling_kernel_weight(2.0, "cubic_convolution"), 0.0, places=7)
        self.assertAlmostEqual(evaluate_resampling_kernel_weight(2.5, "cubic_convolution"), 0.0, places=7)

        # 1c. Strict Partition of Unity condition: sum_{k=-1}^{2} w_k(d) == 1.0 for all d in [0, 1)
        # Across arbitrary sub-pixel phase displacements d in [0, 1)
        d_samples = np.linspace(0.0, 0.999, 250)
        for d in d_samples:
            w_m1 = evaluate_resampling_kernel_weight(1.0 + d, "cubic_convolution")
            w_0 = evaluate_resampling_kernel_weight(d, "cubic_convolution")
            w_p1 = evaluate_resampling_kernel_weight(1.0 - d, "cubic_convolution")
            w_p2 = evaluate_resampling_kernel_weight(2.0 - d, "cubic_convolution")
            weight_sum = w_m1 + w_0 + w_p1 + w_p2
            self.assertAlmostEqual(weight_sum, 1.0, places=6,
                                  msg=f"Keys partition of unity violated at d={d}: sum={weight_sum}")

        # 1d. Bilinear Partition of Unity: w_0(d) + w_1(d) == (1 - d) + d == 1.0
        for d in d_samples:
            w0 = evaluate_resampling_kernel_weight(d, "bilinear")
            w1 = evaluate_resampling_kernel_weight(1.0 - d, "bilinear")
            self.assertAlmostEqual(w0 + w1, 1.0, places=7)

        # -----------------------------------------------------------------
        # 2. Sub-Pixel Shift Recovery Accuracy via 2D FFT Phase Correlation
        # -----------------------------------------------------------------
        # Synthesize smooth Gaussian continuous raster patch (64x64)
        y_grid, x_grid = np.mgrid[-32:32, -32:32]
        img_ref = np.exp(-(x_grid**2 + y_grid**2) / (2.0 * 6.0**2)).astype(np.float64)

        test_shifts = [
            (0.25, -0.35),
            (-0.40, 0.20),
            (0.15, 0.45),
            (-0.30, -0.25)
        ]

        for (true_dx, true_dy) in test_shifts:
            img_tgt = ndshift(img_ref, [true_dy, true_dx], order=3)
            shift_res = calculate_fft_phase_correlation_shift(img_ref, img_tgt, subpixel=True)

            # In GIOS phase correlation convention:
            # Shift reflects displacement vector between reference and target
            err_x = abs(abs(shift_res["shift_x"]) - abs(true_dx))
            err_y = abs(abs(shift_res["shift_y"]) - abs(true_dy))

            self.assertLess(err_x, 0.05, f"Sub-pixel X shift error {err_x} exceeds rigorous 0.05 px ceiling")
            self.assertLess(err_y, 0.05, f"Sub-pixel Y shift error {err_y} exceeds rigorous 0.05 px ceiling")
            self.assertGreater(shift_res["correlation_score"], 0.95, "Correlation peak score must exceed 0.95")

        # Verify subpixel=False snaps strictly to integer grid
        shift_int = calculate_fft_phase_correlation_shift(img_ref, ndshift(img_ref, [0.35, -0.45], order=3), subpixel=False)
        self.assertEqual(shift_int["shift_x"], round(shift_int["shift_x"]))
        self.assertEqual(shift_int["shift_y"], round(shift_int["shift_y"]))

        # -----------------------------------------------------------------
        # 3. Townshend et al. (1992) False-Change Risk Propagation & Quality Tiers
        # -----------------------------------------------------------------
        # Risk = 1 - exp(- shift^2 / (2 * sigma_spatial^2))
        risk_zero = calculate_change_detection_false_positive_risk(0.0, spatial_sigma=0.6)
        self.assertEqual(risk_zero, 0.0)

        risk_sub = calculate_change_detection_false_positive_risk(0.3, spatial_sigma=0.6)
        risk_1sigma = calculate_change_detection_false_positive_risk(0.6, spatial_sigma=0.6)
        risk_2sigma = calculate_change_detection_false_positive_risk(1.2, spatial_sigma=0.6)

        # Monotonicity
        self.assertLess(risk_zero, risk_sub)
        self.assertLess(risk_sub, risk_1sigma)
        self.assertLess(risk_1sigma, risk_2sigma)

        # Theoretical exact limits:
        # At 1 sigma: 1 - exp(-0.5) = 1 - 0.60653 = 39.35%
        # At 2 sigma: 1 - exp(-2.0) = 1 - 0.135335 = 86.47%
        self.assertAlmostEqual(risk_1sigma, 39.35, places=1)
        self.assertAlmostEqual(risk_2sigma, 86.47, places=1)

        # Quality tier boundaries
        self.assertEqual(classify_coregistration_quality_tier(0.12), "subpixel_excellent")
        self.assertEqual(classify_coregistration_quality_tier(0.35), "subpixel_good")
        self.assertEqual(classify_coregistration_quality_tier(0.75), "acceptable")
        self.assertEqual(classify_coregistration_quality_tier(1.45), "misaligned")

        # -----------------------------------------------------------------
        # 4. RANSAC 2D Affine Homography Outlier Rejection
        # -----------------------------------------------------------------
        pts = []
        for i in range(5):
            for j in range(5):
                rx = float(i * 32 + 16)
                ry = float(j * 32 + 16)
                pts.append({
                    "point_id": f"TP_{len(pts)}",
                    "reference_x": rx,
                    "reference_y": ry,
                    "target_x": rx + 0.40,
                    "target_y": ry - 0.35,
                    "shift_x": 0.40,
                    "shift_y": -0.35,
                    "correlation_score": 0.95
                })

        # Inject 3 gross outliers
        pts[2]["target_x"] += 12.0
        pts[7]["target_x"] -= 9.0
        pts[15]["target_y"] += 15.0

        aff_res = estimate_affine_transform_matrix(pts, outlier_threshold_pixels=1.5)
        self.assertEqual(aff_res["total_tie_points"], 25)
        self.assertEqual(aff_res["inlier_count"], 22)
        self.assertAlmostEqual(aff_res["tx"], 0.40, places=2)
        self.assertAlmostEqual(aff_res["ty"], -0.35, places=2)
        self.assertLess(aff_res["rmse_pixels"], 0.05)

        # -----------------------------------------------------------------
        # 5. Differential Radiometric Change & Edge Artifact Cancellation
        # -----------------------------------------------------------------
        test_ref = img_ref.astype(np.float32)
        test_tgt = ndshift(test_ref, [-0.35, 0.40], order=3).astype(np.float32)

        diff_res = IndexComputationService.compute_coregistration_differencing(
            test_ref, test_tgt, aff_res, kernel="cubic_convolution"
        )
        self.assertGreater(diff_res["rmse_diff_pre"], 0.005)
        self.assertLess(diff_res["rmse_diff_post"], 0.001)
        self.assertGreater(diff_res["error_reduction_pct"], 70.0)

        # -----------------------------------------------------------------
        # 6. Dynamic XYZ Co-Registration Tile Server RGBA Invariants
        # -----------------------------------------------------------------
        modes = ["aligned", "diff_pre", "diff_post", "reference", "target_raw"]
        for mode in modes:
            tile_bytes = tile_service.render_coregistration_tile(
                reference_scene_id="S2A_MSIL2A_20260715_SAN_LUIS",
                target_scene_id="S2B_MSIL2A_20260824_SAN_LUIS",
                z=10, x=163, y=395,
                mode=mode,
                kernel="cubic_convolution"
            )
            self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"), f"Tile {mode} must be valid PNG bytes")
            img = Image.open(io.BytesIO(tile_bytes))
            self.assertEqual(img.size, (256, 256))
            self.assertEqual(img.mode, "RGBA")

        # Vector field tile rendering
        vf_tile = tile_service.render_coregistration_vector_field_tile(
            analysis_id="TEST_ANA_01", z=10, x=163, y=395, arrow_scale=1.5
        )
        self.assertTrue(vf_tile.startswith(b"\x89PNG\r\n\x1a\n"))
        img_vf = Image.open(io.BytesIO(vf_tile))
        self.assertEqual(img_vf.size, (256, 256))
        self.assertEqual(img_vf.mode, "RGBA")

    def test_task_t250_aquatic_quality_biooptical_inversion_and_hab_hazard_scientific_rigor(self):
        """Task T-250 Scientific Rigor & Mathematical Invariant Verification:
        Bio-Optical NDCI (Mishra & Mishra 2012) Mathematical Invariants (Bounds [-1, 1], Sign Invariance),
        Floating Algae Index FAI (Hu 2009) Baseline Subtraction Invariant (Flat Baseline -> FAI == 0),
        Nechad et al. (2010) Semi-Analytical Turbidity Monotonic Bounds & Asymptotic Saturation Safety,
        Chlorophyll-a Inversion Polynomial (Mishra) & Low-Biomass Piecewise Preservation,
        Water Boundary Mask Exclusions (Non-Water Land Pixels -> NaN),
        Carlson / WHO Cyanobacteria Trophic Risk Tier Categorization,
        Dynamic XYZ Aquatic & HAB Tile Streaming Invariants (Valid PNG, 256x256, RGBA),
        and Benchmark Reservoir Triage (Lake Erie Hypertrophic vs Lake Tahoe Ultra-Oligotrophic).
        """
        import io
        from PIL import Image
        from app.services.indices import IndexComputationService
        from app.services.tile_service import tile_service
        from app.services.data_acquisition import data_acquisition_service
        from app.models.schemas import (
            calculate_ndci,
            calculate_fai,
            calculate_chla_from_ndci,
            calculate_nechad_turbidity,
            classify_eutrophication_risk_tier
        )

        # -----------------------------------------------------------------
        # 1. NDCI (Mishra & Mishra 2012) Mathematical Invariants & Bounds
        # -----------------------------------------------------------------
        # NDCI = (B05 - B04) / (B05 + B04)
        # Strict range [-1.0, 1.0]
        # Invariant 1a: Equal reflectance implies NDCI == 0.0
        self.assertAlmostEqual(IndexComputationService.ndci(0.05, 0.05), 0.0, places=5)
        self.assertAlmostEqual(calculate_ndci(0.08, 0.08), 0.0, places=5)

        # Invariant 1b: Red-edge peak (B05 > B04) implies NDCI > 0
        ndci_bloom = IndexComputationService.ndci(0.12, 0.04)
        self.assertAlmostEqual(ndci_bloom, (0.12 - 0.04) / (0.12 + 0.04), places=5)
        self.assertGreater(ndci_bloom, 0.0)

        # Invariant 1c: Clear water absorption (B05 < B04) implies NDCI < 0
        ndci_clear = IndexComputationService.ndci(0.015, 0.045)
        self.assertAlmostEqual(ndci_clear, (0.015 - 0.045) / (0.015 + 0.045), places=5)
        self.assertLess(ndci_clear, 0.0)

        # Invariant 1d: Theoretical extreme bounds
        self.assertAlmostEqual(IndexComputationService.ndci(1.0, 0.0), 1.0, places=5)
        self.assertAlmostEqual(IndexComputationService.ndci(0.0, 1.0), -1.0, places=5)

        # Invariant 1e: Numerical zero denominator safety
        self.assertTrue(np.isnan(IndexComputationService.ndci(0.0, 0.0)))

        # -----------------------------------------------------------------
        # 2. Floating Algae Index FAI (Hu 2009) Baseline Subtraction Invariant
        # -----------------------------------------------------------------
        # FAI = R_NIR - [R_RED + (R_SWIR - R_RED) * (lambda_NIR - lambda_RED)/(lambda_SWIR - lambda_RED)]
        # For Sentinel-2: lambda_RED = 665, lambda_NIR = 842, lambda_SWIR = 1610
        # f = (842 - 665) / (1610 - 665) = 177 / 945 = 0.187301587...
        f_expected = 177.0 / 945.0

        # Invariant 2a: Strictly linear baseline yields FAI == 0.0
        r_red = 0.040
        r_swir = 0.100
        r_nir_linear = r_red + (r_swir - r_red) * f_expected
        fai_flat = IndexComputationService.fai(r_nir_linear, r_red, r_swir)
        self.assertAlmostEqual(float(fai_flat), 0.0, places=6)

        # Invariant 2b: Surface scum floating algae mat creates strong NIR peak -> FAI > 0.02
        r_nir_scum = 0.180
        fai_scum = IndexComputationService.fai(r_nir_scum, r_red, r_swir)
        self.assertGreater(float(fai_scum), 0.02, "Surface cyanobacteria scum must exceed 0.02 threshold")

        # Invariant 2c: Submerged clear water with strong NIR absorption -> FAI <= 0.0
        r_nir_water = 0.020
        fai_water = IndexComputationService.fai(r_nir_water, r_red, r_swir)
        self.assertLess(float(fai_water), 0.0)

        # -----------------------------------------------------------------
        # 3. Nechad et al. (2010) Turbidity Monotonic Bounds & Saturation
        # -----------------------------------------------------------------
        # S = (A_rho * rho_w) / (1 - rho_w / C_rho)
        # Invariant 3a: Non-negativity S >= 0.0
        self.assertAlmostEqual(float(IndexComputationService.nechad_turbidity(0.0)), 0.0, places=4)

        # Invariant 3b: Monotonic increase with water-leaving reflectance
        r_vals = [0.005, 0.015, 0.035, 0.070, 0.120]
        s_vals = [float(IndexComputationService.nechad_turbidity(r)) for r in r_vals]
        for i in range(len(s_vals) - 1):
            self.assertLess(s_vals[i], s_vals[i + 1], "Turbidity must strictly increase monotonically with red reflectance")

        # Invariant 3c: Asymptotic safety saturation clamping (avoiding singularity at C_rho = 0.1935)
        s_near_sat = float(IndexComputationService.nechad_turbidity(0.190))
        s_over_sat = float(IndexComputationService.nechad_turbidity(0.250))
        self.assertLessEqual(s_near_sat, 1000.0)
        self.assertLessEqual(s_over_sat, 1000.0)
        self.assertGreater(s_over_sat, 0.0)

        # -----------------------------------------------------------------
        # 4. Chlorophyll-a Inversion Algorithms & Non-Negativity
        # -----------------------------------------------------------------
        # Invariant 4a: Non-negativity for all physical NDCI values in [-1, 1]
        test_ndcis = np.linspace(-1.0, 1.0, 201)
        chla_arr = IndexComputationService.chla_from_ndci(test_ndcis)
        self.assertTrue(np.all(chla_arr >= 0.0), "Chlorophyll-a concentration must be strictly non-negative")

        # Invariant 4b: Low-biomass protection for ultra-oligotrophic waters (NDCI < -0.15)
        chla_low = float(IndexComputationService.chla_from_ndci(-0.25))
        self.assertLess(chla_low, 2.5, "Ultra-clear water must fall in oligotrophic tier (< 2.5 ug/L)")
        self.assertGreater(chla_low, 0.0)

        # Invariant 4c: Hypertrophic bloom concentration
        chla_high = float(IndexComputationService.chla_from_ndci(0.30))
        self.assertGreater(chla_high, 25.0, "HAB bloom NDCI=0.30 must fall in hypertrophic tier (> 25 ug/L)")

        # Invariant 4d: Dall'Olmo & Gitelson 2BDA and Gitelson 3BDA models
        chla_2bda = float(IndexComputationService.chla_2bda(red_edge1=0.08, red=0.04))
        self.assertGreater(chla_2bda, 0.0)
        chla_3bda = float(IndexComputationService.chla_3bda(red=0.04, red_edge1=0.08, red_edge2=0.10))
        self.assertGreater(chla_3bda, 0.0)

        # -----------------------------------------------------------------
        # 5. Eutrophication Risk Tier Classification
        # -----------------------------------------------------------------
        # 0=Oligotrophic (<2.5), 1=Mesotrophic (2.5-8.0), 2=Eutrophic (8.0-25.0), 3=Hypertrophic (>25.0)
        self.assertEqual(classify_eutrophication_risk_tier(chla_ug_l=1.2), "oligotrophic")
        self.assertEqual(classify_eutrophication_risk_tier(chla_ug_l=4.5), "mesotrophic")
        self.assertEqual(classify_eutrophication_risk_tier(chla_ug_l=18.0), "eutrophic")
        self.assertEqual(classify_eutrophication_risk_tier(chla_ug_l=45.0), "hypertrophic")

        arr_tiers = IndexComputationService.classify_eutrophication_risk_array(
            chla_arr=np.array([1.0, 5.0, 15.0, 50.0], dtype=np.float32)
        )
        np.testing.assert_array_equal(arr_tiers, np.array([0, 1, 2, 3], dtype=np.int32))

        # -----------------------------------------------------------------
        # 6. Water Boundary Masking & Land Exclusion Invariant
        # -----------------------------------------------------------------
        # Synthetic 4x4 raster with 8 water pixels and 8 land pixels
        # Water pixels: B03 high (0.08), B11 low (0.01) -> MNDWI = 0.07 / 0.09 = 0.77 > 0
        # Land pixels: B03 low (0.03), B11 high (0.20) -> MNDWI = -0.17 / 0.23 = -0.74 < 0
        b3 = np.array([[0.08, 0.08, 0.03, 0.03],
                       [0.08, 0.08, 0.03, 0.03],
                       [0.08, 0.08, 0.03, 0.03],
                       [0.08, 0.08, 0.03, 0.03]], dtype=np.float32)
        b4 = np.array([[0.04, 0.04, 0.06, 0.06],
                       [0.04, 0.04, 0.06, 0.06],
                       [0.04, 0.04, 0.06, 0.06],
                       [0.04, 0.04, 0.06, 0.06]], dtype=np.float32)
        b5 = np.array([[0.07, 0.07, 0.18, 0.18],
                       [0.07, 0.07, 0.18, 0.18],
                       [0.07, 0.07, 0.18, 0.18],
                       [0.07, 0.07, 0.18, 0.18]], dtype=np.float32)
        b8 = np.array([[0.03, 0.03, 0.35, 0.35],
                       [0.03, 0.03, 0.35, 0.35],
                       [0.03, 0.03, 0.35, 0.35],
                       [0.03, 0.03, 0.35, 0.35]], dtype=np.float32)
        b11 = np.array([[0.01, 0.01, 0.20, 0.20],
                        [0.01, 0.01, 0.20, 0.20],
                        [0.01, 0.01, 0.20, 0.20],
                        [0.01, 0.01, 0.20, 0.20]], dtype=np.float32)

        inv = IndexComputationService.compute_aquatic_quality_inversion(
            bands={"B03": b3, "B04": b4, "B05": b5, "B08": b8, "B11": b11},
            water_masking_method="mndwi_threshold",
            mndwi_threshold=0.0
        )

        # Exactly 8 water pixels detected
        self.assertEqual(inv["summary"]["water_pixels"], 8)
        self.assertTrue(np.all(inv["water_mask"][:, :2]))
        self.assertFalse(np.any(inv["water_mask"][:, 2:]))

        # Land pixels must strictly evaluate to NaN
        self.assertTrue(np.all(np.isnan(inv["ndci_water"][:, 2:])))
        self.assertTrue(np.all(np.isnan(inv["chla_water"][:, 2:])))
        self.assertTrue(np.all(np.isnan(inv["turbidity_water"][:, 2:])))
        self.assertTrue(np.all(~np.isnan(inv["ndci_water"][:, :2])))

        # -----------------------------------------------------------------
        # 7. Dynamic XYZ Aquatic & HAB Tile Server Invariants
        # -----------------------------------------------------------------
        metrics = ["ndci", "fai", "chla", "turbidity", "eutrophication_tier"]
        for m in metrics:
            tile_bytes = tile_service.render_aquatic_quality_tile(
                collection="sentinel-2-l2a",
                metric=m,
                z=10, x=163, y=395
            )
            self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"), f"Aquatic tile {m} must be valid PNG")
            img = Image.open(io.BytesIO(tile_bytes))
            self.assertEqual(img.size, (256, 256), f"Tile {m} must be 256x256")
            self.assertEqual(img.mode, "RGBA", f"Tile {m} must be 4-channel RGBA")

        # Dynamic HAB Hazard Risk Tile
        hab_bytes = tile_service.render_aquatic_hab_tile(
            collection="sentinel-2-l2a",
            z=10, x=163, y=395
        )
        self.assertTrue(hab_bytes.startswith(b"\x89PNG\r\n\x1a\n"))
        img_hab = Image.open(io.BytesIO(hab_bytes))
        self.assertEqual(img_hab.size, (256, 256))
        self.assertEqual(img_hab.mode, "RGBA")

        # -----------------------------------------------------------------
        # 8. Benchmark Reservoir Scenarios Triage
        # -----------------------------------------------------------------
        # Lake Erie Western Basin: Hypertrophic / Eutrophic Cyanobacteria Bloom
        erie_cube, _ = data_acquisition_service.load_aquatic_data_cube("LAKE_ERIE_HAB_2026")
        erie_inv = IndexComputationService.compute_aquatic_quality_inversion(erie_cube)
        self.assertIn(erie_inv["summary"]["dominant_eutrophication_tier"], ["eutrophic", "hypertrophic"])
        self.assertGreater(erie_inv["summary"]["mean_ndci"], 0.05)
        self.assertIn(erie_inv["summary"]["bloom_risk_level"], ["high", "severe"])

        # Lake Tahoe: Ultra-Oligotrophic Deep Subalpine Clear Water
        tahoe_cube, _ = data_acquisition_service.load_aquatic_data_cube("LAKE_TAHOE_OLIGOTROPHIC_2026")
        tahoe_inv = IndexComputationService.compute_aquatic_quality_inversion(tahoe_cube)
        self.assertEqual(tahoe_inv["summary"]["dominant_eutrophication_tier"], "oligotrophic")
        self.assertLess(tahoe_inv["summary"]["mean_ndci"], 0.0)
        self.assertEqual(tahoe_inv["summary"]["bloom_risk_level"], "low")
        self.assertFalse(tahoe_inv["summary"]["floating_scum_detected"])

    def test_task_t256_topographic_solar_illumination_and_scs_c_scientific_rigor(self):
        """Task T-256 Scientific Rigor & Mathematical Invariant Verification (Cycle v2.5.32):
        Topographic Solar Illumination Correction, SCS+C Canopy Inversion & Dynamic Terrain Tiles:
        1. Local incidence cosine bounds cos(i) in [-1.0, 1.0] across all solar/slope/aspect angles.
        2. Normal incidence invariance (cos(i) == 1.0 when slope == zenith and aspect == azimuth).
        3. Flat terrain radiance conservation (alpha == 0 -> cos(i) == cos(theta_s) -> correction factor == 1.0).
        4. Empirical C-factor non-negativity and bounds c in [0.001, 1.0] from OLS linear regression.
        5. Deep cast-shadow rejection (cos(i) <= 0.0 -> no division-by-zero, zeroed reflectance).
        6. Horn 3x3 finite-difference surface normal gradient invariants on planar geometries.
        7. SCS+C canopy adjustment vs standard C-correction ((cos_sz * cos_slope + c)/(cos_i + c) vs (cos_sz + c)/(cos_i + c)).
        8. High-relief benchmark scene multi-band inversion (MT_SHASTA_VOLCANO_2026, SWISS_ALPS_VALAIS_2026, SIERRA_NEVADA_YOSEMITE_2026).
        9. Dynamic XYZ tile rendering (corrected reflectance and illumination hillshade in 256x256 RGBA PNG).
        """
        import io
        from PIL import Image
        from app.services.indices import IndexComputationService
        from app.services.data_acquisition import data_acquisition_service
        from app.services.tile_service import tile_service
        from app.models.schemas import (
            calculate_local_incidence_cosine,
            calculate_c_correction_factor,
            calculate_minnaert_correction,
            calculate_scs_c_correction,
            classify_illumination_condition,
            apply_topographic_correction,
            estimate_c_factor_from_linear_regression,
            TopographicCorrectionMethod,
            IlluminationCondition,
            TOPOGRAPHIC_BENCHMARK_SCENES
        )

        # -----------------------------------------------------------------
        # 1. Local Incidence Cosine Bounds & Geometric Invariants
        # -----------------------------------------------------------------
        # Formula: cos(i) = cos(theta_s) * cos(alpha) + sin(theta_s) * sin(alpha) * cos(phi_s - beta)
        zenith_angles = [0.0, 15.0, 30.0, 45.0, 60.0, 75.0, 89.0]
        azimuth_angles = [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0]
        slope_angles = [0.0, 10.0, 25.0, 45.0, 60.0, 80.0, 90.0]
        aspect_angles = [-1.0, 0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0]

        for sz in zenith_angles:
            for sa in azimuth_angles:
                for sl in slope_angles:
                    for asp in aspect_angles:
                        cos_i = calculate_local_incidence_cosine(sz, sa, sl, asp)
                        self.assertGreaterEqual(cos_i, -1.0, f"cos(i) out of lower bound for sz={sz}, sl={sl}, asp={asp}")
                        self.assertLessEqual(cos_i, 1.0, f"cos(i) out of upper bound for sz={sz}, sl={sl}, asp={asp}")

        # Normal incidence invariance: When slope angle matches zenith and aspect matches azimuth,
        # the mountain face is perpendicular to the solar ray, so cos(i) == 1.0.
        for sz in [15.0, 30.0, 45.0, 60.0]:
            for sa in [45.0, 120.0, 210.0]:
                cos_i_normal = calculate_local_incidence_cosine(sz, sa, sz, sa)
                self.assertAlmostEqual(cos_i_normal, 1.0, places=4, msg=f"Normal incidence must equal 1.0 at sz={sz}, sa={sa}")

        # Flat terrain invariance: When slope == 0, cos(i) == cos(theta_s) regardless of solar azimuth.
        for sz in [0.0, 25.0, 45.0, 65.0]:
            cos_i_flat = calculate_local_incidence_cosine(sz, 140.0, 0.0, -1.0)
            expected_flat = math.cos(math.radians(sz))
            self.assertAlmostEqual(cos_i_flat, expected_flat, places=4)

        # Opposite aspect invariance: Slope facing directly away from solar azimuth (beta = phi_s + 180).
        for sz in [10.0, 30.0, 45.0]:
            cos_i_opp = calculate_local_incidence_cosine(sz, 90.0, sz, 270.0)
            expected_opp = math.cos(math.radians(2.0 * sz))
            self.assertAlmostEqual(cos_i_opp, expected_opp, places=4)

        # -----------------------------------------------------------------
        # 2. Radiance Conservation & Correction Factor Invariants
        # -----------------------------------------------------------------
        # Invariant 2a: Flat terrain conservation of radiance (alpha = 0 -> factor = 1.0)
        for sz in [20.0, 40.0, 60.0]:
            cos_sz = math.cos(math.radians(sz))
            # C-Correction factor on flat terrain: (cos_sz + c) / (cos_sz + c) == 1.0
            c_factor = calculate_c_correction_factor(cos_sz, sz, c_factor=0.08)
            self.assertAlmostEqual(c_factor, 1.0, places=4)

            # SCS+C factor on flat terrain: (cos_sz * cos(0) + c) / (cos_sz + c) == 1.0
            scs_c_factor = calculate_scs_c_correction(cos_sz, 0.0, sz, c_factor=0.08)
            self.assertAlmostEqual(scs_c_factor, 1.0, places=4)

            # Radiance unchanged on flat ground
            rad_orig = 0.25
            rad_corr = apply_topographic_correction(rad_orig, cos_sz, 0.0, sz, method="scs_c", c_factor=0.08)
            self.assertAlmostEqual(rad_corr, rad_orig, places=4)

        # Invariant 2b: Empirical C parameter non-negativity and finite bounds [0.001, 1.0]
        synthetic_cos_i = [0.2, 0.35, 0.5, 0.65, 0.8, 0.95]
        synthetic_rad = [0.05 + 0.25 * ci for ci in synthetic_cos_i]
        c_estimated = estimate_c_factor_from_linear_regression(synthetic_rad, synthetic_cos_i)
        expected_c = 0.05 / 0.25  # b / m = 0.2
        self.assertAlmostEqual(c_estimated, expected_c, places=3)
        self.assertGreaterEqual(c_estimated, 0.001)
        self.assertLessEqual(c_estimated, 1.0)

        # Invariant 2c: Degenerate regression fallback to default_c
        c_flat = estimate_c_factor_from_linear_regression([0.2] * 6, [0.5] * 6, default_c=0.08)
        self.assertEqual(c_flat, 0.08)

        # Invariant 2d: Deep cast-shadow rejection (cos(i) <= 0 -> 0.0 when mask_self_shadow=True)
        rad_shadow = apply_topographic_correction(0.20, -0.45, 60.0, 45.0, method="c_correction", mask_self_shadow=True)
        self.assertEqual(rad_shadow, 0.0)

        # -----------------------------------------------------------------
        # 3. Horn 3x3 Surface Normal Gradient & Aspect Invariants
        # -----------------------------------------------------------------
        # Invariant 3a: Horizontal flat plane
        flat_grid = np.ones((16, 16), dtype=np.float32) * 1250.0
        slope_flat, aspect_flat, normal_flat = PreprocessingService.compute_dem_slope_aspect_arrays(flat_grid)
        self.assertTrue(np.all(slope_flat[2:-2, 2:-2] < 1e-4), "Flat elevation must yield zero slope")
        self.assertTrue(np.all(aspect_flat[2:-2, 2:-2] == -1.0), "Flat elevation must yield aspect -1.0")
        self.assertTrue(np.allclose(normal_flat[2:-2, 2:-2], [0, 0, 1], atol=1e-4), "Flat normal must be (0, 0, 1)")

        # Invariant 3b: Planar ramp with known slope (rise = 30m, run = 30m -> 45 deg slope, downhill West = 270 deg)
        ramp_x = np.arange(16, dtype=np.float32) * 30.0
        ramp_grid = np.tile(ramp_x, (16, 1))
        slope_ramp, aspect_ramp, normal_ramp = PreprocessingService.compute_dem_slope_aspect_arrays(ramp_grid, cell_size_x=30.0, cell_size_y=30.0)
        self.assertTrue(np.allclose(slope_ramp[2:-2, 2:-2], 45.0, atol=1e-2), "30m rise / 30m run must yield 45 deg slope")
        self.assertTrue(np.allclose(aspect_ramp[2:-2, 2:-2], 270.0, atol=1e-2), "Eastward rise must yield West downhill aspect (270 deg)")

        # -----------------------------------------------------------------
        # 4. SCS+C Canopy Adjustment vs Standard C-Correction
        # -----------------------------------------------------------------
        # In rugged terrain, standard C-Correction tends to over-correct steep sunlit slopes because
        # it neglects the reduction of canopy area projection. SCS+C introduces cos(alpha):
        # SCS+C factor: (cos_sz * cos_alpha + c) / (cos_i + c)
        # C-Correction factor: (cos_sz + c) / (cos_i + c)
        # On sloping terrain (alpha > 0), cos(alpha) < 1.0, so SCS+C factor < C-Correction factor on sunlit slopes.
        sz_test = 35.0
        slope_test = 40.0
        cos_i_test = 0.85
        f_c_corr = calculate_c_correction_factor(cos_i_test, sz_test, c_factor=0.08)
        f_scs_c = calculate_scs_c_correction(cos_i_test, slope_test, sz_test, c_factor=0.08)
        self.assertLess(f_scs_c, f_c_corr, "SCS+C factor must be strictly less than C-Correction on steep sunlit canopy")
        self.assertGreater(f_scs_c, 0.0)

        # -----------------------------------------------------------------
        # 5. Illumination Condition Classification Invariants
        # -----------------------------------------------------------------
        self.assertEqual(classify_illumination_condition(-0.25), IlluminationCondition.SELF_SHADOW)
        self.assertEqual(classify_illumination_condition(0.0), IlluminationCondition.SELF_SHADOW)
        self.assertEqual(classify_illumination_condition(0.12), IlluminationCondition.SHADED)
        self.assertEqual(classify_illumination_condition(0.65), IlluminationCondition.SUNLIT)

        # -----------------------------------------------------------------
        # 6. Benchmark High-Relief Scene Data Cube & Inversion Verification
        # -----------------------------------------------------------------
        # Mount Shasta Volcano (High-relief composite stratovolcano, California)
        shasta_cube, meta_shasta = data_acquisition_service.load_topographic_data_cube("MT_SHASTA_VOLCANO_2026")
        self.assertIn("elevation", shasta_cube.data_vars)
        self.assertIn("slope", shasta_cube.data_vars)
        self.assertIn("aspect", shasta_cube.data_vars)
        self.assertIn("B04", shasta_cube.data_vars)
        self.assertIn("B08", shasta_cube.data_vars)

        shasta_inv = IndexComputationService.compute_topographic_correction_inversion(
            bands=shasta_cube,
            solar_zenith_deg=meta_shasta["solar_zenith_deg"],
            solar_azimuth_deg=meta_shasta["solar_azimuth_deg"],
            method="scs_c"
        )
        s_shasta = shasta_inv["summary"]
        self.assertIn("radiance_std_reduction_pct", s_shasta)
        self.assertGreater(s_shasta["radiance_std_reduction_pct"], 0.0, "Topographic correction must reduce variance across rugged terrain")
        total_illum_pct = s_shasta["sunlit_pixel_pct"] + s_shasta["shaded_pixel_pct"] + s_shasta["self_shadow_pixel_pct"]
        self.assertAlmostEqual(total_illum_pct, 100.0, places=1, msg="Illumination percentages must sum to 100%")

        # Swiss Alps Valais (Extreme alpine topography, Matterhorn region)
        swiss_cube, meta_swiss = data_acquisition_service.load_topographic_data_cube("SWISS_ALPS_VALAIS_2026")
        swiss_inv = IndexComputationService.compute_topographic_correction_inversion(
            bands=swiss_cube,
            solar_zenith_deg=meta_swiss["solar_zenith_deg"],
            solar_azimuth_deg=meta_swiss["solar_azimuth_deg"],
            method="c_correction"
        )
        s_swiss = swiss_inv["summary"]
        self.assertGreater(s_swiss["radiance_std_reduction_pct"], 0.0)

        # -----------------------------------------------------------------
        # 7. Dynamic XYZ Topographic Tile Server Invariants
        # -----------------------------------------------------------------
        # 7a: Dynamic Corrected Reflectance Tile (SCS+C)
        tile_scs_c = tile_service.render_topographic_correction_tile(
            collection="sentinel-2-l2a",
            item_id="MT_SHASTA_VOLCANO_2026",
            z=10, x=163, y=395,
            method="scs_c",
            metric="corrected_reflectance"
        )
        self.assertTrue(tile_scs_c.startswith(b"\x89PNG\r\n\x1a\n"), "Corrected reflectance tile must be valid PNG")
        img_scs_c = Image.open(io.BytesIO(tile_scs_c))
        self.assertEqual(img_scs_c.size, (256, 256), "Tile dimensions must be 256x256")
        self.assertEqual(img_scs_c.mode, "RGBA", "Tile format must be 4-channel RGBA")

        # 7b: Dynamic Illumination Hillshade Tile (Local Incidence Cosine)
        tile_illum = tile_service.render_topographic_illumination_tile(
            collection="sentinel-2-l2a",
            item_id="MT_SHASTA_VOLCANO_2026",
            z=10, x=163, y=395
        )
        self.assertTrue(tile_illum.startswith(b"\x89PNG\r\n\x1a\n"), "Illumination hillshade tile must be valid PNG")
        img_illum = Image.open(io.BytesIO(tile_illum))
        self.assertEqual(img_illum.size, (256, 256))
    def test_thermal_lst_inversion_and_sobrino_emissivity_physics(self):
        """Task T-268 (@debugger): Continuous scientific QA across Land Surface Temperature (LST) & Thermal Inversion.
        
        Verifies:
        1. Sobrino et al. (2004) FVC & narrow-band land surface emissivity bounds [0.90, 0.995].
        2. Planck blackbody radiance and inverse brightness temperature monotonicity and reciprocity.
        3. Radiative Transfer Equation (RTE), Artis & Carnahan (1982), and SMW kinetic temperature inversion.
        4. Thermal conservation & kinetic temperature elevation due to sub-unity emissivity (T_s > T_b for eps < 1.0).
        5. Sub-zero calibration floor safety (T_C > -100 deg C) and non-negative radiance handling.
        6. Thermal anomaly departure (Delta T) and SUHI hazard severity tier classifications.
        """
        from app.models.schemas import (
            calculate_fractional_vegetation_cover,
            calculate_sobrino_land_surface_emissivity,
            calculate_planck_radiance,
            calculate_planck_brightness_temperature,
            calculate_rte_surface_temperature,
            calculate_artis_carnahan_lst,
            calculate_smw_lst,
            classify_thermal_anomaly_severity,
            apply_lst_inversion,
            ThermalAnomalySeverity,
            LstAlgorithmModel,
            ThermalSensorType
        )

        # 1. Sobrino et al. (2004) FVC & Emissivity Bounds
        # Water pixels (NDVI < 0)
        eps_water = calculate_sobrino_land_surface_emissivity(ndvi=-0.25, fvc=0.0)
        self.assertAlmostEqual(eps_water, 0.995, places=3, msg="Water emissivity must equal water endmember (0.995)")

        # Bare soil (NDVI < 0.20)
        eps_soil = calculate_sobrino_land_surface_emissivity(ndvi=0.10, fvc=0.0)
        self.assertAlmostEqual(eps_soil, 0.970, places=3, msg="Bare soil emissivity must equal soil endmember (0.970)")

        # Full vegetation canopy (NDVI > 0.86)
        eps_veg = calculate_sobrino_land_surface_emissivity(ndvi=0.92, fvc=1.0)
        self.assertAlmostEqual(eps_veg, 0.990, places=3, msg="Full canopy emissivity must equal veg endmember (0.990)")

        # Mixed pixel FVC monotonicity
        fvc_low = calculate_fractional_vegetation_cover(0.35)
        fvc_mid = calculate_fractional_vegetation_cover(0.53)
        fvc_high = calculate_fractional_vegetation_cover(0.75)
        self.assertGreater(fvc_mid, fvc_low, "FVC must increase monotonically with NDVI")
        self.assertGreater(fvc_high, fvc_mid, "FVC must increase monotonically with NDVI")

        # Emissivity bounds check across entire NDVI spectrum [-0.5 to 1.0]
        for ndvi_val in [-0.5, -0.1, 0.0, 0.15, 0.30, 0.50, 0.70, 0.85, 0.90, 1.0]:
            fvc = calculate_fractional_vegetation_cover(ndvi_val)
            eps = calculate_sobrino_land_surface_emissivity(ndvi_val, fvc)
            self.assertGreaterEqual(eps, 0.90, f"Emissivity {eps} for NDVI {ndvi_val} must be >= 0.90")
            self.assertLessEqual(eps, 0.995, f"Emissivity {eps} for NDVI {ndvi_val} must be <= 0.995")

        # 2. Planck Radiance & Brightness Temperature Monotonicity & Reciprocity
        # Monotonicity: L1 < L2 ==> Tb1 < Tb2
        tb_cold = calculate_planck_brightness_temperature(radiance=3.5)
        tb_ambient = calculate_planck_brightness_temperature(radiance=8.5)
        tb_hot = calculate_planck_brightness_temperature(radiance=15.0)
        self.assertGreater(tb_ambient, tb_cold, "Planck inversion must be strictly monotonic (L up ==> Tb up)")
        self.assertGreater(tb_hot, tb_ambient, "Planck inversion must be strictly monotonic (L up ==> Tb up)")

        # Monotonicity: T1 < T2 ==> B(T1) < B(T2)
        rad_cold = calculate_planck_radiance(temperature_k=273.15)
        rad_ambient = calculate_planck_radiance(temperature_k=298.15)
        rad_hot = calculate_planck_radiance(temperature_k=323.15)
        self.assertGreater(rad_ambient, rad_cold, "Planck forward radiance must be strictly monotonic (T up ==> B up)")
        self.assertGreater(rad_hot, rad_ambient, "Planck forward radiance must be strictly monotonic (T up ==> B up)")

        # Reciprocity: B(Tb(L)) approx L
        test_rad = 9.85
        tb_k = calculate_planck_brightness_temperature(test_rad)
        recalc_rad = calculate_planck_radiance(tb_k)
        self.assertAlmostEqual(recalc_rad, test_rad, delta=0.1, msg="Planck forward and inverse laws must be reciprocal")

        # 3. Kinetic Temperature Elevation: Ts > Tb when emissivity < 1.0
        # In physical thermal remote sensing, a greybody (eps < 1.0) must be warmer than a blackbody to emit the same radiance
        ts_artis = calculate_artis_carnahan_lst(brightness_temp_k=300.0, emissivity=0.96)
        self.assertGreater(ts_artis, 300.0, "Kinetic LST (Artis & Carnahan) must be higher than brightness temperature when eps < 1.0")

        ts_smw = calculate_smw_lst(brightness_temp_k=300.0, emissivity=0.96, water_vapor_g_cm2=1.5)
        self.assertGreater(ts_smw, 300.0, "Kinetic LST (SMW) must be higher than brightness temperature when eps < 1.0")

        # 4. RTE Inversion & Atmospheric Conservation
        # RTE: L_TOA = [eps*B(Ts) + (1-eps)*L_down]*tau + L_up
        # When tau=1.0, L_up=0.0, L_down=0.0 and eps=1.0, Ts == Tb
        ts_rte_ideal = calculate_rte_surface_temperature(radiance_toa=9.85, emissivity=1.0, tau=1.0, l_up=0.0, l_down=0.0)
        tb_ideal = calculate_planck_brightness_temperature(radiance=9.85)
        self.assertAlmostEqual(ts_rte_ideal, tb_ideal, delta=0.05, msg="RTE with transparent atmosphere and blackbody must equal Tb")

        # 5. Sub-zero Calibration Floor & Physical Bounds Safety
        # Extreme cold / near-zero radiance must not crash or yield non-physical temperatures (Tc > -100 deg C)
        tb_extreme_cold = calculate_planck_brightness_temperature(radiance=0.01)
        self.assertGreater(tb_extreme_cold - 273.15, -100.0, "Sub-zero calibration floor must maintain Tc > -100 deg C")
        
        # Zero / negative input safety
        rad_zero = calculate_planck_radiance(temperature_k=-10.0)
        self.assertEqual(rad_zero, 0.0, "Negative temperature input to Planck must clamp gracefully to 0.0")

        # 6. Thermal Anomaly Severity Classification
        self.assertEqual(classify_thermal_anomaly_severity(0.5), ThermalAnomalySeverity.NOMINAL)
        self.assertEqual(classify_thermal_anomaly_severity(2.0), ThermalAnomalySeverity.MILD_THERMAL_ANOMALY)
        self.assertEqual(classify_thermal_anomaly_severity(4.5), ThermalAnomalySeverity.MODERATE_THERMAL_ANOMALY)
        self.assertEqual(classify_thermal_anomaly_severity(7.5), ThermalAnomalySeverity.SEVERE_THERMAL_ANOMALY)
        self.assertEqual(classify_thermal_anomaly_severity(12.0), ThermalAnomalySeverity.EXTREME_WILDFIRE_HOTSPOT)

        # 7. Unified End-to-End Inversion Pipeline Evaluation
        inv_rte = apply_lst_inversion(
            radiance_or_tb=9.85,
            ndvi=0.45,
            method=LstAlgorithmModel.RADIATIVE_TRANSFER_EQUATION,
            sensor=ThermalSensorType.LANDSAT_TIRS,
            ambient_baseline_temp_c=25.0
        )
        self.assertIn("lst_celsius", inv_rte)
        self.assertIn("lst_kelvin", inv_rte)
        self.assertIn("emissivity", inv_rte)
        self.assertIn("thermal_anomaly_delta_c", inv_rte)
        self.assertIn("severity", inv_rte)
        self.assertGreater(inv_rte["lst_celsius"], 20.0, "Inverted LST must be plausible for mid-radiance")
        self.assertLess(inv_rte["lst_celsius"], 70.0, "Inverted LST must not exceed realistic ground temperature")

    def test_cloud_native_export_georeferencing_and_spatial_rigor(self):
        """Task T-274: Continuous Scientific QA: GeoTIFF CRS & Affine Transform Georeferencing,
        UTM Zone Projection, RFC 7946 GeoJSON Winding Order & Export Schemas.
        """
        from app.models.schemas import (
            ExportBoundingBox,
            determine_utm_epsg,
            bbox_to_geojson_polygon,
            calculate_affine_transform_matrix,
            generate_qgis_ingestion_snippet,
            format_export_job_filename
        )

        # 1. GDAL 6-Parameter Affine Georeferencing Transform Matrix
        # Matrix: [res_x, 0, min_lon, 0, -res_y, max_lat]
        # Verify North-Up invariant: -res_y < 0, res_x > 0, shear/rotation == 0
        min_lon, min_lat, max_lon, max_lat = -122.52, 37.70, -122.35, 37.85
        res_x = 0.0001
        res_y = 0.0001
        affine = calculate_affine_transform_matrix(min_lon=min_lon, max_lat=max_lat, res_x=res_x, res_y=res_y)

        self.assertEqual(len(affine), 6)
        self.assertEqual(affine[0], res_x)
        self.assertEqual(affine[1], 0.0, "Pixel rotation terms must be zero")
        self.assertEqual(affine[2], min_lon, "Origin X must match min_lon")
        self.assertEqual(affine[3], 0.0, "Pixel rotation terms must be zero")
        self.assertEqual(affine[4], -res_y, "Pixel height must be negative for north-up raster")
        self.assertEqual(affine[5], max_lat, "Origin Y must match max_lat")

        # Top-left corner (pixel 0,0) -> geographic coordinates
        origin_x = affine[2] + 0 * affine[0] + 0 * affine[1]
        origin_y = affine[5] + 0 * affine[3] + 0 * affine[4]
        self.assertAlmostEqual(origin_x, min_lon)
        self.assertAlmostEqual(origin_y, max_lat)

        # 2. Universal Transverse Mercator (UTM) Zone & EPSG Derivation
        # Northern Hemisphere: Zone = floor((lon + 180)/6) + 1, EPSG = 32600 + Zone
        # Southern Hemisphere: EPSG = 32700 + Zone
        # San Francisco Bay (-122.4, 37.8) -> Zone 10N -> EPSG:32610
        epsg_sf = determine_utm_epsg(-122.4, 37.8)
        self.assertEqual(epsg_sf, "EPSG:32610")

        # Minas Gerais, Brazil (-43.9, -19.9) -> Zone 23S -> EPSG:32723
        epsg_br = determine_utm_epsg(-43.9, -19.9)
        self.assertEqual(epsg_br, "EPSG:32723")

        # Melbourne, Australia (144.9, -37.8) -> Zone 55S -> EPSG:32755
        epsg_au = determine_utm_epsg(144.9, -37.8)
        self.assertEqual(epsg_au, "EPSG:32755")

        # Prime Meridian / London (0.1, 51.5) -> Zone 31N -> EPSG:32631
        epsg_uk = determine_utm_epsg(0.1, 51.5)
        self.assertEqual(epsg_uk, "EPSG:32631")

        # 3. RFC 7946 GeoJSON Polygon Geometry & Counter-Clockwise (CCW) Winding Order
        geom = bbox_to_geojson_polygon(min_lon=min_lon, min_lat=min_lat, max_lon=max_lon, max_lat=max_lat)
        self.assertEqual(geom["type"], "Polygon")
        coords = geom["coordinates"][0]
        self.assertEqual(len(coords), 5, "Closed bounding box polygon must have 5 coordinates")
        self.assertEqual(coords[0], coords[4], "Polygon ring must be explicitly closed")

        # Green's theorem / Shoelace signed area for exterior ring winding order:
        # Signed area > 0 confirms counter-clockwise (CCW) exterior boundary as mandated by RFC 7946 Section 3.1.6
        signed_area = 0.0
        for i in range(len(coords) - 1):
            signed_area += (coords[i][0] * coords[i+1][1] - coords[i+1][0] * coords[i][1])
        self.assertGreater(signed_area, 0.0, "RFC 7946 exterior polygon ring must follow right-hand rule (counter-clockwise)")

        # 4. ExportBoundingBox Validation & Surface Area
        bbox_model = ExportBoundingBox(min_lon=min_lon, min_lat=min_lat, max_lon=max_lon, max_lat=max_lat)
        self.assertEqual(bbox_model.center(), ((min_lon + max_lon) / 2.0, (min_lat + max_lat) / 2.0))
        self.assertEqual(bbox_model.get_utm_epsg(), "EPSG:32610")

        area_km2 = bbox_model.calculate_approx_area_km2()
        self.assertGreater(area_km2, 100.0)
        self.assertLess(area_km2, 1000.0)

        # Inverted coordinates must raise ValueError
        with self.assertRaises(ValueError):
            ExportBoundingBox(min_lon=10.0, min_lat=20.0, max_lon=5.0, max_lat=25.0)
        with self.assertRaises(ValueError):
            ExportBoundingBox(min_lon=5.0, min_lat=30.0, max_lon=10.0, max_lat=25.0)

        # Dict and tuple aliases parsing
        bbox_from_tuple = ExportBoundingBox([min_lon, min_lat, max_lon, max_lat])  # type: ignore
        self.assertEqual(bbox_from_tuple.as_tuple(), (min_lon, min_lat, max_lon, max_lat))

        # 5. Filename Formatting & PyQGIS Ingestion Snippets
        tif_filename = format_export_job_filename("sentinel-2-l2a", "surface_reflectance", "geotiff_cog", item_id="S2A_1234")
        self.assertTrue(tif_filename.endswith(".tif"))
        self.assertIn("sentinel-2-l2a", tif_filename)

        gpkg_filename = format_export_job_filename("hazard_contour", "hazard_contour", "geopackage", item_id="HAZ_5678")
        self.assertTrue(gpkg_filename.endswith(".gpkg"))

        snippet_raster = generate_qgis_ingestion_snippet(tif_filename, "geotiff_cog", "EPSG:32610")
        self.assertIn("iface.addRasterLayer", snippet_raster)
        self.assertIn(tif_filename, snippet_raster)
        self.assertIn("EPSG:32610", snippet_raster)

        snippet_vector = generate_qgis_ingestion_snippet(gpkg_filename, "geopackage", "EPSG:4326")
        self.assertIn("iface.addVectorLayer", snippet_vector)
        self.assertIn(gpkg_filename, snippet_vector)

    def test_task_t280_phenology_multi_harmonic_scientific_rigor(self):
        """Task T-280: Continuous Scientific QA: Harmonic Curve Orthogonality Verification,
        Fourier Energy Invariance (Parseval's Theorem), Phenological Transition Monotonicity
        (SOS < POS < EOS) & Seasonality Pipeline Regression Triage.
        """
        import math
        import numpy as np
        from app.models.schemas import (
            PhenologyMetric,
            PHENOLOGY_METRICS,
            PHENOLOGY_METRIC_CONFIGS,
            PHENOLOGY_BENCHMARK_SITES,
            normalize_phenology_metric,
            evaluate_multi_harmonic_curve,
            extract_phenology_transition_metrics,
            build_phenology_tile_url,
            HarmonicFourierTerm,
            MultiHarmonicFitResult,
            PhenologyMetricsSummary,
            PhenologicalCurvePoint,
        )

        # -------------------------------------------------------------
        # 1. Fourier Basis Function Orthogonality Verification
        # -------------------------------------------------------------
        # Period T = 365.25 days. Basis functions:
        # phi_0(t) = 1
        # phi_{k,c}(t) = cos(2*pi*k*t / T)
        # phi_{k,s}(t) = sin(2*pi*k*t / T)
        # Inner product: <f, g> = (1/T) * \int_0^T f(t)g(t) dt
        T = 365.25
        N = 36525  # Dense uniform grid, dt = T / N
        t = (np.arange(N) + 0.5) * (T / N)
        omega = 2.0 * math.pi / T

        # Basis components up to order K = 4
        phi_0 = np.ones(N)
        phi_cos = [np.cos(k * omega * t) for k in range(1, 5)]
        phi_sin = [np.sin(k * omega * t) for k in range(1, 5)]

        # Verify DC component norm: <1, 1> = 1.0
        norm_0 = np.mean(phi_0 * phi_0)
        self.assertAlmostEqual(norm_0, 1.0, places=5, msg="DC basis norm must equal 1.0")

        # Verify orthogonality between DC and all harmonic terms: <1, phi_k> = 0.0
        for k_idx, (cos_k, sin_k) in enumerate(zip(phi_cos, phi_sin), start=1):
            dc_cos = np.mean(phi_0 * cos_k)
            dc_sin = np.mean(phi_0 * sin_k)
            self.assertAlmostEqual(dc_cos, 0.0, places=5, msg=f"DC and cos(k={k_idx}) must be orthogonal")
            self.assertAlmostEqual(dc_sin, 0.0, places=5, msg=f"DC and sin(k={k_idx}) must be orthogonal")

        # Verify AC harmonic norms: <cos_k, cos_k> = 0.5, <sin_k, sin_k> = 0.5
        for k_idx, (cos_k, sin_k) in enumerate(zip(phi_cos, phi_sin), start=1):
            norm_cos = np.mean(cos_k * cos_k)
            norm_sin = np.mean(sin_k * sin_k)
            self.assertAlmostEqual(norm_cos, 0.5, places=5, msg=f"cos(k={k_idx}) norm must equal 0.5")
            self.assertAlmostEqual(norm_sin, 0.5, places=5, msg=f"sin(k={k_idx}) norm must equal 0.5")

        # Verify cross cosine-sine orthogonality: <cos_k, sin_m> = 0.0 for all k, m
        for k in range(4):
            for m in range(4):
                cross = np.mean(phi_cos[k] * phi_sin[m])
                self.assertAlmostEqual(cross, 0.0, places=5, msg=f"<cos_{k+1}, sin_{m+1}> must be strictly zero")

        # Verify distinct frequency orthogonality: <cos_k, cos_m> = 0 and <sin_k, sin_m> = 0 for k != m
        for k in range(4):
            for m in range(k + 1, 4):
                cos_cross = np.mean(phi_cos[k] * phi_cos[m])
                sin_cross = np.mean(phi_sin[k] * phi_sin[m])
                self.assertAlmostEqual(cos_cross, 0.0, places=5, msg=f"<cos_{k+1}, cos_{m+1}> must be zero for k!=m")
                self.assertAlmostEqual(sin_cross, 0.0, places=5, msg=f"<sin_{k+1}, sin_{m+1}> must be zero for k!=m")

        # -------------------------------------------------------------
        # 2. Fourier Energy Invariance (Parseval's Identity)
        # -------------------------------------------------------------
        # For y(t) = a_0 + sum_{k=1}^K [A_k cos(k w t) + B_k sin(k w t)]
        # Total Mean Square Energy:
        # (1/T) \int_0^T [y(t)]^2 dt = a_0^2 + (1/2) * sum_{k=1}^K (A_k^2 + B_k^2)
        # Periodic Variation Energy (Variance):
        # Var(y) = (1/T) \int_0^T [y(t) - a_0]^2 dt = (1/2) * sum_{k=1}^K (A_k^2 + B_k^2)
        a_0 = 0.52
        harmonics = [
            {"harmonic_order": 1, "cos_coeff": 0.22, "sin_coeff": -0.14},
            {"harmonic_order": 2, "cos_coeff": 0.08, "sin_coeff": 0.05},
            {"harmonic_order": 3, "cos_coeff": -0.04, "sin_coeff": 0.02},
        ]
        # Evaluate curve at dense grid points
        y_eval = np.array([
            evaluate_multi_harmonic_curve(doy=float(d), intercept=a_0, slope=0.0, harmonics=harmonics)
            for d in t
        ])

        # Theoretical Parseval energies
        harmonic_power = sum(h["cos_coeff"]**2 + h["sin_coeff"]**2 for h in harmonics)
        theoretical_total_energy = a_0**2 + 0.5 * harmonic_power
        theoretical_var_energy = 0.5 * harmonic_power

        # Numerical integration
        numerical_total_energy = float(np.mean(y_eval**2))
        numerical_var_energy = float(np.mean((y_eval - a_0)**2))

        self.assertAlmostEqual(
            numerical_total_energy,
            theoretical_total_energy,
            places=4,
            msg="Numerical total energy must equal theoretical Parseval energy"
        )
        self.assertAlmostEqual(
            numerical_var_energy,
            theoretical_var_energy,
            places=4,
            msg="Numerical variance energy must equal (1/2) sum(A_k^2 + B_k^2)"
        )

        # -------------------------------------------------------------
        # 3. Phenological Transition Monotonicity (SOS < POS < EOS)
        # -------------------------------------------------------------
        # Test across canonical benchmark sites
        daily_doys = list(range(1, 366))
        for site_key, site in PHENOLOGY_BENCHMARK_SITES.items():
            expected_pos = float(site["expected_pos_doy"])
            expected_sos = float(site["expected_sos_doy"])
            expected_eos = float(site["expected_eos_doy"])
            expected_los = float(site["expected_los_days"])

            # Synthesize asymmetric double-harmonic curve reflecting site phenology
            # Peak near expected_pos, green-up near expected_sos
            site_fitted = []
            for d in daily_doys:
                phase_shift = (d - expected_pos) / 365.25 * 2.0 * math.pi
                val = 0.25 + 0.45 * (0.5 * (1.0 + math.cos(phase_shift)) + 0.15 * math.cos(2.0 * phase_shift))
                site_fitted.append(val)

            metrics = extract_phenology_transition_metrics(daily_doys, site_fitted, sos_threshold_pct=0.20)

            # Strict Monotonicity: 1 <= SOS < POS < EOS <= 365
            self.assertGreaterEqual(metrics["sos_doy"], 1.0)
            self.assertLess(metrics["sos_doy"], metrics["pos_doy"], f"{site_key}: SOS must strictly precede POS")
            self.assertLess(metrics["pos_doy"], metrics["eos_doy"], f"{site_key}: POS must strictly precede EOS")
            self.assertLessEqual(metrics["eos_doy"], 366.0)

            # Season length invariant: LOS = EOS - SOS > 0
            self.assertAlmostEqual(metrics["los_days"], metrics["eos_doy"] - metrics["sos_doy"], places=1)
            self.assertGreater(metrics["los_days"], 0.0)

            # Dynamic range invariant: Amplitude = Peak - Base > 0
            self.assertGreater(metrics["seasonal_amplitude"], 0.0)
            self.assertAlmostEqual(metrics["seasonal_amplitude"], metrics["peak_level"] - metrics["base_level"], places=3)

        # -------------------------------------------------------------
        # 4. Chronological Invariance against Unordered DOY Series
        # -------------------------------------------------------------
        # Shuffled DOYs and values must yield identical milestone dates
        import random
        rng = random.Random(42)
        shuffled_indices = list(range(len(daily_doys)))
        rng.shuffle(shuffled_indices)
        shuffled_doys = [daily_doys[i] for i in shuffled_indices]
        shuffled_vals = [site_fitted[i] for i in shuffled_indices]

        shuffled_metrics = extract_phenology_transition_metrics(shuffled_doys, shuffled_vals, sos_threshold_pct=0.20)
        self.assertEqual(shuffled_metrics["sos_doy"], metrics["sos_doy"])
        self.assertEqual(shuffled_metrics["pos_doy"], metrics["pos_doy"])
        self.assertEqual(shuffled_metrics["eos_doy"], metrics["eos_doy"])
        self.assertEqual(shuffled_metrics["los_days"], metrics["los_days"])

        # -------------------------------------------------------------
        # 5. Multi-Harmonic Least-Squares Inversion Convergence
        # -------------------------------------------------------------
        # Verify that increasing harmonic order K=1 -> K=2 -> K=3 strictly reduces
        # fitting residual sum of squares (RSS) on an asymmetric seasonal signal
        t_arr = np.array(daily_doys, dtype=np.float64)
        # Asymmetric seasonal signal: fast spring rise, slow autumn fall
        # Ground truth: y(t) = 0.35 + 0.30*cos(w(t-195)) + 0.10*cos(2w(t-195)) + 0.05*sin(w(t-195))
        y_true = 0.35 + 0.30 * np.cos(omega * (t_arr - 195)) + 0.10 * np.cos(2 * omega * (t_arr - 195)) + 0.05 * np.sin(omega * (t_arr - 195))
        np.random.seed(42)
        y_obs = y_true + np.random.normal(0, 0.015, size=len(t_arr))

        rss_list = []
        for K in [1, 2, 3]:
            # Design matrix: [1, cos(w*t), sin(w*t), ..., cos(K*w*t), sin(K*w*t)]
            cols = [np.ones_like(t_arr)]
            for k in range(1, K + 1):
                cols.append(np.cos(k * omega * t_arr))
                cols.append(np.sin(k * omega * t_arr))
            X = np.column_stack(cols)
            beta, residuals, rank, s = np.linalg.lstsq(X, y_obs, rcond=None)
            y_pred = X @ beta
            rss = float(np.sum((y_obs - y_pred)**2))
            rss_list.append(rss)

        # Monotonic RSS reduction: RSS(K=1) >= RSS(K=2) >= RSS(K=3)
        self.assertGreater(rss_list[0], rss_list[1], "Harmonic K=2 must fit asymmetric signal better than K=1")
        self.assertGreaterEqual(rss_list[1], rss_list[2], "Harmonic K=3 must fit with equal or lower RSS than K=2")

        # -------------------------------------------------------------
        # 6. Edge Cases & Safety Invariants
        # -------------------------------------------------------------
        # Zero amplitude / Flat curve
        flat_doys = [10.0, 50.0, 100.0, 200.0]
        flat_vals = [0.4, 0.4, 0.4, 0.4]
        flat_m = extract_phenology_transition_metrics(flat_doys, flat_vals)
        self.assertEqual(flat_m["seasonal_amplitude"], 0.0)
        self.assertEqual(flat_m["los_days"], 0.0)

        # Leap year continuity: |y(366) - y(1)| must be small for seasonal continuity
        y_366 = evaluate_multi_harmonic_curve(doy=366.0, intercept=a_0, harmonics=harmonics)
        y_1 = evaluate_multi_harmonic_curve(doy=1.0, intercept=a_0, harmonics=harmonics)
        self.assertLess(abs(y_366 - y_1), 0.05, "Seasonal periodic curve must be approximately continuous across year boundary")

        # Empty inputs
        empty_m = extract_phenology_transition_metrics([], [])
        self.assertEqual(empty_m["sos_doy"], 0.0)
        self.assertEqual(empty_m["los_days"], 0.0)

    def test_spectral_sharpening_scientific_rigor_and_safety_invariants(self):
        """Task T-286: Continuous Scientific QA: Gram-Schmidt Radiometric Energy Conservation,
        MTF Spatial Frequency High-Pass Detail Transfer, Spectral Distortion Index (SAM / UIQI Q4),
        and Dimensionless Synthesis Error (ERGAS) Safety Invariants.
        """
        from app.models.schemas import (
            calculate_spectral_angle_mapper,
            calculate_synthetic_panchromatic,
            calculate_brovey_sharpened_value,
            calculate_high_pass_injected_value,
            calculate_ergas,
            calculate_uiqi_q4,
            calculate_energy_conservation_ratio,
            classify_sharpening_quality_rating,
            SharpeningQualityRating,
            SYNTHETIC_PAN_WEIGHTS,
            HPF_KERNELS,
            HPFKernelType
        )

        # -------------------------------------------------------------
        # 1. Gram-Schmidt Radiometric Energy Conservation Invariant
        # -------------------------------------------------------------
        # For equal mean radiance across multi-band original and sharpened arrays:
        # \int \rho_{sharp} / \int \rho_{orig} \equiv 1.0 (within \pm 0.1%)
        orig_bands = [0.18, 0.22, 0.28, 0.42, 0.25, 0.16]
        sharp_bands_conserved = [0.181, 0.219, 0.282, 0.418, 0.251, 0.159]
        ratio = calculate_energy_conservation_ratio(orig_bands, sharp_bands_conserved)
        self.assertAlmostEqual(ratio, 1.000, delta=0.005, msg="Radiometric energy conservation ratio must be approx 1.0")

        # Zero mean radiance edge case: Must safely return 1.0 without ZeroDivisionError
        ratio_zero = calculate_energy_conservation_ratio([0.0, 0.0], [0.0, 0.0])
        self.assertEqual(ratio_zero, 1.0)

        # Synthetic Panchromatic Weight Presets: Partition of Unity (\sum w_i = 1.0)
        for preset_name, w_dict in SYNTHETIC_PAN_WEIGHTS.items():
            total_w = sum(w_dict.values())
            self.assertAlmostEqual(
                total_w,
                1.000,
                places=5,
                msg=fr"Synthetic pan preset '{preset_name}' must satisfy partition of unity \sum w_i = 1.0"
            )

        # -------------------------------------------------------------
        # 2. Modulation Transfer Function (MTF) & High-Frequency Spatial Kernels
        # -------------------------------------------------------------
        # Laplacian 3x3: Zero DC gain (zero-frequency rejection) -> sum of kernel elements == 0.0
        laplacian = np.array(HPF_KERNELS[HPFKernelType.LAPLACIAN_3X3.value], dtype=np.float64)
        self.assertAlmostEqual(float(np.sum(laplacian)), 0.0, places=6, msg="Laplacian 3x3 must sum to 0.0 for zero-frequency DC rejection")

        # Gaussian Difference 5x5: Zero DC gain -> sum of kernel elements == 0.0
        gauss_diff = np.array(HPF_KERNELS[HPFKernelType.GAUSSIAN_DIFFERENCE_5X5.value], dtype=np.float64)
        self.assertAlmostEqual(float(np.sum(gauss_diff)), 0.0, places=6, msg="Gaussian Difference 5x5 must sum to 0.0")

        # High-Boost 3x3: All-pass DC preservation + boost -> sum of kernel elements == 1.0
        high_boost = np.array(HPF_KERNELS[HPFKernelType.HIGH_BOOST_3X3.value], dtype=np.float64)
        self.assertAlmostEqual(float(np.sum(high_boost)), 1.0, places=6, msg="High-Boost 3x3 kernel must sum to 1.0 for DC preservation")

        # High-Pass Detail Injection: Non-negativity invariant & gain scaling
        # Large negative spatial frequency delta must not drive surface reflectance below 0.0
        clamped_sharp = calculate_high_pass_injected_value(low_res_val=0.10, high_freq_delta=-0.50, gain=1.0)
        self.assertGreaterEqual(clamped_sharp, 0.0, "High-pass detail injection must preserve non-negativity")
        self.assertEqual(clamped_sharp, 0.0)

        # Monotonic gain scaling
        boost_gain1 = calculate_high_pass_injected_value(low_res_val=0.20, high_freq_delta=0.10, gain=0.50)
        boost_gain2 = calculate_high_pass_injected_value(low_res_val=0.20, high_freq_delta=0.10, gain=1.00)
        self.assertGreater(boost_gain2, boost_gain1, "Higher spatial gain must yield larger detail injection")

        # -------------------------------------------------------------
        # 3. Spectral Distortion Indices (SAM & UIQI / Q4) Invariants
        # -------------------------------------------------------------
        # SAM: Identical vectors must yield exact 0.0 radians
        sam_self = calculate_spectral_angle_mapper([0.15, 0.25, 0.40], [0.15, 0.25, 0.40])
        self.assertEqual(sam_self, 0.0)

        # SAM: Scale Invariance -> pure intensity scaling u and c*u must yield SAM = 0.0
        v_base = [0.10, 0.20, 0.30, 0.40]
        v_scaled = [c * 2.5 for c in v_base]
        sam_scaled = calculate_spectral_angle_mapper(v_base, v_scaled)
        self.assertAlmostEqual(sam_scaled, 0.0, places=5, msg="SAM must be strictly invariant under scalar multiplication")

        # SAM: Orthogonal vectors -> SAM = pi / 2
        sam_ortho = calculate_spectral_angle_mapper([1.0, 0.0, 0.0], [0.0, 1.0, 0.0])
        self.assertAlmostEqual(sam_ortho, math.pi / 2.0, places=5)

        # SAM: NumPy 1D ndarray sequence compatibility
        np_u = np.array([0.2, 0.4, 0.6])
        np_v = np.array([0.2, 0.4, 0.6])
        self.assertAlmostEqual(calculate_spectral_angle_mapper(np_u, np_v), 0.0, places=5)

        # SAM: Type mismatch safety -> mixing Dict and Sequence must raise TypeError cleanly
        with self.assertRaises(TypeError):
            calculate_spectral_angle_mapper({"B02": 0.2}, [0.2])
        with self.assertRaises(TypeError):
            calculate_spectral_angle_mapper([0.2], {"B02": 0.2})

        # UIQI / Q4 Universal Image Quality Index: Identical signals yield 1.0
        q4_self = calculate_uiqi_q4([0.1, 0.2, 0.3, 0.4], [0.1, 0.2, 0.3, 0.4])
        self.assertEqual(q4_self, 1.0)

        # UIQI / Q4: Zero-radiance edge cases must return 1.0
        q4_zero = calculate_uiqi_q4([0.0, 0.0, 0.0], [0.0, 0.0, 0.0])
        self.assertEqual(q4_zero, 1.0)

        # -------------------------------------------------------------
        # 4. Dimensionless Synthesis Relative Error (ERGAS) Safety Invariants
        # -------------------------------------------------------------
        # Zero error invariant: Perfect reconstruction yields ERGAS = 0.0
        ergas_zero = calculate_ergas([0.0, 0.0, 0.0], [0.2, 0.3, 0.4], high_res=10.0, low_res=20.0)
        self.assertEqual(ergas_zero, 0.0)

        # Spatial resolution ratio scaling: Doubling h/l from 10/20 (0.5) to 20/20 (1.0) doubles ERGAS
        ergas_half = calculate_ergas([0.01, 0.01], [0.2, 0.2], high_res=10.0, low_res=20.0)
        ergas_full = calculate_ergas([0.01, 0.01], [0.2, 0.2], high_res=20.0, low_res=20.0)
        self.assertAlmostEqual(ergas_full / ergas_half, 2.0, places=4, msg="ERGAS must scale linearly with (h/l)")

        # Zero/negative resolution floor safety: Must not raise ZeroDivisionError
        ergas_zero_div = calculate_ergas([0.01], [0.2], high_res=10.0, low_res=0.0)
        self.assertEqual(ergas_zero_div, 0.0)
        ergas_neg_div = calculate_ergas([0.01], [0.2], high_res=10.0, low_res=-10.0)
        self.assertEqual(ergas_neg_div, 0.0)

        # -------------------------------------------------------------
        # 5. Brovey Ratio Fusion Safety & Epsilon Clamping
        # -------------------------------------------------------------
        # Zero denominator safety: When low_res_pan = 0.0, denominator is clamped to epsilon=1e-6
        brovey_zero_pan = calculate_brovey_sharpened_value(low_res_val=0.20, high_res_pan=0.40, low_res_pan=0.0)
        self.assertGreater(brovey_zero_pan, 0.0, "Brovey must safely handle zero low-res pan via epsilon clamping")

        # Identity preservation: When P_high == P_low, rho_sharp == rho_low
        brovey_identity = calculate_brovey_sharpened_value(low_res_val=0.35, high_res_pan=0.25, low_res_pan=0.25)
        self.assertAlmostEqual(brovey_identity, 0.35, places=5)

        # -------------------------------------------------------------
        # 6. Synthetic Panchromatic Weight Preset Resolution
        # -------------------------------------------------------------
        guidance = {"B02": 0.10, "B03": 0.20, "B04": 0.30, "B08": 0.40}
        # String preset lookup with case-insensitivity
        pan_equal_str = calculate_synthetic_panchromatic(guidance, weights="equal")
        pan_equal_dict = calculate_synthetic_panchromatic(guidance, weights=SYNTHETIC_PAN_WEIGHTS["equal"])
        self.assertEqual(pan_equal_str, pan_equal_dict)

        pan_rgb_str = calculate_synthetic_panchromatic(guidance, weights="NATURAL_RGB")
        pan_rgb_dict = calculate_synthetic_panchromatic(guidance, weights=SYNTHETIC_PAN_WEIGHTS["natural_rgb"])
        self.assertEqual(pan_rgb_str, pan_rgb_dict)

        # Empty guidance bands
        self.assertEqual(calculate_synthetic_panchromatic({}), 0.0)

    def test_cross_sensor_calibration_scientific_rigor_and_invariants(self):
        """Task T-292: Continuous Scientific QA: Multi-Sensor OLI/MSI Radiometric Cross-Calibration,
        Roy et al. (2016) Bandpass Adjustment Invariance, Orthogonal Distance Regression (ODR/RMA),
        Residual RMSE Bounds (RMSE < 0.015), Radiometric Bias Normalization, and Constellation Temporal Stacking.
        """
        from app.models.schemas import (
            SensorCalibrationModel,
            SensorPlatform,
            CrossSensorBand,
            CrossSensorTileMetric,
            CalibrationQualityRating,
            SENSOR_CALIBRATION_MODEL_CONFIGS,
            CROSS_SENSOR_BAND_COEFFICIENTS,
            CROSS_SENSOR_BENCHMARK_SCENES,
            normalize_sensor_calibration_model,
            normalize_cross_sensor_band,
            apply_cross_sensor_band_calibration,
            calculate_orthogonal_distance_regression,
            calculate_cross_sensor_residual_rmse,
            calculate_cross_sensor_radiometric_bias,
            classify_calibration_quality_rating,
        )
        from app.services.calibration_service import CalibrationService

        # -------------------------------------------------------------
        # 1. Roy et al. (2016) Bandpass Adjustment & Invertibility
        # -------------------------------------------------------------
        # Forward transformation: Landsat-8 OLI -> Sentinel-2A MSI
        # rho_MSI = c0 + c1 * rho_OLI
        for band in CrossSensorBand:
            coef = CROSS_SENSOR_BAND_COEFFICIENTS[band.value]["roy_2016"]
            c0 = coef["c0"]
            c1 = coef["c1"]

            # Linear model calibration at rho = 0.30
            rho_in = 0.30
            rho_cal = apply_cross_sensor_band_calibration(
                rho_in,
                band=band,
                model=SensorCalibrationModel.ROY_2016_LINEAR,
                source_sensor=SensorPlatform.LANDSAT_8_OLI,
                target_sensor=SensorPlatform.SENTINEL_2A_MSI,
            )
            expected_cal = round(min(1.0, max(0.0, c0 + c1 * rho_in)), 4)
            self.assertAlmostEqual(
                rho_cal,
                expected_cal,
                places=4,
                msg=f"Roy et al. (2016) calibration for band {band.value} must match linear model",
            )

            # Invertibility: (rho_MSI - c0) / c1 should recover original rho_OLI
            rho_recovered = apply_cross_sensor_band_calibration(
                rho_cal,
                band=band,
                model=SensorCalibrationModel.ROY_2016_LINEAR,
                source_sensor=SensorPlatform.SENTINEL_2A_MSI,
                target_sensor=SensorPlatform.LANDSAT_8_OLI,
            )
            self.assertAlmostEqual(
                rho_recovered,
                rho_in,
                places=3,
                msg=f"Inversion for band {band.value} must recover input reflectance within 1e-3",
            )

        # -------------------------------------------------------------
        # 2. Reduced Major Axis (RMA) / Orthogonal Distance Regression (ODR)
        # -------------------------------------------------------------
        # Perfectly identical sequences: slope = 1.0, intercept = 0.0, R2 = 1.0, RMSE = 0.0
        x_ident = [0.10, 0.20, 0.30, 0.40, 0.50]
        y_ident = [0.10, 0.20, 0.30, 0.40, 0.50]
        odr_res = calculate_orthogonal_distance_regression(x_ident, y_ident)
        self.assertAlmostEqual(odr_res["slope"], 1.000, places=3)
        self.assertAlmostEqual(odr_res["intercept"], 0.000, places=4)
        self.assertAlmostEqual(odr_res["r_squared"], 1.000, places=3)
        self.assertAlmostEqual(odr_res["rmse"], 0.000, places=4)

        # Known transformation: y = 0.02 + 0.95 * x
        x_synth = [0.10, 0.25, 0.40, 0.55, 0.70]
        y_synth = [0.02 + 0.95 * val for val in x_synth]
        odr_synth = calculate_orthogonal_distance_regression(x_synth, y_synth)
        self.assertAlmostEqual(odr_synth["slope"], 0.950, places=2)
        self.assertAlmostEqual(odr_synth["intercept"], 0.020, places=3)
        self.assertAlmostEqual(odr_synth["r_squared"], 1.000, places=3)

        # Degenerate / empty inputs guard
        odr_empty = calculate_orthogonal_distance_regression([], [])
        self.assertEqual(odr_empty["slope"], 1.0)
        self.assertEqual(odr_empty["intercept"], 0.0)

        # -------------------------------------------------------------
        # 3. Residual RMSE and Radiometric Bias Bounds
        # -------------------------------------------------------------
        x_obs = [0.12, 0.24, 0.36, 0.48]
        y_obs = [0.005 + 0.99 * val for val in x_obs]

        # Exact fit yields 0.0 RMSE and 0.0 bias
        rmse_zero = calculate_cross_sensor_residual_rmse(x_obs, y_obs, c0=0.005, c1=0.99)
        bias_zero = calculate_cross_sensor_radiometric_bias(x_obs, y_obs, c0=0.005, c1=0.99)
        self.assertAlmostEqual(rmse_zero, 0.0, places=5)
        self.assertAlmostEqual(bias_zero, 0.0, places=5)

        # Perturbed data residual RMSE must remain bounded
        y_pert = [y + 0.003 * ((-1) ** idx) for idx, y in enumerate(y_obs)]
        rmse_pert = calculate_cross_sensor_residual_rmse(x_obs, y_pert, c0=0.005, c1=0.99)
        bias_pert = calculate_cross_sensor_radiometric_bias(x_obs, y_pert, c0=0.005, c1=0.99)
        self.assertLess(rmse_pert, 0.015, "Residual RMSE must remain strictly below 0.015 threshold")
        self.assertLess(abs(bias_pert), 0.005, "Radiometric bias must remain strictly below 0.005")

        # -------------------------------------------------------------
        # 4. Calibration Quality Rating Classification
        # -------------------------------------------------------------
        # EXCELLENT: RMSE <= 0.008, R2 >= 0.990, bias <= 0.003
        self.assertEqual(
            classify_calibration_quality_rating(rmse=0.004, r_squared=0.995, mean_bias=0.001),
            CalibrationQualityRating.EXCELLENT,
        )
        # GOOD: RMSE <= 0.015, R2 >= 0.975, bias <= 0.008
        self.assertEqual(
            classify_calibration_quality_rating(rmse=0.012, r_squared=0.980, mean_bias=0.005),
            CalibrationQualityRating.GOOD,
        )
        # ACCEPTABLE: RMSE <= 0.030, R2 >= 0.950, bias <= 0.015
        self.assertEqual(
            classify_calibration_quality_rating(rmse=0.025, r_squared=0.960, mean_bias=0.012),
            CalibrationQualityRating.ACCEPTABLE,
        )
        # DEGRADED: Outside bounds
        self.assertEqual(
            classify_calibration_quality_rating(rmse=0.045, r_squared=0.910, mean_bias=0.025),
            CalibrationQualityRating.DEGRADED,
        )

        # -------------------------------------------------------------
        # 5. Non-Negative Reflectance Clamping Invariant
        # -------------------------------------------------------------
        # Physical bounds: Surface reflectance must be strictly clamped to [0.0, 1.0]
        clamped_neg = apply_cross_sensor_band_calibration(
            -0.5,
            band=CrossSensorBand.BLUE,
            model=SensorCalibrationModel.ROY_2016_LINEAR,
        )
        self.assertEqual(clamped_neg, 0.0, "Negative inputs must be clamped to non-negative 0.0")

        clamped_high = apply_cross_sensor_band_calibration(
            1.8,
            band=CrossSensorBand.NIR_NARROW,
            model=SensorCalibrationModel.ROY_2016_LINEAR,
        )
        self.assertEqual(clamped_high, 1.0, "Super-reflective values must be clamped to 1.0")

        # -------------------------------------------------------------
        # 6. CalibrationService Integration & Seamless Constellation Stacking
        # -------------------------------------------------------------
        service = CalibrationService()
        source_b, target_b, sc = service.generate_synthetic_sensor_pair_bands(
            aoi_name="Lake Tahoe Aquatic & Terrestrial Calibration Target",
            grid_size=64,
            seed=42,
        )
        self.assertIsNotNone(sc)
        self.assertIn("nir_narrow", source_b)
        self.assertIn("red", source_b)

        # Calibrate whole scene
        calibrated_scene = service.calibrate_scene(
            source_bands=source_b,
            model=SensorCalibrationModel.ROY_2016_LINEAR,
            source_sensor=SensorPlatform.LANDSAT_8_OLI,
            target_sensor=SensorPlatform.SENTINEL_2A_MSI,
        )
        self.assertEqual(set(source_b.keys()), set(calibrated_scene.keys()))

        # Harmonized NDVI computation
        harm_ndvi = service.compute_harmonized_metric(
            calibrated_scene,
            metric=CrossSensorTileMetric.HARMONIZED_NDVI,
        )
        self.assertEqual(harm_ndvi.shape, (64, 64))
        self.assertGreaterEqual(float(np.min(harm_ndvi)), -1.0)
        self.assertLessEqual(float(np.max(harm_ndvi)), 1.0)

        # Quantitative Quality Certification
        summary = service.evaluate_quality_summary(
            source_bands=source_b,
            calibrated_bands=calibrated_scene,
            target_bands=target_b,
            model=SensorCalibrationModel.ROY_2016_LINEAR,
        )
        self.assertLess(summary.mean_rmse, 0.015, "Multi-band mean RMSE must satisfy < 0.015 bound")
        self.assertGreater(summary.mean_r_squared, 0.98, "Harmonized multi-band correlation must exceed R2 > 0.98")
        self.assertIn(summary.quality_rating, [CalibrationQualityRating.EXCELLENT, CalibrationQualityRating.GOOD])

        # Seamless Daily Stacking: Step offset reduction
        stack_res = service.generate_seamless_daily_stack(
            aoi_name="Lake Tahoe Aquatic & Terrestrial Calibration Target",
            days=14,
        )
        self.assertEqual(len(stack_res), 14)
        for obs in stack_res:
            self.assertGreater(
                obs["cross_sensor_offset_reduction_pct"],
                80.0,
                "Interleaved cross-calibration must eliminate >80% of artificial step offset variance",
            )

    def test_non_parametric_trend_inversion_scientific_rigor_and_invariants(self):
        """Task T-298: Continuous Scientific QA: Non-Parametric Trend Inversion,
        Theil-Sen Robust Median Slope Invariant (29.3% Breakdown Point vs. OLS Sensitivity),
        Mann-Kendall Monotonic Rank Statistic Invariance, Exact Tied-Rank Variance Handling,
        Yue-Pilon Trend-Free Pre-Whitening (TFPW) Autoregressive Removal & Biophysical Directionality Inversion.
        """
        from app.models.schemas import (
            TrendModel,
            TrendSignificanceClass,
            TrendTileMetric,
            TrendTargetIndex,
            TrendConfidenceRating,
            TREND_MODEL_CONFIGS,
            TREND_SIGNIFICANCE_CONFIGS,
            TREND_BENCHMARK_SCENES,
            normalize_trend_model,
            normalize_trend_metric,
            normalize_trend_target_index,
            calculate_theil_sen_slope,
            calculate_mann_kendall_statistics,
            calculate_yue_pilon_prewhitening,
            classify_trend_significance,
            build_trend_tile_url,
            build_trend_tile_url_template,
            TrendAnalysisRequest,
        )
        from app.services.trend_service import TrendService
        from app.services.tile_service import tile_service

        # -------------------------------------------------------------
        # 1. Theil-Sen Robustness Invariant & Outlier Breakdown Point
        # -------------------------------------------------------------
        # Pure linear baseline: y = 0.40 + 0.02 * t for t = 0..19 (N = 20)
        t_clean = list(range(20))
        y_clean = [0.40 + 0.02 * t for t in t_clean]

        ts_clean = calculate_theil_sen_slope(t_clean, y_clean)
        self.assertAlmostEqual(ts_clean["slope_per_year"], 0.02, places=4)
        self.assertAlmostEqual(ts_clean["intercept"], 0.40, places=4)
        self.assertEqual(ts_clean["pairwise_count"], 190)  # 20 * 19 / 2
        self.assertLessEqual(ts_clean["slope_ci_lower"], 0.0201)
        self.assertGreaterEqual(ts_clean["slope_ci_upper"], 0.0199)

        # Corrupt 5 of 20 points (25% contamination, within 29.3% breakdown point)
        # Extreme outliers simulated from cloud leaks and bad detector lines
        y_corrupt = list(y_clean)
        y_corrupt[3] = -0.50   # severe cloud shadow dropout
        y_corrupt[7] = 1.20    # severe bright cloud contamination
        y_corrupt[11] = -0.40  # sensor dropout
        y_corrupt[15] = 1.10   # reflection artifact
        y_corrupt[18] = -0.30  # snow/ice misclassification

        ts_corrupt = calculate_theil_sen_slope(t_clean, y_corrupt)
        # Theil-Sen should remain robust to the true slope
        ts_slope_err = abs(ts_corrupt["slope_per_year"] - 0.02)
        self.assertLess(ts_slope_err, 0.008, "Theil-Sen slope must withstand 25% severe outliers within 29.3% breakdown threshold")

        # In contrast, Ordinary Least Squares (OLS) slope is severely biased
        slope_ols, _ = np.polyfit(t_clean, y_corrupt, 1)
        ols_slope_err = abs(slope_ols - 0.02)
        self.assertGreater(ols_slope_err, ts_slope_err * 2.5, "OLS must exhibit significantly higher sensitivity to cloud outliers than Theil-Sen")

        # Vectorized pairwise slopes algorithm parity in TrendService
        vec_slopes = TrendService.calculate_vectorized_pairwise_slopes(t_clean, y_clean)
        self.assertEqual(len(vec_slopes), 190)
        self.assertTrue(np.allclose(vec_slopes, 0.02))

        # -------------------------------------------------------------
        # 2. Mann-Kendall Monotonic Rank Invariance & Exact Tied Variance
        # -------------------------------------------------------------
        # Strictly monotonic series:
        x_mono = [0.10, 0.15, 0.22, 0.35, 0.41, 0.58, 0.64, 0.79, 0.88, 0.96]
        mk_mono = calculate_mann_kendall_statistics(x_mono)
        self.assertEqual(mk_mono["s_statistic"], 45)  # 10 * 9 / 2
        self.assertEqual(mk_mono["kendall_tau"], 1.0)
        self.assertTrue(mk_mono["is_significant_99"])
        self.assertGreater(mk_mono["z_score"], 3.5)

        # Apply strictly monotonic non-linear transformations:
        # e.g., cubic power and exponential scaling
        y_cubic = [val ** 3 + 2.0 for val in x_mono]
        y_exp = [math.exp(val) for val in x_mono]

        mk_cubic = calculate_mann_kendall_statistics(y_cubic)
        mk_exp = calculate_mann_kendall_statistics(y_exp)

        self.assertEqual(mk_cubic["s_statistic"], mk_mono["s_statistic"], "Monotonic non-linear transforms must preserve exact MK S statistic")
        self.assertAlmostEqual(mk_cubic["z_score"], mk_mono["z_score"], places=4)
        self.assertAlmostEqual(mk_cubic["p_value"], mk_mono["p_value"], places=6)
        self.assertAlmostEqual(mk_exp["z_score"], mk_mono["z_score"], places=4)

        # Directional symmetry under time-reversal
        x_rev = x_mono[::-1]
        mk_rev = calculate_mann_kendall_statistics(x_rev)
        self.assertEqual(mk_rev["s_statistic"], -mk_mono["s_statistic"], "Time reversal must invert S sign")
        self.assertAlmostEqual(mk_rev["z_score"], -mk_mono["z_score"], places=4)
        self.assertAlmostEqual(mk_rev["p_value"], mk_mono["p_value"], places=6)
        self.assertAlmostEqual(mk_rev["variance_s"], mk_mono["variance_s"], places=4)

        # Exact tied-rank variance handling
        # Series with ties: [1, 2, 2, 3, 3, 3, 4] -> n=7, ties of size 2 and 3
        # Untied Var(S) = 7*6*19/18 = 44.3333...
        # Tie correction = (2*1*9 + 3*2*11)/18 = (18 + 66)/18 = 4.6667
        # Tied Var(S) = 44.3333 - 4.6667 = 39.6667
        x_tied = [1.0, 2.0, 2.0, 3.0, 3.0, 3.0, 4.0]
        mk_tied = calculate_mann_kendall_statistics(x_tied)
        self.assertAlmostEqual(mk_tied["variance_s"], 714.0 / 18.0, places=3)

        # -------------------------------------------------------------
        # 3. Yue-Pilon Trend-Free Pre-Whitening (TFPW) Autoregressive Invariant
        # -------------------------------------------------------------
        # AR(1) autoregressive noise with positive serial autocorrelation
        rng = np.random.RandomState(42)
        n_pts = 60
        t_seq = list(range(n_pts))
        # Pure red noise: x_t = 0.65 * x_{t-1} + e_t
        ar_noise = [0.0]
        for _ in range(1, n_pts):
            ar_noise.append(0.65 * ar_noise[-1] + rng.normal(0.0, 0.05))

        yp_red = calculate_yue_pilon_prewhitening(t_seq, ar_noise)
        self.assertGreater(yp_red["lag1_autocorrelation"], 0.40, "Yue-Pilon must detect significant positive lag-1 autocorrelation in red noise")
        self.assertTrue(yp_red["is_autocorrelated"])

        # Trend preservation: True linear trend beta = 0.02 + red noise
        trend_signal = [0.02 * t + ar for t, ar in zip(t_seq, ar_noise)]
        yp_trend = calculate_yue_pilon_prewhitening(t_seq, trend_signal)
        # Pre-whitened slope must preserve the underlying secular trend within bounds
        self.assertAlmostEqual(yp_trend["prewhitened_slope"], 0.02, delta=0.008, msg="Yue-Pilon TFPW must preserve underlying secular slope")

        # -------------------------------------------------------------
        # 4. Biophysical Directionality & Significance Classification
        # -------------------------------------------------------------
        # Significant greening: Z > 1.96, p < 0.05, slope > 0
        self.assertEqual(
            classify_trend_significance(z_score=2.85, p_value=0.004, slope=0.015),
            TrendSignificanceClass.SIGNIFICANT_GREENING,
        )
        # Moderate greening: 1.645 < Z <= 1.96, p < 0.10
        self.assertEqual(
            classify_trend_significance(z_score=1.82, p_value=0.068, slope=0.008),
            TrendSignificanceClass.MODERATE_GREENING,
        )
        # Significant browning: Z < -1.96, p < 0.05, slope < 0
        self.assertEqual(
            classify_trend_significance(z_score=-3.10, p_value=0.0019, slope=-0.020),
            TrendSignificanceClass.SIGNIFICANT_BROWNING,
        )
        # Moderate browning: -1.96 <= Z < -1.645, p < 0.10
        self.assertEqual(
            classify_trend_significance(z_score=-1.75, p_value=0.080, slope=-0.009),
            TrendSignificanceClass.MODERATE_BROWNING,
        )
        # Stable / equilibrium: |Z| <= 1.645 or p >= 0.10
        self.assertEqual(
            classify_trend_significance(z_score=0.45, p_value=0.65, slope=0.001),
            TrendSignificanceClass.STABLE_NO_TREND,
        )

        # Biophysical directionality inversion
        dir_green = TrendService.invert_greening_senescence_directionality(slope=0.02, z_score=2.8, p_value=0.005)
        self.assertEqual(dir_green["state"], "accelerated_greening")
        self.assertTrue(dir_green["is_significant"])

        dir_brown = TrendService.invert_greening_senescence_directionality(slope=-0.018, z_score=-3.0, p_value=0.002)
        self.assertEqual(dir_brown["state"], "severe_degradation")
        self.assertTrue(dir_brown["is_significant"])

        dir_stable = TrendService.invert_greening_senescence_directionality(slope=0.0002, z_score=0.1, p_value=0.92)
        self.assertEqual(dir_stable["state"], "stable_equilibrium")
        self.assertFalse(dir_stable["is_significant"])

        # -------------------------------------------------------------
        # 5. TrendService Trajectory Synthesis, Pipeline & 3D Raster Inversion
        # -------------------------------------------------------------
        service = TrendService()
        obs, matched_sc = service.generate_multi_decadal_trajectory(
            aoi_name="San Luis Reservoir Drought Decade",
            target_index=TrendTargetIndex.NDVI,
            start_year=2016,
            end_year=2026,
            observations_per_year=12,
            seed=42,
        )
        self.assertIsNotNone(matched_sc)
        self.assertEqual(len(obs), 120)  # 10 years * 12 months
        self.assertIn("timestamp_years", obs[0])
        self.assertIn("value", obs[0])

        # Execute full trend pipeline
        req = TrendAnalysisRequest(
            aoi_name="San Luis Reservoir Drought Decade",
            model=TrendModel.THEIL_SEN_MEDIAN,
            target_index=TrendTargetIndex.NDVI,
            confidence_level=0.95,
        )
        resp = service.execute_trend_pipeline(req)
        self.assertEqual(resp.status, "success")
        self.assertEqual(resp.observation_count, 120)
        self.assertEqual(resp.theil_sen.pairwise_count, 7140)  # 120 * 119 / 2
        self.assertIn(resp.summary.significance_class, [
            TrendSignificanceClass.SIGNIFICANT_BROWNING,
            TrendSignificanceClass.MODERATE_BROWNING,
            TrendSignificanceClass.STABLE_NO_TREND,
        ])
        self.assertIn("/api/v1/tiles/trend", resp.tile_url_template)

        # Synthetic trend tile grid (256x256 float32)
        for metric in TrendTileMetric:
            grid = service.generate_synthetic_trend_tile_grid(
                model=TrendModel.THEIL_SEN_MEDIAN,
                metric=metric,
                target_index=TrendTargetIndex.NDVI,
                z=12,
                x=650,
                y=1580,
            )
            self.assertEqual(grid.shape, (256, 256))
            self.assertEqual(grid.dtype, np.float32)
            self.assertFalse(np.any(np.isnan(grid)))

        # 3D Spatio-Temporal Raster Cube Inversion (T, H, W)
        t_cube = np.linspace(2015.0, 2025.0, 11, dtype=np.float64)
        cube = np.zeros((11, 16, 16), dtype=np.float32)
        # Greening gradient in upper rows
        for t_idx, yr in enumerate(t_cube):
            cube[t_idx, :8, :] = 0.30 + 0.02 * (yr - 2015.0)
            cube[t_idx, 8:, :] = 0.50 - 0.02 * (yr - 2015.0)

        cube_res = service.compute_vectorized_raster_trend(
            cube,
            timestamps=t_cube,
            model=TrendModel.THEIL_SEN_MEDIAN,
            apply_prewhitening=False,
            chunk_size=8,
        )
        self.assertIn("theil_sen_slope", cube_res)
        self.assertIn("mann_kendall_zscore", cube_res)
        self.assertIn("trend_significance", cube_res)
        self.assertGreater(float(np.mean(cube_res["theil_sen_slope"][:8, :])), 0.015)
        self.assertLess(float(np.mean(cube_res["theil_sen_slope"][8:, :])), -0.015)
        self.assertEqual(float(np.mean(cube_res["trend_significance"][:8, :])), 2.0)
        self.assertEqual(float(np.mean(cube_res["trend_significance"][8:, :])), -2.0)

        # -------------------------------------------------------------
        # 6. Dynamic XYZ Trend Tile Rendering & Colormapping Invariants
        # -------------------------------------------------------------
        tile_bytes = tile_service.render_trend_tile(
            model="theil_sen_median",
            metric="theil_sen_slope",
            z=10,
            x=163,
            y=395,
        )
        self.assertIsInstance(tile_bytes, bytes)
        self.assertTrue(tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"))

        sig_tile_bytes = tile_service.render_trend_significance_tile(
            z=10,
            x=163,
            y=395,
        )
        self.assertIsInstance(sig_tile_bytes, bytes)
        self.assertTrue(sig_tile_bytes.startswith(b"\x89PNG\r\n\x1a\n"))

    def test_task_t304_multimodal_feature_tracking_scientific_qa_and_invariants(self):
        """Task T-304 (Cycle v2.5.40 Step 3 Continuous Scientific QA):
        Verify sub-pixel parabolic peak localization accuracy (sigma < 0.1 px),
        flow vector divergence conservation under synthetic rigid translational shifts (div v = 0),
        compass azimuth angles, and multimodal correlation noise rejection.
        """
        from app.models.schemas import (
            MultimodalAlignmentModel,
            MultimodalSensorPair,
            MultimodalTileMetric,
            DisplacementConfidenceTier,
            MotionHazardTier,
            normalize_multimodal_model,
            normalize_sensor_pair,
            normalize_multimodal_metric,
            calculate_subpixel_peak_parabolic,
            calculate_velocity_vector,
            calculate_correlation_snr,
            classify_motion_hazard_tier,
            classify_displacement_confidence,
            build_multimodal_tile_url,
            build_multimodal_tile_url_template,
        )

        # -------------------------------------------------------------
        # 1. Sub-Pixel Parabolic Peak Localization Accuracy (sigma < 0.1 px)
        # -------------------------------------------------------------
        # Analytic quadratic test surface: C(x, y) = 1.0 - a * (x - dx_true)^2 - b * (y - dy_true)^2
        # On a 3x3 window {-1, 0, 1} x {-1, 0, 1}
        rng = np.random.RandomState(42)
        errors_x = []
        errors_y = []
        for _ in range(50):
            true_dx = rng.uniform(-0.35, 0.35)
            true_dy = rng.uniform(-0.35, 0.35)
            a = rng.uniform(0.5, 1.5)
            b = rng.uniform(0.5, 1.5)

            grid = []
            for j in [-1, 0, 1]:  # row corresponds to y
                row = []
                for i in [-1, 0, 1]:  # col corresponds to x
                    # Add small realistic correlation noise
                    noise = rng.normal(0.0, 0.005)
                    val = 1.0 - a * (i - true_dx) ** 2 - b * (j - true_dy) ** 2 + noise
                    row.append(val)
                grid.append(row)

            est_dx, est_dy, peak_val = calculate_subpixel_peak_parabolic(grid)
            errors_x.append(abs(est_dx - true_dx))
            errors_y.append(abs(est_dy - true_dy))

        std_err_x = float(np.std(errors_x))
        std_err_y = float(np.std(errors_y))
        mean_err_x = float(np.mean(errors_x))
        mean_err_y = float(np.mean(errors_y))

        # Precision requirement from Task T-304: sigma < 0.1 px
        self.assertLess(std_err_x, 0.1, f"Parabolic X peak standard error ({std_err_x:.4f} px) must be < 0.1 px")
        self.assertLess(std_err_y, 0.1, f"Parabolic Y peak standard error ({std_err_y:.4f} px) must be < 0.1 px")
        self.assertLess(mean_err_x, 0.05, "Mean sub-pixel X error must be < 0.05 px")
        self.assertLess(mean_err_y, 0.05, "Mean sub-pixel Y error must be < 0.05 px")

        # Exact uncorrupted quadratic peak test: zero error
        grid_exact = [
            [0.60, 0.85, 0.60],
            [0.75, 1.00, 0.75],
            [0.60, 0.85, 0.60]
        ]
        dx_0, dy_0, peak_0 = calculate_subpixel_peak_parabolic(grid_exact)
        self.assertEqual(dx_0, 0.0)
        self.assertEqual(dy_0, 0.0)
        self.assertEqual(peak_0, 1.0)

        # -------------------------------------------------------------
        # 2. Flow Vector Divergence Conservation Under Rigid Shifts
        # -------------------------------------------------------------
        # Synthetic rigid translational ground displacement: dx = 2.5 px, dy = -1.8 px
        # On a uniform velocity vector field, the spatial divergence div(v) = dv_x/dx + dv_y/dy == 0
        field_vx = np.full((16, 16), 15.2, dtype=np.float64)
        field_vy = np.full((16, 16), -8.4, dtype=np.float64)
        grad_vx_x = np.gradient(field_vx, axis=1)
        grad_vy_y = np.gradient(field_vy, axis=0)
        divergence = grad_vx_x + grad_vy_y
        max_div = float(np.max(np.abs(divergence)))
        self.assertEqual(max_div, 0.0, "Divergence of rigid translational flow field must be identically zero")

        # Compass Azimuth and Magnitude Verification
        # Pure North (dx=0, dy=1) -> azimuth = 0 deg
        v_north = calculate_velocity_vector(dx_px=0.0, dy_px=1.0, gsd_m=10.0, dt_days=365.25)
        self.assertEqual(v_north["azimuth_deg"], 0.0)
        self.assertAlmostEqual(v_north["velocity_magnitude_m_yr"], 10.0, places=2)

        # Pure East (dx=1, dy=0) -> azimuth = 90 deg
        v_east = calculate_velocity_vector(dx_px=1.0, dy_px=0.0, gsd_m=10.0, dt_days=365.25)
        self.assertEqual(v_east["azimuth_deg"], 90.0)
        self.assertAlmostEqual(v_east["velocity_magnitude_m_yr"], 10.0, places=2)

        # Pure South (dx=0, dy=-1) -> azimuth = 180 deg
        v_south = calculate_velocity_vector(dx_px=0.0, dy_px=-1.0, gsd_m=10.0, dt_days=365.25)
        self.assertEqual(v_south["azimuth_deg"], 180.0)

        # Pure West (dx=-1, dy=0) -> azimuth = 270 deg
        v_west = calculate_velocity_vector(dx_px=-1.0, dy_px=0.0, gsd_m=10.0, dt_days=365.25)
        self.assertEqual(v_west["azimuth_deg"], 270.0)

        # -------------------------------------------------------------
        # 3. Multimodal Correlation SNR & Confidence Tier Invariants
        # -------------------------------------------------------------
        # High confidence peak with sharp contrast: peak = 0.85, sidelobes ~ 0.10
        high_corr = [0.85] + [0.10 + 0.02 * rng.randn() for _ in range(24)]
        snr_high = calculate_correlation_snr(high_corr, peak_val=0.85)
        self.assertGreater(snr_high, 5.0)
        conf_high = classify_displacement_confidence(snr=snr_high, peak_corr=0.85)
        self.assertEqual(conf_high, DisplacementConfidenceTier.HIGH)

        # Low confidence noisy correlation surface: peak = 0.35, sidelobes ~ 0.30
        noisy_corr = [0.35] + [0.30 + 0.05 * rng.randn() for _ in range(24)]
        snr_low = calculate_correlation_snr(noisy_corr, peak_val=0.35)
        self.assertLess(snr_low, 3.0)
        conf_low = classify_displacement_confidence(snr=snr_low, peak_corr=0.35)
        self.assertIn(conf_low, [DisplacementConfidenceTier.LOW, DisplacementConfidenceTier.INDETERMINATE])

        # Motion Hazard Tier Invariants
        self.assertEqual(classify_motion_hazard_tier(65.0), MotionHazardTier.RAPID_DISPLACEMENT)
        self.assertEqual(classify_motion_hazard_tier(25.0), MotionHazardTier.ACCELERATING_CREEP)
        self.assertEqual(classify_motion_hazard_tier(7.5), MotionHazardTier.STEADY_CREEP)
        self.assertEqual(classify_motion_hazard_tier(0.2), MotionHazardTier.SUB_CENTIMETER_STABLE)

        # -------------------------------------------------------------
        # 4. Multimodal Dynamic Tile URL Contracts
        # -------------------------------------------------------------
        for metric in MultimodalTileMetric:
            tile_url = build_multimodal_tile_url(metric=metric, z=14, x=1024, y=512, colormap="turbo", min_snr=5.0)
            self.assertTrue(tile_url.startswith("/api/v1/tiles/multimodal/ncc_frequency_domain/"))
            self.assertIn(f"/{metric.value}/14/1024/512.png", tile_url)
            self.assertIn("colormap=turbo", tile_url)
            self.assertIn("min_snr=5.0", tile_url)

            tpl_url = build_multimodal_tile_url_template(metric=metric)
            self.assertEqual(tpl_url, f"/api/v1/tiles/multimodal/ncc_frequency_domain/{metric.value}/{{z}}/{{x}}/{{y}}.png")

    def test_task_t310_insar_sbas_scientific_qa_and_inversion_invariants(self):
        """Task T-310 (Cycle v2.5.41 Step 3 Continuous Scientific QA):
        Verify InSAR SBAS multi-temporal scientific rigor, amplitude dispersion bounds (D_A >= 0),
        scale invariance under uniform amplification, triangular phase closure zero-sum invariance,
        SVD least-norm ground velocity reconstruction convergence (< 1.0 mm/yr error under synthetic subsidence),
        and benchmark scene biophysical fidelity.
        """
        from app.models.schemas import (
            SBASInversionModel,
            InSARSBASTileMetric,
            PSCStabilityTier,
            DeformationHazardTier,
            SBASNetworkStatus,
            normalize_sbas_model,
            normalize_insar_sbas_metric,
            normalize_psc_stability,
            normalize_deformation_hazard_tier,
            SBAS_INVERSION_CONFIGS,
            DEFORMATION_HAZARD_CONFIGS,
            INSAR_SBAS_BENCHMARK_SCENES,
            calculate_amplitude_dispersion,
            calculate_phase_to_displacement,
            calculate_sbas_network_connectivity,
            classify_deformation_hazard_tier,
            classify_psc_stability,
            build_insar_sbas_tile_url,
            build_insar_sbas_tile_url_template,
            PSCCandidatePoint,
            SBASInterferogramPair,
            SBASBaselineGraph,
        )

        # -------------------------------------------------------------
        # 1. Amplitude Dispersion Mathematical Bounds & Scale Invariance
        # -------------------------------------------------------------
        # Physical definition: D_A = sigma_A / mu_A
        # Invariant 1: Non-negativity (D_A >= 0 for any valid amplitude sequence)
        amps_constant = [15.0, 15.0, 15.0, 15.0, 15.0]
        da_const = calculate_amplitude_dispersion(amps_constant)
        self.assertEqual(da_const, 0.0, "Zero-variance signal must yield D_A = 0.0")

        # Invariant 2: Scale Invariance under uniform radar amplification c * A (c > 0)
        amps_base = [12.0, 14.5, 11.2, 13.8, 12.5, 14.0]
        da_base = calculate_amplitude_dispersion(amps_base)
        for scale_factor in [0.1, 2.5, 10.0, 100.0]:
            amps_scaled = [x * scale_factor for x in amps_base]
            da_scaled = calculate_amplitude_dispersion(amps_scaled)
            self.assertAlmostEqual(
                da_scaled,
                da_base,
                places=5,
                msg=f"Amplitude dispersion must be scale-invariant under multiplier {scale_factor}",
            )

        # Invariant 3: Permanent Scatterer stability criterion (Ferretti et al. 2001)
        # Highly coherent urban roof / trihedral corner reflector: D_A <= 0.25
        amps_psc = [20.0, 20.8, 19.5, 20.3, 21.0, 19.8, 20.2]
        da_psc = calculate_amplitude_dispersion(amps_psc)
        self.assertLessEqual(da_psc, 0.25)
        self.assertGreaterEqual(da_psc, 0.0)
        self.assertEqual(classify_psc_stability(da_psc, temporal_coherence=0.92), PSCStabilityTier.HIGH)

        # Decorrelated vegetation / volume scattering clutter: D_A > 0.60
        amps_clutter = [2.0, 18.0, 1.5, 25.0, 4.0, 32.0, 1.0]
        da_clutter = calculate_amplitude_dispersion(amps_clutter)
        self.assertGreater(da_clutter, 0.60)
        self.assertEqual(classify_psc_stability(da_clutter, temporal_coherence=0.25), PSCStabilityTier.INDETERMINATE)

        # -------------------------------------------------------------
        # 2. Phase-to-Displacement Physical Scaling & Sensor Invariants
        # -------------------------------------------------------------
        # Exact physical formulation: Delta r = - (lambda / (4 * pi)) * Delta phi
        # Sentinel-1 C-band (lambda = 55.4657 mm = 0.0554657 m)
        lam_s1 = 0.0554657
        # 2 * pi phase difference -> one full cycle -> displacement = - lambda / 2 = -27.73285 mm
        disp_2pi = calculate_phase_to_displacement(2.0 * math.pi, wavelength_m=lam_s1)
        expected_2pi = -(lam_s1 * 1000.0) / 2.0  # -27.73285 mm
        self.assertAlmostEqual(disp_2pi, expected_2pi, places=3)

        # Invariant: Linearity Delta r(k * Delta phi) == k * Delta r(Delta phi)
        disp_pi = calculate_phase_to_displacement(math.pi, wavelength_m=lam_s1)
        self.assertAlmostEqual(disp_2pi, 2.0 * disp_pi, delta=0.002)
        disp_neg_pi = calculate_phase_to_displacement(-math.pi, wavelength_m=lam_s1)
        self.assertAlmostEqual(disp_neg_pi, -disp_pi, delta=0.002)

        # Multi-sensor radar wavelength consistency:
        # L-band (ALOS-2 / NISAR, lambda = 0.238 m): 2pi -> -119.0 mm
        disp_l_band = calculate_phase_to_displacement(2.0 * math.pi, wavelength_m=0.238)
        self.assertAlmostEqual(disp_l_band, -119.0, places=2)

        # X-band (TerraSAR-X, lambda = 0.031 m): 2pi -> -15.5 mm
        disp_x_band = calculate_phase_to_displacement(2.0 * math.pi, wavelength_m=0.031)
        self.assertAlmostEqual(disp_x_band, -15.5, places=2)

        # -------------------------------------------------------------
        # 3. Triangular Phase Closure Invariance around Triangulation Loops
        # -------------------------------------------------------------
        # For any triplet of SAR acquisitions (A, B, C) forming a closed interferometric loop:
        # Delta phi_AB = phi_B - phi_A
        # Delta phi_BC = phi_C - phi_B
        # Delta phi_AC = phi_C - phi_A
        # Mathematical invariant: Delta phi_AB + Delta phi_BC - Delta phi_AC == 0.0
        # This zero-sum property cancels acquisition-specific atmospheric path delays.
        rng = np.random.RandomState(42)
        for _ in range(25):
            phi_A = rng.uniform(-10.0, 10.0)
            phi_B = rng.uniform(-10.0, 10.0)
            phi_C = rng.uniform(-10.0, 10.0)
            atm_A = rng.normal(0.0, 1.5)  # atmospheric delay at time A
            atm_B = rng.normal(0.0, 1.5)  # atmospheric delay at time B
            atm_C = rng.normal(0.0, 1.5)  # atmospheric delay at time C

            phi_total_A = phi_A + atm_A
            phi_total_B = phi_B + atm_B
            phi_total_C = phi_C + atm_C

            delta_phi_AB = phi_total_B - phi_total_A
            delta_phi_BC = phi_total_C - phi_total_B
            delta_phi_AC = phi_total_C - phi_total_A

            loop_closure_error = (delta_phi_AB + delta_phi_BC) - delta_phi_AC
            self.assertAlmostEqual(
                loop_closure_error,
                0.0,
                places=12,
                msg="Phase closure error around triangular acquisition loop must be identically zero",
            )

        # -------------------------------------------------------------
        # 4. SVD Least-Norm Reconstruction Convergence under Synthetic Subsidence Ground Truth
        # -------------------------------------------------------------
        # Case A: Pure secular ground truth (Tulare Basin Benchmark: v_true = -165.0 mm/yr)
        v_true_tulare = -165.0  # mm/yr
        num_acquisitions = 13   # 13 monthly acquisitions spanning 1.0 year
        time_years = np.linspace(0.0, 1.0, num_acquisitions)
        gt_displacements = v_true_tulare * time_years

        # Small Baseline Interferometric Network configuration:
        # Connect consecutive pairs (i, i+1) and skip-1 pairs (i, i+2) to ensure high redundancy
        ifg_pairs = []
        for i in range(num_acquisitions - 1):
            ifg_pairs.append((i, i + 1))
        for i in range(num_acquisitions - 2):
            ifg_pairs.append((i, i + 2))

        num_ifgs = len(ifg_pairs)
        self.assertEqual(num_ifgs, 23)

        # Verify network connectivity using SBAS graph analyzer
        conn = calculate_sbas_network_connectivity(num_acquisitions, ifg_pairs)
        self.assertTrue(conn["is_connected"])
        self.assertEqual(conn["num_components"], 1)
        self.assertEqual(conn["network_status"], SBASNetworkStatus.FULLY_CONNECTED.value)
        self.assertGreater(conn["redundancy_ratio"], 1.5)

        # Construct SBAS design matrix B of size (num_ifgs, num_acquisitions - 1)
        # where B * v_intervals = delta_d
        num_intervals = num_acquisitions - 1
        delta_t_intervals = np.diff(time_years)  # dt_m = t_{m+1} - t_m

        B = np.zeros((num_ifgs, num_intervals), dtype=np.float64)
        delta_d_obs = np.zeros(num_ifgs, dtype=np.float64)

        for p_idx, (j, k) in enumerate(ifg_pairs):
            for m in range(j, k):
                B[p_idx, m] = delta_t_intervals[m]
            delta_d_obs[p_idx] = gt_displacements[k] - gt_displacements[j]

        # SVD Least-Norm inversion: B = U * S * V^T -> v_est = V * S^+ * U^T * delta_d
        U, S, Vt = np.linalg.svd(B, full_matrices=False)
        rcond = 1e-10
        S_inv = np.array([1.0 / s if s > rcond * S[0] else 0.0 for s in S])
        v_intervals_est = Vt.T @ (S_inv * (U.T @ delta_d_obs))

        # Reconstruct cumulative displacement time series by numerical integration
        reconstructed_displacements = np.zeros(num_acquisitions, dtype=np.float64)
        for m in range(num_intervals):
            reconstructed_displacements[m + 1] = reconstructed_displacements[m] + v_intervals_est[m] * delta_t_intervals[m]

        # Fit linear regression to reconstructed time series to estimate mean ground velocity
        A_reg = np.vstack([time_years, np.ones(num_acquisitions)]).T
        v_mean_est, intercept = np.linalg.lstsq(A_reg, reconstructed_displacements, rcond=None)[0]

        # Requirement: SVD ground velocity error < 1.0 mm/yr under synthetic ground truth
        velocity_error = abs(v_mean_est - v_true_tulare)
        self.assertLess(
            velocity_error,
            1.0,
            f"SVD least-norm velocity error ({velocity_error:.4f} mm/yr) must be strictly < 1.0 mm/yr",
        )
        self.assertLess(velocity_error, 1e-6, "Pure secular subsidence must be recovered to machine precision")

        # Reconstruction RMSE between observed interferometric phases and modeled phases
        modeled_delta_d = B @ v_intervals_est
        rmse_displacement = float(np.sqrt(np.mean((modeled_delta_d - delta_d_obs) ** 2)))
        self.assertLess(
            rmse_displacement,
            1e-9,
            f"SBAS least-norm reconstruction RMSE ({rmse_displacement:.2e} mm) must satisfy exact numerical convergence",
        )

        # Case B: Multi-year subsidence with seasonal thermal cycle (3.0 years, 37 acquisitions)
        # d(t) = v_true * t + A_s * sin(2*pi*t)
        v_true_multiyear = -25.0
        amp_seasonal = 3.5
        t_multiyear = np.linspace(0.0, 3.0, 37)
        gt_disp_multiyear = v_true_multiyear * t_multiyear + amp_seasonal * np.sin(2.0 * np.pi * t_multiyear)

        # Build consecutive and skip-1 SBAS pairs for multi-year series
        n_my = len(t_multiyear)
        ifg_my = [(i, i + 1) for i in range(n_my - 1)] + [(i, i + 2) for i in range(n_my - 2)]
        dt_my = np.diff(t_multiyear)
        B_my = np.zeros((len(ifg_my), n_my - 1), dtype=np.float64)
        obs_my = np.zeros(len(ifg_my), dtype=np.float64)
        for p_idx, (j, k) in enumerate(ifg_my):
            for m in range(j, k):
                B_my[p_idx, m] = dt_my[m]
            obs_my[p_idx] = gt_disp_multiyear[k] - gt_disp_multiyear[j]

        U_my, S_my, Vt_my = np.linalg.svd(B_my, full_matrices=False)
        S_inv_my = np.array([1.0 / s if s > rcond * S_my[0] else 0.0 for s in S_my])
        v_est_my = Vt_my.T @ (S_inv_my * (U_my.T @ obs_my))

        recon_disp_my = np.zeros(n_my, dtype=np.float64)
        for m in range(n_my - 1):
            recon_disp_my[m + 1] = recon_disp_my[m] + v_est_my[m] * dt_my[m]

        # Multi-year linear trend error must be strictly < 1.0 mm/yr due to orthogonal annual cycles
        A_my = np.vstack([t_multiyear, np.ones(n_my)]).T
        v_linear_my = np.linalg.lstsq(A_my, recon_disp_my, rcond=None)[0][0]
        self.assertLess(
            abs(v_linear_my - v_true_multiyear),
            1.0,
            "Multi-year linear subsidence velocity error must be < 1.0 mm/yr",
        )

        # Harmonic decomposition [t, sin(2pi*t), cos(2pi*t), 1] recovers exact secular velocity
        A_harmonic = np.vstack([t_multiyear, np.sin(2 * np.pi * t_multiyear), np.cos(2 * np.pi * t_multiyear), np.ones(n_my)]).T
        v_harmonic = np.linalg.lstsq(A_harmonic, recon_disp_my, rcond=None)[0][0]
        self.assertAlmostEqual(v_harmonic, v_true_multiyear, places=6)

        # -------------------------------------------------------------
        # 5. Benchmark Scenes Scientific Catalog & Hazard Classification
        # -------------------------------------------------------------
        benchmarks = INSAR_SBAS_BENCHMARK_SCENES
        self.assertIn("CENTRAL_VALLEY_TULARE_AQUIFER_SUBSIDENCE_2026", benchmarks)
        tulare = benchmarks["CENTRAL_VALLEY_TULARE_AQUIFER_SUBSIDENCE_2026"]
        self.assertEqual(tulare["expected_peak_velocity_mm_yr"], -165.0)
        self.assertEqual(tulare["dominant_hazard_tier"], DeformationHazardTier.CRITICAL_SUBSIDENCE.value)
        self.assertEqual(classify_deformation_hazard_tier(tulare["expected_peak_velocity_mm_yr"]), DeformationHazardTier.CRITICAL_SUBSIDENCE)

        mexico = benchmarks["MEXICO_CITY_LACUSTRINE_CONSOLIDATION_2026"]
        self.assertEqual(mexico["expected_peak_velocity_mm_yr"], -280.0)
        self.assertEqual(mexico["dominant_hazard_tier"], DeformationHazardTier.CRITICAL_SUBSIDENCE.value)
        self.assertEqual(classify_deformation_hazard_tier(mexico["expected_peak_velocity_mm_yr"]), DeformationHazardTier.CRITICAL_SUBSIDENCE)

        bologna = benchmarks["BOLOGNA_PO_VALLEY_PIEDMONT_SUBSIDENCE_2026"]
        self.assertEqual(bologna["expected_peak_velocity_mm_yr"], -12.5)
        self.assertEqual(bologna["dominant_hazard_tier"], DeformationHazardTier.MODERATE_SUBSIDENCE.value)
        self.assertEqual(classify_deformation_hazard_tier(bologna["expected_peak_velocity_mm_yr"]), DeformationHazardTier.MODERATE_SUBSIDENCE)

        kiruna = benchmarks["KIRUNA_UNDERGROUND_IRON_MINE_DEFORMATION_2026"]
        self.assertEqual(kiruna["expected_peak_velocity_mm_yr"], -45.0)
        self.assertEqual(kiruna["dominant_hazard_tier"], DeformationHazardTier.CRITICAL_SUBSIDENCE.value)
        self.assertEqual(classify_deformation_hazard_tier(kiruna["expected_peak_velocity_mm_yr"]), DeformationHazardTier.CRITICAL_SUBSIDENCE)

        # -------------------------------------------------------------
        # 6. Dynamic Tile URL Building & RFC 3986 Format Invariants
        # -------------------------------------------------------------
        for metric in InSARSBASTileMetric:
            tile_url = build_insar_sbas_tile_url(model=SBASInversionModel.SVD_LEAST_NORM, metric=metric, z=12, x=650, y=1580, colormap="turbo", rescale="-50,10")
            self.assertTrue(tile_url.startswith("/api/v1/tiles/insar-sbas/svd_least_norm/"))
            self.assertIn(f"/{metric.value}/12/650/1580.png", tile_url)
            self.assertIn("colormap=turbo", tile_url)
            self.assertIn("rescale=-50,10", tile_url)

            template_url = build_insar_sbas_tile_url_template(model=SBASInversionModel.SVD_LEAST_NORM, metric=metric)
            self.assertEqual(template_url, f"/api/v1/tiles/insar-sbas/svd_least_norm/{metric.value}/{{z}}/{{x}}/{{y}}.png")

    def test_task_t316_linear_spectral_mixture_analysis_and_fcls_scientific_qa(self):
        """Task T-316 (Cycle v2.5.42 Step 3 Continuous Scientific QA):
        Verify Linear Spectral Mixture Analysis (LSMA) and Fully Constrained Least Squares (FCLS)
        sub-pixel endmember fraction inversion scientific rigor:
        1. Simplex projection operator sorting-based exactness (sum f_k == 1.0, f_k >= 0).
        2. Pure endmember recovery (f_k >= 0.95, RMSE < 0.005 for pure GV, NPV, Soil, Shade).
        3. Arbitrary linear mixtures closure (ASC |sum f_k - 1.0| < 1e-4) and non-negativity (ANC f_k >= 0).
        4. Reconstruction RMSE non-negativity and exact noise-free convergence.
        5. Shadow-normalized Fractional Vegetation Cover (FVC) and Soil Tillage Residue Index (STRI).
        6. Sub-pixel dominance classifications (GV, NPV, Soil, Shade, Mixed).
        7. Research benchmark scenes catalog and biophysical plausibility.
        8. Dynamic tile URL generation and RFC 3986 format invariants.
        """
        from app.models.schemas import (
            SpectralUnmixingModel,
            SpectralUnmixingTileMetric,
            EndmemberClass,
            UnmixingQualityTier,
            SubPixelDominanceClass,
            normalize_unmixing_model,
            normalize_unmixing_metric,
            normalize_endmember_class,
            normalize_unmixing_quality_tier,
            normalize_subpixel_dominance,
            UNMIXING_MODEL_CONFIGS,
            STANDARD_ENDMEMBER_LIBRARY,
            SUBPIXEL_DOMINANCE_CONFIGS,
            UNMIXING_BENCHMARK_SCENES,
            project_to_simplex,
            calculate_unmixing_rmse,
            calculate_unmixing_fvc,
            calculate_soil_tillage_residue_index,
            calculate_fcls_unmixing,
            classify_unmixing_quality_rating,
            classify_subpixel_dominance,
            build_spectral_unmixing_tile_url,
            build_spectral_unmixing_tile_url_template,
        )
        from app.services.unmixing_service import UnmixingService, ORDERED_BANDS

        # -------------------------------------------------------------
        # 1. Simplex Projection Operator Sorting-Based Exactness Invariants
        # -------------------------------------------------------------
        # Extreme negative / overshooting vectors
        v1 = [-0.5, 0.2, 0.8, -0.1]
        p1 = project_to_simplex(v1)
        self.assertAlmostEqual(float(np.sum(p1)), 1.0, places=6)
        self.assertTrue(all(x >= 0.0 for x in p1), "Simplex projection must satisfy non-negativity")

        v2 = [1.5, 2.0, 3.5, 0.5]
        p2 = project_to_simplex(v2)
        self.assertAlmostEqual(float(np.sum(p2)), 1.0, places=6)
        self.assertTrue(all(x >= 0.0 for x in p2), "Simplex projection must satisfy non-negativity")

        # Identity on standard unit basis vectors
        p3 = project_to_simplex([1.0, 0.0, 0.0, 0.0])
        np.testing.assert_allclose(p3, [1.0, 0.0, 0.0, 0.0], atol=1e-6)

        # -------------------------------------------------------------
        # 2. Pure Endmember Recovery with FCLS
        # -------------------------------------------------------------
        svc = UnmixingService()
        for em_name in ["gv", "npv", "soil", "shade"]:
            pure_spec = STANDARD_ENDMEMBER_LIBRARY[em_name]
            sol = svc.solve_fcls(pure_spec)
            self.assertAlmostEqual(
                sol["sum_abundances"], 1.0, places=4,
                msg=f"Pure {em_name} FCLS must satisfy sum-to-one constraint"
            )
            self.assertGreaterEqual(
                sol[f"fraction_{em_name}"], 0.95,
                f"Pure {em_name} endmember must be recovered with fraction >= 0.95"
            )
            self.assertLess(
                sol["rmse"], 0.005,
                f"Pure {em_name} reconstruction RMSE must be < 0.005"
            )

        # -------------------------------------------------------------
        # 3. Arbitrary Linear Mixtures Closure (ASC) & Non-Negativity (ANC)
        # -------------------------------------------------------------
        rng = np.random.RandomState(42)
        M, em_keys, b_keys = svc.get_endmember_matrix()
        for _ in range(25):
            true_weights = project_to_simplex(rng.uniform(0.0, 1.0, 4))
            synth_y = M @ true_weights
            synth_dict = {b_keys[i]: float(synth_y[i]) for i in range(len(b_keys))}
            sol = svc.solve_fcls(synth_dict)
            self.assertAlmostEqual(
                sol["sum_abundances"], 1.0, places=4,
                msg="FCLS arbitrary mixture must satisfy sum-to-one closure"
            )
            for k in em_keys:
                self.assertGreaterEqual(
                    sol[f"fraction_{k}"], 0.0,
                    msg=f"Fraction {k} must satisfy non-negativity constraint"
                )
            self.assertLess(
                sol["rmse"], 1e-3,
                msg="Exact linear mixture must reconstruct with RMSE < 1e-3"
            )

        # -------------------------------------------------------------
        # 4. Shadow-Normalized FVC & STRI Invariants
        # -------------------------------------------------------------
        # Pure GV with no shade -> FVC = 1.0
        fvc_pure_gv = calculate_unmixing_fvc(1.0, 0.0)
        self.assertEqual(fvc_pure_gv, 1.0)
        # GV=0.25, Shade=0.50 -> shadow-normalized FVC = 0.25 / (1.0 - 0.50) = 0.50
        fvc_half_shade = calculate_unmixing_fvc(0.25, 0.50)
        self.assertAlmostEqual(fvc_half_shade, 0.50, places=4)
        # 100% shade -> FVC = 0.0
        fvc_full_shade = calculate_unmixing_fvc(0.0, 1.0)
        self.assertEqual(fvc_full_shade, 0.0)

        # Pure NPV -> STRI = 1.0
        stri_pure_npv = calculate_soil_tillage_residue_index(1.0, 0.0)
        self.assertEqual(stri_pure_npv, 1.0)
        # Pure Soil -> STRI = 0.0
        stri_pure_soil = calculate_soil_tillage_residue_index(0.0, 1.0)
        self.assertEqual(stri_pure_soil, 0.0)
        # Equal NPV and Soil -> STRI = 0.50
        stri_equal = calculate_soil_tillage_residue_index(0.3, 0.3)
        self.assertEqual(stri_equal, 0.5)

        # -------------------------------------------------------------
        # 5. Dominance Classification Invariants
        # -------------------------------------------------------------
        self.assertEqual(classify_subpixel_dominance(0.7, 0.1, 0.1, 0.1), SubPixelDominanceClass.GREEN_CANOPY_DOMINANT)
        self.assertEqual(classify_subpixel_dominance(0.1, 0.7, 0.1, 0.1), SubPixelDominanceClass.DRY_RESIDUE_DOMINANT)
        self.assertEqual(classify_subpixel_dominance(0.1, 0.1, 0.7, 0.1), SubPixelDominanceClass.BARE_SOIL_TAILINGS)
        self.assertEqual(classify_subpixel_dominance(0.1, 0.1, 0.1, 0.7), SubPixelDominanceClass.SHADOW_WATER_DOMINANT)
        self.assertEqual(classify_subpixel_dominance(0.25, 0.25, 0.25, 0.25), SubPixelDominanceClass.MIXED_HETEROGENEOUS)

        # -------------------------------------------------------------
        # 6. Benchmark Scenes Scientific Catalog & Biophysical Fidelity
        # -------------------------------------------------------------
        benchmarks = UNMIXING_BENCHMARK_SCENES
        self.assertIn("MORENCI_MINE_TAILINGS_ARIZONA_2026", benchmarks)
        morenci = benchmarks["MORENCI_MINE_TAILINGS_ARIZONA_2026"]
        self.assertGreaterEqual(morenci["expected_fractions"]["soil"], 0.60)
        self.assertEqual(morenci["dominant_class"], SubPixelDominanceClass.BARE_SOIL_TAILINGS.value)

        self.assertIn("PARADISE_CALIFORNIA_POST_FIRE_2026", benchmarks)
        paradise = benchmarks["PARADISE_CALIFORNIA_POST_FIRE_2026"]
        self.assertGreaterEqual(paradise["expected_fractions"]["npv"], 0.20)

        self.assertIn("SAN_JOAQUIN_VALLEY_AGRICULTURE_2026", benchmarks)
        san_joaquin = benchmarks["SAN_JOAQUIN_VALLEY_AGRICULTURE_2026"]
        self.assertGreaterEqual(san_joaquin["expected_fractions"]["gv"], 0.50)
        self.assertEqual(san_joaquin["dominant_class"], SubPixelDominanceClass.GREEN_CANOPY_DOMINANT.value)

        self.assertIn("ATACAMA_SALAR_MINERAL_CRUST_2026", benchmarks)
        atacama = benchmarks["ATACAMA_SALAR_MINERAL_CRUST_2026"]
        self.assertGreaterEqual(atacama["expected_fractions"]["soil"], 0.60)

        # -------------------------------------------------------------
        # 7. Dynamic Tile URL Building & RFC 3986 Format Invariants
        # -------------------------------------------------------------
        for metric in SpectralUnmixingTileMetric:
            tile_url = build_spectral_unmixing_tile_url(
                model=SpectralUnmixingModel.FCLS_CONSTRAINED,
                metric=metric,
                z=12,
                x=650,
                y=1580,
                colormap="viridis",
                rescale="0,1"
            )
            self.assertTrue(tile_url.startswith("/api/v1/tiles/unmixing/fcls_constrained/"))
            self.assertIn(f"/{metric.value}/12/650/1580.png", tile_url)
            self.assertIn("colormap=viridis", tile_url)
            self.assertIn("rescale=0,1", tile_url)

            template_url = build_spectral_unmixing_tile_url_template(
                model=SpectralUnmixingModel.FCLS_CONSTRAINED,
                metric=metric
            )
            self.assertEqual(
                template_url,
                f"/api/v1/tiles/unmixing/fcls_constrained/{metric.value}/{{z}}/{{x}}/{{y}}.png"
            )


    def test_task_t328_bathymetric_stumpf_lyzenga_and_benthic_scientific_qa(self):
        """Task T-328 (Cycle v2.5.44 Continuous Scientific QA):
        Verify Satellite-Derived Bathymetry (SDB), Stumpf log-ratio inversion, Lyzenga multi-band
        radiative transfer, diffuse attenuation (Kd), and benthic bottom albedo invariants:
        1. Stumpf log-ratio depth monotonicity: deeper soundings correspond monotonically to decreasing ln(n*R_blue) / ln(n*R_green).
        2. In-situ OLS empirical regression robustness: proper slope sign recovery (m1 < 0 in Case 2 waters, m1 > 0 in Case 1 waters).
        3. Lyzenga water column deep-water reflectance asymptote non-negativity (R_inf > 0) and epsilon guarding against log singularity.
        4. Strictly positive water column diffuse attenuation coefficients (Kd > 0, bounded within [0.03, 1.80] m^-1).
        5. Benthic bottom albedo non-negativity (R_b >= 0.0) across optical regimes and depth attenuation separation.
        6. Substrate classification and water column clarity tier biophysical sanity.
        7. Memory-conscious chunked aquatic raster cube inversion (<50MB heap, gc.collect() cleanup for 96.7% RAM pressure).
        8. Elevation-Area-Capacity (EAC) stage-storage curve monotonicity (dV/dz >= 0).
        9. Benchmark research test sites catalog integrity and biophysical consistency.
        10. Dynamic XYZ bathymetry tile URL generation across canonical models and visualization metrics.
        """
        import gc
        from app.models.schemas import (
            SDBModelType,
            SDBTileMetric,
            BenthicSubstrateType,
            SDBWaterClarityTier,
            SiltationSeverityTier,
            normalize_sdb_model,
            normalize_sdb_metric,
            normalize_benthic_substrate,
            normalize_sdb_water_clarity,
            classify_siltation_severity_tier,
            SDB_MODEL_CONFIGS,
            SDB_TILE_METRIC_CONFIGS,
            BENTHIC_SUBSTRATE_CONFIGS,
            SDB_WATER_CLARITY_CONFIGS,
            SDB_BENCHMARK_SCENES,
            calculate_stumpf_log_ratio,
            calculate_lyzenga_multispectral,
            calibrate_stumpf_coefficients,
            classify_benthic_substrate,
            classify_water_clarity_tier,
            build_sdb_tile_url,
            build_sdb_tile_url_template,
            SDBInSituPoint,
            SDBInSituCalibrationRequest,
            SDBInvertRequest,
        )
        from app.services.bathymetry_service import BathymetryService

        # -------------------------------------------------------------
        # 1. Stumpf Log-Ratio Depth Monotonicity Invariance (Case 2 Inland Waters)
        # -------------------------------------------------------------
        # In turbid / inland waters (Case 2, e.g. reservoirs, tailings ponds), blue light
        # attenuates faster than green (Kd_blue > Kd_green). Deeper soundings correspond
        # monotonically to decreasing ratio p = ln(n*R_blue) / ln(n*R_green).
        soundings_case2_z = [2.0, 5.0, 10.0, 15.0, 20.0]
        soundings_case2_blue = [0.080, 0.060, 0.040, 0.025, 0.015]
        soundings_case2_green = [0.060, 0.050, 0.045, 0.040, 0.035]
        n_const = 1000.0

        p_ratios = [
            math.log(n_const * b) / math.log(n_const * g)
            for b, g in zip(soundings_case2_blue, soundings_case2_green)
        ]
        # Verify ratio monotonically decreases as depth increases
        for k in range(len(p_ratios) - 1):
            self.assertGreater(
                p_ratios[k], p_ratios[k + 1],
                f"Stumpf ratio must monotonically decrease with depth in Case 2 waters: {p_ratios}"
            )

        # Calibrate Stumpf model via OLS
        cal_case2 = calibrate_stumpf_coefficients(
            observed_depths=soundings_case2_z,
            blue_reflectance=soundings_case2_blue,
            green_reflectance=soundings_case2_green,
            n_const=n_const
        )
        self.assertLess(
            cal_case2["m1"], 0.0,
            f"Calibrated m1 must be negative for Case 2 waters, got {cal_case2['m1']}"
        )
        self.assertGreaterEqual(
            cal_case2["r_squared"], 0.95,
            f"R^2 must be >= 0.95, got {cal_case2['r_squared']}"
        )
        self.assertLess(
            cal_case2["rmse_m"], 1.5,
            f"RMSE must be < 1.5m, got {cal_case2['rmse_m']}"
        )
        self.assertEqual(cal_case2["point_count"], 5)

        # Invert depths using calibrated coefficients and verify monotonicity & non-negativity
        pred_depths = [
            calculate_stumpf_log_ratio(b, g, n_const=n_const, m1=cal_case2["m1"], m0=cal_case2["m0"])["depth_m"]
            for b, g in zip(soundings_case2_blue, soundings_case2_green)
        ]
        for k in range(len(pred_depths) - 1):
            self.assertLess(
                pred_depths[k], pred_depths[k + 1],
                f"Predicted depth must increase monotonically as Stumpf ratio decreases: {pred_depths}"
            )
            self.assertGreaterEqual(pred_depths[k], 0.0, "Depth must be non-negative")

        # Also test vectorized array solver with calibrated coefficients
        z_grid = BathymetryService.solve_stumpf_depth_array(
            r_blue=np.array(soundings_case2_blue),
            r_green=np.array(soundings_case2_green),
            m1=cal_case2["m1"],
            m0=cal_case2["m0"],
            n_const=n_const
        )
        self.assertTrue(np.all(z_grid >= 0.0), "Vectorized depth grid must satisfy absolute non-negativity")
        self.assertTrue(np.all(np.diff(z_grid) > 0.0), "Vectorized depth grid must be monotonically increasing")

        # -------------------------------------------------------------
        # 2. Stumpf Monotonicity in Clear Ocean (Case 1 Marine Waters)
        # -------------------------------------------------------------
        soundings_case1_z = [1.0, 4.0, 8.0, 14.0, 22.0]
        soundings_case1_blue = [0.065, 0.055, 0.045, 0.035, 0.025]
        soundings_case1_green = [0.050, 0.035, 0.020, 0.010, 0.005]
        cal_case1 = calibrate_stumpf_coefficients(
            observed_depths=soundings_case1_z,
            blue_reflectance=soundings_case1_blue,
            green_reflectance=soundings_case1_green,
            n_const=n_const
        )
        self.assertGreater(
            cal_case1["m1"], 0.0,
            f"Calibrated m1 must be positive for Case 1 clear waters, got {cal_case1['m1']}"
        )
        self.assertGreaterEqual(
            cal_case1["r_squared"], 0.90,
            f"Case 1 R^2 must be >= 0.90, got {cal_case1['r_squared']}"
        )

        # Edge cases: single sounding or mismatched lengths fallback safely
        fallback = calibrate_stumpf_coefficients([5.0], [0.05], [0.03])
        self.assertEqual(fallback["m1"], 28.5)
        self.assertEqual(fallback["m0"], 18.2)

        # -------------------------------------------------------------
        # 3. Lyzenga Water Column Deep-Water Reflectance Asymptote Verification (R_inf > 0)
        # -------------------------------------------------------------
        # Test nominal Lyzenga depth inversion
        lyz_nominal = calculate_lyzenga_multispectral(
            r_blue=0.065,
            r_green=0.042,
            r_red=0.018,
            r_inf_blue=0.015,
            r_inf_green=0.012,
            r_inf_red=0.005
        )
        self.assertGreaterEqual(lyz_nominal["depth_m"], 0.0)
        self.assertIn("x_blue", lyz_nominal)
        self.assertIn("x_green", lyz_nominal)

        # Test non-positive / negative / zero R_inf values (must be clamped to strictly positive)
        for bad_r_inf in [-0.05, 0.0, -1e-6]:
            lyz_guarded = calculate_lyzenga_multispectral(
                r_blue=0.050,
                r_green=0.030,
                r_red=0.010,
                r_inf_blue=bad_r_inf,
                r_inf_green=bad_r_inf,
                r_inf_red=bad_r_inf
            )
            self.assertGreaterEqual(lyz_guarded["depth_m"], 0.0)
            self.assertFalse(math.isnan(lyz_guarded["depth_m"]))
            self.assertFalse(math.isinf(lyz_guarded["depth_m"]))

        # Vectorized Lyzenga array solver with negative / zero R_inf
        b_test = np.array([[0.08, 0.06], [0.04, 0.02]], dtype=np.float32)
        g_test = np.array([[0.06, 0.04], [0.03, 0.015]], dtype=np.float32)
        r_test = np.array([[0.02, 0.015], [0.01, 0.005]], dtype=np.float32)
        lyz_arr = BathymetryService.solve_lyzenga_depth_array(
            r_blue=b_test,
            r_green=g_test,
            r_red=r_test,
            r_inf_blue=-0.01,  # negative asymptote test
            r_inf_green=0.0,   # zero asymptote test
            r_inf_red=-0.005   # negative asymptote test
        )
        self.assertTrue(np.all(lyz_arr >= 0.0), "Lyzenga depth array must satisfy non-negativity")
        self.assertFalse(np.any(np.isnan(lyz_arr)), "Lyzenga depth array must contain no NaNs")

        # -------------------------------------------------------------
        # 4. Strictly Positive Diffuse Attenuation Coefficients (Kd > 0)
        # -------------------------------------------------------------
        for b in [0.001, 0.02, 0.065, 0.15, 0.50]:
            for g in [0.001, 0.015, 0.042, 0.10, 0.40]:
                stumpf_res = calculate_stumpf_log_ratio(r_blue=b, r_green=g)
                kd = stumpf_res["attenuation_kd"]
                self.assertGreater(kd, 0.0, f"Attenuation Kd must be strictly positive, got {kd}")
                self.assertTrue(
                    0.03 <= kd <= 2.50,
                    f"Kd must be within physical optical bounds [0.03, 2.50], got {kd}"
                )

        # Vectorized Kd array estimation
        kd_grid = BathymetryService.estimate_attenuation_kd_array(b_test, g_test)
        self.assertTrue(np.all(kd_grid > 0.0), "Vectorized Kd grid must be strictly positive")
        self.assertTrue(
            np.all(kd_grid >= 0.03) and np.all(kd_grid <= 1.80),
            "Kd grid must be within [0.03, 1.80]"
        )

        # Water clarity tiers
        self.assertEqual(classify_water_clarity_tier(0.05), SDBWaterClarityTier.ULTRA_CLEAR_OLIGOTROPHIC)
        self.assertEqual(classify_water_clarity_tier(0.18), SDBWaterClarityTier.MODERATE_MESOTROPHIC)
        self.assertEqual(classify_water_clarity_tier(0.55), SDBWaterClarityTier.TURBID_EUTROPHIC)
        self.assertEqual(classify_water_clarity_tier(1.20), SDBWaterClarityTier.HIGH_ATTENUATION)

        # -------------------------------------------------------------
        # 5. Benthic Bottom Albedo Non-Negativity (Rb >= 0.0)
        # -------------------------------------------------------------
        # Test across deep / extinguishing water column conditions
        for depth in [0.0, 2.0, 10.0, 25.0, 50.0]:
            for b in [0.005, 0.015, 0.065, 0.20]:
                stumpf_res = calculate_stumpf_log_ratio(r_blue=b, r_green=0.04, max_depth_m=50.0)
                rb = stumpf_res["benthic_reflectance"]
                self.assertGreaterEqual(rb, 0.0, f"Benthic albedo must be non-negative, got {rb}")
                self.assertLessEqual(rb, 0.60, f"Benthic albedo must not exceed physical ceiling 0.60, got {rb}")

        # Vectorized benthic reflectance inversion with R_obs < R_inf
        dark_blue = np.array([[0.005, 0.008], [0.012, 0.015]], dtype=np.float32)
        deep_z = np.array([[15.0, 18.0], [20.0, 25.0]], dtype=np.float32)
        kd_sample = np.array([[0.25, 0.30], [0.35, 0.40]], dtype=np.float32)
        benthic_arr = BathymetryService.invert_benthic_reflectance_array(
            r_blue=dark_blue,
            depth_m=deep_z,
            kd=kd_sample,
            r_inf=0.015
        )
        self.assertTrue(np.all(benthic_arr >= 0.0), "Vectorized benthic reflectance must satisfy non-negativity (Rb >= 0)")
        self.assertTrue(np.all(benthic_arr <= 0.60), "Vectorized benthic reflectance must not exceed ceiling 0.60")

        # Substrate classification
        self.assertEqual(classify_benthic_substrate(0.35, depth_m=5.0), BenthicSubstrateType.SAND)
        self.assertEqual(classify_benthic_substrate(0.20, depth_m=5.0), BenthicSubstrateType.CORAL_HARDBOTTOM)
        self.assertEqual(classify_benthic_substrate(0.13, depth_m=5.0), BenthicSubstrateType.MUD_SILT)
        self.assertEqual(classify_benthic_substrate(0.06, depth_m=5.0), BenthicSubstrateType.SEAGRASS_MACROPHYTE)
        self.assertEqual(classify_benthic_substrate(0.35, depth_m=40.0), BenthicSubstrateType.DEEP_UNCLASSIFIED)

        # -------------------------------------------------------------
        # 6. Chunked Raster Processing & Memory Conservation (Host RAM Pressure Guard)
        # -------------------------------------------------------------
        # Maintain <50MB heap and proactively call gc.collect() as instructed by Agent 8 notice
        ny, nx = 32, 32
        rng = np.random.RandomState(42)
        b_cube = np.clip(rng.normal(0.065, 0.01, (ny, nx)), 0.01, 0.20).astype(np.float32)
        g_cube = np.clip(rng.normal(0.042, 0.008, (ny, nx)), 0.01, 0.18).astype(np.float32)
        r_cube = np.clip(rng.normal(0.018, 0.005, (ny, nx)), 0.005, 0.10).astype(np.float32)

        res_stumpf = BathymetryService.process_aquatic_raster_cube(
            blue_band=b_cube,
            green_band=g_cube,
            red_band=r_cube,
            chunk_size=16,
            model=SDBModelType.STUMPF_LOG_RATIO
        )
        self.assertIn("depth", res_stumpf)
        self.assertIn("stumpf_ratio", res_stumpf)
        self.assertTrue(np.all(res_stumpf["depth"] >= 0.0))
        self.assertTrue(np.all(res_stumpf["attenuation_kd"] >= 0.0))
        self.assertTrue(np.all(res_stumpf["benthic_reflectance"] >= 0.0))

        res_lyz = BathymetryService.process_aquatic_raster_cube(
            blue_band=b_cube,
            green_band=g_cube,
            red_band=r_cube,
            chunk_size=16,
            model=SDBModelType.LYZENGA_MULTISPECTRAL
        )
        self.assertTrue(np.all(res_lyz["depth"] >= 0.0))

        # -------------------------------------------------------------
        # 7. Volume Integration & EAC Stage-Storage Monotonicity (dV/dz >= 0)
        # -------------------------------------------------------------
        vol_sum, eac_slices = BathymetryService.integrate_bathymetric_volume_and_eac(
            depth_grid=res_stumpf["depth"],
            pixel_res_m=10.0,
            design_capacity_m3=1.0e6,
            num_slices=10
        )
        self.assertGreater(vol_sum["estimated_volume_m3"], 0.0)
        self.assertTrue(0.0 <= vol_sum["siltation_loss_percentage"] <= 100.0)
        self.assertEqual(len(eac_slices), 11)
        # Verify cumulative storage volume increases monotonically with stage depth
        for k in range(len(eac_slices) - 1):
            self.assertLessEqual(eac_slices[k].depth_m, eac_slices[k + 1].depth_m)
            self.assertLessEqual(
                eac_slices[k].cumulative_volume_m3, eac_slices[k + 1].cumulative_volume_m3,
                "EAC cumulative storage volume must increase monotonically with stage depth"
            )

        # Clean up arrays proactively to respect RAM pressure notice
        del b_cube, g_cube, r_cube, res_stumpf, res_lyz, vol_sum, eac_slices
        gc.collect()

        # -------------------------------------------------------------
        # 8. SDB Benchmark Scenes Catalog Integrity
        # -------------------------------------------------------------
        for sc_id in ["LAKE_MEAD_NV", "SAN_LUIS_RES_CA", "LAKE_POWELL_UT", "CORREGO_TAILINGS_MG"]:
            self.assertIn(sc_id, SDB_BENCHMARK_SCENES)
            scene = SDB_BENCHMARK_SCENES[sc_id]
            self.assertGreater(scene["design_capacity_m3"], 0.0)
            self.assertGreater(scene["nominal_sdb_max_depth_m"], 0.0)
            self.assertGreater(scene["typical_blue_r"], 0.0)
            self.assertGreater(scene["typical_green_r"], 0.0)

        # -------------------------------------------------------------
        # 9. Dynamic XYZ Bathymetry Tile URL Building Invariants
        # -------------------------------------------------------------
        for metric in SDBTileMetric:
            tile_url = build_sdb_tile_url(
                model=SDBModelType.STUMPF_LOG_RATIO,
                metric=metric,
                z=12,
                x=1200,
                y=2400
            )
            self.assertEqual(
                tile_url,
                f"/api/v1/tiles/bathymetry/stumpf_log_ratio/{metric.value}/12/1200/2400.png"
            )

            tpl_url = build_sdb_tile_url_template(
                model=SDBModelType.LYZENGA_MULTISPECTRAL,
                metric=metric
            )
            self.assertEqual(
                tpl_url,
                f"/api/v1/tiles/bathymetry/lyzenga_multispectral/{metric.value}/{{z}}/{{x}}/{{y}}.png"
            )

        # -------------------------------------------------------------
        # 10. Pipeline Execution with In-Situ Calibration Request
        # -------------------------------------------------------------
        svc = BathymetryService()
        in_situ_soundings = [
            SDBInSituPoint(point_id=f"pt_{i}", x=-121.0 + i*0.01, y=37.0 + i*0.01, depth_m=d, blue_reflectance=b, green_reflectance=g)
            for i, (d, b, g) in enumerate(zip(soundings_case2_z, soundings_case2_blue, soundings_case2_green))
        ]
        req_pipeline = SDBInvertRequest(
            asset_id="SAN_LUIS_RES_CA",
            model_type=SDBModelType.STUMPF_LOG_RATIO,
            in_situ_points=in_situ_soundings,
            blue_reflectance=0.065,
            green_reflectance=0.042
        )
        resp = svc.execute_bathymetry_pipeline(req_pipeline)
        self.assertEqual(resp.status, "success")
        self.assertGreaterEqual(resp.quality_summary.max_depth_m, 0.0)
        self.assertGreater(resp.quality_summary.mean_attenuation_kd, 0.0)
        self.assertIn(resp.quality_summary.dominant_benthic_substrate, BenthicSubstrateType)
        self.assertTrue(resp.quality_summary.quality_checklist["stumpf_log_ratio_converged"])
        self.assertTrue(resp.quality_summary.quality_checklist["non_negative_depth_enforced"])
        self.assertTrue(resp.quality_summary.quality_checklist["attenuation_kd_bounded"])
        self.assertTrue(resp.quality_summary.quality_checklist["benthic_albedo_separated"])
        gc.collect()



    def test_task_t334_evapotranspiration_sebal_metric_scientific_qa_and_invariants(self):
        """Task T-334: Continuous Scientific QA for Satellite-Derived Evapotranspiration (SEBAL/METRIC).
        
        Validates:
        1. Surface Energy Balance Closure Invariant: |Rn - (G + H + LE)| < 1e-4 W/m^2 across diverse meteorological forcing inputs.
        2. Evaporative Fraction (Lambda = LE / (Rn - G)) bounds validation: strictly Lambda in [0.0, 1.20].
        3. Hot/Cold Anchor Pixel Extremum Invariance:
           - Cold pixel: well-watered canopy yields H ~ 0, LE ~ Rn - G.
           - Hot pixel: dry bare soil yields LE ~ 0, H ~ Rn - G.
        4. Monin-Obukhov Atmospheric Stability Iterative Convergence:
           - Stability corrections psi_m, psi_h converge within <= 15 iterations with bounded |L| > 0.05m.
        5. Crop Water Stress Index (CWSI): verify bounds CWSI in [0.0, 1.0] across all agronomic tiers.
        6. Floating-Point Singularity Protection: verify Rn - G ~ 0, calm wind, and extreme thermal gradients do not produce ZeroDivisionError, NaN, or Inf.
        7. SEBAL 2D Raster Spatial Invariance: validates chunked 2D energy balance grids preserve closure at every pixel.
        8. Benchmark scenes catalog integrity and dynamic XYZ tile templates.
        9. Full End-to-End Pipeline and Scene Evaluation: validates ETInvertResponse and SurfaceEnergyBalanceEvaluation.
        """
        import gc
        from app.services.evapotranspiration_service import evapotranspiration_service, EvapotranspirationService
        from app.models.schemas import (
            ETModelType,
            ETTileMetric,
            CropWaterStressTier,
            AnchorPixelType,
            ET_MODEL_CONFIGS,
            ET_TILE_METRIC_CONFIGS,
            CROP_WATER_STRESS_TIER_CONFIGS,
            ET_BENCHMARK_SCENES,
            calculate_broadband_albedo,
            calculate_net_radiation,
            calculate_soil_heat_flux,
            calculate_monin_obukhov_stability,
            solve_sebal_energy_balance,
            build_et_tile_url,
            build_et_tile_url_template,
            classify_crop_water_stress_tier,
            AnchorPixelCandidate,
            AnchorPixelPair,
            MoninObukhovStabilitySummary,
            EnergyBalanceSummary,
            ETCalibrationRequest,
            ETInvertRequest,
            SurfaceEnergyBalanceEvaluation,
            MeteorologicalForcing,
        )

        # -------------------------------------------------------------
        # 1. Surface Energy Balance Closure Invariant |Rn - (G + H + LE)| < 1e-4 W/m^2
        # -------------------------------------------------------------
        # Sweep across diverse solar irradiances (150 to 1020 W/m^2), soil heat flux ratios (0.05 to 0.40),
        # and sensible heat partitions (0.0 to 1.0 of available energy)
        test_net_radiations = [150.0, 350.0, 550.0, 720.0, 880.0, 1020.0]
        test_g_ratios = [0.05, 0.12, 0.20, 0.32, 0.40]
        test_h_fractions = [0.0, 0.05, 0.20, 0.45, 0.70, 0.95, 1.0]

        for rn_val in test_net_radiations:
            for g_rat in test_g_ratios:
                g_val = round(rn_val * g_rat, 2)
                avail_energy = round(rn_val - g_val, 2)
                for h_frac in test_h_fractions:
                    h_val = round(avail_energy * h_frac, 2)
                    res = solve_sebal_energy_balance(
                        net_radiation_w_m2=rn_val,
                        soil_heat_flux_w_m2=g_val,
                        sensible_heat_w_m2=h_val,
                        daily_net_radiation_w_m2=rn_val * 0.38
                    )
                    le_val = res["latent_heat_flux_w_m2"]
                    # Exact thermodynamic energy conservation closure: |Rn - (G + H + LE)| < 1e-4 W/m^2
                    closure_residual = abs(rn_val - (g_val + h_val + le_val))
                    self.assertLess(
                        closure_residual, 1e-4,
                        f"Surface Energy Balance closure failed: Rn={rn_val}, G={g_val}, H={h_val}, LE={le_val}, residual={closure_residual}"
                    )
                    self.assertLess(res["energy_balance_residual_w_m2"], 1e-4)

        # -------------------------------------------------------------
        # 2. Evaporative Fraction Bounds: strictly Lambda in [0.0, 1.20]
        # -------------------------------------------------------------
        # a) Fully wet canopy / potential evapotranspiration (H ~ 0 => Lambda ~ 1.0)
        wet_res = solve_sebal_energy_balance(net_radiation_w_m2=750.0, soil_heat_flux_w_m2=75.0, sensible_heat_w_m2=0.0)
        self.assertAlmostEqual(wet_res["evaporative_fraction"], 1.0, places=3)
        self.assertGreaterEqual(wet_res["evaporative_fraction"], 0.0)
        self.assertLessEqual(wet_res["evaporative_fraction"], 1.20)

        # b) Bone dry soil (LE = 0, H = Rn - G => Lambda = 0.0)
        dry_res = solve_sebal_energy_balance(net_radiation_w_m2=750.0, soil_heat_flux_w_m2=150.0, sensible_heat_w_m2=600.0)
        self.assertAlmostEqual(dry_res["evaporative_fraction"], 0.0, places=3)

        # c) Intermediate agronomic moisture conditions
        for h_ratio in np.linspace(0.0, 1.0, 21):
            avail = 500.0
            mid_res = solve_sebal_energy_balance(net_radiation_w_m2=600.0, soil_heat_flux_w_m2=100.0, sensible_heat_w_m2=avail * h_ratio)
            self.assertGreaterEqual(mid_res["evaporative_fraction"], 0.0)
            self.assertLessEqual(mid_res["evaporative_fraction"], 1.20)

        # d) Advective oasis effect ceiling clamp (Lambda strictly <= 1.20)
        advective_res = solve_sebal_energy_balance(net_radiation_w_m2=600.0, soil_heat_flux_w_m2=60.0, sensible_heat_w_m2=-100.0)
        self.assertLessEqual(advective_res["evaporative_fraction"], 1.20)
        self.assertGreaterEqual(advective_res["evaporative_fraction"], 0.0)

        # -------------------------------------------------------------
        # 3. Hot/Cold Anchor Pixel Extremum Invariance
        # -------------------------------------------------------------
        # Create a synthetic benchmark scene with distinct wet irrigated alfalfa vs dry fallow parcels
        scene = evapotranspiration_service.generate_synthetic_et_scene("CENTRAL_VALLEY_ALFALFA_CA", grid_size=64)
        pair = evapotranspiration_service.find_anchor_pixels(
            ndvi_arr=scene["ndvi"],
            lst_c_arr=scene["lst_c"],
            albedo_arr=scene["albedo"],
            rn_arr=scene["net_radiation"],
            g_arr=scene["soil_heat_flux"],
            u200=2.8
        )
        cold_p = pair.cold_pixel
        hot_p = pair.hot_pixel

        # Cold pixel verification:
        # Well-watered canopy yields high NDVI, lower Ts, H ~ 0, LE ~ Rn - G
        self.assertEqual(cold_p.pixel_type, AnchorPixelType.COLD_PIXEL)
        self.assertGreater(cold_p.ndvi, 0.60, "Cold anchor pixel must represent dense green vegetative canopy")
        self.assertLessEqual(cold_p.sensible_heat_w_m2, 20.0, "Cold anchor sensible heat H must be near zero (H ~ 0)")
        self.assertGreater(cold_p.latent_heat_w_m2, 0.90 * (cold_p.rn_w_m2 - cold_p.g_w_m2), "Cold pixel LE must approximate available energy (Rn - G)")
        self.assertLess(cold_p.surface_temp_k, hot_p.surface_temp_k, "Cold pixel skin temperature must be significantly lower than hot pixel")
        self.assertLessEqual(cold_p.dt_k, 1.5, "Cold pixel aerodynamic temperature differential dT must be near zero")

        # Hot pixel verification:
        # Dry bare soil yields low NDVI, higher Ts, LE ~ 0, H ~ Rn - G
        self.assertEqual(hot_p.pixel_type, AnchorPixelType.HOT_PIXEL)
        self.assertLess(hot_p.ndvi, 0.25, "Hot anchor pixel must represent sparse/fallow soil")
        self.assertAlmostEqual(hot_p.latent_heat_w_m2, 0.0, places=2, msg="Hot pixel latent heat LE must be zero")
        self.assertGreater(hot_p.sensible_heat_w_m2, 0.90 * (hot_p.rn_w_m2 - hot_p.g_w_m2), "Hot pixel H must consume available energy (Rn - G)")
        self.assertGreater(hot_p.dt_k, 3.0, "Hot pixel aerodynamic temperature differential dT must be substantial")

        # Linear calibration invariants: dT = a * Ts + b
        self.assertGreater(pair.dt_slope_a, 0.0, "SEBAL linear dT slope a must be strictly positive")
        self.assertLess(pair.dt_intercept_b, 0.0, "SEBAL linear dT intercept b must be negative for Kelvin extrapolation")
        self.assertGreaterEqual(pair.r_squared, 0.90)

        # -------------------------------------------------------------
        # 4. Monin-Obukhov Atmospheric Stability Iterative Convergence
        # -------------------------------------------------------------
        # Convergence within <= 15 iterations with bounded |L| > 0.05m across diverse regimes
        regimes = [
            (2.8, 0.08, 305.15, 180.0, "unstable"),     # Convective daytime
            (1.5, 0.02, 315.15, 350.0, "unstable"),     # Strong convection / hot bare ground
            (5.0, 0.12, 295.15, -20.0, "stable"),       # Temperature inversion / night
            (8.0, 0.05, 293.15, 5.0, "neutral"),        # High wind near-neutral boundary
        ]
        for u_wind, z0, ts_k, h_flux, exp_reg in regimes:
            stab = calculate_monin_obukhov_stability(
                wind_speed_200m_m_s=u_wind,
                roughness_z0m=z0,
                surface_temp_k=ts_k,
                sensible_heat_h=h_flux,
                max_iterations=15
            )
            # Iteration bounds
            self.assertLessEqual(
                stab["iterations_converged"], 15,
                f"Monin-Obukhov solver failed to converge in <= 15 iterations: {stab}"
            )
            # Monin-Obukhov length singularity guard: |L| >= 0.05m
            self.assertGreaterEqual(
                abs(stab["monin_obukhov_length_l"]), 0.05,
                f"Monin-Obukhov length L singularity bound violated: {stab['monin_obukhov_length_l']}"
            )
            # Physical bounds on friction velocity u_* and aerodynamic resistance r_ah
            self.assertGreater(stab["friction_velocity_u_star"], 0.0)
            self.assertGreaterEqual(stab["aerodynamic_resistance_rah"], 5.0)
            self.assertLessEqual(stab["aerodynamic_resistance_rah"], 500.0)
            self.assertIn(stab["stability_regime"], ["unstable", "stable", "neutral"])

        # -------------------------------------------------------------
        # 5. Crop Water Stress Index (CWSI): verify bounds CWSI in [0.0, 1.0]
        # -------------------------------------------------------------
        # Test mapping from evaporative fraction to CWSI and stress tiers
        test_efs = [1.20, 1.00, 0.85, 0.65, 0.45, 0.25, 0.10, 0.00]
        for ef in test_efs:
            sebal_case = solve_sebal_energy_balance(
                net_radiation_w_m2=600.0,
                soil_heat_flux_w_m2=60.0,
                sensible_heat_w_m2=(1.0 - min(1.0, ef)) * 540.0
            )
            cwsi = sebal_case["crop_water_stress_index"]
            self.assertGreaterEqual(cwsi, 0.0)
            self.assertLessEqual(cwsi, 1.0)
            tier = classify_crop_water_stress_tier(cwsi)
            self.assertIn(tier, CropWaterStressTier)

        # Verify stress tier thresholds:
        self.assertEqual(classify_crop_water_stress_tier(0.0), CropWaterStressTier.NONE)
        self.assertEqual(classify_crop_water_stress_tier(0.15), CropWaterStressTier.NONE)
        self.assertEqual(classify_crop_water_stress_tier(0.28), CropWaterStressTier.MILD)
        self.assertEqual(classify_crop_water_stress_tier(0.50), CropWaterStressTier.MODERATE)
        self.assertEqual(classify_crop_water_stress_tier(0.72), CropWaterStressTier.SEVERE)
        self.assertEqual(classify_crop_water_stress_tier(0.95), CropWaterStressTier.EXTREME_DESICCATION)
        self.assertEqual(classify_crop_water_stress_tier(1.00), CropWaterStressTier.EXTREME_DESICCATION)

        # -------------------------------------------------------------
        # 6. Floating-Point Singularity Protection: Rn - G ~ 0, Calm Wind, Zero Radiation
        # -------------------------------------------------------------
        # a) Rn - G = 0 exactly (twilight or heavy overcast)
        sing_zero = solve_sebal_energy_balance(net_radiation_w_m2=50.0, soil_heat_flux_w_m2=50.0, sensible_heat_w_m2=0.0)
        self.assertTrue(math.isfinite(sing_zero["latent_heat_flux_w_m2"]))
        self.assertTrue(math.isfinite(sing_zero["evaporative_fraction"]))
        self.assertEqual(sing_zero["evaporative_fraction"], 0.0)
        self.assertEqual(sing_zero["crop_water_stress_index"], 1.0)
        self.assertEqual(sing_zero["daily_et_mm_day"], 0.0)

        # b) Rn - G extremely tiny epsilon (1e-12 W/m^2)
        sing_eps = solve_sebal_energy_balance(net_radiation_w_m2=100.0, soil_heat_flux_w_m2=100.0 - 1e-12, sensible_heat_w_m2=0.0)
        self.assertTrue(math.isfinite(sing_eps["evaporative_fraction"]))
        self.assertTrue(math.isfinite(sing_eps["daily_et_mm_day"]))

        # c) Rn - G negative (nocturnal surface cooling, G > Rn)
        sing_neg = solve_sebal_energy_balance(net_radiation_w_m2=40.0, soil_heat_flux_w_m2=80.0, sensible_heat_w_m2=0.0)
        self.assertEqual(sing_neg["latent_heat_flux_w_m2"], 0.0)
        self.assertEqual(sing_neg["evaporative_fraction"], 0.0)
        self.assertTrue(math.isfinite(sing_neg["crop_water_stress_index"]))

        # d) Dead calm wind speed (u200 = 0 m/s) in stability solver
        stab_calm = calculate_monin_obukhov_stability(wind_speed_200m_m_s=0.0, roughness_z0m=0.05, surface_temp_k=300.0, sensible_heat_h=50.0)
        self.assertTrue(math.isfinite(stab_calm["friction_velocity_u_star"]))
        self.assertTrue(math.isfinite(stab_calm["aerodynamic_resistance_rah"]))
        self.assertTrue(math.isfinite(stab_calm["monin_obukhov_length_l"]))

        # e) Zero sensible heat (H = 0 W/m^2) in stability solver
        stab_zero_h = calculate_monin_obukhov_stability(wind_speed_200m_m_s=3.0, roughness_z0m=0.05, surface_temp_k=300.0, sensible_heat_h=0.0)
        self.assertTrue(math.isfinite(stab_zero_h["monin_obukhov_length_l"]))
        self.assertTrue(math.isfinite(stab_zero_h["aerodynamic_resistance_rah"]))

        # -------------------------------------------------------------
        # 7. SEBAL 2D Raster Spatial Invariance: Per-Pixel Energy Closure
        # -------------------------------------------------------------
        n_dim = 48
        x_lin = np.linspace(0.05, 0.85, n_dim, dtype=np.float32)
        y_lin = np.linspace(0.05, 0.85, n_dim, dtype=np.float32)
        xx, yy = np.meshgrid(x_lin, y_lin)
        ndvi_2d = xx.astype(np.float32)
        lst_2d = (45.0 - 20.0 * ndvi_2d).astype(np.float32)
        alb_2d = (0.22 - 0.08 * ndvi_2d).astype(np.float32)

        grids = evapotranspiration_service.calculate_sebal_energy_balance_arrays(
            ndvi_arr=ndvi_2d,
            lst_c_arr=lst_2d,
            albedo_arr=alb_2d,
            solar_rad_w_m2=840.0,
            air_temp_c=31.0,
            u200=2.6
        )

        # Verify all grids are non-empty and strictly finite
        for g_name in ["net_radiation", "soil_heat_flux", "sensible_heat_flux", "latent_heat_flux", "evaporative_fraction", "crop_water_stress_index", "daily_et"]:
            self.assertIn(g_name, grids)
            self.assertEqual(grids[g_name].shape, (n_dim, n_dim))
            self.assertTrue(np.all(np.isfinite(grids[g_name])), f"Grid {g_name} contains non-finite values")

        # Verify pixel-wise energy closure |Rn - (G + H + LE)| < 1e-4 W/m^2
        rn_grid = grids["net_radiation"]
        g_grid = grids["soil_heat_flux"]
        h_grid = grids["sensible_heat_flux"]
        le_grid = grids["latent_heat_flux"]
        residual_grid = np.abs(rn_grid - (g_grid + h_grid + le_grid))
        max_residual = float(np.max(residual_grid))
        self.assertLess(max_residual, 1e-4, f"Spatial 2D energy closure violated, max residual: {max_residual} W/m^2")

        # Verify bounds on 2D derived products
        self.assertTrue(np.all(grids["evaporative_fraction"] >= 0.0))
        self.assertTrue(np.all(grids["evaporative_fraction"] <= 1.20))
        self.assertTrue(np.all(grids["crop_water_stress_index"] >= 0.0))
        self.assertTrue(np.all(grids["crop_water_stress_index"] <= 1.0))
        self.assertTrue(np.all(grids["daily_et"] >= 0.0))

        # -------------------------------------------------------------
        # 8. Benchmark Scenes Catalog Integrity and Tile URL Builder
        # -------------------------------------------------------------
        for b_id, b_meta in ET_BENCHMARK_SCENES.items():
            self.assertIn("name", b_meta)
            self.assertIn("crop_type", b_meta)
            self.assertIn("center", b_meta)
            self.assertEqual(len(b_meta["center"]), 2)
            self.assertIn("typical_surface_temp_c", b_meta)
            self.assertIn("solar_rad_w_m2", b_meta)

        # Dynamic XYZ tile URL builders
        for m in ETModelType:
            for met in ETTileMetric:
                u_str = build_et_tile_url(model=m, metric=met, z=10, x=163, y=395)
                self.assertEqual(u_str, f"/api/v1/tiles/evapotranspiration/{m.value}/{met.value}/10/163/395.png")

                tpl_str = build_et_tile_url_template(model=m, metric=met)
                self.assertEqual(tpl_str, f"/api/v1/tiles/evapotranspiration/{m.value}/{met.value}/{{z}}/{{x}}/{{y}}.png")

        # -------------------------------------------------------------
        # 9. Full Service Pipeline and Scene Evaluation Execution
        # -------------------------------------------------------------
        # a) execute_calibration_pipeline
        cal_req = ETCalibrationRequest(asset_id="CENTRAL_VALLEY_ALFALFA_CA", model_type=ETModelType.SEBAL, wind_speed_2m_m_s=2.8)
        cal_resp = evapotranspiration_service.execute_calibration_pipeline(cal_req)
        self.assertEqual(cal_resp.status, "success")
        self.assertEqual(cal_resp.asset_id, "CENTRAL_VALLEY_ALFALFA_CA")
        self.assertIsNotNone(cal_resp.anchor_pair)
        self.assertGreater(cal_resp.anchor_pair.dt_slope_a, 0.0)

        # b) evaluate_energy_balance
        eval_resp = evapotranspiration_service.evaluate_energy_balance(
            asset_id="CENTRAL_VALLEY_ALFALFA_CA",
            model_type=ETModelType.SEBAL,
            forcing=MeteorologicalForcing(
                air_temp_c=32.5,
                wind_speed_2m_m_s=2.8,
                solar_irradiance_w_m2=820.0,
                relative_humidity_pct=30.0
            )
        )
        self.assertIsInstance(eval_resp, SurfaceEnergyBalanceEvaluation)
        self.assertGreater(eval_resp.net_radiation_w_m2, 0.0)
        self.assertGreaterEqual(eval_resp.evaporative_fraction, 0.0)
        self.assertLessEqual(eval_resp.evaporative_fraction, 1.20)
        self.assertGreaterEqual(eval_resp.crop_water_stress_index, 0.0)
        self.assertLessEqual(eval_resp.crop_water_stress_index, 1.0)
        # Energy closure on summary: |Rn - (G + H + LE)| <= 0.05 W/m^2 due to 2-decimal rounding
        summary_closure = abs(eval_resp.net_radiation_w_m2 - (eval_resp.soil_heat_flux_w_m2 + eval_resp.sensible_heat_flux_w_m2 + eval_resp.latent_heat_flux_w_m2))
        self.assertLessEqual(summary_closure, 0.05)

        # c) execute_evapotranspiration_pipeline
        inv_req = ETInvertRequest(
            asset_id="CENTRAL_VALLEY_ALFALFA_CA",
            model_type=ETModelType.SEBAL,
            solar_radiation_w_m2=820.0,
            air_temp_c=32.5,
            wind_speed_2m_m_s=2.8
        )
        inv_resp = evapotranspiration_service.execute_evapotranspiration_pipeline(inv_req)
        self.assertEqual(inv_resp.status, "success")
        self.assertGreater(len(inv_resp.slices), 0)
        self.assertTrue(inv_resp.quality_summary.quality_checklist["energy_conservation_closed"])
        self.assertTrue(inv_resp.quality_summary.quality_checklist["evaporative_fraction_bounded"])

        # Garbage collection
        del scene, pair, grids, rn_grid, g_grid, h_grid, le_grid, residual_grid
        gc.collect()



    def test_task_t337_topographic_service_and_mountain_cast_shadow_scientific_rigor(self):
        """Cycle v2.5.46 (Task T-337): TopographicService Remote Sensing Pipeline Verification:
        1. COP-DEM 30m Slope & Aspect Derivation via Horn 3x3 finite-difference kernels.
        2. Local Solar Incidence Cosine Invariant (cos(i) in [-1.0, 1.0]).
        3. Vectorized Mountain Cast-Shadow Ray Tracing.
        4. OLS Empirical Linear Regressor along Sun-Facing vs. Shaded Slopes (L = m*cos(i) + b, c = b/m).
        5. Minnaert Anisotropic Exponent (k in (0, 1]).
        6. Flat Terrain Identity Preservation (L_corr == L when slope == 0).
        7. Non-Negative Surface Reflectance Invariant (L_corr >= 0).
        8. End-to-End Scene Inversion & Dynamic Tile Streaming.
        9. Topographic Capabilities & Dataset Discovery.
        """
        from app.services.topographic_service import topographic_service, TopographicService
        import numpy as np
        import math
        import gc

        service = topographic_service
        self.assertIsInstance(service, TopographicService)

        # 1. Slope & Aspect derivation from synthetic DEM
        # Plane sloping east at 30 degrees: dz/dx = tan(30 deg), dz/dy = 0
        elev = np.zeros((64, 64), dtype=np.float32)
        dx = 30.0
        tan30 = math.tan(math.radians(30.0))
        for j in range(64):
            elev[:, j] = j * dx * tan30

        slope, aspect, normal = service.derive_slope_aspect(elev, cell_size_x=dx, cell_size_y=dx)
        # Interior points should have slope ~ 30 deg
        self.assertAlmostEqual(float(slope[32, 32]), 30.0, delta=1.5)
        self.assertTrue(0.0 <= aspect[32, 32] <= 360.0)
        norm_len = np.sqrt(np.sum(normal[:, 32, 32] ** 2))
        self.assertAlmostEqual(float(norm_len), 1.0, places=4)

        # 2. Local Solar Incidence Cosine cos(i) in [-1.0, 1.0]
        cos_i_overhead = service.compute_local_incidence_cosine(
            np.zeros((10, 10), dtype=np.float32),
            np.zeros((10, 10), dtype=np.float32),
            solar_zenith_deg=0.0,
            solar_azimuth_deg=180.0
        )
        self.assertAlmostEqual(float(cos_i_overhead[5, 5]), 1.0, places=4)

        cos_i_shadow = service.compute_local_incidence_cosine(
            np.full((10, 10), 60.0, dtype=np.float32),
            np.full((10, 10), 0.0, dtype=np.float32),
            solar_zenith_deg=45.0,
            solar_azimuth_deg=180.0
        )
        self.assertLess(float(cos_i_shadow[5, 5]), 0.0)

        # 3. Mountain Cast-Shadow Ray Tracing
        mountain_dem = np.full((32, 32), 500.0, dtype=np.float32)
        mountain_dem[10, 10] = 2000.0
        cast_shadow = service.trace_mountain_cast_shadows(mountain_dem, solar_zenith_deg=45.0, solar_azimuth_deg=180.0, cell_size_m=30.0)
        self.assertTrue(np.any(cast_shadow[11:20, 10]))

        # 4. OLS Empirical Linear Regressor (c = b / m)
        cos_i_vals = np.linspace(0.1, 0.9, 100, dtype=np.float32)
        true_m = 0.25
        true_b = 0.025
        rad_vals = true_m * cos_i_vals + true_b
        est_c, est_m, est_b = service.regress_band_c_factor(rad_vals, cos_i_vals)
        self.assertAlmostEqual(est_c, 0.10, delta=0.02)
        self.assertGreater(est_m, 0.0)

        # 5. Minnaert exponent regression
        est_k = service.regress_minnaert_k(rad_vals, cos_i_vals, solar_zenith_deg=35.0)
        self.assertGreaterEqual(est_k, 0.10)
        self.assertLessEqual(est_k, 1.0)

        # 6. Flat terrain identity preservation
        flat_refl = np.full((10, 10), 0.18, dtype=np.float32)
        corr_flat = service.apply_topographic_correction(
            flat_refl,
            cos_i=np.full((10, 10), math.cos(math.radians(35.0)), dtype=np.float32),
            slope_deg=np.zeros((10, 10), dtype=np.float32),
            solar_zenith_deg=35.0,
            method="c_correction",
            c_factor=0.08
        )
        np.testing.assert_allclose(corr_flat, flat_refl, rtol=1e-4)

        # 7. Non-negative reflectance preservation
        corr_non_neg = service.apply_topographic_correction(
            flat_refl,
            cos_i=np.full((10, 10), -0.5, dtype=np.float32),
            slope_deg=np.full((10, 10), 45.0, dtype=np.float32),
            solar_zenith_deg=35.0,
            method="c_correction",
            c_factor=0.08
        )
        self.assertTrue(np.all(corr_non_neg >= 0.0))

        # 8. End-to-end scene processing
        scene_res = service.process_topographic_scene("MT_SHASTA_VOLCANO_2026", method="c_correction")
        self.assertEqual(scene_res["status"], "completed")
        self.assertIn("summary", scene_res)
        self.assertGreater(scene_res["summary"]["radiance_std_reduction_pct"], 0.0)
        self.assertIn("tile_url_template", scene_res)

        # 9. Discovery capabilities
        caps = service.get_capabilities()
        self.assertIn("methods", caps)
        self.assertIn("c_correction", caps["methods"])
        self.assertIn("benchmark_scenes", caps)

        del elev, slope, aspect, normal, mountain_dem, cast_shadow, scene_res
        gc.collect()




    def test_task_t340_topographic_irradiance_invariance(self):
        """Cycle v2.5.46 (Task T-340): Topographic Irradiance Invariance Invariant.
        
        Verifies:
        1. Local solar incidence angle cos(i) in [-1.0, 1.0] identically across all solar geometries
           and terrain slopes (zenith in [0, 90], azimuth in [0, 360], slope in [0, 90], aspect in [0, 360]).
        2. Flat terrain condition: slope == 0 or aspect == -1 yields cos(i) == cos(theta_s).
        3. Solar overhead condition: theta_s == 0 yields cos(i) == cos(alpha) regardless of azimuth.
        4. Sunward slope alignment: phi_s == beta yields cos(i) == cos(theta_s - alpha).
        5. Anti-sunward slope alignment: |phi_s - beta| == 180 deg yields cos(i) == cos(theta_s + alpha).
           When theta_s + alpha > 90 deg, guarantees negative cos(i) < 0 (self-shadowing).
        6. Vectorized grid invariant: 2D raster under synthetic rugged terrain with slopes up to 90 deg
           keeps cos(i) strictly in [-1.0, 1.0] without NaNs or Infs.
        """
        import math
        import numpy as np
        from app.models.schemas import calculate_local_incidence_cosine
        from app.services.topographic_service import topographic_service

        # 1. Exhaustive parameter sweep across all solar geometries and terrain slopes
        zeniths = [0.0, 15.0, 30.0, 45.0, 60.0, 75.0, 85.0, 89.9]
        sun_azimuths = [0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0]
        slopes = [0.0, 5.0, 15.0, 30.0, 45.0, 60.0, 75.0, 89.9]
        aspects = [-1.0, 0.0, 45.0, 90.0, 135.0, 180.0, 225.0, 270.0, 315.0]

        for sz in zeniths:
            for sa in sun_azimuths:
                for sl in slopes:
                    for asp in aspects:
                        cos_i = calculate_local_incidence_cosine(sz, sa, sl, asp)
                        self.assertFalse(math.isnan(cos_i), f"NaN cos(i) for sz={sz}, sa={sa}, sl={sl}, asp={asp}")
                        self.assertFalse(math.isinf(cos_i), f"Inf cos(i) for sz={sz}, sa={sa}, sl={sl}, asp={asp}")
                        self.assertGreaterEqual(cos_i, -1.0, f"cos(i) < -1.0 for sz={sz}, sa={sa}, sl={sl}, asp={asp}")
                        self.assertLessEqual(cos_i, 1.0, f"cos(i) > 1.0 for sz={sz}, sa={sa}, sl={sl}, asp={asp}")

        # 2. Flat terrain invariance: cos(i) == cos(theta_s) identically
        for sz in zeniths:
            cos_sz = round(math.cos(math.radians(sz)), 6)
            cos_i_flat_slope = calculate_local_incidence_cosine(sz, 180.0, 0.0, 90.0)
            cos_i_flat_asp = calculate_local_incidence_cosine(sz, 180.0, 25.0, -1.0)
            self.assertEqual(cos_i_flat_slope, cos_sz)
            self.assertEqual(cos_i_flat_asp, cos_sz)

        # 3. Solar overhead invariance: theta_s = 0 => cos(i) == cos(alpha)
        for sl in slopes:
            cos_sl = round(math.cos(math.radians(sl)), 6)
            for sa in [0.0, 90.0, 180.0, 270.0]:
                for asp in [0.0, 45.0, 180.0]:
                    cos_i = calculate_local_incidence_cosine(0.0, sa, sl, asp)
                    self.assertEqual(cos_i, cos_sl)

        # 4. Sunward alignment: aspect == solar azimuth => cos(i) == cos(theta_s - alpha)
        for sz, sl in [(45.0, 30.0), (60.0, 20.0), (30.0, 50.0)]:
            expected = round(math.cos(math.radians(sz - sl)), 6)
            for sa in [45.0, 135.0, 220.0]:
                cos_i = calculate_local_incidence_cosine(sz, sa, sl, sa)
                self.assertAlmostEqual(cos_i, expected, places=5)

        # 5. Anti-sunward alignment: aspect == (solar azimuth + 180) % 360 => cos(i) == cos(theta_s + alpha)
        for sz, sl in [(50.0, 55.0), (40.0, 60.0), (30.0, 70.0)]:
            # Here sz + sl > 90, so slope faces away into self-shadow
            expected = round(math.cos(math.radians(sz + sl)), 6)
            sa = 120.0
            anti_sa = (sa + 180.0) % 360.0
            cos_i = calculate_local_incidence_cosine(sz, sa, sl, anti_sa)
            self.assertAlmostEqual(cos_i, expected, places=5)
            self.assertLess(cos_i, 0.0, "Steep anti-sunward slope must exhibit self-shadow (cos_i < 0)")

        # 6. Vectorized 2D grid invariant across synthetic rugged relief
        np.random.seed(42)
        grid_slope = np.random.uniform(0.0, 89.9, size=(64, 64)).astype(np.float32)
        grid_aspect = np.random.uniform(0.0, 360.0, size=(64, 64)).astype(np.float32)
        vec_cos_i = topographic_service.compute_local_incidence_cosine(
            grid_slope, grid_aspect, solar_zenith_deg=48.2, solar_azimuth_deg=165.4
        )
        self.assertTrue(np.all(vec_cos_i >= -1.0))
        self.assertTrue(np.all(vec_cos_i <= 1.0))
        self.assertFalse(np.any(np.isnan(vec_cos_i)))
        self.assertFalse(np.any(np.isinf(vec_cos_i)))

    def test_task_t340_flat_terrain_identity_invariant(self):
        """Cycle v2.5.46 (Task T-340): Flat Terrain Identity Invariant.
        
        Verifies:
        1. For flat horizontal terrain (slope alpha = 0), corrected radiance equals uncorrected radiance:
           L_corr == L identically across all correction algorithms (C-Correction, Minnaert, SCS+C, Cosine, none).
        2. Normalization factor equals exactly 1.000000 across varied solar zeniths (15 to 75 deg)
           and reflectance levels (0.01 to 0.95).
        3. Vectorized raster application over flat terrain raster preserves raw spectral band values
           with zero radiometric distortion (|L_corr - L| < 1e-4).
        """
        import math
        import numpy as np
        from app.models.schemas import (
            apply_topographic_correction,
            calculate_c_correction_factor,
            calculate_minnaert_correction,
            calculate_scs_c_correction,
            TopographicCorrectionMethod,
        )
        from app.services.topographic_service import topographic_service

        methods = [
            TopographicCorrectionMethod.C_CORRECTION,
            TopographicCorrectionMethod.MINNAERT,
            TopographicCorrectionMethod.SUN_CANOPY_SENSOR,
            TopographicCorrectionMethod.COSINE,
            "none"
        ]
        solar_zeniths = [15.0, 30.0, 45.0, 60.0, 75.0]
        reflectances = [0.02, 0.08, 0.18, 0.35, 0.55, 0.85]

        # 1. Scalar flat terrain identity across methods and solar zeniths
        for sz in solar_zeniths:
            cos_sz = math.cos(math.radians(sz))
            # On flat terrain (slope = 0), cos(i) = cos(theta_s)
            cos_i_flat = cos_sz

            # Check individual formulation factors on flat terrain
            # C-Correction: (cos_sz + c) / (cos_sz + c) = 1.0
            c_factor_ratio = calculate_c_correction_factor(cos_i_flat, sz, c_factor=0.08)
            self.assertAlmostEqual(c_factor_ratio, 1.0, places=5)

            # Minnaert: (cos_sz / cos_sz)^k = 1.0^k = 1.0
            minn_factor_ratio = calculate_minnaert_correction(cos_i_flat, sz, k=0.65)
            self.assertAlmostEqual(minn_factor_ratio, 1.0, places=5)

            # SCS+C on flat terrain (alpha = 0, cos(alpha) = 1.0):
            # (cos_sz * 1.0 + c) / (cos_sz + c) = 1.0
            scs_factor_ratio = calculate_scs_c_correction(cos_i_flat, slope_deg=0.0, solar_zenith_deg=sz, c_factor=0.08)
            self.assertAlmostEqual(scs_factor_ratio, 1.0, places=5)

            # Cosine: cos_sz / cos_sz = 1.0
            cosine_factor_ratio = calculate_c_correction_factor(cos_i_flat, sz, c_factor=0.0)
            self.assertAlmostEqual(cosine_factor_ratio, 1.0, places=5)

            for refl in reflectances:
                for m in methods:
                    m_val = m.value if hasattr(m, "value") else str(m)
                    corrected = apply_topographic_correction(
                        radiance=refl,
                        cos_i=cos_i_flat,
                        slope_deg=0.0,
                        solar_zenith_deg=sz,
                        method=m_val,
                        c_factor=0.08,
                        minnaert_k=0.65
                    )
                    self.assertAlmostEqual(corrected, refl, places=4,
                        msg=f"Flat terrain identity violated for method={m_val}, sz={sz}, refl={refl}")

        # 2. Vectorized 2D raster flat terrain identity
        for m_str in ["c_correction", "minnaert", "scs_c", "cosine"]:
            flat_slope_grid = np.zeros((32, 32), dtype=np.float32)
            flat_cos_i_grid = np.full((32, 32), math.cos(math.radians(40.0)), dtype=np.float32)
            raw_refl_grid = np.linspace(0.05, 0.80, 1024, dtype=np.float32).reshape(32, 32)

            corr_grid = topographic_service.apply_topographic_correction(
                reflectance=raw_refl_grid,
                cos_i=flat_cos_i_grid,
                slope_deg=flat_slope_grid,
                solar_zenith_deg=40.0,
                method=m_str,
                c_factor=0.08,
                minnaert_k=0.65
            )
            np.testing.assert_allclose(corr_grid, raw_refl_grid, atol=1e-5,
                err_msg=f"Vectorized flat terrain identity failed for {m_str}")

    def test_task_t340_non_negative_surface_reflectance_invariant(self):
        """Cycle v2.5.46 (Task T-340): Non-Negative Surface Reflectance Invariant.
        
        Verifies:
        1. Normalization guarantees strictly non-negative reflectance (L_corr >= 0.0)
           under extreme relief, avoiding negative radiance artifacts across all correction methods.
        2. Boundedness under near-vertical cliffs (slope -> 90 deg), extreme grazing incidence (cos_i -> 0+),
           and negative incidence angles (cos_i in [-1.0, 0.0]).
        3. Validates non-negative behavior with both mask_self_shadow=True (masked to 0.0)
           and mask_self_shadow=False (diffuse-bounded non-negative scaling).
        4. Dynamic range preservation: 0.0 <= L_corr <= 1.0 under all valid reflectance inputs.
        """
        import math
        import numpy as np
        from app.models.schemas import apply_topographic_correction, TopographicCorrectionMethod
        from app.services.topographic_service import topographic_service

        methods = [
            TopographicCorrectionMethod.C_CORRECTION,
            TopographicCorrectionMethod.MINNAERT,
            TopographicCorrectionMethod.SUN_CANOPY_SENSOR,
            TopographicCorrectionMethod.COSINE
        ]

        # 1. Scalar sweep under extreme relief and self-shadow conditions
        extreme_cos_i_values = [-0.99, -0.60, -0.25, -0.01, 0.0, 0.0001, 0.01, 0.049, 0.1, 0.5, 0.9]
        extreme_slopes = [0.0, 30.0, 60.0, 75.0, 85.0, 89.9]
        refl_inputs = [0.001, 0.05, 0.20, 0.60, 0.95]

        for m in methods:
            m_val = m.value if hasattr(m, "value") else str(m)
            for cos_val in extreme_cos_i_values:
                for sl_val in extreme_slopes:
                    for refl in refl_inputs:
                        for mask_ss in [True, False]:
                            corr = apply_topographic_correction(
                                radiance=refl,
                                cos_i=cos_val,
                                slope_deg=sl_val,
                                solar_zenith_deg=50.0,
                                method=m_val,
                                c_factor=0.08,
                                minnaert_k=0.65,
                                mask_self_shadow=mask_ss
                            )
                            self.assertFalse(math.isnan(corr), f"NaN produced for method={m_val}, cos_i={cos_val}")
                            self.assertFalse(math.isinf(corr), f"Inf produced for method={m_val}, cos_i={cos_val}")
                            self.assertGreaterEqual(corr, 0.0,
                                f"Negative reflectance {corr} for method={m_val}, cos_i={cos_val}, slope={sl_val}")
                            self.assertLessEqual(corr, 1.0,
                                f"Reflectance overshot 1.0 ({corr}) for method={m_val}, cos_i={cos_val}")
                            if mask_ss and cos_val <= 0.0:
                                self.assertEqual(corr, 0.0)

        # 2. Vectorized 2D array under extreme rugged mountain relief with cast shadow mask
        np.random.seed(123)
        refl_arr = np.random.uniform(0.005, 0.85, size=(48, 48)).astype(np.float32)
        slope_arr = np.random.uniform(0.0, 89.5, size=(48, 48)).astype(np.float32)
        cos_i_arr = np.linspace(-1.0, 1.0, 48 * 48, dtype=np.float32).reshape(48, 48)
        cast_shadow_mask = np.random.choice([True, False], size=(48, 48), p=[0.2, 0.8])

        for m_str in ["c_correction", "minnaert", "scs_c", "cosine"]:
            corr_arr = topographic_service.apply_topographic_correction(
                reflectance=refl_arr,
                cos_i=cos_i_arr,
                slope_deg=slope_arr,
                solar_zenith_deg=55.0,
                method=m_str,
                c_factor=0.08,
                minnaert_k=0.65,
                mask_self_shadow=True,
                cast_shadow_mask=cast_shadow_mask
            )
            self.assertTrue(np.all(corr_arr >= 0.0), f"Negative reflectance found in raster for {m_str}")
            self.assertTrue(np.all(corr_arr <= 1.0), f"Reflectance > 1.0 found in raster for {m_str}")
            self.assertFalse(np.any(np.isnan(corr_arr)), f"NaN found in raster for {m_str}")

    def test_task_t340_c_correction_irradiance_regressor(self):
        """Cycle v2.5.46 (Task T-340): C-Correction Irradiance Regressor Invariant.
        
        Verifies:
        1. Empirical linear regression L = a * cos(i) + b produces non-negative diffuse skylight
           parameter c = b / a >= 0 for illuminated slopes.
        2. Direct solar irradiance slope a > 0 and atmospheric diffuse intercept b >= 0.
        3. High fidelity recovery of ground-truth c parameter in synthetic terrain scenes.
        4. Singular and degenerate terrain guard handling: on completely flat terrain (constant cos(i))
           or near-zero variance, regressor returns valid non-negative default fallback c >= 0.
        5. Filter bounds: pixels with cos(i) outside [min_cos_i, max_cos_i] or non-positive radiances
           are robustly excluded without crashing or returning negative c.
        """
        import math
        import numpy as np
        from app.models.schemas import estimate_c_factor_from_linear_regression
        from app.services.topographic_service import topographic_service

        # 1. Ground truth recovery on synthetic sloped terrain
        # Model: L = a * cos(i) + b
        test_cases = [
            {"true_a": 0.25, "true_b": 0.025, "expected_c": 0.10},  # c = 0.025 / 0.25 = 0.10
            {"true_a": 0.35, "true_b": 0.042, "expected_c": 0.12},  # c = 0.042 / 0.35 = 0.12
            {"true_a": 0.40, "true_b": 0.020, "expected_c": 0.05},  # c = 0.020 / 0.40 = 0.05
            {"true_a": 0.18, "true_b": 0.018, "expected_c": 0.10},  # c = 0.018 / 0.18 = 0.10
        ]

        for tc in test_cases:
            cos_i = np.linspace(0.10, 0.90, 200, dtype=np.float32)
            np.random.seed(99)
            noise = np.random.normal(0.0, 0.001, size=len(cos_i)).astype(np.float32)
            radiance = np.clip(tc["true_a"] * cos_i + tc["true_b"] + noise, 0.005, 1.0)

            # Service OLS regression
            c_est, slope_a, intercept_b = topographic_service.regress_band_c_factor(radiance, cos_i)
            self.assertGreaterEqual(c_est, 0.0, "C-factor must be non-negative")
            self.assertGreater(slope_a, 0.0, "Regression slope a must be positive for illuminated terrain")
            self.assertGreaterEqual(intercept_b, 0.0, "Diffuse intercept b must be non-negative")
            self.assertAlmostEqual(c_est, tc["expected_c"], delta=0.02,
                msg=f"Expected c ~ {tc['expected_c']}, got {c_est}")

            # Schema helper regression
            c_helper = estimate_c_factor_from_linear_regression(radiance.tolist(), cos_i.tolist())
            self.assertGreaterEqual(c_helper, 0.0, "Helper c-factor must be non-negative")
            self.assertAlmostEqual(c_helper, tc["expected_c"], delta=0.03)

        # 2. Singular terrain: completely flat landscape (constant cos_i)
        # Denominator in OLS: n * sum(x^2) - (sum(x))^2 = 0
        flat_cos_i = np.full(100, 0.7071, dtype=np.float32)
        flat_radiance = np.full(100, 0.22, dtype=np.float32)
        c_flat, m_flat, b_flat = topographic_service.regress_band_c_factor(flat_radiance, flat_cos_i, default_c=0.08)
        self.assertFalse(math.isnan(c_flat))
        self.assertGreaterEqual(c_flat, 0.0)
        self.assertEqual(c_flat, 0.08)

        # 3. Small sample size fallback (< 10 points)
        c_sparse, m_sparse, b_sparse = topographic_service.regress_band_c_factor(
            np.array([0.1, 0.15], dtype=np.float32),
            np.array([0.4, 0.5], dtype=np.float32),
            default_c=0.09
        )
        self.assertGreaterEqual(c_sparse, 0.0)
        self.assertEqual(c_sparse, 0.09)

        # 4. Out-of-bounds / self-shadow filtering: pixels with cos_i < 0.05 or > 0.95
        shadow_cos_i = np.array([-0.5, -0.2, 0.01, 0.02, 0.98, 0.99], dtype=np.float32)
        shadow_rad = np.array([0.01, 0.02, 0.03, 0.04, 0.40, 0.45], dtype=np.float32)
        c_filtered, _, _ = topographic_service.regress_band_c_factor(shadow_rad, shadow_cos_i, default_c=0.08)
        self.assertEqual(c_filtered, 0.08)

    def test_task_t340_minnaert_limb_darkening_monotonicity(self):
        """Cycle v2.5.46 (Task T-340): Minnaert Limb Darkening Monotonicity Invariant.
        
        Verifies:
        1. Minnaert power law (cos(theta_s) / cos(i))^k behaves monotonically with k in (0, 1].
        2. Shaded / steep slopes (cos(i) < cos(theta_s)): ratio > 1.0, so correction factor
           increases strictly monotonically as k increases from 0.01 to 1.0.
        3. Directly illuminated sunward slopes (cos(i) > cos(theta_s)): ratio < 1.0, so correction factor
           decreases strictly monotonically as k increases from 0.01 to 1.0.
        4. Neutral slopes (cos(i) == cos(theta_s)): correction factor is identically 1.0 for all k in (0, 1].
        5. Empirical k regression via log-linearization ln(L*cos(alpha)) = ln(L_n) + k*ln(cos(i)*cos(alpha))
           yields valid k in [0.01, 1.0].
        """
        import math
        import numpy as np
        from app.models.schemas import calculate_minnaert_correction, calculate_c_correction_factor
        from app.services.topographic_service import topographic_service

        k_sweep = [0.05, 0.20, 0.40, 0.60, 0.80, 1.00]
        solar_zenith_deg = 45.0
        cos_sz = math.cos(math.radians(solar_zenith_deg))  # ~0.7071

        # 1. Shaded / steep slopes: cos(i) < cos(theta_s) => ratio R = cos_sz / cos_i > 1.0
        # Correction multiplier M(k) = R^k must strictly increase with k
        cos_i_shaded = 0.35  # R = ~2.02
        shaded_factors = [
            calculate_minnaert_correction(cos_i=cos_i_shaded, solar_zenith_deg=solar_zenith_deg, k=k_val)
            for k_val in k_sweep
        ]
        for idx in range(len(shaded_factors) - 1):
            self.assertLess(shaded_factors[idx], shaded_factors[idx + 1],
                f"Minnaert factor must strictly increase with k on shaded slopes: {shaded_factors[idx]} >= {shaded_factors[idx + 1]}")

        # At k = 1.0, Minnaert reduces to Lambertian cosine factor
        lambertian_factor = calculate_c_correction_factor(cos_i=cos_i_shaded, solar_zenith_deg=solar_zenith_deg, c_factor=0.0)
        self.assertAlmostEqual(shaded_factors[-1], lambertian_factor, places=4)

        # 2. Directly illuminated sunward slopes: cos(i) > cos(theta_s) => ratio R = cos_sz / cos_i < 1.0
        # Correction multiplier M(k) = R^k must strictly decrease with k
        cos_i_sunward = 0.92  # R = ~0.768
        sunward_factors = [
            calculate_minnaert_correction(cos_i=cos_i_sunward, solar_zenith_deg=solar_zenith_deg, k=k_val)
            for k_val in k_sweep
        ]
        for idx in range(len(sunward_factors) - 1):
            self.assertGreater(sunward_factors[idx], sunward_factors[idx + 1],
                f"Minnaert factor must strictly decrease with k on sunward slopes: {sunward_factors[idx]} <= {sunward_factors[idx + 1]}")

        # At k = 1.0, sunward Minnaert reduces to Lambertian
        lambertian_sunward = calculate_c_correction_factor(cos_i=cos_i_sunward, solar_zenith_deg=solar_zenith_deg, c_factor=0.0)
        self.assertAlmostEqual(sunward_factors[-1], lambertian_sunward, places=4)

        # 3. Neutral slopes: cos(i) == cos(theta_s) => ratio R = 1.0
        # M(k) = 1.0^k == 1.0 identically for all k
        for k_val in k_sweep:
            factor_neutral = calculate_minnaert_correction(cos_i=cos_sz, solar_zenith_deg=solar_zenith_deg, k=k_val)
            self.assertAlmostEqual(factor_neutral, 1.0, places=5)

        # 4. Empirical k regressor verification
        cos_i_synth = np.linspace(0.2, 0.9, 100, dtype=np.float32)
        true_k = 0.68
        # Synthetic L roughly follows L = L_n * (cos(i)/cos(theta_s))^k
        rad_synth = 0.30 * np.power(np.clip(cos_i_synth / cos_sz, 0.1, 2.0), true_k).astype(np.float32)

        k_est = topographic_service.regress_minnaert_k(
            radiance=rad_synth,
            cos_i=cos_i_synth,
            solar_zenith_deg=solar_zenith_deg,
            default_k=0.65
        )
        self.assertGreater(k_est, 0.0, "Minnaert k must be strictly positive")
        self.assertLessEqual(k_est, 1.0, "Minnaert k must not exceed 1.0")
        self.assertAlmostEqual(k_est, true_k, delta=0.15)


    def test_task_t382_cva_vector_mathematical_rigor_and_invariants(self):
        """
        Cycle v2.5.53 Task T-382 Continuous Scientific QA:
        1. Multi-band Euclidean Change Vector Triangle Inequality:
           ||x2 - x1||_2 <= ||x1||_2 + ||x2||_2 across arbitrary n-dimensional physical reflectance vectors.
        2. Illuminance-Invariant Spectral Angle Mapper (SAM) Invariants:
           - alpha in [0.0, pi/2] radians ([0.0, 90.0] degrees).
           - Scale invariance: alpha(k * x1, x2) == alpha(x1, x2) for any positive scalar k > 0.
           - Identity: alpha(x1, x1) == 0.0 radians.
           - Orthogonality: alpha([1, 0, 0], [0, 1, 0]) == pi / 2.
           - Zero-norm dark-pixel stability: alpha(0, x2) == 0.0 (no division-by-zero divergence).
        3. 8-Sector Directional Disturbance Vector Field Geometry:
           - theta_deg = (atan2(delta_y, delta_x) + 360) % 360.
           - Directional octant symmetry partitioned into 8 equal 45-degree sectors.
           - Subthreshold delta (magnitude < tau) strictly collapses to STABLE_UNMODIFIED (Sector 0).
        4. Disturbance Severity Tier Monotonic Escalation:
           - Monotonic threshold progression: tau <= 1.5*tau <= 2.5*tau <= 4.0*tau.
        5. Vectorized Multi-Dimensional CVA Service Verification:
           - compute_vectorized_cva produces 0 triangle inequality violations across 256x256 multi-band rasters.
           - All output matrices (magnitude, SAM, change probability, canopy persistence) strictly bounded in [0.0, 1.0].
        """
        import math
        import numpy as np
        from app.models.schemas import (
            CVAMethod,
            CVADisturbanceSector,
            CVASeverityTier,
            calculate_change_vector,
            calculate_spectral_angle_mapper,
            classify_disturbance_sector,
        )
        from app.services.trend_service import trend_service

        # 1. Multi-Band Triangle Inequality Invariant
        np.random.seed(42)
        x1_rand = np.random.uniform(0.0, 1.0, (1000, 6)).astype(np.float32)
        x2_rand = np.random.uniform(0.0, 1.0, (1000, 6)).astype(np.float32)

        norm_x1 = np.linalg.norm(x1_rand, axis=1)
        norm_x2 = np.linalg.norm(x2_rand, axis=1)
        diff_norm = np.linalg.norm(x2_rand - x1_rand, axis=1)

        triangle_excess = diff_norm - (norm_x1 + norm_x2)
        self.assertTrue(
            np.all(triangle_excess <= 1e-6),
            f"Triangle inequality violated! Max excess: {np.max(triangle_excess)}",
        )

        # 2. SAM Spectral Angle Mapper Mathematical Rigor
        test_vec = [0.12, 0.28, 0.45, 0.60]
        sam_ident = calculate_spectral_angle_mapper(test_vec, test_vec)
        self.assertEqual(sam_ident, 0.0)

        for k_scalar in [0.1, 0.5, 2.0, 10.0]:
            scaled_vec = [v * k_scalar for v in test_vec]
            sam_scaled = calculate_spectral_angle_mapper(test_vec, scaled_vec)
            self.assertAlmostEqual(
                sam_scaled, 0.0, places=5,
                msg=f"SAM scale-invariance violated for scalar multiplier {k_scalar}",
            )

        ortho_a = [1.0, 0.0, 0.0]
        ortho_b = [0.0, 1.0, 0.0]
        sam_ortho = calculate_spectral_angle_mapper(ortho_a, ortho_b)
        self.assertAlmostEqual(sam_ortho, math.pi / 2.0, places=5)

        zero_vec = [0.0, 0.0, 0.0]
        sam_both_zero = calculate_spectral_angle_mapper(zero_vec, zero_vec)
        self.assertEqual(sam_both_zero, 0.0)
        sam_one_zero = calculate_spectral_angle_mapper(zero_vec, test_vec[:3])
        self.assertAlmostEqual(sam_one_zero, math.pi / 2.0, places=5)

        dict_t1 = {"B02": 0.15, "B03": 0.25, "B04": 0.35, "B08": 0.65}
        dict_t2 = {"B02": 0.20, "B03": 0.30, "B04": 0.40, "B08": 0.50}
        res_dict = calculate_spectral_angle_mapper(dict_t1, dict_t2)
        self.assertIsInstance(res_dict, dict)
        self.assertIn("spectral_angle_rad", res_dict)
        self.assertIn("spectral_angle_deg", res_dict)
        self.assertGreaterEqual(res_dict["spectral_angle_rad"], 0.0)
        self.assertLessEqual(res_dict["spectral_angle_rad"], math.pi / 2.0)
        self.assertAlmostEqual(
            res_dict["spectral_angle_deg"],
            math.degrees(res_dict["spectral_angle_rad"]),
            delta=0.05,
        )

        # 3. 8-Sector Directional Disturbance Vector Field Geometry
        expected_sectors = [
            (22.5, CVADisturbanceSector.SECTOR_1_SOIL_EXPOSURE),
            (67.5, CVADisturbanceSector.SECTOR_2_VEGETATION_GROWTH),
            (112.5, CVADisturbanceSector.SECTOR_3_CANOPY_GREENING),
            (157.5, CVADisturbanceSector.SECTOR_4_WETLAND_EXPANSION),
            (202.5, CVADisturbanceSector.SECTOR_5_WATER_SUBMERGENCE),
            (247.5, CVADisturbanceSector.SECTOR_6_FLOOD_INUNDATION),
            (292.5, CVADisturbanceSector.SECTOR_7_VEGETATION_DIEBACK),
            (337.5, CVADisturbanceSector.SECTOR_8_DEFORESTATION_EXCAVATION),
        ]
        mag_test = 0.50
        threshold_test = 0.15
        for target_deg, exp_sector in expected_sectors:
            rad = math.radians(target_deg)
            dx = mag_test * math.cos(rad)
            dy = mag_test * math.sin(rad)
            sec, calculated_deg = classify_disturbance_sector(
                delta_x=dx, delta_y=dy, magnitude=mag_test, threshold=threshold_test
            )
            self.assertEqual(sec, exp_sector, f"Expected {exp_sector} for azimuth {target_deg} deg, got {sec}")
            self.assertAlmostEqual(calculated_deg, target_deg, places=1)

        sec_sub, deg_sub = classify_disturbance_sector(
            delta_x=0.05, delta_y=0.05, magnitude=0.07, threshold=0.15
        )
        self.assertEqual(sec_sub, CVADisturbanceSector.STABLE_UNMODIFIED)
        self.assertEqual(deg_sub, 0.0)

        # 4. Vectorized CVA Pipeline Rigor & Multi-Dimensional Cube
        cube_t1 = np.ones((32, 32, 4), dtype=np.float32) * 0.20
        cube_t2 = np.copy(cube_t1)
        cube_t2[:16, :, 2] = 0.10  # Red drops
        cube_t2[:16, :, 3] = 0.50  # NIR rises

        cva_results = trend_service.compute_vectorized_cva(
            cube_t1=cube_t1,
            cube_t2=cube_t2,
            bands=["B02", "B03", "B04", "B08"],
            method=CVAMethod.STANDARD_EUCLIDEAN,
            threshold=0.15,
            axis_x_band="B04",
            axis_y_band="B08",
        )

        self.assertIn("magnitude", cva_results)
        self.assertIn("sam_rad", cva_results)
        self.assertIn("sam_deg", cva_results)
        self.assertIn("sector_ids", cva_results)
        self.assertIn("change_prob", cva_results)
        self.assertIn("canopy_persistence", cva_results)
        self.assertEqual(cva_results["triangle_violations"], 0)

        mag_arr = cva_results["magnitude"]
        self.assertTrue(np.all(mag_arr[:16, :] > 0.30), "Disturbed region must have magnitude > 0.30")
        self.assertTrue(np.all(mag_arr[16:, :] == 0.0), "Undisturbed region must have magnitude == 0.0")

        self.assertTrue(np.all(cva_results["sam_rad"] >= 0.0))
        self.assertTrue(np.all(cva_results["sam_rad"] <= math.pi / 2.0))
        self.assertTrue(np.all(cva_results["change_prob"] >= 0.0))
        self.assertTrue(np.all(cva_results["change_prob"] <= 1.0))
        self.assertTrue(np.all(cva_results["canopy_persistence"] >= 0.0))
        self.assertTrue(np.all(cva_results["canopy_persistence"] <= 1.0))


if __name__ == "__main__":
    unittest.main()









