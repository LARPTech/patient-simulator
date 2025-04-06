import React, { useState, useEffect, useRef } from 'react';
import RealisticWaveforms from './RealisticWaveforms';

  // Компонент отображения числового параметра (базовый)
const BaseVitalDisplay = ({ 
  title, 
  value = '--', 
  unit, 
  color, 
  alarmHigh, 
  alarmLow, 
  valueFontSize = 'text-5xl',
  customDisplay = null,
  className = ''
}) => {
  const [alarmMuted, setAlarmMuted] = useState(false);
  
  // Обработка разных типов значений для тревог
  let isAlarm = false;
  let alarmDisplay = null;
  
  if (typeof value === 'number') {
    // Для простых числовых значений
    isAlarm = value > alarmHigh || value < alarmLow;
  } else if (typeof value === 'string' && value.includes('/')) {
    // Для АД в формате "120/80"
    const parts = value.split('/');
    const systolic = parseInt(parts[0], 10);
    const diastolic = parseInt(parts[1], 10);
    
    // Проверяем оба значения, но отображаем по-разному
    const isSystolicAlarm = !isNaN(systolic) && (systolic > alarmHigh || systolic < alarmLow);
    const isDiastolicAlarm = !isNaN(diastolic) && (diastolic > alarmHigh * 0.6 || diastolic < alarmLow * 0.6); // примерные пороги для диастолического
    
    if (isSystolicAlarm || isDiastolicAlarm) {
      // Создаем специальный компонент для раздельного отображения тревоги
      alarmDisplay = (
        <div className="text-center">
          <span className={`${valueFontSize} font-bold ${isSystolicAlarm ? 'text-red-600' : `text-${color}`}`}>
            {parts[0]}
          </span>
          <span className={`${valueFontSize} font-bold`}>/</span>
          <span className={`${valueFontSize} font-bold ${isDiastolicAlarm ? 'text-red-600' : `text-${color}`}`}>
            {parts[1]}
          </span>
        </div>
      );
    }
  }
  
  return (
    <div className={`flex flex-col border-2 border-gray-600 rounded bg-black p-1 h-full ${className}`}>
      <div className="flex justify-between items-center">
        <div className={title === "ТЕМП" ? "text-sm text-purple-600" : `text-sm text-${color}`}>{title}</div>
        <button 
          onClick={() => setAlarmMuted(!alarmMuted)}
          className="w-6 h-6 flex items-center justify-center border border-gray-700 rounded-sm bg-gray-900"
        >
          <span className="text-sm">{alarmMuted ? '🔇' : '🔊'}</span>
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        {customDisplay ? (
          customDisplay
        ) : alarmDisplay ? (
          <>
            {alarmDisplay}
            <div className={title === "ТЕМП" ? "text-sm text-purple-600 text-center" : `text-sm text-${color} text-center`}>{unit}</div>
          </>
        ) : (
          <>
            <div className={`${valueFontSize} font-bold ${isAlarm ? 'text-red-600' : (title === "ТЕМП" ? "text-purple-600" : `text-${color}`)} text-center`}>
              {value}
            </div>
            <div className={title === "ТЕМП" ? "text-sm text-purple-600 text-center" : `text-sm text-${color} text-center`}>{unit}</div>
          </>
        )}
      </div>
    </div>
  );
};

// Компонент для отображения порогов тревог
const AlarmLimitsDisplay = ({ title, high, low, color = "green-500", className = '' }) => {
  return (
    <div className={`flex flex-col items-center bg-red-600 border-2 border-gray-600 rounded h-full ${className}`}>
      <div className={`text-${color} text-xs p-1`}>{title}</div>
      <div className="flex-1"></div>
      <div className={`text-${color} text-sm font-bold`}>{high}</div>
      <div className={`w-5 h-0.5 bg-${color} my-1`}></div>
      <div className={`text-${color} text-sm font-bold`}>{low}</div>
      <div className="flex-1"></div>
    </div>
  );
};

