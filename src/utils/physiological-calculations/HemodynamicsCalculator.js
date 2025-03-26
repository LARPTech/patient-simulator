/**
 * HemodynamicsCalculator.js
 * 
 * This module calculates hemodynamic parameters based on a patient's physiological state.
 * It models cardiovascular dynamics including cardiac output, vascular resistance, 
 * and pressure relationships.
 */

class HemodynamicsCalculator {
    constructor() {
      // Reference ranges for hemodynamic parameters
      this.referenceRanges = {
        cardiac_output: { min: 4.0, max: 8.0 },           // L/min
        cardiac_index: { min: 2.5, max: 4.0 },            // L/min/m²
        stroke_volume: { min: 60, max: 100 },             // mL/beat
        stroke_volume_index: { min: 33, max: 47 },        // mL/beat/m²
        svr: { min: 800, max: 1200 },                     // dyn·s/cm⁵
        pvr: { min: 100, max: 250 },                      // dyn·s/cm⁵
        map: { min: 70, max: 105 },                       // mmHg
        cvp: { min: 2, max: 8 },                          // mmHg
        pap: { min: 10, max: 25 },                        // mmHg (mean)
        pcwp: { min: 6, max: 12 },                        // mmHg
        left_ventricular_work: { min: 3.4, max: 4.2 },    // kg·m
        right_ventricular_work: { min: 0.54, max: 0.66 }  // kg·m
      };
    }
    
    /**
     * Calculate mean arterial pressure (MAP)
     * 
     * @param {number} systolic - Systolic blood pressure in mmHg
     * @param {number} diastolic - Diastolic blood pressure in mmHg
     * @returns {number} MAP in mmHg
     */
    calculateMAP(systolic, diastolic) {
      // MAP = DBP + 1/3(SBP - DBP)
      // or equivalently: MAP = (SBP + 2*DBP) / 3
      return Math.round((systolic + 2 * diastolic) / 3);
    }
    
    /**
     * Calculate body surface area (BSA) using the Mosteller formula
     * 
     * @param {number} height - Patient height in cm
     * @param {number} weight - Patient weight in kg
     * @returns {number} BSA in m²
     */
    calculateBSA(height, weight) {
      // Mosteller formula: BSA = sqrt((height * weight) / 3600)
      return Math.sqrt((height * weight) / 3600);
    }
    
    /**
     * Calculate cardiac output using the Fick principle
     * 
     * @param {number} o2_consumption - Oxygen consumption in mL/min
     * @param {number} arterial_o2 - Arterial oxygen content in mL/dL
     * @param {number} venous_o2 - Venous oxygen content in mL/dL
     * @returns {number} Cardiac output in L/min
     */
    calculateCardiacOutputFick(o2_consumption, arterial_o2, venous_o2) {
      // CO = VO2 / (CaO2 - CvO2) * 10
      const a_v_difference = arterial_o2 - venous_o2;
      if (a_v_difference <= 0) return 0; // Prevent division by zero
      return (o2_consumption / a_v_difference) * 10;
    }
    
    /**
     * Calculate cardiac output based on heart rate and stroke volume
     * 
     * @param {number} hr - Heart rate in beats per minute
     * @param {number} sv - Stroke volume in mL
     * @returns {number} Cardiac output in L/min
     */
    calculateCardiacOutput(hr, sv) {
      // CO = HR * SV / 1000
      return (hr * sv) / 1000;
    }
    
    /**
     * Calculate systemic vascular resistance (SVR)
     * 
     * @param {number} map - Mean arterial pressure in mmHg
     * @param {number} cvp - Central venous pressure in mmHg
     * @param {number} co - Cardiac output in L/min
     * @returns {number} SVR in dyn·s/cm⁵
     */
    calculateSVR(map, cvp, co) {
      if (co <= 0) return 0; // Prevent division by zero
      // SVR = (MAP - CVP) * 80 / CO
      return Math.round(((map - cvp) * 80) / co);
    }
    
    /**
     * Calculate pulmonary vascular resistance (PVR)
     * 
     * @param {number} pap - Mean pulmonary arterial pressure in mmHg
     * @param {number} pcwp - Pulmonary capillary wedge pressure in mmHg
     * @param {number} co - Cardiac output in L/min
     * @returns {number} PVR in dyn·s/cm⁵
     */
    calculatePVR(pap, pcwp, co) {
      if (co <= 0) return 0; // Prevent division by zero
      // PVR = (PAP - PCWP) * 80 / CO
      return Math.round(((pap - pcwp) * 80) / co);
    }
    
    /**
     * Calculate stroke volume using the Frank-Starling mechanism
     * 
     * @param {Object} patientState - Patient's current physiological state
     * @returns {number} Stroke volume in mL
     */
    calculateStrokeVolume(patientState) {
      const {
        contractility = 1.0,       // Myocardial contractility (normal = 1.0)
        preload = 8,               // Preload estimate (e.g., CVP or PCWP) in mmHg
        afterload,                 // Afterload (can be MAP or SVR)
        systolic = 120,            // Systolic blood pressure in mmHg
        diastolic = 80,            // Diastolic blood pressure in mmHg
        cardiac_depression = 0     // Depression factor (0-1)
      } = patientState;
      
      // Calculate afterload from MAP if not provided
      const effectiveAfterload = afterload || this.calculateMAP(systolic, diastolic);
      
      // Base stroke volume (approximately 70 mL for a normal adult)
      let baseSV = 70;
      
      // Frank-Starling curve: SV increases with preload up to a point
      let preloadEffect = 0;
      if (preload < 2) {
        // Severe hypovolemia: drastically reduced SV
        preloadEffect = -30;
      } else if (preload < 6) {
        // Mild to moderate hypovolemia: reduced SV
        preloadEffect = -20 + (preload - 2) * 5;
      } else if (preload <= 12) {
        // Normal to optimal preload: normal to increased SV
        preloadEffect = (preload - 6) * 2;
      } else {
        // Excessive preload: decreasing benefit due to overstretching
        preloadEffect = 12 - (preload - 12) * 2;
      }
      
      // Afterload effect (increased afterload decreases SV)
      const normalMAP = 93; // Approximate normal MAP
      const afterloadEffect = (normalMAP - effectiveAfterload) * 0.2;
      
      // Contractility effect
      const contractilityEffect = (contractility - 1) * 40;
      
      // Cardiac depression effect (medications, pathology)
      const depressionEffect = -cardiac_depression * 50;
      
      // Combine all effects
      let sv = baseSV + preloadEffect + afterloadEffect + contractilityEffect + depressionEffect;
      
      // Ensure reasonable range
      sv = Math.max(10, Math.min(sv, 150));
      
      return Math.round(sv);
    }
    
    /**
     * Calculate cardiac index (CI)
     * 
     * @param {number} co - Cardiac output in L/min
     * @param {number} bsa - Body surface area in m²
     * @returns {number} Cardiac index in L/min/m²
     */
    calculateCardiacIndex(co, bsa) {
      if (bsa <= 0) return 0; // Prevent division by zero
      // CI = CO / BSA
      return co / bsa;
    }
    
    /**
     * Calculate stroke volume index (SVI)
     * 
     * @param {number} sv - Stroke volume in mL
     * @param {number} bsa - Body surface area in m²
     * @returns {number} Stroke volume index in mL/beat/m²
     */
    calculateStrokeVolumeIndex(sv, bsa) {
      if (bsa <= 0) return 0; // Prevent division by zero
      // SVI = SV / BSA
      return sv / bsa;
    }
    
    /**
     * Calculate left ventricular stroke work (LVSW)
     * 
     * @param {number} sv - Stroke volume in mL
     * @param {number} map - Mean arterial pressure in mmHg
     * @returns {number} LVSW in g·m
     */
    calculateLVSW(sv, map) {
      // LVSW = SV * MAP * 0.0136
      return sv * map * 0.0136;
    }
    
