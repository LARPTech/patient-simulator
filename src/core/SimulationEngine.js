/**
 * SimulationEngine.js
 * 
 * Этот модуль является основным движком симуляции, координирующим взаимодействие
 * между различными компонентами системы: физиологической моделью, генераторами
 * сигналов, модулем событий и осложнений, а также пользовательским интерфейсом.
 */

import PhysiologicalModel from './PhysiologicalModel';
import EventsAndComplicationsModule from './EventsAndComplicationsModule';
import BloodGasCalculator from '../utils/physiological-calculations/BloodGasCalculator';
import HemodynamicsCalculator from '../utils/physiological-calculations/HemodynamicsCalculator';
import ECGGenerator from '../utils/waveform-generators/ECGGenerator';
import RespirationGenerator from '../utils/waveform-generators/RespirationGenerator';
import CapnographyGenerator from '../utils/waveform-generators/CapnographyGenerator';
import SpO2Generator from '../utils/waveform-generators/SpO2Generator';

class SimulationEngine {
  constructor(initialState = {}, options = {}) {
    // Настройки симуляции
    this.options = {
      updateInterval: 1000, // миллисекунды между обновлениями
      eventCheckInterval: 10000, // миллисекунды между проверками событий
      realTimeFactor: 1.0, // коэффициент ускорения/замедления времени
      ...options
    };
    
    // Создаем физиологическую модель
    this.physiologicalModel = new PhysiologicalModel(initialState);
    
    // Создаем модуль событий и осложнений
    this.eventsModule = new EventsAndComplicationsModule(this.physiologicalModel);
    
    // Создаем калькуляторы
    this.bloodGasCalculator = new BloodGasCalculator();
    this.hemodynamicsCalculator = new HemodynamicsCalculator();
    
    // Создаем генераторы сигналов
    this.waveformGenerators = {
      ecg: new ECGGenerator(),
      respiration: new RespirationGenerator(),
      capnography: new CapnographyGenerator(),
      spo2: new SpO2Generator()
    };
    
    // Буферы данных сигналов
    this.waveformBuffers = {
      ecg: [],
      respiration: [],
      capnography: [],
      spo2: []
    };
    
    // Максимальный размер буфера для каждого сигнала (количество секунд * частота дискретизации)
    this.bufferSizes = {
      ecg: 10 * 250, // 10 секунд при 250 Гц
      respiration: 30 * 100, // 30 секунд при 100 Гц
      capnography: 20 * 100, // 20 секунд при 100 Гц
      spo2: 10 * 100 // 10 секунд при 100 Гц
    };
    
    // Интервалы обновления для разных компонентов
    this.updateIntervals = {
      model: null, // Интервал обновления физиологической модели
      events: null, // Интервал проверки событий
      waveforms: null // Интервал обновления сигналов
    };
    
    // Статус симуляции
    this.isRunning = false;
    
    // Текущее состояние
    this.currentState = initialState;
    
    // История состояний для анализа и отчетов
    this.stateHistory = [];
    
    // Максимальное количество сохраняемых состояний
    this.maxHistoryLength = 60; // 1 минута при обновлении раз в секунду
    
    // Время последнего обновления
    this.lastUpdateTime = Date.now();
    
    // Счетчик реального времени симуляции (в секундах)
    this.simulationTime = 0;
    
    // Обработчики событий
    this.eventHandlers = {
      stateUpdated: [],
      complicationStarted: [],
      complicationProgressed: [],
      complicationEnded: [],
      eventStarted: [],
      eventEnded: [],
      alarmTriggered: [],
      alarmResolved: []
    };
    
    // Текущие тревоги
    this.activeAlarms = {};
    
    // Настройки тревог
    this.alarmSettings = {
      hr: { min: 50, max: 120, enabled: true, priority: 'high' },
      spo2: { min: 90, max: 100, enabled: true, priority: 'high' },
      systolic: { min: 90, max: 160, enabled: true, priority: 'medium' },
      diastolic: { min: 50, max: 90, enabled: true, priority: 'medium' },
      rr: { min: 8, max: 30, enabled: true, priority: 'high' },
      etco2: { min: 30, max: 45, enabled: true, priority: 'medium' },
      temperature: { min: 36.0, max: 38.0, enabled: true, priority: 'low' }
    };
  }
  
