import React, { useState, useEffect } from 'react';

/**
 * Компонент для настройки и запуска клинических сценариев
 * @param {Object} props
 * @param {Function} props.onStartScenario - Функция для запуска сценария
 * @param {Function} props.onClose - Функция для закрытия панели сценариев
 * @param {boolean} props.isOperating - Флаг активности операции
 */
const ClinicalScenarios = ({ onStartScenario, onClose, isOperating = true }) => {
  // Состояния компонента
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedScenario, setSelectedScenario] = useState(null);
  const [scenarioParams, setScenarioParams] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  
  // Библиотека клинических сценариев
  const [scenariosLibrary] = useState([
    // Обучающие сценарии
    {
      id: 'normal',
      title: 'Стабильный пациент',
      description: 'Пациент со стабильными показателями жизнедеятельности. Используйте для ознакомления с интерфейсом.',
      category: 'education',
      difficulty: 'easy',
      parameters: [
        { id: 'age', label: 'Возраст', type: 'range', min: 18, max: 90, default: 45, step: 1 }
      ]
    },
    
    // Сердечно-сосудистые сценарии
    {
      id: 'hypertension',
      title: 'Гипертензия',
      description: 'Пациент с повышенным артериальным давлением.',
      category: 'cardiac',
      difficulty: 'easy',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.7, step: 0.1 },
        { id: 'reflex', label: 'Рефлекторная тахикардия', type: 'boolean', default: true }
      ]
    },
    {
      id: 'hypotension',
      title: 'Гипотензия',
      description: 'Пациент с пониженным артериальным давлением.',
      category: 'cardiac',
      difficulty: 'medium',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.5, step: 0.1 },
        { id: 'cause', label: 'Причина', type: 'select', options: [
          { value: 'hypovolemia', label: 'Гиповолемия' },
          { value: 'cardiogenic', label: 'Кардиогенная' },
          { value: 'distributive', label: 'Дистрибутивная' }
        ], default: 'hypovolemia' }
      ]
    },
    {
      id: 'bradycardia',
      title: 'Брадикардия',
      description: 'Пациент с пониженной частотой сердечных сокращений.',
      category: 'cardiac',
      difficulty: 'medium',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.5, step: 0.1 },
        { id: 'type', label: 'Тип', type: 'select', options: [
          { value: 'sinus', label: 'Синусовая' },
          { value: 'av_block', label: 'AV-блокада' },
          { value: 'drug_induced', label: 'Лекарственная' }
        ], default: 'sinus' }
      ]
    },
    {
      id: 'tachycardia',
      title: 'Тахикардия',
      description: 'Пациент с повышенной частотой сердечных сокращений.',
      category: 'cardiac',
      difficulty: 'medium',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.6, step: 0.1 },
        { id: 'type', label: 'Тип', type: 'select', options: [
          { value: 'sinus', label: 'Синусовая' },
          { value: 'svt', label: 'Наджелудочковая (СВТ)' },
          { value: 'vtach', label: 'Желудочковая' }
        ], default: 'sinus' }
      ]
    },
    {
      id: 'cardiac_arrest',
      title: 'Остановка сердца',
      description: 'Пациент с остановкой кровообращения, требующий реанимационных мероприятий.',
      category: 'cardiac',
      difficulty: 'hard',
      parameters: [
        { id: 'rhythm', label: 'Ритм', type: 'select', options: [
          { value: 'asystole', label: 'Асистолия' },
          { value: 'vf', label: 'Фибрилляция желудочков' },
          { value: 'vt', label: 'Желудочковая тахикардия без пульса' },
          { value: 'pea', label: 'Электрическая активность без пульса (PEA)' }
        ], default: 'vf' }
      ]
    },
    
    // Респираторные сценарии
    {
      id: 'hypoxia',
      title: 'Гипоксия',
      description: 'Пациент с гипоксемией, требующий кислородотерапии.',
      category: 'respiratory',
      difficulty: 'medium',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.5, step: 0.1 },
        { id: 'cause', label: 'Причина', type: 'select', options: [
          { value: 'pulmonary', label: 'Лёгочная' },
          { value: 'cardiovascular', label: 'Сердечно-сосудистая' },
          { value: 'anemia', label: 'Анемия' }
        ], default: 'pulmonary' }
      ]
    },
    {
      id: 'respiratory_distress',
      title: 'Дыхательная недостаточность',
      description: 'Пациент с острой дыхательной недостаточностью.',
      category: 'respiratory',
      difficulty: 'hard',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.7, step: 0.1 },
        { id: 'type', label: 'Тип', type: 'select', options: [
          { value: 'obstructive', label: 'Обструктивная' },
          { value: 'restrictive', label: 'Рестриктивная' },
          { value: 'pneumonia', label: 'Пневмония' },
          { value: 'ards', label: 'ОРДС' }
        ], default: 'obstructive' }
      ]
    },
    {
      id: 'pneumothorax',
      title: 'Пневмоторакс',
      description: 'Пациент с пневмотораксом, требующий экстренного вмешательства.',
      category: 'respiratory',
      difficulty: 'hard',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.6, step: 0.1 },
        { id: 'type', label: 'Тип', type: 'select', options: [
          { value: 'simple', label: 'Простой' },
          { value: 'tension', label: 'Напряжённый' }
        ], default: 'simple' },
        { id: 'side', label: 'Сторона', type: 'select', options: [
          { value: 'left', label: 'Левая' },
          { value: 'right', label: 'Правая' }
        ], default: 'left' }
      ]
    },
    
    // Травматические сценарии
    {
      id: 'bleeding',
      title: 'Кровотечение',
      description: 'Пациент с активным кровотечением и развивающимся геморрагическим шоком.',
      category: 'trauma',
      difficulty: 'hard',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.6, step: 0.1 },
        { id: 'location', label: 'Локализация', type: 'select', options: [
          { value: 'external', label: 'Наружное' },
          { value: 'internal', label: 'Внутреннее' }
        ], default: 'external' }
      ]
    },
    {
      id: 'head_injury',
      title: 'Черепно-мозговая травма',
      description: 'Пациент с травмой головы и нарушениями сознания.',
      category: 'trauma',
      difficulty: 'hard',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.5, step: 0.1 },
        { id: 'type', label: 'Тип', type: 'select', options: [
          { value: 'concussion', label: 'Сотрясение' },
          { value: 'contusion', label: 'Ушиб' },
          { value: 'hematoma', label: 'Гематома' }
        ], default: 'concussion' }
      ]
    },
    
    // Экстренные состояния
    {
      id: 'anaphylaxis',
      title: 'Анафилактический шок',
      description: 'Пациент с тяжелой аллергической реакцией, требующей экстренной терапии.',
      category: 'emergency',
      difficulty: 'hard',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.7, step: 0.1 },
        { id: 'trigger', label: 'Причина', type: 'select', options: [
          { value: 'medication', label: 'Лекарственный препарат' },
          { value: 'food', label: 'Пищевая аллергия' },
          { value: 'insect', label: 'Укус насекомого' }
        ], default: 'medication' }
      ]
    },
    {
      id: 'sepsis',
      title: 'Сепсис',
      description: 'Пациент с системной воспалительной реакцией на инфекцию.',
      category: 'emergency',
      difficulty: 'hard',
      parameters: [
        { id: 'severity', label: 'Тяжесть', type: 'range', min: 0.1, max: 1, default: 0.6, step: 0.1 },
        { id: 'source', label: 'Источник', type: 'select', options: [
          { value: 'pulmonary', label: 'Лёгочный' },
          { value: 'abdominal', label: 'Абдоминальный' },
          { value: 'urinary', label: 'Мочевой' },
          { value: 'soft_tissue', label: 'Мягкие ткани' }
        ], default: 'pulmonary' }
      ]
    }
  ]);
  
  // Категории сценариев
  const categories = [
    { id: 'all', label: 'Все сценарии' },
    { id: 'education', label: 'Обучение' },
    { id: 'cardiac', label: 'Сердечно-сосудистые' },
    { id: 'respiratory', label: 'Дыхательная система' },
    { id: 'trauma', label: 'Травмы' },
    { id: 'emergency', label: 'Экстренные состояния' }
  ];
  
  // Эффект при выборе сценария
  useEffect(() => {
    if (selectedScenario) {
      // Инициализируем параметры значениями по умолчанию
      const initialParams = {};
      selectedScenario.parameters.forEach(param => {
        initialParams[param.id] = param.default;
      });
      setScenarioParams(initialParams);
    }
  }, [selectedScenario]);
  
  // Обработчик изменения параметра сценария
  const handleParamChange = (paramId, value) => {
    setScenarioParams(prev => ({
      ...prev,
      [paramId]: value
    }));
  };
  
  // Обработчик запуска сценария
  const handleStartScenario = () => {
    if (!selectedScenario || !isOperating) return;
    
    // Вызываем функцию запуска сценария с параметрами
    onStartScenario(selectedScenario.id, scenarioParams);
  };
  
  // Фильтруем сценарии по категории и поисковому запросу
  const filteredScenarios = scenariosLibrary.filter(scenario => {
    const matchesCategory = selectedCategory === 'all' || scenario.category === selectedCategory;
    const matchesSearch = searchQuery === '' || 
                         scenario.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         scenario.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });
  
  // Получение иконки для категории
  const getCategoryIcon = (categoryId) => {
    switch(categoryId) {
      case 'education': return '📚';
      case 'cardiac': return '❤️';
      case 'respiratory': return '🫁';
      case 'trauma': return '🩹';
      case 'emergency': return '🚨';
      default: return '📋';
    }
  };
  
  // Получение цвета для уровня сложности
  const getDifficultyColor = (difficulty) => {
    switch(difficulty) {
      case 'easy': return 'bg-green-700 hover:bg-green-600';
      case 'medium': return 'bg-yellow-700 hover:bg-yellow-600';
      case 'hard': return 'bg-red-700 hover:bg-red-600';
      default: return 'bg-blue-700 hover:bg-blue-600';
    }
  };
  
  return (
    <div className="bg-gray-800 text-white rounded-lg shadow-lg max-h-[90vh] overflow-hidden flex flex-col">
      <div className="flex justify-between items-center p-4 border-b border-gray-700">
        <h2 className="text-xl font-bold">Клинические сценарии</h2>
        <button
          className="text-gray-400 hover:text-white"
          onClick={onClose}
        >
          ✕
        </button>
      </div>
      
      <div className="p-4 border-b border-gray-700">
        <div className="mb-4">
          <label className="block text-gray-400 mb-1 text-sm">Поиск сценария</label>
          <input
            type="text"
            className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2 text-white"
            placeholder="Введите название или описание..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        <div>
          <label className="block text-gray-400 mb-1 text-sm">Категория</label>
          <div className="flex flex-wrap gap-2">
            {categories.map(category => (
              <button
                key={category.id}
                className={`px-3 py-1 rounded text-sm ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.id !== 'all' && <span className="mr-1">{getCategoryIcon(category.id)}</span>}
                {category.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Список сценариев */}
        <div className="w-2/5 border-r border-gray-700 overflow-y-auto p-2">
          {filteredScenarios.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              Сценарии не найдены
            </div>
          ) : (
            <div className="space-y-2">
              {filteredScenarios.map(scenario => (
                <div
                  key={scenario.id}
                  className={`p-3 rounded cursor-pointer ${
                    selectedScenario?.id === scenario.id
                      ? 'bg-blue-800 border border-blue-600'
                      : 'bg-gray-700 hover:bg-gray-650 border border-transparent'
                  }`}
                  onClick={() => setSelectedScenario(scenario)}
                >
                  <div className="flex justify-between items-start mb-1">
                    <h3 className="font-medium">{scenario.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${getDifficultyColor(scenario.difficulty)}`}>
                      {scenario.difficulty === 'easy' ? 'Лёгкий' : 
                       scenario.difficulty === 'medium' ? 'Средний' : 'Сложный'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-300 mb-1 line-clamp-2">{scenario.description}</p>
                  <div className="text-xs text-gray-400">
                    {getCategoryIcon(scenario.category)} {
                      scenario.category === 'education' ? 'Обучение' : 
                      scenario.category === 'cardiac' ? 'Сердечно-сосудистая система' : 
                      scenario.category === 'respiratory' ? 'Дыхательная система' : 
                      scenario.category === 'trauma' ? 'Травмы' : 
                      scenario.category === 'emergency' ? 'Экстренные состояния' : 
                      'Другое'
                    }
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Детали выбранного сценария */}
        <div className="w-3/5 overflow-y-auto p-4">
          {selectedScenario ? (
            <div>
              <h3 className="text-xl font-bold mb-2">{selectedScenario.title}</h3>
              <p className="text-gray-300 mb-4">{selectedScenario.description}</p>
              
              <div className="mb-6">
                <h4 className="text-lg font-medium mb-3">Параметры сценария</h4>
                <div className="space-y-4">
                  {selectedScenario.parameters.map(param => (
                    <div key={param.id}>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-sm text-gray-300">{param.label}</label>
                        {param.type === 'range' && (
                          <span className="text-sm font-medium text-blue-400">
                            {scenarioParams[param.id]}
                          </span>
                        )}
                      </div>
                      
                      {param.type === 'range' && (
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={scenarioParams[param.id] || param.default}
                          onChange={(e) => handleParamChange(param.id, parseFloat(e.target.value))}
                          className="w-full"
                        />
                      )}
                      
                      {param.type === 'select' && (
                        <select
                          value={scenarioParams[param.id] || param.default}
                          onChange={(e) => handleParamChange(param.id, e.target.value)}
                          className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-2"
                        >
                          {param.options.map(option => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      )}
                      
                      {param.type === 'boolean' && (
                        <div className="flex items-center">
                          <input
                            type="checkbox"
                            id={`param-${param.id}`}
                            checked={scenarioParams[param.id] || param.default}
                            onChange={(e) => handleParamChange(param.id, e.target.checked)}
                            className="mr-2 h-4 w-4"
                          />
                          <label htmlFor={`param-${param.id}`} className="text-sm text-gray-300">
                            Включено
                          </label>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="text-center">
                <button
                  className={`px-6 py-3 rounded-lg text-white font-medium ${
                    isOperating ? 'bg-blue-600 hover:bg-blue-500' : 'bg-gray-600 cursor-not-allowed'
                  }`}
                  onClick={handleStartScenario}
                  disabled={!isOperating}
                >
                  {isOperating ? 'Запустить сценарий' : 'Необходимо начать операцию'}
                </button>
                {!isOperating && (
                  <div className="mt-2 text-sm text-yellow-400">
                    Для запуска сценария необходимо нажать "Начало операции"
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p>Выберите сценарий из списка слева</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClinicalScenarios;