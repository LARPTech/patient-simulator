/**
 * SpO2Generator.js
 * 
 * Этот модуль генерирует реалистичные сигналы пульсоксиметрии (плетизмографическую волну)
 * на основе физиологического состояния пациента. Он моделирует различные нормальные
 * и патологические паттерны сигнала плетизмографии.
 */

class SpO2Generator {
    constructor() {
      // Параметры по умолчанию
      this.params = {
        sampleRate: 100,      // Частота дискретизации (Гц)
        heartRate: 72,        // Частота сердечных сокращений (уд/мин)
        spo2: 98,             // Сатурация кислорода (%)
        amplitude: 1.0,       // Амплитуда сигнала
        baseline: 0,          // Базовая линия
        noiseLevel: 0.02,     // Уровень шума (0-1)
        dicroticNotch: true,  // Наличие дикротического зубца
        perfusionIndex: 1.0,  // Индекс перфузии (0-10)
        artifactProbability: 0.001 // Вероятность артефактов
      };
      
      // Типы паттернов сигнала
      this.patterns = {
        NORMAL: 'normal',
        WEAK: 'weak',                    // Слабый сигнал
        UNSTABLE: 'unstable',            // Нестабильный сигнал с флуктуациями
        VENOUS_PULSATION: 'venousPulsation', // Венозная пульсация
        MOVEMENT: 'movement',            // Артефакты движения
        DISCONNECT: 'disconnect',        // Отсоединение датчика
        PRESSURE: 'pressure',            // Избыточное давление на датчик
        AMBIENT_LIGHT: 'ambientLight',   // Воздействие окружающего света
        CARDIAC_ARRHYTHMIA: 'arrhythmia' // Сердечная аритмия
      };
      
      // Текущий паттерн
      this.pattern = this.patterns.NORMAL;
      
      // Параметры паттерна
      this.patternOptions = {};
      
      // Внутреннее состояние
      this.currentTime = 0;
      this.lastPulseTime = 0;
      this.pulseInterval = 60 / this.params.heartRate;
      this.artifactTimer = 0;
      this.inArtifactPeriod = false;
      
      // Для паттернов с вариабельностью амплитуды
      this.amplitudeVariation = 0;
      
      // История последних интервалов между ударами для аритмии
      this.previousIntervals = Array(5).fill(this.pulseInterval);
    }
    
    /**
     * Обновление параметров генератора
     * @param {Object} newParams - Новые параметры
     */
    updateParams(newParams) {
      this.params = { ...this.params, ...newParams };
      
      // Обновляем интервал между ударами пульса, если обновилась ЧСС
      if (newParams.heartRate) {
        this.pulseInterval = 60 / this.params.heartRate;
      }
    }
    
    /**
     * Установка паттерна сигнала
     * @param {string} pattern - Тип паттерна пульсоксиметрии
     * @param {Object} options - Дополнительные параметры паттерна
     */
    setPattern(pattern, options = {}) {
      if (Object.values(this.patterns).includes(pattern)) {
        this.pattern = pattern;
        this.patternOptions = options;
      } else {
        console.warn(`Неизвестный паттерн сигнала пульсоксиметрии: ${pattern}`);
      }
    }
    
    /**
     * Применение состояния пациента для обновления параметров сигнала
     * @param {Object} patientState - Текущее состояние пациента
     */
    applyPatientState(patientState) {
      const {
        hr = 72,                   // Частота сердечных сокращений
        spo2 = 98,                 // Сатурация кислорода (%)
        cardiac_output = 5,        // Сердечный выброс (л/мин)
        systolic = 120,            // Систолическое давление
        diastolic = 80,            // Диастолическое давление
        temperature = 37,          // Температура тела
        perfusion = 1.0,           // Перфузия (0-1)
        vasoconstriction = 0,      // Вазоконстрикция (0-1)
        movement = 0,              // Движение пациента (0-1)
        sensor_disconnect = false, // Отсоединение датчика
        ambient_light = false,     // Влияние внешнего света
        cardiac_rhythm = 'normal', // Сердечный ритм
        cardiac_arrest = false     // Остановка сердца
      } = patientState;
      
      // Обновляем базовые параметры
      this.updateParams({
        heartRate: hr,
        spo2: spo2
      });
      
      // Проверяем отсоединение датчика
      if (sensor_disconnect) {
        this.setPattern(this.patterns.DISCONNECT);
        return;
      }
      
      // Проверяем остановку сердца
      if (cardiac_arrest) {
        this.setPattern(this.patterns.DISCONNECT, { isArrest: true });
        return;
      }
      
      // Проверяем воздействие окружающего света
      if (ambient_light) {
        this.setPattern(this.patterns.AMBIENT_LIGHT);
        return;
      }
      
      // Проверяем наличие движения
      if (movement > 0.3) {
        this.setPattern(this.patterns.MOVEMENT, { intensity: movement });
        return;
      }
      
      // Проверяем различные патологические ритмы
      if (cardiac_rhythm !== 'normal') {
        switch (cardiac_rhythm) {
          case 'afib':
          case 'vfib':
          case 'vtach':
          case 'avblock':
          case 'pvc':
            this.setPattern(this.patterns.CARDIAC_ARRHYTHMIA, { type: cardiac_rhythm });
            return;
        }
      }
      
      // Проверяем низкую перфузию
      if (perfusion < 0.5 || vasoconstriction > 0.5) {
        const perfusionIndex = Math.max(0.1, (perfusion * (1 - vasoconstriction)) * 2);
        this.setPattern(this.patterns.WEAK, { perfusionIndex });
        return;
      }
      
      // Венозная пульсация при повышенном давлении в датчике или венозном застое
      if (vasoconstriction > 0.3 && perfusion > 0.7) {
        this.setPattern(this.patterns.VENOUS_PULSATION);
        return;
      }
      
      // Нестабильный сигнал при пограничной перфузии
      if (perfusion > 0.5 && perfusion < 0.7) {
        this.setPattern(this.patterns.UNSTABLE, { variability: 0.3 });
        return;
      }
      
      // По умолчанию - нормальный сигнал с параметрами перфузии
      const perfusionIndex = Math.max(0.1, perfusion * 2);
      this.setPattern(this.patterns.NORMAL, { perfusionIndex });
    }
    
    /**
     * Генерация формы нормальной плетизмографической волны
     * @param {number} time - Время от начала текущего пульса
     * @param {number} interval - Интервал между ударами пульса
     * @returns {number} Значение сигнала
     */
    generateNormalPulseWaveform(time, interval) {
      const { amplitude, baseline, dicroticNotch, perfusionIndex = 1.0 } = this.params;
      
      // Если время отрицательное или превышает интервал, возвращаем базовую линию
      if (time < 0 || time > interval) return baseline;
      
      // Нормализованное время (0-1)
      const t = time / interval;
      
      // Основная форма волны - быстрый подъем и медленный спад
      let value;
      
      if (t < 0.15) {
        // Быстрый систолический подъем: ускоряющаяся синусоида
        value = baseline + amplitude * Math.pow(Math.sin(t / 0.15 * Math.PI / 2), 2);
      } else if (t < 0.3) {
        // Систолический пик и начало спада
        const peakT = (t - 0.15) / 0.15;
        value = baseline + amplitude * (1 - 0.3 * peakT);
      } else if (t < 0.45) {
        // Дикротический зубец (если включен)
        const notchT = (t - 0.3) / 0.15;
        let notchValue = 0;
        
        if (dicroticNotch) {
          const notchDepth = 0.15; // Глубина зубца
          notchValue = -notchDepth * Math.sin(notchT * Math.PI);
        }
        
        value = baseline + amplitude * (0.7 - 0.2 * notchT + notchValue);
      } else {
        // Диастолический спад - экспоненциальный
        const fallT = (t - 0.45) / 0.55;
        value = baseline + amplitude * 0.5 * Math.exp(-3 * fallT);
      }
      
      // Масштабируем амплитуду в зависимости от индекса перфузии
      const effectiveAmplitude = (value - baseline) * Math.sqrt(perfusionIndex);
      return baseline + effectiveAmplitude;
    }
    
    /**
     * Генерация слабого сигнала (низкая перфузия)
     * @param {number} time - Время от начала текущего пульса
     * @param {number} interval - Интервал между ударами пульса
     * @returns {number} Значение сигнала
     */
    generateWeakSignal(time, interval) {
      const { perfusionIndex = 0.3 } = this.patternOptions;
      
      // Обновляем параметры для слабого сигнала
      const savedPerfusionIndex = this.params.perfusionIndex;
      this.params.perfusionIndex = perfusionIndex;
      
      // Используем обычную форму волны, но с низкой амплитудой
      const value = this.generateNormalPulseWaveform(time, interval);
      
      // Восстанавливаем параметр
      this.params.perfusionIndex = savedPerfusionIndex;
      
      return value;
    }
    
    /**
     * Генерация нестабильного сигнала
     * @param {number} time - Время от начала текущего пульса
     * @param {number} interval - Интервал между ударами пульса
     * @returns {number} Значение сигнала
     */
    generateUnstableSignal(time, interval) {
      const { variability = 0.3 } = this.patternOptions;
      
      // Если начинается новый пульс, рассчитываем новую вариацию амплитуды
      if (time < 0.01) {
        this.amplitudeVariation = 1 + (Math.random() * 2 - 1) * variability;
      }
      
      // Получаем базовую форму волны
      const baseValue = this.generateNormalPulseWaveform(time, interval);
      
      // Применяем вариабельность к амплитуде
      const variableComponent = (baseValue - this.params.baseline) * this.amplitudeVariation;
      
      return this.params.baseline + variableComponent;
    }
    
    /**
     * Генерация сигнала с венозной пульсацией
     * @param {number} time - Время от начала текущего пульса
     * @param {number} interval - Интервал между ударами пульса
     * @returns {number} Значение сигнала
     */
    generateVenousPulsation(time, interval) {
      // Основная артериальная пульсация
      const arterialValue = this.generateNormalPulseWaveform(time, interval);
      
      // Добавляем венозную пульсацию с более низкой частотой (примерно 1/3 от ЧСС)
      const venousFrequency = this.params.heartRate / 3; // ~20-30 в минуту
      const venousPeriod = 60 / venousFrequency;
      const venousPhase = (this.currentTime % venousPeriod) / venousPeriod;
      
      // Венозная волна - более медленная и с меньшей амплитудой
      const venousAmplitude = this.params.amplitude * 0.3;
      const venousValue = this.params.baseline + venousAmplitude * Math.sin(venousPhase * 2 * Math.PI);
      
      // Объединяем артериальный и венозный компоненты
      return arterialValue + (venousValue - this.params.baseline) * 0.7;
    }
    
    /**
     * Генерация артефактов движения
     * @returns {number} Значение сигнала
     */
    generateMovementArtifacts() {
      const { intensity = 0.7 } = this.patternOptions;
      
      // Базовый сигнал - может быть часть нормальной волны, но сильно искаженная
      const baseSignal = this.generateNormalPulseWaveform(
        (this.currentTime - this.lastPulseTime) % this.pulseInterval, 
        this.pulseInterval
      );
      
      // Добавляем случайный шум движения
      const movementNoise = this.params.amplitude * intensity * 1.5 * 
                           (Math.sin(this.currentTime * 12) * 0.5 + 
                            Math.sin(this.currentTime * 7.3) * 0.3 + 
                            Math.sin(this.currentTime * 3.8) * 0.2 + 
                            (Math.random() - 0.5));
      
      // Смешиваем базовый сигнал и шум
      const mixFactor = Math.min(1, intensity * 1.5); // Коэффициент смешивания
      return baseSignal * (1 - mixFactor) + movementNoise * mixFactor;
    }
    
    /**
     * Генерация сигнала при отключении датчика
     * @returns {number} Значение сигнала
     */
    generateDisconnect() {
      const { isArrest = false } = this.patternOptions;
      
      // При отключении датчика - прямая линия с небольшим шумом
      const noise = this.params.noiseLevel * 0.5 * (Math.random() - 0.5);
      
      // При остановке сердца может быть очень низкоамплитудный сигнал
      if (isArrest) {
        return this.params.baseline + noise * 0.1;
      }
      
      return this.params.baseline + noise;
    }
    
    /**
     * Генерация сигнала при воздействии окружающего света
     * @returns {number} Значение сигнала
     */
    generateAmbientLight() {
      // Основная частота сети переменного тока (50-60 Гц)
      const mainFrequency = 50;
      const flickerComponent = Math.sin(this.currentTime * 2 * Math.PI * mainFrequency) * 
                              this.params.amplitude * 0.4;
      
      // Основной сигнал с более слабой амплитудой
      const baseSignal = this.generateNormalPulseWaveform(
        (this.currentTime - this.lastPulseTime) % this.pulseInterval, 
        this.pulseInterval
      ) * 0.5;
      
      // Комбинируем реальный сигнал и засветку
      return baseSignal + flickerComponent;
    }
    
    /**
     * Генерация сигнала при аритмии
     * @returns {number} Значение сигнала
     */
    generateArrhythmia() {
      const { type = 'afib' } = this.patternOptions;
      
      // Рассчитываем время с последнего пульса
      const timeSinceLastPulse = this.currentTime - this.lastPulseTime;
      
      // Определяем интервал до следующего пульса в зависимости от типа аритмии
      let nextInterval;
      
      switch (type) {
        case 'afib': // Фибрилляция предсердий - нерегулярный ритм
          // Вариабельность RR интервалов 20-40%
          const variability = 0.3;
          nextInterval = this.pulseInterval * (1 + (Math.random() * 2 - 1) * variability);
          break;
          
        case 'vfib': // Фибрилляция желудочков - хаотичная активность
          // Хаотичные интервалы, очень нерегулярные
          nextInterval = this.pulseInterval * (0.5 + Math.random() * 1.5);
          break;
          
        case 'vtach': // Желудочковая тахикардия - быстрый регулярный ритм
          // Фиксированный быстрый ритм, 150-250 ударов в минуту
          nextInterval = 60 / 180; // 180 ударов в минуту
          break;
          
        case 'avblock': // AV-блокада - длинные паузы
          // Периодически пропущенные удары
          if (this.previousIntervals.length > 0 && 
              this.previousIntervals[this.previousIntervals.length - 1] > this.pulseInterval * 1.5) {
            // После длинной паузы - нормальный интервал
            nextInterval = this.pulseInterval;
          } else if (Math.random() < 0.3) {
            // 30% шанс пропущенного удара
            nextInterval = this.pulseInterval * 2;
          } else {
            nextInterval = this.pulseInterval;
          }
          break;
          
        case 'pvc': // Желудочковая экстрасистолия - преждевременные сокращения
          // Преждевременные сокращения с компенсаторной паузой
          if (Math.random() < 0.2) {
            // 20% шанс PVC
            nextInterval = this.pulseInterval * 0.7; // Преждевременное сокращение
            // Следующий интервал после PVC будет длиннее (компенсаторная пауза)
            this.nextPVCPause = true;
          } else if (this.nextPVCPause) {
            nextInterval = this.pulseInterval * 1.3; // Компенсаторная пауза
            this.nextPVCPause = false;
          } else {
            nextInterval = this.pulseInterval;
          }
          break;
          
        default:
          nextInterval = this.pulseInterval;
      }
      
      // Если пришло время нового пульса
      if (timeSinceLastPulse >= nextInterval) {
        // Сохраняем интервал в истории
        this.previousIntervals.push(nextInterval);
        this.previousIntervals.shift(); // Удаляем самый старый интервал
        
        // Обновляем время последнего пульса
        this.lastPulseTime = this.currentTime;
      }
      
      // Для фибрилляции желудочков - очень нерегулярная форма волны
      if (type === 'vfib') {
        // Хаотичный сигнал при фибрилляции желудочков
        const vfibFreq1 = 3.5; // ~210 в минуту
        const vfibFreq2 = 4.2; // ~250 в минуту
        const vfibFreq3 = 5.0; // ~300 в минуту
        
        return this.params.baseline + this.params.amplitude * 0.4 * (
          Math.sin(this.currentTime * 2 * Math.PI * vfibFreq1) * 0.5 +
          Math.sin(this.currentTime * 2 * Math.PI * vfibFreq2 + 1.3) * 0.3 +
          Math.sin(this.currentTime * 2 * Math.PI * vfibFreq3 + 0.7) * 0.2
        );
      }
      
      // Для других аритмий - измененная стандартная форма волны
      let waveform;
      
      if (type === 'pvc' && this.nextPVCPause) {
        // Для PVC - более широкая и асимметричная волна
        const t = timeSinceLastPulse / nextInterval;
        
        if (t < 0.2) {
          // Более крутой подъем
          waveform = this.params.baseline + this.params.amplitude * 1.2 * Math.pow(Math.sin(t / 0.2 * Math.PI / 2), 1.5);
        } else {
          // Более медленный спад
          waveform = this.params.baseline + this.params.amplitude * 1.2 * (1 - Math.pow((t - 0.2) / 0.8, 0.7));
        }
      } else {
        // Для других аритмий используем стандартную форму
        waveform = this.generateNormalPulseWaveform(timeSinceLastPulse, nextInterval);
      }
      
      // Для некоторых аритмий добавляем вариабельность амплитуды
      if (type === 'afib' || type === 'vfib') {
        const ampVariability = 0.3;
        const randomFactor = 1 - ampVariability / 2 + Math.random() * ampVariability;
        waveform = this.params.baseline + (waveform - this.params.baseline) * randomFactor;
      }
      
      return waveform;
    }
    
    /**
     * Получить следующее значение сигнала пульсоксиметрии
     * @returns {number} Значение сигнала
     */
    getNextValue() {
      // Обновляем текущее время
      this.currentTime += 1 / this.params.sampleRate;
      
      // Проверяем, не пора ли начать новый пульс (для нормального паттерна)
      if (this.pattern === this.patterns.NORMAL ||
          this.pattern === this.patterns.WEAK ||
          this.pattern === this.patterns.UNSTABLE ||
          this.pattern === this.patterns.VENOUS_PULSATION) {
        
        const timeSinceLastPulse = this.currentTime - this.lastPulseTime;
        
        if (timeSinceLastPulse >= this.pulseInterval) {
          this.lastPulseTime = this.currentTime;
        }
      }
      
      // Базовый шум, добавляемый ко всем паттернам
      const noise = this.params.noiseLevel * (Math.random() * 2 - 1) * this.params.amplitude;
      
      // Случайные артефакты (кроме движения и отключения)
      if (!this.inArtifactPeriod && 
          this.pattern !== this.patterns.MOVEMENT && 
          this.pattern !== this.patterns.DISCONNECT &&
          Math.random() < this.params.artifactProbability) {
        
        this.inArtifactPeriod = true;
        this.artifactTimer = this.currentTime;
      }
      
      // Если в периоде артефакта, генерируем артефакт
      if (this.inArtifactPeriod) {
        // Длительность артефакта 0.2-0.5 секунды
        const artifactDuration = 0.2 + Math.random() * 0.3;
        
        if (this.currentTime - this.artifactTimer > artifactDuration) {
          this.inArtifactPeriod = false;
        } else {
          // Случайный артефакт - резкий скачок сигнала
          return this.params.baseline + this.params.amplitude * (Math.random() * 2 - 1) * 2;
        }
      }
      
      // Генерация значения в зависимости от паттерна
      let value;
      
      switch (this.pattern) {
        case this.patterns.WEAK:
          value = this.generateWeakSignal(
            this.currentTime - this.lastPulseTime,
            this.pulseInterval
          );
          break;
          
        case this.patterns.UNSTABLE:
          value = this.generateUnstableSignal(
            this.currentTime - this.lastPulseTime,
            this.pulseInterval
          );
          break;
          
        case this.patterns.VENOUS_PULSATION:
          value = this.generateVenousPulsation(
            this.currentTime - this.lastPulseTime,
            this.pulseInterval
          );
          break;
          
        case this.patterns.MOVEMENT:
          value = this.generateMovementArtifacts();
          break;
          
        case this.patterns.DISCONNECT:
          value = this.generateDisconnect();
          break;
          
        case this.patterns.AMBIENT_LIGHT:
          value = this.generateAmbientLight();
          break;
          
        case this.patterns.CARDIAC_ARRHYTHMIA:
          value = this.generateArrhythmia();
          break;
          
        case this.patterns.NORMAL:
        default:
          value = this.generateNormalPulseWaveform(
            this.currentTime - this.lastPulseTime,
            this.pulseInterval
          );
          break;
      }
      
      // Добавляем шум (кроме отключения датчика, где шум минимальный)
      if (this.pattern !== this.patterns.DISCONNECT) {
        value += noise;
      }
      
      return value;
    }
    
    /**
     * Генерация серии значений плетизмографической волны для заданной длительности
     * @param {number} duration - Длительность в секундах
     * @returns {Array} Массив значений плетизмографической волны
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
     * Получить текущее значение SpO2
     * @returns {number} Значение SpO2 в процентах
     */
    getCurrentSpO2() {
      // Базовое значение SpO2
      let spo2 = this.params.spo2;
      
      // Корректируем SpO2 в зависимости от паттерна
      switch (this.pattern) {
        case this.patterns.DISCONNECT:
          // При отключении датчика - нет данных или случайные значения
          spo2 = Math.min(100, Math.max(70, spo2 + (Math.random() * 30 - 15)));
          break;
          
        case this.patterns.MOVEMENT:
          // При движении - колебания SpO2
          const variability = this.patternOptions?.intensity || 0.5;
          spo2 = Math.min(100, Math.max(70, spo2 + (Math.random() * 20 - 10) * variability));
          break;
          
        case this.patterns.AMBIENT_LIGHT:
          // При воздействии света - обычно ложно завышенные показания
          spo2 = Math.min(100, spo2 + Math.random() * 3);
          break;
      }
      
      // Округляем до целого числа
      return Math.round(spo2);
    }
    
    /**
     * Сброс генератора до начального состояния
     */
    reset() {
      this.currentTime = 0;
      this.lastPulseTime = 0;
      this.pulseInterval = 60 / this.params.heartRate;
      this.pattern = this.patterns.NORMAL;
      this.inArtifactPeriod = false;
      this.artifactTimer = 0;
      this.amplitudeVariation = 0;
      this.previousIntervals = Array(5).fill(this.pulseInterval);
    }
  }
  
  export default SpO2Generator;