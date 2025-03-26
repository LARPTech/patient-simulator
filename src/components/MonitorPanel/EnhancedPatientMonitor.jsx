import React, { useState, useEffect, useRef, useCallback } from 'react';
import RealisticWaveforms from './RealisticWaveforms';
// Импортируем компоненты из предыдущих реализаций
// В реальном приложении здесь будут импорты файлов
// import PhysiologicalModel from './physiological-model';
// import RealisticWaveforms from './realistic-waveforms';
// import ClinicalScenarios from './clinical-scenarios';

// Компонент для отображения показателя EtCO2 (концентрации CO2 в конце выдоха)
const EtCO2Display = ({ value = '--', alarmHigh = 45, alarmLow = 30 }) => {
  const [alarmMuted, setAlarmMuted] = useState(false);
  const isAlarm = typeof value === 'number' && (value > alarmHigh || value < alarmLow);
  
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm text-blue-400">EtCO2</div>
        <button 
          onClick={() => setAlarmMuted(!alarmMuted)}
          className="w-8 h-8 flex items-center justify-center border border-blue-800 rounded"
        >
          <span className="text-xl">{alarmMuted ? '🔇' : '🔊'}</span>
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className={`text-6xl font-bold ${isAlarm ? 'text-red-600' : 'text-purple-500'}`}>
          {value}
        </div>
        <div className="text-sm text-blue-400">мм рт.ст.</div>
      </div>
    </div>
  );
};

// Компонент для отображения температуры
const TempDisplay = ({ value = '--', alarmHigh = 38.5, alarmLow = 35.5 }) => {
  const [alarmMuted, setAlarmMuted] = useState(false);
  const isAlarm = typeof value === 'number' && (value > alarmHigh || value < alarmLow);
  
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between items-center mb-1">
        <div className="text-sm text-blue-400">ТЕМП</div>
        <button 
          onClick={() => setAlarmMuted(!alarmMuted)}
          className="w-8 h-8 flex items-center justify-center border border-blue-800 rounded"
        >
          <span className="text-xl">{alarmMuted ? '🔇' : '🔊'}</span>
        </button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center">
        <div className={`text-6xl font-bold ${isAlarm ? 'text-red-600' : 'text-red-400'}`}>
          {value}
        </div>
        <div className="text-sm text-blue-400">°C</div>
      </div>
    </div>
  );
};

// Компонент для отображения графика капнографии (EtCO2)
const CapnographyWaveform = ({ etco2Value = 35, respirationRate = 14, isOperating = true }) => {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const [time, setTime] = useState(0);
  
  // Функция для генерации точки на графике капнографии
  const generateCapnographyPoint = (t, etco2, rr) => {
    // Период одного дыхательного цикла в секундах
    const period = 60 / rr;
    
    // Позиция в цикле
    const position = (t % period) / period;
    
    if (position < 0.05) {
      // Фаза 1: Быстрое повышение CO2 (начало выдоха)
      return (position / 0.05) * etco2;
    } else if (position < 0.25) {
      // Фаза 2: Плато CO2 (выдох)
      return etco2;
    } else if (position < 0.35) {
      // Фаза 3: Быстрое снижение CO2 (начало вдоха)
      return etco2 * (1 - ((position - 0.25) / 0.1));
    } else {
      // Фаза 4: Базовая линия (вдох)
      return 0;
    }
  };
  
  // Эффект для анимации графика
  useEffect(() => {
    if (!canvasRef.current || !isOperating) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Параметры отображения
    const secondsToShow = 10; // Показываем 10 секунд капнографии
    const sampleRate = 30;    // 30 точек на секунду
    const timeStep = 1 / sampleRate;
    
    // Функция анимации
    const animate = () => {
      // Очистка холста
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, width, height);
      
      // Отрисовка сетки
      ctx.strokeStyle = '#333333';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      
      // Вертикальные линии времени
      for (let i = 1; i < 10; i++) {
        const x = i * (width / 10);
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
      
      // Горизонтальные линии для значений EtCO2
      const levels = [0, 20, 40, 60, 80];
      levels.forEach(level => {
        const y = height - (level / 80) * height;
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
        
        // Метки значений
        ctx.fillStyle = '#ffffff';
        ctx.font = '10px Arial';
        ctx.fillText(`${level}`, 5, y - 5);
      });
      
      // Сброс прозрачности и пунктира
      ctx.globalAlpha = 1.0;
      ctx.setLineDash([]);
      
      // Если не в режиме работы, не рисуем график
      if (!isOperating) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }
      
      // Отрисовка графика
      ctx.strokeStyle = '#a855f7'; // Пурпурный цвет для капнографии
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const pointsToShow = sampleRate * secondsToShow;
      const timeWindow = secondsToShow;
      
      for (let i = 0; i < pointsToShow; i++) {
        const t = time - timeWindow + (i / sampleRate);
        const value = generateCapnographyPoint(t, etco2Value, respirationRate);
        
        // Преобразуем в координаты холста
        const x = (i / pointsToShow) * width;
        const y = height - (value / 80) * height;
        
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
  }, [canvasRef, time, isOperating, etco2Value, respirationRate]);
  
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between">
        <div className="text-sm text-blue-400">КАПНОГРАФИЯ</div>
        {!isOperating && <div className="text-sm text-gray-500">DIAGNOSTIC</div>}
      </div>
      <div className="flex-1 mt-1">
        <canvas 
          ref={canvasRef} 
          className="w-full h-full"
          width={600}
          height={150}
        />
      </div>
    </div>
  );
};

