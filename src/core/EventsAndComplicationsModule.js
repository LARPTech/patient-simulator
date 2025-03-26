/**
 * Модуль событий и осложнений
 * 
 * Этот модуль отвечает за генерацию и обработку различных клинических событий
 * и осложнений во время симуляции, что делает опыт более реалистичным и обучающим.
 */

class EventsAndComplicationsModule {
    constructor(physiologicalModel) {
      // Модель физиологии, с которой будет взаимодействовать модуль
      this.physiologicalModel = physiologicalModel;
      
      // Вероятность возникновения спонтанных событий (в процентах)
      this.eventProbability = 5;
      
      // История событий
      this.eventsHistory = [];
      
      // Активные осложнения
      this.activeComplications = [];
      
      // Интервал проверки событий
      this.checkInterval = null;
      
      // Базовая библиотека возможных событий
      this.eventsLibrary = this.initEventsLibrary();
      
      // Библиотека возможных осложнений
      this.complicationsLibrary = this.initComplicationsLibrary();
    }
    
    /**
     * Инициализация библиотеки событий
     * @returns {Object} Библиотека событий
     */
    initEventsLibrary() {
      return {
        // Респираторные события
        respiratoryEvents: [
          {
            id: 'bronchospasm',
            name: 'Бронхоспазм',
            description: 'Острый бронхоспазм с повышением давления в дыхательных путях',
            severity: 'medium',
            probability: 3,
            duration: { min: 60, max: 180 }, // Секунды
            physiologicalChanges: {
              spo2: -5,
              respiratory_resistance: +10,
              respiratory_depression: +0.3,
              rr: +5
            },
            triggers: ['intubation', 'anaphylaxis'],
            compatibleScenarios: ['asthma', 'copd', 'anaphylaxis'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {
              intubated: true
            }
          },
          {
            id: 'endotracheal_tube_obstruction',
            name: 'Обструкция эндотрахеальной трубки',
            description: 'Частичная обструкция эндотрахеальной трубки секретом',
            severity: 'high',
            probability: 2,
            duration: { min: 120, max: 300 },
            physiologicalChanges: {
              spo2: -10,
              etco2: +10,
              respiratory_resistance: +20,
              rr: +8
            },
            triggers: ['intubation', 'prolonged_ventilation'],
            compatibleScenarios: ['pneumonia', 'respiratory_distress'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {
              intubated: true
            }
          },
          {
            id: 'pneumothorax',
            name: 'Пневмоторакс',
            description: 'Скопление воздуха в плевральной полости, приводящее к коллапсу лёгкого',
            severity: 'critical',
            probability: 1,
            duration: { permanent: true },
            physiologicalChanges: {
              spo2: -15,
              rr: +10,
              hr: +20,
              compliance: -20,
              hypoxia: +0.5,
              systolic: -20,
              diastolic: -10
            },
            triggers: ['barotrauma', 'chest_trauma'],
            compatibleScenarios: ['respiratory_distress', 'trauma'],
            incompatibleScenarios: [],
            requiredConditions: {}
          }
        ],
        
        // Сердечно-сосудистые события
        cardiovascularEvents: [
          {
            id: 'arrhythmia',
            name: 'Аритмия',
            description: 'Нарушение ритма сердца',
            severity: 'medium',
            probability: 4,
            duration: { min: 30, max: 240 },
            physiologicalChanges: {
              hr: (state) => state.hr < 70 ? +30 : -20, // Динамическое изменение
              stroke_volume: -10,
              cardiac_output: -0.5
            },
            triggers: ['electrolyte_imbalance', 'cardiac_ischemia', 'hypoxia'],
            compatibleScenarios: ['cardiac_failure', 'hypertension', 'sepsis'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {}
          },
          {
            id: 'hypotensive_episode',
            name: 'Гипотензивный эпизод',
            description: 'Внезапное падение артериального давления',
            severity: 'high',
            probability: 3,
            duration: { min: 60, max: 180 },
            physiologicalChanges: {
              systolic: -25,
              diastolic: -15,
              hr: +15,
              cardiac_output: -1.0
            },
            triggers: ['hypovolemia', 'vasodilation', 'anesthetic_effect'],
            compatibleScenarios: ['sepsis', 'bleeding', 'anaphylaxis'],
            incompatibleScenarios: ['cardiac_arrest', 'hypertension'],
            requiredConditions: {}
          },
          {
            id: 'pulmonary_embolism',
            name: 'Тромбоэмболия легочной артерии',
            description: 'Блокада легочной артерии тромбом, приводящая к внезапному ухудшению гемодинамики',
            severity: 'critical',
            probability: 1,
            duration: { permanent: true },
            physiologicalChanges: {
              spo2: -20,
              hr: +40,
              systolic: -40,
              diastolic: -20,
              etco2: -15,
              rr: +15,
              hypoxia: +0.7
            },
            triggers: ['immobilization', 'hypercoagulation', 'surgery'],
            compatibleScenarios: ['respiratory_distress', 'heart_failure'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {}
          }
        ],
        
        // Неврологические события
        neurologicalEvents: [
          {
            id: 'increased_icp',
            name: 'Повышение внутричерепного давления',
            description: 'Повышение давления внутри черепа, влияющее на мозговой кровоток',
            severity: 'high',
            probability: 2,
            duration: { min: 300, max: 600 },
            physiologicalChanges: {
              hr: -15,
              systolic: +20,
              diastolic: +10,
              rr: -3,
              gcs: -2
            },
            triggers: ['brain_injury', 'cerebral_edema', 'hemorrhage'],
            compatibleScenarios: ['traumatic_brain_injury', 'stroke', 'neurosurgery'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {}
          },
          {
            id: 'seizure',
            name: 'Судорожный припадок',
            description: 'Генерализованная судорожная активность',
            severity: 'high',
            probability: 2,
            duration: { min: 30, max: 180 },
            physiologicalChanges: {
              hr: +40,
              systolic: +30,
              diastolic: +15,
              rr: +10,
              spo2: -10,
              etco2: +15,
              gcs: -10
            },
            triggers: ['epilepsy', 'brain_injury', 'drug_effect', 'metabolic_disorder'],
            compatibleScenarios: ['status_epilepticus', 'traumatic_brain_injury', 'metabolic_encephalopathy'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {}
          }
        ],
        
        // Метаболические события
        metabolicEvents: [
          {
            id: 'hypoglycemia',
            name: 'Гипогликемия',
            description: 'Критическое снижение уровня глюкозы в крови',
            severity: 'high',
            probability: 3,
            duration: { min: 120, max: 300 },
            physiologicalChanges: {
              hr: +20,
              systolic: -10,
              diastolic: -5,
              gcs: -3
            },
            triggers: ['insulin_overdose', 'starvation', 'liver_failure'],
            compatibleScenarios: ['diabetes', 'sepsis'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {}
          },
          {
            id: 'hyperkalemia',
            name: 'Гиперкалиемия',
            description: 'Повышенный уровень калия в крови, влияющий на сердечную проводимость',
            severity: 'high',
            probability: 2,
            duration: { permanent: true },
            physiologicalChanges: {
              hr: -15,
              cardiac_depression: +0.3
            },
            triggers: ['renal_failure', 'acidosis', 'crush_injury'],
            compatibleScenarios: ['renal_failure', 'acidosis'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {}
          }
        ],
        
        // Медикаментозные события
        medicationEvents: [
          {
            id: 'anaphylaxis',
            name: 'Анафилактическая реакция',
            description: 'Тяжелая аллергическая реакция на введение лекарства',
            severity: 'critical',
            probability: 1,
            duration: { min: 300, max: 900 },
            physiologicalChanges: {
              hr: +40,
              systolic: -50,
              diastolic: -30,
              spo2: -15,
              rr: +10,
              vasodilation: +0.8,
              hypoxia: +0.5
            },
            triggers: ['medication_administration', 'allergy'],
            compatibleScenarios: ['anaphylaxis'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {}
          },
          {
            id: 'opioid_overdose',
            name: 'Передозировка опиоидов',
            description: 'Избыточная угнетающая активность опиоидов',
            severity: 'high',
            probability: 2,
            duration: { min: 300, max: 600 },
            physiologicalChanges: {
              hr: -20,
              systolic: -25,
              diastolic: -15,
              rr: -8,
              respiratory_depression: +0.6,
              etco2: +15,
              spo2: -10,
              gcs: -6
            },
            triggers: ['medication_administration'],
            compatibleScenarios: ['pain_management', 'sedation'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {}
          }
        ]
      };
    }
    
    /**
     * Инициализация библиотеки осложнений
     * @returns {Object} Библиотека осложнений
     */
    initComplicationsLibrary() {
      return {
        // Осложнения, связанные с вентиляцией
        ventilationComplications: [
          {
            id: 'ventilator_induced_lung_injury',
            name: 'Вентилятор-индуцированное повреждение легких',
            description: 'Постепенное ухудшение функции легких вследствие неадекватных параметров ИВЛ',
            severity: 'high',
            probability: 0.5, // Вероятность в час при подходящих условиях
            physiologicalChanges: {
              spo2: -1,
              compliance: -2,
              hypoxia: +0.1
            },
            triggers: ['high_tidal_volume', 'high_peak_pressure', 'low_peep'],
            compatibleScenarios: ['respiratory_distress', 'ards'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {
              intubated: true
            },
            progressiveNature: {
              interval: 1800, // Секунды (30 минут)
              maxStages: 5,
              stageEffectMultiplier: 1.5 // Множитель эффекта на каждой стадии
            }
          },
          {
            id: 'barotrauma',
            name: 'Баротравма',
            description: 'Повреждение легких из-за избыточного давления в дыхательных путях',
            severity: 'critical',
            probability: 0.2, // Вероятность в час при подходящих условиях
            physiologicalChanges: {
              spo2: -15,
              compliance: -30,
              respiratory_resistance: +15,
              hypoxia: +0.5
            },
            triggers: ['high_peak_pressure', 'high_peep'],
            compatibleScenarios: ['respiratory_distress', 'ards'],
            incompatibleScenarios: ['cardiac_arrest'],
            requiredConditions: {
              intubated: true
            }
          }
        ],
        
        // Осложнения, связанные с длительной иммобилизацией
        immobilizationComplications: [
          {
            id: 'pressure_ulcer',
            name: 'Пролежни',
            description: 'Повреждение кожи и подлежащих тканей из-за длительного давления',
            severity: 'medium',
            probability: 1.0, // Вероятность в час при подходящих условиях
            physiologicalChanges: {
              temperature: +0.2,
              infection_risk: +0.1
            },
            triggers: ['prolonged_immobilization', 'malnourishment'],
            compatibleScenarios: ['spinal_cord_injury', 'coma', 'paralysis'],
            incompatibleScenarios: [],
            requiredConditions: {
              prolonged_immobilization: true
            },
            progressiveNature: {
              interval: 3600, // Секунды (1 час)
              maxStages: 4,
              stageEffectMultiplier: 1.2
            }
          },
          {
            id: 'deep_vein_thrombosis',
            name: 'Тромбоз глубоких вен',
            description: 'Образование тромба в глубоких венах, чаще всего в ногах',
            severity: 'high',
            probability: 0.3, // Вероятность в час при подходящих условиях
            physiologicalChanges: {
              circulation_status: -0.2
            },
            triggers: ['prolonged_immobilization', 'hypercoagulation'],
            compatibleScenarios: ['post_surgery', 'trauma', 'cardiac_failure'],
            incompatibleScenarios: [],
            requiredConditions: {
              prolonged_immobilization: true
            },
            progressiveNature: {
              interval: 7200, // Секунды (2 часа)
              maxStages: 3,
              stageEffectMultiplier: 2.0,
              complications: ['pulmonary_embolism'] // Может привести к ТЭЛА
            }
          }
        ],
        
        // Осложнения, связанные с инфекциями
        infectionComplications: [
          {
            id: 'ventilator_associated_pneumonia',
            name: 'Вентилятор-ассоциированная пневмония',
            description: 'Пневмония, развивающаяся после 48 часов ИВЛ',
            severity: 'high',
            probability: 0.4, // Вероятность в час при подходящих условиях
            physiologicalChanges: {
              temperature: +1.5,
              spo2: -5,
              compliance: -10,
              wbc: +5,
              respiratory_resistance: +8
            },
            triggers: ['prolonged_ventilation', 'aspiration'],
            compatibleScenarios: ['respiratory_distress', 'sedation'],
            incompatibleScenarios: [],
            requiredConditions: {
              intubated: true,
              ventilation_duration: 48 // Часы
            },
            progressiveNature: {
              interval: 3600, // Секунды (1 час)
              maxStages: 5,
              stageEffectMultiplier: 1.3
            }
          },
          {
            id: 'catheter_related_infection',
            name: 'Катетер-ассоциированная инфекция',
            description: 'Инфекция, связанная с использованием внутрисосудистых катетеров',
            severity: 'medium',
            probability: 0.3, // Вероятность в час при подходящих условиях
            physiologicalChanges: {
              temperature: +1.0,
              hr: +10,
              wbc: +4
            },
            triggers: ['catheterization', 'poor_hygiene'],
            compatibleScenarios: ['sepsis', 'heart_failure', 'renal_failure'],
            incompatibleScenarios: [],
            requiredConditions: {
              has_central_line: true,
              catheter_duration: 72 // Часы
            },
            progressiveNature: {
              interval: 3600, // Секунды (1 час)
              maxStages: 3,
              stageEffectMultiplier: 1.5,
              complications: ['sepsis'] // Может привести к сепсису
            }
          }
        ]
      };
    }
    
    /**
     * Начало мониторинга событий
     * @param {number} checkIntervalMs - Интервал проверки в миллисекундах
     */
    startEventMonitoring(checkIntervalMs = 10000) {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
      }
      
      this.checkInterval = setInterval(() => {
        this.checkForEvents();
        this.updateActiveComplications();
      }, checkIntervalMs);
      
      console.log("Мониторинг событий и осложнений запущен");
    }
    
    /**
     * Остановка мониторинга событий
     */
    stopEventMonitoring() {
      if (this.checkInterval) {
        clearInterval(this.checkInterval);
        this.checkInterval = null;
      }
      
      console.log("Мониторинг событий и осложнений остановлен");
    }
    
    /**
     * Проверка на возникновение новых событий
     */
    checkForEvents() {
      if (!this.physiologicalModel) return;
      
      // Получаем текущее состояние пациента
      const patientState = this.physiologicalModel.getState();
      
      // Проверяем возможность случайных событий
      if (Math.random() * 100 < this.eventProbability) {
        const event = this.selectRandomEvent(patientState);
        if (event) {
          this.triggerEvent(event);
        }
      }
      
      // Проверяем события, связанные с конкретными условиями
      this.checkTriggerBasedEvents(patientState);
      
      // Проверяем возможность новых осложнений
      this.checkForNewComplications(patientState);
    }
    
    /**
     * Выбор случайного события, подходящего для текущего состояния
     * @param {Object} patientState - Текущее состояние пациента
     * @returns {Object|null} Выбранное событие или null, если нет подходящих
     */
    selectRandomEvent(patientState) {
      // Собираем все возможные события
      let allEvents = [];
      
      Object.values(this.eventsLibrary).forEach(eventCategory => {
        eventCategory.forEach(event => {
          if (this.isEventApplicable(event, patientState)) {
            // Добавляем событие с учетом его вероятности
            for (let i = 0; i < event.probability; i++) {
              allEvents.push(event);
            }
          }
        });
      });
      
      // Если есть подходящие события, выбираем случайное
      if (allEvents.length > 0) {
        const randomIndex = Math.floor(Math.random() * allEvents.length);
        return allEvents[randomIndex];
      }
      
      return null;
    }
    
    /**
     * Проверка, применимо ли событие к текущему состоянию пациента
     * @param {Object} event - Событие для проверки
     * @param {Object} patientState - Текущее состояние пациента
     * @returns {boolean} Применимо ли событие
     */
    isEventApplicable(event, patientState) {
      // Проверяем необходимые условия
      for (const [condition, value] of Object.entries(event.requiredConditions)) {
        if (patientState[condition] !== value) {
          return false;
        }
      }
      
      // Проверяем несовместимые сценарии
      if (patientState.activeScenario) {
        if (event.incompatibleScenarios.includes(patientState.activeScenario)) {
          return false;
        }
      }
      
      // Проверяем, не активно ли уже это событие
      const isAlreadyActive = this.eventsHistory.some(
        historyEvent => historyEvent.id === event.id && historyEvent.isActive
      );
      
      return !isAlreadyActive;
    }
    
    /**
     * Проверка событий, основанных на триггерах
     * @param {Object} patientState - Текущее состояние пациента
     */
    checkTriggerBasedEvents(patientState) {
      // Активные триггеры в текущем состоянии
      const activeTriggersSet = new Set();
      
      // Добавляем триггеры из активных сценариев
      if (patientState.activeScenario) {
        activeTriggersSet.add(patientState.activeScenario);
      }
      
      // Добавляем триггеры из последних действий
      if (patientState.lastAction) {
        activeTriggersSet.add(patientState.lastAction);
      }
      
      // Добавляем триггеры из статуса пациента
      if (patientState.intubated) {
        activeTriggersSet.add('intubation');
      }
      
      if (patientState.ventilation_duration > 24) {
        activeTriggersSet.add('prolonged_ventilation');
      }
      
      if (patientState.immobilization_duration > 24) {
        activeTriggersSet.add('prolonged_immobilization');
      }
      
      if (patientState.spo2 < 90) {
        activeTriggersSet.add('hypoxia');
      }
      
      // Проходим по всем событиям и проверяем на совпадение триггеров
      Object.values(this.eventsLibrary).forEach(eventCategory => {
        eventCategory.forEach(event => {
          // Проверяем, есть ли пересечение между активными триггерами и триггерами события
          const hasMatchingTrigger = event.triggers.some(trigger => 
            activeTriggersSet.has(trigger)
          );
          
          if (hasMatchingTrigger && this.isEventApplicable(event, patientState)) {
            // Вероятностная проверка для триггерных событий (50% вероятность)
            if (Math.random() < 0.5) {
              this.triggerEvent(event);
            }
          }
        });
      });
    }
    
    /**
     * Вызов события и применение его эффекта
     * @param {Object} event - Событие для вызова
     */
    triggerEvent(event) {
      if (!this.physiologicalModel) return;
      
      // Определяем продолжительность события
      let duration;
      if (event.duration.permanent) {
        duration = -1; // Бесконечная продолжительность
      } else {
        // Случайная продолжительность в заданном диапазоне
        duration = Math.floor(
          Math.random() * (event.duration.max - event.duration.min) + event.duration.min
        );
      }
      
      // Создаем запись о событии
      const eventRecord = {
        id: event.id,
        name: event.name,
        description: event.description,
        severity: event.severity,
        startTime: Date.now(),
        duration: duration,
        endTime: duration > 0 ? Date.now() + duration * 1000 : -1,
        isActive: true,
        physiologicalChanges: { ...event.physiologicalChanges }
      };
      
      // Добавляем в историю событий
      this.eventsHistory.push(eventRecord);
      
      // Применяем изменения физиологии
      this.applyPhysiologicalChanges(eventRecord);
      
      // Обратный вызов для оповещения о событии
      if (this.onEventTriggered) {
        this.onEventTriggered(eventRecord);
      }
      
      console.log(`Событие "${event.name}" (${event.severity}) активировано на ${duration > 0 ? duration + ' секунд' : 'постоянной основе'}`);
      
      // Если событие не постоянное, устанавливаем таймер для завершения
      if (duration > 0) {
        setTimeout(() => {
          this.endEvent(eventRecord);
        }, duration * 1000);
      }
    }
    
    /**
     * Завершение события и отмена его эффекта
     * @param {Object} eventRecord - Запись о событии для завершения
     */
    endEvent(eventRecord) {
      if (!this.physiologicalModel) return;
      
      // Находим событие в истории
      const eventIndex = this.eventsHistory.findIndex(e => 
        e.id === eventRecord.id && e.startTime === eventRecord.startTime
      );
      
      if (eventIndex !== -1) {
        // Отменяем изменения физиологии
        this.revertPhysiologicalChanges(eventRecord);
        
        // Обновляем статус события
        this.eventsHistory[eventIndex].isActive = false;
        
        // Обратный вызов для оповещения о завершении события
        if (this.onEventEnded) {
          this.onEventEnded(eventRecord);
        }
        
        console.log(`Событие "${eventRecord.name}" завершено`);
      }
    }
    
    /**
     * Принудительное завершение всех активных событий
     */
    endAllEvents() {
      const activeEvents = this.eventsHistory.filter(e => e.isActive);
      
      activeEvents.forEach(event => {
        this.endEvent(event);
      });
    }
    
    /**
     * Применение физиологических изменений от события
     * @param {Object} eventRecord - Запись о событии
     */
    applyPhysiologicalChanges(eventRecord) {
      if (!this.physiologicalModel) return;
      
      const patientState = this.physiologicalModel.getState();
      const changes = {};
      
      // Обрабатываем каждое изменение
      for (const [param, change] of Object.entries(eventRecord.physiologicalChanges)) {
        if (typeof change === 'function') {
          // Если изменение задано функцией, вызываем ее
          changes[param] = change(patientState);
        } else {
          // Иначе просто используем числовое значение
          changes[param] = change;
        }
      }
      
      // Применяем изменения через модель физиологии
      this.physiologicalModel.applyChanges(changes, eventRecord.id);
    }
    
    /**
     * Отмена физиологических изменений от события
     * @param {Object} eventRecord - Запись о событии
     */
    revertPhysiologicalChanges(eventRecord) {
      if (!this.physiologicalModel) return;
      
      const changes = {};
      
      // Инвертируем каждое изменение
      for (const [param, change] of Object.entries(eventRecord.physiologicalChanges)) {
        if (typeof change === 'number') {
          changes[param] = -change;
        }
        // Функциональные изменения не отменяем, они обрабатываются особым образом
      }
      
      // Отменяем изменения через модель физиологии
      this.physiologicalModel.applyChanges(changes, `revert_${eventRecord.id}`);
    }
    
    /**
     * Проверка на возникновение новых осложнений
     * @param {Object} patientState - Текущее состояние пациента
     */
    checkForNewComplications(patientState) {
      // Проходим по всем категориям осложнений
      Object.values(this.complicationsLibrary).forEach(complicationCategory => {
        complicationCategory.forEach(complication => {
          // Проверяем применимость осложнения
          if (this.isComplicationApplicable(complication, patientState)) {
            // Проверяем вероятность возникновения
            // Вероятность указывается в процентах в час, переводим в вероятность за 1 проверку
            const checkIntervalHours = (this.checkInterval || 10000) / 3600000;
            const checkProbability = complication.probability * checkIntervalHours;
            
            if (Math.random() < checkProbability) {
              this.startComplication(complication);
            }
          }
        });
      });
    }
    
    /**
     * Проверка, применимо ли осложнение к текущему состоянию пациента
     * @param {Object} complication - Осложнение для проверки
     * @param {Object} patientState - Текущее состояние пациента
     * @returns {boolean} Применимо ли осложнение
     */
    isComplicationApplicable(complication, patientState) {
      // Проверяем необходимые условия
      for (const [condition, value] of Object.entries(complication.requiredConditions)) {
        if (patientState[condition] !== value) {
          return false;
        }
      }
      
      // Проверяем несовместимые сценарии
      if (patientState.activeScenario) {
        if (complication.incompatibleScenarios.includes(patientState.activeScenario)) {
          return false;
        }
      }
      
      // Проверяем, не активно ли уже это осложнение
      const isAlreadyActive = this.activeComplications.some(
        activeComp => activeComp.id === complication.id
      );
      
      return !isAlreadyActive;
    }
    
    /**
     * Начало осложнения
     * @param {Object} complication - Осложнение для начала
     */
    startComplication(complication) {
      if (!this.physiologicalModel) return;
      
      // Создаем запись об осложнении
      const complicationRecord = {
        id: complication.id,
        name: complication.name,
        description: complication.description,
        severity: complication.severity,
        startTime: Date.now(),
        currentStage: 1,
        maxStages: complication.progressiveNature ? complication.progressiveNature.maxStages : 1,
        interval: complication.progressiveNature ? complication.progressiveNature.interval : 0,
        nextStageTime: complication.progressiveNature ? Date.now() + complication.progressiveNature.interval * 1000 : 0,
        stageEffectMultiplier: complication.progressiveNature ? complication.progressiveNature.stageEffectMultiplier : 1,
        possibleComplications: complication.progressiveNature ? complication.progressiveNature.complications || [] : [],
        physiologicalChanges: { ...complication.physiologicalChanges }
      };
      
      // Добавляем в активные осложнения
      this.activeComplications.push(complicationRecord);
      
      // Применяем начальные изменения физиологии
      this.applyComplicationChanges(complicationRecord);
      
      // Обратный вызов для оповещения о начале осложнения
      if (this.onComplicationStarted) {
        this.onComplicationStarted(complicationRecord);
      }
      
      console.log(`Осложнение "${complication.name}" (${complication.severity}) началось`);
    }
    
    /**
     * Обновление активных осложнений
     */
    updateActiveComplications() {
      const now = Date.now();
      
      // Проходим по всем активным осложнениям
      this.activeComplications.forEach(complication => {
        // Проверяем, нужно ли перейти на следующую стадию
        if (complication.nextStageTime > 0 && now >= complication.nextStageTime) {
          this.progressComplicationStage(complication);
        }
      });
    }
    
    /**
     * Прогрессирование осложнения на следующую стадию
     * @param {Object} complication - Осложнение для прогрессирования
     */
    progressComplicationStage(complication) {
      if (!this.physiologicalModel) return;
      
      // Увеличиваем стадию
      complication.currentStage++;
      
      // Проверяем, достигнута ли максимальная стадия
      if (complication.currentStage > complication.maxStages) {
        return;
      }
      
      // Обновляем время следующей стадии
      complication.nextStageTime = Date.now() + complication.interval * 1000;
      
      // Применяем дополнительные изменения физиологии
      this.applyComplicationChanges(complication, true);
      
      // Проверяем, нужно ли вызвать дополнительные осложнения
      if (complication.currentStage === complication.maxStages && complication.possibleComplications.length > 0) {
        // Случайно выбираем одно из возможных осложнений
        const complicationId = complication.possibleComplications[
          Math.floor(Math.random() * complication.possibleComplications.length)
        ];
        
        // Ищем осложнение в библиотеке
        let secondaryComplication = null;
        
        for (const category of Object.values(this.complicationsLibrary)) {
          const found = category.find(comp => comp.id === complicationId);
          if (found) {
            secondaryComplication = found;
            break;
          }
        }
        
        // Если осложнение найдено, запускаем его
        if (secondaryComplication) {
          // Вероятность 50% для вторичного осложнения
          if (Math.random() < 0.5) {
            this.startComplication(secondaryComplication);
          }
        }
      }
      
      // Обратный вызов для оповещения о прогрессировании осложнения
      if (this.onComplicationProgressed) {
        this.onComplicationProgressed(complication);
      }
      
      console.log(`Осложнение "${complication.name}" прогрессировало до стадии ${complication.currentStage} из ${complication.maxStages}`);
    }
    
    /**
     * Применение изменений физиологии от осложнения
     * @param {Object} complication - Осложнение
     * @param {boolean} isProgression - Является ли это прогрессированием стадии
     */
    applyComplicationChanges(complication, isProgression = false) {
      if (!this.physiologicalModel) return;
      
      const changes = {};
      
      // Обрабатываем каждое изменение
      for (const [param, change] of Object.entries(complication.physiologicalChanges)) {
        if (typeof change === 'function') {
          // Если изменение задано функцией, вызываем ее
          changes[param] = change(this.physiologicalModel.getState());
        } else {
          // Иначе используем числовое значение
          if (isProgression) {
            // При прогрессировании применяем множитель эффекта
            changes[param] = change * (complication.stageEffectMultiplier || 1);
          } else {
            changes[param] = change;
          }
        }
      }
      
      // Применяем изменения через модель физиологии
      this.physiologicalModel.applyChanges(changes, `${complication.id}_stage${complication.currentStage}`);
    }
    
    /**
     * Прекращение осложнения
     * @param {Object} complication - Осложнение для прекращения
     */
    endComplication(complication) {
      if (!this.physiologicalModel) return;
      
      // Находим осложнение в активных
      const index = this.activeComplications.findIndex(c => c.id === complication.id);
      
      if (index !== -1) {
        // Удаляем из активных осложнений
        this.activeComplications.splice(index, 1);
        
        // Обратный вызов для оповещения о прекращении осложнения
        if (this.onComplicationEnded) {
          this.onComplicationEnded(complication);
        }
        
        console.log(`Осложнение "${complication.name}" прекращено`);
      }
    }
    
    /**
     * Прекращение всех активных осложнений
     */
    endAllComplications() {
      // Копируем массив, так как будем изменять оригинал в процессе итерации
      const complications = [...this.activeComplications];
      
      complications.forEach(complication => {
        this.endComplication(complication);
      });
    }
    
    /**
     * Получение всех активных событий
     * @returns {Array} Активные события
     */
    getActiveEvents() {
      return this.eventsHistory.filter(event => event.isActive);
    }
    
    /**
     * Получение всех активных осложнений
     * @returns {Array} Активные осложнения
     */
    getActiveComplications() {
      return this.activeComplications;
    }
    
    /**
     * Получение истории событий
     * @param {number} limit - Ограничение на количество событий
     * @returns {Array} История событий
     */
    getEventsHistory(limit = 0) {
      // Сортируем по времени (сначала новые)
      const sortedHistory = [...this.eventsHistory].sort((a, b) => b.startTime - a.startTime);
      
      // Применяем ограничение, если установлено
      return limit > 0 ? sortedHistory.slice(0, limit) : sortedHistory;
    }
    
    /**
     * Установка вероятности спонтанных событий
     * @param {number} probability - Вероятность в процентах
     */
    setEventProbability(probability) {
      this.eventProbability = Math.max(0, Math.min(100, probability));
    }
    
    /**
     * Установка обработчика события
     * @param {string} eventType - Тип события (onEventTriggered, onEventEnded и т.д.)
     * @param {Function} handler - Обработчик события
     */
    setEventHandler(eventType, handler) {
      if (typeof handler === 'function') {
        this[eventType] = handler;
      }
    }
  }
  
  export default EventsAndComplicationsModule;