/**
 * BloodGasCalculator.js
 * 
 * This module calculates arterial and venous blood gas values based on a patient's
 * physiological state. It models the relationships between respiratory parameters,
 * acid-base balance, and oxygenation status.
 */

class BloodGasCalculator {
    constructor() {
      // Reference ranges for blood gas parameters
      this.referenceRanges = {
        arterial: {
          ph: { min: 7.35, max: 7.45 },
          paco2: { min: 35, max: 45 },    // mmHg
          pao2: { min: 80, max: 100 },    // mmHg
          hco3: { min: 22, max: 26 },     // mEq/L
          sao2: { min: 95, max: 100 },    // %
          be: { min: -2, max: 2 }         // mEq/L
        },
        venous: {
          ph: { min: 7.32, max: 7.42 },
          pvco2: { min: 40, max: 50 },    // mmHg
          pvo2: { min: 35, max: 45 },     // mmHg
          hco3: { min: 22, max: 26 },     // mEq/L
          svo2: { min: 65, max: 75 },     // %
          be: { min: -2, max: 2 }         // mEq/L
        }
      };
      
      // Default values for calculations
      this.baselineValues = {
        atmospheric_pressure: 760,  // mmHg
        water_vapor_pressure: 47,   // mmHg at 37°C
        respiratory_quotient: 0.8,  // CO2 production / O2 consumption
        hb: 15,                     // g/dL
        temperature: 37             // °C
      };
    }
    
    /**
     * Calculate arterial blood gases based on respiratory and metabolic parameters
     * 
     * @param {Object} patientState - Current physiological state of the patient
     * @returns {Object} Arterial blood gas values
     */
    calculateArterialBloodGas(patientState) {
      // Extract relevant parameters from patient state
      const {
        spo2 = 98,                    // SpO2 in %
        etco2 = 35,                   // End-tidal CO2 in mmHg
        rr = 14,                      // Respiratory rate
        tidal_volume = 500,           // Tidal volume in mL
        fio2 = 0.21,                  // Fraction of inspired oxygen (0.21 = room air)
        temperature = 37,             // Body temperature in °C
        peep = 0,                     // PEEP in cmH2O
        intubated = false,            // Intubation status
        cardiac_output = 5,           // Cardiac output in L/min
        hypoxia = 0,                  // Hypoxia factor (0-1)
        respiratory_depression = 0    // Respiratory depression factor (0-1)
      } = patientState;
      
      // A-a gradient increases with age, FiO2, and various pathologies
      const baseAaGradient = 10 + (patientState.age ? Math.floor(patientState.age / 10) : 3);
      
      // Calculate alveolar oxygen based on alveolar gas equation
      // PAO2 = (FiO2 * (Atmospheric Pressure - Water Vapor Pressure)) - (PaCO2 / Respiratory Quotient)
      const pAO2 = (fio2 * (this.baselineValues.atmospheric_pressure - this.baselineValues.water_vapor_pressure)) - 
                   (etco2 / this.baselineValues.respiratory_quotient);
      
      // Calculate arterial oxygen based on A-a gradient
      // The gradient increases with hypoxia, lung pathology, and decreased cardiac output
      let aAGradient = baseAaGradient;
      aAGradient += hypoxia * 100;  // Hypoxia dramatically increases the gradient
      aAGradient += (5 - cardiac_output) * 10;  // Decreased cardiac output increases gradient
      aAGradient += respiratory_depression * 50;  // Respiratory depression increases gradient
      
      // PEEP improves oxygenation in intubated patients
      if (intubated && peep > 0) {
        aAGradient -= peep * 2;  // Each cmH2O of PEEP improves gradient by ~2 mmHg
      }
      
      // Ensure gradient doesn't become negative
      aAGradient = Math.max(0, aAGradient);
      
      // Calculate PaO2
      let pao2 = pAO2 - aAGradient;
      
      // Ensure reasonable range
      pao2 = Math.max(40, Math.min(pao2, 100));
      
      // Calculate SaO2 based on PaO2 using approximation of oxygen dissociation curve
      // This is a simplified approximation of the oxygen-hemoglobin dissociation curve
      let sao2;
      if (pao2 >= 90) {
        sao2 = 97 + (pao2 - 90) * 0.1; // Flatter part of curve above 90 mmHg
      } else if (pao2 >= 60) {
        sao2 = 90 + (pao2 - 60) * 0.23; // Steeper part of curve between 60-90 mmHg
      } else if (pao2 >= 30) {
        sao2 = 60 + (pao2 - 30) * 1.0; // Very steep part below 60 mmHg
      } else {
        sao2 = Math.max(20, pao2 * 2); // Very low PaO2
      }
      
      // Cap SaO2 at 100%
      sao2 = Math.min(100, sao2);
      
      // PaCO2 is related to but not identical to EtCO2
      // In healthy individuals, PaCO2 is slightly higher than EtCO2
      // In patients with respiratory depression or V/Q mismatch, the gap widens
      const etco2_paco2_gap = 2 + (respiratory_depression * 10) + (hypoxia * 5);
      let paco2 = etco2 + etco2_paco2_gap;
      
      // Calculate pH and bicarbonate using Henderson-Hasselbalch relationship
      // pH = 6.1 + log10([HCO3-] / (0.03 * PaCO2))
      
      // Start with normal bicarbonate
      let hco3 = 24;
      
      // Adjust for metabolic conditions if present in patient state
      if (patientState.metabolic_acidosis) {
        hco3 -= patientState.metabolic_acidosis * 10;
      }
      
      if (patientState.metabolic_alkalosis) {
        hco3 += patientState.metabolic_alkalosis * 10;
      }
      
      // Calculate pH using Henderson-Hasselbalch equation
      let ph = 6.1 + Math.log10(hco3 / (0.03 * paco2));
      
      // Respiratory compensation occurs over time
      // For acute respiratory changes, metabolic compensation is minimal
      // For chronic respiratory changes, metabolic compensation is more significant
      // This would be more complex in a real model with time factors
      
      // Calculate base excess
      // BE = (HCO3- - 24.4) + 14.8 * (pH - 7.4)
      let be = (hco3 - 24.4) + 14.8 * (ph - 7.4);
      
      // Temperature affects blood gases - correct if temperature is not 37°C
      if (temperature !== 37) {
        // Rough corrections for temperature effects
        ph += 0.015 * (37 - temperature);
        paco2 *= Math.pow(1.019, 37 - temperature);
        pao2 *= Math.pow(1.027, 37 - temperature);
      }
      
      // Round values to appropriate precision
      ph = Math.round(ph * 100) / 100;
      paco2 = Math.round(paco2);
      pao2 = Math.round(pao2);
      hco3 = Math.round(hco3 * 10) / 10;
      be = Math.round(be * 10) / 10;
      sao2 = Math.round(sao2);
      
      return {
        ph,
        paco2,
        pao2,
        hco3,
        be,
        sao2
      };
    }
    
