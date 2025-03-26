/**
 * ECGGenerator.js
 * 
 * This module generates realistic ECG waveform data based on a patient's
 * physiological state. It simulates various normal and pathological cardiac rhythms.
 */

class ECGGenerator {
    constructor() {
      // Default parameters
      this.params = {
        sampleRate: 250,       // Samples per second
        heartRate: 72,         // Heart rate in beats per minute
        pWaveAmplitude: 0.25,  // P wave amplitude (mV)
        qrsAmplitude: 1.0,     // QRS complex amplitude (mV)
        tWaveAmplitude: 0.3,   // T wave amplitude (mV)
        prInterval: 0.16,      // PR interval in seconds
        qrsDuration: 0.08,     // QRS duration in seconds
        qtInterval: 0.36,      // QT interval in seconds
        baseline: 0,           // Baseline (mV)
        noiseLevel: 0.03,      // Amount of baseline noise (mV)
        artifactProbability: 0.001, // Probability of artifacts per sample
        leadType: 'II'         // ECG lead
      };
      
      // Rhythm types
      this.rhythmTypes = {
        NORMAL_SINUS: 'normalSinus',
        SINUS_BRADYCARDIA: 'sinusBradycardia',
        SINUS_TACHYCARDIA: 'sinusTachycardia',
        ATRIAL_FIBRILLATION: 'atrialFibrillation',
        ATRIAL_FLUTTER: 'atrialFlutter',
        VENTRICULAR_TACHYCARDIA: 'ventricularTachycardia',
        VENTRICULAR_FIBRILLATION: 'ventricularFibrillation',
        ASYSTOLE: 'asystole',
        FIRST_DEGREE_BLOCK: 'firstDegreeBlock',
        SECOND_DEGREE_BLOCK_TYPE1: 'secondDegreeBlockType1',
        SECOND_DEGREE_BLOCK_TYPE2: 'secondDegreeBlockType2',
        THIRD_DEGREE_BLOCK: 'thirdDegreeBlock',
        PVC: 'prematureVentricularContraction',
        PAC: 'prematureAtrialContraction',
        PACED: 'paced'
      };
      
      // Current rhythm
      this.rhythm = this.rhythmTypes.NORMAL_SINUS;
      
      // Internal state
      this.currentTime = 0;
      this.lastRWave = 0;
      this.rrInterval = 60 / this.params.heartRate;
      this.nextPVC = -1;
      this.nextPAC = -1;
      this.wenckebach = { count: 0, maxCount: 3 }; // For Wenckebach/Mobitz Type I
      
      // For atrial fibrillation/flutter
      this.atrialActivity = {
        lastActivity: 0,
        rate: 300, // For flutter, ~300 bpm
        rrVariability: 0.2 // RR interval variability for afib (0-1)
      };
    }
    
    /**
     * Update generator parameters
     * @param {Object} newParams - New parameters to set
     */
    updateParams(newParams) {
      this.params = { ...this.params, ...newParams };
      
      // Update RR interval if heart rate changed
      if (newParams.heartRate) {
        this.rrInterval = 60 / this.params.heartRate;
      }
    }
    
    /**
     * Set the cardiac rhythm
     * @param {string} rhythm - The rhythm type to simulate
     * @param {Object} options - Additional options for the rhythm
     */
    setRhythm(rhythm, options = {}) {
      if (Object.values(this.rhythmTypes).includes(rhythm)) {
        this.rhythm = rhythm;
        this.rhythmOptions = options;
        
        // Reset internal counters for certain rhythms
        if (rhythm === this.rhythmTypes.SECOND_DEGREE_BLOCK_TYPE1) {
          this.wenckebach = { 
            count: 0, 
            maxCount: options.maxCount || 3, // Typically 3-4 beats in a cycle
            prIncrease: options.prIncrease || 0.04 // PR interval increases by this each beat
          };
        }
        
        if (rhythm === this.rhythmTypes.PVC) {
          // Schedule the next PVC
          this.scheduleNextPVC();
        }
        
        if (rhythm === this.rhythmTypes.PAC) {
          // Schedule the next PAC
          this.scheduleNextPAC();
        }
      } else {
        console.warn(`Unknown cardiac rhythm: ${rhythm}`);
      }
    }
    