    /**
     * Calculate right ventricular stroke work (RVSW)
     * 
     * @param {number} sv - Stroke volume in mL
     * @param {number} pap - Mean pulmonary arterial pressure in mmHg
     * @returns {number} RVSW in g·m
     */
    calculateRVSW(sv, pap) {
      // RVSW = SV * PAP * 0.0136
      return sv * pap * 0.0136;
    }
    
    /**
     * Calculate pressure-volume loop area
     * 
     * @param {number} edv - End-diastolic volume in mL
     * @param {number} esv - End-systolic volume in mL
     * @param {number} sp - Systolic pressure in mmHg
     * @param {number} dp - Diastolic pressure in mmHg
     * @returns {number} PV loop area in mmHg*mL
     */
    calculatePVLoopArea(edv, esv, sp, dp) {
      // Simple approximation of PV loop area
      const sv = edv - esv;
      const pressureRange = sp - dp;
      return sv * pressureRange;
    }
    
    /**
     * Estimate end-diastolic volume (EDV) based on patient parameters
     * 
     * @param {Object} patientState - Patient's current physiological state
     * @returns {number} Estimated EDV in mL
     */
    estimateEDV(patientState) {
      const {
        preload = 8,              // Preload estimate (CVP or PCWP) in mmHg
        age = 50,                 // Age in years
        gender = 'male',          // Gender
        heart_failure = 0,        // Heart failure severity (0-1)
        fluid_status = 0          // Fluid balance (-1 to +1, negative = hypovolemia)
      } = patientState;
      
      // Base EDV (normal ~120-130 mL for males, slightly less for females)
      let baseEDV = gender === 'male' ? 130 : 115;
      
      // Age effect (EDV tends to decrease slightly with age)
      const ageEffect = (age - 50) * -0.2;
      
      // Preload effect
      const preloadEffect = (preload - 8) * 5;
      
      // Heart failure effect (dilated cardiomyopathy increases EDV)
      const heartFailureEffect = heart_failure * 60;
      
      // Fluid status effect
      const fluidStatusEffect = fluid_status * 20;
      
      // Combine all effects
      let edv = baseEDV + ageEffect + preloadEffect + heartFailureEffect + fluidStatusEffect;
      
      // Ensure reasonable range
      edv = Math.max(50, Math.min(edv, 300));
      
      return Math.round(edv);
    }
    
    /**
     * Estimate end-systolic volume (ESV) based on patient parameters
     * 
     * @param {Object} patientState - Patient's current physiological state
     * @param {number} edv - End-diastolic volume in mL
     * @returns {number} Estimated ESV in mL
     */
    estimateESV(patientState, edv) {
      const {
        contractility = 1.0,       // Myocardial contractility (normal = 1.0)
        afterload,                 // Afterload
        systolic = 120,            // Systolic blood pressure in mmHg
        diastolic = 80,            // Diastolic blood pressure in mmHg
        cardiac_depression = 0,    // Cardiac depression factor (0-1)
        heart_failure = 0          // Heart failure severity (0-1)
      } = patientState;
      
      // Calculate afterload from MAP if not provided
      const effectiveAfterload = afterload || this.calculateMAP(systolic, diastolic);
      
      // Normal ejection fraction for reference (normally ~55-65%)
      const normalEF = 0.6;
      
      // Contractility effect on EF
      const contractilityEffect = (contractility - 1) * 0.2;
      
      // Afterload effect on EF (increased afterload decreases EF)
      const normalMAP = 93;
      const afterloadEffect = (normalMAP - effectiveAfterload) * 0.002;
      
      // Cardiac depression effect on EF
      const depressionEffect = -cardiac_depression * 0.3;
      
      // Heart failure effect on EF
      const heartFailureEffect = -heart_failure * 0.4;
      
      // Calculate effective ejection fraction
      let ef = normalEF + contractilityEffect + afterloadEffect + depressionEffect + heartFailureEffect;
      
      // Ensure reasonable range for EF
      ef = Math.max(0.1, Math.min(ef, 0.9));
      
      // Calculate ESV from EDV and EF
      // ESV = EDV * (1 - EF)
      const esv = edv * (1 - ef);
      
      return Math.round(esv);
    }
    
