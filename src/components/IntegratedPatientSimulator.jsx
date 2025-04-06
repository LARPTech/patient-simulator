import React, { useState, useEffect, useRef } from 'react';

// Импортируем компоненты
import EnhancedPatientMonitor from './MonitorPanel/EnhancedPatientMonitor';
import VentilatorMonitor from './VentilatorMonitor/VentilatorMonitor';
import LabResultsModule from './LabResultsModule/LabResultsModule';
import ClinicalScenarios from './ClinicalScenarios';
import EducationalModule from './EducationalModule/EducationalModule';
import PatientControlPanel from './ControlPanel/PatientControlPanel';

// Импортируем основные модули
import SimulationEngine from '../core/SimulationEngine';

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
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-full overflow-auto">
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
        <div className="space-y-4 max-h-[calc(100vh-300px)] overflow-y-auto">
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
  const [simulationError, setSimulationError] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
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
  const appRef = useRef(null);
  
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
    try {
      const engine = new SimulationEngine(patientState, {
        updateInterval: 1000,
        eventCheckInterval: 10000
      });
      
      physiologicalModelRef.current = engine.initialize ? engine.initialize() : engine;
      
      console.log("SimulationEngine initialized successfully");
    } catch (error) {
      console.error("Error initializing SimulationEngine:", error);
      setSimulationError("Ошибка инициализации модели: " + error.message);
    }
    
    return () => {
      try {
        if (physiologicalModelRef.current && typeof physiologicalModelRef.current.stopSimulation === 'function') {
          physiologicalModelRef.current.stopSimulation();
        }
      } catch (error) {
        console.error("Error cleaning up SimulationEngine:", error);
      }
    };
  }, []);
  
  // Эффект для симуляции физиологии
  useEffect(() => {
    let simulationInterval;
    
    if (isOperating && physiologicalModelRef.current) {
      try {
        if (typeof physiologicalModelRef.current.startSimulation === 'function') {
          physiologicalModelRef.current.startSimulation();
        } else {
          console.warn("startSimulation method not found on physiologicalModel");
        }
        
        updatePatientState(patientState);
        
        simulationInterval = setInterval(() => {
          try {
            if (physiologicalModelRef.current && typeof physiologicalModelRef.current.updatePhysiology === 'function') {
              const newState = physiologicalModelRef.current.updatePhysiology();
              if (newState) {
                setPatientState(newState);
              }
            }
          } catch (error) {
            console.error("Error in simulation interval:", error);
            clearInterval(simulationInterval);
            setSimulationError("Ошибка в процессе симуляции: " + error.message);
          }
        }, 2000);
      } catch (error) {
        console.error("Error starting simulation:", error);
        setSimulationError("Ошибка запуска симуляции: " + error.message);
      }
    } else if (physiologicalModelRef.current) {
      try {
        if (typeof physiologicalModelRef.current.stopSimulation === 'function') {
          physiologicalModelRef.current.stopSimulation();
        }
        
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
        
        setIsCPRInProgress(false);
      } catch (error) {
        console.error("Error stopping simulation:", error);
      }
    }
    
    return () => {
      if (simulationInterval) {
        clearInterval(simulationInterval);
      }
    };
  }, [isOperating, patientState]);

  // Функция для управления полноэкранным режимом
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (appRef.current.requestFullscreen) {
        appRef.current.requestFullscreen().then(() => {
          setIsFullscreen(true);
        }).catch(err => {
          console.error(`Ошибка при переходе в полноэкранный режим: ${err.message}`);
        });
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          setIsFullscreen(false);
        }).catch(err => {
          console.error(`Ошибка при выходе из полноэкранного режима: ${err.message}`);
        });
      }
    }
  };

  // Слушатель события изменения полноэкранного режима
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Обработчик нажатия клавиши ESC для выхода из полноэкранного режима
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isFullscreen]);
  
  // Обработчик обновления состояния пациента
  const updatePatientState = (newState) => {
    setPatientState(newState);
    
    try {
      if (physiologicalModelRef.current && typeof physiologicalModelRef.current.setState === 'function') {
        physiologicalModelRef.current.setState(newState);
      }
    } catch (error) {
      console.error("Error updating patient state:", error);
    }
  };
  
  // Обработчик запуска клинического сценария
  const handleStartScenario = (scenarioKey, parameters) => {
    if (!physiologicalModelRef.current || !isOperating) return;
    
    try {
      if (typeof physiologicalModelRef.current.applyScenario === 'function') {
        const updatedState = physiologicalModelRef.current.applyScenario(scenarioKey, parameters);
        if (updatedState) {
          setPatientState(updatedState);
        }
        
        if (scenarioKey === 'cardiac_arrest') {
          setIsCPRInProgress(true);
        }
      } else {
        console.warn("applyScenario method not found on physiologicalModel");
      }
      
      setShowScenarios(false);
    } catch (error) {
      console.error("Error starting scenario:", error);
      setSimulationError("Ошибка запуска сценария: " + error.message);
    }
  };
  
  // Обработчик применения лекарства
  const handleApplyMedication = (medication) => {
    if (!physiologicalModelRef.current || !isOperating) return;
    
    try {
      if (typeof physiologicalModelRef.current.applyMedication === 'function') {
        const updatedState = physiologicalModelRef.current.applyMedication(medication);
        if (updatedState) {
          setPatientState(updatedState);
        }
      } else {
        console.warn("applyMedication method not found on physiologicalModel");
      }
    } catch (error) {
      console.error("Error applying medication:", error);
    }
  };
  
  // Обработчик клинического вмешательства
  const handlePerformIntervention = (intervention) => {
    if (!physiologicalModelRef.current || !isOperating) return;
    
    try {
      let updatedState;
      
      switch (intervention) {
        case 'intubate':
          if (typeof physiologicalModelRef.current.intubate === 'function') {
            updatedState = physiologicalModelRef.current.intubate(true);
          }
          break;
        case 'start_cpr':
          if (typeof physiologicalModelRef.current.startCPR === 'function') {
            updatedState = physiologicalModelRef.current.startCPR();
            setIsCPRInProgress(true);
          }
          break;
        case 'stop_cpr':
          if (typeof physiologicalModelRef.current.stopCPR === 'function') {
            updatedState = physiologicalModelRef.current.stopCPR();
            setIsCPRInProgress(false);
          }
          break;
        default:
          if (typeof physiologicalModelRef.current.applyScenario === 'function') {
            updatedState = physiologicalModelRef.current.applyScenario(intervention);
          }
          break;
      }
      
      if (updatedState) {
        setPatientState(updatedState);
      }
    } catch (error) {
      console.error(`Error performing intervention ${intervention}:`, error);
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

  // Функция для отображения сообщений об ошибках
  const renderSimulationError = () => {
    if (!simulationError) return null;
    
    return (
      <div className="fixed bottom-4 right-4 bg-red-800 text-white px-4 py-3 rounded-lg shadow-lg max-w-md">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <svg className="h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="font-medium">{simulationError}</p>
            <p className="mt-2 text-sm">Проверьте консоль разработчика для дополнительной информации</p>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => setSimulationError(null)}
              className="text-white hover:text-gray-300"
            >
              <svg className="h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Основной интерфейс симулятора
  return (
    <div 
      ref={appRef} 
      className={`flex flex-col bg-black text-white ${
        isFullscreen ? 'fixed inset-0 w-screen h-screen' : 'h-screen'
      } overflow-hidden`}
    >
      {/* Верхняя панель */}
      <div className="h-12 bg-gray-900 border-b border-gray-700 flex items-center px-4">
        <div className="flex-1 flex items-center">
          {/* Название */}
          <h1 className="text-xl font-bold text-blue-400 mr-4">Медицинский Симулятор</h1>
          
          {/* Вкладки */}
          <div className="flex space-x-1">
            <button
              className={`px-3 py-1 rounded-t ${activeTab === 'monitor' ? 'bg-blue-800 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setActiveTab('monitor')}
            >
              Монитор
            </button>
            <button
              className={`px-3 py-1 rounded-t ${activeTab === 'ventilator' ? 'bg-blue-800 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setActiveTab('ventilator')}
            >
              ИВЛ
            </button>
            <button
              className={`px-3 py-1 rounded-t ${activeTab === 'lab' ? 'bg-blue-800 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setActiveTab('lab')}
            >
              Лабораторные данные
            </button>
            <button
              className={`px-3 py-1 rounded-t ${activeTab === 'records' ? 'bg-blue-800 text-white' : 'bg-gray-800 text-gray-400 hover:bg-gray-700'}`}
              onClick={() => setActiveTab('records')}
            >
              Записи
            </button>
          </div>
        </div>
        
        {/* Кнопки и статус */}
        <div className="flex items-center space-x-2">
          <button
            className={`px-3 py-1 rounded text-sm ${isOperating ? 'bg-red-800 hover:bg-red-700' : 'bg-green-800 hover:bg-green-700'}`}
            onClick={() => setIsOperating(!isOperating)}
          >
            {isOperating ? 'Завершить' : 'Начать'}
          </button>
          
          <button
            className="px-3 py-1 rounded text-sm bg-blue-800 hover:bg-blue-700"
            onClick={() => setShowEducationalModule(true)}
          >
            Обучение
          </button>
          
          <button
            className="px-3 py-1 rounded text-sm bg-blue-800 hover:bg-blue-700"
            onClick={() => setShowPatientControl(true)}
          >
            Параметры
          </button>
          
          <button
            className="px-3 py-1 rounded text-sm bg-blue-800 hover:bg-blue-700"
            onClick={toggleFullscreen}
          >
            {isFullscreen ? 'Выйти' : 'Полный экран'}
          </button>
          
          {patientState.intubated && (
            <div className="px-2 py-1 bg-blue-900 text-xs rounded">
              Интубирован
            </div>
          )}
          {isCPRInProgress && (
            <div className="px-2 py-1 bg-red-900 text-xs rounded animate-pulse">
              СЛР
            </div>
          )}
          {renderPatientStatus()}
          <div className="text-gray-300 text-sm">{formattedDateTime}</div>
        </div>
      </div>
      
      {/* Основное содержимое */}
      <div className="flex-1 overflow-hidden">
        {activeTab === 'monitor' && (
          <div className="h-full p-1">
            <EnhancedPatientMonitor
              patientState={patientState}
              updatePatientState={updatePatientState}
              isOperating={isOperating}
              onApplyMedication={handleApplyMedication}
              onPerformIntervention={handlePerformIntervention}
              onLoadScenarios={() => setShowScenarios(true)}
              isCPRInProgress={isCPRInProgress}
              className="h-full"
            />
          </div>
        )}
        
        {activeTab === 'ventilator' && (
          <div className="h-full p-1 overflow-auto">
            <VentilatorMonitor
              isOperating={isOperating}
              patientData={patientState}
              onVentilatorChange={(settings) => {
                console.log("Ventilator settings changed:", settings);
              }}
            />
          </div>
        )}
        
        {activeTab === 'lab' && (
          <div className="h-full p-1 overflow-auto">
            <LabResultsModule
              patientData={patientState}
            />
          </div>
        )}
        
        {activeTab === 'records' && (
          <div className="h-full p-1 overflow-auto">
            <PatientRecords
              patientInfo={patientInfo}
              isOperating={isOperating}
            />
          </div>
        )}
      </div>
      
      {/* Модальные окна */}
      {renderPatientControlPanel()}
      {renderScenariosPanel()}
      {renderEducationalModule()}
      {renderSimulationError()}
    </div>
  );
};

export default IntegratedPatientSimulator;