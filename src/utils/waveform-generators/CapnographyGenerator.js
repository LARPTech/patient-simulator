/**
 * CapnographyGenerator.js
 * 
 * This module generates realistic capnography waveform data based on a patient's
 * physiological state. It simulates the CO2 concentration during the respiratory cycle.
 */

class CapnographyGenerator {
    constructor() {
      // Default parameters
      this.params = {
        sampleRate: 100,      // Samples per second
        etco2: 35,            // End-tidal CO2 in mmHg
        respirationRate: 12,  // Breaths per minute
        ieRatio: 1/2,         // Inspiration:Expiration ratio (1:2)
        patientType: 'adult', // 'adult', 'pediatric', or 'neonatal'
        baseline: 0,          // Baseline CO2 (usually 0 mmHg)
        noiseLevel: 0.2,      // Amount of noise (0-1)
      };
      
      // Phase names and definitions
      this.phases = {
        INSPIRATION: 'inspiration',        // Phase I: Inspiration (CO2 near zero)
        EXPIRATION_START: 'expStart',      // Phase II: Start of expiration (rapid rise)
        ALVEOLAR_PLATEAU: 'plateau',       // Phase III: Alveolar plateau (slight upward slope)
        EXPIRATION_END: 'expEnd'           // Phase IV: End of expiration (rapid fall)
      };
      
      // Abnormality patterns
      this.abnormalityPatterns = {
        NORMAL: 'normal',
        OBSTRUCTIVE: 'obstructive',        // Shark fin appearance (COPD, asthma)
        REBREATHING: 'rebreathing',        // Elevated baseline
        HYPOVENTILATION: 'hypoventilation', // Elevated ETCO2
        HYPERVENTILATION: 'hyperventilation', // Decreased ETCO2
        AIRWAY_LEAK: 'airwayLeak',         // Decreased amplitude, irregular plateau
        ESOPHAGEAL_INTUBATION: 'esophageal', // Very low amplitude, no plateau
        CARDIAC_OSCILLATIONS: 'cardiacOscillations', // Small oscillations in plateau
        CURARE_CLEFT: 'curareCleft'        // Cleft in plateau from returning spontaneous respiration
      };
      
      // Current pattern
      this.pattern = this.abnormalityPatterns.NORMAL;
      
      // Internal state
      this.currentTime = 0;
      this.breathPhase = this.phases.INSPIRATION;
      this.phaseStartTime = 0;
    }
    
    /**
     * Update generator parameters
     * @param {Object} newParams - New parameters to set
     */
    updateParams(newParams) {
      this.params = { ...this.params, ...newParams };
    }
    
    /**
     * Update the pattern to simulate abnormalities
     * @param {string} pattern - The abnormality pattern
     * @param {Object} options - Additional options for the pattern
     */
    setPattern(pattern, options = {}) {
      if (Object.values(this.abnormalityPatterns).includes(pattern)) {
        this.pattern = pattern;
        this.patternOptions = options;
      } else {
        console.warn(`Unknown capnography pattern: ${pattern}`);
      }
    }
    
