// Глобальные переменные
const API_BASE = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
const API_KEY = '043f7d68-3cee-44dd-9ba1-bfed45a44f99';
let allCourses = [];
let allTutors = [];
let selectedTutorId = null;
let orders = [];
const ITEMS_PER_PAGE = 5;

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/') {
        initHomePage();
    } else if (window.location.pathname.endsWith('cabinet.html')) {
        initCabinetPage();
    }
});

// Инициализация главной страницы
function initHomePage() {
    Promise.all([
        fetchCourses(),
        fetchTutors()
    ]).then(([courses, tutors]) => {
        allCourses = courses;
        allTutors = tutors;
        renderCourses(courses, 1);
        setupCourseSearch();
        renderTutors(tutors);
        setupTutorFilters(tutors);
    }).catch(error => {
        console.error('Ошибка при загрузке данных:', error);
        showNotification('Не удалось загрузить данные с сервера', 'danger');
    });
}

// Инициализация личного кабинета
function initCabinetPage() {
    fetchOrders().then(data => {
        orders = data;
        loadOrdersPage(1);
    }).catch(error => {
        console.error('Ошибка при загрузке заявок:', error);
        showNotification('Не удалось загрузить заявки', 'danger');
    });
}

// Работа с API
function fetchCourses() {
    return fetch(`${API_BASE}/api/courses?api_key=${API_KEY}`)
        .then(response => {
            if (!response.ok) throw new Error('Ошибка при загрузке курсов');
            return response.json();
        });
}

function fetchTutors() {
    return fetch(`${API_BASE}/api/tutors?api_key=${API_KEY}`)
        .then(response => {
            if (!response.ok) throw new Error('Ошибка при загрузке репетиторов');
            return response.json();
        });
}

function fetchOrders() {
    return fetch(`${API_BASE}/api/orders?api_key=${API_KEY}`)
        .then(response => {
            if (!response.ok) throw new Error('Ошибка при загрузке заявок');
            return response.json();
        });
}

function createOrder(orderData) {
    return fetch(`${API_BASE}/api/orders?api_key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    }).then(response => {
        if (!response.ok) throw new Error('Ошибка при создании заявки');
        return response.json();
    });
}

function updateOrder(orderId, orderData) {
    return fetch(`${API_BASE}/api/orders/${orderId}?api_key=${API_KEY}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    }).then(response => {
        if (!response.ok) throw new Error('Ошибка при обновлении заявки');
        return response.json();
    });
}

function deleteOrder(orderId) {
    return fetch(`${API_BASE}/api/orders/${orderId}?api_key=${API_KEY}`, {
        method: 'DELETE'
    }).then(response => {
        if (!response.ok) throw new Error('Ошибка при удалении заявки');
        return response.json();
    });
}

// Отображение курсов
function renderCourses(courses, page) {
    const container = document.getElementById('coursesContainer');
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedCourses = courses.slice(startIndex, endIndex);
    
    container.innerHTML = paginatedCourses.map(course => `
        <div class="col-md-6 col-lg-4">
            <div class="card h-100">
                <div class="card-body">
                    <h5 class="card-title">${course.name}</h5>
                    <p class="card-text">
                        <strong>Уровень:</strong> ${course.level}<br>
                        <strong>Продолжительность:</strong> ${course.total_length} недель<br>
                        <strong>Ставка:</strong> ${course.course_fee_per_hour} ₽/час
                    </p>
                    <button class="btn btn-primary w-100 apply-btn" data-id="${course.id}">Подать заявку</button>
                </div>
            </div>
        </div>
    `).join('');

    // Добавляем обработчики для кнопок
    document.querySelectorAll('.apply-btn').forEach(button => {
        button.addEventListener('click', function() {
            const courseId = this.getAttribute('data-id');
            openOrderModal('course', courseId);
        });
    });

    renderPagination('courses', Math.ceil(courses.length / ITEMS_PER_PAGE), page);
}

// Пагинация
function renderPagination(type, totalPages, currentPage) {
    const container = document.getElementById(`${type}Pagination`);
    if (!container) return;

    let paginationHTML = `
        <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage - 1}" tabindex="-1">Предыдущая</a>
        </li>
    `;

    for (let i = 1; i <= totalPages; i++) {
        paginationHTML += `
            <li class="page-item ${i === currentPage ? 'active' : ''}">
                <a class="page-link" href="#" data-page="${i}">${i}</a>
            </li>
        `;
    }

    paginationHTML += `
        <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
            <a class="page-link" href="#" data-page="${currentPage + 1}">Следующая</a>
        </li>
    `;

    container.innerHTML = paginationHTML;

    // Добавляем обработчики для кнопок пагинации
    container.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            const page = parseInt(this.getAttribute('data-page'));
            if (type === 'courses') {
                const searchTerm = document.getElementById('courseSearch').value.toLowerCase();
                const filteredCourses = allCourses.filter(course => 
                    course.name.toLowerCase().includes(searchTerm) || 
                    course.level.toLowerCase().includes(searchTerm)
                );
                renderCourses(filteredCourses, page);
            } else if (type === 'orders') {
                loadOrdersPage(page);
            }
        });
    });
}