    /**
     * Apply patient state to update the ECG parameters
     * @param {Object} patientState - Current patient state
     */
    applyPatientState(patientState) {
      const {
        hr = 72,                   // Heart rate in bpm
        cardiac_output = 5,        // Cardiac output in L/min
        systolic = 120,            // Systolic blood pressure
        diastolic = 80,            // Diastolic blood pressure
        cardiac_depression = 0,    // Cardiac depression factor (0-1)
        spo2 = 98,                 // Oxygen saturation (%)
        k = 4.0,                   // Potassium level (mEq/L)
        ca = 9.0,                  // Calcium level (mg/dL)
        hypoxia = 0,               // Hypoxia factor (0-1)
        cardiac_arrest = false     // Cardiac arrest status
      } = patientState;
      
      // Update heart rate
      this.updateParams({ heartRate: hr });
      
      // Determine rhythm based on patient state
      
      // Check for cardiac arrest
      if (cardiac_arrest) {
        if (Math.random() < 0.7) {
          // 70% chance of VF/Asystole during cardiac arrest
          this.setRhythm(Math.random() < 0.5 ? 
            this.rhythmTypes.VENTRICULAR_FIBRILLATION : 
            this.rhythmTypes.ASYSTOLE
          );
        } else {
          // 30% chance of VT during cardiac arrest
          this.setRhythm(this.rhythmTypes.VENTRICULAR_TACHYCARDIA);
        }
        return;
      }
      
      // Severe bradycardia
      if (hr < 50) {
        if (Math.random() < 0.7) {
          this.setRhythm(this.rhythmTypes.SINUS_BRADYCARDIA);
        } else {
          // Some chance of heart block with bradycardia
          const blockType = Math.random();
          if (blockType < 0.5) {
            this.setRhythm(this.rhythmTypes.FIRST_DEGREE_BLOCK, { prInterval: 0.22 });
          } else if (blockType < 0.8) {
            this.setRhythm(this.rhythmTypes.SECOND_DEGREE_BLOCK_TYPE1);
          } else {
            this.setRhythm(this.rhythmTypes.THIRD_DEGREE_BLOCK, { atrialRate: 70, ventricularRate: hr });
          }
        }
        return;
      }
      
      // Severe tachycardia
      if (hr > 140) {
        const tachyType = Math.random();
        if (tachyType < 0.6) {
          this.setRhythm(this.rhythmTypes.SINUS_TACHYCARDIA);
        } else if (tachyType < 0.9) {
          this.setRhythm(this.rhythmTypes.ATRIAL_FIBRILLATION, { ventricularRate: hr });
        } else {
          this.setRhythm(this.rhythmTypes.VENTRICULAR_TACHYCARDIA, { rate: hr });
        }
        return;
      }
      
      // Hypoxia increases risk of arrhythmias
      if (hypoxia > 0.6 || spo2 < 88) {
        const arrhythmiaType = Math.random();
        if (arrhythmiaType < 0.4) {
          this.setRhythm(this.rhythmTypes.PVC, { frequency: 0.2 });
        } else if (arrhythmiaType < 0.7) {
          this.setRhythm(this.rhythmTypes.ATRIAL_FIBRILLATION, { ventricularRate: hr });
        } else {
          this.setRhythm(this.rhythmTypes.NORMAL_SINUS);
        }
        return;
      }
      
      // Moderate cardiac depression
      if (cardiac_depression > 0.4) {
        this.setRhythm(this.rhythmTypes.PVC, { frequency: cardiac_depression * 0.3 });
        return;
      }
      
      // Electrolyte abnormalities
      if (k > 6.0) { // Hyperkalemia
        this.updateParams({ 
          tWaveAmplitude: 0.6, // Tall T waves
          pWaveAmplitude: 0.1, // Flattened P waves
          qrsDuration: 0.14    // Widened QRS
        });
      } else if (k < 3.0) { // Hypokalemia
        this.updateParams({
          tWaveAmplitude: 0.1, // Flattened T waves
          uWavePresent: true   // U waves present
        });
      }
      
      if (ca < 7.0) { // Hypocalcemia
        this.updateParams({
          qtInterval: 0.48     // Prolonged QT
        });
      } else if (ca > 11.0) { // Hypercalcemia
        this.updateParams({
          qtInterval: 0.30     // Shortened QT
        });
      }
      
      // Default to normal sinus rhythm if no specific condition applies
      if (this.rhythm !== this.rhythmTypes.NORMAL_SINUS) {
        this.setRhythm(this.rhythmTypes.NORMAL_SINUS);
      }
    }
    
    /**
     * Schedule the next PVC
     */
    scheduleNextPVC() {
      const frequency = this.rhythmOptions?.frequency || 0.1; // PVCs per normal beat
      
      // Determine if a PVC should occur in the next few beats
      const occurrenceChance = Math.random();
      
      if (occurrenceChance < frequency) {
        // Schedule PVC in 1-3 beats from now
        const beatsAway = Math.floor(Math.random() * 3) + 1;
        this.nextPVC = this.currentTime + (beatsAway * this.rrInterval);
      } else {
        // No PVC in the near future
        this.nextPVC = -1;
      }
    }
    
    /**
     * Schedule the next PAC
     */
    scheduleNextPAC() {
      const frequency = this.rhythmOptions?.frequency || 0.1; // PACs per normal beat
      
      // Determine if a PAC should occur in the next few beats
      const occurrenceChance = Math.random();
      
      if (occurrenceChance < frequency) {
        // Schedule PAC in 1-3 beats from now
        const beatsAway = Math.floor(Math.random() * 3) + 1;
        this.nextPAC = this.currentTime + (beatsAway * this.rrInterval);
      } else {
        // No PAC in the near future
        this.nextPAC = -1;
      }
    }
    
    /**
     * Generate a P wave
     * @param {number} time - Time relative to the start of the P wave
     * @param {Object} params - Wave parameters
     * @returns {number} ECG value in mV
     */
    generatePWave(time, params = {}) {
      const {
        amplitude = this.params.pWaveAmplitude,
        duration = 0.08, // P wave duration in seconds
        shape = 'gaussian' // Shape: 'gaussian' or 'sine'
      } = params;
      
      if (time < 0 || time > duration) return 0;
      
      let value = 0;
      
      if (shape === 'gaussian') {
        // Gaussian curve for P wave
        const center = duration / 2;
        const width = duration / 4;
        value = amplitude * Math.exp(-Math.pow((time - center) / width, 2));
      } else {
        // Sine wave for P wave
        value = amplitude * Math.sin(Math.PI * time / duration);
      }
      
      return value;
    }
    
    /**
     * Generate a QRS complex
     * @param {number} time - Time relative to the start of the QRS complex
     * @param {Object} params - Wave parameters
     * @returns {number} ECG value in mV
     */
    generateQRS(time, params = {}) {
      const {
        amplitude = this.params.qrsAmplitude,
        duration = this.params.qrsDuration,
        qRatio = 0.25, // Q wave amplitude ratio to R
        sRatio = 0.25, // S wave amplitude ratio to R
        qDuration = 0.2, // Q wave duration ratio to QRS
        rDuration = 0.4, // R wave duration ratio to QRS
        sDuration = 0.4, // S wave duration ratio to QRS
        type = 'normal' // Type: 'normal', 'wide', 'pvc', 'paced'
      } = params;
      
      if (time < 0 || time > duration) return 0;
      
      let value = 0;
      
      // Adjust parameters for different QRS types
      let q = qRatio;
      let s = sRatio;
      
      if (type === 'pvc' || type === 'ventricular') {
        // PVCs have wider, often taller, and sometimes different morphology
        q = 0.1;
        s = 0.5;
      } else if (type === 'paced') {
        // Paced rhythm has a pacing spike followed by wide QRS
        if (time < 0.01) {
          return amplitude * 2; // Pacing spike
        }
      }
      
      // Calculate times for each part of QRS
      const qEnd = duration * qDuration;
      const rEnd = qEnd + (duration * rDuration);
      
      // Generate each part of the QRS
      if (time < qEnd) {
        // Q wave (downward deflection)
        value = -q * amplitude * Math.sin(Math.PI * time / (2 * qEnd));
      } else if (time < rEnd) {
        // R wave (upward deflection)
        const rTime = time - qEnd;
        const rDur = rEnd - qEnd;
        value = amplitude * Math.sin(Math.PI * rTime / rDur);
      } else {
        // S wave (downward deflection)
        const sTime = time - rEnd;
        const sDur = duration - rEnd;
        value = -s * amplitude * Math.sin(Math.PI * sTime / (2 * sDur));
      }
      
      return value;
    }
    
    /**
     * Generate a T wave
     * @param {number} time - Time relative to the start of the T wave
     * @param {Object} params - Wave parameters
     * @returns {number} ECG value in mV
     */
    generateTWave(time, params = {}) {
      const {
        amplitude = this.params.tWaveAmplitude,
        duration = 0.16, // T wave duration in seconds
        inverted = false // Whether the T wave is inverted
      } = params;
      
      if (time < 0 || time > duration) return 0;
      
      // Asymmetric T wave with slower rise and faster fall
      const peak = duration * 0.6; // Peak is at 60% of T wave duration
      
      let value;
      if (time < peak) {
        // Rising part
        value = amplitude * Math.sin((Math.PI / 2) * time / peak);
      } else {
        // Falling part
        value = amplitude * Math.cos((Math.PI / 2) * (time - peak) / (duration - peak));
      }
      
      return inverted ? -value : value;
    }
    
    /**
     * Generate a U wave (if present)
     * @param {number} time - Time relative to the start of the U wave
     * @param {Object} params - Wave parameters
     * @returns {number} ECG value in mV
     */
    generateUWave(time, params = {}) {
      const {
        amplitude = this.params.tWaveAmplitude * 0.25, // U wave typically smaller than T
        duration = 0.12, // U wave duration in seconds
      } = params;
      
      if (time < 0 || time > duration) return 0;
      
      // Simple sine wave for U wave
      return amplitude * Math.sin(Math.PI * time / duration);
    }
    
    /**
     * Generate ST segment
     * @param {number} time - Time relative to the start of the ST segment
     * @param {Object} params - Segment parameters
     * @returns {number} ECG value in mV
     */
    generateSTSegment(time, params = {}) {
      const {
        duration = 0.1, // ST segment duration in seconds
        elevation = 0,  // ST elevation/depression in mV
      } = params;
      
      if (time < 0 || time > duration) return 0;
      
      return elevation;
    }
    
    /**
     * Generate a typical PQRST complex
     * @param {number} time - Time in seconds from the start of the complex
     * @param {Object} params - Parameters for the complex
     * @returns {number} ECG value in mV
     */
    generateNormalComplex(time, params = {}) {
      const {
        prInterval = this.params.prInterval,
        qrsDuration = this.params.qrsDuration,
        qtInterval = this.params.qtInterval,
        qrsType = 'normal',
        tInverted = false,
        stElevation = 0,
        pWavePresent = true
      } = params;
      
      let value = 0;
      
      // Calculate segment timings
      const pStart = 0;
      const pDuration = 0.08;
      const qrsStart = prInterval;
      const stStart = qrsStart + qrsDuration;
      const stDuration = qtInterval - qrsDuration - 0.16; // Subtracting T wave duration
      const tStart = stStart + stDuration;
      const uStart = tStart + 0.16; // After T wave
      
      // Generate each component
      if (pWavePresent && time >= pStart && time < pStart + pDuration) {
        value = this.generatePWave(time - pStart);
      } else if (time >= qrsStart && time < qrsStart + qrsDuration) {
        value = this.generateQRS(time - qrsStart, { type: qrsType, duration: qrsDuration });
      } else if (time >= stStart && time < stStart + stDuration) {
        value = this.generateSTSegment(time - stStart, { elevation: stElevation });
      } else if (time >= tStart && time < tStart + 0.16) {
        value = this.generateTWave(time - tStart, { inverted: tInverted });
      } else if (this.params.uWavePresent && time >= uStart && time < uStart + 0.12) {
        value = this.generateUWave(time - uStart);
      }
      
      return value;
    }
    
    /**
     * Generate a PVC complex
     * @param {number} time - Time in seconds from the start of the complex
     * @returns {number} ECG value in mV
     */
    generatePVCComplex(time) {
      return this.generateNormalComplex(time, {
        qrsDuration: this.params.qrsDuration * 1.5, // Wider QRS
        qrsType: 'pvc',
        pWavePresent: false, // No P wave
        tInverted: true // Inverted T wave
      });
    }
    
    /**
     * Generate a PAC complex
     * @param {number} time - Time in seconds from the start of the complex
     * @returns {number} ECG value in mV
     */
    generatePACComplex(time) {
      return this.generateNormalComplex(time, {
        prInterval: this.params.prInterval * 0.8, // Shorter PR interval
        tInverted: false
      });
    }
    
    /**
     * Generate a ventricular complex for ventricular rhythms
     * @param {number} time - Time in seconds from the start of the complex
     * @returns {number} ECG value in mV
     */
    generateVentricularComplex(time) {
      return this.generateNormalComplex(time, {
        qrsDuration: this.params.qrsDuration * 2, // Very wide QRS
        qrsType: 'ventricular',
        pWavePresent: false, // No P wave
        tInverted: true // Inverted T wave
      });
    }
    
    /**
     * Generate a paced complex
     * @param {number} time - Time in seconds from the start of the complex
     * @returns {number} ECG value in mV
     */
    generatePacedComplex(time) {
      return this.generateNormalComplex(time, {
        qrsDuration: this.params.qrsDuration * 1.8, // Wider QRS
        qrsType: 'paced',
        pWavePresent: false // Often no visible P wave
      });
    }
    