    /**
     * Calculate venous blood gases based on arterial values and oxygen consumption
     * 
     * @param {Object} arterialBloodGas - Arterial blood gas values
     * @param {Object} patientState - Current physiological state of the patient
     * @returns {Object} Venous blood gas values
     */
    calculateVenousBloodGas(arterialBloodGas, patientState) {
      // Extract relevant parameters
      const {
        cardiac_output = 5,     // L/min
        o2_consumption = 250    // mL/min, average resting value
      } = patientState;
      
      // Extract arterial values
      const { ph: aPh, paco2, pao2, hco3: aHco3, be: aBe, sao2 } = arterialBloodGas;
      
      // Calculate oxygen content difference based on Fick principle
      // CaO2 - CvO2 = VO2 / (CO * 10)
      // CaO2 = (Hb * 1.34 * SaO2/100) + (0.003 * PaO2)
      
      // Arterial oxygen content in mL O2/dL blood
      const cao2 = (this.baselineValues.hb * 1.34 * sao2/100) + (0.003 * pao2);
      
      // Oxygen content difference in mL O2/dL blood
      const o2ContentDiff = o2_consumption / (cardiac_output * 10);
      
      // Venous oxygen content
      const cvo2 = cao2 - o2ContentDiff;
      
      // Calculate venous saturation
      // CvO2 = (Hb * 1.34 * SvO2/100) + (0.003 * PvO2)
      // Solve for SvO2
      let svo2 = (cvo2 - 0.003 * 40) / (this.baselineValues.hb * 1.34) * 100;
      
      // Ensure SvO2 is within reasonable limits
      svo2 = Math.max(30, Math.min(svo2, sao2));
      
      // Calculate PvO2 using oxygen dissociation curve (reverse calculation)
      // This is an approximation of the inverse of the oxygen-hemoglobin dissociation curve
      let pvo2;
      if (svo2 >= 90) {
        pvo2 = 90 + (svo2 - 90) / 0.1;
      } else if (svo2 >= 70) {
        pvo2 = 60 + (svo2 - 70) / 0.23;
      } else if (svo2 >= 40) {
        pvo2 = 30 + (svo2 - 40) / 1.0;
      } else {
        pvo2 = svo2 / 2;
      }
      
      // Venous PvCO2 is higher than arterial due to CO2 production
      // The difference depends on cardiac output and metabolic rate
      const pvco2 = paco2 + 6 + (5 - cardiac_output) * 2;
      
      // Venous pH is slightly lower than arterial
      // This is due to increased CO2 which shifts the balance toward carbonic acid
      const vPh = aPh - 0.03;
      
      // HCO3- is slightly higher in venous blood due to increased CO2
      const vHco3 = aHco3 + 1.0;
      
      // Base excess is similar to arterial
      const vBe = aBe;
      
      // Round values to appropriate precision
      const ph = Math.round(vPh * 100) / 100;
      const hco3 = Math.round(vHco3 * 10) / 10;
      const be = Math.round(vBe * 10) / 10;
      
      return {
        ph,
        pvco2: Math.round(pvco2),
        pvo2: Math.round(pvo2),
        hco3,
        be,
        svo2: Math.round(svo2)
      };
    }
    
