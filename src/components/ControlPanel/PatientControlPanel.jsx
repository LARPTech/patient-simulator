import React, { useState } from 'react';

/**
 * Компонент для управления параметрами пациента
 * @param {Object} props
 * @param {Object} props.patientState - Текущее состояние пациента
 * @param {Function} props.updatePatientState - Функция для обновления состояния пациента
 * @param {Function} props.onOpenScenarios - Функция для открытия панели сценариев
 * @param {Function} props.onApplyMedication - Функция для применения лекарства
 * @param {Function} props.onPerformIntervention - Функция для выполнения медицинского вмешательства
 * @param {boolean} props.isOperating - Флаг активности операции
 */
const PatientControlPanel = ({ 
  patientState, 
  updatePatientState, 
  onOpenScenarios,
  onApplyMedication,
  onPerformIntervention,
  isOperating = true
}) => {
  // Состояние для отслеживания активной вкладки
  const [activeTab, setActiveTab] = useState('vitals');
  
  // Обработчик изменения параметра с помощью слайдера
  const handleParamChange = (param, value) => {
    if (!isOperating) return;
    
    updatePatientState({
      ...patientState,
      [param]: parseFloat(value)
    });
  };
  
  // Обработчик клинического вмешательства
  const handleIntervention = (intervention) => {
    if (!isOperating) return;
    onPerformIntervention(intervention);
  };
  
  // Обработчик применения лекарства
  const handleMedication = (medication) => {
    if (!isOperating) return;
    onApplyMedication(medication);
  };
  
  // Компонент слайдера для изменения параметра
  const ParamSlider = ({ param, label, min, max, step = 1, unit = '' }) => (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-1">
        <label className="text-sm text-gray-300">{label}</label>
        <span className="text-sm text-blue-400">
          {typeof patientState[param] === 'number' ? patientState[param] : '--'} {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={patientState[param] || 0}
        onChange={(e) => handleParamChange(param, e.target.value)}
        disabled={!isOperating}
        className="w-full"
      />
      <div className="flex justify-between text-xs text-gray-500">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );
  
  // Компонент кнопки вмешательства
  const InterventionButton = ({ intervention, label, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-700 hover:bg-blue-600",
      red: "bg-red-700 hover:bg-red-600",
      green: "bg-green-700 hover:bg-green-600",
      yellow: "bg-yellow-700 hover:bg-yellow-600",
      gray: "bg-gray-700 hover:bg-gray-600"
    };
    
    return (
      <button
        className={`w-full py-2 rounded ${colorClasses[color]} text-white font-medium mb-2
                  ${!isOperating ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => handleIntervention(intervention)}
        disabled={!isOperating}
      >
        {label}
      </button>
    );
  };
  
  // Компонент кнопки для лекарства
  const MedicationButton = ({ medication, label, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-700 hover:bg-blue-600",
      red: "bg-red-700 hover:bg-red-600",
      green: "bg-green-700 hover:bg-green-600",
      yellow: "bg-yellow-700 hover:bg-yellow-600",
      gray: "bg-gray-700 hover:bg-gray-600"
    };
    
    return (
      <button
        className={`w-full py-2 rounded ${colorClasses[color]} text-white font-medium mb-2
                  ${!isOperating ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => handleMedication(medication)}
        disabled={!isOperating}
      >
        {label}
      </button>
    );
  };
  
  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-lg overflow-hidden">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-xl text-white font-bold">Управление параметрами пациента</h2>
        <div>
          <button
            className={`px-4 py-2 ${isOperating ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 cursor-not-allowed'} 
                       text-white rounded shadow`}
            onClick={onOpenScenarios}
            disabled={!isOperating}
          >
            Клинические сценарии
          </button>
        </div>
      </div>
      
      <div className="flex border-b border-gray-700">
        <button
          className={`px-4 py-2 ${activeTab === 'vitals' ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('vitals')}
        >
          Жизненные показатели
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'interventions' ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('interventions')}
        >
          Вмешательства
        </button>
        <button
          className={`px-4 py-2 ${activeTab === 'medications' ? 'bg-gray-700 text-blue-400' : 'text-gray-400'}`}
          onClick={() => setActiveTab('medications')}
        >
          Лекарства
        </button>
      </div>
      
      <div className="p-4">
        {activeTab === 'vitals' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg text-white font-medium mb-3">Сердечно-сосудистая система</h3>
              
              <ParamSlider
                param="hr"
                label="Частота сердечных сокращений"
                min={30}
                max={220}
                unit="уд/мин"
              />
              
              <ParamSlider
                param="systolic"
                label="Систолическое давление"
                min={60}
                max={220}
                unit="мм рт.ст."
              />
              
              <ParamSlider
                param="diastolic"
                label="Диастолическое давление"
                min={30}
                max={140}
                unit="мм рт.ст."
              />
            </div>
            
            <div>
              <h3 className="text-lg text-white font-medium mb-3">Дыхательная система</h3>
              
              <ParamSlider
                param="rr"
                label="Частота дыхания"
                min={5}
                max={40}
                unit="вд/мин"
              />
              
              <ParamSlider
                param="spo2"
                label="SpO2"
                min={60}
                max={100}
                unit="%"
              />
              
              <ParamSlider
                param="etco2"
                label="EtCO2"
                min={15}
                max={80}
                unit="мм рт.ст."
              />
              
              <ParamSlider
                param="temperature"
                label="Температура"
                min={34}
                max={42}
                step={0.1}
                unit="°C"
              />
            </div>
          </div>
        )}
        
        {activeTab === 'interventions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg text-white font-medium mb-3">Клинические состояния</h3>
              
              <InterventionButton
                intervention="hypoxia"
                label="Гипоксия"
                color="yellow"
              />
              
              <InterventionButton
                intervention="bradycardia"
                label="Брадикардия"
                color="yellow"
              />
              
              <InterventionButton
                intervention="tachycardia"
                label="Тахикардия"
                color="yellow"
              />
              
              <InterventionButton
                intervention="hypotension"
                label="Гипотензия"
                color="yellow"
              />
              
              <InterventionButton
                intervention="hypertension"
                label="Гипертензия"
                color="yellow"
              />
              
              <InterventionButton
                intervention="cardiac_arrest"
                label="Остановка сердца"
                color="red"
              />
            </div>
            
            <div>
              <h3 className="text-lg text-white font-medium mb-3">Процедуры</h3>
              
              <InterventionButton
                intervention="intubate"
                label="Интубация"
                color="blue"
              />
              
              {patientState.intubated && (
                <InterventionButton
                  intervention="extubate"
                  label="Экстубация"
                  color="blue"
                />
              )}
              
              <InterventionButton
                intervention={isCPRInProgress ? "stop_cpr" : "start_cpr"}
                label={isCPRInProgress ? "Остановить СЛР" : "Начать СЛР"}
                color={isCPRInProgress ? "red" : "blue"}
              />
              
              <InterventionButton
                intervention="normalize"
                label="Нормализация показателей"
                color="green"
              />
            </div>
          </div>
        )}
        
        {activeTab === 'medications' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg text-white font-medium mb-3">Неотложные препараты</h3>
              
              <MedicationButton
                medication="epinephrine"
                label="Эпинефрин"
                color="red"
              />
              
              <MedicationButton
                medication="atropine"
                label="Атропин"
                color="yellow"
              />
              
              <MedicationButton
                medication="norepinephrine"
                label="Норэпинефрин"
                color="red"
              />
            </div>
            
            <div>
              <h3 className="text-lg text-white font-medium mb-3">Анестезия</h3>
              
              <MedicationButton
                medication="propofol"
                label="Пропофол"
                color="blue"
              />
              
              <MedicationButton
                medication="midazolam"
                label="Мидазолам"
                color="blue"
              />
              
              <MedicationButton
                medication="fentanyl"
                label="Фентанил"
                color="blue"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientControlPanel;