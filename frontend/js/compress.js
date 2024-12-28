/**
 * 图片压缩工具
 * 使用Canvas进行图片压缩
 */

const compressImage = (file, options = {}) => {
    const {
        maxWidth = 1920,
        maxHeight = 1920,
        quality = 0.7,
        type = 'image/jpeg'
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);

        reader.onload = (e) => {
            const img = new Image();
            img.src = e.target.result;

            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // 计算缩放比例
                if (width > height && width > maxWidth) {
                    height = (height * maxWidth) / width;
                    width = maxWidth;
                } else if (height > maxHeight) {
                    width = (width * maxHeight) / height;
                    height = maxHeight;
                }

                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                canvas.width = width;
                canvas.height = height;

                // 绘制图片
                ctx.drawImage(img, 0, 0, width, height);

                // 转换为Blob
                canvas.toBlob((blob) => {
                    resolve(new File([blob], file.name, {
                        type: type,
                        lastModified: Date.now()
                    }));
                }, type, quality);
            };

            img.onerror = () => {
                reject(new Error('图片加载失败'));
            };
        };

        reader.onerror = () => {
            reject(new Error('文件读取失败'));
        };
    });
}; 