    /**
     * Apply patient state to update the capnography parameters
     * @param {Object} patientState - Current patient state
     */
    applyPatientState(patientState) {
      const {
        etco2 = 35,               // End-tidal CO2 in mmHg
        rr = 12,                  // Respiratory rate
        intubated = false,        // Intubation status
        peep = 5,                 // PEEP in cmH2O
        tidal_volume = 500,       // Tidal volume in mL
        airway_obstruction = 0,   // Airway obstruction factor (0-1)
        respiratory_depression = 0, // Respiratory depression factor (0-1)
        cardiac_output = 5,       // Cardiac output in L/min
        cardiac_arrest = false    // Cardiac arrest status
      } = patientState;
      
      // Update ETCO2
      this.updateParams({ etco2 });
      
      // Update respiratory rate
      this.updateParams({ respirationRate: rr });
      
      // Intubation status affects the waveform quality
      const noiseLevel = intubated ? 0.1 : 0.3;
      this.updateParams({ noiseLevel });
      
      // Determine the pattern based on patient state
      
      // Cardiac arrest causes severely reduced ETCO2
      if (cardiac_arrest) {
        this.setPattern(this.abnormalityPatterns.ESOPHAGEAL_INTUBATION);
        this.updateParams({ etco2: Math.min(10, etco2) });
        return;
      }
      
      // Airway obstruction causes obstructive pattern
      if (airway_obstruction > 0.3) {
        this.setPattern(this.abnormalityPatterns.OBSTRUCTIVE, { severity: airway_obstruction });
        return;
      }
      
      // Respiratory depression causes hypoventilation pattern
      if (respiratory_depression > 0.3) {
        this.setPattern(this.abnormalityPatterns.HYPOVENTILATION);
        return;
      }
      
      // Very high respiratory rate causes hyperventilation pattern
      if (rr > 25) {
        this.setPattern(this.abnormalityPatterns.HYPERVENTILATION);
        return;
      }
      
      // If none of the above, use normal pattern
      this.setPattern(this.abnormalityPatterns.NORMAL);
      
      // Cardiac output affects ETCO2 - decreased CO decreases ETCO2
      if (cardiac_output < 3) {
        const reduction = (3 - cardiac_output) * 10;
        this.updateParams({ etco2: Math.max(10, etco2 - reduction) });
      }
    }
    
    /**
     * Calculate respiratory cycle details
     * @returns {Object} Cycle timing information
     */
    calculateCycleDetails() {
      const { respirationRate, ieRatio } = this.params;
      
      // Total cycle time in seconds
      const cycleTime = 60 / respirationRate;
      
      // Inspiration time
      const inspirationTime = cycleTime / (1 + ieRatio);
      
      // Expiration time
      const expirationTime = cycleTime - inspirationTime;
      
      // Calculate phase times
      const expStartTime = 0.1 * expirationTime;
      const plateauTime = 0.7 * expirationTime;
      const expEndTime = 0.2 * expirationTime;
      
      return {
        cycleTime,
        inspirationTime,
        expirationTime,
        expStartTime,
        plateauTime,
        expEndTime
      };
    }
    
