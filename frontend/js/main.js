// 全局变量
let currentPage = 1;
let searchKeyword = '';
let pageSize = 12; // 默认每页显示12条数据

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
    console.log('页面加载完成');
    loadResources();
    initializeEventListeners();
});

// 事件监听器初始化
function initializeEventListeners() {
    console.log('初始化事件监听器');
    
    // 搜索相关
    searchBtn.addEventListener('click', handleSearch);
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    
    // 上传表单相关
    uploadForm.addEventListener('submit', handleUpload);
    
    // 图片上传区域点击事件
    const uploadArea = document.querySelector('.image-upload-area');
    uploadArea.addEventListener('click', () => {
        console.log('点击上传区域');
        document.getElementById('imageInput').click();
    });
    
    // 图片选择事件
    document.getElementById('imageInput').addEventListener('change', (e) => {
        console.log('选择文件:', e.target.files);
        handleFileSelect(e);
    });
    
    // 拖放上传
    uploadArea.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.add('dragover');
    });
    
    uploadArea.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
    });
    
    uploadArea.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        uploadArea.classList.remove('dragover');
        const files = e.dataTransfer.files;
        handleFileSelect({ target: { files } });
    });
    
    // 分页相关
    prevPageBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            loadResources();
        }
    });
    
    nextPageBtn.addEventListener('click', () => {
        const hasNoData = document.querySelector('.no-data');
        if (!hasNoData) {
            currentPage++;
            loadResources();
        }
    });
    
    // 视图切换
    showImagesBtn.addEventListener('click', () => {
        showImagesBtn.classList.add('active');
        showTitlesBtn.classList.remove('active');
        imageSection.classList.add('active');
        titleSection.classList.remove('active');
        currentPage = 1;
        loadResources();
    });
    
    showTitlesBtn.addEventListener('click', () => {
        showTitlesBtn.classList.add('active');
        showImagesBtn.classList.remove('active');
        titleSection.classList.add('active');
        imageSection.classList.remove('active');
        currentPage = 1;
        loadResources();
    });
    
    // 标题输入框粘贴事件
    titleInput.addEventListener('paste', async (e) => {
        e.preventDefault();
        const text = e.clipboardData.getData('text');
        const titles = text.split('\n').filter(t => t.trim());
        
        if (titles.length > 1) {
            // 批量处理标题
            for (const title of titles) {
                if (!title.trim()) continue;
                
                const formData = new FormData();
                if (movieNameInput.value.trim()) {
                    formData.append('movie_name', movieNameInput.value.trim());
                }
                formData.append('title', title.trim());
                
                try {
                    const response = await fetch('/api/resources', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (!response.ok) {
                        const data = await response.json();
                        console.error('上传失败:', data.error);
                    }
                } catch (err) {
                    console.error('上传失败:', err);
                }
            }
            
            // 刷新资源列表
            loadResources();
            showToast(`成功处理 ${titles.length} 个标题`);
            titleInput.value = '';
        } else {
            titleInput.value = text;
        }
    });
    
    // XLSX文件上传处理
    document.getElementById('titleFileInput').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        
        try {
            const workbook = await readXlsxFile(file);
            let successCount = 0;
            
            for (const [title, viewCount] of workbook) {
                if (!title) continue;
                
                const formData = new FormData();
                formData.append('title', title.toString().trim());
                if (typeof viewCount === 'number') {
                    formData.append('view_count', viewCount);
                }
                
                try {
                    const response = await fetch('/api/resources', {
                        method: 'POST',
                        body: formData
                    });
                    
                    if (response.ok) {
                        successCount++;
                    } else {
                        const data = await response.json();
                        console.error('上传失败:', data.error);
                    }
                } catch (err) {
                    console.error('上传失败:', err);
                }
            }
            
            // 刷新资源列表
            loadResources();
            showToast(`成功导入 ${successCount} 个标题`);
            e.target.value = ''; // 清空文件输入
        } catch (err) {
            console.error('处理XLSX文件失败:', err);
            showToast('处理XLSX文件失败，请检查文件格式');
        }
    });
}