    /**
     * Generate atrial fibrillation waveform
     * @param {number} time - Time in seconds
     * @returns {number} ECG value in mV
     */
    generateAtrialFibrillation(time) {
      // Atrial fibrillation has: 
      // 1. Absence of P waves 
      // 2. Irregular RR intervals
      // 3. "Fibrillatory" baseline between QRS complexes
      
      // First, determine if this time point is during a QRS-T complex
      const timeSinceLastR = time - this.lastRWave;
      
      // If we're in a QRS-T complex
      if (timeSinceLastR < (this.params.qtInterval + 0.04)) {
        return this.generateNormalComplex(timeSinceLastR, {
          pWavePresent: false // No P wave
        });
      }
      
      // Check if it's time for a new QRS
      const rrVariability = this.atrialActivity.rrVariability; // 0.2 means ±20% variation
      const irregularRR = this.rrInterval * (1 + (Math.random() * 2 - 1) * rrVariability);
      
      if (timeSinceLastR >= irregularRR) {
        this.lastRWave = time;
        return this.generateNormalComplex(0, {
          pWavePresent: false
        });
      }
      
      // Otherwise, generate fibrillatory baseline
      // This is small irregular wavelets at a rate of 350-600/min
      const fibrillationFrequency = 8; // Hz
      const fibrillationAmplitude = this.params.pWaveAmplitude * 0.25;
      
      return fibrillationAmplitude * (
        0.3 * Math.sin(2 * Math.PI * fibrillationFrequency * time) +
        0.3 * Math.sin(2 * Math.PI * (fibrillationFrequency * 1.3) * time) +
        0.4 * Math.sin(2 * Math.PI * (fibrillationFrequency * 0.7) * time + 0.2)
      );
    }
    
    /**
     * Generate atrial flutter waveform
     * @param {number} time - Time in seconds
     * @returns {number} ECG value in mV
     */
    generateAtrialFlutter(time) {
      // Atrial flutter has:
      // 1. Sawtooth "flutter" waves (F waves) at around 300 bpm
      // 2. Usually with some degree of AV block (often 2:1, 3:1, or 4:1)
      
      // First, determine if this time point is during a QRS-T complex
      const timeSinceLastR = time - this.lastRWave;
      
      // If we're in a QRS-T complex
      if (timeSinceLastR < (this.params.qtInterval + 0.04)) {
        return this.generateNormalComplex(timeSinceLastR, {
          pWavePresent: false // No P wave, replaced by flutter waves
        });
      }
      
      // Check if it's time for a new QRS
      // In flutter with 2:1 conduction, every other flutter wave conducts
      const atrialRate = this.atrialActivity.rate; // ~300 bpm
      const conductionRatio = this.rhythmOptions?.conductionRatio || 2; // Default 2:1 block
      const ventricularRate = atrialRate / conductionRatio;
      const rrInterval = 60 / ventricularRate;
      
      if (timeSinceLastR >= rrInterval) {
        this.lastRWave = time;
        return this.generateNormalComplex(0, {
          pWavePresent: false
        });
      }
      
      // Otherwise, generate flutter waves (sawtooth pattern)
      const flutterPeriod = 60 / atrialRate; // Period of one flutter wave
      const flutterAmplitude = this.params.pWaveAmplitude * 0.6;
      
      // Position within the current flutter wave
      const flutterPosition = (time % flutterPeriod) / flutterPeriod;
      
      // Sawtooth pattern
      if (flutterPosition < 0.5) {
        return flutterAmplitude * (flutterPosition * 2);
      } else {
        return flutterAmplitude * ((1 - flutterPosition) * 2);
      }
    }
    
    /**
     * Generate ventricular tachycardia waveform
     * @param {number} time - Time in seconds
     * @returns {number} ECG value in mV
     */
    generateVentricularTachycardia(time) {
      // Ventricular tachycardia has:
      // 1. Wide QRS complexes
      // 2. Usually regular rhythm
      // 3. Rate typically 100-250 bpm
      // 4. No visible P waves
      
      const vtRate = this.rhythmOptions?.rate || 180; // Default 180 bpm
      const rrInterval = 60 / vtRate;
      
      // Determine position in the rhythm
      const timeSinceLastR = time - this.lastRWave;
      
      // Check if it's time for a new QRS
      if (timeSinceLastR >= rrInterval) {
        this.lastRWave = time;
      }
      
      // Generate the ventricular complex
      return this.generateVentricularComplex(timeSinceLastR % rrInterval);
    }
    
