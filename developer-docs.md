# Документация для разработчиков симулятора пациента

## Содержание

1. [Архитектура системы](#архитектура-системы)
2. [Модель физиологии](#модель-физиологии)
3. [Интерфейсные компоненты](#интерфейсные-компоненты)
4. [Система событий и осложнений](#система-событий-и-осложнений)
5. [Интеграция новых модулей](#интеграция-новых-модулей)
6. [Расширение клинических сценариев](#расширение-клинических-сценариев)
7. [Разработка собственных визуализаций](#разработка-собственных-визуализаций)
8. [Тестирование и отладка](#тестирование-и-отладка)
9. [Лучшие практики](#лучшие-практики)

## Архитектура системы

Симулятор пациента построен на модульной архитектуре, позволяющей расширять функциональность и интегрировать новые компоненты. Система состоит из следующих основных модулей:

### Структура проекта

```
├── core/
│   ├── PhysiologicalModel.js        # Модель физиологии пациента
│   ├── EventsAndComplicationsModule.js # Модуль событий и осложнений
│   └── SimulationEngine.js          # Основной двигатель симуляции
├── components/
│   ├── EnhancedPatientMonitor.jsx   # Основной монитор пациента
│   ├── VentilatorMonitor.jsx        # Модуль ИВЛ
│   ├── LabResultsModule.jsx         # Модуль лабораторных данных
│   ├── ClinicalScenarios.jsx        # Модуль клинических сценариев
│   └── ...
├── utils/
│   ├── waveform-generators/         # Генераторы сигналов (ЭКГ, дыхание и др.)
│   ├── physiological-calculations/  # Вспомогательные расчеты
│   └── ...
├── assets/
│   ├── images/                     # Изображения
│   └── sounds/                     # Звуки (тревоги и т.д.)
└── IntegratedPatientSimulator.jsx   # Основное приложение
```

### Поток данных

1. **Модель физиологии** отвечает за расчет и обновление всех физиологических параметров пациента
2. **Модуль событий и осложнений** генерирует события, влияющие на модель физиологии
3. **Интерфейсные компоненты** получают данные от модели и отображают их
4. **Пользовательские действия** (вмешательства, лекарства, настройки) передаются в модель физиологии
5. **Двигатель симуляции** координирует взаимодействие между всеми компонентами

### Диаграмма взаимодействия компонентов

```
+---------------------+      +-------------------------+
| Пользовательский    |----->| Клинические сценарии    |
| интерфейс           |      +-------------------------+
+---------------------+                |
        ^  |                          V
        |  |      +-------------------------------------+
        |  +----->| Модель физиологии пациента         |<---+
        |         +-------------------------------------+    |
        |                      ^  |                          |
        |                      |  V                          |
        |         +-------------------------------------+    |
        |         | Модуль событий и осложнений         |----+
        |         +-------------------------------------+
        |                        |
        |         +-------------------------------------+
        +---------| Интерфейсные компоненты             |
                  | (Монитор, ИВЛ, Лаборатория)         |
                  +-------------------------------------+
```

## Модель физиологии

Модель физиологии — это сердце симулятора, реализованное в классе `PhysiologicalModel`. Она отвечает за моделирование всех физиологических процессов и их взаимодействий.

### Основные характеристики модели

- **Многосистемное моделирование**: сердечно-сосудистая, дыхательная, неврологическая и другие системы.
- **Реалистичные взаимодействия**: изменения в одной системе влияют на другие.
- **Индивидуальные характеристики пациента**: возможность настройки базовых параметров.
- **Динамическое обновление**: постоянное обновление состояния в реальном времени.

### Основные методы для интеграции

```javascript
// Инициализация модели с начальными параметрами
const model = new PhysiologicalModel({
  age: 45,
  gender: 'male',
  weight: 70,
  height: 175,
  // Другие базовые параметры
});

// Запуск симуляции
model.startSimulation(updateIntervalMs);

// Остановка симуляции
model.stopSimulation();

// Получение текущего состояния
const state = model.getState();

// Применение клинического сценария
model.applyScenario('hypoxia', { severity: 0.7 });

// Применение лекарства
model.applyMedication('epinephrine', 1.0);

// Выполнение вмешательства
model.intubate(true);

// Установка конкретного параметра
model.setFactor('hypoxia', 0.5);

// Прямое обновление состояния (для расширенного контроля)
model.setState({ hr: 80, rr: 16, /* другие параметры */ });

// Подписка на изменения
model.on('stateUpdated', newState => {
  // Обработка обновленного состояния
});
```

### Расширение модели

Для расширения модели физиологии можно:

1. **Добавлять новые системы органов** путем расширения класса `PhysiologicalModel`:

```javascript
class EnhancedPhysiologicalModel extends PhysiologicalModel {
  constructor(initialState) {
    super(initialState);
    
    // Добавление новых состояний
    this.state.liver_function = 1.0;
    this.state.kidney_function = 1.0;
    
    // Дополнительные настройки
    this.settings.min_liver_function = 0;
    this.settings.max_liver_function = 1;
  }
  
  // Переопределение метода обновления физиологии
  updatePhysiology() {
    super.updatePhysiology();
    
    // Дополнительные расчеты
    this.updateLiverFunction();
    this.updateKidneyFunction();
  }
  
  // Новые методы
  updateLiverFunction() {
    // Реализация специфичной логики
  }
  
  updateKidneyFunction() {
    // Реализация специфичной логики
  }
}
```

2. **Добавлять новые медикаменты**:

```javascript
// Добавление нового медикамента в существующую модель
model.medications['dexmedetomidine'] = {
  name: "dexmedetomidine",
  initialStrength: dose,
  duration: 1800, // 30 минут
  type: "infusion",
  effects: {
    hr: -10,
    systolic: -15,
    diastolic: -10,
    sedation: +0.7
  }
};
```

3. **Взаимодействие с внешними API** или другими источниками данных:

```javascript
// Пример интеграции с внешним API
class ExternallyEnhancedModel extends PhysiologicalModel {
  constructor(initialState, apiEndpoint) {
    super(initialState);
    this.apiEndpoint = apiEndpoint;
  }
  
  async fetchExternalParameters(patientId) {
    try {
      const response = await fetch(`${this.apiEndpoint}/patients/${patientId}`);
      const data = await response.json();
      
      // Применение внешних данных к модели
      this.setState({
        // Новые параметры из внешнего источника
        ...data.physiologicalParameters
      });
      
      return true;
    } catch (error) {
      console.error('Failed to fetch external parameters:', error);
      return false;
    }
  }
}
```

## Интерфейсные компоненты

Интерфейсные компоненты отвечают за визуализацию данных модели и взаимодействие с пользователем.

### Основные компоненты

1. **EnhancedPatientMonitor**: Отображение жизненных показателей и графиков
2. **VentilatorMonitor**: Управление и мониторинг ИВЛ
3. **LabResultsModule**: Отображение лабораторных данных
4. **ClinicalScenarios**: Выбор и настройка клинических сценариев

### Интеграция компонентов

Все компоненты разработаны для работы с центральным хранилищем состояния. Используйте следующий паттерн для интеграции новых компонентов:

```jsx
// Пример создания нового компонента пациента
function NewPatientModule({ patientState, updatePatientState }) {
  // patientState содержит текущее состояние модели
  // updatePatientState позволяет вносить изменения
  
  const handleSomeAction = () => {
    // Обновление состояния
    updatePatientState({
      ...patientState,
      newParameter: value
    });
  };
  
  return (
    <div className="module-container">
      <h2>Новый модуль</h2>
      <div>
        Значение параметра: {patientState.someParameter}
      </div>
      <button onClick={handleSomeAction}>
        Изменить параметр
      </button>
    </div>
  );
}

// Использование в основном приложении
function App() {
  const [patientState, setPatientState] = useState(initialState);
  
  return (
    <div>
      <EnhancedPatientMonitor 
        patientState={patientState}
        updatePatientState={setPatientState}
      />
      <NewPatientModule
        patientState={patientState}
        updatePatientState={setPatientState}
      />
    </div>
  );
}
```

### Кастомизация интерфейса

Все компоненты используют TailwindCSS для стилизации, что облегчает их кастомизацию:

```jsx
// Пример кастомизации компонента отображения показателя
function CustomVitalDisplay({ title, value, unit, color }) {
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm text-blue-400">{title}</div>
        <div className="text-xs text-gray-400">Кастомизировано</div>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className={`text-6xl font-bold text-${color}-500`}>
          {value}
        </div>
        <div className="text-sm text-blue-400">{unit}</div>
      </div>
    </div>
  );
}
```

## Система событий и осложнений

Модуль событий и осложнений (`EventsAndComplicationsModule`) добавляет реализм в симуляцию, генерируя спонтанные события и долгосрочные осложнения.

### Основные концепции

- **События**: Краткосрочные изменения состояния пациента (например, бронхоспазм)
- **Осложнения**: Долгосрочные прогрессирующие состояния (например, пролежни)
- **Триггеры**: Условия или действия, которые могут вызвать события
- **Прогрессирование**: Постепенное ухудшение состояния с течением времени

### Интеграция модуля

```javascript
// Инициализация модуля
const eventsModule = new EventsAndComplicationsModule(physiologicalModel);

// Настройка вероятности событий
eventsModule.setEventProbability(10); // 10%

// Запуск мониторинга событий
eventsModule.startEventMonitoring(15000); // Проверка каждые 15 секунд

// Остановка мониторинга
eventsModule.stopEventMonitoring();

// Получение активных событий
const activeEvents = eventsModule.getActiveEvents();

// Получение активных осложнений
const activeComplications = eventsModule.getActiveComplications();

// Получение истории событий
const eventHistory = eventsModule.getEventsHistory(10); // Последние 10 событий

// Установка обработчиков событий
eventsModule.setEventHandler('onEventTriggered', (event) => {
  console.log(`Событие ${event.name} началось`);
  // Обновление UI или другие действия
});

eventsModule.setEventHandler('onEventEnded', (event) => {
  console.log(`Событие ${event.name} завершилось`);
  // Обновление UI или другие действия
});
```

### Добавление пользовательских событий

Вы можете добавлять собственные события и осложнения в систему:

```javascript
// Добавление нового события в библиотеку
eventsModule.eventsLibrary.cardiovascularEvents.push({
  id: 'atrial_fibrillation',
  name: 'Фибрилляция предсердий',
  description: 'Нерегулярный сердечный ритм, вызванный хаотической электрической активностью предсердий',
  severity: 'medium',
  probability: 3,
  duration: { min: 120, max: 600 },
  physiologicalChanges: {
    hr: +30,
    cardiac_output: -0.8,
    stroke_volume: -15
  },
  triggers: ['cardiac_disease', 'electrolyte_imbalance', 'hyperthyroidism'],
  compatibleScenarios: ['cardiac_failure', 'sepsis', 'pulmonary_embolism'],
  incompatibleScenarios: ['cardiac_arrest'],
  requiredConditions: {}
});

// Добавление нового осложнения в библиотеку
eventsModule.complicationsLibrary.metabolicComplications = [
  {
    id: 'metabolic_acidosis',
    name: 'Метаболический ацидоз',
    description: 'Нарушение кислотно-щелочного баланса с избытком кислот',
    severity: 'high',
    probability: 0.3,
    physiologicalChanges: {
      ph: -0.05,
      hco3: -3,
      be: -5,
      respiratory_rate: +3
    },
    triggers: ['renal_failure', 'shock', 'dka'],
    compatibleScenarios: ['sepsis', 'cardiac_arrest', 'renal_failure'],
    incompatibleScenarios: [],
    requiredConditions: {},
    progressiveNature: {
      interval: 1800,
      maxStages: 3,
      stageEffectMultiplier: 1.5
    }
  }
];
```

## Интеграция новых модулей

Для интеграции новых модулей в симулятор следуйте этому руководству.

### Создание нового модуля

1. **Определите назначение и функциональность** вашего модуля
2. **Создайте компонент React** или класс JavaScript в зависимости от типа модуля
3. **Подключите к основной модели физиологии** или другим необходимым компонентам

### Пример: Создание модуля для педиатрических пациентов

```javascript
// PediatricPhysiologicalModel.js
import PhysiologicalModel from '../core/PhysiologicalModel';

class PediatricPhysiologicalModel extends PhysiologicalModel {
  constructor(initialState) {
    // Настраиваем параметры по умолчанию для детей
    const pediatricDefaults = {
      // Значения по умолчанию для детей различаются от взрослых
      hr: 100, // Более высокая ЧСС у детей
      rr: 20,  // Более высокая ЧД у детей
      systolic: 100,
      diastolic: 60,
      // Другие параметры
    };
    
    super({ ...pediatricDefaults, ...initialState });
    
    // Настройка специфичных для детей ограничений
    this.settings.min_hr = 60;
    this.settings.max_hr = 180;
    this.settings.min_rr = 15;
    this.settings.max_rr = 60;
    // Другие настройки
    
    // Добавление специфичных для детей состояний
    this.state.growth_status = 1.0;
    this.state.developmental_stage = initialState.developmental_stage || 'infant';
  }
  
  // Переопределяем метод для учета особенностей детской физиологии
  updatePhysiology() {
    super.updatePhysiology();
    
    // Добавляем специфичную для педиатрии логику
    this.updatePediatricParameters();
  }
  
  // Специфичный для педиатрии метод
  updatePediatricParameters() {
    // Реализация специфичной для детей логики
    switch (this.state.developmental_stage) {
      case 'infant':
        // Логика для младенцев
        break;
      case 'toddler':
        // Логика для детей ясельного возраста
        break;
      case 'preschool':
        // Логика для дошкольников
        break;
      case 'school_age':
        // Логика для детей школьного возраста
        break;
      case 'adolescent':
        // Логика для подростков
        break;
    }
  }
  
  // Дополнительные методы для педиатрических пациентов
  calculateDrugDosage(medication, dose) {
    // Расчет дозировки лекарств с учетом возраста, веса и площади поверхности тела
    const weight = this.state.weight;
    const age = this.state.age;
    
    // Алгоритм расчета дозировки для детей
    let adjustedDose;
    
    // Логика расчета с разными формулами в зависимости от лекарства
    switch (medication) {
      case 'epinephrine':
        adjustedDose = weight * 0.01 * dose; // мкг/кг
        break;
      // Другие лекарства
      default:
        adjustedDose = dose;
    }
    
    return adjustedDose;
  }
}

export default PediatricPhysiologicalModel;
```

```jsx
// PediatricMonitor.jsx
import React from 'react';

function PediatricMonitor({ patientState, updatePatientState }) {
  // Вычисление специфичных для детей показателей
  const calculatePediatricScores = () => {
    // Пример: педиатрическая шкала оценки
    let score = 0;
    
    if (patientState.hr > 160) score += 2;
    else if (patientState.hr > 120) score += 1;
    
    if (patientState.rr > 40) score += 2;
    else if (patientState.rr > 30) score += 1;
    
    if (patientState.spo2 < 90) score += 2;
    else if (patientState.spo2 < 95) score += 1;
    
    return score;
  };
  
  const pediatricScore = calculatePediatricScores();
  
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-xl text-white font-bold mb-4">Педиатрический мониторинг</h2>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h3 className="text-lg text-white font-medium mb-3">Показатели</h3>
          
          <div className="bg-gray-800 p-3 rounded-lg mb-3">
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Возрастная группа:</span>
              <span className="text-white font-medium">{patientState.developmental_stage}</span>
            </div>
            <div className="flex justify-between mb-1">
              <span className="text-gray-400">Вес:</span>
              <span className="text-white font-medium">{patientState.weight} кг</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Рост:</span>
              <span className="text-white font-medium">{patientState.height} см</span>
            </div>
          </div>
          
          {/* Педиатрическая шкала оценки */}
          <div className="bg-gray-800 p-3 rounded-lg">
            <h4 className="text-white font-medium mb-2">Педиатрическая шкала</h4>
            <div className={`text-2xl font-bold ${
              pediatricScore <= 1 ? 'text-green-500' :
              pediatricScore <= 3 ? 'text-yellow-500' : 'text-red-500'
            }`}>
              {pediatricScore} / 6
            </div>
            <div className="text-sm text-gray-400 mt-1">
              {pediatricScore <= 1 ? 'Стабильное состояние' :
               pediatricScore <= 3 ? 'Требует наблюдения' : 'Критическое состояние'}
            </div>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg text-white font-medium mb-3">Специфические параметры</h3>
          
          {/* Дополнительные педиатрические параметры */}
          <div className="bg-gray-800 p-3 rounded-lg mb-3">
            <div className="mb-2">
              <label className="text-gray-400 text-sm block mb-1">Статус развития</label>
              <select
                className="w-full bg-gray-700 text-white rounded p-2"
                value={patientState.developmental_stage}
                onChange={(e) => updatePatientState({ 
                  ...patientState, 
                  developmental_stage: e.target.value 
                })}
              >
                <option value="infant">Младенец (0-1 год)</option>
                <option value="toddler">Ясельный возраст (1-3 года)</option>
                <option value="preschool">Дошкольный (3-5 лет)</option>
                <option value="school_age">Школьный (6-12 лет)</option>
                <option value="adolescent">Подростковый (13-18 лет)</option>
              </select>
            </div>
          </div>
          
          {/* Калькулятор дозировки лекарств */}
          <div className="bg-gray-800 p-3 rounded-lg">
            <h4 className="text-white font-medium mb-2">Калькулятор дозировки</h4>
            <div className="mb-2">
              <label className="text-gray-400 text-xs block mb-1">Выберите лекарство</label>
              <select className="w-full bg-gray-700 text-white rounded p-1 text-sm">
                <option>Эпинефрин</option>
                <option>Атропин</option>
                <option>Мидазолам</option>
                {/* Другие лекарства */}
              </select>
            </div>
            <div className="flex justify-between text-sm mt-3">
              <span className="text-gray-400">Расчетная доза:</span>
              <span className="text-white font-medium">0.05 мг</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PediatricMonitor;
```

### Интеграция модуля в основное приложение

```jsx
// App.jsx
import React, { useState, useEffect, useRef } from 'react';
import EnhancedPatientMonitor from './components/EnhancedPatientMonitor';
import PediatricMonitor from './components/PediatricMonitor';
import PediatricPhysiologicalModel from './core/PediatricPhysiologicalModel';

function App() {
  const [isPediatricMode, setIsPediatricMode] = useState(false);
  const [isOperating, setIsOperating] = useState(false);
  const [patientState, setPatientState] = useState({
    // Начальные значения
  });
  
  // Ссылка на модель физиологии
  const physiologicalModelRef = useRef(null);
  
  // Инициализация модели физиологии
  useEffect(() => {
    // Выбираем модель в зависимости от режима
    if (isPediatricMode) {
      physiologicalModelRef.current = new PediatricPhysiologicalModel({
        age: 5,
        weight: 18,
        height: 110,
        developmental_stage: 'preschool'
      });
    } else {
      physiologicalModelRef.current = new PhysiologicalModel({
        age: 45,
        weight: 70,
        height: 175
      });
    }
    
    // Очистка при размонтировании
    return () => {
      if (physiologicalModelRef.current) {
        physiologicalModelRef.current.stopSimulation();
      }
    };
  }, [isPediatricMode]);
  
  // Эффект для симуляции
  useEffect(() => {
    if (isOperating && physiologicalModelRef.current) {
      physiologicalModelRef.current.startSimulation();
      
      // Обновление состояния с интервалом
      const interval = setInterval(() => {
        setPatientState(physiologicalModelRef.current.getState());
      }, 1000);
      
      return () => clearInterval(interval);
    }
  }, [isOperating]);
  
  // Обработчик обновления состояния
  const updatePatientState = (newState) => {
    if (physiologicalModelRef.current) {
      physiologicalModelRef.current.setState(newState);
    }
    setPatientState(newState);
  };
  
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Верхняя панель */}
      <div className="h-12 bg-gray-900 border-b border-gray-700 flex justify-between items-center px-4">
        <div className="flex space-x-4 items-center">
          <button
            className={`px-4 py-1 rounded text-sm ${isOperating ? 'bg-red-800' : 'bg-green-800'}`}
            onClick={() => setIsOperating(!isOperating)}
          >
            {isOperating ? 'Завершить операцию' : 'Начало операции'}
          </button>
          
          <div className="ml-4">
            <label className="text-white text-sm mr-2">Режим:</label>
            <select
              className="bg-gray-800 text-white p-1 rounded"
              value={isPediatricMode ? 'pediatric' : 'adult'}
              onChange={(e) => setIsPediatricMode(e.target.value === 'pediatric')}
            >
              <option value="adult">Взрослый пациент</option>
              <option value="pediatric">Детский пациент</option>
            </select>
          </div>
        </div>
      </div>
      
      {/* Основное содержимое */}
      <div className="flex-1 p-4 overflow-auto">
        {/* Отображаем соответствующий монитор в зависимости от режима */}
        {isPediatricMode ? (
          <PediatricMonitor
            patientState={patientState}
            updatePatientState={updatePatientState}
          />
        ) : (
          <EnhancedPatientMonitor
            patientState={patientState}
            updatePatientState={updatePatientState}
            isOperating={isOperating}
          />
        )}
      </div>
    </div>
  );
}

export default App;
```

## Расширение клинических сценариев

Система клинических сценариев позволяет создавать комплексные симуляции различных состояний пациента.

### Структура сценария

Сценарий состоит из следующих компонентов:

```javascript
const scenarioTemplate = {
  id: 'unique_scenario_id',
  title: 'Название сценария',
  description: 'Детальное описание сценария',
  difficulty: 'easy', // 'easy', 'medium', 'hard'
  duration: 20, // Примерная продолжительность в минутах
  category: 'category_name', // 'cardiac', 'respiratory', 'trauma', и т.д.
  scenarioKey: 'internal_key', // Ключ для модели физиологии
  
  // Начальные параметры
  parameters: {
    severity: 0.7,
    progression: 'static'
  },
  
  // Конфигурация настраиваемых параметров
  parametersConfig: [
    {
      id: 'severity',
      label: 'Тяжесть состояния',
      type: 'range',
      min: 0.3,
      max: 1,
      step: 0.1,
      default: 0.7
    },
    {
      id: 'progression',
      label: 'Прогрессирование',
      type: 'select',
      default: 'static',
      options: [
        { value: 'improving', label: 'Улучшение' },
        { value: 'static', label: 'Стабильно' },
        { value: 'worsening', label: 'Ухудшение' }
      ]
    }
  ],
  
  // Начальные состояния систем организма
  initialState: {
    hr: 120,
    rr: 22,
    spo2: 88,
    systolic: 90,
    diastolic: 60,
    temperature: 37.2,
    // Другие параметры
  },
  
  // Стадии сценария (для динамических сценариев)
  stages: [
    {
      name: 'Initial Presentation',
      duration: 300, // секунды
      description: 'Начальное состояние пациента',
      state: {} // Используется initialState
    },
    {
      name: 'Deterioration',
      duration: 600, // секунды
      description: 'Ухудшение состояния',
      state: {
        hr: 140,
        rr: 28,
        spo2: 82,
        systolic: 80,
        diastolic: 50
      }
    },
    // Дополнительные стадии
  ],
  
  // События, которые могут произойти во время сценария
  events: [
    {
      id: 'hypoxemia_worsening',
      probability: 75, // Вероятность в процентах
      minTime: 180, // Минимальное время до события (секунды)
      maxTime: 600, // Максимальное время до события (секунды)
      condition: (state) => state.spo2 < 90, // Условие для события
      action: (model) => {
        model.setFactor('hypoxia', 0.8);
        return 'Усиление гипоксемии';
      }
    }
    // Дополнительные события
  ],
  
  // Ожидаемые вмешательства и их эффекты
  expectedInterventions: [
    {
      id: 'oxygen_therapy',
      description: 'Кислородотерапия',
      condition: (state, actions) => actions.includes('oxygen_therapy'),
      effect: (model) => {
        model.setFactor('hypoxia', Math.max(0, model.factors.hypoxia - 0.3));
        return 'Улучшение оксигенации';
      }
    },
    // Дополнительные вмешательства
  ]
};
```

### Пример: Создание нового сценария сепсиса

```javascript
// В файле с клиническими сценариями
const septicShockScenario = {
  id: 'septic_shock',
  title: 'Септический шок',
  description: 'Тяжелый сепсис с гипотензией, не реагирующей на инфузионную терапию',
  difficulty: 'hard',
  duration: 30,
  category: 'emergency',
  scenarioKey: 'septic_shock',
  
  parameters: {
    severity: 0.8,
    source: 'pulmonary'
  },
  
  parametersConfig: [
    {
      id: 'severity',
      label: 'Тяжесть состояния',
      type: 'range',
      min: 0.5,
      max: 1,
      step: 0.1,
      default: 0.8
    },
    {
      id: 'source',
      label: 'Источник инфекции',
      type: 'select',
      default: 'pulmonary',
      options: [
        { value: 'pulmonary', label: 'Пневмония' },
        { value: 'abdominal', label: 'Абдоминальный' },
        { value: 'urinary', label: 'Мочевая система' },
        { value: 'soft_tissue', label: 'Мягкие ткани' }
      ]
    }
  ],
  
  initialState: {
    hr: 130,
    rr: 28,
    spo2: 92,
    systolic: 85,
    diastolic: 45,
    temperature: 39.2,
    lactate: 4.5,
    wbc: 18.5,
    cardiac_output: 7.2, // Повышен из-за гипердинамического состояния
    svr: 600, // Низкое системное сосудистое сопротивление
    vasodilation: 0.8,
    capillary_leak: 0.7,
    blood_volume: 4200 // Сниженный объем крови
  },
  
  stages: [
    {
      name: 'Начальная фаза',
      duration: 300,
      description: 'Начало септического шока с гипотензией',
      state: {} // Используется initialState
    },
    {
      name: 'Прогрессирование без лечения',
      duration: 600,
      description: 'Усугубление шока без адекватной терапии',
      condition: (state, interventions) => {
        // Проверяем, было ли начато лечение
        return !interventions.includes('fluid_resuscitation') && 
               !interventions.includes('norepinephrine');
      },
      state: {
        hr: 145,
        rr: 35,
        spo2: 85,
        systolic: 70,
        diastolic: 35,
        lactate: 7.0,
        cardiac_output: 5.0, // Начинает снижаться при декомпенсации
        svr: 500
      }
    },
    {
      name: 'Ответ на начальную терапию',
      duration: 600,
      description: 'Частичное улучшение в ответ на правильное лечение',
      condition: (state, interventions) => {
        return interventions.includes('fluid_resuscitation') ||
               interventions.includes('norepinephrine');
      },
      state: {
        hr: 120,
        systolic: 95,
        diastolic: 55,
        lactate: 3.5
      }
    }
  ],
  
  events: [
    {
      id: 'acute_respiratory_failure',
      probability: 60,
      minTime: 300,
      maxTime: 900,
      condition: (state) => state.spo2 < 90 && !state.intubated,
      action: (model) => {
        model.setFactor('hypoxia', Math.min(1, model.factors.hypoxia + 0.3));
        model.setFactor('respiratory_depression', Math.min(1, model.factors.respiratory_depression + 0.2));
        return 'Развитие острой дыхательной недостаточности';
      }
    },
    {
      id: 'acute_kidney_injury',
      probability: 70,
      minTime: 600,
      maxTime: 1800,
      condition: (state) => state.map < 65 && state.duration > 600,
      action: (model) => {
        model.state.creatinine = Math.min(300, model.state.creatinine * 1.5);
        model.state.urine_output = Math.max(10, model.state.urine_output * 0.5);
        return 'Развитие острого повреждения почек';
      }
    }
  ],
  
  expectedInterventions: [
    {
      id: 'fluid_resuscitation',
      description: 'Инфузионная терапия',
      condition: (state, actions) => actions.includes('fluid_resuscitation'),
      effect: (model) => {
        model.state.blood_volume = Math.min(5000, model.state.blood_volume + 500);
        model.state.systolic = Math.min(model.settings.max_systolic, model.state.systolic + 10);
        model.state.diastolic = Math.min(model.settings.max_diastolic, model.state.diastolic + 5);
        return 'Начата инфузионная терапия';
      }
    },
    {
      id: 'norepinephrine',
      description: 'Введение норэпинефрина',
      condition: (state, actions) => actions.includes('norepinephrine'),
      effect: (model) => {
        model.state.systolic = Math.min(model.settings.max_systolic, model.state.systolic + 20);
        model.state.diastolic = Math.min(model.settings.max_diastolic, model.state.diastolic + 10);
        model.state.svr = Math.min(1200, model.state.svr + 300);
        return 'Начата вазопрессорная поддержка';
      }
    },
    {
      id: 'antibiotics',
      description: 'Антибиотикотерапия',
      condition: (state, actions) => actions.includes('antibiotics'),
      effect: (model) => {
        model.setFactor('infection', Math.max(0, model.factors.infection - 0.2));
        // Эффект проявится с задержкой
        setTimeout(() => {
          model.state.temperature = Math.max(
            model.settings.min_temp, 
            model.state.temperature - 0.5
          );
          model.state.wbc = Math.max(5, model.state.wbc - 3);
        }, 1800000); // 30 минут
        return 'Начата антибиотикотерапия';
      }
    },
    {
      id: 'intubation',
      description: 'Интубация и механическая вентиляция',
      condition: (state, actions) => actions.includes('intubate'),
      effect: (model) => {
        model.intubate(true);
        return 'Выполнена интубация';
      }
    }
  ]
};

// Добавление сценария в библиотеку
clinicalScenarios.push(septicShockScenario);
```

## Разработка собственных визуализаций

Симулятор позволяет создавать собственные визуализации для отображения данных.

### Создание компонента визуализации графиков

```jsx
// CustomWaveformGenerator.js
// Генератор сигналов для кастомных графиков

export class CustomWaveformGenerator {
  constructor(params = {}) {
    this.params = {
      amplitude: 1.0,
      frequency: 1.0,
      noiseLevel: 0.05,
      baseline: 0,
      ...params
    };
  }
  
  // Генерация значения в момент времени t
  getValue(t) {
    const value = this.generateWaveform(t);
    const noise = this.generateNoise();
    return this.params.baseline + this.params.amplitude * value + noise;
  }
  
  // Генерация базовой формы сигнала
  generateWaveform(t) {
    // Переопределяется в подклассах
    return Math.sin(2 * Math.PI * this.params.frequency * t);
  }
  
  // Генерация случайного шума
  generateNoise() {
    return (Math.random() * 2 - 1) * this.params.noiseLevel;
  }
  
  // Генерация массива точек для графика
  generateDataPoints(duration, sampleRate) {
    const points = [];
    const timeStep = 1 / sampleRate;
    
    for (let i = 0; i < duration * sampleRate; i++) {
      const t = i * timeStep;
      points.push({ t, value: this.getValue(t) });
    }
    
    return points;
  }
  
  // Обновление параметров
  updateParams(newParams) {
    this.params = { ...this.params, ...newParams };
  }
}

// Пример кастомного генератора для нерегулярного сигнала
export class IrregularWaveformGenerator extends CustomWaveformGenerator {
  constructor(params = {}) {
    super(params);
    
    // Дополнительные параметры для нерегулярности
    this.irregularity = params.irregularity || 0.2;
    this.irregularPhase = 0;
  }
  
  generateWaveform(t) {
    // Добавляем нерегулярность к фазе
    if (Math.random() < this.irregularity) {
      this.irregularPhase = Math.random() * 2 * Math.PI;
    }
    
    // Комбинируем несколько синусоид с разной частотой и фазой
    const base = Math.sin(2 * Math.PI * this.params.frequency * t + this.irregularPhase);
    const harmonic = 0.3 * Math.sin(2 * Math.PI * this.params.frequency * 2 * t);
    const subharmonic = 0.2 * Math.sin(2 * Math.PI * this.params.frequency * 0.5 * t);
    
    return base + harmonic + subharmonic;
  }
}
```

```jsx
// CustomWaveformDisplay.jsx
// Компонент для отображения кастомных графиков

import React, { useRef, useEffect, useState } from 'react';
import { CustomWaveformGenerator, IrregularWaveformGenerator } from './CustomWaveformGenerator';

function CustomWaveformDisplay({ 
  title, 
  color = '#00ff00', 
  isOperating = true, 
  generatorType = 'standard',
  generatorParams = {},
  width = 600,
  height = 150
}) {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [time, setTime] = useState(0);
  
  // Выбор генератора в зависимости от типа
  const getGenerator = () => {
    switch (generatorType) {
      case 'irregular':
        return new IrregularWaveformGenerator(generatorParams);
      case 'standard':
      default:
        return new CustomWaveformGenerator(generatorParams);
    }
  };
  
  const generator = useRef(getGenerator());
  
  // Обновление параметров генератора при их изменении
  useEffect(() => {
    generator.current.updateParams(generatorParams);
  }, [generatorParams]);
  
  // Эффект для анимации графика
  useEffect(() => {
    if (!canvasRef.current || !isOperating) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Параметры отображения
    const secondsToShow = 6; // Показываем 6 секунд графика
    const sampleRate = 50;   // 50 точек на секунду
    const timeStep = 1 / sampleRate;
    
    // Функция анимации
    const animate = () => {
      // Очистка холста
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Отрисовка сетки и временных меток
      drawGrid(ctx, width, height, secondsToShow);
      
      // Если не в режиме работы, не рисуем график
      if (!isOperating) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Отрисовка графика
      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const pointsToShow = sampleRate * secondsToShow;
      const timeWindow = secondsToShow;
      
      for (let i = 0; i < pointsToShow; i++) {
        const t = time - timeWindow + (i / sampleRate);
        const value = generator.current.getValue(t);
        
        // Преобразуем в координаты холста
        const x = (i / pointsToShow) * width;
        const y = height / 2 - (value * height / 2) * 0.8; // 80% высоты для амплитуды
        
        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }
      
      ctx.stroke();
      
      // Увеличиваем время
      setTime(prevTime => prevTime + timeStep);
      
      // Продолжаем анимацию
      animationRef.current = requestAnimationFrame(animate);
    };
    
    // Запускаем анимацию
    animate();
    
    // Останавливаем анимацию при размонтировании
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [canvasRef, time, isOperating, color, width, height]);
  
  // Функция для отрисовки сетки и временных меток
  const drawGrid = (ctx, width, height, secondsToShow) => {
    ctx.strokeStyle = '#333333';
    ctx.globalAlpha = 0.5;
    ctx.lineWidth = 1;
    
    // Вертикальные линии времени
    for (let i = 1; i < secondsToShow; i++) {
      const x = i * (width / secondsToShow);
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
      
      // Временные метки
      ctx.fillStyle = '#ffffff';
      ctx.font = '10px Arial';
      ctx.fillText(`${i}s`, x - 8, 12);
    }
    
    // Горизонтальные линии сетки
    const hSteps = 4;
    for (let i = 1; i < hSteps; i++) {
      const y = i * (height / hSteps);
      ctx.beginPath();
      ctx.setLineDash([5, 5]);
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
    
    // Сброс прозрачности и пунктира
    ctx.globalAlpha = 1.0;
    ctx.setLineDash([]);
  };
  
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between">
        <div className="text-sm text-blue-400">{title}</div>
        {!isOperating && <div className="text-sm text-gray-500">DIAGNOSTIC</div>}
      </div>
      <div className="flex-1 mt-1">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          width={width}
          height={height}
        />
      </div>
    </div>
  );
}

export default CustomWaveformDisplay;
```

### Пример использования кастомной визуализации

```jsx
// Пример использования кастомной визуализации
import CustomWaveformDisplay from './CustomWaveformDisplay';

function AdvancedMonitor({ patientState, isOperating }) {
  // Параметры для графика ЭКГ с фибрилляцией предсердий
  const atrialFibParams = {
    amplitude: 0.8,
    frequency: 1.2,
    noiseLevel: 0.1,
    irregularity: 0.6
  };
  
  return (
    <div className="grid grid-rows-2 gap-4">
      <CustomWaveformDisplay 
        title="Фибрилляция предсердий" 
        color="#ff5500"
        isOperating={isOperating}
        generatorType="irregular"
        generatorParams={atrialFibParams}
      />
      
      <div className="p-4 bg-gray-900 border border-gray-700 rounded">
        <h3 className="text-lg text-white font-medium mb-3">Анализ аритмии</h3>
        <div className="mb-2">
          <div className="text-sm text-gray-400">Тип аритмии:</div>
          <div className="text-white font-medium">Фибрилляция предсердий</div>
        </div>
        <div className="mb-2">
          <div className="text-sm text-gray-400">Частота желудочковых сокращений:</div>
          <div className="text-white font-medium">{patientState.hr || '--'} уд/мин</div>
        </div>
        <div className="mb-2">
          <div className="text-sm text-gray-400">Регулярность:</div>
          <div className="text-white font-medium">Нерегулярная</div>
        </div>
        <div>
          <div className="text-sm text-gray-400">Особенности:</div>
          <div className="text-white font-medium">Отсутствие P-волн, нерегулярный R-R интервал</div>
        </div>
      </div>
    </div>
  );
}
```

## Тестирование и отладка

Для тестирования и отладки симулятора рекомендуются следующие подходы:

### Модульное тестирование

```javascript
// Пример тестов для модели физиологии (с использованием Jest)
import PhysiologicalModel from '../core/PhysiologicalModel';

describe('PhysiologicalModel', () => {
  let model;
  
  beforeEach(() => {
    model = new PhysiologicalModel();
  });
  
  test('should initialize with default values', () => {
    const state = model.getState();
    expect(state.hr).toBe(72);
    expect(state.rr).toBe(14);
    expect(state.spo2).toBe(98);
    // Другие проверки
  });
  
  test('should update heart rate correctly', () => {
    model.setState({ hr: 100 });
    expect(model.getState().hr).toBe(100);
  });
  
  test('should apply hypoxia scenario correctly', () => {
    model.applyScenario('hypoxia');
    const state = model.getState();
    expect(state.spo2).toBeLessThan(95);
    expect(state.rr).toBeGreaterThan(14);
  });
  
  test('should respect min/max constraints', () => {
    model.setState({ hr: 300 }); // Слишком высокое значение
    expect(model.getState().hr).toBe(model.settings.max_hr);
    
    model.setState({ hr: 10 }); // Слишком низкое значение
    expect(model.getState().hr).toBe(model.settings.min_hr);
  });
  
  test('should correctly apply medication effects', () => {
    const initialHR = model.getState().hr;
    model.applyMedication('epinephrine');
    expect(model.getState().hr).toBeGreaterThan(initialHR);
  });
});
```

### Отладочные инструменты

```jsx
// DebugTools.jsx
// Компонент для отладки симулятора

import React, { useState, useEffect } from 'react';

function DebugTools({ model, isOperating }) {
  const [debugState, setDebugState] = useState({});
  const [logEntries, setLogEntries] = useState([]);
  
  // Обновление состояния отладки
  useEffect(() => {
    if (!model || !isOperating) return;
    
    const interval = setInterval(() => {
      const state = model.getState();
      setDebugState(state);
      
      // Добавляем запись в лог при значительных изменениях
      const previousEntry = logEntries[0];
      if (previousEntry) {
        if (Math.abs(previousEntry.hr - state.hr) > 5 ||
            Math.abs(previousEntry.spo2 - state.spo2) > 3) {
          addLogEntry(`Значительное изменение: HR ${previousEntry.hr} -> ${state.hr}, SpO2 ${previousEntry.spo2} -> ${state.spo2}`);
        }
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [model, isOperating]);
  
  // Добавление записи в лог
  const addLogEntry = (message) => {
    const newEntry = {
      timestamp: new Date().toISOString(),
      message,
      ...debugState
    };
    
    setLogEntries(prev => [newEntry, ...prev].slice(0, 100)); // Ограничиваем 100 записями
  };
  
  // Сохранение состояния в файл
  const saveStateToFile = () => {
    const state = model ? model.getState() : {};
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `simulator_state_${new Date().toISOString()}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
  };
  
  // Загрузка состояния из файла
  const loadStateFromFile = (event) => {
    const file = event.target.files[0];
    if (!file || !model) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target.result);
        model.setState(state);
        addLogEntry('Состояние загружено из файла');
      } catch (error) {
        console.error('Error parsing state file:', error);
        addLogEntry(`Ошибка загрузки состояния: ${error.message}`);
      }
    };
    reader.readAsText(file);
  };
  
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <h2 className="text-xl text-white font-bold mb-4">Инструменты отладки</h2>
      
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <h3 className="text-lg text-white font-medium mb-3">Состояние модели</h3>
          <div className="bg-gray-800 p-3 rounded-lg h-60 overflow-auto">
            <pre className="text-xs text-gray-300 whitespace-pre-wrap">
              {JSON.stringify(debugState, null, 2)}
            </pre>
          </div>
        </div>
        
        <div>
          <h3 className="text-lg text-white font-medium mb-3">Лог событий</h3>
          <div className="bg-gray-800 p-3 rounded-lg h-60 overflow-auto">
            {logEntries.map((entry, index) => (
              <div key={index} className="mb-2 pb-2 border-b border-gray-700">
                <div className="text-xs text-gray-400">{entry.timestamp}</div>
                <div className="text-sm text-white">{entry.message}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          onClick={saveStateToFile}
        >
          Сохранить состояние
        </button>
        
        <label className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 cursor-pointer">
          Загрузить состояние
          <input
            type="file"
            accept=".json"
            className="hidden"
            onChange={loadStateFromFile}
          />
        </label>
        
        <button
          className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
          onClick={() => model && model.applyScenario('normalize')}
        >
          Сбросить состояние
        </button>
      </div>
    </div>
  );
}

export default DebugTools;
```

### Отладка в браузере

Для отладки в браузере можно использовать:

1. **React DevTools**: Для инспекции компонентов и их состояний
2. **Console.log**: Для вывода отладочной информации
3. **Performance Profiler**: Для анализа производительности

```javascript
// Пример добавления отладочных выводов в модель физиологии
class DebuggablePhysiologicalModel extends PhysiologicalModel {
  constructor(initialState) {
    super(initialState);
    this.debug = true;
  }
  
  log(message, data) {
    if (this.debug) {
      console.log(`%c[PhysiologicalModel] ${message}`, 'color: #00aaff', data);
    }
  }
  
  updatePhysiology() {
    this.log('Updating physiology', { ...this.state });
    const result = super.updatePhysiology();
    this.log('Updated physiology', { ...this.state });
    return result;
  }
  
  applyScenario(scenario, params) {
    this.log(`Applying scenario: ${scenario}`, params);
    return super.applyScenario(scenario, params);
  }
  
  applyMedication(medication, dose) {
    this.log(`Applying medication: ${medication}`, { dose });
    return super.applyMedication(medication, dose);
  }
}
```

## Лучшие практики

### Оптимизация производительности

1. **Используйте React.memo() для компонентов**, которые не нуждаются в частом обновлении:

```jsx
const VitalSign = React.memo(({ label, value, unit, color }) => {
  return (
    <div className="vital-sign">
      <div className="label">{label}</div>
      <div className="value" style={{ color }}>{value}</div>
      <div className="unit">{unit}</div>
    </div>
  );
});
```

2. **Оптимизируйте рендеринг графиков**:

```jsx
// Используйте requestAnimationFrame для плавной анимации
// Рассмотрите возможность снижения частоты обновления при неактивном окне
useEffect(() => {
  let rafId;
  let lastTime = 0;
  
  const animate = (time) => {
    // Ограничиваем FPS до ~30
    if (time - lastTime > 33) {
      lastTime = time;
      updateWaveform();
    }
    
    rafId = requestAnimationFrame(animate);
  };
  
  if (isActive) {
    rafId = requestAnimationFrame(animate);
  }
  
  return () => {
    cancelAnimationFrame(rafId);
  };
}, [isActive]);
```

3. **Используйте Web Workers для тяжелых вычислений**:

```javascript
// worker.js
self.onmessage = function(e) {
  const { action, data } = e.data;
  
  if (action === 'calculate') {
    // Выполняем сложные расчеты
    const result = performHeavyCalculation(data);
    self.postMessage({ action: 'result', result });
  }
};

function performHeavyCalculation(data) {
  // Тяжелые вычисления
  return result;
}

// Использование в компоненте
useEffect(() => {
  const worker = new Worker('worker.js');
  
  worker.onmessage = (e) => {
    const { action, result } = e.data;
    if (action === 'result') {
      setCalculationResult(result);
    }
  };
  
  worker.postMessage({ 
    action: 'calculate', 
    data: { /* данные для расчетов */ } 
  });
  
  return () => worker.terminate();
}, [dependencies]);
```

### Поддержка мобильных устройств

1. **Используйте отзывчивый дизайн**:

```jsx
function ResponsiveMonitor() {
  // Хук для определения размера экрана
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Адаптивные настройки в зависимости от размера экрана
  const isMobile = windowWidth < 768;
  
  return (
    <div className={`monitor-container ${isMobile ? 'mobile' : 'desktop'}`}>
      {isMobile ? (
        // Мобильная версия с упрощенным интерфейсом
        <MobileMonitorView />
      ) : (
        // Полная версия для десктопов
        <DesktopMonitorView />
      )}
    </div>
  );
}
```

2. **Оптимизируйте производительность для мобильных устройств**:

```jsx
// Упрощенная версия графиков для мобильных устройств
function OptimizedMobileWaveform({ data, color }) {
  // Уменьшаем разрешение и частоту обновления для мобильных устройств
  const sampleRate = 25; // Вместо 50 на десктопе
  const pointsToShow = 150; // Вместо 300 на десктопе
  
  // ...остальной код
}
```

### Рекомендации по архитектуре

1. **Разделяйте логику и отображение**:

```jsx
// Компонент высшего порядка для разделения логики и отображения
function withPhysiologyData(WrappedComponent) {
  return function WithPhysiologyData(props) {
    // Логика получения и обработки данных
    const [physiologyData, setPhysiologyData] = useState(null);
    
    useEffect(() => {
      // Логика загрузки и обновления данных
      const updateData = () => {
        const newData = props.model.getState();
        setPhysiologyData(newData);
      };
      
      const interval = setInterval(updateData, 1000);
      return () => clearInterval(interval);
    }, [props.model]);
    
    // Передаем обработанные данные в компонент отображения
    return <WrappedComponent {...props} data={physiologyData} />;
  };
}

// Компонент отображения, не зависящий от логики
function PhysiologyDisplay({ data }) {
  if (!data) return <div>Loading...</div>;
  
  return (
    <div className="display">
      {/* Отображение данных */}
    </div>
  );
}

// Использование
const PhysiologyDisplayWithData = withPhysiologyData(PhysiologyDisplay);
```

2. **Используйте контекст React для глобального состояния**:

```jsx
// SimulatorContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import PhysiologicalModel from '../core/PhysiologicalModel';

const SimulatorContext = createContext();

export function SimulatorProvider({ children }) {
  const [model] = useState(() => new PhysiologicalModel());
  const [state, setState] = useState(model.getState());
  const [isOperating, setIsOperating] = useState(false);
  
  useEffect(() => {
    if (isOperating) {
      model.startSimulation();
      
      const interval = setInterval(() => {
        setState(model.getState());
      }, 1000);
      
      return () => {
        clearInterval(interval);
        model.stopSimulation();
      };
    }
  }, [isOperating, model]);
  
  const value = {
    model,
    state,
    isOperating,
    startSimulation: () => setIsOperating(true),
    stopSimulation: () => setIsOperating(false),
    applyScenario: (scenario, params) => {
      model.applyScenario(scenario, params);
      setState(model.getState());
    },
    applyMedication: (medication, dose) => {
      model.applyMedication(medication, dose);
      setState(model.getState());
    }
  };
  
  return (
    <SimulatorContext.Provider value={value}>
      {children}
    </SimulatorContext.Provider>
  );
}

export function useSimulator() {
  return useContext(SimulatorContext);
}

// Использование в компонентах
function MonitorComponent() {
  const { state, isOperating } = useSimulator();
  
  return (
    <div>
      {/* Отображение данных из контекста */}
    </div>
  );
}
```

---

© 2025 Patient Simulator Development Team. Все права защищены.