  /**
   * Инициализация движка симуляции
   */
  initialize() {
    // Настраиваем обработчики событий для модуля осложнений
    this.eventsModule.setEventHandler('onEventTriggered', this.handleEventTriggered.bind(this));
    this.eventsModule.setEventHandler('onEventEnded', this.handleEventEnded.bind(this));
    this.eventsModule.setEventHandler('onComplicationStarted', this.handleComplicationStarted.bind(this));
    this.eventsModule.setEventHandler('onComplicationProgressed', this.handleComplicationProgressed.bind(this));
    this.eventsModule.setEventHandler('onComplicationEnded', this.handleComplicationEnded.bind(this));
    
    // Выполняем первичное обновление состояния
    this.updateState();
    
    return this;
  }
  
  /**
   * Запуск симуляции
   */
  start() {
    if (this.isRunning) return this;
    
    this.isRunning = true;
    this.lastUpdateTime = Date.now();
    
    // Запускаем физиологическую модель
    this.physiologicalModel.startSimulation();
    
    // Запускаем модуль событий и осложнений
    this.eventsModule.startEventMonitoring(this.options.eventCheckInterval);
    
    // Начинаем регулярное обновление состояния
    this.updateIntervals.model = setInterval(() => {
      this.updateState();
    }, this.options.updateInterval);
    
    // Запускаем генерацию сигналов с более высокой частотой
    this.updateIntervals.waveforms = setInterval(() => {
      this.updateWaveforms();
    }, 50); // 20 раз в секунду
    
    console.log("Симуляция запущена");
    return this;
  }
  
  /**
   * Остановка симуляции
   */
  stop() {
    if (!this.isRunning) return this;
    
    this.isRunning = false;
    
    // Останавливаем физиологическую модель
    this.physiologicalModel.stopSimulation();
    
    // Останавливаем модуль событий и осложнений
    this.eventsModule.stopEventMonitoring();
    
    // Останавливаем интервалы обновления
    for (const interval of Object.values(this.updateIntervals)) {
      if (interval) clearInterval(interval);
    }
    
    console.log("Симуляция остановлена");
    return this;
  }
  
  /**
   * Обновление состояния симуляции
   */
  updateState() {
    if (!this.isRunning) return;
    
    // Рассчитываем прошедшее время с последнего обновления
    const now = Date.now();
    const elapsedMs = now - this.lastUpdateTime;
    this.lastUpdateTime = now;
    
    // Обновляем счетчик времени симуляции
    this.simulationTime += (elapsedMs / 1000) * this.options.realTimeFactor;
    
    // Получаем текущее состояние из физиологической модели
    this.currentState = this.physiologicalModel.getState();
    
    // Рассчитываем дополнительные параметры
    this.calculateDerivedParameters();
    
    // Проверяем тревоги
    this.checkAlarms();
    
    // Добавляем состояние в историю
    this.stateHistory.push({
      time: this.simulationTime,
      state: { ...this.currentState }
    });
    
    // Ограничиваем размер истории
    if (this.stateHistory.length > this.maxHistoryLength) {
      this.stateHistory.shift();
    }
    
    // Оповещаем подписчиков об обновлении состояния
    this.notifyHandlers('stateUpdated', this.currentState);
    
    return this.currentState;
  }
  