    /**
     * Generate ventricular fibrillation waveform
     * @param {number} time - Time in seconds
     * @returns {number} ECG value in mV
     */
    generateVentricularFibrillation(time) {
      // Ventricular fibrillation has:
      // 1. Chaotic, irregular waveform
      // 2. No discernible P waves, QRS complexes, or T waves
      // 3. Amplitude typically decreases over time (coarse to fine VF)
      
      const vfFrequency = 4; // Base frequency in Hz
      const vfAmplitude = this.params.qrsAmplitude * 0.8; // Amplitude relative to normal QRS
      
      // VF gets finer over time (if specified in options)
      let amplitude = vfAmplitude;
      if (this.rhythmOptions?.progressive) {
        const startTime = this.rhythmOptions.startTime || 0;
        const duration = this.rhythmOptions.duration || 60; // Default 1 minute
        const elapsedTime = time - startTime;
        const progressRatio = Math.min(1, Math.max(0, elapsedTime / duration));
        
        // Amplitude decreases over time (coarse -> fine VF)
        amplitude = vfAmplitude * (1 - progressRatio * 0.8);
      }
      
      // Generate chaotic waveform using multiple sine waves with different frequencies
      return amplitude * (
        1.0 * Math.sin(2 * Math.PI * vfFrequency * time) +
        0.5 * Math.sin(2 * Math.PI * (vfFrequency * 2.3) * time) +
        0.3 * Math.sin(2 * Math.PI * (vfFrequency * 3.9) * time) +
        0.2 * Math.sin(2 * Math.PI * (vfFrequency * 4.7) * time + 1) +
        0.1 * Math.sin(2 * Math.PI * (vfFrequency * 15) * time + 2)
      );
    }
    
    /**
     * Generate asystole waveform
     * @returns {number} ECG value in mV
     */
    generateAsystole() {
      // Asystole is essentially a flat line with minimal noise
      return (Math.random() - 0.5) * this.params.noiseLevel;
    }
    
    /**
     * Generate first degree AV block waveform
     * @param {number} time - Time in seconds
     * @returns {number} ECG value in mV
     */
    generateFirstDegreeBlock(time) {
      // First degree AV block has:
      // 1. Prolonged PR interval (> 0.2 seconds)
      // 2. Otherwise normal PQRST morphology
      
      // Determine position in the rhythm
      const timeSinceLastR = time - this.lastRWave;
      
      // Check if it's time for a new QRS
      if (timeSinceLastR >= this.rrInterval) {
        this.lastRWave = time;
      }
      
      // Generate normal complex with prolonged PR interval
      const prolongedPR = this.rhythmOptions?.prInterval || 0.22; // Default 220 ms
      return this.generateNormalComplex(timeSinceLastR % this.rrInterval, {
        prInterval: prolongedPR
      });
    }
    
    /**
     * Generate Wenckebach/Mobitz type I waveform
     * @param {number} time - Time in seconds
     * @returns {number} ECG value in mV
     */
    generateWenckebach(time) {
      // Wenckebach (Mobitz type I) has:
      // 1. Progressive PR prolongation
      // 2. Eventually a dropped QRS
      // 3. Pattern then repeats
      
      // Determine position in the rhythm
      const timeSinceLastR = time - this.lastRWave;
      
      // Check if it's time for a new beat based on current PR interval
      if (timeSinceLastR >= this.rrInterval) {
        // Move to next beat in the Wenckebach cycle
        this.wenckebach.count++;
        
        // If we've reached the maximum count, drop a beat and reset the cycle
        if (this.wenckebach.count > this.wenckebach.maxCount) {
          // Dropped beat - extend the interval
          this.wenckebach.count = 0;
          // Skip this beat (don't update lastRWave)
        } else {
          this.lastRWave = time;
        }
      }
      
      // Calculate PR interval based on position in Wenckebach cycle
      const basePR = this.params.prInterval;
      const increasedPR = basePR + (this.wenckebach.count * this.wenckebach.prIncrease);
      
      // Check if we're in a dropped beat
      if (this.wenckebach.count === 0 && timeSinceLastR < this.rrInterval * 1.8) {
        // During a dropped beat, we only see P waves, no QRS
        // Calculate time since the last P wave
        const pInterval = this.rrInterval;
        const timeSinceLastP = timeSinceLastR % pInterval;
        
        if (timeSinceLastP < 0.08) { // P wave duration
          return this.generatePWave(timeSinceLastP);
        } else {
          return 0;
        }
      }
      
      // Generate normal complex with progressively prolonged PR interval
      return this.generateNormalComplex(timeSinceLastR % this.rrInterval, {
        prInterval: increasedPR
      });
    }
    
    /**
     * Generate Mobitz type II block waveform
     * @param {number} time - Time in seconds
     * @returns {number} ECG value in mV
     */
    generateMobitzII(time) {
      // Mobitz type II has:
      // 1. Constant PR interval
      // 2. Periodically dropped QRS complexes
      // 3. Pattern is often 2:1, 3:1, or 4:1 (P:QRS ratio)
      
      const conductionRatio = this.rhythmOptions?.conductionRatio || 2; // Default 2:1 block
      
      // Determine position in the rhythm
      const timeSinceLastR = time - this.lastRWave;
      
      // Calculate P wave interval
      const pInterval = this.rrInterval / conductionRatio;
      
      // Check if it's time for a new QRS
      if (timeSinceLastR >= this.rrInterval) {
        this.lastRWave = time;
      }
      
      // Calculate time within the current P to P interval
      const positionInPInterval = timeSinceLastR % pInterval;
      
      // Determine which P wave in the cycle we're at
      const pWaveNumber = Math.floor(timeSinceLastR / pInterval) % conductionRatio;
      
      // Only generate QRS if this is the P wave that conducts (first one in cycle)
      const generatesQRS = (pWaveNumber === 0);
      
      // Generate normal complex with only some P waves conducting
      if (positionInPInterval < 0.08) {
        // Generate P wave
        return this.generatePWave(positionInPInterval);
      } else if (generatesQRS && positionInPInterval >= this.params.prInterval && 
                 positionInPInterval < this.params.prInterval + this.params.qrsDuration) {
        // Generate QRS if this P wave conducts
        return this.generateQRS(positionInPInterval - this.params.prInterval);
      } else if (generatesQRS && positionInPInterval >= (this.params.prInterval + this.params.qrsDuration) && 
                 positionInPInterval < this.params.qtInterval + this.params.prInterval) {
        // Generate ST and T wave if this P wave conducts
        const timeInST = positionInPInterval - (this.params.prInterval + this.params.qrsDuration);
        const stDuration = this.params.qtInterval - this.params.qrsDuration - 0.16;
        
        if (timeInST < stDuration) {
          return this.generateSTSegment(timeInST);
        } else {
          return this.generateTWave(timeInST - stDuration);
        }
      }
      
      return 0;
    }
    
    /**
     * Generate third degree AV block waveform
     * @param {number} time - Time in seconds
     * @returns {number} ECG value in mV
     */
    generateThirdDegreeBlock(time) {
      // Third degree (complete) AV block has:
      // 1. P waves and QRS complexes that are completely dissociated
      // 2. Atrial rate is normal or fast, ventricular rate is slow
      // 3. PR interval constantly changing
      
      const atrialRate = this.rhythmOptions?.atrialRate || 75; // Default 75 bpm
      const ventricularRate = this.rhythmOptions?.ventricularRate || 40; // Default 40 bpm
      
      // Calculate intervals
      const pInterval = 60 / atrialRate;
      const qrsInterval = 60 / ventricularRate;
      
      // Calculate position within P wave cycle
      const pPosition = time % pInterval;
      
      // Calculate position within QRS cycle
      const qrsPosition = time % qrsInterval;
      
      // Generate P waves
      let value = 0;
      if (pPosition < 0.08) {
        value += this.generatePWave(pPosition);
      }
      
      // Generate QRS-T complexes (no P wave)
      if (qrsPosition < (this.params.qtInterval + 0.04)) {
        value += this.generateNormalComplex(qrsPosition, {
          pWavePresent: false
        });
      }
      
      return value;
    }
    
