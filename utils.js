/**
 * utils.js - вспомогательные функции
 * Функции форматирования, расчетов и другие утилиты
 */

/**
 * Форматирование даты для отображения
 * @param {string} dateString - Строка с датой в формате YYYY-MM-DD
 * @returns {string} - Отформатированная дата
 */
export function formatDate(dateString) {
    if (!dateString) return '—';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
    });
}

/**
 * Форматирование даты и времени
 * @param {string} dateTimeString - Строка с датой и временем
 * @returns {string} - Отформатированная дата и время
 */
export function formatDateTime(dateTimeString) {
    if (!dateTimeString) return '—';
    const date = new Date(dateTimeString);
    return date.toLocaleString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Проверка, является ли дата выходным днем
 * @param {string} dateString - Строка с датой в формате YYYY-MM-DD
 * @returns {boolean} - true если выходной, false если будний
 */
export function isDateWeekend(dateString) {
    const date = new Date(dateString);
    const day = date.getDay();
    return day === 0 || day === 6; // Воскресенье или суббота
}

/**
 * Расчет стоимости курса
 * @param {Object} course - Данные о курсе
 * @param {Object} formData - Данные из формы
 * @returns {number} - Рассчитанная стоимость
 */
export function calculateCourseCost(course, formData) {
    const {
        date_start,
        persons,
        time_start,
        supplementary = false,
        personalized = false,
        excursions = false,
        assessment = false,
        interactive = false
    } = formData;

    // Базовые параметры
    const courseFeePerHour = course.course_fee_per_hour || 200;
    const durationInHours = course.total_length * course.week_length;
    const isWeekend = isDateWeekend(date_start) ? 1.5 : 1;
    
    // Дополнительные сборы за время
    let morningSurcharge = 0;
    let eveningSurcharge = 0;
    const hour = parseInt(time_start.split(':')[0]);
    if (hour >= 9 && hour < 12) morningSurcharge = 400;
    if (hour >= 18 && hour < 20) eveningSurcharge = 1000;
    
    // Базовая стоимость
    let total = ((courseFeePerHour * durationInHours * isWeekend) + morningSurcharge + eveningSurcharge) * persons;
    
    // Дополнительные параметры
    if (supplementary) total += 2000 * persons;
    if (personalized) total += 1500 * course.total_length;
    if (excursions) total *= 1.25;
    if (assessment) total += 300;
    if (interactive) total *= 1.5;
    
    // Автоматические параметры
    const now = new Date();
    const regDate = new Date(date_start);
    const diffDays = Math.ceil((regDate - now) / (1000 * 60 * 60 * 24));
    
    // Скидка за раннюю регистрацию (-10%)
    if (diffDays >= 30) total *= 0.9;
    
    // Скидка при групповой записи (-15%)
    if (persons >= 5) total *= 0.85;
    
    // Интенсивные курсы (+20%)
    if (course.week_length >= 5) total *= 1.2;
    
    return Math.round(total);
}

/**
 * Экранирование HTML для безопасности
 * @param {string} str - Строка для экранирования
 * @returns {string} - Экранированная строка
 */
export function escapeHTML(str) {
    if (!str || typeof str !== 'string') return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/**
 * Генерация уникального ID
 * @returns {string} - Уникальный идентификатор
 */
export function generateUniqueId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}