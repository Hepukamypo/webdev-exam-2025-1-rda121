/**
 * api.js - работа с API языковой школы
 * Все функции для взаимодействия с сервером
 */

const API_BASE = 'http://exam-api-courses.std-900.ist.mospolytech.ru';
const API_KEY = '043f7d68-3cee-44dd-9ba1-bfed45a44f99'; // Ваш API ключ

/**
 * Обработка ответа от сервера
 * @param {Response} response - Ответ от сервера
 * @returns {Promise} - Обработанный результат
 */
async function handleResponse(response) {
    if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || `Ошибка ${response.status}: ${response.statusText}`);
    }
    return response.json();
}

// Экспортируем функции для работы с курсами
export async function fetchCourses() {
    const response = await fetch(`${API_BASE}/api/courses?api_key=${API_KEY}`);
    return handleResponse(response);
}

// Экспортируем функции для работы с репетиторами
export async function fetchTutors() {
    const response = await fetch(`${API_BASE}/api/tutors?api_key=${API_KEY}`);
    return handleResponse(response);
}

// Экспортируем функции для работы с заявками
export async function fetchOrders() {
    const response = await fetch(`${API_BASE}/api/orders?api_key=${API_KEY}`);
    return handleResponse(response);
}

// Экспортируем функции для создания заявки
export async function createOrder(orderData) {
    const response = await fetch(`${API_BASE}/api/orders?api_key=${API_KEY}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });
    return handleResponse(response);
}

// Экспортируем функции для обновления заявки
export async function updateOrder(orderId, orderData) {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}?api_key=${API_KEY}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(orderData)
    });
    return handleResponse(response);
}

// Экспортируем функции для удаления заявки
export async function deleteOrder(orderId) {
    const response = await fetch(`${API_BASE}/api/orders/${orderId}?api_key=${API_KEY}`, {
        method: 'DELETE'
    });
    return handleResponse(response);
}