import React, { useState, useEffect, useRef } from 'react';

// Импортируем компоненты
import EnhancedPatientMonitor from './MonitorPanel/EnhancedPatientMonitor';
import VentilatorMonitor from './VentilatorMonitor/VentilatorMonitor';
import LabResultsModule from './LabResultsModule/LabResultsModule';
import ClinicalScenarios from './ClinicalScenarios';
import EducationalModule from './EducationalModule/EducationalModule';
import PatientControlPanel from './ControlPanel/PatientControlPanel';

// Импортируем основные модули
import PhysiologicalModel from '../core/PhysiologicalModel';
import EventsAndComplicationsModule from '../core/EventsAndComplicationsModule';
import SimulationEngine from '../core/SimulationEngine';

// Компонент вкладки 
const TabButton = ({ label, isActive, onClick, icon }) => {
  return (
    <button
      className={`flex items-center px-4 py-2 rounded-t-lg border-t border-l border-r ${
        isActive 
          ? 'bg-gray-800 border-blue-600 text-blue-400 border-b-0' 
          : 'bg-gray-900 border-gray-700 text-gray-400 hover:text-gray-200'
      }`}
      onClick={onClick}
    >
      {icon && <span className="mr-2">{icon}</span>}
      {label}
    </button>
  );
};

// Компонент для записей пациента
const PatientRecords = ({ patientInfo, isOperating }) => {
  // История лечения и наблюдений
  const [medicalRecords, setMedicalRecords] = useState([
    {
      timestamp: '17.03.2025 10:30',
      type: 'observation',
      title: 'Осмотр врача',
      content: 'Пациент поступил в стабильном состоянии. Жалоб активно не предъявляет. ' +
               'Сознание ясное. Кожные покровы обычной окраски. В легких везикулярное дыхание, ' +
               'хрипов нет. Тоны сердца ритмичные, ясные. ЧСС = 72 уд/мин, АД = 120/80 мм рт.ст. ' +
               'Живот мягкий, безболезненный.',
      author: 'Иванов И.И.'
    },
    {
      timestamp: '17.03.2025 10:45',
      type: 'procedure',
      title: 'Установка внутривенного катетера',
      content: 'Выполнена катетеризация периферической вены на правом предплечье. Катетер 18G. ' +
               'Начата инфузия физиологического раствора со скоростью 100 мл/ч.',
      author: 'Петрова А.С.'
    },
    {
      timestamp: '17.03.2025 11:00',
      type: 'medication',
      title: 'Назначение медикаментов',
      content: 'Назначено: 1. Цефтриаксон 2г в/в 1 раз в сутки, 2. Омепразол 20 мг в/в 2 раза в сутки, ' +
               '3. Парацетамол 1г в/в при температуре выше 38°С.',
      author: 'Иванов И.И.'
    }
  ]);

  // Состояние для новой записи
  const [newRecord, setNewRecord] = useState({
    type: 'observation',
    title: '',
    content: ''
  });
  const [showAddRecordForm, setShowAddRecordForm] = useState(false);

  // Добавление новой записи
  const handleAddRecord = () => {
    if (newRecord.title.trim() === '' || newRecord.content.trim() === '') {
      return;
    }

    const currentDate = new Date();
    const formattedDate = new Intl.DateTimeFormat('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit'
    }).format(currentDate);

    const record = {
      timestamp: formattedDate,
      type: newRecord.type,
      title: newRecord.title,
      content: newRecord.content,
      author: 'Пользователь'
    };

    setMedicalRecords([record, ...medicalRecords]);
    setNewRecord({
      type: 'observation',
      title: '',
      content: ''
    });
    setShowAddRecordForm(false);
  };

  // История лекарств
  const medicationHistory = [
    {
      name: 'Цефтриаксон',
      dose: '2г',
      route: 'внутривенно',
      time: '17.03.2025 11:00',
      status: 'назначено'
    },
    {
      name: 'Омепразол',
      dose: '20мг',
      route: 'внутривенно',
      time: '17.03.2025 11:00',
      status: 'назначено'
    },
    {
      name: 'Парацетамол',
      dose: '1г',
      route: 'внутривенно',
      time: '17.03.2025 12:15',
      status: 'введено'
    }
  ];

  // Вкладки внутри записей
  const [activeRecordTab, setActiveRecordTab] = useState('notes');

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl text-white font-bold">Медицинские записи</h2>
        {isOperating && (
          <button
            onClick={() => setShowAddRecordForm(true)}
            className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-600 text-sm"
          >
            Добавить запись
          </button>
        )}
      </div>

      {/* Вкладки записей */}
      <div className="flex border-b border-gray-700 mb-4">
        <button
          className={`px-3 py-2 ${activeRecordTab === 'notes' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveRecordTab('notes')}
        >
          Записи
        </button>
        <button
          className={`px-3 py-2 ${activeRecordTab === 'medications' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveRecordTab('medications')}
        >
          Лекарства
        </button>
        <button
          className={`px-3 py-2 ${activeRecordTab === 'anamnesis' ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveRecordTab('anamnesis')}
        >
          Анамнез
        </button>
      </div>

      {/* Содержимое вкладок */}
      {activeRecordTab === 'notes' && (
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {medicalRecords.map((record, index) => (
            <div key={index} className="bg-gray-800 border border-gray-700 rounded p-3">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <span className="font-medium text-white">{record.title}</span>
                  <span className="ml-2 text-xs text-gray-400">{record.timestamp}</span>
                </div>
                <span className={`px-2 py-0.5 text-xs rounded-full ${
                  record.type === 'observation' ? 'bg-blue-900 text-blue-300' :
                  record.type === 'procedure' ? 'bg-green-900 text-green-300' :
                  'bg-purple-900 text-purple-300'
                }`}>
                  {record.type === 'observation' ? 'Наблюдение' :
                   record.type === 'procedure' ? 'Процедура' : 'Лекарство'}
                </span>
              </div>
              <p className="text-gray-300 mb-2">{record.content}</p>
              <div className="text-right text-xs text-gray-400">
                Автор: {record.author}
              </div>
            </div>
          ))}
        </div>
      )}

      {activeRecordTab === 'medications' && (
        <div className="bg-gray-800 border border-gray-700 rounded p-3">
          <table className="w-full text-gray-300">
            <thead className="text-gray-400 border-b border-gray-700">
              <tr>
                <th className="py-2 text-left">Препарат</th>
                <th className="py-2 text-left">Дозировка</th>
                <th className="py-2 text-left">Способ введения</th>
                <th className="py-2 text-left">Время</th>
                <th className="py-2 text-left">Статус</th>
              </tr>
            </thead>
            <tbody>
              {medicationHistory.map((med, index) => (
                <tr key={index} className="border-b border-gray-700">
                  <td className="py-2">{med.name}</td>
                  <td className="py-2">{med.dose}</td>
                  <td className="py-2">{med.route}</td>
                  <td className="py-2">{med.time}</td>
                  <td className="py-2">
                    <span className={`px-2 py-0.5 text-xs rounded-full ${
                      med.status === 'назначено' ? 'bg-blue-900 text-blue-300' :
                      med.status === 'введено' ? 'bg-green-900 text-green-300' :
                      'bg-red-900 text-red-300'
                    }`}>
                      {med.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeRecordTab === 'anamnesis' && (
        <div className="bg-gray-800 border border-gray-700 rounded p-3">
          <h3 className="text-white font-medium mb-2">Анамнез заболевания</h3>
          <p className="text-gray-300 mb-4">
            Пациент поступил для планового хирургического вмешательства. Заболевание началось около 6 месяцев назад, 
            когда впервые появились характерные симптомы. Амбулаторное лечение с незначительным эффектом.
          </p>
          
          <h3 className="text-white font-medium mb-2">Анамнез жизни</h3>
          <p className="text-gray-300 mb-2">
            Рос и развивался соответственно возрасту. Образование высшее. Работает менеджером.
          </p>
          <p className="text-gray-300 mb-2">
            <span className="text-gray-400">Перенесенные заболевания:</span> ОРВИ, ветряная оспа в детстве.
          </p>
          <p className="text-gray-300 mb-2">
            <span className="text-gray-400">Аллергологический анамнез:</span> не отягощен.
          </p>
          <p className="text-gray-300 mb-2">
            <span className="text-gray-400">Наследственность:</span> не отягощена.
          </p>
          <p className="text-gray-300">
            <span className="text-gray-400">Вредные привычки:</span> отрицает.
          </p>
        </div>
      )}

      {/* Форма добавления новой записи */}
      {showAddRecordForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-xl text-white font-bold mb-4">Новая запись</h3>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">Тип записи</label>
              <select
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                value={newRecord.type}
                onChange={(e) => setNewRecord({...newRecord, type: e.target.value})}
              >
                <option value="observation">Наблюдение</option>
                <option value="procedure">Процедура</option>
                <option value="medication">Лекарство</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">Заголовок</label>
              <input
                type="text"
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
                value={newRecord.title}
                onChange={(e) => setNewRecord({...newRecord, title: e.target.value})}
                placeholder="Введите заголовок"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-400 mb-1">Содержание</label>
              <textarea
                className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white h-32"
                value={newRecord.content}
                onChange={(e) => setNewRecord({...newRecord, content: e.target.value})}
                placeholder="Введите текст записи"
              />
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
                onClick={() => setShowAddRecordForm(false)}
              >
                Отмена
              </button>
              <button
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-500"
                onClick={handleAddRecord}
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Основной компонент симулятора
const IntegratedPatientSimulator = () => {
  // Состояние приложения
  const [isOperating, setIsOperating] = useState(false);
  const [activeTab, setActiveTab] = useState('monitor');
  const [showScenarios, setShowScenarios] = useState(false);
  const [showPatientControl, setShowPatientControl] = useState(false);
  const [isCPRInProgress, setIsCPRInProgress] = useState(false);
  const [showEducationalModule, setShowEducationalModule] = useState(false);
  
  // Состояние пациента
  const [patientState, setPatientState] = useState({
    hr: 72,
    rr: 14,
    spo2: 98,
    systolic: 120,
    diastolic: 80,
    temperature: 36.6,
    etco2: 35,
    cardiac_output: 5.1,
    stroke_volume: 70,
    intubated: false
  });
  
  // Информация о пациенте
  const patientInfo = {
    name: "Иванов Иван Иванович",
    age: 45,
    gender: "Мужской",
    weight: 78,
    height: 176,
    bloodType: "A(II) Rh+",
    diagnosis: "Плановая операция",
    id: "12345-678"
  };
  
  // Ссылка на модель физиологии
  const physiologicalModelRef = useRef(null);
  
  // Дата и время
  const [currentDateTime, setCurrentDateTime] = useState(new Date());
  
  // Эффект для обновления времени
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Форматированная дата и время
  const formattedDateTime = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(currentDateTime);
  
  // Эффект для инициализации физиологической модели
  useEffect(() => {
  
   physiologicalModelRef.current = new PhysiologicalModel(patientState);
    
    
    physiologicalModelRef.current = simulatePhysiologicalModel;
    
    // Очистка при размонтировании
    return () => {
      if (physiologicalModelRef.current) {
        physiologicalModelRef.current.stopSimulation();
      }
    };
  }, []);
  
  // Эффект для симуляции физиологии
  useEffect(() => {
    let simulationInterval;
    
    if (isOperating && physiologicalModelRef.current) {
      // Запускаем симуляцию физиологии
      physiologicalModelRef.current.startSimulation();
      
      // Начальное состояние
      updatePatientState(patientState);
      
      // Регулярное обновление состояния
      simulationInterval = setInterval(() => {
        if (physiologicalModelRef.current) {
          const newState = physiologicalModelRef.current.updatePhysiology();
          setPatientState(newState);
        }
      }, 2000);
    } else if (physiologicalModelRef.current) {
      // Останавливаем симуляцию
      physiologicalModelRef.current.stopSimulation();
      
      // Сбрасываем показатели
      setPatientState({
        hr: 72,
        rr: 14,
        spo2: 98,
        systolic: 120,
        diastolic: 80,
        temperature: 36.6,
        etco2: 35,
        cardiac_output: 5.1,
        stroke_volume: 70,
        intubated: false
      });
      
      // Сбрасываем статус СЛР
      setIsCPRInProgress(false);
    }
    
    return () => clearInterval(simulationInterval);
  }, [isOperating]);
  
  // Обработчик обновления состояния пациента
  const updatePatientState = (newState) => {
    setPatientState(newState);
    
    if (physiologicalModelRef.current) {
      physiologicalModelRef.current.setState(newState);
    }
  };
  
  // Обработчик запуска клинического сценария
  const handleStartScenario = (scenarioKey, parameters) => {
    if (physiologicalModelRef.current && isOperating) {
      const updatedState = physiologicalModelRef.current.applyScenario(scenarioKey, parameters);
      setPatientState(updatedState);
      
      // Если запущен сценарий остановки сердца, автоматически запускаем СЛР
      if (scenarioKey === 'cardiac_arrest') {
        setIsCPRInProgress(true);
      }
      
      // Скрываем панель сценариев
      setShowScenarios(false);
    }
  };
  
  // Обработчик применения лекарства
  const handleApplyMedication = (medication) => {
    if (physiologicalModelRef.current && isOperating) {
      const updatedState = physiologicalModelRef.current.applyMedication(medication);
      setPatientState(updatedState);
    }
  };
  
  // Обработчик клинического вмешательства
  const handlePerformIntervention = (intervention) => {
    if (!physiologicalModelRef.current || !isOperating) return;
    
    let updatedState;
    
    switch (intervention) {
      case 'intubate':
        updatedState = physiologicalModelRef.current.intubate(true);
        break;
      case 'start_cpr':
        updatedState = physiologicalModelRef.current.startCPR();
        setIsCPRInProgress(true);
        break;
      case 'stop_cpr':
        updatedState = physiologicalModelRef.current.stopCPR();
        setIsCPRInProgress(false);
        break;
      default:
        // Обрабатываем как сценарий
        updatedState = physiologicalModelRef.current.applyScenario(intervention);
        break;
    }
    
    if (updatedState) {
      setPatientState(updatedState);
    }
  };
  
  // Определение статуса пациента
  const getPatientStatus = () => {
    if (patientState.hr === 0 || patientState.systolic === 0) {
      return 'arrest';
    } else if (
      (patientState.hr < 40) ||
      (patientState.systolic < 70) ||
      (patientState.spo2 < 80)
    ) {
      return 'arrestImminent';
    } else if (
      (patientState.hr < 50 || patientState.hr > 150) ||
      (patientState.systolic < 80 || patientState.systolic > 200) ||
      (patientState.spo2 < 90)
    ) {
      return 'critical';
    } else if (
      (patientState.hr < 60 || patientState.hr > 120) ||
      (patientState.systolic < 100 || patientState.systolic > 160) ||
      (patientState.spo2 < 95)
    ) {
      return 'unstable';
    } else {
      return 'stable';
    }
  };
  
  // Отображение статуса пациента
  const renderPatientStatus = () => {
    const status = getPatientStatus();
    const statusInfo = {
      stable: {
        label: 'Стабильный',
        color: 'bg-green-500',
        textColor: 'text-green-400',
        description: 'Показатели в пределах нормы'
      },
      unstable: {
        label: 'Нестабильный',
        color: 'bg-yellow-500',
        textColor: 'text-yellow-400',
        description: 'Есть отклонения от нормы'
      },
      critical: {
        label: 'Критический',
        color: 'bg-red-500',
        textColor: 'text-red-400',
        description: 'Требуется немедленное вмешательство'
      },
      arrestImminent: {
        label: 'Предостановка',
        color: 'bg-red-600',
        textColor: 'text-red-500',
        description: 'Высокий риск остановки сердца'
      },
      arrest: {
        label: 'Остановка',
        color: 'bg-red-700',
        textColor: 'text-red-600',
        description: 'Проводится реанимация'
      }
    };
    
    const currentStatus = statusInfo[status];
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-3 h-3 rounded-full ${currentStatus.color}`}></div>
        <div className={`font-medium ${currentStatus.textColor}`}>
          {currentStatus.label}
        </div>
      </div>
    );
  };
  
  // Функция для отображения панели управления пациентом
  const renderPatientControlPanel = () => {
    if (!showPatientControl) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="w-full max-w-4xl">
          <PatientControlPanel 
            patientState={patientState}
            updatePatientState={updatePatientState}
            onOpenScenarios={() => {
              setShowPatientControl(false);
              setShowScenarios(true);
            }}
            onApplyMedication={handleApplyMedication}
            onPerformIntervention={handlePerformIntervention}
            isOperating={isOperating}
          />
          <div className="mt-4 flex justify-end">
            <button
              className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
              onClick={() => setShowPatientControl(false)}
            >
              Закрыть
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Функция для отображения клинических сценариев
  const renderScenariosPanel = () => {
    if (!showScenarios) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="w-full max-w-4xl">
          <ClinicalScenarios 
            onStartScenario={handleStartScenario}
            onClose={() => setShowScenarios(false)}
            isOperating={isOperating}
          />
        </div>
      </div>
    );
  };

  // Функция для отображения образовательного модуля
  const renderEducationalModule = () => {
    if (!showEducationalModule) return null;
    
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
        <div className="w-full max-w-4xl">
          <EducationalModule 
            patientModel={physiologicalModelRef.current}
            onExit={() => setShowEducationalModule(false)}
          />
        </div>
      </div>
    );
  };

  // Основной интерфейс симулятора
  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Верхняя панель */}
      <div className="h-12 bg-gray-900 border-b border-gray-700 flex justify-between items-center px-4">
        <div className="flex space-x-4 items-center">
          <h1 className="text-xl font-bold text-blue-400">Медицинский Симулятор</h1>
          <button
            className={`px-4 py-1 rounded text-sm ${isOperating ? 'bg-red-800' : 'bg-green-800'}`}
            onClick={() => setIsOperating(!isOperating)}
          >
            {isOperating ? 'Завершить операцию' : 'Начало операции'}
          </button>
          
          {/* Добавляем кнопку для обучающего модуля */}
          <button
            className="px-4 py-1 rounded text-sm bg-blue-800"
            onClick={() => setShowEducationalModule(true)}
          >
            Обучение
          </button>
        </div>
        
        <div className="flex items-center space-x-6">
          {patientState.intubated && (
            <div className="px-2 py-1 bg-blue-900 text-sm rounded">
              Интубирован
            </div>
          )}
          {isCPRInProgress && (
            <div className="px-2 py-1 bg-red-900 text-sm rounded animate-pulse">
              СЛР в процессе
            </div>
          )}
          {renderPatientStatus()}
          <div className="text-gray-300">{formattedDateTime}</div>
        </div>
      </div>
      
      {/* Информация о пациенте */}
      <div className="bg-gray-900 border-b border-gray-700 h-10 px-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="font-medium text-blue-400">{patientInfo.name}</span> | 
            <span className="ml-1">{patientInfo.age} лет, {patientInfo.gender}</span> | 
            <span className="ml-1">{patientInfo.weight} кг, {patientInfo.height} см</span> | 
            <span className="ml-1">ID: {patientInfo.id}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => setShowPatientControl(true)}
            className="px-3 py-1 bg-blue-800 text-white rounded hover:bg-blue-700 text-sm"
          >
            Параметры пациента
          </button>
          <div className="text-sm">
            <span className="text-gray-400">Диагноз:</span>
            <span className="ml-1 text-white">{patientInfo.diagnosis}</span>
          </div>
        </div>
      </div>
      
      {/* Вкладки */}
      <div className="px-4 pt-2 bg-gray-900 border-b border-gray-700 flex space-x-2">
        <TabButton 
          label="Монитор" 
          icon="📊"
          isActive={activeTab === 'monitor'} 
          onClick={() => setActiveTab('monitor')} 
        />
        <TabButton 
          label="ИВЛ" 
          icon="🫁"
          isActive={activeTab === 'ventilator'} 
          onClick={() => setActiveTab('ventilator')} 
        />
        <TabButton 
          label="Лабораторные данные" 
          icon="🧪"
          isActive={activeTab === 'lab'} 
          onClick={() => setActiveTab('lab')} 
        />
        <TabButton 
          label="Записи" 
          icon="📋"
          isActive={activeTab === 'records'} 
          onClick={() => setActiveTab('records')} 
        />
      </div>
      
      {/* Основное содержимое */}
      <div className="flex-1 p-4 overflow-auto">
        {activeTab === 'monitor' && (
          <EnhancedPatientMonitor
            patientState={patientState}
            updatePatientState={updatePatientState}
            isOperating={isOperating}
            onApplyMedication={handleApplyMedication}
            onPerformIntervention={handlePerformIntervention}
            onLoadScenarios={() => setShowScenarios(true)}
            isCPRInProgress={isCPRInProgress}
          />
        )}
        
        {activeTab === 'ventilator' && (
          <VentilatorMonitor
            isOperating={isOperating}
            patientData={patientState}
            onVentilatorChange={(settings) => {
              console.log("Ventilator settings changed:", settings);
              // В реальном приложении обновляли бы состояние пациента
            }}
          />
        )}
        
        {activeTab === 'lab' && (
          <LabResultsModule
            patientData={patientState}
          />
        )}
        
        {activeTab === 'records' && (
          <PatientRecords
            patientInfo={patientInfo}
            isOperating={isOperating}
          />
        )}
      </div>
      
      {/* Модальные окна */}
      {renderPatientControlPanel()}
      {renderScenariosPanel()}
      {renderEducationalModule()}
    </div>
  );
};

export default IntegratedPatientSimulator;