const UNSPLASH_ACCESS_KEY = import.meta.env.VITE_API_KEY;
const UNSPLASH_API_URL = 'https://api.unsplash.com';
const PHOTOS_PER_PAGE = 12;

// Элементы DOM
const elements = {
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    randomBtn: document.getElementById('randomBtn'),
    photoContainer: document.getElementById('photoContainer'),
    loading: document.getElementById('loading'),
    paginationContainer: document.getElementById('paginationContainer'),
    modal: document.getElementById('photoModal'),
    modalImg: document.getElementById('modalImg'),
    modalAuthor: document.getElementById('modalAuthor'),
    closeModal: document.getElementById('closeModal')
};

// Состояние приложения
let state = {
    currentPage: 1,
    totalPages: 1,
    currentQuery: '',
    isRandom: false
};

// Инициализация модального окна
function initModal() {
    elements.closeModal.addEventListener('click', closeModal);
    elements.modal.addEventListener('click', (e) => {
        if (e.target === elements.modal) closeModal();
    });
}

function closeModal() {
    elements.modal.style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Получение фотографий
async function fetchPhotos(page = 1, query = '', random = false) {
    try {
        showLoading();
        clearPhotos();
        
        if (random) {
            const data = await fetchRandomPhoto();
            displayPhotos(Array.isArray(data) ? data : [data]);
            return;
        }

        state.currentQuery = query;
        state.currentPage = page;
        
        const url = query 
            ? `${UNSPLASH_API_URL}/search/photos?query=${query}&per_page=${PHOTOS_PER_PAGE}&page=${page}&client_id=${UNSPLASH_ACCESS_KEY}`
            : `${UNSPLASH_API_URL}/photos?per_page=${PHOTOS_PER_PAGE}&page=${page}&order_by=popular&client_id=${UNSPLASH_ACCESS_KEY}`;

        const response = await fetch(url);
        const data = await response.json();

        if (query) {
            state.totalPages = data.total_pages;
            displayPhotos(data.results);
        } else {
            state.totalPages = page + 1;
            displayPhotos(data);
        }
        
        createPagination();
    } catch (error) {
        showError('Error loading photos. Please try again later.');
        console.error('Error:', error);
    } finally {
        hideLoading();
    }
}

async function fetchRandomPhoto() {
    // Для случайных фото берем сразу 3 изображения для более интересного отображения
    const url = `${UNSPLASH_API_URL}/photos/random?count=4&client_id=${UNSPLASH_ACCESS_KEY}`;
    const response = await fetch(url);
    return await response.json();
}

// Отображение фотографий
function displayPhotos(photos) {
    if (!photos?.length) {
        showError('No photos found. Try a different search term.');
        return;
    }

    elements.photoContainer.innerHTML = '';
    
    photos.forEach((photo, index) => {
        const photoCard = createPhotoCard(photo, index);
        elements.photoContainer.appendChild(photoCard);
        
        // Анимация появления с задержкой
        setTimeout(() => {
            photoCard.style.opacity = '1';
            photoCard.style.transform = 'translateY(0)';
        }, index * 100);
    });
}

function createPhotoCard(photo, index) {
    const card = document.createElement('div');
    card.className = `photo-card ${state.isRandom ? 'random-card' : ''}`;
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `all 0.5s ease ${index * 0.1}s`;
    
    // Для случайных фото делаем особый дизайн
    const isRandomCard = state.isRandom;
    const imgHeight = isRandomCard 
        ? (index === 0 ? '400px' : '250px') 
        : '300px';
    
    const userProfileUrl = photo.user?.links?.html || 'https://unsplash.com';
    
    card.innerHTML = `
        <div class="photo-img-container ${isRandomCard ? 'random-img-container' : ''}">
            <img src="${photo.urls?.regular}" 
                 alt="${photo.alt_description || 'Unsplash photo'}" 
                 class="photo-img ${isRandomCard ? 'random-img' : ''}" 
                 style="height: ${imgHeight}"
                 loading="lazy">
            <div class="photo-overlay">
                <button class="view-btn">
                    <i class="fas fa-expand"></i>
                    ${isRandomCard ? 'Explore' : 'View'}
                </button>
            </div>
            ${isRandomCard ? `<div class="random-badge">Рандомное</div>` : ''}
        </div>
        <div class="photo-details">
            <a href="${userProfileUrl}" target="_blank" class="photo-author">
                <img src="${photo.user?.profile_image?.small || 'https://via.placeholder.com/32'}" 
                     alt="${photo.user?.name || 'Unknown author'}" 
                     class="author-avatar">
                <span class="author-name">${photo.user?.name || 'Unknown'}</span>
            </a>
            <div class="photo-stats">
                <span><i class="fas fa-heart"></i> ${photo.likes || 0}</span>
                <span><i class="fas fa-calendar-alt"></i> ${photo.created_at ? new Date(photo.created_at).toLocaleDateString() : 'Unknown date'}</span>
            </div>
        </div>
    `;
    
    card.querySelector('.photo-img').addEventListener('click', () => openPhotoModal(photo));
    card.querySelector('.view-btn').addEventListener('click', () => openPhotoModal(photo));
    
    return card;
}

function openPhotoModal(photo) {
    elements.modalImg.src = photo.urls?.regular;
    elements.modalImg.alt = photo.alt_description || 'Unsplash photo';
    
    const userProfileUrl = photo.user?.links?.html || 'https://unsplash.com';
    
    elements.modalAuthor.innerHTML = `
        <a href="${userProfileUrl}" target="_blank" class="modal-author-link">
            <img src="${photo.user?.profile_image?.medium || 'https://via.placeholder.com/64'}" 
                 alt="${photo.user?.name || 'Unknown author'}" 
                 class="modal-author-avatar">
            <span>${photo.user?.name || 'Unknown'}</span>
        </a>
        <a href="${photo.links?.download}?force=true" class="download-btn" download target="_blank">
            <i class="fas fa-download"></i> Download
        </a>
    `;
    
    elements.modal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

// Пагинация
function createPagination() {
    if (state.isRandom || state.totalPages <= 1) return;

    elements.paginationContainer.innerHTML = '';
    const pagination = document.createElement('div');
    pagination.className = 'pagination';

    // Кнопка "Назад"
    const prevBtn = createPaginationButton(
        '<i class="fas fa-chevron-left"></i>',
        state.currentPage > 1,
        () => fetchPhotos(state.currentPage - 1, state.currentQuery)
    );
    pagination.appendChild(prevBtn);

    // Номера страниц
    const maxVisiblePages = 5;
    let startPage = Math.max(1, state.currentPage - Math.floor(maxVisiblePages / 2));
    let endPage = Math.min(state.totalPages, startPage + maxVisiblePages - 1);

    if (endPage - startPage + 1 < maxVisiblePages) {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
    }

    if (startPage > 1) {
        pagination.appendChild(createPaginationButton('1', true, () => fetchPhotos(1, state.currentQuery)));
        if (startPage > 2) pagination.appendChild(createEllipsis());
    }

    for (let i = startPage; i <= endPage; i++) {
        pagination.appendChild(createPaginationButton(
            i.toString(),
            i !== state.currentPage,
            () => fetchPhotos(i, state.currentQuery),
            i === state.currentPage
        ));
    }

    if (endPage < state.totalPages) {
        if (endPage < state.totalPages - 1) pagination.appendChild(createEllipsis());
        pagination.appendChild(createPaginationButton(
            state.totalPages.toString(),
            true,
            () => fetchPhotos(state.totalPages, state.currentQuery)
        ));
    }

    // Кнопка "Вперед"
    const nextBtn = createPaginationButton(
        '<i class="fas fa-chevron-right"></i>',
        state.currentPage < state.totalPages,
        () => fetchPhotos(state.currentPage + 1, state.currentQuery)
    );
    pagination.appendChild(nextBtn);

    elements.paginationContainer.appendChild(pagination);
}

function createPaginationButton(text, enabled, onClick, isActive = false) {
    const btn = document.createElement('button');
    btn.innerHTML = text;
    btn.className = `pagination-btn ${isActive ? 'active' : ''}`;
    btn.disabled = !enabled;
    if (enabled) btn.addEventListener('click', onClick);
    return btn;
}

function createEllipsis() {
    const ellipsis = document.createElement('span');
    ellipsis.textContent = '...';
    ellipsis.className = 'pagination-ellipsis';
    return ellipsis;
}

// Вспомогательные функции
function showLoading() {
    elements.loading.style.display = 'block';
    elements.photoContainer.innerHTML = '';
    elements.paginationContainer.innerHTML = '';
}

function hideLoading() {
    elements.loading.style.display = 'none';
}

function clearPhotos() {
    elements.photoContainer.innerHTML = '';
    elements.paginationContainer.innerHTML = '';
}

function showError(message) {
    elements.photoContainer.innerHTML = `
        <div class="empty-state">
            <i class="fas fa-image empty-icon"></i>
            <h3>${message}</h3>
            <button class="try-again-btn">Try Again</button>
        </div>
    `;
    
    elements.photoContainer.querySelector('.try-again-btn').addEventListener('click', () => {
        fetchPhotos(state.currentPage, state.currentQuery, state.isRandom);
    });
}

// Обработчики событий
function setupEventListeners() {
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.randomBtn.addEventListener('click', handleRandom);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
}

function handleSearch() {
    const query = elements.searchInput.value.trim();
    if (query) {
        state.isRandom = false;
        fetchPhotos(1, query);
    }
}

function handleRandom() {
    state.isRandom = true;
    fetchPhotos(1, '', true);
}

// Инициализация
initModal();
setupEventListeners();
fetchPhotos();