// Поиск курсов
function setupCourseSearch() {
    const searchInput = document.getElementById('courseSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const filteredCourses = allCourses.filter(course => 
            course.name.toLowerCase().includes(searchTerm) || 
            course.level.toLowerCase().includes(searchTerm)
        );
        renderCourses(filteredCourses, 1);
    });
}

// Отображение репетиторов
function renderTutors(tutors, filters = {}) {
    const tbody = document.getElementById('tutorsTableBody');
    if (!tbody) return;

    const { language, level } = filters;
    let filteredTutors = [...tutors];

    if (language) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.languages_offered.includes(language)
        );
    }

    if (level) {
        filteredTutors = filteredTutors.filter(tutor => 
            tutor.language_level === level
        );
    }

    tbody.innerHTML = filteredTutors.map(tutor => `
        <tr class="${selectedTutorId === tutor.id ? 'table-success' : ''}" data-id="${tutor.id}">
            <td>${tutor.name}</td>
            <td>${tutor.language_level}</td>
            <td>${tutor.languages_offered.join(', ')}</td>
            <td>${tutor.work_experience}</td>
            <td>${tutor.price_per_hour} ₽/час</td>
            <td><img src="placeholder.jpg" alt="Фото" width="50" class="img-fluid rounded"></td>
            <td><button class="btn btn-sm btn-outline-primary select-tutor">Выбрать</button></td>
        </tr>
    `).join('');

    // Добавляем обработчики для кнопок выбора
    tbody.querySelectorAll('.select-tutor').forEach(button => {
        button.addEventListener('click', function() {
            const row = this.closest('tr');
            const tutorId = parseInt(row.getAttribute('data-id'));
            
            // Снимаем выделение со всех строк
            tbody.querySelectorAll('tr').forEach(tr => {
                tr.classList.remove('table-success');
            });
            
            // Выделяем выбранную строку
            row.classList.add('table-success');
            selectedTutorId = tutorId;
            
            // Открываем модальное окно для репетитора
            openOrderModal('tutor', tutorId);
        });
    });
}

// Фильтры репетиторов
function setupTutorFilters(tutors) {
    const languageFilter = document.getElementById('languageFilter');
    if (!languageFilter) return;

    // Получаем уникальные языки
    const languages = [...new Set(tutors.flatMap(tutor => tutor.languages_offered))];
    
    // Заполняем выпадающий список языками
    languageFilter.innerHTML = '<option value="">Все языки</option>';
    languages.forEach(language => {
        languageFilter.innerHTML += `<option value="${language}">${language}</option>`;
    });

    // Добавляем обработчики для фильтров
    ['languageFilter', 'levelFilter'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', function() {
                const language = document.getElementById('languageFilter').value;
                const level = document.getElementById('levelFilter').value;
                renderTutors(allTutors, { language, level });
            });
        }
    });
}