// Кнопка быстрого действия
const QuickActionButton = ({ icon, label, onClick }) => {
  return (
    <button 
      className="flex flex-col items-center justify-center bg-blue-900 hover:bg-blue-800 text-white p-1 rounded"
      onClick={onClick}
    >
      <span className="text-lg">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
};

// Панель быстрых действий
const QuickActionsPanel = ({ 
  onIntubate, 
  onStartCPR,
  onStopCPR,
  onLoadScenarios,
  onOpenMedicationsPanel,
  showCPRControls = false,
  className = ''
}) => {
  return (
    <div className={`grid grid-cols-5 gap-1 p-1 border-2 border-gray-600 rounded bg-black h-full ${className}`}>
      <QuickActionButton 
        icon="🔄" 
        label="Сценарии" 
        onClick={onLoadScenarios}
      />
      <QuickActionButton 
        icon="💉" 
        label="Лекарства" 
        onClick={onOpenMedicationsPanel}
      />
      <QuickActionButton 
        icon="🫁" 
        label="Интубация" 
        onClick={onIntubate}
      />
      {showCPRControls ? (
        <QuickActionButton 
          icon="✋" 
          label="Стоп СЛР" 
          onClick={onStopCPR}
        />
      ) : (
        <QuickActionButton 
          icon="❤️" 
          label="Начать СЛР" 
          onClick={onStartCPR}
        />
      )}
      <QuickActionButton 
        icon="⚡" 
        label="Дефибриляция" 
        onClick={() => {}}
      />
    </div>
  );
};

// Компонент истории тревог
const AlarmHistory = ({ alarms = [], className = '' }) => {
  return (
    <div className={`flex flex-col border-2 border-gray-600 rounded bg-black p-1 h-full ${className}`}>
      <div className="text-sm text-blue-400 mb-1">История тревог</div>
      <div className="flex-1 overflow-y-auto">
        {alarms.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-gray-500">Нет активных тревог</div>
          </div>
        ) : (
          <div className="space-y-1">
            {alarms.map((alarm, index) => (
              <div key={index} className="flex items-center p-1 border-b border-gray-800">
                <div className={`w-3 h-3 rounded-full ${
                  alarm.severity === 'high' ? 'bg-red-500' : 
                  alarm.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                } mr-2`}></div>
                <div>
                  <div className="text-xs">{alarm.message}</div>
                  <div className="text-xs text-gray-400">{alarm.time}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент панели с лекарствами
const MedicationsPanel = ({ onClose, onApplyMedication, isOperating }) => {
  const medications = [
    { id: 'epinephrine', name: 'Эпинефрин', category: 'emergency', dose: '1 мг', description: 'Адреномиметик, повышает АД и ЧСС' },
    { id: 'atropine', name: 'Атропин', category: 'emergency', dose: '0.5 мг', description: 'Холиноблокатор, повышает ЧСС' },
    { id: 'norepinephrine', name: 'Норэпинефрин', category: 'vasopressor', dose: '4-16 мкг/мин', description: 'Вазопрессор, повышает АД' },
    { id: 'propofol', name: 'Пропофол', category: 'sedative', dose: '1-4 мг/кг', description: 'Седативное, снижает АД и ЧСС' },
    { id: 'midazolam', name: 'Мидазолам', category: 'sedative', dose: '0.1-0.2 мг/кг', description: 'Седативное, анксиолитик' },
    { id: 'fentanyl', name: 'Фентанил', category: 'analgesic', dose: '50-100 мкг', description: 'Опиоидный анальгетик' }
  ];
  
  const categories = [
    { id: 'all', name: 'Все' },
    { id: 'emergency', name: 'Экстренные' },
    { id: 'vasopressor', name: 'Вазопрессоры' },
    { id: 'sedative', name: 'Седативные' },
    { id: 'analgesic', name: 'Анальгетики' }
  ];
  
  const [activeCategory, setActiveCategory] = useState('all');
  
  const filteredMedications = medications.filter(med => 
    activeCategory === 'all' || med.category === activeCategory
  );
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
      <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl text-white font-bold">Лекарства</h2>
          <button
            className="text-gray-400 hover:text-white"
            onClick={onClose}
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4 flex flex-wrap gap-2">
          {categories.map(category => (
            <button
              key={category.id}
              className={`px-3 py-1 rounded ${
                activeCategory === category.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
              onClick={() => setActiveCategory(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-80 overflow-y-auto">
          {filteredMedications.map(med => (
            <div 
              key={med.id}
              className="bg-gray-700 p-3 rounded hover:bg-gray-600 cursor-pointer"
              onClick={() => {
                if (isOperating) {
                  onApplyMedication(med.id);
                  onClose();
                }
              }}
            >
              <div className="font-medium text-white">{med.name}</div>
              <div className="text-sm text-gray-300">Доза: {med.dose}</div>
              <div className="text-xs text-gray-400 mt-1">{med.description}</div>
            </div>
          ))}
        </div>
        
        {!isOperating && (
          <div className="mt-4 text-yellow-500 text-sm text-center">
            Для применения лекарств необходимо начать операцию
          </div>
        )}
        
        <div className="mt-4 flex justify-end">
          <button
            className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600"
            onClick={onClose}
          >
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};

// Основной компонент улучшенного монитора пациента
const EnhancedPatientMonitor = ({ 
  patientState, 
  updatePatientState,
  isOperating = true, 
  onApplyMedication,
  onPerformIntervention,
  onLoadScenarios,
  isCPRInProgress = false,
  className = ''
}) => {
  const [showMedicationsPanel, setShowMedicationsPanel] = useState(false);
  const [alarmHistory, setAlarmHistory] = useState([]);
  
  // Эффект для обновления состояния пациента при изменении patientState
  useEffect(() => {
    if (patientState) {
      // Проверяем тревоги
      checkAlarms();
    }
  }, [patientState]);
  
  // Функция проверки тревог
  const checkAlarms = () => {
    if (!patientState) return;
    
    const newAlarms = [];
    
    // Форматирование времени для тревоги
    const alarmTime = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());
    
    // Проверка показателей и добавление тревог
    if (patientState.hr !== '--') {
      if (patientState.hr > 120) {
        newAlarms.push({
          severity: 'medium',
          message: `ЧСС высокая: ${Math.round(patientState.hr)} уд/мин`,
          time: alarmTime
        });
      } else if (patientState.hr < 50) {
        newAlarms.push({
          severity: 'high',
          message: `ЧСС низкая: ${Math.round(patientState.hr)} уд/мин`,
          time: alarmTime
        });
      }
    }
    
    if (patientState.spo2 !== '--' && patientState.spo2 < 90) {
      newAlarms.push({
        severity: 'high',
        message: `SpO2 низкий: ${Math.round(patientState.spo2)}%`,
        time: alarmTime
      });
    }
    
    if (patientState.systolic !== '--') {
      if (patientState.systolic > 160) {
        newAlarms.push({
          severity: 'medium',
          message: `АД высокое: ${Math.round(patientState.systolic)}/${Math.round(patientState.diastolic)} мм рт.ст.`,
          time: alarmTime
        });
      } else if (patientState.systolic < 90) {
        newAlarms.push({
          severity: 'high',
          message: `АД низкое: ${Math.round(patientState.systolic)}/${Math.round(patientState.diastolic)} мм рт.ст.`,
          time: alarmTime
        });
      }
    }
    
    if (patientState.temperature > 38.5) {
      newAlarms.push({
        severity: 'medium',
        message: `Температура повышена: ${patientState.temperature.toFixed(1)}°C`,
        time: alarmTime
      });
    } else if (patientState.temperature < 35.5) {
      newAlarms.push({
        severity: 'medium',
        message: `Температура понижена: ${patientState.temperature.toFixed(1)}°C`,
        time: alarmTime
      });
    }
    
    if (patientState.etco2 !== '--') {
      if (patientState.etco2 > 45) {
        newAlarms.push({
          severity: 'medium',
          message: `EtCO2 повышен: ${Math.round(patientState.etco2)} мм рт.ст.`,
          time: alarmTime
        });
      } else if (patientState.etco2 < 30) {
        newAlarms.push({
          severity: 'medium',
          message: `EtCO2 понижен: ${Math.round(patientState.etco2)} мм рт.ст.`,
          time: alarmTime
        });
      }
    }
    
    // Добавляем новые тревоги, если они есть
    if (newAlarms.length > 0) {
      setAlarmHistory(prev => {
        // Ограничиваем историю 10 последними тревогами
        const updated = [...newAlarms, ...prev].slice(0, 10);
        return updated;
      });
    }
  };
  
  // Обработчик интубации
  const handleIntubate = () => {
    if (isOperating) {
      onPerformIntervention('intubate');
    }
  };
  
  // Обработчик начала СЛР
  const handleStartCPR = () => {
    if (isOperating) {
      onPerformIntervention('start_cpr');
    }
  };
  
  // Обработчик остановки СЛР
  const handleStopCPR = () => {
    if (isOperating) {
      onPerformIntervention('stop_cpr');
    }
  };
  
  // Обработчик дефибрилляции
  const handleDefibrillate = () => {
    if (isOperating) {
      onPerformIntervention('defibrillate');
      
      // Добавляем запись о дефибрилляции в историю тревог
      const alarmTime = new Intl.DateTimeFormat('ru-RU', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      }).format(new Date());
      
      setAlarmHistory(prev => [{
        severity: 'high',
        message: 'Выполнена дефибрилляция',
        time: alarmTime
      }, ...prev]);
    }
  };

  return (
    <div className={`w-full h-full ${className}`}>
      {/* Контейнер для разметки всего интерфейса */}
      <div className="flex flex-col h-full space-y-1">
        {/* Верхняя секция - графики и числовые показатели */}
        <div className="flex h-[65%] space-x-1">
          {/* Левая колонка - графики */}
          <div className="w-[75%] flex flex-col space-y-1">
            {/* ЭКГ */}
            <div className="w-full h-1/3 border-2 border-gray-600 rounded bg-black">
              <div className="h-5 px-2 flex justify-between items-center">
                <div className="text-sm text-green-500">ECG: II</div>
                {!isOperating && <div className="text-sm text-gray-500">DIAGNOSTIC</div>}
              </div>
              <div className="h-[calc(100%-20px)]">
                <RealisticWaveforms 
                  graphType="ecg"
                  vitalSigns={patientState}
                  isOperating={isOperating}
                />
              </div>
            </div>
            
            {/* Дыхание */}
            <div className="w-full h-1/3 border-2 border-gray-600 rounded bg-black">
              <div className="h-5 px-2 flex justify-between items-center">
                <div className="text-sm text-yellow-400">RESP</div>
                {!isOperating && <div className="text-sm text-gray-500">DIAGNOSTIC</div>}
              </div>
              <div className="h-[calc(100%-20px)]">
                <RealisticWaveforms 
                  graphType="resp"
                  vitalSigns={patientState}
                  isOperating={isOperating}
                />
              </div>
            </div>
            
            {/* SpO2 */}
            <div className="w-full h-1/3 border-2 border-gray-600 rounded bg-black">
              <div className="h-5 px-2 flex justify-between items-center">
                <div className="text-sm text-cyan-400">SpO2</div>
                {!isOperating && <div className="text-sm text-gray-500">DIAGNOSTIC</div>}
              </div>
              <div className="h-[calc(100%-20px)]">
                <RealisticWaveforms 
                  graphType="spo2"
                  vitalSigns={patientState}
                  isOperating={isOperating}
                />
              </div>
            </div>
          </div>
          
          {/* Правая колонка - пороги тревог и числовые показатели */}
          <div className="w-[25%] flex flex-col space-y-1">
            {/* ЧСС */}
            <div className="w-full h-1/3 flex space-x-1" style={{ maxWidth: '100%' }}>
              <div className="w-1/4" style={{ width: '25%' }}>
                <AlarmLimitsDisplay title="ЧСС" high="120" low="50" color="green-500" />
              </div>
              <div className="w-3/4" style={{ width: '75%' }}>
                <BaseVitalDisplay
                  title="ЧСС"
                  value={patientState.hr}
                  unit="уд/мин"
                  color="green-500"
                  alarmHigh={120}
                  alarmLow={50}
                  valueFontSize="text-5xl"
                />
              </div>
            </div>
            
            {/* ЧД */}
            <div className="w-full h-1/3 flex space-x-1" style={{ maxWidth: '100%' }}>
              <div className="w-1/4" style={{ width: '25%' }}>
                <AlarmLimitsDisplay title="ЧД" high="35" low="8" color="yellow-400" />
              </div>
              <div className="w-3/4" style={{ width: '75%' }}>
                <BaseVitalDisplay
                  title="ЧД"
                  value={patientState.rr}
                  unit="вд/мин"
                  color="yellow-400"
                  alarmHigh={35}
                  alarmLow={8}
                  valueFontSize="text-5xl"
                />
              </div>
            </div>
            
            {/* SpO2 */}
            <div className="w-full h-1/3 flex space-x-1" style={{ maxWidth: '100%' }}>
              <div className="w-1/4" style={{ width: '25%' }}>
                <AlarmLimitsDisplay title="SpO2" high="100" low="90" color="cyan-400" />
              </div>
              <div className="w-3/4" style={{ width: '75%' }}>
                <BaseVitalDisplay
                  title="SpO2"
                  value={patientState.spo2}
                  unit="%"
                  color="cyan-400"
                  alarmHigh={100}
                  alarmLow={90}
                  valueFontSize="text-5xl"
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Средняя и нижняя секции - изменена структура согласно требованиям */}
        <div className="flex h-[35%] space-x-1">
          {/* Левая колонка - кнопки быстрых действий и история тревог */}
          <div className="w-[30%] flex flex-col space-y-1">
            {/* Кнопки быстрых действий */}
            <div className="h-[33%]">
              <QuickActionsPanel 
                onIntubate={handleIntubate}
                onStartCPR={handleStartCPR}
                onStopCPR={handleStopCPR}
                onLoadScenarios={onLoadScenarios}
                onOpenMedicationsPanel={() => setShowMedicationsPanel(true)}
                showCPRControls={isCPRInProgress}
              />
            </div>
            
            {/* История тревог */}
            <div className="h-[67%]">
              <AlarmHistory alarms={alarmHistory} />
            </div>
          </div>
          
          {/* Средняя колонка - мини-игры и подсказки */}
          <div className="w-[45%] h-full border-2 border-gray-600 rounded bg-black">
            <div className="flex items-center justify-center h-full">
              <div className="text-center text-gray-500">Место для будущих мини-игр и подсказок</div>
            </div>
          </div>
          
          {/* Правая колонка - АД, Температура и EtCO2 */}
          <div className="w-[25%] flex flex-col space-y-1" style={{ maxWidth: '30%' }}>
            {/* АД */}
            <div className="w-full h-[60%] flex space-x-1" style={{ maxWidth: '100%' }}>
              <div className="w-1/4" style={{ width: '25%' }}>
                <AlarmLimitsDisplay title="АД" high="160" low="90" color="white" />
              </div>
              <div className="w-3/4" style={{ width: '75%' }}>
                <BaseVitalDisplay
                  title="АД"
                  value={patientState.systolic !== '--' && patientState.diastolic !== '--' ? `${patientState.systolic}/${patientState.diastolic}` : '--'}
                  unit="мм рт.ст."
                  color="white"
                  alarmHigh={160}
                  alarmLow={90}
                  valueFontSize="text-3xl"
                />
              </div>
            </div>
            
            {/* Температура и EtCO2 - уравнены с шириной выше */}
            <div className="w-full h-[40%] flex space-x-1" style={{ maxWidth: '100%' }}>
              <div className="w-1/2" style={{ width: '50%', maxWidth: '50%' }}>
                <BaseVitalDisplay
                  title="ТЕМП"
                  value={patientState.temperature?.toFixed(1) || '--'}
                  unit="°C"
                  color="purple-600"
                  alarmHigh={38.5}
                  alarmLow={35.5}
                  valueFontSize="text-3xl"
                  className="temperature-display"
                />
              </div>
              <div className="w-1/2" style={{ width: '50%', maxWidth: '50%' }}>
                <BaseVitalDisplay
                  title="EtCO2"
                  value={patientState.etco2 || '--'}
                  unit="мм рт.ст."
                  color="blue-500"
                  alarmHigh={45}
                  alarmLow={30}
                  valueFontSize="text-3xl"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Модальные окна */}
      {showMedicationsPanel && (
        <MedicationsPanel
          onClose={() => setShowMedicationsPanel(false)}
          onApplyMedication={onApplyMedication}
          isOperating={isOperating}
        />
      )}
    </div>
  );
};

export default EnhancedPatientMonitor;