// Компонент индикатора статуса пациента
const PatientStatusIndicator = ({ status }) => {
  const statusInfo = {
    stable: {
      label: 'Стабильный',
      color: 'bg-green-500',
      description: 'Показатели в пределах нормы'
    },
    unstable: {
      label: 'Нестабильный',
      color: 'bg-yellow-500',
      description: 'Есть отклонения от нормы'
    },
    critical: {
      label: 'Критический',
      color: 'bg-red-500',
      description: 'Требуется немедленное вмешательство'
    },
    arrestImminent: {
      label: 'Предостановка',
      color: 'bg-red-600',
      description: 'Высокий риск остановки сердца'
    },
    arrest: {
      label: 'Остановка',
      color: 'bg-red-700',
      description: 'Проводится реанимация'
    }
  };
  
  const currentStatus = statusInfo[status] || statusInfo.stable;
  
  return (
    <div className="flex items-center space-x-2 p-2 border-2 border-gray-600 rounded bg-black">
      <div className={`w-4 h-4 rounded-full ${currentStatus.color}`}></div>
      <div>
        <div className="text-sm font-medium">{currentStatus.label}</div>
        <div className="text-xs text-gray-400">{currentStatus.description}</div>
      </div>
    </div>
  );
};

// Компонент отображения истории тревог
const AlarmHistory = ({ alarms = [] }) => {
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full overflow-hidden">
      <div className="text-sm text-blue-400 mb-2">История тревог</div>
      <div className="flex-1 overflow-y-auto">
        {alarms.length === 0 ? (
          <div className="text-center text-gray-500 py-4">Нет активных тревог</div>
        ) : (
          <div className="space-y-2">
            {alarms.map((alarm, index) => (
              <div key={index} className="flex items-center p-1 border-b border-gray-800">
                <div className={`w-3 h-3 rounded-full ${
                  alarm.severity === 'high' ? 'bg-red-500' : 
                  alarm.severity === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                } mr-2`}></div>
                <div>
                  <div className="text-sm">{alarm.message}</div>
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

// Кнопка быстрого доступа к функциям
const QuickActionButton = ({ icon, label, onClick }) => {
  return (
    <button 
      className="flex flex-col items-center justify-center bg-blue-900 hover:bg-blue-800 text-white p-2 rounded"
      onClick={onClick}
    >
      <span className="text-xl mb-1">{icon}</span>
      <span className="text-xs">{label}</span>
    </button>
  );
};

// Панель быстрых действий
const QuickActionsPanel = ({ 
  onIntubate, 
  onDefibrillate,
  onStartCPR,
  onStopCPR,
  onLoadScenarios,
  showCPRControls = false
}) => {
  return (
    <div className="grid grid-cols-6 gap-2 p-2 border-2 border-gray-600 rounded bg-black">
      <QuickActionButton 
        icon="🔄" 
        label="Сценарии" 
        onClick={onLoadScenarios}
      />
      <QuickActionButton 
        icon="💉" 
        label="Лекарства" 
        onClick={() => console.log("Открыть панель лекарств")}
      />
      <QuickActionButton 
        icon="🧪" 
        label="Анализы" 
        onClick={() => console.log("Открыть панель анализов")}
      />
      <QuickActionButton 
        icon="📋" 
        label="Записи" 
        onClick={() => console.log("Открыть записи пациента")}
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
    </div>
  );
};

// Основной компонент улучшенного монитора
const EnhancedPatientMonitor = () => {
  const [dateTime, setDateTime] = useState(new Date());
  const [isOperating, setIsOperating] = useState(false);
  const [showControlPanel, setShowControlPanel] = useState(false);
  const [showScenariosPanel, setShowScenariosPanel] = useState(false);
  const [patientStatus, setPatientStatus] = useState('stable');
  const [isCPRInProgress, setIsCPRInProgress] = useState(false);
  const [isIntubated, setIsIntubated] = useState(false);
  
  // Состояние пациента с расширенным набором показателей
  const [vitalSigns, setVitalSigns] = useState({
    hr: '--',
    rr: '--',
    spo2: '--',
    systolic: '--',
    diastolic: '--',
    temperature: 36.6,
    etco2: '--',
    cardiac_output: '--',
    stroke_volume: '--',
    intubated: false
  });
  
  // История тревог
  const [alarmHistory, setAlarmHistory] = useState([]);
  
  // Физиологическая модель (в реальном приложении была бы импортирована)
  const physiologicalModelRef = useRef(null);
  
  // Эффект для инициализации физиологической модели
  useEffect(() => {
    // В реальном приложении здесь был бы импорт и инициализация модели
    // physiologicalModelRef.current = new PhysiologicalModel();
    
    // Вместо этого имитируем модель для демонстрации
    const simulatePhysiologicalModel = {
      state: {
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
      },
      
      startSimulation() {
        console.log("Simulation started");
        return this;
      },
      
      stopSimulation() {
        console.log("Simulation stopped");
        return this;
      },
      
      getState() {
        return { ...this.state };
      },
      
      updatePhysiology() {
        // Имитация обновления для демонстрации
        this.state.hr += (Math.random() * 4 - 2);
        this.state.rr += (Math.random() * 2 - 1);
        this.state.spo2 += (Math.random() * 2 - 1);
        this.state.systolic += (Math.random() * 4 - 2);
        this.state.diastolic += (Math.random() * 4 - 2);
        this.state.temperature += (Math.random() * 0.2 - 0.1);
        this.state.etco2 += (Math.random() * 2 - 1);
        
        // Ограничиваем значения
        this.state.hr = Math.max(30, Math.min(200, this.state.hr));
        this.state.rr = Math.max(5, Math.min(40, this.state.rr));
        this.state.spo2 = Math.max(60, Math.min(100, this.state.spo2));
        this.state.systolic = Math.max(60, Math.min(220, this.state.systolic));
        this.state.diastolic = Math.max(30, Math.min(140, this.state.diastolic));
        this.state.temperature = Math.max(35, Math.min(42, this.state.temperature));
        this.state.etco2 = Math.max(15, Math.min(80, this.state.etco2));
        
        return { ...this.state };
      },
      
      applyScenario(scenario, params = {}) {
        console.log(`Applying scenario: ${scenario}`, params);
        
        // Симуляция изменения состояния на основе выбранного сценария
        switch(scenario) {
          case 'hypoxia':
            this.state.spo2 = 88;
            this.state.rr = 22;
            break;
          case 'bradycardia':
            this.state.hr = 40;
            break;
          case 'tachycardia':
            this.state.hr = 140;
            break;
          case 'hypotension':
            this.state.systolic = 80;
            this.state.diastolic = 50;
            this.state.hr = 100;
            break;
          case 'hypertension':
            this.state.systolic = 180;
            this.state.diastolic = 110;
            break;
          case 'respiratory_distress':
            this.state.rr = 30;
            this.state.spo2 = 85;
            this.state.etco2 = 50;
            break;
          case 'bleeding':
            this.state.hr = 130;
            this.state.systolic = 90;
            this.state.diastolic = 60;
            break;
          case 'cardiac_arrest':
            this.state.hr = 0;
            this.state.systolic = 0;
            this.state.diastolic = 0;
            this.state.rr = 0;
            this.state.spo2 = 60;
            this.state.etco2 = 15;
            break;
          default:
            // Нормальное состояние
            this.state.hr = 72;
            this.state.rr = 14;
            this.state.spo2 = 98;
            this.state.systolic = 120;
            this.state.diastolic = 80;
            this.state.temperature = 36.6;
            this.state.etco2 = 35;
            break;
        }
        
        // Возвращаем обновленное состояние
        return { ...this.state };
      },
      
      intubate(success = true) {
        this.state.intubated = success;
        if (success) {
          if (this.state.spo2 < 95) {
            this.state.spo2 += 5;
          }
          this.state.etco2 = 35;
        }
        return { ...this.state };
      },
      
      applyMedication(medication, dose) {
        console.log(`Applying medication: ${medication}, dose: ${dose}`);
        
        // Симуляция эффекта лекарства
        switch(medication) {
          case 'epinephrine':
            this.state.hr += 25;
            this.state.systolic += 30;
            this.state.diastolic += 15;
            break;
          case 'atropine':
            this.state.hr += 20;
            break;
          case 'norepinephrine':
            this.state.systolic += 40;
            this.state.diastolic += 20;
            break;
          // Другие лекарства...
        }
        
        return { ...this.state };
      },
      
      startCPR() {
        this.state.etco2 += 10;
        if (this.state.hr === 0) {
          this.state.hr = 40;
        }
        return { ...this.state };
      },
      
      stopCPR() {
        if (this.state.hr < 60) {
          this.state.hr -= 10;
        }
        this.state.etco2 -= 10;
        return { ...this.state };
      }
    };
    
    physiologicalModelRef.current = simulatePhysiologicalModel;
    
    // Очистка при размонтировании
    return () => {
      if (physiologicalModelRef.current) {
        physiologicalModelRef.current.stopSimulation();
      }
    };
  }, []);
  
  // Эффект для обновления времени
  useEffect(() => {
    const timer = setInterval(() => {
      setDateTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  
  // Эффект для симуляции физиологии
  useEffect(() => {
    let simulationInterval;
    
    if (isOperating && physiologicalModelRef.current) {
      // Запускаем симуляцию физиологии
      physiologicalModelRef.current.startSimulation();
      
      // Начальное состояние
      updateVitalSigns();
      
      // Регулярное обновление состояния
      simulationInterval = setInterval(() => {
        updateVitalSigns();
        
        // Проверка тревог
        checkAlarms();
        
        // Обновление статуса пациента
        updatePatientStatus();
      }, 2000);
    } else if (physiologicalModelRef.current) {
      // Останавливаем симуляцию
      physiologicalModelRef.current.stopSimulation();
      
      // Сбрасываем показатели
      setVitalSigns({
        hr: '--',
        rr: '--',
        spo2: '--',
        systolic: '--',
        diastolic: '--',
        temperature: 36.6,
        etco2: '--',
        cardiac_output: '--',
        stroke_volume: '--',
        intubated: false
      });
      
      // Сбрасываем тревоги
      setAlarmHistory([]);
      
      // Сбрасываем статус пациента
      setPatientStatus('stable');
    }
    
    return () => clearInterval(simulationInterval);
  }, [isOperating]);
  
  // Функция обновления жизненных показателей
  const updateVitalSigns = () => {
    if (physiologicalModelRef.current) {
      const newState = physiologicalModelRef.current.updatePhysiology();
      setVitalSigns(newState);
      setIsIntubated(newState.intubated);
    }
  };
  
  // Функция проверки тревог
  const checkAlarms = () => {
    if (!physiologicalModelRef.current) return;
    
    const state = physiologicalModelRef.current.getState();
    const newAlarms = [];
    
    // Форматирование времени для тревоги
    const alarmTime = new Intl.DateTimeFormat('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    }).format(new Date());
    
    // Проверка показателей и добавление тревог
    if (state.hr !== '--') {
      if (state.hr > 120) {
        newAlarms.push({
          severity: 'medium',
          message: `ЧСС высокая: ${Math.round(state.hr)} уд/мин`,
          time: alarmTime
        });
      } else if (state.hr < 50) {
        newAlarms.push({
          severity: 'high',
          message: `ЧСС низкая: ${Math.round(state.hr)} уд/мин`,
          time: alarmTime
        });
      }
    }
    
    if (state.spo2 !== '--' && state.spo2 < 90) {
      newAlarms.push({
        severity: 'high',
        message: `SpO2 низкий: ${Math.round(state.spo2)}%`,
        time: alarmTime
      });
    }
    
    if (state.systolic !== '--') {
      if (state.systolic > 160) {
        newAlarms.push({
          severity: 'medium',
          message: `АД высокое: ${Math.round(state.systolic)}/${Math.round(state.diastolic)} мм рт.ст.`,
          time: alarmTime
        });
      } else if (state.systolic < 90) {
        newAlarms.push({
          severity: 'high',
          message: `АД низкое: ${Math.round(state.systolic)}/${Math.round(state.diastolic)} мм рт.ст.`,
          time: alarmTime
        });
      }
    }
    
    if (state.temperature > 38.5) {
      newAlarms.push({
        severity: 'medium',
        message: `Температура повышена: ${state.temperature.toFixed(1)}°C`,
        time: alarmTime
      });
    } else if (state.temperature < 35.5) {
      newAlarms.push({
        severity: 'medium',
        message: `Температура понижена: ${state.temperature.toFixed(1)}°C`,
        time: alarmTime
      });
    }
    
    if (state.etco2 !== '--') {
      if (state.etco2 > 45) {
        newAlarms.push({
          severity: 'medium',
          message: `EtCO2 повышен: ${Math.round(state.etco2)} мм рт.ст.`,
          time: alarmTime
        });
      } else if (state.etco2 < 30) {
        newAlarms.push({
          severity: 'medium',
          message: `EtCO2 понижен: ${Math.round(state.etco2)} мм рт.ст.`,
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
  
  // Обновление статуса пациента
  const updatePatientStatus = () => {
    if (!physiologicalModelRef.current) return;
    
    const state = physiologicalModelRef.current.getState();
    
    // Определение статуса пациента
    if (state.hr === 0 || state.systolic === 0) {
      setPatientStatus('arrest');
    } else if (
      (typeof state.hr === 'number' && state.hr < 40) ||
      (typeof state.systolic === 'number' && state.systolic < 70) ||
      (typeof state.spo2 === 'number' && state.spo2 < 80)
    ) {
      setPatientStatus('arrestImminent');
    } else if (
      (typeof state.hr === 'number' && (state.hr < 50 || state.hr > 150)) ||
      (typeof state.systolic === 'number' && (state.systolic < 80 || state.systolic > 200)) ||
      (typeof state.spo2 === 'number' && state.spo2 < 90)
    ) {
      setPatientStatus('critical');
    } else if (
      (typeof state.hr === 'number' && (state.hr < 60 || state.hr > 120)) ||
      (typeof state.systolic === 'number' && (state.systolic < 100 || state.systolic > 160)) ||
      (typeof state.spo2 === 'number' && state.spo2 < 95)
    ) {
      setPatientStatus('unstable');
    } else {
      setPatientStatus('stable');
    }
  };
  
  // Форматирование даты и времени
  const formattedDateTime = new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  }).format(dateTime);
  
  // Обработчик запуска сценария
  const handleStartScenario = (scenarioKey, parameters) => {
    if (physiologicalModelRef.current && isOperating) {
      const updatedState = physiologicalModelRef.current.applyScenario(scenarioKey, parameters);
      setVitalSigns(updatedState);
      
      // Добавляем информацию о запуске сценария в историю тревог
      const scenarioNames = {
        hypoxia: 'Гипоксия',
        bradycardia: 'Брадикардия',
        tachycardia: 'Тахикардия',
        hypotension: 'Гипотензия',
        hypertension: 'Гипертензия',
        respiratory_distress: 'Дыхательная недостаточность',
        bleeding: 'Кровотечение',
        cardiac_arrest: 'Остановка сердца',
        normal: 'Нормализация'
      };
      
      setAlarmHistory(prev => [{
        severity: 'info',
        message: `Запущен сценарий: ${scenarioNames[scenarioKey] || scenarioKey}`,
        time: new Intl.DateTimeFormat('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(new Date())
      }, ...prev]);
    }
  };
  
  // Обработчик интубации
  const handleIntubate = () => {
    if (physiologicalModelRef.current && isOperating) {
      const success = true; // В реальном приложении здесь была бы проверка успешности
      const updatedState = physiologicalModelRef.current.intubate(success);
      setVitalSigns(updatedState);
      setIsIntubated(updatedState.intubated);
      
      // Добавляем информацию об интубации в историю
      setAlarmHistory(prev => [{
        severity: 'info',
        message: success ? 'Пациент успешно интубирован' : 'Неудачная попытка интубации',
        time: new Intl.DateTimeFormat('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(new Date())
      }, ...prev]);
    }
  };
  
  // Обработчик начала СЛР
  const handleStartCPR = () => {
    if (physiologicalModelRef.current && isOperating) {
      const updatedState = physiologicalModelRef.current.startCPR();
      setVitalSigns(updatedState);
      setIsCPRInProgress(true);
      
      // Добавляем информацию о начале СЛР в историю
      setAlarmHistory(prev => [{
        severity: 'high',
        message: 'Начата сердечно-легочная реанимация',
        time: new Intl.DateTimeFormat('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(new Date())
      }, ...prev]);
    }
  };
  
  // Обработчик остановки СЛР
  const handleStopCPR = () => {
    if (physiologicalModelRef.current && isOperating) {
      const updatedState = physiologicalModelRef.current.stopCPR();
      setVitalSigns(updatedState);
      setIsCPRInProgress(false);
      
      // Добавляем информацию об остановке СЛР в историю
      setAlarmHistory(prev => [{
        severity: 'info',
        message: 'Сердечно-легочная реанимация прекращена',
        time: new Intl.DateTimeFormat('ru-RU', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        }).format(new Date())
      }, ...prev]);
    }
  };
  
  // Дополнительная информация о пациенте
  const patientInfo = {
    name: "Пациент Тестовый",
    age: 45,
    gender: "Мужской",
    weight: 78,
    height: 176,
    bloodType: "A(II) Rh+",
    diagnosis: "Плановая операция"
  };
  
  return (
    <div className="flex flex-col h-screen bg-black text-white">
      {/* Верхняя панель */}
      <div className="h-12 bg-gray-900 flex justify-between items-center px-4">
        <div className="flex space-x-2">
          <button 
            className="bg-blue-900 text-white px-3 py-1 rounded text-sm"
            onClick={() => setShowControlPanel(true)}
          >
            Пациент
          </button>
          <button className="bg-blue-900 text-white px-3 py-1 rounded text-sm">
            Настройки монитора
          </button>
          <button className="bg-blue-900 text-white px-3 py-1 rounded text-sm">
            Настройки системы
          </button>
          <button className="bg-blue-900 text-white px-3 py-1 rounded text-sm">
            Печать
          </button>
          <button className="bg-blue-900 text-white px-3 py-1 rounded text-sm">
            Дополнительные функции
          </button>
        </div>
        
        <button 
          className={`px-4 py-1 rounded text-sm ${isOperating ? 'bg-red-800' : 'bg-green-800'}`}
          onClick={() => setIsOperating(!isOperating)}
        >
          {isOperating ? 'Завершить операцию' : 'Начало операции'}
        </button>
        
        <div className="text-white">{formattedDateTime}</div>
      </div>
      
      {/* Информация о пациенте и статус */}
      <div className="bg-gray-900 h-10 px-4 flex justify-between items-center">
        <div className="flex items-center space-x-4">
          <div className="text-sm">
            <span className="font-medium">{patientInfo.name}</span> | 
            <span className="ml-1">{patientInfo.age} лет, {patientInfo.gender}</span> | 
            <span className="ml-1">{patientInfo.weight} кг, {patientInfo.height} см</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {isIntubated && (
            <div className="px-2 py-0.5 bg-blue-900 text-sm rounded">
              Интубирован
            </div>
          )}
          {isCPRInProgress && (
            <div className="px-2 py-0.5 bg-red-900 text-sm rounded animate-pulse">
              СЛР в процессе
            </div>
          )}
          <PatientStatusIndicator status={patientStatus} />
        </div>
      </div>
      
      {/* Основная область */}
      <div className="flex-1 grid grid-cols-12 gap-1 p-1">
        {/* Область графиков (левая колонка) */}
        <div className="col-span-7 grid grid-rows-6 gap-1">
          {/* В реальном приложении здесь был бы компонент RealisticWaveforms */}
          <div className="row-span-2 border-2 border-gray-600 rounded bg-black">
            <div className="p-2 h-full">
              <div className="text-sm text-blue-400">ECG: II</div>
              <div className="text-center text-gray-500 mt-8">
                График ЭКГ
              </div>
            </div>
          </div>
          
          <div className="row-span-1 border-2 border-gray-600 rounded bg-black">
            <div className="p-2 h-full">
              <div className="text-sm text-blue-400">RESP</div>
              <div className="text-center text-gray-500 mt-4">
                График дыхания
              </div>
            </div>
          </div>
          
          <div className="row-span-1 border-2 border-gray-600 rounded bg-black">
            <div className="p-2 h-full">
              <div className="text-sm text-blue-400">SpO2</div>
              <div className="text-center text-gray-500 mt-4">
                График пульсоксиметрии
              </div>
            </div>
          </div>
          
          <div className="row-span-1">
            <CapnographyWaveform 
              etco2Value={vitalSigns.etco2 === '--' ? 35 : vitalSigns.etco2} 
              respirationRate={vitalSigns.rr === '--' ? 14 : vitalSigns.rr}
              isOperating={isOperating}
            />
          </div>
          
          <div className="row-span-1 grid grid-cols-3 gap-1">
            <QuickActionsPanel 
              onIntubate={handleIntubate}
              onStartCPR={handleStartCPR}
              onStopCPR={handleStopCPR}
              onLoadScenarios={() => setShowScenariosPanel(true)}
              showCPRControls={isCPRInProgress}
            />
            <div className="col-span-2">
              <AlarmHistory alarms={alarmHistory} />
            </div>
          </div>
        </div>
        
        {/* Область тревог (средняя колонка) */}
        <div className="col-span-1 grid grid-rows-6 gap-1">
          <div className="flex flex-col items-center bg-red-900 border-2 border-gray-600 rounded p-1 h-full">
            <div className="text-xs text-red-500 mb-1">ЧСС</div>
            <div className="flex-1"></div>
            <div className="text-sm text-red-500 font-bold">120</div>
            <div className="w-6 h-0.5 bg-red-500 my-1"></div>
            <div className="text-sm text-red-500 font-bold">50</div>
            <div className="flex-1"></div>
          </div>
          
          <div className="flex flex-col items-center bg-red-900 border-2 border-gray-600 rounded p-1 h-full">
            <div className="text-xs text-red-500 mb-1">ЧД</div>
            <div className="flex-1"></div>
            <div className="text-sm text-red-500 font-bold">35</div>
            <div className="w-6 h-0.5 bg-red-500 my-1"></div>
            <div className="text-sm text-red-500 font-bold">8</div>
            <div className="flex-1"></div>
          </div>
          
          <div className="flex flex-col items-center bg-red-900 border-2 border-gray-600 rounded p-1 h-full">
            <div className="text-xs text-red-500 mb-1">SpO2</div>
            <div className="flex-1"></div>
            <div className="text-sm text-red-500 font-bold">100</div>
            <div className="w-6 h-0.5 bg-red-500 my-1"></div>
            <div className="text-sm text-red-500 font-bold">90</div>
            <div className="flex-1"></div>
          </div>
          
          <div className="flex flex-col items-center bg-red-900 border-2 border-gray-600 rounded p-1 h-full">
            <div className="text-xs text-red-500 mb-1">АД</div>
            <div className="flex-1"></div>
            <div className="text-sm text-red-500 font-bold">160</div>
            <div className="w-6 h-0.5 bg-red-500 my-1"></div>
            <div className="text-sm text-red-500 font-bold">90</div>
            <div className="flex-1"></div>
          </div>
          
          <div className="flex flex-col items-center bg-red-900 border-2 border-gray-600 rounded p-1 h-full">
            <div className="text-xs text-red-500 mb-1">EtCO2</div>
            <div className="flex-1"></div>
            <div className="text-sm text-red-500 font-bold">45</div>
            <div className="w-6 h-0.5 bg-red-500 my-1"></div>
            <div className="text-sm text-red-500 font-bold">30</div>
            <div className="flex-1"></div>
          </div>
          
          <div className="flex flex-col items-center bg-red-900 border-2 border-gray-600 rounded p-1 h-full">
            <div className="text-xs text-red-500 mb-1">ТЕМП</div>
            <div className="flex-1"></div>
            <div className="text-sm text-red-500 font-bold">38.5</div>
            <div className="w-6 h-0.5 bg-red-500 my-1"></div>
            <div className="text-sm text-red-500 font-bold">35.5</div>
            <div className="flex-1"></div>
          </div>
        </div>
        
        {/* Область числовых показателей (правая колонка) */}
        <div className="col-span-4 grid grid-rows-6 gap-1">
          <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm text-blue-400">ЧСС</div>
              <button className="w-8 h-8 flex items-center justify-center border border-blue-800 rounded">
                <span className="text-xl">🔊</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={`text-6xl font-bold ${
                typeof vitalSigns.hr === 'number' && (vitalSigns.hr > 120 || vitalSigns.hr < 50) 
                  ? 'text-red-600' : 'text-green-500'
              }`}>
                {vitalSigns.hr}
              </div>
              <div className="text-sm text-blue-400">уд/мин</div>
            </div>
          </div>
          
          <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm text-blue-400">ЧД</div>
              <button className="w-8 h-8 flex items-center justify-center border border-blue-800 rounded">
                <span className="text-xl">🔊</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={`text-6xl font-bold ${
                typeof vitalSigns.rr === 'number' && (vitalSigns.rr > 35 || vitalSigns.rr < 8) 
                  ? 'text-red-600' : 'text-yellow-400'
              }`}>
                {vitalSigns.rr}
              </div>
              <div className="text-sm text-blue-400">вд/мин</div>
            </div>
          </div>
          
          <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm text-blue-400">SpO2</div>
              <button className="w-8 h-8 flex items-center justify-center border border-blue-800 rounded">
                <span className="text-xl">🔊</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={`text-6xl font-bold ${
                typeof vitalSigns.spo2 === 'number' && vitalSigns.spo2 < 90
                  ? 'text-red-600' : 'text-cyan-400'
              }`}>
                {vitalSigns.spo2}
              </div>
              <div className="text-sm text-blue-400">%</div>
            </div>
          </div>
          
          <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
            <div className="flex justify-between items-center mb-1">
              <div className="text-sm text-blue-400">АД</div>
              <button className="w-8 h-8 flex items-center justify-center border border-blue-800 rounded">
                <span className="text-xl">🔊</span>
              </button>
            </div>
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className={`text-5xl font-bold ${
                typeof vitalSigns.systolic === 'number' && (vitalSigns.systolic > 160 || vitalSigns.systolic < 90)
                  ? 'text-red-600' : 'text-orange-400'
              }`}>
                {vitalSigns.systolic}
              </div>
              <div className={`w-24 h-0.5 my-1 ${
                (typeof vitalSigns.systolic === 'number' && (vitalSigns.systolic > 160 || vitalSigns.systolic < 90)) ||
                (typeof vitalSigns.diastolic === 'number' && (vitalSigns.diastolic > 110 || vitalSigns.diastolic < 50))
                  ? 'bg-red-600' : 'bg-orange-400'
              }`}></div>
              <div className={`text-5xl font-bold ${
                typeof vitalSigns.diastolic === 'number' && (vitalSigns.diastolic > 110 || vitalSigns.diastolic < 50)
                  ? 'text-red-600' : 'text-orange-400'
              }`}>
                {vitalSigns.diastolic}
              </div>
              <div className="text-sm text-blue-400">
                {vitalSigns.systolic !== '--' && vitalSigns.diastolic !== '--' 
                  ? `(${Math.round((vitalSigns.systolic + 2 * vitalSigns.diastolic) / 3)})` 
                  : '(--)'} мм рт.ст.
              </div>
            </div>
          </div>
          
          <EtCO2Display value={vitalSigns.etco2} alarmHigh={45} alarmLow={30} />
          
          <TempDisplay value={vitalSigns.temperature} alarmHigh={38.5} alarmLow={35.5} />
        </div>
      </div>
      
      {/* Панели управления и диалоги */}
      {showControlPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-white font-bold">Управление пациентом</h2>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => setShowControlPanel(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              {/* Здесь в реальном приложении была бы форма управления с параметрами */}
              <div>
                <h3 className="text-lg text-white font-medium mb-3">Параметры пациента</h3>
                <p className="text-gray-400">В этой области будут отображаться слайдеры для настройки показателей пациента.</p>
              </div>
              
              <div>
                <h3 className="text-lg text-white font-medium mb-3">Клинические сценарии</h3>
                <p className="text-gray-400">Здесь будут кнопки для быстрого запуска клинических сценариев.</p>
                
                <div className="mt-4">
                  <button 
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
                    onClick={() => {
                      setShowControlPanel(false);
                      setShowScenariosPanel(true);
                    }}
                  >
                    Открыть библиотеку сценариев
                  </button>
                </div>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                onClick={() => setShowControlPanel(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Панель сценариев */}
      {showScenariosPanel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-4xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl text-white font-bold">Клинические сценарии</h2>
              <button
                className="text-gray-400 hover:text-white"
                onClick={() => setShowScenariosPanel(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="text-center text-gray-400 py-8">
              В реальном приложении здесь будет компонент ClinicalScenarios 
              для выбора и настройки клинических сценариев
            </div>
            
            <div className="mt-6 flex justify-end">
              <button
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                onClick={() => setShowScenariosPanel(false)}
              >
                Закрыть
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedPatientMonitor;