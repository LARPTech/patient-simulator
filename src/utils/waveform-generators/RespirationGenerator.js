/**
 * RespirationGenerator.js
 * 
 * Этот модуль генерирует реалистичные сигналы дыхательных волн на основе
 * физиологического состояния пациента. Он моделирует различные нормальные
 * и патологические паттерны дыхания.
 */

class RespirationGenerator {
    constructor() {
      // Параметры по умолчанию
      this.params = {
        sampleRate: 100,      // Частота дискретизации (Гц)
        respirationRate: 14,  // Частота дыхания (вд/мин)
        tidalVolume: 500,     // Дыхательный объем (мл)
        ieRatio: 1/2,         // Соотношение вдох:выдох (1:2)
        amplitude: 1.0,       // Амплитуда сигнала
        baseline: 0,          // Базовая линия
        noiseLevel: 0.05,     // Уровень шума (0-1)
        patientType: 'adult', // Тип пациента: 'adult', 'pediatric', или 'neonatal'
      };
      
      // Паттерны дыхания
      this.patterns = {
        NORMAL: 'normal',
        APNEA: 'apnea',                         // Апноэ/остановка дыхания
        BRADYPNEA: 'bradypnea',                 // Брадипноэ/редкое дыхание
        TACHYPNEA: 'tachypnea',                 // Тахипноэ/частое дыхание
        CHEYNE_STOKES: 'cheyneStokes',          // Дыхание Чейна-Стокса
        KUSSMAUL: 'kussmaul',                   // Дыхание Куссмауля
        BIOT: 'biot',                           // Дыхание Биота
        OBSTRUCTIVE: 'obstructive',             // Обструктивное дыхание
        AGONAL: 'agonal',                       // Агональное дыхание
        PARADOXICAL: 'paradoxical',             // Парадоксальное дыхание
        ATAXIC: 'ataxic',                       // Атаксическое дыхание
        ASSISTED_VENTILATION: 'assistedVentilation' // Искусственная вентиляция
      };
      
      // Текущий паттерн
      this.pattern = this.patterns.NORMAL;
      
      // Параметры паттерна
      this.patternOptions = {};
      
      // Внутреннее состояние
      this.currentTime = 0;
      this.apneaTimer = 0;
      this.cheyneStokesPhase = 0;
      this.biotBreathCount = 0;
      this.lastBreathTime = 0;
      this.inApneaPeriod = false;
    }
    
    /**
     * Обновление параметров генератора
     * @param {Object} newParams - Новые параметры
     */
    updateParams(newParams) {
      this.params = { ...this.params, ...newParams };
    }
    
    /**
     * Установка паттерна дыхания
     * @param {string} pattern - Тип паттерна дыхания
     * @param {Object} options - Дополнительные параметры паттерна
     */
    setPattern(pattern, options = {}) {
      if (Object.values(this.patterns).includes(pattern)) {
        this.pattern = pattern;
        this.patternOptions = options;
        this.resetPatternState();
      } else {
        console.warn(`Неизвестный паттерн дыхания: ${pattern}`);
      }
    }
    
    /**
     * Сброс внутреннего состояния паттерна
     */
    resetPatternState() {
      this.cheyneStokesPhase = 0;
      this.biotBreathCount = 0;
      this.apneaTimer = 0;
      this.lastBreathTime = 0;
      this.inApneaPeriod = false;
    }
    