// Работа с уведомлениями
function showNotification(message, type = 'success') {
    const container = document.getElementById('notifications');
    if (!container) return;

    const notification = document.createElement('div');
    notification.className = `alert alert-${type} alert-dismissible fade show`;
    notification.role = 'alert';
    notification.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    container.appendChild(notification);
    
    // Удаляем уведомление через 5 секунд
    setTimeout(() => {
        if (notification && notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

// Открытие модального окна для заявки
function openOrderModal(type, id) {
    const modalTitle = document.getElementById('modalTitle');
    const formContainer = document.getElementById('orderFormContainer');
    
    if (type === 'course') {
        const course = allCourses.find(c => c.id == id);
        if (!course) return;
        
        modalTitle.textContent = `Оформление заявки на курс: ${course.name}`;
        formContainer.innerHTML = generateCourseForm(course);
        setupCourseForm(course);
        
    } else if (type === 'tutor') {
        const tutor = allTutors.find(t => t.id == id);
        if (!tutor) return;
        
        modalTitle.textContent = `Оформление заявки на репетитора: ${tutor.name}`;
        formContainer.innerHTML = generateTutorForm(tutor);
        setupTutorForm(tutor);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    modal.show();
}

// Генерация формы для курса
function generateCourseForm(course) {
    // Форматируем даты из API
    const dateOptions = course.start_dates.map(date => {
        const formattedDate = new Date(date).toLocaleDateString('ru-RU');
        return `<option value="${date.split('T')[0]}">${formattedDate}</option>`;
    }).join('');
    
    return `
        <form id="courseOrderForm">
            <input type="hidden" name="course_id" value="${course.id}">
            
            <div class="mb-3">
                <label class="form-label">Название курса (нередактируемое)</label>
                <input type="text" class="form-control" value="${course.name}" disabled>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Преподаватель (нередактируемое)</label>
                <input type="text" class="form-control" value="${course.teacher}" disabled>
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
                <label class="form-label">Продолжительность курса (нередактируемое)</label>
                <div class="input-group">
                    <input type="text" class="form-control" value="${course.total_length} недель" disabled>
                    <span class="input-group-text" id="endDateInfo"></span>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Количество студентов в группе (1-20)</label>
                <input type="number" name="persons" class="form-control" min="1" max="20" value="1" required>
            </div>
            
            <div class="mb-3">
                <h5>Дополнительные параметры обучения:</h5>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="supplementary" id="supplementary">
                    <label class="form-check-label" for="supplementary">Дополнительные учебные материалы (+2000 ₽)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="personalized" id="personalized">
                    <label class="form-check-label" for="personalized">Индивидуальные занятия (+1500 ₽ за неделю)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="excursions" id="excursions">
                    <label class="form-check-label" for="excursions">Культурные экскурсии (+25%)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="assessment" id="assessment">
                    <label class="form-check-label" for="assessment">Оценка уровня владения языком (+300 ₽)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="interactive" id="interactive">
                    <label class="form-check-label" for="interactive">Доступ к интерактивной онлайн-платформе (+50%)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="early_registration" id="early_registration">
                    <label class="form-check-label" for="early_registration">Скидка за раннюю регистрацию (-10%)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="group_enrollment" id="group_enrollment">
                    <label class="form-check-label" for="group_enrollment">Скидка при групповой записи (-15%)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="intensive_course" id="intensive_course">
                    <label class="form-check-label" for="intensive_course">Интенсивные курсы (+20%)</label>
                </div>
            </div>
            
            <div class="mb-3 p-3 bg-light rounded">
                <h5>Рассчитанная стоимость: <span id="totalCost" class="text-primary fw-bold">—</span> ₽</h5>
            </div>
            
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                <button type="submit" class="btn btn-success">Отправить заявку</button>
            </div>
        </form>
    `;
}

// Настройка формы для курса
function setupCourseForm(course) {
    const form = document.getElementById('courseOrderForm');
    const dateSelect = form.querySelector('[name="date_start"]');
    const timeSelect = form.querySelector('[name="time_start"]');
    const endDateInfo = document.getElementById('endDateInfo');
    const totalCostElement = document.getElementById('totalCost');
    
    // Заполняем время занятий в зависимости от выбранной даты
    dateSelect.addEventListener('change', function() {
        if (this.value) {
            timeSelect.disabled = false;
            timeSelect.innerHTML = '';
            
            // Фильтруем даты, соответствующие выбранной
            const selectedDates = course.start_dates.filter(date => 
                date.startsWith(this.value)
            );
            
            // Добавляем опции времени
            selectedDates.forEach(date => {
                const time = date.split('T')[1].substring(0, 5);
                timeSelect.innerHTML += `<option value="${time}">${time}</option>`;
            });
            
            // Рассчитываем дату окончания
            const startDate = new Date(this.value);
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + (course.total_length * 7));
            endDateInfo.textContent = `Дата окончания: ${endDate.toLocaleDateString('ru-RU')}`;
        } else {
            timeSelect.disabled = true;
            timeSelect.innerHTML = '<option value="">Сначала выберите дату</option>';
            endDateInfo.textContent = '';
        }
        
        calculateCost(course, form);
    });
    
    // Пересчитываем стоимость при изменении данных формы
    form.addEventListener('input', () => calculateCost(course, form));
    form.addEventListener('change', () => calculateCost(course, form));
    
    // Отправка формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const orderData = Object.fromEntries(formData);
        
        // Преобразуем числовые значения
        orderData.persons = parseInt(orderData.persons);
        orderData.course_fee_per_hour = course.course_fee_per_hour;
        
        // Отправляем заявку
        createOrder(orderData)
            .then(response => {
                showNotification('Заявка успешно создана!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
                modal.hide();
                form.reset();
            })
            .catch(error => {
                console.error('Ошибка при создании заявки:', error);
                showNotification(`Ошибка: ${error.message}`, 'danger');
            });
    });
}

// Генерация формы для репетитора
function generateTutorForm(tutor) {
    const today = new Date().toISOString().split('T')[0];
    
    return `
        <form id="tutorOrderForm">
            <input type="hidden" name="tutor_id" value="${tutor.id}">
            
            <div class="mb-3">
                <label class="form-label">Дата начала занятий</label>
                <input type="date" name="date_start" class="form-control" min="${today}" required>
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
            </div>
            
            <div class="mb-3">
                <label class="form-label">Количество студентов (1-5)</label>
                <input type="number" name="persons" class="form-control" min="1" max="5" value="1" required>
            </div>
            
            <div class="mb-3 p-3 bg-light rounded">
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

// Настройка формы для репетитора
function setupTutorForm(tutor) {
    const form = document.getElementById('tutorOrderForm');
    const durationInput = form.querySelector('[name="duration"]');
    const tutorCostElement = document.getElementById('tutorCost');
    
    // Пересчитываем стоимость при изменении продолжительности
    durationInput.addEventListener('input', function() {
        const duration = parseInt(this.value) || 0;
        const persons = parseInt(form.querySelector('[name="persons"]').value) || 1;
        const totalCost = duration * tutor.price_per_hour * persons;
        tutorCostElement.textContent = `${totalCost} ₽`;
    });
    
    form.querySelector('[name="persons"]').addEventListener('input', function() {
        const duration = parseInt(form.querySelector('[name="duration"]').value) || 0;
        const persons = parseInt(this.value) || 1;
        const totalCost = duration * tutor.price_per_hour * persons;
        tutorCostElement.textContent = `${totalCost} ₽`;
    });
    
    // Отправка формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const orderData = Object.fromEntries(formData);
        
        // Преобразуем числовые значения
        orderData.duration = parseInt(orderData.duration);
        orderData.persons = parseInt(orderData.persons);
        orderData.price = orderData.duration * tutor.price_per_hour * orderData.persons;
        
        // Отправляем заявку
        createOrder(orderData)
            .then(response => {
                showNotification('Заявка на репетитора успешно создана!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('orderModal'));
                modal.hide();
                form.reset();
            })
            .catch(error => {
                console.error('Ошибка при создании заявки:', error);
                showNotification(`Ошибка: ${error.message}`, 'danger');
            });
    });
}

// Расчет стоимости для курса
function calculateCost(course, form) {
    const dateStart = form.querySelector('[name="date_start"]').value;
    const timeStart = form.querySelector('[name="time_start"]').value;
    const persons = parseInt(form.querySelector('[name="persons"]').value) || 1;
    const supplementary = form.querySelector('[name="supplementary"]').checked;
    const personalized = form.querySelector('[name="personalized"]').checked;
    const excursions = form.querySelector('[name="excursions"]').checked;
    const assessment = form.querySelector('[name="assessment"]').checked;
    const interactive = form.querySelector('[name="interactive"]').checked;
    const earlyRegistration = form.querySelector('[name="early_registration"]').checked;
    const groupEnrollment = form.querySelector('[name="group_enrollment"]').checked;
    const intensiveCourse = form.querySelector('[name="intensive_course"]').checked;
    
    if (!dateStart || !timeStart) {
        document.getElementById('totalCost').textContent = '—';
        return;
    }
    
    // Рассчитываем базовую стоимость
    const courseFeePerHour = course.course_fee_per_hour || 200;
    const durationInHours = course.total_length * course.week_length;
    const isWeekend = isDateWeekend(dateStart) ? 1.5 : 1;
    
    // Рассчитываем доплаты за время
    let morningSurcharge = 0;
    let eveningSurcharge = 0;
    const hour = parseInt(timeStart.split(':')[0]);
    if (hour >= 9 && hour < 12) morningSurcharge = 400;
    if (hour >= 18 && hour < 20) eveningSurcharge = 1000;
    
    // Базовая стоимость
    let total = ((courseFeePerHour * durationInHours * isWeekend) + morningSurcharge + eveningSurcharge) * persons;
    
    // Применяем опции
    if (supplementary) total += 2000 * persons;
    if (personalized) total += 1500 * course.total_length;
    if (excursions) total *= 1.25;
    if (assessment) total += 300;
    if (interactive) total *= 1.5;
    if (earlyRegistration) total *= 0.9;
    if (groupEnrollment && persons >= 5) total *= 0.85;
    if (intensiveCourse && course.week_length >= 5) total *= 1.2;
    
    document.getElementById('totalCost').textContent = Math.round(total).toLocaleString('ru-RU');
}

// Проверка, является ли дата выходным днем
function isDateWeekend(dateString) {
    const date = new Date(dateString);
    return date.getDay() === 0 || date.getDay() === 6; // Воскресенье или суббота
}

// Личный кабинет: загрузка страницы с заявками
function loadOrdersPage(page) {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedOrders = orders.slice(startIndex, endIndex);
    
    renderOrdersTable(paginatedOrders, startIndex + 1);
    renderPagination('orders', Math.ceil(orders.length / ITEMS_PER_PAGE), page);
}

// Отображение таблицы заявок
function renderOrdersTable(orders, startIndex) {
    const tbody = document.getElementById('ordersTableBody');
    if (!tbody) return;
    
    tbody.innerHTML = orders.map((order, index) => {
        // Определяем название курса или репетитора
        let itemName = 'Неизвестно';
        if (order.course_id) {
            const course = allCourses.find(c => c.id == order.course_id);
            itemName = course ? course.name : 'Курс удален';
        } else if (order.tutor_id) {
            const tutor = allTutors.find(t => t.id == order.tutor_id);
            itemName = tutor ? tutor.name : 'Репетитор удален';
        }
        
        return `
            <tr>
                <td>${startIndex + index}</td>
                <td>${itemName}</td>
                <td>${formatDate(order.date_start)}</td>
                <td>${order.price ? order.price.toLocaleString('ru-RU') + ' ₽' : '—'}</td>
                <td>
                    <div class="d-flex gap-1">
                        <button class="btn btn-sm btn-info detail-btn" data-id="${order.id}">Подробнее</button>
                        <button class="btn btn-sm btn-warning edit-btn" data-id="${order.id}">Изменить</button>
                        <button class="btn btn-sm btn-danger delete-btn" data-id="${order.id}">Удалить</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
    
    // Добавляем обработчики для кнопок
    tbody.querySelectorAll('.detail-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-id');
            showOrderDetails(orderId);
        });
    });
    
    tbody.querySelectorAll('.edit-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-id');
            editOrder(orderId);
        });
    });
    
    tbody.querySelectorAll('.delete-btn').forEach(button => {
        button.addEventListener('click', function() {
            const orderId = this.getAttribute('data-id');
            confirmDeleteOrder(orderId);
        });
    });
}

// Показ деталей заявки
function showOrderDetails(orderId) {
    const order = orders.find(o => o.id == orderId);
    if (!order) return;
    
    let content = '<ul class="list-group">';
    
    for (const [key, value] of Object.entries(order)) {
        if (value !== null && value !== undefined && value !== '') {
            if (key === 'date_start') {
                content += `<li class="list-group-item"><strong>Дата начала:</strong> ${formatDate(value)}</li>`;
            } else if (key === 'price') {
                content += `<li class="list-group-item"><strong>Стоимость:</strong> ${value.toLocaleString('ru-RU')} ₽</li>`;
            } else if (typeof value === 'boolean') {
                content += `<li class="list-group-item"><strong>${formatKey(key)}:</strong> ${value ? 'Да' : 'Нет'}</li>`;
            } else {
                content += `<li class="list-group-item"><strong>${formatKey(key)}:</strong> ${value}</li>`;
            }
        }
    }
    
    content += '</ul>';
    
    document.getElementById('detailContent').innerHTML = content;
    
    const modal = new bootstrap.Modal(document.getElementById('detailModal'));
    modal.show();
}

// Форматирование названий полей
function formatKey(key) {
    const map = {
        'course_id': 'ID курса',
        'tutor_id': 'ID репетитора',
        'date_start': 'Дата начала',
        'time_start': 'Время начала',
        'duration': 'Продолжительность (часы)',
        'persons': 'Количество студентов',
        'price': 'Стоимость',
        'early_registration': 'Ранняя регистрация',
        'group_enrollment': 'Групповая запись',
        'intensive_course': 'Интенсивный курс',
        'supplementary': 'Доп. материалы',
        'personalized': 'Индивидуальные занятия',
        'excursions': 'Экскурсии',
        'assessment': 'Оценка уровня',
        'interactive': 'Интерактивная платформа',
        'student_id': 'ID студента',
        'created_at': 'Создано',
        'updated_at': 'Обновлено'
    };
    return map[key] || key.replace(/_/g, ' ');
}

// Редактирование заявки
function editOrder(orderId) {
    const order = orders.find(o => o.id == orderId);
    if (!order) return;
    
    window.currentOrderId = orderId;
    
    const modalTitle = document.querySelector('#editModal .modal-title');
    const formContainer = document.getElementById('editFormContainer');
    
    if (order.course_id) {
        const course = allCourses.find(c => c.id == order.course_id);
        if (!course) {
            showNotification('Курс не найден', 'danger');
            return;
        }
        
        modalTitle.textContent = `Редактирование заявки на курс: ${course.name}`;
        formContainer.innerHTML = generateEditCourseForm(course, order);
        setupEditCourseForm(course, order);
    } else if (order.tutor_id) {
        const tutor = allTutors.find(t => t.id == order.tutor_id);
        if (!tutor) {
            showNotification('Репетитор не найден', 'danger');
            return;
        }
        
        modalTitle.textContent = `Редактирование заявки на репетитора: ${tutor.name}`;
        formContainer.innerHTML = generateEditTutorForm(tutor, order);
        setupEditTutorForm(tutor, order);
    }
    
    const modal = new bootstrap.Modal(document.getElementById('editModal'));
    modal.show();
}

// Генерация формы для редактирования курса
function generateEditCourseForm(course, order) {
    const dateOptions = course.start_dates.map(date => {
        const dateValue = date.split('T')[0];
        const isSelected = order.date_start === dateValue ? 'selected' : '';
        const formattedDate = new Date(date).toLocaleDateString('ru-RU');
        return `<option value="${dateValue}" ${isSelected}>${formattedDate}</option>`;
    }).join('');
    
    // Проверяем, какие опции были выбраны
    const supplementaryChecked = order.supplementary ? 'checked' : '';
    const personalizedChecked = order.personalized ? 'checked' : '';
    const excursionsChecked = order.excursions ? 'checked' : '';
    const assessmentChecked = order.assessment ? 'checked' : '';
    const interactiveChecked = order.interactive ? 'checked' : '';
    const earlyRegistrationChecked = order.early_registration ? 'checked' : '';
    const groupEnrollmentChecked = order.group_enrollment ? 'checked' : '';
    const intensiveCourseChecked = order.intensive_course ? 'checked' : '';
    
    return `
        <form id="editCourseOrderForm">
            <input type="hidden" name="course_id" value="${course.id}">
            
            <div class="mb-3">
                <label class="form-label">Название курса (нередактируемое)</label>
                <input type="text" class="form-control" value="${course.name}" disabled>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Преподаватель (нередактируемое)</label>
                <input type="text" class="form-control" value="${course.teacher}" disabled>
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
                <select name="time_start" class="form-select" required>
                    <option value="09:00" ${order.time_start === '09:00' ? 'selected' : ''}>09:00</option>
                    <option value="10:00" ${order.time_start === '10:00' ? 'selected' : ''}>10:00</option>
                    <option value="12:00" ${order.time_start === '12:00' ? 'selected' : ''}>12:00</option>
                    <option value="15:00" ${order.time_start === '15:00' ? 'selected' : ''}>15:00</option>
                    <option value="18:00" ${order.time_start === '18:00' ? 'selected' : ''}>18:00</option>
                    <option value="19:00" ${order.time_start === '19:00' ? 'selected' : ''}>19:00</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Продолжительность курса (нередактируемое)</label>
                <div class="input-group">
                    <input type="text" class="form-control" value="${course.total_length} недель" disabled>
                    <span class="input-group-text" id="editEndDateInfo"></span>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Количество студентов в группе (1-20)</label>
                <input type="number" name="persons" class="form-control" min="1" max="20" value="${order.persons || 1}" required>
            </div>
            
            <div class="mb-3">
                <h5>Дополнительные параметры обучения:</h5>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="supplementary" id="edit_supplementary" ${supplementaryChecked}>
                    <label class="form-check-label" for="edit_supplementary">Дополнительные учебные материалы (+2000 ₽)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="personalized" id="edit_personalized" ${personalizedChecked}>
                    <label class="form-check-label" for="edit_personalized">Индивидуальные занятия (+1500 ₽ за неделю)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="excursions" id="edit_excursions" ${excursionsChecked}>
                    <label class="form-check-label" for="edit_excursions">Культурные экскурсии (+25%)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="assessment" id="edit_assessment" ${assessmentChecked}>
                    <label class="form-check-label" for="edit_assessment">Оценка уровня владения языком (+300 ₽)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="interactive" id="edit_interactive" ${interactiveChecked}>
                    <label class="form-check-label" for="edit_interactive">Доступ к интерактивной онлайн-платформе (+50%)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="early_registration" id="edit_early_registration" ${earlyRegistrationChecked}>
                    <label class="form-check-label" for="edit_early_registration">Скидка за раннюю регистрацию (-10%)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="group_enrollment" id="edit_group_enrollment" ${groupEnrollmentChecked}>
                    <label class="form-check-label" for="edit_group_enrollment">Скидка при групповой записи (-15%)</label>
                </div>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" name="intensive_course" id="edit_intensive_course" ${intensiveCourseChecked}>
                    <label class="form-check-label" for="edit_intensive_course">Интенсивные курсы (+20%)</label>
                </div>
            </div>
            
            <div class="mb-3 p-3 bg-light rounded">
                <h5>Рассчитанная стоимость: <span id="editTotalCost" class="text-primary fw-bold">—</span> ₽</h5>
            </div>
            
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                <button type="submit" class="btn btn-warning">Сохранить изменения</button>
            </div>
        </form>
    `;
}