    /**
     * Get the next ECG value based on the current rhythm
     * @returns {number} The next ECG value in mV
     */
    getNextValue() {
      // Basic noise/artifact added to all rhythms
      let noise = this.params.noiseLevel * (Math.random() * 2 - 1);
      
      // Random artifacts
      if (Math.random() < this.params.artifactProbability) {
        noise += (Math.random() * 2 - 1) * this.params.qrsAmplitude * 0.5;
      }
      
      // Update current time
      this.currentTime += 1 / this.params.sampleRate;
      
      // Generate value based on rhythm
      let value;
      
      switch (this.rhythm) {
        case this.rhythmTypes.NORMAL_SINUS:
        case this.rhythmTypes.SINUS_BRADYCARDIA:
        case this.rhythmTypes.SINUS_TACHYCARDIA:
          // Normal PQRST pattern
          const timeSinceLastR = this.currentTime - this.lastRWave;
          if (timeSinceLastR >= this.rrInterval) {
            this.lastRWave = this.currentTime;
          }
          value = this.generateNormalComplex(timeSinceLastR % this.rrInterval);
          break;
          
        case this.rhythmTypes.ATRIAL_FIBRILLATION:
          value = this.generateAtrialFibrillation(this.currentTime);
          break;
          
        case this.rhythmTypes.ATRIAL_FLUTTER:
          value = this.generateAtrialFlutter(this.currentTime);
          break;
          
        case this.rhythmTypes.VENTRICULAR_TACHYCARDIA:
          value = this.generateVentricularTachycardia(this.currentTime);
          break;
          
        case this.rhythmTypes.VENTRICULAR_FIBRILLATION:
          value = this.generateVentricularFibrillation(this.currentTime);
          break;
          
        case this.rhythmTypes.ASYSTOLE:
          value = this.generateAsystole();
          break;
          
        case this.rhythmTypes.FIRST_DEGREE_BLOCK:
          value = this.generateFirstDegreeBlock(this.currentTime);
          break;
          
        case this.rhythmTypes.SECOND_DEGREE_BLOCK_TYPE1:
          value = this.generateWenckebach(this.currentTime);
          break;
          
        case this.rhythmTypes.SECOND_DEGREE_BLOCK_TYPE2:
          value = this.generateMobitzII(this.currentTime);
          break;
          
        case this.rhythmTypes.THIRD_DEGREE_BLOCK:
          value = this.generateThirdDegreeBlock(this.currentTime);
          break;
          
        case this.rhythmTypes.PVC:
          // Handle PVCs occurring on top of normal rhythm
          timeSinceLastR = this.currentTime - this.lastRWave;
          
          // Check if this is where a PVC should occur
          if (this.nextPVC > 0 && this.currentTime >= this.nextPVC) {
            // Reset the timer for normal beats
            this.lastRWave = this.currentTime;
            // Schedule the next PVC
            this.scheduleNextPVC();
            // Generate a PVC
            value = this.generatePVCComplex(0);
          } else {
            // Regular beats
            if (timeSinceLastR >= this.rrInterval) {
              this.lastRWave = this.currentTime;
            }
            value = this.generateNormalComplex(timeSinceLastR % this.rrInterval);
          }
          break;
          
        case this.rhythmTypes.PAC:
          // Handle PACs occurring on top of normal rhythm
          timeSinceLastR = this.currentTime - this.lastRWave;
          
          // Check if this is where a PAC should occur
          if (this.nextPAC > 0 && this.currentTime >= this.nextPAC) {
            // Reset the timer for normal beats
            this.lastRWave = this.currentTime;
            // Schedule the next PAC
            this.scheduleNextPAC();
            // Generate a PAC
            value = this.generatePACComplex(0);
          } else {
            // Regular beats
            if (timeSinceLastR >= this.rrInterval) {
              this.lastRWave = this.currentTime;
            }
            value = this.generateNormalComplex(timeSinceLastR % this.rrInterval);
          }
          break;
          
        case this.rhythmTypes.PACED:
          timeSinceLastR = this.currentTime - this.lastRWave;
          if (timeSinceLastR >= this.rrInterval) {
            this.lastRWave = this.currentTime;
          }
          value = this.generatePacedComplex(timeSinceLastR % this.rrInterval);
          break;
          
        default:
          // Default to normal sinus rhythm
          timeSinceLastR = this.currentTime - this.lastRWave;
          if (timeSinceLastR >= this.rrInterval) {
            this.lastRWave = this.currentTime;
          }
          value = this.generateNormalComplex(timeSinceLastR % this.rrInterval);
      }
      
      // Add baseline and noise
      return this.params.baseline + value + noise;
    }
    
    /**
     * Generate a series of ECG values for a specific duration
     * @param {number} duration - Duration in seconds
     * @returns {Array} Array of ECG values
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
      this.lastRWave = 0;
      this.rrInterval = 60 / this.params.heartRate;
      this.nextPVC = -1;
      this.nextPAC = -1;
      this.wenckebach = { count: 0, maxCount: 3 };
      this.rhythm = this.rhythmTypes.NORMAL_SINUS;
    }
  }
  
  export default ECGGenerator;