    /**
     * Generate CO2 value for a normal capnogram
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateNormalValue(timeInPhase, phaseTime) {
      const { etco2, baseline, noiseLevel } = this.params;
      const normalizedTime = timeInPhase / phaseTime; // 0 to 1
      
      let value = 0;
      
      switch (this.breathPhase) {
        case this.phases.INSPIRATION:
          // Inspiration is near baseline
          value = baseline;
          break;
        
        case this.phases.EXPIRATION_START:
          // Rapid rise from baseline to near ETCO2
          value = baseline + (etco2 - baseline) * (1 - Math.pow(1 - normalizedTime, 2));
          break;
        
        case this.phases.ALVEOLAR_PLATEAU:
          // Slow rise to ETCO2 (slightly upward sloping plateau)
          value = etco2 * (0.9 + 0.1 * normalizedTime);
          break;
        
        case this.phases.EXPIRATION_END:
          // Rapid fall back to baseline
          value = etco2 * (1 - Math.pow(normalizedTime, 0.7));
          break;
      }
      
      // Add some noise
      const noise = (Math.random() - 0.5) * noiseLevel * 2 * etco2 * 0.1;
      value += noise;
      
      return Math.max(0, value);
    }
    
    /**
     * Generate CO2 value for an obstructive pattern (shark fin)
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateObstructiveValue(timeInPhase, phaseTime) {
      const { etco2, baseline, noiseLevel } = this.params;
      const severity = (this.patternOptions?.severity || 0.5);
      const normalizedTime = timeInPhase / phaseTime; // 0 to 1
      
      let value = 0;
      
      switch (this.breathPhase) {
        case this.phases.INSPIRATION:
          // Inspiration starts from a higher baseline in severe obstruction
          value = baseline + severity * etco2 * 0.1;
          break;
        
        case this.phases.EXPIRATION_START:
          // Slower rise
          value = baseline + (etco2 * 0.8 - baseline) * Math.pow(normalizedTime, 0.7);
          break;
        
        case this.phases.ALVEOLAR_PLATEAU:
          // No real plateau, continued rise - the shark fin shape
          value = etco2 * (0.8 + 0.2 * Math.pow(normalizedTime, 0.7 + severity));
          break;
        
        case this.phases.EXPIRATION_END:
          // May not return fully to baseline before next breath
          value = etco2 * (1 - Math.pow(normalizedTime, 0.5)) * (1 - severity * 0.3);
          break;
      }
      
      // Add some noise
      const noise = (Math.random() - 0.5) * noiseLevel * 2 * etco2 * 0.1;
      value += noise;
      
      return Math.max(0, value);
    }
    
    /**
     * Generate CO2 value for rebreathing pattern
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateRebreathingValue(timeInPhase, phaseTime) {
      const { etco2, noiseLevel } = this.params;
      const elevatedBaseline = etco2 * 0.2; // Elevated baseline due to rebreathing
      const normalizedTime = timeInPhase / phaseTime; // 0 to 1
      
      let value = 0;
      
      switch (this.breathPhase) {
        case this.phases.INSPIRATION:
          // Baseline is elevated from rebreathing
          value = elevatedBaseline;
          break;
        
        case this.phases.EXPIRATION_START:
          // Rise from elevated baseline
          value = elevatedBaseline + (etco2 - elevatedBaseline) * (1 - Math.pow(1 - normalizedTime, 2));
          break;
        
        case this.phases.ALVEOLAR_PLATEAU:
          // Normal plateau
          value = etco2 * (0.9 + 0.1 * normalizedTime);
          break;
        
        case this.phases.EXPIRATION_END:
          // Falls to elevated baseline instead of zero
          value = etco2 * (1 - Math.pow(normalizedTime, 0.7));
          if (value < elevatedBaseline) value = elevatedBaseline;
          break;
      }
      
      // Add some noise
      const noise = (Math.random() - 0.5) * noiseLevel * 2 * etco2 * 0.1;
      value += noise;
      
      return Math.max(0, value);
    }
    
    /**
     * Generate CO2 value for hyperventilation pattern
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateHyperventilationValue(timeInPhase, phaseTime) {
      // In hyperventilation, ETCO2 is decreased but waveform shape is normal
      const lowerEtco2 = this.params.etco2 * 0.7; // Reduce ETCO2 by 30%
      const savedEtco2 = this.params.etco2;
      
      this.params.etco2 = lowerEtco2;
      const value = this.generateNormalValue(timeInPhase, phaseTime);
      this.params.etco2 = savedEtco2;
      
      return value;
    }
    
    /**
     * Generate CO2 value for hypoventilation pattern
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateHypoventilationValue(timeInPhase, phaseTime) {
      // In hypoventilation, ETCO2 is increased but waveform shape is normal
      const higherEtco2 = this.params.etco2 * 1.3; // Increase ETCO2 by 30%
      const savedEtco2 = this.params.etco2;
      
      this.params.etco2 = higherEtco2;
      const value = this.generateNormalValue(timeInPhase, phaseTime);
      this.params.etco2 = savedEtco2;
      
      return value;
    }
    
    /**
     * Generate CO2 value for airway leak pattern
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateAirwayLeakValue(timeInPhase, phaseTime) {
      const { etco2, baseline, noiseLevel } = this.params;
      const normalizedTime = timeInPhase / phaseTime; // 0 to 1
      
      // Reduce overall amplitude due to leak
      const reducedEtco2 = etco2 * 0.7;
      
      let value = 0;
      
      switch (this.breathPhase) {
        case this.phases.INSPIRATION:
          value = baseline;
          break;
        
        case this.phases.EXPIRATION_START:
          // Less steep rise
          value = baseline + (reducedEtco2 - baseline) * Math.sqrt(normalizedTime);
          break;
        
        case this.phases.ALVEOLAR_PLATEAU:
          // Downward sloping plateau due to continuing leak
          value = reducedEtco2 * (1 - 0.2 * normalizedTime);
          break;
        
        case this.phases.EXPIRATION_END:
          // More gradual descent
          value = reducedEtco2 * (1 - normalizedTime) * 0.8;
          break;
      }
      
      // Add more noise due to turbulent flow around leak
      const noise = (Math.random() - 0.5) * noiseLevel * 3 * etco2 * 0.1;
      value += noise;
      
      return Math.max(0, value);
    }
    
    /**
     * Generate CO2 value for esophageal intubation pattern
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateEsophagealValue(timeInPhase, phaseTime) {
      const { noiseLevel } = this.params;
      
      // Very small or no CO2 readings in esophageal intubation
      // May show small initial CO2 that rapidly disappears
      
      let value = 0;
      
      if (this.breathPhase === this.phases.EXPIRATION_START && timeInPhase < phaseTime * 0.3) {
        // Brief small CO2 spike at start of first few expirations
        // (from CO2 in pharynx/upper airway)
        value = 5 * Math.sin(Math.PI * timeInPhase / (phaseTime * 0.3));
      }
      
      // Add minor noise
      const noise = (Math.random() - 0.5) * noiseLevel * 2;
      value += noise;
      
      return Math.max(0, value);
    }
    
    /**
     * Generate CO2 value for cardiac oscillation pattern
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateCardiacOscillationsValue(timeInPhase, phaseTime) {
      // Start with normal pattern
      let value = this.generateNormalValue(timeInPhase, phaseTime);
      
      // Add cardiac oscillations during plateau phase
      if (this.breathPhase === this.phases.ALVEOLAR_PLATEAU) {
        const { etco2 } = this.params;
        const heartRate = 80; // Assumed heart rate
        const oscillationFrequency = heartRate / 60; // In Hz
        const oscillationAmplitude = etco2 * 0.03; // 3% of ETCO2
        
        // Add oscillation
        value += oscillationAmplitude * Math.sin(2 * Math.PI * oscillationFrequency * timeInPhase);
      }
      
      return value;
    }
    
    /**
     * Generate CO2 value for curare cleft pattern
     * @param {number} timeInPhase - Time (in seconds) spent in the current phase
     * @param {number} phaseTime - Total duration of the current phase
     * @returns {number} CO2 value in mmHg
     */
    generateCurareCleftValue(timeInPhase, phaseTime) {
      const { etco2 } = this.params;
      const normalizedTime = timeInPhase / phaseTime; // 0 to 1
      
      // Start with normal pattern
      let value = this.generateNormalValue(timeInPhase, phaseTime);
      
      // Add cleft during mid-plateau phase
      if (this.breathPhase === this.phases.ALVEOLAR_PLATEAU && 
          normalizedTime > 0.3 && normalizedTime < 0.7) {
        const cleftDepth = etco2 * 0.15; // 15% dip in ETCO2
        const cleftPosition = (normalizedTime - 0.3) / 0.4; // 0-1 during cleft period
        const cleftShape = Math.sin(Math.PI * cleftPosition); // 0 -> 1 -> 0 bell curve
        
        // Subtract the cleft
        value -= cleftDepth * cleftShape;
      }
      
      return value;
    }
    