// Настройка формы для редактирования курса
function setupEditCourseForm(course, order) {
    const form = document.getElementById('editCourseOrderForm');
    const dateSelect = form.querySelector('[name="date_start"]');
    const endDateInfo = document.getElementById('editEndDateInfo');
    const totalCostElement = document.getElementById('editTotalCost');
    
    // Заполняем информацию о дате окончания
    if (order.date_start) {
        const startDate = new Date(order.date_start);
        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + (course.total_length * 7));
        endDateInfo.textContent = `Дата окончания: ${endDate.toLocaleDateString('ru-RU')}`;
    }
    
    // Считаем начальную стоимость
    calculateEditCost(course, form);
    
    // Пересчитываем стоимость при изменении данных формы
    form.addEventListener('input', () => calculateEditCost(course, form));
    form.addEventListener('change', () => calculateEditCost(course, form));
    
    // Отправка формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const orderData = Object.fromEntries(formData);
        
        // Преобразуем числовые значения и boolean
        orderData.persons = parseInt(orderData.persons);
        orderData.supplementary = this.querySelector('[name="supplementary"]').checked;
        orderData.personalized = this.querySelector('[name="personalized"]').checked;
        orderData.excursions = this.querySelector('[name="excursions"]').checked;
        orderData.assessment = this.querySelector('[name="assessment"]').checked;
        orderData.interactive = this.querySelector('[name="interactive"]').checked;
        orderData.early_registration = this.querySelector('[name="early_registration"]').checked;
        orderData.group_enrollment = this.querySelector('[name="group_enrollment"]').checked;
        orderData.intensive_course = this.querySelector('[name="intensive_course"]').checked;
        
        // Обновляем заявку
        updateOrder(window.currentOrderId, orderData)
            .then(response => {
                showNotification('Заявка успешно обновлена!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
                modal.hide();
                fetchOrders().then(data => {
                    orders = data;
                    loadOrdersPage(1);
                });
            })
            .catch(error => {
                console.error('Ошибка при обновлении заявки:', error);
                showNotification(`Ошибка: ${error.message}`, 'danger');
            });
    });
}

