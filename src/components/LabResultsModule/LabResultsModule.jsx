import React, { useState, useEffect } from 'react';

// Компонент для отображения группы лабораторных показателей
const LabResultGroup = ({ title, results, isCollapsed, onToggle }) => {
  return (
    <div className="mb-4 border border-gray-700 rounded">
      <div 
        className="flex justify-between items-center p-3 bg-gray-800 cursor-pointer"
        onClick={onToggle}
      >
        <h3 className="text-lg text-white font-semibold">{title}</h3>
        <span className="text-gray-400 text-lg">
          {isCollapsed ? '▶' : '▼'}
        </span>
      </div>
      
      {!isCollapsed && (
        <div className="p-3 bg-gray-900">
          <table className="w-full border-collapse">
            <thead>
              <tr className="text-gray-400 text-left border-b border-gray-700">
                <th className="py-2 w-1/3">Показатель</th>
                <th className="py-2 w-1/6">Результат</th>
                <th className="py-2 w-1/6">Единицы</th>
                <th className="py-2 w-1/3">Референсные значения</th>
              </tr>
            </thead>
            <tbody>
              {results.map((result, index) => (
                <tr key={index} className="border-b border-gray-800">
                  <td className="py-2 text-white">{result.name}</td>
                  <td className={`py-2 font-medium ${
                    result.isAbnormal ? (result.isHigh ? 'text-red-500' : 'text-blue-500') : 'text-green-500'
                  }`}>
                    {result.value}
                  </td>
                  <td className="py-2 text-gray-400">{result.units}</td>
                  <td className="py-2 text-gray-400">{result.referenceRange}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

// Компонент карточки с тревожным состоянием
const AlertCard = ({ title, description, severity }) => {
  // Определение стилей в зависимости от важности тревоги
  const severityStyles = {
    critical: 'bg-red-900/50 border-red-700',
    warning: 'bg-yellow-900/50 border-yellow-700',
    info: 'bg-blue-900/50 border-blue-700'
  };
  
  const textStyles = {
    critical: 'text-red-400',
    warning: 'text-yellow-400',
    info: 'text-blue-400'
  };
  
  return (
    <div className={`p-3 mb-3 border rounded ${severityStyles[severity]}`}>
      <h4 className={`text-sm font-semibold ${textStyles[severity]}`}>{title}</h4>
      <p className="text-xs text-gray-300 mt-1">{description}</p>
    </div>
  );
};

// Компонент отображения динамики показателя
const LabTrendChart = ({ data, label, unit, referenceMin, referenceMax }) => {
  // Рассчитываем минимальное и максимальное значения с отступом
  const values = data.map(item => item.value);
  const min = Math.min(...values) * 0.9;
  const max = Math.max(...values) * 1.1;
  
  // Функция для преобразования значения в Y-координату
  const getYPosition = (value) => {
    const height = 100; // Высота графика в процентах
    const range = max - min;
    if (range === 0) return 50; // Защита от деления на ноль
    return 100 - ((value - min) / range * height);
  };
  
  return (
    <div className="border border-gray-700 rounded p-3 bg-gray-900 mb-4">
      <div className="flex justify-between items-center mb-2">
        <h3 className="text-white font-semibold">{label}</h3>
        <span className="text-sm text-gray-400">Единицы: {unit}</span>
      </div>
      
      <div className="relative h-40 w-full">
        {/* Референсная область */}
        {referenceMin && referenceMax && (
          <div 
            className="absolute bg-green-900/20 border-t border-b border-green-800" 
            style={{
              top: `${getYPosition(referenceMax)}%`,
              height: `${getYPosition(referenceMin) - getYPosition(referenceMax)}%`,
              left: 0,
              right: 0
            }}
          />
        )}
        
        {/* Линии сетки */}
        {[0.25, 0.5, 0.75].map((pos, idx) => (
          <div 
            key={idx}
            className="absolute border-t border-gray-700 w-full" 
            style={{ top: `${pos * 100}%` }}
          />
        ))}
        
        {/* Линия графика */}
        <svg className="absolute inset-0 h-full w-full overflow-visible">
          <polyline
            points={data.map((point, index) => 
              `${(index / (data.length - 1)) * 100},${getYPosition(point.value)}`
            ).join(' ')}
            fill="none"
            stroke="#60a5fa"
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          
          {/* Точки на графике */}
          {data.map((point, index) => (
            <circle
              key={index}
              cx={`${(index / (data.length - 1)) * 100}`}
              cy={`${getYPosition(point.value)}`}
              r="3"
              fill="#60a5fa"
            />
          ))}
        </svg>
        
        {/* Метки значений по оси Y */}
        <div className="absolute left-2 top-0 h-full flex flex-col justify-between text-xs text-gray-400">
          <div>{max.toFixed(1)}</div>
          <div>{((max + min) / 2).toFixed(1)}</div>
          <div>{min.toFixed(1)}</div>
        </div>
      </div>
      
      {/* Метки времени */}
      <div className="flex justify-between text-xs text-gray-400 mt-1">
        {data.map((point, index) => (
          <div key={index}>{point.time}</div>
        ))}
      </div>
    </div>
  );
};

// Компонент графика для газов крови
const BloodGasChart = ({ arterial, venous }) => {
  return (
    <div className="border border-gray-700 rounded p-3 bg-gray-900 mb-4">
      <h3 className="text-white font-semibold mb-3">Анализ газов крови</h3>
      
      <div className="grid grid-cols-2 gap-4">
        <div>
          <h4 className="text-center text-red-400 font-medium mb-2">Артериальная кровь</h4>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">pH</td>
                <td className={`py-1 font-medium text-right ${
                  arterial.ph < 7.35 ? 'text-blue-500' : 
                  arterial.ph > 7.45 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {arterial.ph.toFixed(2)}
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">pO₂</td>
                <td className={`py-1 font-medium text-right ${
                  arterial.po2 < 80 ? 'text-blue-500' : 
                  arterial.po2 > 100 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {arterial.po2} мм рт.ст.
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">pCO₂</td>
                <td className={`py-1 font-medium text-right ${
                  arterial.pco2 < 35 ? 'text-blue-500' : 
                  arterial.pco2 > 45 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {arterial.pco2} мм рт.ст.
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">HCO₃⁻</td>
                <td className={`py-1 font-medium text-right ${
                  arterial.hco3 < 22 ? 'text-blue-500' : 
                  arterial.hco3 > 26 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {arterial.hco3} ммоль/л
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">BE</td>
                <td className={`py-1 font-medium text-right ${
                  arterial.be < -2 ? 'text-blue-500' : 
                  arterial.be > 2 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {arterial.be > 0 ? '+' : ''}{arterial.be} ммоль/л
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">SaO₂</td>
                <td className={`py-1 font-medium text-right ${
                  arterial.sao2 < 95 ? 'text-blue-500' : 'text-green-500'
                }`}>
                  {arterial.sao2}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div>
          <h4 className="text-center text-blue-400 font-medium mb-2">Венозная кровь</h4>
          <table className="w-full">
            <tbody>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">pH</td>
                <td className={`py-1 font-medium text-right ${
                  venous.ph < 7.32 ? 'text-blue-500' : 
                  venous.ph > 7.42 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {venous.ph.toFixed(2)}
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">pO₂</td>
                <td className={`py-1 font-medium text-right ${
                  venous.po2 < 35 ? 'text-blue-500' : 
                  venous.po2 > 45 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {venous.po2} мм рт.ст.
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">pCO₂</td>
                <td className={`py-1 font-medium text-right ${
                  venous.pco2 < 40 ? 'text-blue-500' : 
                  venous.pco2 > 50 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {venous.pco2} мм рт.ст.
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">HCO₃⁻</td>
                <td className={`py-1 font-medium text-right ${
                  venous.hco3 < 22 ? 'text-blue-500' : 
                  venous.hco3 > 26 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {venous.hco3} ммоль/л
                </td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-1 text-gray-400">BE</td>
                <td className={`py-1 font-medium text-right ${
                  venous.be < -2 ? 'text-blue-500' : 
                  venous.be > 2 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {venous.be > 0 ? '+' : ''}{venous.be} ммоль/л
                </td>
              </tr>
              <tr>
                <td className="py-1 text-gray-400">SvO₂</td>
                <td className={`py-1 font-medium text-right ${
                  venous.svo2 < 65 ? 'text-blue-500' : 
                  venous.svo2 > 75 ? 'text-red-500' : 'text-green-500'
                }`}>
                  {venous.svo2}%
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Интерпретация результатов */}
      <div className="mt-3 p-2 bg-gray-800 rounded text-sm">
        <h4 className="text-white font-medium mb-1">Интерпретация:</h4>
        <p className="text-gray-300">
          {arterial.ph < 7.35 && arterial.pco2 > 45 ? 'Респираторный ацидоз. ' : ''}
          {arterial.ph < 7.35 && arterial.hco3 < 22 ? 'Метаболический ацидоз. ' : ''}
          {arterial.ph > 7.45 && arterial.pco2 < 35 ? 'Респираторный алкалоз. ' : ''}
          {arterial.ph > 7.45 && arterial.hco3 > 26 ? 'Метаболический алкалоз. ' : ''}
          {arterial.po2 < 80 ? 'Гипоксемия. ' : ''}
          {arterial.po2 >= 80 && arterial.pco2 >= 35 && arterial.pco2 <= 45 && arterial.ph >= 7.35 && arterial.ph <= 7.45 ? 'Показатели газов артериальной крови в пределах нормы. ' : ''}
          {venous.ph >= 7.32 && venous.ph <= 7.42 && venous.pco2 >= 40 && venous.pco2 <= 50 ? 'Показатели газов венозной крови в пределах нормы.' : ''}
        </p>
      </div>
    </div>
  );
};

// Основной компонент модуля лабораторных анализов
const LabResultsModule = ({ patientData }) => {
  // Состояние для хранения результатов анализов
  const [labResults, setLabResults] = useState({
    complete_blood_count: [],
    blood_chemistry: [],
    coagulation: [],
    arterial_blood_gas: {
      ph: 7.38,
      po2: 95,
      pco2: 40,
      hco3: 24,
      be: 0,
      sao2: 98
    },
    venous_blood_gas: {
      ph: 7.35,
      po2: 40,
      pco2: 45,
      hco3: 24,
      be: 0,
      svo2: 70
    }
  });
  
  // Состояние для отслеживания, какие группы анализов развернуты
  const [expandedGroups, setExpandedGroups] = useState({
    complete_blood_count: true,
    blood_chemistry: false,
    coagulation: false,
    blood_gas: true
  });
  
  // Данные для построения графиков тренда
  const [trends, setTrends] = useState({
    hemoglobin: [
      { time: '08:00', value: 145 },
      { time: '12:00', value: 140 },
      { time: '16:00', value: 135 },
      { time: '20:00', value: 132 }
    ],
    platelets: [
      { time: '08:00', value: 280 },
      { time: '12:00', value: 265 },
      { time: '16:00', value: 255 },
      { time: '20:00', value: 250 }
    ],
    glucose: [
      { time: '08:00', value: 6.2 },
      { time: '12:00', value: 7.8 },
      { time: '16:00', value: 6.5 },
      { time: '20:00', value: 5.9 }
    ],
    creatinine: [
      { time: '08:00', value: 75 },
      { time: '12:00', value: 78 },
      { time: '16:00', value: 80 },
      { time: '20:00', value: 82 }
    ]
  });
  
  // Метод для переключения состояния развернутости группы
  const toggleGroup = (group) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };
  
  // Эффект для инициализации и обновления лабораторных данных
  useEffect(() => {
    // В реальном приложении здесь был бы запрос к API
    // или получение данных из контекста приложения
    
    // Имитация загрузки базовых лабораторных данных
    const generateCompleteBloodCount = () => [
      {
        name: 'Гемоглобин (Hb)',
        value: 132,
        units: 'г/л',
        referenceRange: '130-160',
        isAbnormal: false
      },
      {
        name: 'Эритроциты (RBC)',
        value: 4.5,
        units: '10¹²/л',
        referenceRange: '4.0-5.1',
        isAbnormal: false
      },
      {
        name: 'Гематокрит (Ht)',
        value: 40.2,
        units: '%',
        referenceRange: '39-49',
        isAbnormal: false
      },
      {
        name: 'Лейкоциты (WBC)',
        value: 9.8,
        units: '10⁹/л',
        referenceRange: '4.0-9.0',
        isAbnormal: true,
        isHigh: true
      },
      {
        name: 'Тромбоциты (PLT)',
        value: 250,
        units: '10⁹/л',
        referenceRange: '150-400',
        isAbnormal: false
      }
    ];
    
    const generateBloodChemistry = () => [
      {
        name: 'Глюкоза',
        value: 5.9,
        units: 'ммоль/л',
        referenceRange: '3.9-6.1',
        isAbnormal: false
      },
      {
        name: 'Креатинин',
        value: 82,
        units: 'мкмоль/л',
        referenceRange: '62-106',
        isAbnormal: false
      },
      {
        name: 'Мочевина',
        value: 5.2,
        units: 'ммоль/л',
        referenceRange: '2.8-7.2',
        isAbnormal: false
      },
      {
        name: 'АЛТ',
        value: 28,
        units: 'Ед/л',
        referenceRange: '0-41',
        isAbnormal: false
      },
      {
        name: 'АСТ',
        value: 25,
        units: 'Ед/л',
        referenceRange: '0-37',
        isAbnormal: false
      },
      {
        name: 'Общий билирубин',
        value: 12.3,
        units: 'мкмоль/л',
        referenceRange: '3.4-20.5',
        isAbnormal: false
      },
      {
        name: 'Натрий (Na+)',
        value: 142,
        units: 'ммоль/л',
        referenceRange: '136-145',
        isAbnormal: false
      },
      {
        name: 'Калий (K+)',
        value: 4.1,
        units: 'ммоль/л',
        referenceRange: '3.5-5.1',
        isAbnormal: false
      },
      {
        name: 'Хлор (Cl-)',
        value: 102,
        units: 'ммоль/л',
        referenceRange: '98-107',
        isAbnormal: false
      }
    ];
    
    const generateCoagulation = () => [
      {
        name: 'Протромбиновое время (PT)',
        value: 12.3,
        units: 'сек',
        referenceRange: '11.0-13.5',
        isAbnormal: false
      },
      {
        name: 'МНО (INR)',
        value: 1.1,
        units: '',
        referenceRange: '0.9-1.2',
        isAbnormal: false
      },
      {
        name: 'АЧТВ (APTT)',
        value: 32.5,
        units: 'сек',
        referenceRange: '26.0-36.0',
        isAbnormal: false
      },
      {
        name: 'Фибриноген',
        value: 3.2,
        units: 'г/л',
        referenceRange: '2.0-4.0',
        isAbnormal: false
      }
    ];
    
    // Если есть данные по состоянию пациента, корректируем лабораторные показатели
    if (patientData) {
      // Примеры корректировок на основе состояния пациента
      const arterialBloodGas = { ...labResults.arterial_blood_gas };
      const venousBloodGas = { ...labResults.venous_blood_gas };
      
      // Если у пациента низкая сатурация
      if (patientData.spo2 < 90) {
        arterialBloodGas.po2 = Math.max(60, patientData.spo2 * 0.8);
        arterialBloodGas.sao2 = patientData.spo2;
        
        // При гипоксии часто бывает респираторный ацидоз
        arterialBloodGas.ph = 7.32;
        arterialBloodGas.pco2 = 50;
        
        // Также корректируем венозные газы
        venousBloodGas.po2 = 30;
        venousBloodGas.svo2 = 60;
        venousBloodGas.ph = 7.28;
        venousBloodGas.pco2 = 55;
      }
      
      // Обновляем состояние
      setLabResults(prev => ({
        ...prev,
        complete_blood_count: generateCompleteBloodCount(),
        blood_chemistry: generateBloodChemistry(),
        coagulation: generateCoagulation(),
        arterial_blood_gas: arterialBloodGas,
        venous_blood_gas: venousBloodGas
      }));
    } else {
      // Если данных нет, используем значения по умолчанию
      setLabResults(prev => ({
        ...prev,
        complete_blood_count: generateCompleteBloodCount(),
        blood_chemistry: generateBloodChemistry(),
        coagulation: generateCoagulation()
      }));
    }
  }, [patientData]);
  
  // Определение тревожных состояний на основе лабораторных данных
  const getAlerts = () => {
    const alerts = [];
    
    // Проверка общего анализа крови
    const cbc = labResults.complete_blood_count;
    const hemoglobin = cbc.find(item => item.name.includes('Гемоглобин'));
    if (hemoglobin && hemoglobin.value < 100) {
      alerts.push({
        title: 'Тяжелая анемия',
        description: `Гемоглобин: ${hemoglobin.value} г/л. Рекомендуется оценить необходимость трансфузии.`,
        severity: 'critical'
      });
    } else if (hemoglobin && hemoglobin.value < 120) {
      alerts.push({
        title: 'Анемия',
        description: `Гемоглобин: ${hemoglobin.value} г/л. Рекомендуется дополнительное обследование.`,
        severity: 'warning'
      });
    }
    
    const wbc = cbc.find(item => item.name.includes('Лейкоциты'));
    if (wbc && wbc.value > 12) {
      alerts.push({
        title: 'Лейкоцитоз',
        description: `Лейкоциты: ${wbc.value} × 10⁹/л. Возможно воспалительное заболевание или инфекция.`,
        severity: 'warning'
      });
    } else if (wbc && wbc.value < 4) {
      alerts.push({
        title: 'Лейкопения',
        description: `Лейкоциты: ${wbc.value} × 10⁹/л. Возможно угнетение костного мозга или вирусная инфекция.`,
        severity: 'warning'
      });
    }
    
    // Проверка биохимии крови
    const bc = labResults.blood_chemistry;
    const glucose = bc.find(item => item.name.includes('Глюкоза'));
    if (glucose && glucose.value > 11) {
      alerts.push({
        title: 'Гипергликемия',
        description: `Глюкоза: ${glucose.value} ммоль/л. Необходим контроль гликемии.`,
        severity: 'warning'
      });
    } else if (glucose && glucose.value < 3.9) {
      alerts.push({
        title: 'Гипогликемия',
        description: `Глюкоза: ${glucose.value} ммоль/л. Требуется коррекция уровня глюкозы.`,
        severity: 'critical'
      });
    }
    
    const potassium = bc.find(item => item.name.includes('Калий'));
    if (potassium && potassium.value > 5.5) {
      alerts.push({
        title: 'Гиперкалиемия',
        description: `Калий: ${potassium.value} ммоль/л. Риск нарушений ритма сердца.`,
        severity: 'critical'
      });
    } else if (potassium && potassium.value < 3.5) {
      alerts.push({
        title: 'Гипокалиемия',
        description: `Калий: ${potassium.value} ммоль/л. Риск нарушений ритма сердца.`,
        severity: 'critical'
      });
    }
    
    // Проверка газов крови
    const abg = labResults.arterial_blood_gas;
    if (abg.ph < 7.35 && abg.pco2 > 45) {
      alerts.push({
        title: 'Респираторный ацидоз',
        description: `pH: ${abg.ph.toFixed(2)}, pCO₂: ${abg.pco2} мм рт.ст. Возможна гиповентиляция.`,
        severity: 'warning'
      });
    } else if (abg.ph > 7.45 && abg.pco2 < 35) {
      alerts.push({
        title: 'Респираторный алкалоз',
        description: `pH: ${abg.ph.toFixed(2)}, pCO₂: ${abg.pco2} мм рт.ст. Возможна гипервентиляция.`,
        severity: 'warning'
      });
    }
    
    if (abg.po2 < 60) {
      alerts.push({
        title: 'Тяжелая гипоксемия',
        description: `pO₂: ${abg.po2} мм рт.ст. Требуется коррекция оксигенации.`,
        severity: 'critical'
      });
    } else if (abg.po2 < 80) {
      alerts.push({
        title: 'Гипоксемия',
        description: `pO₂: ${abg.po2} мм рт.ст. Рекомендуется дополнительная подача кислорода.`,
        severity: 'warning'
      });
    }
    
    return alerts;
  };
  
  // Получение тревожных состояний
  const alerts = getAlerts();
  
  return (
    <div className="bg-gray-900 text-white p-4 rounded-lg border border-gray-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Лабораторные данные</h2>
        <div>
          <button className="px-3 py-1 bg-blue-700 text-white rounded hover:bg-blue-600 text-sm">
            Запросить новые анализы
          </button>
        </div>
      </div>
      
      {/* Тревожные состояния */}
      {alerts.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Внимание</h3>
          <div>
            {alerts.map((alert, index) => (
              <AlertCard 
                key={index}
                title={alert.title}
                description={alert.description}
                severity={alert.severity}
              />
            ))}
          </div>
        </div>
      )}
      
      {/* Анализ газов крови */}
      <div className="mb-6">
        <div 
          className="flex justify-between items-center mb-2 cursor-pointer"
          onClick={() => toggleGroup('blood_gas')}
        >
          <h3 className="text-lg font-semibold">Анализ газов крови</h3>
          <span className="text-gray-400 text-lg">
            {expandedGroups.blood_gas ? '▼' : '▶'}
          </span>
        </div>
        
        {expandedGroups.blood_gas && (
          <BloodGasChart 
            arterial={labResults.arterial_blood_gas}
            venous={labResults.venous_blood_gas}
          />
        )}
      </div>
      
      {/* Группы лабораторных результатов */}
      <LabResultGroup 
        title="Общий анализ крови"
        results={labResults.complete_blood_count}
        isCollapsed={!expandedGroups.complete_blood_count}
        onToggle={() => toggleGroup('complete_blood_count')}
      />
      
      <LabResultGroup 
        title="Биохимический анализ крови"
        results={labResults.blood_chemistry}
        isCollapsed={!expandedGroups.blood_chemistry}
        onToggle={() => toggleGroup('blood_chemistry')}
      />
      
      <LabResultGroup 
        title="Коагулограмма"
        results={labResults.coagulation}
        isCollapsed={!expandedGroups.coagulation}
        onToggle={() => toggleGroup('coagulation')}
      />
      
      {/* Тренды показателей */}
      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">Динамика показателей</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <LabTrendChart 
            data={trends.hemoglobin}
            label="Гемоглобин (Hb)"
            unit="г/л"
            referenceMin={130}
            referenceMax={160}
          />
          
          <LabTrendChart 
            data={trends.platelets}
            label="Тромбоциты (PLT)"
            unit="10⁹/л"
            referenceMin={150}
            referenceMax={400}
          />
          
          <LabTrendChart 
            data={trends.glucose}
            label="Глюкоза"
            unit="ммоль/л"
            referenceMin={3.9}
            referenceMax={6.1}
          />
          
          <LabTrendChart 
            data={trends.creatinine}
            label="Креатинин"
            unit="мкмоль/л"
            referenceMin={62}
            referenceMax={106}
          />
        </div>
      </div>
      
      {/* Кнопки действий */}
      <div className="mt-6 flex justify-between">
        <button className="px-4 py-2 bg-gray-700 text-white rounded hover:bg-gray-600">
          История анализов
        </button>
        <button className="px-4 py-2 bg-blue-700 text-white rounded hover:bg-blue-600">
          Распечатать результаты
        </button>
      </div>
    </div>
  );
};

export default LabResultsModule;