// 处理文件选择
function handleFileSelect(e) {
    console.log('处理文件选择');
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

// 处理图片文件
function handleImageFile(file) {
    console.log('处理图片文件:', file);
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

// 处理上传
async function handleUpload(e) {
    e.preventDefault();
    console.log('处理上传');
    const movieName = movieNameInput.value.trim();
    const title = titleInput.value.trim();
    const files = imageInput.files;

    try {
        let successCount = 0;
        let duplicateCount = 0;

        if (files && files.length > 0) {
            // 如果有图片文件，上传图片
            for (let i = 0; i < files.length; i++) {
                const formData = new FormData();
                if (movieName) formData.append('movie_name', movieName);
                if (title) formData.append('title', title);
                formData.append('image', files[i]);

                try {
                    const response = await fetch('/api/resources', {
                        method: 'POST',
                        body: formData
                    });

                    const data = await response.json();
                    if (response.ok) {
                        successCount++;
                    } else if (data.error && data.error.includes('已存在')) {
                        duplicateCount++;
                        console.log('跳过重复项:', data.error);
                    } else {
                        throw new Error(data.error || '上传失败');
                    }
                } catch (err) {
                    if (err.message.includes('已存在')) {
                        duplicateCount++;
                        console.log('跳过重复项:', err.message);
                        continue;
                    }
                    throw err;
                }
            }
        } else if (title) {
            // 如果没有图片，只上传影视名字和标题
            const formData = new FormData();
            if (movieName) formData.append('movie_name', movieName);
            formData.append('title', title);

            try {
                const response = await fetch('/api/resources', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();
                if (response.ok) {
                    successCount++;
                } else if (data.error && data.error.includes('已存在')) {
                    duplicateCount++;
                    console.log('跳过重复项:', data.error);
                } else {
                    throw new Error(data.error || '上传失败');
                }
            } catch (err) {
                if (err.message.includes('已存在')) {
                    duplicateCount++;
                    console.log('跳过重复项:', err.message);
                } else {
                    throw err;
                }
            }
        }

        // 清空表单
        movieNameInput.value = '';
        titleInput.value = '';
        clearImage();
        
        // 刷新资源列表
        loadResources();

        // 如果有成功上传的项目，显示简短的提示
        if (successCount > 0) {
            showToast(`成功上传 ${successCount} 个资源`);
        }
        // 如果有重复项，在控制台输出信息
        if (duplicateCount > 0) {
            console.log(`${duplicateCount} 个重复项已跳过`);
        }
    } catch (error) {
        console.error('Error:', error);
        showToast(error.message);
    }
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

// 移除预览图片
function removePreview(button) {
    const previewItem = button.parentElement;
    const previewContainer = previewItem.parentElement;
    previewItem.remove();
    
    if (previewContainer.children.length === 0) {
        document.querySelector('.upload-placeholder').style.display = 'block';
        previewContainer.style.display = 'none';
        document.querySelector('.image-clear-btn').style.display = 'none';
        imageInput.value = '';
    }
    
    const dt = new DataTransfer();
    const files = imageInput.files;
    for (let i = 0; i < files.length; i++) {
        if (i !== Array.from(previewContainer.children).indexOf(previewItem)) {
            dt.items.add(files[i]);
        }
    }
    imageInput.files = dt.files;
}

// 加载资源
async function loadResources(keyword = '') {
    try {
        const showingImages = imageSection.classList.contains('active');
        const type = showingImages ? 'image' : 'title';
        pageSize = type === 'title' ? 15 : 12; // 标题列表每页15条，图片列表每页12条
        
        const url = keyword
            ? `/api/search?keyword=${encodeURIComponent(keyword)}&type=${type}`
            : `/api/resources?page=${currentPage}&type=${type}`;
            
        console.log('Fetching resources from:', url);
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const resources = await response.json();
        console.log('Received resources:', resources);
        
        // 如果当前页没有数据且不是第一页，则回到上一页
        if (resources.length === 0 && currentPage > 1) {
            currentPage--;
            loadResources();
            return;
        }

        displayResources(resources, showingImages);
        
        // 根据返回的数据长度判断是否为最后一页
        const isLastPage = resources.length < pageSize;
        updatePagination(isLastPage);
    } catch (error) {
        console.error('加载资源失败:', error);
        showToast('加载资源失败，请稍后重试');
    }
}

// 显示资源
function displayResources(resources, showingImages = true) {
    const container = showingImages ? imageList : titleList;
    container.innerHTML = '';

    if (resources.length === 0) {
        container.innerHTML = '<div class="no-data">暂无数据</div>';
        return;
    }

    if (showingImages) {
        resources.forEach(resource => {
            if (!resource.image_path) {
                console.log('Skipping resource without image:', resource);
                return;
            }
            
            const item = document.createElement('div');
            item.className = 'image-item';
            
            // 处理图片路径
            const fileName = resource.image_path.replace(/^.*[\\\/]/, '');
            const imagePath = `/uploads/${encodeURIComponent(fileName)}`;
            
            // 获取影视剧名字
            const movieName = resource.movie_name || '未知影视剧';
            
            console.log('Processing image:', {
                original: resource.image_path,
                fileName: fileName,
                finalPath: imagePath,
                movieName: movieName
            });
            
            // 添加加载状态类
            item.classList.add('loading');
            
            item.innerHTML = `
                <div class="image-loading">加载中...</div>
                <img src="${imagePath}" alt="${movieName}" 
                    onerror="console.error('Image load failed:', this.src); this.onerror=null; this.src='/placeholder.png'; this.parentElement.classList.remove('loading');" 
                    onload="console.log('Image loaded successfully:', this.src); this.parentElement.classList.remove('loading');"
                    style="width: 100%; height: 100%; object-fit: contain; cursor: pointer;"
                    onclick="showPreview('${imagePath}')">
                <div class="movie-title">${movieName}</div>
                <button class="delete-button" onclick="deleteResource(${resource.id}, 'image')">删除</button>
            `;
            container.appendChild(item);
        });
    } else {
        resources.forEach(resource => {
            if (!resource.title) return;
            
            const item = document.createElement('div');
            item.className = 'title-item';
            
            const movieName = resource.movie_name ? `《${resource.movie_name}》` : '';
            const viewCount = resource.view_count ? `${resource.view_count}次观看` : '';
            
            item.innerHTML = `
                <div class="title-info">
                    <div class="title-header">
                        <div class="header-line">
                            ${movieName ? `<span class="movie-name">${movieName}</span>` : ''}
                            ${viewCount ? `<span class="view-count">${viewCount}</span>` : ''}
                        </div>
                        <div class="title-content">${resource.title}</div>
                    </div>
                </div>
                <div class="title-actions">
                    <button onclick="deleteResource(${resource.id}, 'title')" class="delete-button">删除</button>
                    <div class="copy-buttons">
                        <button onclick="copyText('${resource.title.replace(/'/g, "\\'")}')" class="copy-button">复制标题</button>
                        ${movieName ? `<button onclick="copyText('${resource.movie_name.replace(/'/g, "\\'")}')" class="copy-button">复制片名</button>` : ''}
                    </div>
                </div>
            `;
            
            container.appendChild(item);
        });
    }
}

// 删除资源
async function deleteResource(id, type) {
    if (!confirm('确定要删除这个资源吗？')) {
        return;
    }

    try {
        const response = await fetch(`/api/resources/${id}?type=${type}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            await loadResources(); // 重新加载资源列表
            showToast('删除成功');
        } else {
            const data = await response.json();
            throw new Error(data.error || '删除失败');
        }
    } catch (error) {
        console.error('删除失败:', error);
        showToast(error.message);
    }
}

// 显示全屏图片
function showFullImage(imageUrl) {
    const modal = document.getElementById('previewModal');
    const modalImg = document.getElementById('previewImage');
    const closeBtn = document.querySelector('.close');
    
    modal.style.display = 'block';
    modalImg.src = imageUrl;
    
    // 点击关闭按钮关闭模态框
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    // 点击模态框外部关闭模态框
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// 初始化模态框
function initializeModal() {
    const modal = document.getElementById('previewModal');
    const closeBtn = document.querySelector('.close');
    
    // 点击关闭按钮关闭模态框
    if (closeBtn) {
        closeBtn.onclick = function() {
            modal.style.display = 'none';
        }
    }
    
    // 点击模态框外部关闭模态框
    window.onclick = function(event) {
        if (event.target == modal) {
            modal.style.display = 'none';
        }
    }
}

// 更新分页按钮状态
function updatePagination(isLastPage) {
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = isLastPage;
    currentPageSpan.textContent = currentPage;
    
    // 如果没有数据，隐藏分页控件
    const paginationContainer = document.querySelector('.pagination');
    const hasNoData = document.querySelector('.no-data');
    paginationContainer.style.display = hasNoData ? 'none' : 'flex';
}

// 分页处理
function changePage(delta) {
    const newPage = currentPage + delta;
    if (newPage < 1) return;
    
    currentPage = newPage;
    currentPageSpan.textContent = currentPage;
    loadResources();
}

// 搜索处理
function handleSearch() {
    searchKeyword = searchInput.value.trim();
    if (searchKeyword) {
        currentPage = 1;
        loadResources(searchKeyword);
    }
}

// 复制文本到剪贴板
async function copyText(text) {
    try {
        // 创建临时文本区域
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            // 尝试使用新的 API
            await navigator.clipboard.writeText(text);
            showToast('复制成功！');
        } catch (err) {
            // 如果新 API 失败，使用传统方法
            document.execCommand('copy');
            showToast('复制成功！');
        }
        
        document.body.removeChild(textArea);
    } catch (err) {
        console.error('复制失败:', err);
        showToast('复制失败，请手动复制');
    }
}

// 复制图片到剪贴板
async function copyImageToClipboard(imageUrl) {
    try {
        const response = await fetch(imageUrl);
        const blob = await response.blob();
        
        try {
            // 尝试使用新的 API
            await navigator.clipboard.write([
                new ClipboardItem({
                    [blob.type]: blob
                })
            ]);
            showToast('图片已复制到剪贴板！');
        } catch (err) {
            // 如果新 API 失败，打开图片在新标签页
            window.open(imageUrl, '_blank');
            showToast('请右键点击图片并选择"复制图片"');
        }
    } catch (err) {
        console.error('复制图片失败:', err);
        showToast('复制失败，请手动复制图片');
    }
}

// 显示提示信息
function showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    // 2秒后移除提示
    setTimeout(() => {
        toast.remove();
    }, 2000);
}

// 读取XLSX文件
async function readXlsxFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                resolve(rows.slice(1)); // 跳过表头行
            } catch (err) {
                reject(err);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

// 显示预览图片
function showPreview(imageUrl) {
    const modal = document.getElementById('previewModal');
    const modalImg = document.getElementById('previewImage');
    const closeBtn = document.querySelector('.close');
    
    modal.style.display = 'block';
    modalImg.src = decodeURIComponent(imageUrl);
    
    // 点击关闭按钮关闭模态框
    closeBtn.onclick = function() {
        modal.style.display = 'none';
    }
    
    // 点击模态框外部关闭模态框
    modal.onclick = function(event) {
        if (event.target === modal) {
            modal.style.display = 'none';
        }
    }
} 