    /**
     * Calculate ejection fraction
     * 
     * @param {number} edv - End-diastolic volume in mL
     * @param {number} esv - End-systolic volume in mL
     * @returns {number} Ejection fraction as decimal
     */
    calculateEF(edv, esv) {
      if (edv <= 0) return 0; // Prevent division by zero
      // EF = (EDV - ESV) / EDV
      return (edv - esv) / edv;
    }
    
    /**
     * Estimate oxygen delivery (DO2)
     * 
     * @param {number} co - Cardiac output in L/min
     * @param {number} hb - Hemoglobin in g/dL
     * @param {number} sao2 - Arterial oxygen saturation in %
     * @returns {number} Oxygen delivery in mL/min
     */
    calculateOxygenDelivery(co, hb, sao2) {
      // DO2 = CO * (Hb * 1.34 * SaO2/100 + 0.003 * PaO2) * 10
      // Assuming normal PaO2 (around 100 mmHg)
      return co * (hb * 1.34 * sao2/100 + 0.003 * 100) * 10;
    }
    
    /**
     * Calculate comprehensive hemodynamic profile
     * 
     * @param {Object} patientState - Current physiological state of the patient
     * @returns {Object} Comprehensive hemodynamic parameters
     */
    calculateHemodynamics(patientState) {
      const {
        hr = 72,
        systolic = 120,
        diastolic = 80,
        cvp = 8,
        pap = 15,
        pcwp = 10,
        height = 170,
        weight = 70,
        hb = 15,
        sao2 = 98,
        svo2 = 70
      } = patientState;
      
      // Calculate BSA
      const bsa = this.calculateBSA(height, weight);
      
      // Calculate stroke volume
      const sv = this.calculateStrokeVolume(patientState);
      
      // Calculate cardiac output
      const co = this.calculateCardiacOutput(hr, sv);
      
      // Calculate MAP
      const map = this.calculateMAP(systolic, diastolic);
      
      // Calculate SVR
      const svr = this.calculateSVR(map, cvp, co);
      
      // Calculate PVR
      const pvr = this.calculatePVR(pap, pcwp, co);
      
      // Calculate cardiac index
      const ci = this.calculateCardiacIndex(co, bsa);
      
      // Calculate stroke volume index
      const svi = this.calculateStrokeVolumeIndex(sv, bsa);
      
      // Calculate left ventricular stroke work
      const lvsw = this.calculateLVSW(sv, map);
      
      // Calculate right ventricular stroke work
      const rvsw = this.calculateRVSW(sv, pap);
      
      // Calculate oxygen delivery
      const do2 = this.calculateOxygenDelivery(co, hb, sao2);
      
      // Calculate oxygen consumption using Fick principle (estimate)
      // VO2 = CO * (CaO2 - CvO2) / 10
      const cao2 = hb * 1.34 * sao2/100 + 0.003 * 100; // Arterial oxygen content
      const cvo2 = hb * 1.34 * svo2/100 + 0.003 * 40;  // Venous oxygen content
      const vo2 = co * (cao2 - cvo2) * 10;
      
      // Calculate oxygen extraction ratio
      const o2er = (cao2 - cvo2) / cao2;
      
      // Estimate ventricular volumes
      const edv = this.estimateEDV(patientState);
      const esv = this.estimateESV(patientState, edv);
      
      // Calculate ejection fraction
      const ef = this.calculateEF(edv, esv);
      
      // Format results with proper precision
      return {
        cardiac_output: Math.round(co * 10) / 10,            // L/min (1 decimal)
        cardiac_index: Math.round(ci * 10) / 10,             // L/min/m² (1 decimal)
        stroke_volume: Math.round(sv),                       // mL
        stroke_volume_index: Math.round(svi),                // mL/m²
        ejection_fraction: Math.round(ef * 100),             // % (0 decimal)
        systemic_vascular_resistance: svr,                   // dyn·s/cm⁵
        pulmonary_vascular_resistance: pvr,                  // dyn·s/cm⁵
        mean_arterial_pressure: map,                         // mmHg
        pulse_pressure: systolic - diastolic,                // mmHg
        rate_pressure_product: Math.round(systolic * hr),    // bpm·mmHg
        left_ventricular_stroke_work: Math.round(lvsw),      // g·m
        right_ventricular_stroke_work: Math.round(rvsw),     // g·m
        end_diastolic_volume: edv,                           // mL
        end_systolic_volume: esv,                            // mL
        oxygen_delivery: Math.round(do2),                    // mL/min
        oxygen_consumption: Math.round(vo2),                 // mL/min
        oxygen_extraction_ratio: Math.round(o2er * 100),     // %
        bsa: Math.round(bsa * 100) / 100                     // m² (2 decimals)
      };
    }
    
    /**
     * Interpret the hemodynamic profile
     * 
     * @param {Object} hemodynamics - Hemodynamic parameters
     * @returns {Object} Clinical interpretation
     */
    interpretHemodynamics(hemodynamics) {
      const {
        cardiac_output,
        cardiac_index,
        stroke_volume,
        ejection_fraction,
        systemic_vascular_resistance,
        mean_arterial_pressure,
        oxygen_delivery,
        oxygen_extraction_ratio
      } = hemodynamics;
      
      let cardiacFunction = 'normal';
      let vascularTone = 'normal';
      let perfusionStatus = 'normal';
      let clinicalState = '';
      
      // Assess cardiac function
      if (cardiac_index < 2.0) {
        cardiacFunction = 'severely reduced';
      } else if (cardiac_index < 2.5) {
        cardiacFunction = 'moderately reduced';
      } else if (cardiac_index < this.referenceRanges.cardiac_index.min) {
        cardiacFunction = 'mildly reduced';
      } else if (cardiac_index > this.referenceRanges.cardiac_index.max) {
        cardiacFunction = 'increased';
      }
      
      // Assess vascular tone
      if (systemic_vascular_resistance < 800) {
        vascularTone = 'decreased';
      } else if (systemic_vascular_resistance > 1600) {
        vascularTone = 'severely increased';
      } else if (systemic_vascular_resistance > 1200) {
        vascularTone = 'moderately increased';
      }
      
      // Assess perfusion
      if (mean_arterial_pressure < 60) {
        perfusionStatus = 'severely compromised';
      } else if (mean_arterial_pressure < 70) {
        perfusionStatus = 'moderately compromised';
      } else if (mean_arterial_pressure > 120) {
        perfusionStatus = 'hypertensive';
      }
      
      // Determine overall hemodynamic state
      if (cardiac_index < 2.5 && systemic_vascular_resistance > 1200) {
        clinicalState = 'cardiogenic shock';
      } else if (cardiac_index < 2.5 && mean_arterial_pressure < 70) {
        clinicalState = 'heart failure';
      } else if (cardiac_index > 4.0 && systemic_vascular_resistance < 800) {
        clinicalState = 'distributive shock';
      } else if (cardiac_index < 2.5 && systemic_vascular_resistance > 1200 && mean_arterial_pressure < 70) {
        clinicalState = 'severe heart failure';
      } else if (cardiac_index > 4.0 && systemic_vascular_resistance < 800 && mean_arterial_pressure < 70) {
        clinicalState = 'septic shock';
      } else if (cardiac_index < 2.0 && oxygen_extraction_ratio > 40) {
        clinicalState = 'shock with tissue hypoxia';
      } else if (cardiac_index > 3.5 && systemic_vascular_resistance > 1200) {
        clinicalState = 'hypertensive state';
      } else if (cardiac_output > this.referenceRanges.cardiac_output.max && stroke_volume > this.referenceRanges.stroke_volume.max) {
        clinicalState = 'hyperdynamic state';
      } else if (ejection_fraction < 40 && cardiac_index < 2.5) {
        clinicalState = 'systolic heart failure';
      }
      
      return {
        cardiac_function: cardiacFunction,
        vascular_tone: vascularTone,
        perfusion_status: perfusionStatus,
        clinical_state: clinicalState || 'hemodynamically stable'
      };
    }
  }
  
  export default HemodynamicsCalculator;