// Расчет стоимости для редактирования курса
function calculateEditCost(course, form) {
    const dateStart = form.querySelector('[name="date_start"]').value;
    const timeStart = form.querySelector('[name="time_start"]').value;
    const persons = parseInt(form.querySelector('[name="persons"]').value) || 1;
    const supplementary = form.querySelector('[name="supplementary"]').checked;
    const personalized = form.querySelector('[name="personalized"]').checked;
    const excursions = form.querySelector('[name="excursions"]').checked;
    const assessment = form.querySelector('[name="assessment"]').checked;
    const interactive = form.querySelector('[name="interactive"]').checked;
    const earlyRegistration = form.querySelector('[name="early_registration"]').checked;
    const groupEnrollment = form.querySelector('[name="group_enrollment"]').checked;
    const intensiveCourse = form.querySelector('[name="intensive_course"]').checked;
    
    if (!dateStart || !timeStart) {
        document.getElementById('editTotalCost').textContent = '—';
        return;
    }
    
    // Рассчитываем базовую стоимость
    const courseFeePerHour = course.course_fee_per_hour || 200;
    const durationInHours = course.total_length * course.week_length;
    const isWeekend = isDateWeekend(dateStart) ? 1.5 : 1;
    
    // Рассчитываем доплаты за время
    let morningSurcharge = 0;
    let eveningSurcharge = 0;
    const hour = parseInt(timeStart.split(':')[0]);
    if (hour >= 9 && hour < 12) morningSurcharge = 400;
    if (hour >= 18 && hour < 20) eveningSurcharge = 1000;
    
    // Базовая стоимость
    let total = ((courseFeePerHour * durationInHours * isWeekend) + morningSurcharge + eveningSurcharge) * persons;
    
    // Применяем опции
    if (supplementary) total += 2000 * persons;
    if (personalized) total += 1500 * course.total_length;
    if (excursions) total *= 1.25;
    if (assessment) total += 300;
    if (interactive) total *= 1.5;
    if (earlyRegistration) total *= 0.9;
    if (groupEnrollment && persons >= 5) total *= 0.85;
    if (intensiveCourse && course.week_length >= 5) total *= 1.2;
    
    document.getElementById('editTotalCost').textContent = Math.round(total).toLocaleString('ru-RU');
}