    /**
     * Get the next CO2 value based on the current pattern
     * @returns {number} The next CO2 value in mmHg
     */
    getNextValue() {
      const cycle = this.calculateCycleDetails();
      
      // Update current time
      this.currentTime += 1 / this.params.sampleRate;
      
      // Calculate position in the respiratory cycle
      const timeInCycle = this.currentTime % cycle.cycleTime;
      
      // Determine breath phase
      if (timeInCycle < cycle.inspirationTime) {
        // Inspiration phase
        if (this.breathPhase !== this.phases.INSPIRATION) {
          this.breathPhase = this.phases.INSPIRATION;
          this.phaseStartTime = timeInCycle;
        }
      } 
      else {
        // Expiration phases
        const timeInExpiration = timeInCycle - cycle.inspirationTime;
        
        if (timeInExpiration < cycle.expStartTime) {
          // Expiration start
          if (this.breathPhase !== this.phases.EXPIRATION_START) {
            this.breathPhase = this.phases.EXPIRATION_START;
            this.phaseStartTime = timeInCycle;
          }
        }
        else if (timeInExpiration < cycle.expStartTime + cycle.plateauTime) {
          // Alveolar plateau
          if (this.breathPhase !== this.phases.ALVEOLAR_PLATEAU) {
            this.breathPhase = this.phases.ALVEOLAR_PLATEAU;
            this.phaseStartTime = timeInCycle;
          }
        }
        else {
          // Expiration end
          if (this.breathPhase !== this.phases.EXPIRATION_END) {
            this.breathPhase = this.phases.EXPIRATION_END;
            this.phaseStartTime = timeInCycle;
          }
        }
      }
      
      // Calculate time spent in current phase
      const timeInPhase = timeInCycle - this.phaseStartTime;
      
      // Get phase duration
      let phaseTime;
      switch (this.breathPhase) {
        case this.phases.INSPIRATION:
          phaseTime = cycle.inspirationTime;
          break;
        case this.phases.EXPIRATION_START:
          phaseTime = cycle.expStartTime;
          break;
        case this.phases.ALVEOLAR_PLATEAU:
          phaseTime = cycle.plateauTime;
          break;
        case this.phases.EXPIRATION_END:
          phaseTime = cycle.expEndTime;
          break;
      }
      
      // Generate CO2 value based on current pattern
      let co2Value;
      switch (this.pattern) {
        case this.abnormalityPatterns.OBSTRUCTIVE:
          co2Value = this.generateObstructiveValue(timeInPhase, phaseTime);
          break;
        case this.abnormalityPatterns.REBREATHING:
          co2Value = this.generateRebreathingValue(timeInPhase, phaseTime);
          break;
        case this.abnormalityPatterns.HYPOVENTILATION:
          co2Value = this.generateHypoventilationValue(timeInPhase, phaseTime);
          break;
        case this.abnormalityPatterns.HYPERVENTILATION:
          co2Value = this.generateHyperventilationValue(timeInPhase, phaseTime);
          break;
        case this.abnormalityPatterns.AIRWAY_LEAK:
          co2Value = this.generateAirwayLeakValue(timeInPhase, phaseTime);
          break;
        case this.abnormalityPatterns.ESOPHAGEAL_INTUBATION:
          co2Value = this.generateEsophagealValue(timeInPhase, phaseTime);
          break;
        case this.abnormalityPatterns.CARDIAC_OSCILLATIONS:
          co2Value = this.generateCardiacOscillationsValue(timeInPhase, phaseTime);
          break;
        case this.abnormalityPatterns.CURARE_CLEFT:
          co2Value = this.generateCurareCleftValue(timeInPhase, phaseTime);
          break;
        case this.abnormalityPatterns.NORMAL:
        default:
          co2Value = this.generateNormalValue(timeInPhase, phaseTime);
          break;
      }
      
      return co2Value;
    }
    
