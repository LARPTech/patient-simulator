import React, { useState, useEffect, useRef } from 'react';

// Компонент для отображения диаграммы потока/давления/объема
const VentilationWaveform = ({ ventilationData, type, isOperating = true }) => {
  const canvasRef = useRef(null);
  const [time, setTime] = useState(0);
  const animationRef = useRef(null);
  
  // Определение цвета для графика в зависимости от типа
  const getWaveColor = () => {
    switch(type) {
      case 'pressure': return '#ffcc00'; // Желтый
      case 'flow': return '#00cc99';     // Зеленый
      case 'volume': return '#66aaff';   // Голубой
      default: return '#ffffff';         // Белый
    }
  };
  
  // Расчет точки на графике в зависимости от типа волны
  const calculatePoint = (t, data) => {
    const { rate, peep, peak, ie_ratio, tidal_volume } = data;
    
    // Рассчитываем периоды
    const totalCycleTime = 60 / rate; // Продолжительность полного цикла в секундах
    const inspirationTime = totalCycleTime / (1 + ie_ratio); // Длительность вдоха
    const expirationTime = totalCycleTime - inspirationTime; // Длительность выдоха
    
    // Относительное положение в цикле (от 0 до 1)
    const cyclePosition = (t % totalCycleTime) / totalCycleTime;
    
    // Разные формы волны для разных типов
    if (type === 'pressure') {
      // Волна давления - быстрый рост и плато, затем быстрое падение до PEEP
      if (cyclePosition < inspirationTime / totalCycleTime) {
        // Фаза вдоха - нарастание давления
        const inPosition = cyclePosition / (inspirationTime / totalCycleTime);
        if (inPosition < 0.3) {
          // Быстрое нарастание
          return peep + (peak - peep) * (inPosition / 0.3);
        } else {
          // Плато давления
          return peak;
        }
      } else {
        // Фаза выдоха - давление на уровне PEEP
        return peep;
      }
    } else if (type === 'flow') {
      // Волна потока - положительная при вдохе, отрицательная при выдохе
      if (cyclePosition < inspirationTime / totalCycleTime) {
        // Фаза вдоха - положительный поток
        const inPosition = cyclePosition / (inspirationTime / totalCycleTime);
        if (inPosition < 0.2) {
          // Нарастание потока
          return (inPosition / 0.2) * (tidal_volume / inspirationTime);
        } else if (inPosition < 0.8) {
          // Стабильный поток
          return tidal_volume / inspirationTime;
        } else {
          // Снижение потока
          return ((1 - inPosition) / 0.2) * (tidal_volume / inspirationTime);
        }
      } else {
        // Фаза выдоха - отрицательный поток
        const exPosition = (cyclePosition - inspirationTime / totalCycleTime) / (expirationTime / totalCycleTime);
        if (exPosition < 0.3) {
          // Максимальный пик выдоха
          return -1 * (tidal_volume / expirationTime) * (1 - exPosition / 0.3);
        } else {
          // Замедление выдоха
          return -1 * (tidal_volume / expirationTime) * (1 - exPosition);
        }
      }
    } else if (type === 'volume') {
      // Волна объема - нарастание при вдохе, спад при выдохе
      if (cyclePosition < inspirationTime / totalCycleTime) {
        // Фаза вдоха - объем нарастает
        const inPosition = cyclePosition / (inspirationTime / totalCycleTime);
        return tidal_volume * inPosition;
      } else {
        // Фаза выдоха - объем убывает
        const exPosition = (cyclePosition - inspirationTime / totalCycleTime) / (expirationTime / totalCycleTime);
        return tidal_volume * (1 - exPosition);
      }
    }
    
    return 0;
  };
  
  // Эффект для анимации графика
  useEffect(() => {
    if (!canvasRef.current || !isOperating) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;
    
    // Параметры отображения
    const secondsToShow = 10; // Показываем 10 секунд графика
    const sampleRate = 50;    // 50 точек на секунду
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
      
      // Горизонтальные линии для значений
      const levels = [0, 25, 50, 75, 100];
      levels.forEach(level => {
        const y = height - (level / 100) * height;
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
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
      ctx.strokeStyle = getWaveColor();
      ctx.lineWidth = 2;
      ctx.beginPath();
      
      const pointsToShow = sampleRate * secondsToShow;
      const timeWindow = secondsToShow;
      
      // Определяем минимальное и максимальное значения для нормализации
      let minValue = 0, maxValue = 1;
      
      if (type === 'pressure') {
        minValue = ventilationData.peep;
        maxValue = ventilationData.peak;
      } else if (type === 'flow') {
        const maxFlow = ventilationData.tidal_volume / (60 / ventilationData.rate / (1 + ventilationData.ie_ratio));
        minValue = -maxFlow;
        maxValue = maxFlow;
      } else if (type === 'volume') {
        minValue = 0;
        maxValue = ventilationData.tidal_volume;
      }
      
      // Охранная проверка от деления на ноль
      if (maxValue === minValue) {
        maxValue = minValue + 1;
      }
      
      for (let i = 0; i < pointsToShow; i++) {
        const t = time - timeWindow + (i / sampleRate);
        const value = calculatePoint(t, ventilationData);
        
        // Нормализуем значение к размеру холста
        const normalizedValue = (value - minValue) / (maxValue - minValue);
        
        // Преобразуем в координаты холста
        const x = (i / pointsToShow) * width;
        const y = height - normalizedValue * height * 0.8 - height * 0.1; // 10% отступ сверху и снизу
        
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
  }, [canvasRef, time, isOperating, type, ventilationData]);
  
  return (
    <div className="flex flex-col border-2 border-gray-600 rounded bg-black p-2 h-full">
      <div className="flex justify-between">
        <div className="text-sm text-blue-400">
          {type === 'pressure' ? 'ДАВЛЕНИЕ' : 
           type === 'flow' ? 'ПОТОК' : 'ОБЪЕМ'}
        </div>
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

// Компонент отображения параметра ИВЛ
const VentilationParameter = ({ label, value, unit, rangeMin, rangeMax }) => {
  // Определяем, находится ли значение в пределах нормы
  const isOutOfRange = value < rangeMin || value > rangeMax;
  
  return (
    <div className="flex flex-col items-center justify-center bg-gray-900 border-2 border-gray-700 rounded p-3">
      <div className="text-sm text-gray-400 mb-1">{label}</div>
      <div className={`text-2xl font-bold ${isOutOfRange ? 'text-red-500' : 'text-blue-400'}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500">{unit}</div>
    </div>
  );
};

// Компонент для настройки параметра ИВЛ
const VentilationControl = ({ label, value, unit, min, max, step, onChange }) => {
  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-gray-300">{label}</label>
        <span className="text-sm text-blue-400 font-bold">{value} {unit}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}</span>
        <span>{max} {unit}</span>
      </div>
    </div>
  );
};

// Основной компонент мониторинга ИВЛ
const VentilatorMonitor = ({ isOperating = true, patientData, onVentilatorChange }) => {
  // Начальные настройки вентилятора
  const [ventilatorSettings, setVentilatorSettings] = useState({
    mode: 'A/C', // Режим вентиляции (A/C, SIMV, CPAP и т.д.)
    rate: 12,    // Частота дыхания (вд/мин)
    peep: 5,     // Положительное давление конца выдоха (см H2O)
    peak: 25,    // Пиковое давление (см H2O)
    ie_ratio: 2, // Соотношение времени вдоха к выдоху (например, 1:2)
    fio2: 40,    // Концентрация кислорода (%)
    tidal_volume: 500, // Дыхательный объем (мл)
    pressure_support: 10, // Поддержка давлением (см H2O)
    trigger_sensitivity: -2 // Чувствительность триггера (см H2O)
  });
  
  // Измеряемые параметры (в реальном аппарате они бы считывались с датчиков)
  const [measuredParameters, setMeasuredParameters] = useState({
    minute_volume: 6.0,  // Минутный объем (л/мин)
    compliance: 50,      // Растяжимость легких (мл/см H2O)
    resistance: 5,       // Сопротивление дыхательных путей (см H2O/л/с)
    auto_peep: 0,        // Авто-PEEP (см H2O)
    plateau_pressure: 20, // Давление плато (см H2O)
    etco2: 35           // Концентрация CO2 в конце выдоха (мм рт.ст.)
  });
  
  // Режимы вентиляции
  const ventilationModes = [
    { value: 'A/C', label: 'Вспомогательно-управляемая (A/C)' },
    { value: 'SIMV', label: 'Синхронизированная перемежающаяся (SIMV)' },
    { value: 'CPAP', label: 'Постоянное положительное давление (CPAP)' },
    { value: 'PSV', label: 'Вентиляция с поддержкой давлением (PSV)' },
    { value: 'PRVC', label: 'Регулируемая по объему и давлению (PRVC)' },
    { value: 'APRV', label: 'Вентиляция с освобождением давления (APRV)' }
  ];
  
  // Обновление настроек вентилятора при изменении патологии пациента
  useEffect(() => {
    if (!patientData || !isOperating) return;
    
    // Обновляем измеряемые параметры на основе состояния пациента
    const updateMeasuredParameters = () => {
      // В реальном приложении здесь была бы логика расчета на основе модели легких
      // и настроек вентилятора
      
      const newParameters = { ...measuredParameters };
      
      // Расчет минутного объема
      newParameters.minute_volume = (ventilatorSettings.rate * ventilatorSettings.tidal_volume / 1000).toFixed(1);
      
      // Расчет давления плато (чуть ниже пикового)
      newParameters.plateau_pressure = Math.round(ventilatorSettings.peak * 0.8);
      
      // Если пациент в критическом состоянии или есть гипоксия, меняем параметры
      if (patientData.spo2 < 90) {
        newParameters.compliance = Math.max(20, measuredParameters.compliance - 10);
        newParameters.resistance = Math.min(20, measuredParameters.resistance + 5);
        newParameters.auto_peep = Math.min(5, measuredParameters.auto_peep + 1);
      } else {
        // Возвращение к более нормальным значениям
        newParameters.compliance = Math.min(60, measuredParameters.compliance + 5);
        newParameters.resistance = Math.max(5, measuredParameters.resistance - 2);
        newParameters.auto_peep = Math.max(0, measuredParameters.auto_peep - 1);
      }
      
      // EtCO2 обычно коррелирует с состоянием пациента
      if (patientData.etco2) {
        newParameters.etco2 = patientData.etco2;
      }
      
      setMeasuredParameters(newParameters);
    };
    
    updateMeasuredParameters();
    
    // Автоматически корректируем настройки вентилятора, если SpO2 падает
    if (patientData.spo2 < 90 && ventilatorSettings.fio2 < 80) {
      setVentilatorSettings(prev => ({
        ...prev,
        fio2: Math.min(100, prev.fio2 + 10),
        peep: Math.min(15, prev.peep + 2)
      }));
    }
    
    // Автоматически повышаем ЧД если EtCO2 растет
    if (patientData.etco2 > 45 && ventilatorSettings.rate < 20) {
      setVentilatorSettings(prev => ({
        ...prev,
        rate: Math.min(30, prev.rate + 2)
      }));
    }
    
  }, [patientData, isOperating]);
  
  // Обработчик изменения настроек вентилятора
  const handleSettingChange = (setting, value) => {
    const newSettings = { ...ventilatorSettings, [setting]: value };
    setVentilatorSettings(newSettings);
    
    // Уведомляем родительский компонент об изменении настроек
    if (onVentilatorChange) {
      onVentilatorChange(newSettings);
    }
  };
  
  // Панель управления вентилятором
  const VentilatorControlPanel = () => {
    const [showPanel, setShowPanel] = useState(false);
    
    return (
      <>
        <button 
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 w-full"
          onClick={() => setShowPanel(true)}
        >
          Настройки вентилятора
        </button>
        
        {showPanel && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75">
            <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl text-white font-bold">Настройки вентилятора</h2>
                <button
                  className="text-gray-400 hover:text-white"
                  onClick={() => setShowPanel(false)}
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <label className="text-sm text-gray-300 mb-1 block">Режим вентиляции</label>
                <select
                  value={ventilatorSettings.mode}
                  onChange={(e) => handleSettingChange('mode', e.target.value)}
                  className="w-full p-2 bg-gray-700 text-white rounded"
                >
                  {ventilationModes.map(mode => (
                    <option key={mode.value} value={mode.value}>
                      {mode.label}
                    </option>
                  ))}
                </select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg text-white font-medium mb-3">Основные параметры</h3>
                  
                  <VentilationControl
                    label="Частота дыханий"
                    value={ventilatorSettings.rate}
                    unit="вд/мин"
                    min={5}
                    max={40}
                    step={1}
                    onChange={(value) => handleSettingChange('rate', value)}
                  />
                  
                  <VentilationControl
                    label="Дыхательный объем"
                    value={ventilatorSettings.tidal_volume}
                    unit="мл"
                    min={200}
                    max={1000}
                    step={50}
                    onChange={(value) => handleSettingChange('tidal_volume', value)}
                  />
                  
                  <VentilationControl
                    label="ПДКВ (PEEP)"
                    value={ventilatorSettings.peep}
                    unit="см H₂O"
                    min={0}
                    max={20}
                    step={1}
                    onChange={(value) => handleSettingChange('peep', value)}
                  />
                  
                  <VentilationControl
                    label="Пиковое давление"
                    value={ventilatorSettings.peak}
                    unit="см H₂O"
                    min={10}
                    max={50}
                    step={1}
                    onChange={(value) => handleSettingChange('peak', value)}
                  />
                </div>
                
                <div>
                  <h3 className="text-lg text-white font-medium mb-3">Дополнительные параметры</h3>
                  
                  <VentilationControl
                    label="FiO₂ (Концентрация O₂)"
                    value={ventilatorSettings.fio2}
                    unit="%"
                    min={21}
                    max={100}
                    step={1}
                    onChange={(value) => handleSettingChange('fio2', value)}
                  />
                  
                  <VentilationControl
                    label="Соотношение вдох:выдох"
                    value={ventilatorSettings.ie_ratio}
                    unit=":1"
                    min={1}
                    max={4}
                    step={0.1}
                    onChange={(value) => handleSettingChange('ie_ratio', value)}
                  />
                  
                  <VentilationControl
                    label="Поддержка давлением"
                    value={ventilatorSettings.pressure_support}
                    unit="см H₂O"
                    min={0}
                    max={30}
                    step={1}
                    onChange={(value) => handleSettingChange('pressure_support', value)}
                  />
                  
                  <VentilationControl
                    label="Чувствительность триггера"
                    value={ventilatorSettings.trigger_sensitivity}
                    unit="см H₂O"
                    min={-5}
                    max={0}
                    step={0.5}
                    onChange={(value) => handleSettingChange('trigger_sensitivity', value)}
                  />
                </div>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  onClick={() => setShowPanel(false)}
                >
                  Применить и закрыть
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  };
  
  return (
    <div className="bg-gray-900 border-2 border-gray-700 rounded-lg p-4">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <h2 className="text-xl text-white font-bold">Мониторинг ИВЛ</h2>
          <span className={`ml-3 px-2 py-1 text-xs rounded-full ${
            isOperating ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
          }`}>
            {isOperating ? 'Активен' : 'Ожидание'}
          </span>
        </div>
        
        <div className="flex items-center">
          <div className="mr-4 text-sm">
            <span className="text-gray-400">Режим:</span>
            <span className="ml-1 text-blue-400 font-semibold">{ventilatorSettings.mode}</span>
          </div>
          <div className="text-sm">
            <span className="text-gray-400">FiO₂:</span>
            <span className="ml-1 text-blue-400 font-semibold">{ventilatorSettings.fio2}%</span>
          </div>
        </div>
      </div>
      
      {/* Графики вентиляции */}
      <div className="grid grid-cols-1 gap-3 mb-4">
        <VentilationWaveform 
          ventilationData={ventilatorSettings}
          type="pressure"
          isOperating={isOperating}
        />
        <VentilationWaveform 
          ventilationData={ventilatorSettings}
          type="flow"
          isOperating={isOperating}
        />
        <VentilationWaveform 
          ventilationData={ventilatorSettings}
          type="volume"
          isOperating={isOperating}
        />
      </div>
      
      {/* Измеряемые параметры */}
      <div className="mb-4">
        <h3 className="text-sm text-gray-400 mb-2">Измеряемые параметры</h3>
        <div className="grid grid-cols-3 gap-3">
          <VentilationParameter 
            label="МОД"
            value={measuredParameters.minute_volume}
            unit="л/мин"
            rangeMin={4}
            rangeMax={12}
          />
          <VentilationParameter 
            label="Растяжимость"
            value={measuredParameters.compliance}
            unit="мл/см H₂O"
            rangeMin={30}
            rangeMax={80}
          />
          <VentilationParameter 
            label="Сопротивление"
            value={measuredParameters.resistance}
            unit="см H₂O/л/с"
            rangeMin={0}
            rangeMax={15}
          />
          <VentilationParameter 
            label="Авто-PEEP"
            value={measuredParameters.auto_peep}
            unit="см H₂O"
            rangeMin={0}
            rangeMax={3}
          />
          <VentilationParameter 
            label="Плато"
            value={measuredParameters.plateau_pressure}
            unit="см H₂O"
            rangeMin={15}
            rangeMax={30}
          />
          <VentilationParameter 
            label="EtCO₂"
            value={measuredParameters.etco2}
            unit="мм рт.ст."
            rangeMin={30}
            rangeMax={45}
          />
        </div>
      </div>
      
      {/* Установленные параметры */}
      <div className="mb-4">
        <h3 className="text-sm text-gray-400 mb-2">Установленные параметры</h3>
        <div className="grid grid-cols-4 gap-3">
          <VentilationParameter 
            label="Частота"
            value={ventilatorSettings.rate}
            unit="вд/мин"
            rangeMin={8}
            rangeMax={30}
          />
          <VentilationParameter 
            label="ПДКВ"
            value={ventilatorSettings.peep}
            unit="см H₂O"
            rangeMin={0}
            rangeMax={15}
          />
          <VentilationParameter 
            label="Пик. давление"
            value={ventilatorSettings.peak}
            unit="см H₂O"
            rangeMin={15}
            rangeMax={40}
          />
          <VentilationParameter 
            label="Дых. объем"
            value={ventilatorSettings.tidal_volume}
            unit="мл"
            rangeMin={300}
            rangeMax={800}
          />
        </div>
      </div>
      
      {/* Кнопка настроек */}
      <div className="mt-4">
        <VentilatorControlPanel />
      </div>
    </div>
  );
};

export default VentilatorMonitor;