  /**
   * Обновление волновых сигналов
   */
  updateWaveforms() {
    if (!this.isRunning) return;
    
    // Получаем текущее состояние
    const state = this.currentState;
    
    // Обновляем параметры генераторов сигналов
    this.waveformGenerators.ecg.applyPatientState(state);
    this.waveformGenerators.respiration.applyPatientState(state);
    this.waveformGenerators.capnography.applyPatientState(state);
    this.waveformGenerators.spo2.applyPatientState(state);
    
    // Генерируем новые значения сигналов
    const numSamples = {
      ecg: Math.ceil(250 * 0.05), // 12-13 сэмплов при 250 Гц за 50 мс
      respiration: Math.ceil(100 * 0.05), // 5 сэмплов при 100 Гц за 50 мс
      capnography: Math.ceil(100 * 0.05), // 5 сэмплов при 100 Гц за 50 мс
      spo2: Math.ceil(100 * 0.05) // 5 сэмплов при 100 Гц за 50 мс
    };
    
    // Обновляем буферы сигналов
    for (const [type, generator] of Object.entries(this.waveformGenerators)) {
      for (let i = 0; i < numSamples[type]; i++) {
        this.waveformBuffers[type].push(generator.getNextValue());
        
        // Ограничиваем размер буфера
        if (this.waveformBuffers[type].length > this.bufferSizes[type]) {
          this.waveformBuffers[type].shift();
        }
      }
    }
  }
  
  /**
   * Рассчет производных параметров на основе физиологической модели
   */
  calculateDerivedParameters() {
    // Рассчитываем газы крови
    const bloodGases = this.bloodGasCalculator.calculateBloodGases(this.currentState);
    
    // Рассчитываем гемодинамические параметры
    const hemodynamics = this.hemodynamicsCalculator.calculateHemodynamics(this.currentState);
    
    // Добавляем расчетные параметры в текущее состояние
    this.currentState.bloodGases = bloodGases;
    this.currentState.hemodynamics = hemodynamics;
  }
  
  /**
   * Проверка тревог на основе текущего состояния
   */
  checkAlarms() {
    const state = this.currentState;
    const newAlarms = {};
    
    // Проходим по всем параметрам тревог
    for (const [param, settings] of Object.entries(this.alarmSettings)) {
      // Пропускаем отключенные тревоги
      if (!settings.enabled) continue;
      
      // Проверяем наличие параметра в состоянии и его числовое значение
      if (param in state && typeof state[param] === 'number') {
        const value = state[param];
        
        // Проверяем выход за границы
        if (value < settings.min) {
          newAlarms[`${param}_low`] = {
            parameter: param,
            value,
            threshold: settings.min,
            type: 'low',
            priority: settings.priority,
            message: `${param.toUpperCase()} ниже ${settings.min}`
          };
        } else if (value > settings.max) {
          newAlarms[`${param}_high`] = {
            parameter: param,
            value,
            threshold: settings.max,
            type: 'high',
            priority: settings.priority,
            message: `${param.toUpperCase()} выше ${settings.max}`
          };
        }
      }
    }
    
    // Проверяем новые тревоги
    for (const [alarmId, alarm] of Object.entries(newAlarms)) {
      // Если тревоги не было ранее - это новая тревога
      if (!this.activeAlarms[alarmId]) {
        this.notifyHandlers('alarmTriggered', alarm);
      }
    }
    
    // Проверяем разрешенные тревоги
    for (const [alarmId, alarm] of Object.entries(this.activeAlarms)) {
      // Если тревоги больше нет в списке новых - она разрешена
      if (!newAlarms[alarmId]) {
        this.notifyHandlers('alarmResolved', alarm);
      }
    }
    
    // Обновляем список активных тревог
    this.activeAlarms = newAlarms;
  }
  
  /**
   * Обработчик срабатывания события
   * @param {Object} event - Информация о событии
   */
  handleEventTriggered(event) {
    console.log(`Событие начато: ${event.name}`);
    this.notifyHandlers('eventStarted', event);
  }
  
  /**
   * Обработчик завершения события
   * @param {Object} event - Информация о событии
   */
  handleEventEnded(event) {
    console.log(`Событие завершено: ${event.name}`);
    this.notifyHandlers('eventEnded', event);
  }
  
  /**
   * Обработчик начала осложнения
   * @param {Object} complication - Информация об осложнении
   */
  handleComplicationStarted(complication) {
    console.log(`Осложнение начато: ${complication.name}`);
    this.notifyHandlers('complicationStarted', complication);
  }
  
  /**
   * Обработчик прогрессирования осложнения
   * @param {Object} complication - Информация об осложнении
   */
  handleComplicationProgressed(complication) {
    console.log(`Осложнение прогрессирует: ${complication.name}, стадия ${complication.currentStage}`);
    this.notifyHandlers('complicationProgressed', complication);
  }
  
  /**
   * Обработчик завершения осложнения
   * @param {Object} complication - Информация об осложнении
   */
  handleComplicationEnded(complication) {
    console.log(`Осложнение завершено: ${complication.name}`);
    this.notifyHandlers('complicationEnded', complication);
  }
  
  /**
   * Получение текущих данных сигналов
   * @param {string} type - Тип сигнала (ecg, respiration, capnography, spo2)
   * @param {number} seconds - Количество секунд данных для возврата (по умолчанию - все)
   * @returns {Array} Данные сигнала
   */
  getWaveformData(type, seconds = null) {
    if (!this.waveformBuffers[type]) {
      console.warn(`Неизвестный тип сигнала: ${type}`);
      return [];
    }
    
    // Если количество секунд не указано, возвращаем весь буфер
    if (seconds === null) {
      return [...this.waveformBuffers[type]];
    }
    
    // Иначе берем только указанное количество секунд данных с конца буфера
    const sampleRate = type === 'ecg' ? 250 : 100;
    const samplesToReturn = Math.min(
      Math.floor(seconds * sampleRate),
      this.waveformBuffers[type].length
    );
    
    return this.waveformBuffers[type].slice(-samplesToReturn);
  }
  
  /**
   * Применение клинического сценария
   * @param {string} scenarioKey - Ключ сценария
   * @param {Object} parameters - Дополнительные параметры сценария
   * @returns {Object} Обновленное состояние
   */
  applyScenario(scenarioKey, parameters = {}) {
    const result = this.physiologicalModel.applyScenario(scenarioKey, parameters);
    this.updateState();
    return result;
  }
  
  /**
   * Применение лекарства
   * @param {string} medicationName - Название лекарства
   * @param {number} dose - Доза (по умолчанию 1.0)
   * @returns {Object} Обновленное состояние
   */
  applyMedication(medicationName, dose = 1.0) {
    const result = this.physiologicalModel.applyMedication(medicationName, dose);
    this.updateState();
    return result;
  }
  
  /**
   * Интубация пациента
   * @param {boolean} success - Успешность интубации
   * @returns {Object} Обновленное состояние
   */
  intubate(success = true) {
    const result = this.physiologicalModel.intubate(success);
    this.updateState();
    return result;
  }
  
  /**
   * Настройка конкретного параметра физиологии
   * @param {string} param - Название параметра
   * @param {*} value - Значение
   */
  setParameter(param, value) {
    this.physiologicalModel.setState({ [param]: value });
    this.updateState();
    return this.currentState;
  }
  
  /**
   * Настройка фактора влияния на физиологию
   * @param {string} factorName - Название фактора
   * @param {number} value - Значение (0-1)
   */
  setFactor(factorName, value) {
    this.physiologicalModel.setFactor(factorName, value);
    this.updateState();
    return this.currentState;
  }
  
  /**
   * Получение текущего состояния симуляции
   * @returns {Object} Текущее состояние
   */
  getState() {
    return { ...this.currentState };
  }
  
  /**
   * Получение истории состояний
   * @param {number} count - Количество последних состояний (по умолчанию - все)
   * @returns {Array} История состояний
   */
  getStateHistory(count = null) {
    if (count === null) {
      return [...this.stateHistory];
    }
    return this.stateHistory.slice(-count);
  }
  
  /**
   * Получение активных событий
   * @returns {Array} Список активных событий
   */
  getActiveEvents() {
    return this.eventsModule.getActiveEvents();
  }
  
  /**
   * Получение активных осложнений
   * @returns {Array} Список активных осложнений
   */
  getActiveComplications() {
    return this.eventsModule.getActiveComplications();
  }
  
  /**
   * Получение истории событий
   * @param {number} limit - Ограничение количества (0 = все)
   * @returns {Array} История событий
   */
  getEventsHistory(limit = 0) {
    return this.eventsModule.getEventsHistory(limit);
  }
  
  /**
   * Получение активных тревог
   * @returns {Object} Активные тревоги
   */
  getActiveAlarms() {
    return { ...this.activeAlarms };
  }
  