    /**
     * Применение состояния пациента для обновления параметров дыхания
     * @param {Object} patientState - Текущее состояние пациента
     */
    applyPatientState(patientState) {
      const {
        rr = 14,                           // Частота дыхания
        tidal_volume = 500,                // Дыхательный объем
        intubated = false,                 // Статус интубации
        ventilator_mode = 'none',          // Режим вентиляции
        respiratory_depression = 0,        // Фактор угнетения дыхания (0-1)
        airway_obstruction = 0,            // Фактор обструкции дыхательных путей (0-1)
        respiratory_muscle_weakness = 0,   // Слабость дыхательных мышц (0-1)
        respiratory_distress = 0,          // Дыхательный дистресс (0-1)
        hypoxia = 0,                       // Гипоксия (0-1)
        metabolic_acidosis = 0,            // Метаболический ацидоз (0-1)
        head_injury = 0,                   // Черепно-мозговая травма (0-1)
        neuro_status = 'normal',           // Неврологический статус
        spo2 = 98,                         // Сатурация кислорода (%)
        etco2 = 35,                        // EtCO2 (мм рт.ст.)
        cardiac_arrest = false             // Остановка сердца
      } = patientState;
      
      // Обновляем базовые параметры
      this.updateParams({
        respirationRate: rr,
        tidalVolume: tidal_volume
      });
      
      // Проверяем искусственную вентиляцию
      if (intubated && ventilator_mode !== 'none') {
        this.setPattern(this.patterns.ASSISTED_VENTILATION, {
          ventilatorMode: ventilator_mode,
          patientTrigger: respiratory_depression < 0.8, // Пациент может инициировать вдох если угнетение дыхания не сильное
          asyncProbability: Math.min(0.5, respiratory_distress * 0.5) // Вероятность асинхронности с вентилятором
        });
        return;
      }
      
      // Проверяем остановку сердца
      if (cardiac_arrest) {
        if (patientState.cpr_in_progress) {
          // Если идет СЛР, дыхание может быть контролируемым
          this.setPattern(this.patterns.ASSISTED_VENTILATION, {
            ventilatorMode: 'manual',
            rate: 10 // Обычно 10 вдохов в минуту при СЛР
          });
        } else {
          // Остановка сердца без СЛР - агональное дыхание или апноэ
          this.setPattern(Math.random() < 0.7 ? this.patterns.APNEA : this.patterns.AGONAL);
        }
        return;
      }
      
      // Проверяем сильное угнетение дыхания
      if (respiratory_depression > 0.8) {
        this.setPattern(this.patterns.APNEA);
        return;
      }
      
      // Проверяем различные патологические состояния
      
      // Травма ЦНС может вызвать атаксическое дыхание
      if (head_injury > 0.7 || neuro_status === 'comatose') {
        this.setPattern(this.patterns.ATAXIC, { severity: head_injury });
        return;
      }
      
      // Метаболический ацидоз может вызвать дыхание Куссмауля
      if (metabolic_acidosis > 0.6) {
        this.setPattern(this.patterns.KUSSMAUL, { depth: 0.7 + metabolic_acidosis * 0.3 });
        return;
      }
      
      // ЧМТ или нарушение кровообращения в стволе мозга может вызвать дыхание Чейна-Стокса
      if (head_injury > 0.5 && head_injury < 0.7) {
        this.setPattern(this.patterns.CHEYNE_STOKES, { 
          crescendoDuration: 30, 
          apneaDuration: 15 + head_injury * 10 
        });
        return;
      }
      
      // Повреждение дыхательного центра может вызвать дыхание Биота
      if (head_injury > 0.4 && head_injury < 0.6) {
        this.setPattern(this.patterns.BIOT, {
          breathCount: 3 + Math.floor(Math.random() * 3),
          apneaDuration: 10 + head_injury * 10
        });
        return;
      }
      
      // Обструкция дыхательных путей
      if (airway_obstruction > 0.4) {
        this.setPattern(this.patterns.OBSTRUCTIVE, { severity: airway_obstruction });
        return;
      }
      
      // Парадоксальное дыхание при слабости респираторных мышц или травме грудной клетки
      if (respiratory_muscle_weakness > 0.6) {
        this.setPattern(this.patterns.PARADOXICAL, { severity: respiratory_muscle_weakness });
        return;
      }
      
      // Тахипноэ при респираторном дистрессе или гипоксии
      if (respiratory_distress > 0.3 || hypoxia > 0.4 || spo2 < 90) {
        const rate = Math.min(40, rr + 10 + respiratory_distress * 15);
        this.setPattern(this.patterns.TACHYPNEA, { rate });
        return;
      }
      
      // Умеренное угнетение дыхания может вызвать брадипноэ
      if (respiratory_depression > 0.3 && respiratory_depression < 0.8) {
        const rate = Math.max(6, rr - 5 - respiratory_depression * 5);
        this.setPattern(this.patterns.BRADYPNEA, { rate });
        return;
      }
      
      // Нормальное дыхание
      this.setPattern(this.patterns.NORMAL);
    }
    
    /**
     * Расчет параметров дыхательного цикла
     * @returns {Object} Информация о временных параметрах цикла
     */
    calculateCycleDetails() {
      const { respirationRate, ieRatio } = this.params;
      
      // Общее время цикла в секундах
      const cycleTime = 60 / respirationRate;
      
      // Время вдоха
      const inspirationTime = cycleTime / (1 + ieRatio);
      
      // Время выдоха
      const expirationTime = cycleTime - inspirationTime;
      
      return {
        cycleTime,
        inspirationTime,
        expirationTime
      };
    }
    
