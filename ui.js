/**
 * ui.js - работа с пользовательским интерфейсом
 * Все функции для отображения данных и обработки событий
 */

import { fetchCourses, fetchTutors, fetchOrders } from './api.js';
import { formatDate, formatDateTime, calculateCourseCost, escapeHTML } from './utils.js';

// Глобальные переменные
export let allCourses = [];
export let allTutors = [];
export let orders = [];
export let selectedTutorId = null;
export let selectedCourseId = null;
const ITEMS_PER_PAGE = 5;
export let currentPage = 1;

/**
 * Отображение уведомления
 * @param {string} message - Текст уведомления
 * @param {string} type - Тип уведомления (success, danger, warning, info)
 */
export function showNotification(message, type = 'success') {
    const container = document.getElementById('notifications');
    if (!container) return;
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show mb-3`;
    notification.role = 'alert';
    notification.innerHTML = `
        ${escapeHTML(message)}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    container.appendChild(notification);
    
    // Автоматическое удаление через 5 секунд
    setTimeout(() => {
        if (notification.parentNode) {
            const bsAlert = bootstrap.Alert.getInstance(notification);
            if (bsAlert) {
                bsAlert.close();
            } else {
                notification.remove();
            }
        }
    }, 5000);
}

/**
 * Отображение курсов
 * @param {Array} courses - Список курсов
 * @param {number} page - Номер страницы
 */
export function renderCourses(courses, page = 1) {
    const container = document.getElementById('coursesContainer');
    if (!container) return;
    
    container.innerHTML = '';
    
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedCourses = courses.slice(startIndex, endIndex);
    
    if (paginatedCourses.length === 0) {
        container.innerHTML = `
            <div class="col-12 text-center py-5">
                <p class="text-muted">Курсы не найдены</p>
            </div>
        `;
        return;
    }
    
    paginatedCourses.forEach(course => {
        const courseCard = document.createElement('div');
        courseCard.className = 'col-md-6 col-lg-4 mb-4';
        courseCard.innerHTML = `
            <div class="card h-100 shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start mb-2">
                        <h5 class="card-title mb-0">${escapeHTML(course.name)}</h5>
                        <span class="badge bg-primary">${course.level}</span>
                    </div>
                    <p class="card-text text-muted small mb-3">${escapeHTML(course.description || 'Описание отсутствует')}</p>
                    <div class="mb-3">
                        <strong>Преподаватель:</strong> ${escapeHTML(course.teacher)}<br>
                        <strong>Продолжительность:</strong> ${course.total_length} недель<br>
                        <strong>Занятия в неделю:</strong> ${course.week_length} часов<br>
                        <strong>Стоимость:</strong> ${course.course_fee_per_hour} ₽/час
                    </div>
                    <button class="btn btn-primary w-100 apply-btn" data-id="${course.id}">
                        <i class="bi bi-person-plus me-1"></i>Подать заявку
                    </button>
                </div>
            </div>
        `;
        container.appendChild(courseCard);
    });
    
    // Назначаем обработчики
    document.querySelectorAll('.apply-btn').forEach(button => {
        button.addEventListener('click', () => {
            selectedCourseId = parseInt(button.dataset.id);
            window.openOrderModal('course', selectedCourseId);
        });
    });
    
    renderPagination('courses', Math.ceil(courses.length / ITEMS_PER_PAGE), page);
}

/**
 * Отображение репетиторов
 * @param {Array} tutors - Список репетиторов
 * @param {Object} filters - Фильтры (язык, уровень)
 */
export function renderTutors(tutors, filters = {}) {
    const tbody = document.getElementById('tutorsTableBody');
    const orderButton = document.getElementById('orderButton');
    
    if (!tbody || !orderButton) return;
    
    // Сбрасываем выбор
    selectedTutorId = null;
    orderButton.disabled = true;
    orderButton.classList.remove('btn-success');
    orderButton.classList.add('btn-primary');
    orderButton.textContent = 'Оформить заявку';
    
    // Применяем фильтры
    let filteredTutors = [...tutors];
    
    if (filters.language) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.languages_offered.includes(filters.language)
        );
    }
    
    if (filters.level) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.language_level === filters.level
        );
    }
    
    tbody.innerHTML = '';
    
    if (filteredTutors.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4 text-muted">
                    Репетиторы не найдены. Попробуйте изменить фильтры.
                </td>
            </tr>
        `;
        return;
    }
    
    filteredTutors.forEach(tutor => {
        const row = document.createElement('tr');
        row.className = selectedTutorId === tutor.id ? 'table-success' : '';
        row.dataset.id = tutor.id;
        row.innerHTML = `
            <td>${escapeHTML(tutor.name)}</td>
            <td>${tutor.language_level}</td>
            <td>${tutor.languages_offered.join(', ')}</td>
            <td>${tutor.work_experience}</td>
            <td>${tutor.price_per_hour} ₽/час</td>
            <td><img src="img/placeholder.jpg" alt="Фото ${escapeHTML(tutor.name)}" width="50" class="img-fluid rounded"></td>
            <td><button class="btn btn-sm btn-outline-primary select-tutor">Выбрать</button></td>
        `;
        tbody.appendChild(row);
    });
    
    // Назначаем обработчики
    tbody.querySelectorAll('.select-tutor').forEach(button => {
        button.addEventListener('click', () => {
            const row = button.closest('tr');
            const tutorId = parseInt(row.dataset.id);
            
            // Снимаем выделение со всех строк
            tbody.querySelectorAll('tr').forEach(tr => {
                tr.classList.remove('table-success');
            });
            
            // Выделяем выбранную строку
            row.classList.add('table-success');
            
            // Обновляем состояние кнопки
            selectedTutorId = tutorId;
            orderButton.disabled = false;
            orderButton.classList.remove('btn-primary');
            orderButton.classList.add('btn-success');
            orderButton.innerHTML = '<i class="bi bi-check-circle me-1"></i>Оформить заявку на репетитора';
            
            window.openOrderModal('tutor', tutorId);
        });
    });
}

/**
 * Отображение пагинации
 * @param {string} type - Тип пагинации ('courses' или 'orders')
 * @param {number} totalPages - Общее количество страниц
 * @param {number} currentPage - Текущая страница
 */
export function renderPagination(type, totalPages, currentPage) {
    const container = document.getElementById(`${type}Pagination`);
    if (!container || totalPages <= 1) {
        if (container) container.innerHTML = '';
        return;
    }
    
    let paginationHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" tabindex="-1">
                <span aria-hidden="true">&laquo;</span>
            </a>
        </li>
    `;
    
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        } else if ((i === currentPage - 3 && currentPage > 4) || 
                  (i === currentPage + 3 && currentPage < totalPages - 3)) {
            paginationHTML += `<li class="page-item disabled"><span class="page-link">...</span></li>`;
        }
    }
    
    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">
                <span aria-hidden="true">&raquo;</span>
            </a>
        </li>
    `;
    
    container.innerHTML = paginationHTML;
    
    container.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const page = parseInt(link.dataset.page);
            window.handlePagination(type, page);
        });
    });
}

/**
 * Генерация формы заявки на курс
 * @param {Object} course - Данные о курсе
 * @returns {string} - HTML формы
 */
export function generateCourseForm(course) {
    // Форматируем даты
    const dateOptions = course.start_dates.map(date => {
        const dateObj = new Date(date);
        const formattedDate = dateObj.toLocaleDateString('ru-RU', {
            weekday: 'short',
            day: 'numeric',
            month: 'short'
        });
        return `<option value="${date.split('T')[0]}">${formattedDate}</option>`;
    }).join('');
    
    return `
        <form id="courseOrderForm">
            <input type="hidden" name="course_id" value="${course.id}">
            
            <div class="mb-3">
                <label class="form-label d-block">Название курса (нередактируемое)</label>
                <input type="text" class="form-control" value="${escapeHTML(course.name)}" disabled>
            </div>
            
            <div class="mb-3">
                <label class="form-label d-block">Преподаватель (нередактируемое)</label>
                <input type="text" class="form-control" value="${escapeHTML(course.teacher)}" disabled>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Дата начала курса</label>
                <select name="date_start" class="form-select" required>
                    <option value="">Выберите дату</option>
                    ${dateOptions}
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Время занятий</label>
                <select name="time_start" class="form-select" required disabled>
                    <option value="">Сначала выберите дату</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label d-block">Продолжительность курса (нередактируемое)</label>
                <div class="input-group">
                    <input type="text" class="form-control" value="${course.total_length} недель" disabled>
                    <span class="input-group-text" id="endDateInfo"></span>
                </div>
                <div class="form-text">Курс включает ${course.total_length * course.week_length} академических часов</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Количество студентов в группе (1-20)</label>
                <input type="number" name="persons" class="form-control" min="1" max="20" value="1" required>
                <div class="form-text">Для индивидуальных занятий укажите 1</div>
            </div>
            
            <div class="mb-4">
                <h5 class="mb-3">Дополнительные параметры обучения:</h5>
                <div class="row g-2">
                    <div class="col-md-6">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="supplementary" id="supplementary">
                            <label class="form-check-label" for="supplementary">Доп. материалы (+2000 ₽/студент)</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="personalized" id="personalized">
                            <label class="form-check-label" for="personalized">Индивидуальные занятия (+1500 ₽/неделя)</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="excursions" id="excursions">
                            <label class="form-check-label" for="excursions">Культурные экскурсии (+25%)</label>
                        </div>
                    </div>
                    <div class="col-md-6">
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="assessment" id="assessment">
                            <label class="form-check-label" for="assessment">Оценка языка (+300 ₽)</label>
                        </div>
                        <div class="form-check">
                            <input class="form-check-input" type="checkbox" name="interactive" id="interactive">
                            <label class="form-check-label" for="interactive">Интерактивная платформа (+50%)</label>
                        </div>
                    </div>
                </div>
            </div>
            
            <div class="mb-4 p-3 bg-light rounded">
                <h5>Рассчитанная стоимость: <span id="totalCost" class="text-primary fw-bold">—</span> ₽</h5>
                <p class="mb-0 text-muted small">Стоимость рассчитывается автоматически при выборе параметров</p>
            </div>
            
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                <button type="submit" class="btn btn-success">Отправить заявку</button>
            </div>
        </form>
    `;
}

/**
 * Генерация формы заявки на репетитора
 * @param {Object} tutor - Данные о репетиторе
 * @returns {string} - HTML формы
 */
export function generateTutorForm(tutor) {
    const today = new Date().toISOString().split('T')[0];
    const maxDate = new Date();
    maxDate.setFullYear(maxDate.getFullYear() + 1);
    const maxDateStr = maxDate.toISOString().split('T')[0];
    
    return `
        <form id="tutorOrderForm">
            <input type="hidden" name="tutor_id" value="${tutor.id}">
            
            <div class="mb-3">
                <label class="form-label">Имя репетитора (нередактируемое)</label>
                <input type="text" class="form-control" value="${escapeHTML(tutor.name)}" disabled>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Дата начала занятий</label>
                <input type="date" name="date_start" class="form-control" min="${today}" max="${maxDateStr}" required>
                <div class="form-text">Минимальная дата — сегодня, максимальная — через год</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Время занятий</label>
                <select name="time_start" class="form-select" required>
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="12:00">12:00</option>
                    <option value="15:00">15:00</option>
                    <option value="18:00">18:00</option>
                    <option value="19:00">19:00</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Продолжительность занятий в часах (1-40)</label>
                <input type="number" name="duration" class="form-control" min="1" max="40" value="10" required>
                <div class="form-text">Общая продолжительность курса в часах</div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Количество студентов (1-5)</label>
                <input type="number" name="persons" class="form-control" min="1" max="5" value="1" required>
                <div class="form-text">Для индивидуальных занятий укажите 1</div>
            </div>
            
            <div class="mb-4 p-3 bg-light rounded">
                <h5>Стоимость: <span id="tutorCost" class="text-primary fw-bold">${tutor.price_per_hour * 10} ₽</span></h5>
                <p class="mb-0">Ставка: ${tutor.price_per_hour} ₽/час</p>
            </div>
            
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                <button type="submit" class="btn btn-success">Отправить заявку</button>
            </div>
        </form>
    `;
}

// Экспортируем функции для личного кабинета
export { renderOrdersTable, showOrderDetails, editOrder, confirmDeleteOrder };

function renderOrdersTable(orders, startIndex) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-4">
                    <div class="alert alert-info mb-0">
                        У вас пока нет заявок. Перейдите на <a href="index.html" class="alert-link">главную страницу</a>, чтобы оформить первую заявку.
                    </div>
                </td>
            </tr>
        `;
        return;
    }
    
    orders.forEach((order, index) => {
        let itemName = 'Неизвестно';
        let itemDetails = '';
        
        if (order.course_id && order.course_id !== null && order.course_id !== 0) {
            const course = allCourses.find(c => c.id == order.course_id);
            if (course) {
                itemName = course.name;
                itemDetails = `Преподаватель: ${course.teacher}`;
            } else {
                itemName = 'Курс удален';
            }
        } else if (order.tutor_id && order.tutor_id !== null && order.tutor_id !== 0) {
            const tutor = allTutors.find(t => t.id == order.tutor_id);
            if (tutor) {
                itemName = tutor.name;
                itemDetails = `Язык: ${tutor.languages_offered.join(', ')}`;
            } else {
                itemName = 'Репетитор удален';
            }
        }
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${startIndex + index}</td>
            <td>
                <strong>${escapeHTML(itemName)}</strong>
                ${itemDetails ? `<br><small class="text-muted">${escapeHTML(itemDetails)}</small>` : ''}
            </td>
            <td>${formatDate(order.date_start)}</td>
            <td>${order.price ? order.price.toLocaleString('ru-RU') + ' ₽' : '—'}</td>
            <td>
                <div class="d-flex flex-column flex-md-row gap-1">
                    <button class="btn btn-sm btn-info detail-btn" data-id="${order.id}">
                        <i class="bi bi-info-circle me-1"></i>Подробнее
                    </button>
                    <button class="btn btn-sm btn-warning edit-btn" data-id="${order.id}">
                        <i class="bi bi-pencil me-1"></i>Изменить
                    </button>
                    <button class="btn btn-sm btn-danger delete-btn" data-id="${order.id}">
                        <i class="bi bi-trash me-1"></i>Удалить
                    </button>
                </div>
            </td>
        `;
        tbody.appendChild(row);
    });
    
    // Назначаем обработчики
    tbody.querySelectorAll('.detail-btn').forEach(button => {
        button.addEventListener('click', () => {
            const orderId = button.dataset.id;
            showOrderDetails(orderId);
        });
    });
    
    tbody.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', () => {
            const orderId = button.dataset.id;
            editOrder(orderId);
        });
    });
    
    tbody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', () => {
            const orderId = button.dataset.id;
            confirmDeleteOrder(orderId);
        });
    });
}

function showOrderDetails(orderId) {
    const order = orders.find(o => o.id == orderId);
    if (!order) {
        showNotification('Заявка не найдена', 'danger');
        return;
    }
    
    let content = '<div class="row g-3">';
    
    // Общая информация
    content += `
        <div class="col-12">
            <h5 class="mb-3">Общая информация</h5>
            <ul class="list-group">
                <li class="list-group-item"><strong>ID заявки:</strong> ${order.id}</li>
                <li class="list-group-item"><strong>Дата создания:</strong> ${formatDateTime(order.created_at)}</li>
                <li class="list-group-item"><strong>Последнее обновление:</strong> ${formatDateTime(order.updated_at)}</li>
            </ul>
        </div>
    `;
    
    // Информация о курсе или репетиторе
    if (order.course_id && order.course_id !== null && order.course_id !== 0) {
        const course = allCourses.find(c => c.id == order.course_id);
        if (course) {
            content += `
                <div class="col-12">
                    <h5 class="mb-3">Информация о курсе</h5>
                    <ul class="list-group">
                        <li class="list-group-item"><strong>Название курса:</strong> ${escapeHTML(course.name)}</li>
                        <li class="list-group-item"><strong>Преподаватель:</strong> ${escapeHTML(course.teacher)}</li>
                        <li class="list-group-item"><strong>Уровень:</strong> ${course.level}</li>
                        <li class="list-group-item"><strong>Продолжительность:</strong> ${course.total_length} недель (${course.total_length * course.week_length} часов)</li>
                        <li class="list-group-item"><strong>Стоимость за час:</strong> ${course.course_fee_per_hour} ₽</li>
                    </ul>
                </div>
            `;
        }
    } else if (order.tutor_id && order.tutor_id !== null && order.tutor_id !== 0) {
        const tutor = allTutors.find(t => t.id == order.tutor_id);
        if (tutor) {
            content += `
                <div class="col-12">
                    <h5 class="mb-3">Информация о репетиторе</h5>
                    <ul class="list-group">
                        <li class="list-group-item"><strong>Имя репетитора:</strong> ${escapeHTML(tutor.name)}</li>
                        <li class="list-group-item"><strong>Уровень языка:</strong> ${tutor.language_level}</li>
                        <li class="list-group-item"><strong>Языки:</strong> ${tutor.languages_offered.join(', ')}</li>
                        <li class="list-group-item"><strong>Опыт:</strong> ${tutor.work_experience} лет</li>
                        <li class="list-group-item"><strong>Ставка:</strong> ${tutor.price_per_hour} ₽/час</li>
                    </ul>
                </div>
            `;
        }
    }
    
    // Параметры заявки
    content += `
        <div class="col-12">
            <h5 class="mb-3">Параметры заявки</h5>
            <ul class="list-group">
                <li class="list-group-item"><strong>Дата начала:</strong> ${formatDate(order.date_start)}</li>
                <li class="list-group-item"><strong>Время занятий:</strong> ${order.time_start}</li>
                <li class="list-group-item"><strong>Количество студентов:</strong> ${order.persons}</li>
                <li class="list-group-item"><strong>Стоимость:</strong> ${order.price.toLocaleString('ru-RU')} ₽</li>
            </ul>
        </div>
    `;
    
    // Дополнительные опции
    content += `
        <div class="col-12">
            <h5 class="mb-3">Дополнительные опции</h5>
            <ul class="list-group">
                <li class="list-group-item"><strong>Доп. материалы:</strong> ${order.supplementary ? 'Да (+2000 ₽/студент)' : 'Нет'}</li>
                <li class="list-group-item"><strong>Индивидуальные занятия:</strong> ${order.personalized ? 'Да (+1500 ₽/неделя)' : 'Нет'}</li>
                <li class="list-group-item"><strong>Экскурсии:</strong> ${order.excursions ? 'Да (+25%)' : 'Нет'}</li>
                <li class="list-group-item"><strong>Оценка языка:</strong> ${order.assessment ? 'Да (+300 ₽)' : 'Нет'}</li>
                <li class="list-group-item"><strong>Интерактивная платформа:</strong> ${order.interactive ? 'Да (+50%)' : 'Нет'}</li>
                <li class="list-group-item"><strong>Ранняя регистрация:</strong> ${order.early_registration ? 'Да (-10%)' : 'Нет'}</li>
                <li class="list-group-item"><strong>Групповая запись:</strong> ${order.group_enrollment ? 'Да (-15%)' : 'Нет'}</li>
                <li class="list-group-item"><strong>Интенсивный курс:</strong> ${order.intensive_course ? 'Да (+20%)' : 'Нет'}</li>
            </ul>
        </div>
    `;
    
    content += '</div>';
    
    document.getElementById('detailContent').innerHTML = content;
    
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
}

function editOrder(orderId) {
    // Реализация редактирования заявки
    showNotification('Функция редактирования в разработке', 'info');
}

function confirmDeleteOrder(orderId) {
    // Реализация подтверждения удаления
    showNotification('Функция удаления в разработке', 'info');
}