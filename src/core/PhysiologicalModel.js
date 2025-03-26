// Модель физиологии пациента для симулятора
// Этот класс отвечает за реалистичное изменение показателей и взаимодействие систем организма

class PhysiologicalModel {
    constructor(initialState = {}) {
      // Начальные показатели здорового пациента
      this.state = {
        // Сердечно-сосудистая система
        hr: 72,           // Частота сердечных сокращений (уд/мин)
        systolic: 120,    // Систолическое давление (мм рт.ст.)
        diastolic: 80,    // Диастолическое давление (мм рт.ст.)
        cardiac_output: 5.0, // Сердечный выброс (л/мин)
        stroke_volume: 70,   // Ударный объем (мл)
        
        // Дыхательная система
        rr: 14,           // Частота дыхания (вд/мин)
        spo2: 98,         // Сатурация кислорода (%)
        etco2: 35,        // Концентрация CO2 в конце выдоха (мм рт.ст.)
        tidal_volume: 500, // Дыхательный объем (мл)
        peep: 5,          // ПДКВ - положительное давление конца выдоха (см H2O)
        
        // Общие параметры
        temperature: 36.6, // Температура тела (°C)
        
        // Неврологические параметры
        gcs: 15,          // Шкала комы Глазго
        pupils: "normal", // Состояние зрачков (normal, dilated, constricted)
        
        // Системные статусы
        blood_volume: 5000, // Объем крови (мл)
        intubated: false,   // Статус интубации
        pain_level: 0,      // Уровень боли (0-10)
        
        // Временные параметры
        last_update: Date.now(),
        
        // Переопределяем параметры начальными значениями, если они предоставлены
        ...initialState
      };
      
      // Настройки взаимозависимых параметров и допустимых пределов
      this.settings = {
        min_hr: 30,
        max_hr: 220,
        min_systolic: 60,
        max_systolic: 250,
        min_diastolic: 30,
        max_diastolic: 140,
        min_rr: 5,
        max_rr: 40,
        min_spo2: 60,
        max_spo2: 100,
        min_etco2: 15,
        max_etco2: 80,
        min_temp: 34,
        max_temp: 42
      };
      
      // Факторы, влияющие на физиологию
      this.factors = {
        hypoxia: 0,         // Гипоксия (0-1)
        bleeding: 0,         // Кровотечение (0-1)
        cardiac_depression: 0, // Угнетение сердечной деятельности (0-1)
        respiratory_depression: 0, // Угнетение дыхания (0-1)
        vasodilation: 0,      // Вазодилатация (0-1)
        vasoconstriction: 0,   // Вазоконстрикция (0-1)
        pain: 0               // Болевая стимуляция (0-1)
      };
      
      // Эффекты лекарств и их продолжительность
      this.medications = {};
      
      // Интервал обновления модели (мс)
      this.updateInterval = null;
    }
    
    // Запуск моделирования физиологии
    startSimulation(intervalMs = 1000) {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
      }
      
      this.updateInterval = setInterval(() => this.updatePhysiology(), intervalMs);
      return this;
    }
    
    // Остановка моделирования
    stopSimulation() {
      if (this.updateInterval) {
        clearInterval(this.updateInterval);
        this.updateInterval = null;
      }
      return this;
    }
    
    // Основная функция обновления физиологии
    updatePhysiology() {
      const now = Date.now();
      const timeDelta = (now - this.state.last_update) / 1000; // в секундах
      
      // Обновляем время последнего обновления
      this.state.last_update = now;
      
      // Обновляем эффекты лекарств (уменьшаем со временем)
      this.updateMedicationEffects(timeDelta);
      
      // Обновляем основные показатели на основе факторов и лекарств
      this.updateCardiovascular(timeDelta);
      this.updateRespiratory(timeDelta);
      this.updateTemperature(timeDelta);
      
      // Обновляем вторичные параметры на основе первичных
      this.calculateDerivedParameters();
      
      // Добавляем небольшую физиологическую вариабельность
      this.addVariability();
      
      // Корректируем значения в пределах допустимых диапазонов
      this.enforceConstraints();
      
      return this.getState();
    }
    
    // Обновление эффектов лекарств
    updateMedicationEffects(timeDelta) {
      // Проходим по всем активным лекарствам
      Object.keys(this.medications).forEach(med => {
        const medication = this.medications[med];
        
        // Уменьшаем длительность действия
        medication.duration -= timeDelta;
        
        if (medication.duration <= 0) {
          // Если срок действия истек, удаляем лекарство
          delete this.medications[med];
        } else {
          // Обновляем силу действия в зависимости от фазы
          const phasePercent = 1 - (medication.duration / medication.initialDuration);
          
          // Разная модель для разных типов лекарств
          if (medication.type === "bolus") {
            // Быстрое нарастание и постепенное снижение
            medication.strength = medication.initialStrength * 
              (phasePercent < 0.2 ? phasePercent * 5 : (1 - phasePercent) * 1.25);
          } else {
            // Постепенное снижение
            medication.strength = medication.initialStrength * (1 - phasePercent);
          }
        }
      });
    }
    
    // Обновление сердечно-сосудистой системы
    updateCardiovascular(timeDelta) {
      let hr = this.state.hr;
      let systolic = this.state.systolic;
      let diastolic = this.state.diastolic;
      
      // Влияние факторов
      
      // Гипоксия увеличивает ЧСС
      hr += this.factors.hypoxia * 50 * timeDelta;
      
      // Кровотечение снижает давление и повышает ЧСС
      if (this.factors.bleeding > 0) {
        const bleedingEffect = this.factors.bleeding * timeDelta;
        this.state.blood_volume = Math.max(2500, this.state.blood_volume - bleedingEffect * 500);
        
        // Компенсаторное повышение ЧСС при снижении объема крови
        const volumeDeficit = 1 - (this.state.blood_volume / 5000);
        hr += volumeDeficit * 60 * timeDelta;
        
        // Снижение давления при потере крови
        systolic -= bleedingEffect * 50;
        diastolic -= bleedingEffect * 30;
      }
      
      // Угнетение сердечной деятельности
      hr -= this.factors.cardiac_depression * 40 * timeDelta;
      systolic -= this.factors.cardiac_depression * 40 * timeDelta;
      diastolic -= this.factors.cardiac_depression * 20 * timeDelta;
      
      // Вазодилатация
      systolic -= this.factors.vasodilation * 40 * timeDelta;
      diastolic -= this.factors.vasodilation * 30 * timeDelta;
      
      // Вазоконстрикция
      systolic += this.factors.vasoconstriction * 30 * timeDelta;
      diastolic += this.factors.vasoconstriction * 20 * timeDelta;
      
      // Боль повышает ЧСС и давление
      hr += this.factors.pain * 30 * timeDelta;
      systolic += this.factors.pain * 20 * timeDelta;
      diastolic += this.factors.pain * 10 * timeDelta;
      
      // Влияние лекарств
      Object.values(this.medications).forEach(med => {
        switch(med.name) {
          case "epinephrine":
            hr += med.strength * 40 * timeDelta;
            systolic += med.strength * 50 * timeDelta;
            diastolic += med.strength * 20 * timeDelta;
            break;
          case "norepinephrine":
            systolic += med.strength * 60 * timeDelta;
            diastolic += med.strength * 30 * timeDelta;
            break;
          case "atropine":
            hr += med.strength * 30 * timeDelta;
            break;
          case "propofol":
          case "midazolam":
            hr -= med.strength * 15 * timeDelta;
            systolic -= med.strength * 25 * timeDelta;
            diastolic -= med.strength * 15 * timeDelta;
            break;
          // Другие лекарства...
        }
      });
      
      // Обновляем состояние
      this.state.hr = hr;
      this.state.systolic = systolic;
      this.state.diastolic = diastolic;
    }
    
    // Обновление дыхательной системы
    updateRespiratory(timeDelta) {
      let rr = this.state.rr;
      let spo2 = this.state.spo2;
      let etco2 = this.state.etco2;
      
      // Влияние гипоксии
      if (this.factors.hypoxia > 0) {
        spo2 -= this.factors.hypoxia * 20 * timeDelta;
        rr += this.factors.hypoxia * 10 * timeDelta; // Компенсаторное учащение дыхания
      }
      
      // Угнетение дыхания
      if (this.factors.respiratory_depression > 0) {
        rr -= this.factors.respiratory_depression * 10 * timeDelta;
        etco2 += this.factors.respiratory_depression * 15 * timeDelta; // Накопление CO2
      }
      
      // Восстановление SpO2 при нормальной работе легких (если нет гипоксии)
      if (this.factors.hypoxia < 0.1 && spo2 < 98) {
        spo2 += (1 - this.factors.respiratory_depression) * 2 * timeDelta;
      }
      
      // Влияние кровотечения на оксигенацию (меньше гемоглобина для переноса O2)
      if (this.state.blood_volume < 5000) {
        const volumeDeficit = 1 - (this.state.blood_volume / 5000);
        spo2 -= volumeDeficit * 10 * timeDelta;
      }
      
      // Влияние лекарств
      Object.values(this.medications).forEach(med => {
        switch(med.name) {
          case "propofol":
          case "midazolam":
          case "fentanyl":
            rr -= med.strength * 8 * timeDelta;
            etco2 += med.strength * 10 * timeDelta;
            break;
          // Другие лекарства...
        }
      });
      
      // Интубация улучшает оксигенацию
      if (this.state.intubated && spo2 < 95) {
        spo2 += 5 * timeDelta;
      }
      
      // Обновляем состояние
      this.state.rr = rr;
      this.state.spo2 = spo2;
      this.state.etco2 = etco2;
    }
    
    // Обновление температуры
    updateTemperature(timeDelta) {
      let temp = this.state.temperature;
      
      // Влияние лекарств на температуру
      Object.values(this.medications).forEach(med => {
        if (med.name === "paracetamol" && temp > 37.5) {
          temp -= med.strength * 0.5 * timeDelta;
        }
      });
      
      // Естественное восстановление температуры
      if (temp !== 36.6) {
        temp += (36.6 - temp) * 0.05 * timeDelta;
      }
      
      this.state.temperature = temp;
    }
    
    // Расчет вторичных параметров на основе первичных
    calculateDerivedParameters() {
      // Рассчитываем среднее артериальное давление
      this.state.map = Math.round((this.state.systolic + 2 * this.state.diastolic) / 3);
      
      // Рассчитываем сердечный выброс на основе ЧСС и ударного объема
      // СВ = ЧСС * УО / 1000 (л/мин)
      this.state.cardiac_output = (this.state.hr * this.state.stroke_volume) / 1000;
      
      // Корректировка ударного объема при изменении объема крови
      const volumeRatio = this.state.blood_volume / 5000;
      this.state.stroke_volume = Math.round(70 * volumeRatio);
      
      // Обновляем неврологические показатели на основе оксигенации и других факторов
      if (this.state.spo2 < 85) {
        this.state.gcs = Math.max(3, this.state.gcs - 1);
        this.state.pupils = "sluggish";
      }
      
      if (this.state.map < 60) {
        this.state.gcs = Math.max(3, this.state.gcs - 1);
      }
    }
    
    // Добавление физиологической вариабельности
    addVariability() {
      // Небольшие случайные колебания для реалистичности
      this.state.hr += (Math.random() * 2 - 1);
      this.state.systolic += (Math.random() * 4 - 2);
      this.state.diastolic += (Math.random() * 2 - 1);
      this.state.rr += (Math.random() * 1 - 0.5);
      this.state.spo2 += (Math.random() * 1 - 0.5);
      this.state.temperature += (Math.random() * 0.2 - 0.1);
    }
    
    // Корректировка значений в пределах допустимых диапазонов
    enforceConstraints() {
      // Ограничиваем значения пределами
      this.state.hr = this.clamp(this.state.hr, this.settings.min_hr, this.settings.max_hr);
      this.state.systolic = this.clamp(this.state.systolic, this.settings.min_systolic, this.settings.max_systolic);
      this.state.diastolic = this.clamp(this.state.diastolic, this.settings.min_diastolic, this.settings.max_diastolic);
      this.state.rr = this.clamp(this.state.rr, this.settings.min_rr, this.settings.max_rr);
      this.state.spo2 = this.clamp(this.state.spo2, this.settings.min_spo2, this.settings.max_spo2);
      this.state.etco2 = this.clamp(this.state.etco2, this.settings.min_etco2, this.settings.max_etco2);
      this.state.temperature = this.clamp(this.state.temperature, this.settings.min_temp, this.settings.max_temp);
      
      // Дополнительные ограничения логики
      // Диастолическое всегда ниже систолического
      if (this.state.diastolic >= this.state.systolic - 10) {
        this.state.diastolic = this.state.systolic - 10;
      }
    }
    
    // Применение клинического сценария
    applyScenario(scenarioKey) {
      const scenarios = {
        // Нормальные показатели здорового пациента
        "normal": {
          hr: 72,
          systolic: 120,
          diastolic: 80,
          rr: 14,
          spo2: 98,
          etco2: 35,
          temperature: 36.6,
          factors: {
            hypoxia: 0,
            bleeding: 0,
            cardiac_depression: 0,
            respiratory_depression: 0,
            vasodilation: 0,
            vasoconstriction: 0,
            pain: 0
          }
        },
        
        // Гипоксия
        "hypoxia": {
          spo2: 88,
          rr: 22,
          factors: {
            hypoxia: 0.7
          }
        },
        
        // Брадикардия
        "bradycardia": {
          hr: 40,
          factors: {
            cardiac_depression: 0.3
          }
        },
        
        // Тахикардия
        "tachycardia": {
          hr: 140,
          factors: {
            pain: 0.5
          }
        },
        
        // Гипотония
        "hypotension": {
          systolic: 80,
          diastolic: 50,
          hr: 100,
          factors: {
            bleeding: 0.3,
            vasodilation: 0.6
          }
        },
        
        // Гипертония
        "hypertension": {
          systolic: 180,
          diastolic: 110,
          factors: {
            vasoconstriction: 0.7,
            pain: 0.4
          }
        },
        
        // Респираторный дистресс
        "respiratory_distress": {
          rr: 30,
          spo2: 85,
          factors: {
            hypoxia: 0.6,
            respiratory_depression: 0.3
          }
        },
        
        // Кровотечение
        "bleeding": {
          hr: 130,
          systolic: 90,
          diastolic: 60,
          factors: {
            bleeding: 0.8
          },
          blood_volume: 3800
        },
        
        // Анафилактический шок
        "anaphylaxis": {
          hr: 140,
          systolic: 75,
          diastolic: 45,
          rr: 28,
          spo2: 88,
          factors: {
            vasodilation: 0.9,
            hypoxia: 0.5
          }
        },
        
        // Остановка сердца (асистолия)
        "cardiac_arrest": {
          hr: 0,
          systolic: 0,
          diastolic: 0,
          rr: 0,
          spo2: 60,
          etco2: 15,
          factors: {
            cardiac_depression: 1.0,
            respiratory_depression: 1.0,
            hypoxia: 1.0
          },
          gcs: 3,
          pupils: "fixed"
        }
      };
      
      // Применяем сценарий, если он существует
      if (scenarios[scenarioKey]) {
        const scenario = scenarios[scenarioKey];
        
        // Обновляем показатели
        Object.keys(scenario).forEach(key => {
          if (key === 'factors') {
            // Для факторов делаем отдельное обновление
            Object.keys(scenario.factors).forEach(factor => {
              this.factors[factor] = scenario.factors[factor];
            });
          } else {
            // Для обычных показателей просто обновляем
            this.state[key] = scenario[key];
          }
        });
        
        // Принудительно обновляем физиологию
        this.updatePhysiology();
        return true;
      }
      
      return false;
    }
    
    // Применение лекарства
    applyMedication(medicationName, dose = 1.0) {
      const medications = {
        "epinephrine": {
          name: "epinephrine",
          initialStrength: dose,
          duration: 300, // 5 минут
          type: "bolus",
          effects: {
            hr: +30,
            systolic: +50,
            diastolic: +30
          }
        },
        "atropine": {
          name: "atropine",
          initialStrength: dose,
          duration: 1800, // 30 минут
          type: "bolus",
          effects: {
            hr: +20
          }
        },
        "norepinephrine": {
          name: "norepinephrine",
          initialStrength: dose,
          duration: 600, // 10 минут
          type: "infusion",
          effects: {
            systolic: +40,
            diastolic: +20
          }
        },
        "propofol": {
          name: "propofol",
          initialStrength: dose,
          duration: 900, // 15 минут
          type: "bolus",
          effects: {
            hr: -15,
            systolic: -30,
            diastolic: -20,
            rr: -5
          }
        },
        "midazolam": {
          name: "midazolam",
          initialStrength: dose,
          duration: 1200, // 20 минут
          type: "bolus",
          effects: {
            hr: -10,
            systolic: -20,
            diastolic: -10,
            rr: -3
          }
        },
        "fentanyl": {
          name: "fentanyl",
          initialStrength: dose,
          duration: 1800, // 30 минут
          type: "bolus",
          effects: {
            hr: -5,
            rr: -6,
            pain: -0.8
          }
        }
      };
      
      if (medications[medicationName]) {
        const med = { ...medications[medicationName] };
        med.initialDuration = med.duration;
        med.strength = med.initialStrength;
        
        // Добавляем или обновляем лекарство в списке активных
        this.medications[medicationName] = med;
        
        // Немедленно применяем некоторые эффекты
        if (med.instantEffects) {
          Object.keys(med.instantEffects).forEach(param => {
            if (this.state[param] !== undefined) {
              this.state[param] += med.instantEffects[param] * dose;
            }
          });
        }
        
        // Обновляем физиологию
        this.updatePhysiology();
        return true;
      }
      
      return false;
    }
    
    // Интубация пациента
    intubate(success = true) {
      this.state.intubated = success;
      
      if (success) {
        // Улучшаем оксигенацию при успешной интубации
        this.factors.hypoxia = Math.max(0, this.factors.hypoxia - 0.5);
        this.state.spo2 = Math.min(100, this.state.spo2 + 5);
        this.state.etco2 = 35; // Нормализация EtCO2
      } else {
        // Ухудшаем при неудачной
        this.factors.hypoxia = Math.min(1, this.factors.hypoxia + 0.3);
        this.state.spo2 = Math.max(60, this.state.spo2 - 10);
      }
      
      return this.updatePhysiology();
    }
    
    // Установка конкретного фактора
    setFactor(factorName, value) {
      if (this.factors[factorName] !== undefined) {
        this.factors[factorName] = this.clamp(value, 0, 1);
        this.updatePhysiology();
        return true;
      }
      return false;
    }
    
    // Получение текущего состояния
    getState() {
      // Округляем числовые значения для удобства отображения
      const result = { ...this.state };
      
      Object.keys(result).forEach(key => {
        if (typeof result[key] === 'number' && key !== 'last_update') {
          // Округляем до 1 десятичного знака для температуры, 
          // для остальных до целых чисел
          result[key] = key === 'temperature' || key === 'cardiac_output' 
            ? Math.round(result[key] * 10) / 10 
            : Math.round(result[key]);
        }
      });
      
      return result;
    }
    
    // Вспомогательная функция для ограничения значения
    clamp(value, min, max) {
      return Math.min(Math.max(value, min), max);
    }
  }
  
  export default PhysiologicalModel;