// Подтверждение удаления
function confirmDeleteOrder(orderId) {
    window.currentOrderId = orderId;
    
    const modal = new bootstrap.Modal(document.getElementById('deleteConfirmModal'));
    modal.show();
    
    document.getElementById('confirmDeleteBtn').onclick = function() {
        deleteOrder(orderId)
            .then(response => {
                showNotification('Заявка успешно удалена!', 'success');
                modal.hide();
                fetchOrders().then(data => {
                    orders = data;
                    loadOrdersPage(1);
                });
            })
            .catch(error => {
                console.error('Ошибка при удалении заявки:', error);
                showNotification(`Ошибка: ${error.message}`, 'danger');
            });
    };
}

// Форматирование даты
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
}

// Генерация формы для редактирования репетитора
function generateEditTutorForm(tutor, order) {
    const today = new Date().toISOString().split('T')[0];
    
    return `
        <form id="editTutorOrderForm">
            <input type="hidden" name="tutor_id" value="${tutor.id}">
            
            <div class="mb-3">
                <label class="form-label">Дата начала занятий</label>
                <input type="date" name="date_start" class="form-control" min="${today}" value="${order.date_start}" required>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Время занятий</label>
                <select name="time_start" class="form-select" required>
                    <option value="09:00" ${order.time_start === '09:00' ? 'selected' : ''}>09:00</option>
                    <option value="10:00" ${order.time_start === '10:00' ? 'selected' : ''}>10:00</option>
                    <option value="12:00" ${order.time_start === '12:00' ? 'selected' : ''}>12:00</option>
                    <option value="15:00" ${order.time_start === '15:00' ? 'selected' : ''}>15:00</option>
                    <option value="18:00" ${order.time_start === '18:00' ? 'selected' : ''}>18:00</option>
                    <option value="19:00" ${order.time_start === '19:00' ? 'selected' : ''}>19:00</option>
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Продолжительность занятий в часах (1-40)</label>
                <input type="number" name="duration" class="form-control" min="1" max="40" value="${order.duration || 10}" required>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Количество студентов (1-5)</label>
                <input type="number" name="persons" class="form-control" min="1" max="5" value="${order.persons || 1}" required>
            </div>
            
            <div class="mb-3 p-3 bg-light rounded">
                <h5>Стоимость: <span id="editTutorCost" class="text-primary fw-bold">${order.price || 0} ₽</span></h5>
                <p class="mb-0">Ставка: ${tutor.price_per_hour} ₽/час</p>
            </div>
            
            <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                <button type="submit" class="btn btn-warning">Сохранить изменения</button>
            </div>
        </form>
    `;
}

// Настройка формы для редактирования репетитора
function setupEditTutorForm(tutor, order) {
    const form = document.getElementById('editTutorOrderForm');
    const durationInput = form.querySelector('[name="duration"]');
    const personsInput = form.querySelector('[name="persons"]');
    const tutorCostElement = document.getElementById('editTutorCost');
    
    // Пересчитываем стоимость при изменении данных
    const updateCost = () => {
        const duration = parseInt(durationInput.value) || 0;
        const persons = parseInt(personsInput.value) || 1;
        const totalCost = duration * tutor.price_per_hour * persons;
        tutorCostElement.textContent = `${totalCost} ₽`;
    };
    
    durationInput.addEventListener('input', updateCost);
    personsInput.addEventListener('input', updateCost);
    
    // Начальное вычисление стоимости
    updateCost();
    
    // Отправка формы
    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const formData = new FormData(this);
        const orderData = Object.fromEntries(formData);
        
        // Преобразуем числовые значения
        orderData.duration = parseInt(orderData.duration);
        orderData.persons = parseInt(orderData.persons);
        orderData.price = orderData.duration * tutor.price_per_hour * orderData.persons;
        
        // Обновляем заявку
        updateOrder(window.currentOrderId, orderData)
            .then(response => {
                showNotification('Заявка успешно обновлена!', 'success');
                const modal = bootstrap.Modal.getInstance(document.getElementById('editModal'));
                modal.hide();
                fetchOrders().then(data => {
                    orders = data;
                    loadOrdersPage(1);
                });
            })
            .catch(error => {
                console.error('Ошибка при обновлении заявки:', error);
                showNotification(`Ошибка: ${error.message}`, 'danger');
            });
    });
}