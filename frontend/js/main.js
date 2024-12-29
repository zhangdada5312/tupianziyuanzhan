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
        const movieName = movieNameInput.value.trim();
        const title = titleInput.value.trim();
        const files = imageInput.files;

        // 只验证影视名字
        if (!movieName) {
            alert('请输入影视剧名称');
            return;
        }

        try {
            if (files && files.length > 0) {
                // 如果有图片文件，上传图片
                for (let i = 0; i < files.length; i++) {
                    const formData = new FormData();
                    formData.append('movie_name', movieName);
                    if (title) formData.append('title', title);
                    formData.append('image', files[i]);

                    const response = await fetch('/api/resources', {
                        method: 'POST',
                        body: formData
                    });

                    if (!response.ok) {
                        const data = await response.json();
                        throw new Error(data.error || '上传失败');
                    }
                }
            } else {
                // 如果没有图片，只上传影视名字和标题（如果有）
                const formData = new FormData();
                formData.append('movie_name', movieName);
                if (title) formData.append('title', title);

                const response = await fetch('/api/resources', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) {
                    const data = await response.json();
                    throw new Error(data.error || '上传失败');
                }
            }

            // 清空表单
            movieNameInput.value = '';
            titleInput.value = '';
            clearImage();
            
            // 刷新资源列表
            loadResources();
        } catch (error) {
            alert(error.message);
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
        const files = Array.from(e.dataTransfer.files).filter(file => {
            // 检查文件类型
            if (!file.type.startsWith('image/')) {
                alert('只能上传图片文件！');
                return false;
            }
            // 检查文件大小
            if (file.size > 10 * 1024 * 1024) {
                alert('图片大小不能超过10MB');
                return false;
            }
            return true;
        });

        if (files.length === 0) {
            return;
        }

        clearImage(); // 清除现有预览
        files.forEach(handleImageFile);
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
    const previewContainer = document.getElementById('previewContainer');
    previewContainer.innerHTML = '';
    previewContainer.style.display = 'none';
    document.querySelector('.upload-placeholder').style.display = 'block';
    document.querySelector('.image-clear-btn').style.display = 'none';
}

// 处理图片文件
function handleImageFile(file) {
    if (!file || !file.type.startsWith('image/')) {
        return;
    }
    
    const previewContainer = document.getElementById('previewContainer');
    const reader = new FileReader();
    
    reader.onload = (e) => {
        const previewItem = document.createElement('div');
        previewItem.className = 'preview-item';
        previewItem.innerHTML = `
            <img src="${e.target.result}" alt="预览图">
            <button class="remove-preview" onclick="removePreview(this)">×</button>
        `;
        previewContainer.appendChild(previewItem);
        
        document.querySelector('.upload-placeholder').style.display = 'none';
        previewContainer.style.display = 'grid';
        document.querySelector('.image-clear-btn').style.display = 'block';
    };
    reader.readAsDataURL(file);

    // 将文件添加到 input 的 files 中
    const dt = new DataTransfer();
    if (imageInput.files.length > 0) {
        Array.from(imageInput.files).forEach(f => dt.items.add(f));
    }
    dt.items.add(file);
    imageInput.files = dt.files;
}

// 处理文件选择
function handleFileSelect(e) {
    const files = Array.from(e.target.files || e.dataTransfer.files).filter(file => {
        // 检查文件类型
        if (!file.type.startsWith('image/')) {
            alert('只能上传图片文件！');
            return false;
        }
        // 检查文件大小
        if (file.size > 10 * 1024 * 1024) {
            alert('图片大小不能超过10MB');
            return false;
        }
        return true;
    });

    if (files.length === 0) {
        return;
    }

    clearImage(); // 清除现有预览
    files.forEach(handleImageFile);
}

// 移除预览图片
function removePreview(button) {
    const previewItem = button.parentElement;
    const previewContainer = previewItem.parentElement;
    previewItem.remove();
    
    // 如果没有预览图片了，显示占位符
    if (previewContainer.children.length === 0) {
        document.querySelector('.upload-placeholder').style.display = 'block';
        previewContainer.style.display = 'none';
        document.querySelector('.image-clear-btn').style.display = 'none';
        imageInput.value = '';
    }
    
    // 从 FileList 中移除对应的文件
    const dt = new DataTransfer();
    const files = imageInput.files;
    for (let i = 0; i < files.length; i++) {
        if (i !== Array.from(previewContainer.children).indexOf(previewItem)) {
            dt.items.add(files[i]);
        }
    }
    imageInput.files = dt.files;
}

// 显示资源
function displayResources(resources) {
    // 图片列表
    const imageListHtml = resources
        .filter(resource => resource.image_path)
        .map(resource => `
            <div class="image-item">
                <img src="${resource.image_path}" alt="${resource.movie_name}" onclick="copyImageToClipboard('${resource.image_path}')">
                <div class="image-info">
                    <span>${resource.movie_name}</span>
                    ${resource.title ? `<span>${resource.title}</span>` : ''}
                </div>
                <button class="delete-btn" onclick="deleteResource(${resource.id}, 'image')">×</button>
            </div>
        `).join('');
    imageList.innerHTML = imageListHtml;

    // 标题列表
    const titleListHtml = resources
        .filter(resource => resource.title)
        .map(resource => `
            <div class="title-item">
                <div class="title-info">
                    <span class="movie-name">${resource.movie_name}</span>
                    <span class="title" onclick="copyToClipboard('${resource.title}')">${resource.title}</span>
                </div>
                <button class="delete-btn" onclick="deleteResource(${resource.id}, 'title')">×</button>
            </div>
        `).join('');
    titleList.innerHTML = titleListHtml;
}

// 复制图片到剪贴板
async function copyImageToClipboard(imageUrl) {
    try {
        // 创建一个 img 元素来加载图片
        const img = new Image();
        img.crossOrigin = 'anonymous';  // 允许跨域
        
        // 等待图片加载完成
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
            img.src = imageUrl;
        });

        // 创建 canvas 并绘制图片
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);

        // 将 canvas 转换为 blob
        const blob = await new Promise(resolve => {
            canvas.toBlob(resolve, 'image/png');
        });

        // 尝试复制到剪贴板
        await navigator.clipboard.write([
            new ClipboardItem({
                'image/png': blob
            })
        ]);
        
        // 显示成功提示
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = '图片已复制到剪贴板';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    } catch (err) {
        console.error('复制图片失败:', err);
        alert('复制图片失败，请右键图片另存为');
    }
}

// 复制文本到剪贴板
async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
        
        // 显示提示
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.textContent = '文本已复制到剪贴板';
        document.body.appendChild(toast);
        setTimeout(() => toast.remove(), 2000);
    } catch (err) {
        console.error('复制文本失败:', err);
        alert('复制失败，请重试');
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
    if (!confirm('确定要删除吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/resources/${id}?type=${type}`, {
            method: 'DELETE'
        });

        if (!response.ok) {
            throw new Error('删除失败');
        }

        // 刷新资源列表
        loadResources();
    } catch (error) {
        console.error('删除失败:', error);
        alert('删除失败，请重试');
    }
} 