    /**
     * Determine the acid-base status based on blood gas values
     * 
     * @param {Object} bloodGas - Blood gas values
     * @returns {Object} Acid-base interpretation
     */
    interpretAcidBaseStatus(bloodGas) {
      const { ph, paco2, hco3, be } = bloodGas;
      
      let primaryDisorder = 'normal';
      let compensation = 'none';
      let severity = 'mild';
      
      // Determine primary disorder
      if (ph < 7.35) {
        // Acidemia
        if (paco2 > 45 && hco3 >= 22) {
          primaryDisorder = 'respiratory acidosis';
          
          // Determine if there's metabolic compensation
          if (be > 2) {
            compensation = 'metabolic compensation';
          }
          
          // Determine severity based on pCO2
          if (paco2 > 60) severity = 'severe';
          else if (paco2 > 50) severity = 'moderate';
        } 
        else if (hco3 < 22 && paco2 <= 45) {
          primaryDisorder = 'metabolic acidosis';
          
          // Determine if there's respiratory compensation
          // Expected pCO2 = 1.5 * HCO3 + 8 ± 2
          const expectedPaco2 = 1.5 * hco3 + 8;
          if (Math.abs(paco2 - expectedPaco2) <= 2) {
            compensation = 'respiratory compensation';
          }
          
          // Determine severity based on HCO3
          if (hco3 < 15) severity = 'severe';
          else if (hco3 < 18) severity = 'moderate';
        }
        else if (paco2 > 45 && hco3 < 22) {
          // Mixed respiratory and metabolic acidosis
          primaryDisorder = 'mixed respiratory and metabolic acidosis';
          severity = 'moderate to severe';
        }
      } 
      else if (ph > 7.45) {
        // Alkalemia
        if (paco2 < 35 && hco3 <= 26) {
          primaryDisorder = 'respiratory alkalosis';
          
          // Determine if there's metabolic compensation
          if (be < -2) {
            compensation = 'metabolic compensation';
          }
          
          // Determine severity based on pCO2
          if (paco2 < 25) severity = 'severe';
          else if (paco2 < 30) severity = 'moderate';
        } 
        else if (hco3 > 26 && paco2 >= 35) {
          primaryDisorder = 'metabolic alkalosis';
          
          // Determine if there's respiratory compensation
          // Expected pCO2 = 0.7 * HCO3 + 20 ± 1.5
          const expectedPaco2 = 0.7 * hco3 + 20;
          if (Math.abs(paco2 - expectedPaco2) <= 1.5) {
            compensation = 'respiratory compensation';
          }
          
          // Determine severity based on HCO3
          if (hco3 > 35) severity = 'severe';
          else if (hco3 > 30) severity = 'moderate';
        }
        else if (paco2 < 35 && hco3 > 26) {
          // Mixed respiratory and metabolic alkalosis
          primaryDisorder = 'mixed respiratory and metabolic alkalosis';
          severity = 'moderate to severe';
        }
      } 
      else {
        // Normal pH
        if (paco2 > 45 && hco3 > 26) {
          // Compensated respiratory acidosis
          primaryDisorder = 'compensated respiratory acidosis';
        } 
        else if (paco2 < 35 && hco3 < 22) {
          // Compensated respiratory alkalosis
          primaryDisorder = 'compensated respiratory alkalosis';
        } 
        else if (hco3 < 22 && paco2 < 35) {
          // Compensated metabolic acidosis
          primaryDisorder = 'compensated metabolic acidosis';
        } 
        else if (hco3 > 26 && paco2 > 45) {
          // Compensated metabolic alkalosis
          primaryDisorder = 'compensated metabolic alkalosis';
        }
      }
      
      // Assess oxygenation status
      let oxygenationStatus = 'normal';
      let oxygenationSeverity = 'mild';
      
      if ('pao2' in bloodGas) {
        if (bloodGas.pao2 < 60) {
          oxygenationStatus = 'hypoxemia';
          if (bloodGas.pao2 < 40) oxygenationSeverity = 'severe';
          else if (bloodGas.pao2 < 50) oxygenationSeverity = 'moderate';
        } 
        else if (bloodGas.pao2 > 100) {
          oxygenationStatus = 'hyperoxemia';
          if (bloodGas.pao2 > 150) oxygenationSeverity = 'moderate';
        }
      }
      
      return {
        acidBaseStatus: primaryDisorder === 'normal' ? 'normal acid-base status' : `${severity} ${primaryDisorder}`,
        compensation: compensation === 'none' ? 'no compensation' : compensation,
        oxygenation: oxygenationStatus === 'normal' ? 'normal oxygenation' : `${oxygenationSeverity} ${oxygenationStatus}`
      };
    }
    
    /**
     * Calculate all blood gas values based on patient state
     * 
     * @param {Object} patientState - Current physiological state of the patient
     * @returns {Object} Complete blood gas results including interpretation
     */
    calculateBloodGases(patientState) {
      const arterial = this.calculateArterialBloodGas(patientState);
      const venous = this.calculateVenousBloodGas(arterial, patientState);
      const interpretation = this.interpretAcidBaseStatus(arterial);
      
      return {
        arterial,
        venous,
        interpretation
      };
    }
  }
  
  export default BloodGasCalculator;