    /**
     * Generate a series of CO2 values for a specific duration
     * @param {number} duration - Duration in seconds
     * @returns {Array} Array of CO2 values
     */
    generateWaveform(duration) {
      const numSamples = Math.floor(duration * this.params.sampleRate);
      const waveform = [];
      
      for (let i = 0; i < numSamples; i++) {
        waveform.push(this.getNextValue());
      }
      
      return waveform;
    }
    
    /**
     * Reset the generator to initial state
     */
    reset() {
      this.currentTime = 0;
      this.breathPhase = this.phases.INSPIRATION;
      this.phaseStartTime = 0;
      this.pattern = this.abnormalityPatterns.NORMAL;
    }
    
    /**
     * Get the current ETCO2 value
     * @returns {number} The current ETCO2 value in mmHg
     */
    getETCO2() {
      // Apply pattern-specific modifications
      switch (this.pattern) {
        case this.abnormalityPatterns.HYPERVENTILATION:
          return this.params.etco2 * 0.7;
        case this.abnormalityPatterns.HYPOVENTILATION:
          return this.params.etco2 * 1.3;
        case this.abnormalityPatterns.AIRWAY_LEAK:
          return this.params.etco2 * 0.7;
        case this.abnormalityPatterns.ESOPHAGEAL_INTUBATION:
          return this.params.etco2 * 0.1;
        default:
          return this.params.etco2;
      }
    }
  }
  
  export default CapnographyGenerator;