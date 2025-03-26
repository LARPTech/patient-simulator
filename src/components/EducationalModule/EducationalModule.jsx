import React, { useState, useEffect } from 'react';

// Компонент для отображения шага обучающего сценария
const ScenarioStep = ({ step, onComplete, onAction }) => {
  const [expandedInfo, setExpandedInfo] = useState(false);
  const [userActions, setUserActions] = useState([]);
  const [stepCompleted, setStepCompleted] = useState(false);
  
  // Проверка выполнения шага при совершении действий
  useEffect(() => {
    if (!step.requiredActions || stepCompleted) return;
    
    // Проверяем, выполнены ли все требуемые действия
    const allActionsCompleted = step.requiredActions.every(
      requiredAction => userActions.includes(requiredAction)
    );
    
    if (allActionsCompleted) {
      setStepCompleted(true);
      // Небольшая задержка перед переходом к следующему шагу
      setTimeout(() => onComplete(), 1500);
    }
  }, [userActions, step.requiredActions, stepCompleted, onComplete]);
  
  // Обработка действия пользователя
  const handleAction = (action) => {
    if (stepCompleted) return;
    
    setUserActions(prev => [...prev, action]);
    
    // Оповещаем родительский компонент о действии
    if (onAction) {
      onAction(action);
    }
  };
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-4">
      <div className="flex justify-between items-start mb-2">
        <h3 className="text-xl text-white font-bold">{step.title}</h3>
        <div className={`px-3 py-1 rounded-full text-sm ${
          stepCompleted ? 'bg-green-900 text-green-400' : 'bg-blue-900 text-blue-400'
        }`}>
          {stepCompleted ? 'Выполнено' : 'В процессе'}
        </div>
      </div>
      
      <p className="text-gray-300 mb-4">{step.description}</p>
      
      {/* Дополнительная обучающая информация */}
      <div className="mb-4">
        <button
          className="text-blue-400 flex items-center"
          onClick={() => setExpandedInfo(!expandedInfo)}
        >
          <span className="mr-2">{expandedInfo ? '▼' : '▶'}</span>
          <span>Дополнительная информация</span>
        </button>
        
        {expandedInfo && (
          <div className="mt-2 p-3 bg-gray-700 rounded text-gray-300 text-sm">
            {step.educationalContent}
          </div>
        )}
      </div>
      
      {/* Необходимые действия */}
      {step.requiredActions && (
        <div className="mb-4">
          <h4 className="text-white font-medium mb-2">Необходимые действия:</h4>
          <ul className="list-disc list-inside text-gray-300">
            {step.requiredActions.map((action, index) => (
              <li key={index} className={userActions.includes(action) ? 'text-green-400' : ''}>
                {step.actionDescriptions[action]}
                {userActions.includes(action) && ' ✓'}
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {/* Кнопки действий */}
      {step.availableActions && (
        <div className="mt-4">
          <h4 className="text-white font-medium mb-2">Доступные действия:</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {step.availableActions.map((action, index) => (
              <button
                key={index}
                className={`px-3 py-2 rounded ${
                  userActions.includes(action) 
                    ? 'bg-green-700 text-white' 
                    : 'bg-blue-700 text-white hover:bg-blue-600'
                }`}
                onClick={() => handleAction(action)}
                disabled={userActions.includes(action)}
              >
                {step.actionLabels[action]}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Если шаг не требует действий, показываем кнопку "Далее" */}
      {!step.requiredActions && (
        <div className="mt-4 flex justify-end">
          <button
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
            onClick={onComplete}
          >
            Далее
          </button>
        </div>
      )}
    </div>
  );
};

// Компонент прогресса сценария
const ScenarioProgress = ({ currentStep, totalSteps, score }) => {
  const progress = Math.round((currentStep / totalSteps) * 100);
  
  return (
    <div className="mb-6">
      <div className="flex justify-between mb-1">
        <span className="text-gray-300">Прогресс сценария</span>
        <span className="text-gray-300">{currentStep} из {totalSteps}</span>
      </div>
      <div className="w-full bg-gray-700 rounded-full h-2.5">
        <div 
          className="bg-blue-600 h-2.5 rounded-full" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      {score !== undefined && (
        <div className="mt-2 text-right">
          <span className="bg-blue-900 text-blue-300 px-2 py-1 rounded text-sm">
            Текущая оценка: {score}%
          </span>
        </div>
      )}
    </div>
  );
};

// Компонент для отображения оценки действий
const ActionFeedback = ({ action, isCorrect, feedback }) => {
  return (
    <div className={`p-3 rounded mb-2 ${
      isCorrect ? 'bg-green-900/30 border border-green-800' : 'bg-red-900/30 border border-red-800'
    }`}>
      <div className="flex items-start">
        <span className={`text-xl mr-2 ${isCorrect ? 'text-green-500' : 'text-red-500'}`}>
          {isCorrect ? '✓' : '✗'}
        </span>
        <div>
          <div className="font-medium text-white">{action}</div>
          <div className="text-sm text-gray-300">{feedback}</div>
        </div>
      </div>
    </div>
  );
};

// Компонент итогового результата сценария
const ScenarioSummary = ({ scenarioTitle, correctActions, incorrectActions, score, timeSpent, onRestart, onExit }) => {
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h2 className="text-2xl text-white font-bold mb-4">Сценарий завершен</h2>
      <h3 className="text-xl text-blue-400 mb-6">{scenarioTitle}</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gray-700 p-4 rounded-lg text-center">
          <div className="text-4xl font-bold text-blue-400 mb-2">{score}%</div>
          <div className="text-gray-300">Общая оценка</div>
        </div>
        
        <div className="bg-gray-700 p-4 rounded-lg text-center">
          <div className="text-4xl font-bold text-green-400 mb-2">{correctActions.length}</div>
          <div className="text-gray-300">Правильных действий</div>
        </div>
        
        <div className="bg-gray-700 p-4 rounded-lg text-center">
          <div className="text-4xl font-bold text-red-400 mb-2">{incorrectActions.length}</div>
          <div className="text-gray-300">Неправильных действий</div>
        </div>
      </div>
      
      <div className="mb-6">
        <h4 className="text-white font-medium mb-3">Затраченное время</h4>
        <div className="bg-gray-700 p-3 rounded-lg">
          <div className="text-xl text-gray-300">{timeSpent}</div>
        </div>
      </div>
      
      {correctActions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Правильные действия</h4>
          {correctActions.map((action, index) => (
            <ActionFeedback
              key={index}
              action={action.label}
              isCorrect={true}
              feedback={action.feedback}
            />
          ))}
        </div>
      )}
      
      {incorrectActions.length > 0 && (
        <div className="mb-6">
          <h4 className="text-white font-medium mb-3">Неправильные или пропущенные действия</h4>
          {incorrectActions.map((action, index) => (
            <ActionFeedback
              key={index}
              action={action.label}
              isCorrect={false}
              feedback={action.feedback}
            />
          ))}
        </div>
      )}
      
      <div className="flex justify-between">
        <button
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
          onClick={onRestart}
        >
          Повторить сценарий
        </button>
        
        <button
          className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500"
          onClick={onExit}
        >
          Вернуться к списку сценариев
        </button>
      </div>
    </div>
  );
};

// Основной компонент обучающего модуля
const EducationalModule = ({ patientModel, onExit }) => {
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [scenarioCompleted, setScenarioCompleted] = useState(false);
  const [userScore, setUserScore] = useState(100);
  const [scenarioStartTime, setScenarioStartTime] = useState(null);
  const [timeSpent, setTimeSpent] = useState('');
  const [userActions, setUserActions] = useState([]);
  const [incorrectActions, setIncorrectActions] = useState([]);
  
  // Библиотека обучающих сценариев
  const [scenarios, setScenarios] = useState([
    {
      id: 'respiratory_distress',
      title: 'Лечение дыхательной недостаточности',
      description: 'Обучающий сценарий по диагностике и лечению острой дыхательной недостаточности у пациента.',
      difficulty: 'medium',
      category: 'respiratory',
      thumbnail: '🫁',
      estimatedTime: '20 минут',
      steps: [
        {
          title: 'Начальная оценка пациента',
          description: 'Пациент поступил с признаками дыхательной недостаточности. Проведите первичную оценку.',
          educationalContent: 'Первичная оценка включает оценку проходимости дыхательных путей, частоты и качества дыхания, сатурации кислорода и общего состояния пациента. Признаки дыхательной недостаточности: тахипноэ, использование вспомогательной мускулатуры, цианоз, снижение SpO2.',
          requiredActions: ['assess_vitals', 'check_spo2'],
          availableActions: ['assess_vitals', 'check_spo2', 'start_cpr', 'intubate'],
          actionLabels: {
            'assess_vitals': 'Оценить показатели жизнедеятельности',
            'check_spo2': 'Измерить SpO2',
            'start_cpr': 'Начать СЛР',
            'intubate': 'Интубировать пациента'
          },
          actionDescriptions: {
            'assess_vitals': 'Оценить частоту дыхания, пульс и АД',
            'check_spo2': 'Проверить насыщение крови кислородом',
            'start_cpr': 'Начать сердечно-легочную реанимацию',
            'intubate': 'Выполнить интубацию трахеи'
          },
          correctActions: ['assess_vitals', 'check_spo2'],
          wrongActions: ['start_cpr', 'intubate'],
          patientState: {
            hr: 110,
            rr: 28,
            spo2: 88,
            systolic: 140,
            diastolic: 85,
            temperature: 37.2
          }
        },
        {
          title: 'Кислородотерапия',
          description: 'На основании первичной оценки определите, требуется ли кислородотерапия и выберите подходящий метод.',
          educationalContent: 'Целевая сатурация обычно составляет 94-98% (88-92% для пациентов с риском гиперкапнии). Существуют различные методы доставки кислорода: носовые канюли (1-4 л/мин, FiO2 24-40%), простая маска (5-10 л/мин, FiO2 40-60%), маска с резервуаром (10-15 л/мин, FiO2 60-95%).',
          requiredActions: ['oxygen_therapy'],
          availableActions: ['oxygen_therapy', 'antibiotics', 'epinephrine', 'diuretics'],
          actionLabels: {
            'oxygen_therapy': 'Начать кислородотерапию',
            'antibiotics': 'Назначить антибиотики',
            'epinephrine': 'Ввести эпинефрин',
            'diuretics': 'Назначить диуретики'
          },
          actionDescriptions: {
            'oxygen_therapy': 'Начать подачу кислорода',
            'antibiotics': 'Назначить антибактериальную терапию',
            'epinephrine': 'Ввести эпинефрин внутривенно',
            'diuretics': 'Назначить диуретик (фуросемид)'
          },
          correctActions: ['oxygen_therapy'],
          wrongActions: ['epinephrine', 'diuretics'],
          patientState: {
            hr: 110,
            rr: 28,
            spo2: 88,
            systolic: 140,
            diastolic: 85,
            temperature: 37.2
          }
        },
        {
          title: 'Дополнительная диагностика',
          description: 'Теперь, когда кислородотерапия начата, проведите дополнительную диагностику для определения причины дыхательной недостаточности.',
          educationalContent: 'Дополнительная диагностика может включать рентгенографию грудной клетки для выявления пневмонии, отека легких или пневмоторакса; анализ газов артериальной крови для оценки газообмена и кислотно-основного состояния; общий анализ крови для выявления признаков инфекции.',
          requiredActions: ['chest_xray', 'blood_gas', 'blood_tests'],
          availableActions: ['chest_xray', 'blood_gas', 'blood_tests', 'bronchoscopy', 'ct_scan'],
          actionLabels: {
            'chest_xray': 'Рентген грудной клетки',
            'blood_gas': 'Анализ газов крови',
            'blood_tests': 'Общий анализ крови',
            'bronchoscopy': 'Бронхоскопия',
            'ct_scan': 'КТ грудной клетки'
          },
          actionDescriptions: {
            'chest_xray': 'Выполнить рентгенографию грудной клетки',
            'blood_gas': 'Взять образец артериальной крови для анализа газов',
            'blood_tests': 'Назначить общий и биохимический анализ крови',
            'bronchoscopy': 'Выполнить бронхоскопию',
            'ct_scan': 'Выполнить компьютерную томографию грудной клетки'
          },
          correctActions: ['chest_xray', 'blood_gas', 'blood_tests'],
          wrongActions: ['bronchoscopy'],
          patientState: {
            hr: 105,
            rr: 24,
            spo2: 92,
            systolic: 135,
            diastolic: 80,
            temperature: 37.3
          }
        },
        {
          title: 'Интерпретация результатов',
          description: 'На основании полученных результатов выявлена двусторонняя пневмония. Анализ газов крови: pH 7.32, PaO2 65 мм рт.ст., PaCO2 48 мм рт.ст., HCO3 24 ммоль/л. Общий анализ крови: лейкоцитоз 15×10⁹/л, нейтрофилез. Какой диагноз наиболее вероятен?',
          educationalContent: 'Интерпретация газов артериальной крови позволяет выявить тип дыхательной недостаточности. Тип 1 (гипоксемическая) характеризуется снижением PaO2 при нормальном или сниженном PaCO2. Тип 2 (гиперкапническая) характеризуется повышением PaCO2, часто с сопутствующей гипоксемией.',
          availableActions: ['diagnosis_pneumonia', 'diagnosis_copd', 'diagnosis_pulmonary_edema', 'diagnosis_pulmonary_embolism'],
          actionLabels: {
            'diagnosis_pneumonia': 'Пневмония с дыхательной недостаточностью',
            'diagnosis_copd': 'Обострение ХОБЛ',
            'diagnosis_pulmonary_edema': 'Кардиогенный отек легких',
            'diagnosis_pulmonary_embolism': 'Тромбоэмболия легочной артерии'
          },
          requiredActions: ['diagnosis_pneumonia'],
          actionDescriptions: {
            'diagnosis_pneumonia': 'Поставить диагноз пневмонии с дыхательной недостаточностью',
            'diagnosis_copd': 'Поставить диагноз обострения ХОБЛ',
            'diagnosis_pulmonary_edema': 'Поставить диагноз кардиогенного отека легких',
            'diagnosis_pulmonary_embolism': 'Поставить диагноз тромбоэмболии легочной артерии'
          },
          correctActions: ['diagnosis_pneumonia'],
          wrongActions: ['diagnosis_copd', 'diagnosis_pulmonary_edema', 'diagnosis_pulmonary_embolism'],
          patientState: {
            hr: 105,
            rr: 24,
            spo2: 92,
            systolic: 135,
            diastolic: 80,
            temperature: 37.3
          }
        },
        {
          title: 'Лечение',
          description: 'На основании диагноза пневмония с дыхательной недостаточностью определите план лечения.',
          educationalContent: 'Лечение пневмонии включает антибиотикотерапию с учетом вероятных возбудителей, кислородотерапию для поддержания SpO2 94-98%, респираторную поддержку при необходимости. При тяжелой дыхательной недостаточности может потребоваться неинвазивная вентиляция легких или интубация трахеи с ИВЛ.',
          requiredActions: ['antibiotics', 'continue_oxygen', 'consider_niv'],
          availableActions: ['antibiotics', 'continue_oxygen', 'consider_niv', 'steroids', 'intubate', 'diuretics'],
          actionLabels: {
            'antibiotics': 'Назначить антибиотики',
            'continue_oxygen': 'Продолжить кислородотерапию',
            'consider_niv': 'Рассмотреть неинвазивную вентиляцию',
            'steroids': 'Назначить кортикостероиды',
            'intubate': 'Интубировать пациента',
            'diuretics': 'Назначить диуретики'
          },
          actionDescriptions: {
            'antibiotics': 'Назначить эмпирическую антибактериальную терапию',
            'continue_oxygen': 'Поддерживать адекватную оксигенацию',
            'consider_niv': 'Оценить необходимость неинвазивной вентиляции',
            'steroids': 'Назначить системные кортикостероиды',
            'intubate': 'Выполнить интубацию трахеи и перевести на ИВЛ',
            'diuretics': 'Назначить фуросемид внутривенно'
          },
          correctActions: ['antibiotics', 'continue_oxygen', 'consider_niv'],
          wrongActions: ['steroids', 'intubate', 'diuretics'],
          patientState: {
            hr: 100,
            rr: 22,
            spo2: 93,
            systolic: 130,
            diastolic: 75,
            temperature: 37.5
          }
        },
        {
          title: 'Мониторинг и оценка эффективности',
          description: 'После начала лечения необходимо контролировать состояние пациента. Какие параметры следует мониторировать и как часто?',
          educationalContent: 'Мониторинг пациента с дыхательной недостаточностью включает оценку частоты дыхания, SpO2, использования вспомогательной дыхательной мускулатуры, уровня сознания, показателей гемодинамики. У пациентов с тяжелой дыхательной недостаточностью мониторинг должен быть непрерывным.',
          requiredActions: ['monitor_vitals', 'followup_blood_gas'],
          availableActions: ['monitor_vitals', 'followup_blood_gas', 'followup_xray', 'consult_pulmonologist'],
          actionLabels: {
            'monitor_vitals': 'Мониторинг показателей жизнедеятельности',
            'followup_blood_gas': 'Контрольный анализ газов крови',
            'followup_xray': 'Повторный рентген',
            'consult_pulmonologist': 'Консультация пульмонолога'
          },
          actionDescriptions: {
            'monitor_vitals': 'Контролировать ЧСС, АД, ЧД, SpO2, температуру',
            'followup_blood_gas': 'Повторить анализ газов артериальной крови через 2 часа',
            'followup_xray': 'Назначить повторную рентгенографию грудной клетки',
            'consult_pulmonologist': 'Запросить консультацию пульмонолога'
          },
          correctActions: ['monitor_vitals', 'followup_blood_gas'],
          wrongActions: ['followup_xray'],
          patientState: {
            hr: 95,
            rr: 20,
            spo2: 94,
            systolic: 125,
            diastolic: 75,
            temperature: 37.2
          }
        }
      ],
      feedback: {
        'assess_vitals': {
          correct: 'Правильно. Оценка показателей жизнедеятельности - важный первый шаг для определения степени дыхательной недостаточности.',
          incorrect: 'Вы не оценили показатели жизнедеятельности, что необходимо для первичной оценки степени дыхательной недостаточности.'
        },
        'check_spo2': {
          correct: 'Правильно. Измерение SpO2 позволяет оценить степень гипоксемии.',
          incorrect: 'Вы не измерили SpO2, что необходимо для оценки степени гипоксемии.'
        },
        'oxygen_therapy': {
          correct: 'Правильно. При SpO2 <90% показана кислородотерапия.',
          incorrect: 'Вы не начали кислородотерапию, хотя SpO2 <90%, что требует немедленной коррекции гипоксемии.'
        },
        'chest_xray': {
          correct: 'Правильно. Рентгенография грудной клетки необходима для выявления причины дыхательной недостаточности.',
          incorrect: 'Вы не назначили рентгенографию грудной клетки, что необходимо для выявления причины дыхательной недостаточности.'
        },
        'blood_gas': {
          correct: 'Правильно. Анализ газов крови позволяет оценить тип дыхательной недостаточности и кислотно-основное состояние.',
          incorrect: 'Вы не выполнили анализ газов артериальной крови, что необходимо для определения типа дыхательной недостаточности.'
        },
        'blood_tests': {
          correct: 'Правильно. Общий анализ крови позволяет выявить признаки инфекции.',
          incorrect: 'Вы не назначили общий анализ крови, что необходимо для выявления признаков инфекции.'
        },
        'diagnosis_pneumonia': {
          correct: 'Правильно. На основании клинической картины, рентгенологических данных и лабораторных показателей диагноз пневмонии с дыхательной недостаточностью наиболее вероятен.',
          incorrect: 'Вы не поставили диагноз пневмонии, хотя имеются характерные клинические, рентгенологические и лабораторные признаки.'
        },
        'antibiotics': {
          correct: 'Правильно. Антибиотикотерапия - обязательный компонент лечения пневмонии.',
          incorrect: 'Вы не назначили антибиотики, что является обязательным компонентом лечения пневмонии.'
        },
        'continue_oxygen': {
          correct: 'Правильно. Необходимо продолжать кислородотерапию для поддержания SpO2 в целевом диапазоне.',
          incorrect: 'Вы не продолжили кислородотерапию, хотя пациент все еще нуждается в дополнительном кислороде.'
        },
        'consider_niv': {
          correct: 'Правильно. При сохраняющейся дыхательной недостаточности следует рассмотреть возможность неинвазивной вентиляции.',
          incorrect: 'Вы не рассмотрели возможность неинвазивной вентиляции, что может быть необходимо при сохраняющейся дыхательной недостаточности.'
        },
        'monitor_vitals': {
          correct: 'Правильно. Регулярный мониторинг показателей жизнедеятельности необходим для оценки эффективности лечения.',
          incorrect: 'Вы не обеспечили надлежащий мониторинг показателей жизнедеятельности, что необходимо для оценки эффективности лечения.'
        },
        'followup_blood_gas': {
          correct: 'Правильно. Контрольный анализ газов крови позволяет оценить динамику дыхательной недостаточности.',
          incorrect: 'Вы не назначили контрольный анализ газов крови, что необходимо для оценки динамики дыхательной недостаточности.'
        },
        // Неправильные действия
        'start_cpr': {
          wrong: 'Неправильно. СЛР показана только при остановке кровообращения. У пациента есть пульс и дыхание, хотя и нарушенное.'
        },
        'intubate': {
          wrong: 'Неправильно на данном этапе. Интубация - инвазивное вмешательство, которое следует рассматривать только после неэффективности неинвазивных методов респираторной поддержки.'
        },
        'epinephrine': {
          wrong: 'Неправильно. Эпинефрин не показан при данном состоянии. Он используется при анафилаксии или остановке кровообращения.'
        },
        'diuretics': {
          wrong: 'Неправильно. Диуретики показаны при отеке легких кардиогенного генеза, но не при пневмонии.'
        },
        'bronchoscopy': {
          wrong: 'Неправильно на данном этапе. Бронхоскопия - инвазивная процедура, которая не является рутинным методом диагностики при подозрении на пневмонию.'
        },
        'diagnosis_copd': {
          wrong: 'Неправильно. Хотя у пациента есть признаки респираторного ацидоза, рентгенологическая картина и лабораторные данные больше соответствуют пневмонии.'
        },
        'diagnosis_pulmonary_edema': {
          wrong: 'Неправильно. Отсутствуют характерные признаки кардиогенного отека легких: нет указаний на сердечную недостаточность, нет соответствующей рентгенологической картины.'
        },
        'diagnosis_pulmonary_embolism': {
          wrong: 'Неправильно. Отсутствуют типичные признаки ТЭЛА: нет указаний на факторы риска, нет характерных клинических и лабораторных признаков.'
        },
        'steroids': {
          wrong: 'Неправильно. Рутинное применение системных кортикостероидов при пневмонии не рекомендуется, за исключением особых ситуаций.'
        },
        'followup_xray': {
          wrong: 'Преждевременно. Повторная рентгенография обычно не требуется в первые 24-48 часов, если нет клинического ухудшения.'
        }
      }
    },
    // Другие сценарии...
    {
      id: 'cardiac_arrest',
      title: 'Сердечно-легочная реанимация',
      description: 'Обучающий сценарий по проведению сердечно-легочной реанимации у взрослого пациента с внезапной остановкой кровообращения.',
      difficulty: 'hard',
      category: 'emergency',
      thumbnail: '❤️',
      estimatedTime: '15 минут',
      steps: [] // Здесь будут шаги сценария
    },
    {
      id: 'anaphylaxis',
      title: 'Лечение анафилактического шока',
      description: 'Обучающий сценарий по диагностике и неотложной терапии анафилактического шока.',
      difficulty: 'medium',
      category: 'emergency',
      thumbnail: '💉',
      estimatedTime: '15 минут',
      steps: [] // Здесь будут шаги сценария
    }
  ]);
  
  // Выбор сценария
  const handleSelectScenario = (scenarioId) => {
    const scenario = scenarios.find(s => s.id === scenarioId);
    if (scenario) {
      setSelectedScenario(scenario);
      setCurrentStepIndex(0);
      setScenarioCompleted(false);
      setUserScore(100);
      setScenarioStartTime(new Date());
      setUserActions([]);
      setIncorrectActions([]);
      
      // Установка начального состояния пациента
      if (patientModel && scenario.steps.length > 0) {
        const initialState = scenario.steps[0].patientState;
        if (initialState) {
          patientModel.setState(initialState);
        }
      }
    }
  };
  
  // Обработка завершения шага
  const handleStepComplete = () => {
    const nextStepIndex = currentStepIndex + 1;
    
    // Если это был последний шаг, завершаем сценарий
    if (nextStepIndex >= selectedScenario.steps.length) {
      const endTime = new Date();
      const timeElapsed = endTime - scenarioStartTime;
      const minutes = Math.floor(timeElapsed / 60000);
      const seconds = Math.floor((timeElapsed % 60000) / 1000);
      setTimeSpent(`${minutes} мин ${seconds} сек`);
      setScenarioCompleted(true);
    } else {
      // Переходим к следующему шагу
      setCurrentStepIndex(nextStepIndex);
      
      // Обновляем состояние пациента для нового шага
      if (patientModel && selectedScenario.steps[nextStepIndex].patientState) {
        patientModel.setState(selectedScenario.steps[nextStepIndex].patientState);
      }
    }
  };
  
  // Обработка действия пользователя
  const handleUserAction = (action) => {
    // Добавляем действие в список действий пользователя
    setUserActions(prev => [...prev, action]);
    
    const currentStep = selectedScenario.steps[currentStepIndex];
    
    // Проверяем, является ли действие правильным или неправильным
    if (currentStep.wrongActions && currentStep.wrongActions.includes(action)) {
      // Неправильное действие
      const incorrectAction = {
        action,
        label: currentStep.actionLabels[action],
        feedback: selectedScenario.feedback[action]?.wrong || 'Неправильное действие'
      };
      
      setIncorrectActions(prev => [...prev, incorrectAction]);
      
      // Снижаем оценку за неправильное действие
      const penaltyPoints = 10; // Штраф 10% за каждое неправильное действие
      setUserScore(prev => Math.max(0, prev - penaltyPoints));
    }
    
    // Если действие имеет эффект на состояние пациента, применяем его
    if (patientModel && action === 'oxygen_therapy') {
      const currentState = patientModel.getState();
      patientModel.setState({
        ...currentState,
        spo2: Math.min(98, currentState.spo2 + 4)
      });
    }
  };
  
  // Вывод подходящего компонента в зависимости от состояния
  if (!selectedScenario) {
    // Список доступных сценариев
    return (
      <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl text-white font-bold">Обучающие сценарии</h2>
          <button
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            onClick={onExit}
          >
            Назад
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {scenarios.map(scenario => (
            <div
              key={scenario.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4 cursor-pointer hover:bg-gray-750"
              onClick={() => handleSelectScenario(scenario.id)}
            >
              <div className="flex items-center mb-2">
                <span className="text-4xl mr-3">{scenario.thumbnail}</span>
                <div>
                  <h3 className="text-lg text-white font-medium">{scenario.title}</h3>
                  <div className={`text-xs px-2 py-0.5 rounded-full inline-block ${
                    scenario.difficulty === 'easy' ? 'bg-green-900 text-green-400' :
                    scenario.difficulty === 'medium' ? 'bg-yellow-900 text-yellow-400' :
                    'bg-red-900 text-red-400'
                  }`}>
                    {scenario.difficulty === 'easy' ? 'Легкий' :
                     scenario.difficulty === 'medium' ? 'Средний' :
                     'Сложный'}
                  </div>
                </div>
              </div>
              
              <p className="text-gray-300 text-sm mb-3">{scenario.description}</p>
              
              <div className="flex justify-between text-sm text-gray-400">
                <span>
                  {scenario.category === 'respiratory' ? 'Респираторный' :
                   scenario.category === 'emergency' ? 'Экстренный' :
                   scenario.category}
                </span>
                <span>{scenario.estimatedTime}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }
  
  // Если сценарий завершен, показываем итоги
  if (scenarioCompleted) {
    // Собираем информацию о правильных действиях
    const correctActions = selectedScenario.steps.flatMap(step => {
      return (step.correctActions || []).map(action => ({
        action,
        label: step.actionLabels[action],
        feedback: selectedScenario.feedback[action]?.correct || 'Правильное действие'
      })).filter(item => userActions.includes(item.action));
    });
    
    // Собираем информацию о пропущенных действиях
    const missedActions = selectedScenario.steps.flatMap(step => {
      return (step.correctActions || []).map(action => ({
        action,
        label: step.actionLabels[action],
        feedback: selectedScenario.feedback[action]?.incorrect || 'Пропущенное действие'
      })).filter(item => !userActions.includes(item.action));
    });
    
    // Объединяем неправильные и пропущенные действия
    const allIncorrectActions = [...incorrectActions, ...missedActions];
    
    return (
      <ScenarioSummary
        scenarioTitle={selectedScenario.title}
        correctActions={correctActions}
        incorrectActions={allIncorrectActions}
        score={userScore}
        timeSpent={timeSpent}
        onRestart={() => handleSelectScenario(selectedScenario.id)}
        onExit={() => setSelectedScenario(null)}
      />
    );
  }
  
  // Отображаем текущий шаг сценария
  const currentStep = selectedScenario.steps[currentStepIndex];
  
  return (
    <div className="p-6 bg-gray-900 border border-gray-700 rounded-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl text-white font-bold">{selectedScenario.title}</h2>
        <button
          className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
          onClick={() => setSelectedScenario(null)}
        >
          Выход из сценария
        </button>
      </div>
      
      <ScenarioProgress 
        currentStep={currentStepIndex + 1} 
        totalSteps={selectedScenario.steps.length}
        score={userScore}
      />
      
      <ScenarioStep
        step={currentStep}
        onComplete={handleStepComplete}
        onAction={handleUserAction}
      />
    </div>
  );
};

export default EducationalModule;