    /**
     * Генерация значения для нормального дыхания
     * @param {number} time - Время в секундах от начала цикла
     * @param {Object} cycleDetails - Параметры дыхательного цикла
     * @returns {number} Значение сигнала дыхания
     */
    generateNormalBreath(time, cycleDetails) {
      const { inspirationTime, expirationTime, cycleTime } = cycleDetails;
      const { amplitude, baseline } = this.params;
      
      // Нормализованное время в цикле (0-1)
      const normalizedTime = (time % cycleTime) / cycleTime;
      
      // Определяем фазу дыхания
      const inspirationPhaseRatio = inspirationTime / cycleTime;
      
      if (normalizedTime < inspirationPhaseRatio) {
        // Фаза вдоха - восходящая фаза синусоиды
        const phaseProgress = normalizedTime / inspirationPhaseRatio;
        return baseline + amplitude * Math.sin(phaseProgress * Math.PI / 2);
      } else {
        // Фаза выдоха - нисходящая фаза синусоиды
        const phaseProgress = (normalizedTime - inspirationPhaseRatio) / (1 - inspirationPhaseRatio);
        return baseline + amplitude * Math.cos(phaseProgress * Math.PI / 2);
      }
    }
    
    /**
     * Генерация значения для апноэ
     * @returns {number} Значение сигнала дыхания
     */
    generateApnea() {
      const { baseline, noiseLevel } = this.params;
      
      // Минимальное движение с небольшим шумом
      return baseline + (Math.random() - 0.5) * noiseLevel * 0.2;
    }
    
    /**
     * Генерация значения для брадипноэ
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateBradypnea(time) {
      // Брадипноэ - как нормальное дыхание, но с низкой частотой
      const rate = this.patternOptions?.rate || 8; // По умолчанию 8 вд/мин
      
      const savedRate = this.params.respirationRate;
      this.params.respirationRate = rate;
      
      const cycleDetails = this.calculateCycleDetails();
      const value = this.generateNormalBreath(time, cycleDetails);
      
      this.params.respirationRate = savedRate;
      return value;
    }
    
    /**
     * Генерация значения для тахипноэ
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateTachypnea(time) {
      // Тахипноэ - как нормальное дыхание, но с высокой частотой и обычно сниженной амплитудой
      const rate = this.patternOptions?.rate || 28; // По умолчанию 28 вд/мин
      const depthFactor = this.patternOptions?.depthFactor || 0.7; // Сниженная глубина дыхания
      
      const savedRate = this.params.respirationRate;
      const savedAmplitude = this.params.amplitude;
      
      this.params.respirationRate = rate;
      this.params.amplitude *= depthFactor;
      
      const cycleDetails = this.calculateCycleDetails();
      const value = this.generateNormalBreath(time, cycleDetails);
      
      this.params.respirationRate = savedRate;
      this.params.amplitude = savedAmplitude;
      
      return value;
    }
    
    /**
     * Генерация значения для дыхания Чейна-Стокса
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateCheyneStokes(time) {
      // Дыхание Чейна-Стокса: постепенное нарастание амплитуды, затем снижение, затем апноэ
      const crescendoDuration = this.patternOptions?.crescendoDuration || 60; // Длительность цикла crescendo-decrescendo в секундах
      const apneaDuration = this.patternOptions?.apneaDuration || 20; // Длительность апноэ в секундах
      
      const cycleDuration = crescendoDuration + apneaDuration;
      const cyclePosition = time % cycleDuration;
      
      // Определяем, находимся ли мы в фазе апноэ
      if (cyclePosition > crescendoDuration) {
        return this.generateApnea();
      }
      
      // Находимся в фазе нарастания/убывания дыхательных движений
      const normalizedPosition = cyclePosition / crescendoDuration;
      let amplitudeModifier;
      
      if (normalizedPosition < 0.5) {
        // Фаза нарастания (crescendo)
        amplitudeModifier = 2 * normalizedPosition;
      } else {
        // Фаза убывания (decrescendo)
        amplitudeModifier = 2 * (1 - normalizedPosition);
      }
      
      const originalAmplitude = this.params.amplitude;
      this.params.amplitude *= amplitudeModifier;
      
      const cycleDetails = this.calculateCycleDetails();
      const value = this.generateNormalBreath(time, cycleDetails);
      
      this.params.amplitude = originalAmplitude;
      return value;
    }
    
    /**
     * Генерация значения для дыхания Куссмауля
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateKussmaul(time) {
      // Дыхание Куссмауля: глубокое, шумное, быстрое дыхание (часто при диабетическом кетоацидозе)
      const rate = 20; // Высокая частота дыхания
      const depth = this.patternOptions?.depth || 1.5; // Увеличенная глубина дыхания
      
      const savedRate = this.params.respirationRate;
      const savedAmplitude = this.params.amplitude;
      
      this.params.respirationRate = rate;
      this.params.amplitude *= depth;
      
      // Корректируем соотношение вдох:выдох - при Куссмауле вдох обычно более prolonged
      const savedIeRatio = this.params.ieRatio;
      this.params.ieRatio = 1/1.5; // Приближение к 1:1
      
      const cycleDetails = this.calculateCycleDetails();
      const value = this.generateNormalBreath(time, cycleDetails);
      
      // Восстанавливаем параметры
      this.params.respirationRate = savedRate;
      this.params.amplitude = savedAmplitude;
      this.params.ieRatio = savedIeRatio;
      
      return value;
    }
    
    /**
     * Генерация значения для дыхания Биота
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateBiot(time) {
      // Дыхание Биота: серия нормальных вдохов, за которой следует период апноэ
      const breathCount = this.patternOptions?.breathCount || 4; // Количество вдохов в серии
      const apneaDuration = this.patternOptions?.apneaDuration || 15; // Длительность апноэ в секундах
      
      // Длительность одного дыхания
      const breathDuration = this.calculateCycleDetails().cycleTime;
      
      // Общая длительность цикла Биота
      const biotCycleDuration = breathDuration * breathCount + apneaDuration;
      
      // Текущая позиция в цикле
      const cyclePosition = time % biotCycleDuration;
      
      // В фазе апноэ?
      if (cyclePosition > breathDuration * breathCount) {
        return this.generateApnea();
      }
      
      // В фазе дыхания - все вдохи одинаковой глубины (в отличие от Чейна-Стокса)
      const cycleDetails = this.calculateCycleDetails();
      return this.generateNormalBreath(cyclePosition, cycleDetails);
    }
    
    /**
     * Генерация значения для обструктивного дыхания
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateObstructive(time) {
      // Обструктивное дыхание: увеличенное усилие вдоха, медленный выдох
      const severity = this.patternOptions?.severity || 0.5; // Тяжесть обструкции
      
      const cycleDetails = this.calculateCycleDetails();
      const { inspirationTime, expirationTime, cycleTime } = cycleDetails;
      const { amplitude, baseline } = this.params;
      
      // Нормализованное время в цикле (0-1)
      const normalizedTime = (time % cycleTime) / cycleTime;
      
      // Определяем фазу дыхания
      const inspirationPhaseRatio = inspirationTime / cycleTime;
      
      if (normalizedTime < inspirationPhaseRatio) {
        // Фаза вдоха - увеличенное усилие, но с меньшим результатом
        const phaseProgress = normalizedTime / inspirationPhaseRatio;
        
        // Увеличенное усилие, но сниженная амплитуда с сигмоидальной кривой
        const effortFactor = 1 + severity;
        const amplitudeReduction = 1 - severity * 0.5;
        
        return baseline + amplitude * amplitudeReduction * Math.sin(phaseProgress * Math.PI / 2 * effortFactor);
      } else {
        // Фаза выдоха - более медленная и затрудненная
        const phaseProgress = (normalizedTime - inspirationPhaseRatio) / (1 - inspirationPhaseRatio);
        
        // Более затянутый выдох, экспоненциальная кривая вместо косинуса
        return baseline + amplitude * Math.exp(-phaseProgress * 2 * (1 + severity));
      }
    }
    
    /**
     * Генерация значения для агонального дыхания
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateAgonal(time) {
      // Агональное дыхание: редкие, неритмичные, глубокие вдохи
      
      // Проверяем время с последнего вдоха
      const timeSinceLastBreath = time - this.lastBreathTime;
      
      // Интервал между редкими вдохами (от 20 до 60 секунд)
      const nextBreathInterval = this.patternOptions?.interval || (20 + Math.random() * 40);
      
      // Если пора сделать следующий вдох
      if (timeSinceLastBreath >= nextBreathInterval) {
        this.lastBreathTime = time;
      }
      
      // Если прошло меньше 2 секунд с последнего вдоха, генерируем вдох
      if (timeSinceLastBreath < 2) {
        // Быстрый глубокий вдох, нерегулярной формы
        const breathProgress = timeSinceLastBreath / 2;
        const irregularity = 0.3 * Math.sin(breathProgress * Math.PI * 3);
        
        return this.params.baseline + this.params.amplitude * 1.5 * 
               Math.sin(breathProgress * Math.PI) * (1 + irregularity);
      }
      
      // В остальное время - почти нет дыхания
      return this.generateApnea();
    }
    
    /**
     * Генерация значения для парадоксального дыхания
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateParadoxical(time) {
      // Парадоксальное дыхание: при вдохе живот выпячивается, грудная клетка западает (обратно нормальному)
      // Здесь мы инвертируем фазу выдоха
      
      const cycleDetails = this.calculateCycleDetails();
      const { inspirationTime, expirationTime, cycleTime } = cycleDetails;
      const { amplitude, baseline } = this.params;
      
      // Нормализованное время в цикле (0-1)
      const normalizedTime = (time % cycleTime) / cycleTime;
      
      // Определяем фазу дыхания
      const inspirationPhaseRatio = inspirationTime / cycleTime;
      
      if (normalizedTime < inspirationPhaseRatio) {
        // Фаза вдоха - в парадоксальном дыхании инвертирована
        const phaseProgress = normalizedTime / inspirationPhaseRatio;
        return baseline - amplitude * 0.7 * Math.sin(phaseProgress * Math.PI / 2);
      } else {
        // Фаза выдоха - в парадоксальном дыхании инвертирована
        const phaseProgress = (normalizedTime - inspirationPhaseRatio) / (1 - inspirationPhaseRatio);
        return baseline - amplitude * 0.7 * Math.cos(phaseProgress * Math.PI / 2);
      }
    }
    
    /**
     * Генерация значения для атаксического дыхания
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateAtaxic(time) {
      // Атаксическое дыхание: нерегулярное по глубине и частоте
      const severity = this.patternOptions?.severity || 0.7;
      
      // Если мы в периоде апноэ, генерируем апноэ
      if (this.inApneaPeriod) {
        // Проверяем, пора ли закончить апноэ
        const apneaDuration = 5 + Math.random() * 10; // 5-15 секунд
        if (time - this.apneaTimer > apneaDuration) {
          this.inApneaPeriod = false;
        }
        return this.generateApnea();
      }
      
      // Случайно решаем, начать ли период апноэ
      if (Math.random() < 0.002 * severity) {
        this.inApneaPeriod = true;
        this.apneaTimer = time;
        return this.generateApnea();
      }
      
      // Генерируем нерегулярное дыхание с вариабельной амплитудой и частотой
      const variableRate = this.params.respirationRate * (1 + (Math.random() - 0.5) * severity);
      const variableAmplitude = this.params.amplitude * (1 + (Math.random() - 0.5) * severity);
      
      const savedRate = this.params.respirationRate;
      const savedAmplitude = this.params.amplitude;
      
      this.params.respirationRate = variableRate;
      this.params.amplitude = variableAmplitude;
      
      const cycleDetails = this.calculateCycleDetails();
      const value = this.generateNormalBreath(time, cycleDetails);
      
      this.params.respirationRate = savedRate;
      this.params.amplitude = savedAmplitude;
      
      return value;
    }
    
    /**
     * Генерация значения для искусственной вентиляции
     * @param {number} time - Текущее время
     * @returns {number} Значение сигнала дыхания
     */
    generateAssistedVentilation(time) {
      // Параметры искусственной вентиляции
      const ventilatorMode = this.patternOptions?.ventilatorMode || 'volume';
      const patientTrigger = this.patternOptions?.patientTrigger || false; // Пациент может инициировать вдох
      const asyncProbability = this.patternOptions?.asyncProbability || 0; // Вероятность асинхронности
      
      // Скорректированная частота вентиляции
      const ventRate = this.patternOptions?.rate || this.params.respirationRate;
      
      const savedRate = this.params.respirationRate;
      this.params.respirationRate = ventRate;
      
      // Увеличенная амплитуда для вентиляции
      const savedAmplitude = this.params.amplitude;
      this.params.amplitude *= 1.2;
      
      // Скорректированное соотношение вдох:выдох (обычно 1:2 или 1:1.5 для ИВЛ)
      const savedIeRatio = this.params.ieRatio;
      this.params.ieRatio = 1/2;
      
      // Расчет деталей цикла
      const cycleDetails = this.calculateCycleDetails();
      const { inspirationTime, expirationTime, cycleTime } = cycleDetails;
      
      // Нормализованное время в цикле (0-1)
      const normalizedTime = (time % cycleTime) / cycleTime;
      
      // Определяем фазу дыхания
      const inspirationPhaseRatio = inspirationTime / cycleTime;
      
      // Добавляем асинхронность пациент-вентилятор если указано
      let value;
      
      if (Math.random() < asyncProbability && patientTrigger) {
        // Асинхронность: пациент пытается дышать не в такт с вентилятором
        const patientEffort = Math.sin(time * 2 * Math.PI / (60 / (ventRate * 0.8))) * this.params.amplitude * 0.4;
        
        // Основной паттерн вентиляции
        const ventPattern = this.generateNormalBreath(time, cycleDetails);
        
        // Комбинируем паттерны
        value = ventPattern + patientEffort;
      } else {
        // Стандартный паттерн вентиляции
        value = this.generateNormalBreath(time, cycleDetails);
        
        // Если режим объемный, используем более квадратную форму волны
        if (ventilatorMode === 'volume') {
          const squareFactor = 0.3; // Насколько "квадратным" будет сигнал
          
          if (normalizedTime < inspirationPhaseRatio) {
            // Более резкий подъем при вдохе
            value = this.params.baseline + this.params.amplitude * (
              (1 - squareFactor) * Math.sin(normalizedTime / inspirationPhaseRatio * Math.PI / 2) +
              squareFactor * (normalizedTime / inspirationPhaseRatio > 0.1 ? 1 : 0)
            );
          }
        }
      }
      
      // Восстанавливаем параметры
      this.params.respirationRate = savedRate;
      this.params.amplitude = savedAmplitude;
      this.params.ieRatio = savedIeRatio;
      
      return value;
    }
    
    /**
     * Получить следующее значение сигнала дыхания
     * @returns {number} Значение сигнала дыхания
     */
    getNextValue() {
      // Обновить текущее время
      this.currentTime += 1 / this.params.sampleRate;
      
      // Базовый шум, добавляемый ко всем паттернам
      const noise = this.params.noiseLevel * (Math.random() - 0.5) * 2 * this.params.amplitude * 0.1;
      
      // Генерация значения в зависимости от паттерна
      let value;
      
      switch (this.pattern) {
        case this.patterns.APNEA:
          value = this.generateApnea();
          break;
        case this.patterns.BRADYPNEA:
          value = this.generateBradypnea(this.currentTime);
          break;
        case this.patterns.TACHYPNEA:
          value = this.generateTachypnea(this.currentTime);
          break;
        case this.patterns.CHEYNE_STOKES:
          value = this.generateCheyneStokes(this.currentTime);
          break;
        case this.patterns.KUSSMAUL:
          value = this.generateKussmaul(this.currentTime);
          break;
        case this.patterns.BIOT:
          value = this.generateBiot(this.currentTime);
          break;
        case this.patterns.OBSTRUCTIVE:
          value = this.generateObstructive(this.currentTime);
          break;
        case this.patterns.AGONAL:
          value = this.generateAgonal(this.currentTime);
          break;
        case this.patterns.PARADOXICAL:
          value = this.generateParadoxical(this.currentTime);
          break;
        case this.patterns.ATAXIC:
          value = this.generateAtaxic(this.currentTime);
          break;
        case this.patterns.ASSISTED_VENTILATION:
          value = this.generateAssistedVentilation(this.currentTime);
          break;
        case this.patterns.NORMAL:
        default:
          const cycleDetails = this.calculateCycleDetails();
          value = this.generateNormalBreath(this.currentTime, cycleDetails);
          break;
      }
      
      // Добавляем шум
      return value + noise;
    }
    
    /**
     * Генерация серии значений дыхательной волны для заданной длительности
     * @param {number} duration - Длительность в секундах
     * @returns {Array} Массив значений дыхательной волны
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
     * Сброс генератора до начального состояния
     */
    reset() {
      this.currentTime = 0;
      this.pattern = this.patterns.NORMAL;
      this.resetPatternState();
    }
  }
  
  export default RespirationGenerator;