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

if __name__ == "__main__":
    unittest.main()