  /**
   * Установка параметров тревог
   * @param {string} parameter - Параметр (hr, spo2, etc.)
   * @param {Object} settings - Настройки тревоги
   */
  setAlarmSettings(parameter, settings) {
    if (this.alarmSettings[parameter]) {
      this.alarmSettings[parameter] = {
        ...this.alarmSettings[parameter],
        ...settings
      };
    }
  }
  
  /**
   * Сброс всех тревог (подтверждение)
   */
  acknowledgeAllAlarms() {
    const alarms = { ...this.activeAlarms };
    this.activeAlarms = {};
    return alarms;
  }
  
  /**
   * Сброс тревоги по параметру
   * @param {string} parameter - Параметр (hr, spo2, etc.)
   */
  acknowledgeAlarm(parameter) {
    const alarms = {};
    
    for (const [alarmId, alarm] of Object.entries(this.activeAlarms)) {
      if (alarm.parameter === parameter) {
        alarms[alarmId] = alarm;
        delete this.activeAlarms[alarmId];
      }
    }
    
    return alarms;
  }
  
  /**
   * Имитация начала/продолжения СЛР
   */
  startCPR() {
    // Устанавливаем соответствующий флаг
    this.physiologicalModel.setState({ cpr_in_progress: true });
    
    // Эффекты СЛР: повышение EtCO2, повышение коронарной перфузии
    if (this.currentState.cardiac_arrest) {
      // При остановке сердца СЛР обеспечивает минимальный сердечный выброс
      this.setFactor('bleeding', 0);
      this.setFactor('cardiac_depression', 0.7); // Было 1.0 (полное угнетение)
      this.physiologicalModel.setState({ 
        hr: Math.max(this.currentState.hr, 40),
        etco2: Math.max(this.currentState.etco2, 15),
        systolic: Math.max(this.currentState.systolic, 80),
        diastolic: Math.max(this.currentState.diastolic, 40)
      });
    }
    
    this.updateState();
    return this.currentState;
  }
  
  /**
   * Имитация прекращения СЛР
   */
  stopCPR() {
    // Снимаем флаг СЛР
    this.physiologicalModel.setState({ cpr_in_progress: false });
    
    // Если был остановка сердца, возвращаем соответствующие параметры
    if (this.currentState.cardiac_arrest) {
      this.setFactor('cardiac_depression', 1.0);
      this.physiologicalModel.setState({
        hr: 0,
        etco2: Math.max(5, this.currentState.etco2 - 10),
        systolic: 0,
        diastolic: 0
      });
    }
    
    this.updateState();
    return this.currentState;
  }
  
  /**
   * Имитация дефибрилляции
   * @param {number} energy - Энергия разряда в Джоулях
   */
  defibrillate(energy = 200) {
    // Проверяем, находится ли пациент в состоянии, поддающемся дефибрилляции
    if (this.currentState.cardiac_arrest) {
      // Вероятность успешной дефибрилляции зависит от типа аритмии и времени остановки
      const arrestDuration = this.currentState.arrest_duration || 0; // в секундах
      
      let successProbability = 0;
      
      // В зависимости от ритма
      if (this.currentState.cardiac_rhythm === 'vfib' || this.currentState.cardiac_rhythm === 'vtach') {
        // Вероятность выше для фибрилляции желудочков/желудочковой тахикардии
        successProbability = 0.7;
      } else if (this.currentState.cardiac_rhythm === 'asystole') {
        // Очень низкая вероятность для асистолии
        successProbability = 0.05;
      } else if (this.currentState.cardiac_rhythm === 'pea') {
        // Электрическая активность без пульса не реагирует на дефибрилляцию
        successProbability = 0;
      }
      
      // Корректировка вероятности в зависимости от длительности остановки
      if (arrestDuration > 0) {
        // Каждая минута снижает вероятность на 10%
        const minutesInArrest = Math.floor(arrestDuration / 60);
        successProbability *= Math.max(0.1, 1 - (minutesInArrest * 0.1));
      }
      
      // Корректировка вероятности в зависимости от энергии разряда
      if (energy < 120) {
        successProbability *= 0.5; // Недостаточная энергия снижает вероятность
      } else if (energy > 360) {
        successProbability *= 0.9; // Избыточная энергия может быть вредна
      }
      
      // Определяем результат дефибрилляции
      const isSuccessful = Math.random() < successProbability;
      
      if (isSuccessful) {
        // Успешная дефибрилляция - восстановление сердечного ритма
        this.physiologicalModel.setState({
          cardiac_arrest: false,
          cardiac_rhythm: 'sinus',
          hr: 100, // Начальный высокий пульс
          systolic: 100,
          diastolic: 60
        });
        
        // Снижаем факторы угнетения
        this.setFactor('cardiac_depression', 0.3);
        this.setFactor('respiratory_depression', 0.3);
        
        console.log("Дефибрилляция успешна: восстановлен сердечный ритм");
        return { success: true, message: "Восстановлен сердечный ритм" };
      } else {
        // Неудачная дефибрилляция - смена режима фибрилляции или без изменений
        if (this.currentState.cardiac_rhythm === 'vfib') {
          // Фибрилляция может измениться на более низкоамплитудную или асистолию
          if (Math.random() < 0.3) {
            this.physiologicalModel.setState({ cardiac_rhythm: 'asystole' });
            console.log("Дефибрилляция: переход в асистолию");
            return { success: false, message: "После разряда развилась асистолия" };
          }
        }
        
        console.log("Дефибрилляция безуспешна");
        return { success: false, message: "Без изменений" };
      }
    } else {
      // У пациента нет остановки сердца - дефибрилляция не показана
      console.log("Дефибрилляция не показана - пациент без остановки сердца");
      return { success: false, message: "Дефибрилляция не показана" };
    }
  }
  
  /**
   * Добавление наблюдателя за событиями
   * @param {string} eventType - Тип события
   * @param {Function} handler - Обработчик события
   */
  on(eventType, handler) {
    if (this.eventHandlers[eventType]) {
      this.eventHandlers[eventType].push(handler);
    } else {
      console.warn(`Неизвестный тип события: ${eventType}`);
    }
    return this;
  }
  
  /**
   * Удаление наблюдателя за событиями
   * @param {string} eventType - Тип события
   * @param {Function} handler - Обработчик события
   */
  off(eventType, handler) {
    if (this.eventHandlers[eventType]) {
      this.eventHandlers[eventType] = this.eventHandlers[eventType]
        .filter(h => h !== handler);
    }
    return this;
  }
  
  /**
   * Оповещение всех наблюдателей о событии
   * @param {string} eventType - Тип события
   * @param {*} data - Данные события
   */
  notifyHandlers(eventType, data) {
    if (this.eventHandlers[eventType]) {
      for (const handler of this.eventHandlers[eventType]) {
        try {
          handler(data);
        } catch (error) {
          console.error(`Ошибка в обработчике события ${eventType}:`, error);
        }
      }
    }
  }
  
  /**
   * Получение текущего времени симуляции
   * @returns {number} Время симуляции в секундах
   */
  getSimulationTime() {
    return this.simulationTime;
  }
  
  /**
   * Изменение скорости симуляции
   * @param {number} factor - Коэффициент скорости (1.0 = реальное время)
   */
  setTimeScale(factor) {
    this.options.realTimeFactor = factor;
    return this;
  }
  
  /**
   * Полный сброс симуляции
   */
  reset() {
    // Останавливаем симуляцию
    this.stop();
    
    // Сбрасываем физиологическую модель
    this.physiologicalModel.applyScenario('normal');
    
    // Сбрасываем модуль событий и осложнений
    this.eventsModule.endAllEvents();
    this.eventsModule.endAllComplications();
    
    // Сбрасываем буферы сигналов
    for (const type in this.waveformBuffers) {
      this.waveformBuffers[type] = [];
    }
    
    // Сбрасываем счетчики времени
    this.simulationTime = 0;
    this.lastUpdateTime = Date.now();
    
    // Сбрасываем историю состояний
    this.stateHistory = [];
    
    // Сбрасываем тревоги
    this.activeAlarms = {};
    
    // Обновляем состояние
    this.updateState();
    
    console.log("Симуляция сброшена");
    return this;
  }
}

export default SimulationEngine;