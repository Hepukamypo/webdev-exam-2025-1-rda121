/**
 * main.js - инициализация приложения
 * Точка входа для главной страницы и личного кабинета
 */

import { fetchCourses, fetchTutors, fetchOrders, createOrder, updateOrder, deleteOrder } from './api.js';
import { showNotification } from './ui.js';
import { formatDate, formatDateTime, calculateCourseCost, escapeHTML } from './utils.js';
import {
    allCourses, allTutors, orders, selectedTutorId, selectedCourseId,
    renderCourses, renderTutors, renderPagination, generateCourseForm, generateTutorForm,
    renderOrdersTable
} from './ui.js';

// Глобальные переменные для доступа из HTML
window.showNotification = showNotification;
window.handlePagination = handlePagination;
window.openOrderModal = openOrderModal;

/**
 * Инициализация главной страницы
 */
function initHomePage() {
    // Показываем индикатор загрузки
    showLoadingIndicator('coursesContainer');
    showLoadingIndicator('tutorsTableBody');
    
    // Загружаем данные
    Promise.all([
        fetchCourses(),
        fetchTutors()
    ]).then(([courses, tutors]) => {
        window.allCourses = courses;
        window.allTutors = tutors;
        
        // Отображаем данные
        renderCourses(courses, 1);
        renderTutors(tutors);
        
        // Настраиваем поиск и фильтры
        setupCourseSearch(courses);
        setupTutorFilters(tutors);
        
        // Скрываем индикаторы загрузки
        hideLoadingIndicator('coursesContainer');
        hideLoadingIndicator('tutorsTableBody');
    }).catch(error => {
        console.error('Ошибка при загрузке данных:', error);
        showNotification('Не удалось загрузить данные с сервера. Попробуйте перезагрузить страницу.', 'danger');
        
        // Скрываем индикаторы загрузки даже при ошибке
        hideLoadingIndicator('coursesContainer');
        hideLoadingIndicator('tutorsTableBody');
    });
}

/**
 * Инициализация личного кабинета
 */
function initCabinetPage() {
    showLoadingIndicator('ordersTableBody');
    
    fetchOrders().then(data => {
        window.orders = data;
        loadOrdersPage(1);
        hideLoadingIndicator('ordersTableBody');
    }).catch(error => {
        console.error('Ошибка при загрузке заявок:', error);
        showNotification('Не удалось загрузить заявки. Попробуйте перезагрузить страницу.', 'danger');
        hideLoadingIndicator('ordersTableBody');
    });
}

/**
 * Обработчик пагинации
 * @param {string} type - Тип пагинации
 * @param {number} page - Номер страницы
 */
function handlePagination(type, page) {
    if (type === 'courses') {
        const searchTerm = document.getElementById('courseSearch')?.value.toLowerCase() || '';
        const filteredCourses = window.allCourses.filter(course => 
            course.name.toLowerCase().includes(searchTerm) || 
            course.level.toLowerCase().includes(searchTerm)
        );
        renderCourses(filteredCourses, page);
    } else if (type === 'orders') {
        loadOrdersPage(page);
    }
}

/**
 * Открытие модального окна заявки
 * @param {string} type - Тип заявки ('course' или 'tutor')
 * @param {number} id - ID курса или репетитора
 */
function openOrderModal(type, id) {
    const modalTitle = document.getElementById('modalTitle');
    const formContainer = document.getElementById('orderFormContainer');
    
    if (!modalTitle || !formContainer) return;
    
    if (type === 'course') {
        const course = window.allCourses.find(c => c.id == id);
        if (!course) {
            showNotification('Курс не найден', 'danger');
            return;
        }
        
        modalTitle.textContent = `Оформление заявки на курс: ${course.name}`;
        formContainer.innerHTML = generateCourseForm(course);
        setupCourseForm(course);
        
    } else if (type === 'tutor') {
        const tutor = window.allTutors.find(t => t.id == id);
        if (!tutor) {
            showNotification('Репетитор не найден', 'danger');
            return;
        }
        
        modalTitle.textContent = `Оформление заявки на репетитора: ${tutor.name}`;
        formContainer.innerHTML = generateTutorForm(tutor);
        setupTutorForm(tutor);
    }
    
    // Инициализация модального окна
    const modal = new bootstrap.Modal(document.getElementById('orderModal'));
    modal.show();
}

/**
 * Загрузка страницы заявок в личном кабинете
 * @param {number} page - Номер страницы
 */
function loadOrdersPage(page) {
    const startIndex = (page - 1) * 5;
    const endIndex = startIndex + 5;
    const paginatedOrders = window.orders.slice(startIndex, endIndex);
    
    renderOrdersTable(paginatedOrders, startIndex + 1);
    renderPagination('orders', Math.ceil(window.orders.length / 5), page);
}

// Остальные функции (setupCourseSearch, setupTutorFilters, setupCourseForm, setupTutorForm, 
// showLoadingIndicator, hideLoadingIndicator) должны быть реализованы здесь или импортированы

// Автоинициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    const isHomePage = window.location.pathname.includes('index.html') || 
                      window.location.pathname === '/' || 
                      window.location.pathname.endsWith('/');
    
    if (isHomePage) {
        initHomePage();
    } else {
        initCabinetPage();
    }
});