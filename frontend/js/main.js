// 全局变量
let currentPage = 1;
let searchKeyword = '';

// DOM 元素
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const imageList = document.getElementById('imageList');
const titleList = document.getElementById('titleList');
const uploadForm = document.getElementById('uploadForm');
const movieNameInput = document.getElementById('movieNameInput');
const titleInput = document.getElementById('titleInput');
const imageUploadArea = document.getElementById('imageUploadArea');
const imageInput = document.getElementById('imageInput');
const previewUpload = document.getElementById('previewUpload');
const prevPageBtn = document.getElementById('prevPage');
const nextPageBtn = document.getElementById('nextPage');
const currentPageSpan = document.getElementById('currentPage');
const showImagesBtn = document.getElementById('showImages');
const showTitlesBtn = document.getElementById('showTitles');
const imageSection = document.getElementById('imageSection');
const titleSection = document.getElementById('titleSection');

// 初始化
document.addEventListener('DOMContentLoaded', () => {
    loadResources();
    initializeEventListeners();
});

// 事件监听器初始化
function initializeEventListeners() {
    // 搜索相关
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // 上传表单相关
    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        const movieName = movieNameInput.value.trim();
        const title = titleInput.value.trim();
        const imageFile = imageInput.files[0];

        formData.append('movie_name', movieName);
        if (title) formData.append('title', title);
        if (imageFile) formData.append('image', imageFile);

        try {
            const response = await fetch('/api/resources', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                // 清空表单
                movieNameInput.value = '';
                titleInput.value = '';
                imageInput.value = '';
                previewUpload.style.display = 'none';
                document.querySelector('.upload-placeholder').style.display = 'block';
                // 刷新资源列表
                loadResources();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    });
    imageUploadArea.addEventListener('click', () => imageInput.click());
    imageInput.addEventListener('change', handleFileSelect);
    
    // 拖放上传
    imageUploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        imageUploadArea.classList.add('dragover');
    });
    
    imageUploadArea.addEventListener('dragleave', () => {
        imageUploadArea.classList.remove('dragover');
    });
    
    imageUploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        imageUploadArea.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageFile(file);
        }
    });
    
    // 粘贴上传
    document.addEventListener('paste', (e) => {
        const items = e.clipboardData.items;
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                const file = item.getAsFile();
                handleImageFile(file);
                break;
            }
        }
    });
    
    // 分页相关
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));
    
    // 视图切换
    showImagesBtn.addEventListener('click', () => {
        showImagesBtn.classList.add('active');
        showTitlesBtn.classList.remove('active');
        imageSection.classList.add('active');
        titleSection.classList.remove('active');
    });
    
    showTitlesBtn.addEventListener('click', () => {
        showTitlesBtn.classList.add('active');
        showImagesBtn.classList.remove('active');
        titleSection.classList.add('active');
        imageSection.classList.remove('active');
    });
}

// 清空输入框
function clearInput(inputId) {
    document.getElementById(inputId).value = '';
}

// 清空图片
function clearImage() {
    imageInput.value = '';
    previewUpload.style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.querySelector('.image-clear-btn').style.display = 'none';
}

// 处理图片文件
function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        return;
    }
    
    // 显示预览
    const reader = new FileReader();
    reader.onload = (e) => {
        previewUpload.src = e.target.result;
        previewUpload.style.display = 'block';
        document.querySelector('.upload-placeholder').style.display = 'none';
        document.querySelector('.image-clear-btn').style.display = 'block';
    };
    reader.readAsDataURL(file);
    
    // 保存到input
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    imageInput.files = dataTransfer.files;
}

// 处理文件选择
function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        handleImageFile(file);
    }
}

// 复制图片到剪贴板
async function copyImageToClipboard(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        await navigator.clipboard.write([
            new ClipboardItem({
                [blob.type]: blob
            })
        ]);
        // 可以添加一个简单的提示
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = '图片已复制';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    } catch (err) {
        console.error('复制图片失败:', err);
    }
}

// 显示资源
function displayResources(resources) {
    const imageList = document.getElementById('imageList');
    const titleList = document.getElementById('titleList');
    
    imageList.innerHTML = '';
    titleList.innerHTML = '';

    resources.forEach(resource => {
        if (resource.image_path) {
            const imageItem = document.createElement('div');
            imageItem.className = 'image-item';
            imageItem.innerHTML = `
                <img src="${resource.image_path}" alt="${resource.movie_name}" onclick="copyImageToClipboard('${resource.image_path}')">
                <div class="image-title">${resource.movie_name}</div>
                <button class="delete-button" onclick="deleteResource(${resource.id}, 'image')">删除</button>
            `;
            imageList.appendChild(imageItem);
        }

        if (resource.title) {
            const titleItem = document.createElement('div');
            titleItem.className = 'title-item';
            titleItem.innerHTML = `
                <div class="title-info">
                    <h3>${resource.movie_name}</h3>
                    <h4>${resource.title}</h4>
                </div>
                <div class="title-actions">
                    <button onclick="copyText('${resource.title}')">复制标题</button>
                    <button class="delete-button" onclick="deleteResource(${resource.id}, 'title')">删除</button>
                </div>
            `;
            titleList.appendChild(titleItem);
        }
    });
}

// 复制文本
async function copyText(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch (err) {
        console.error('复制失败:', err);
    }
}

// 加载资源
async function loadResources(keyword = '') {
    try {
        const url = keyword
            ? `/api/search?keyword=${encodeURIComponent(keyword)}`
            : `/api/resources?page=${currentPage}`;
            
        const response = await fetch(url);
        const resources = await response.json();
        
        displayResources(resources);
        updatePagination(resources.length === 0);
    } catch (error) {
        console.error('加载资源失败:', error);
        alert('加载资源失败，请稍后重试');
    }
}

// 搜索处理
function handleSearch() {
    searchKeyword = searchInput.value.trim();
    if (searchKeyword) {
        currentPage = 1;
        loadResources(searchKeyword);
    }
}

// 分页处理
function changePage(delta) {
    currentPage += delta;
    loadResources();
    currentPageSpan.textContent = currentPage;
}

// 更新分页按钮状态
function updatePagination(isLastPage) {
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = isLastPage;
}

// 删除资源
async function deleteResource(id, type) {
    if (confirm('确定要删除这个资源吗？')) {
        try {
            const response = await fetch(`/api/resources/${id}?type=${type}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                // 刷新资源列表
                loadResources();
            }
        } catch (error) {
            console.error('Error:', error);
        }
    }
} 