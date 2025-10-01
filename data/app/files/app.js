appInitUpdate();

app = {
    init: function () {
        class FileTree {
            constructor() {
                this.treeElement = document.getElementById('tree');
                this.loadingElement = document.getElementById('loading');
                this.currentPathElement = document.getElementById('currentPath');
                this.fileInfoElement = document.getElementById('fileInfo');
                this.refreshBtn = document.getElementById('refreshBtn');
                this.fileFilter = document.getElementById('fileFilter');

                // Elementy galerii
                this.galleryModal = document.getElementById('galleryModal');
                this.mainImage = document.getElementById('mainImage');
                this.imageName = document.getElementById('imageName');
                this.imageSize = document.getElementById('imageSize');
                this.thumbnailsContainer = document.getElementById('thumbnailsContainer');
                this.prevBtn = document.getElementById('prevBtn');
                this.nextBtn = document.getElementById('nextBtn');
                this.closeGallery = document.getElementById('closeGallery');

                this.fileTypes = '';
                this.currentImages = [];
                this.currentImageIndex = 0;
                this.currentDirectory = '';

                this.init();
            }

            init() {
                this.refreshBtn.addEventListener('click', () => this.loadTree());
                this.fileFilter.addEventListener('input', (e) => {
                    this.fileTypes = e.target.value;
                    this.loadTree();
                });

                // Event listeners dla galerii
                this.closeGallery.addEventListener('click', () => this.hideGallery());
                this.prevBtn.addEventListener('click', () => this.showPreviousImage());
                this.nextBtn.addEventListener('click', () => this.showNextImage());
                this.mainImage.addEventListener('click', () => this.toggleZoom());

                this.galleryModal.addEventListener('click', (e) => {
                    if (e.target === this.galleryModal) {
                        this.hideGallery();
                    }
                });

                document.addEventListener('keydown', (e) => this.handleKeyPress(e));

                this.loadTree();
            }

            async loadTree(path = '') {
                this.showLoading();

                const url = `/api/files?dir=${encodeURIComponent(path)}${this.fileTypes ? `&type=${this.fileTypes}` : ''}`;
                console.log('🔄 Ładowanie:', url);

                const result = await apiRequest(url);

                this.hideLoading();

                if (!result || !result.success) {
                    this.showError('Błąd ładowania danych');
                    return;
                }

                console.log('📁 Otrzymane dane:', result.data);
                this.updateCurrentPath(result.data.current_directory);
                this.currentDirectory = path;

                // Zapisz zdjęcia dla galerii z aktualnego katalogu
                this.currentImages = result.data.files.filter(file =>
                    this.isImageFile(file.extension)
                );

                console.log('🖼️ Znalezione zdjęcia:', this.currentImages);

                this.renderTree(result.data);
            }

            renderTree(data) {
                this.treeElement.innerHTML = '';

                if (data.directories.length === 0 && data.files.length === 0) {
                    this.treeElement.innerHTML = '<div class="empty-message">📭 Brak plików i katalogów</div>';
                    return;
                }

                // Renderuj katalogi
                data.directories.forEach(dir => {
                    const dirElement = this.createDirectoryElement(dir);
                    this.treeElement.appendChild(dirElement);
                });

                // Renderuj pliki
                data.files.forEach(file => {
                    const fileElement = this.createFileElement(file);
                    this.treeElement.appendChild(fileElement);
                });
            }

            createDirectoryElement(directory) {
                const item = document.createElement('div');
                item.className = 'tree-item';
                item.innerHTML = `
            <div class="tree-content" data-path="${this.escapeHtml(directory.path)}" data-type="directory">
                <span class="toggle">▶</span>
                <span class="icon">📁</span>
                <span class="name">${this.escapeHtml(directory.name)}</span>
            </div>
            <div class="children" style="display: none;"></div>
        `;

                const content = item.querySelector('.tree-content');
                const toggle = item.querySelector('.toggle');
                const children = item.querySelector('.children');

                content.addEventListener('click', async (e) => {
                    e.stopPropagation();

                    if (children.style.display === 'none') {
                        await this.expandDirectory(directory, children);
                        toggle.classList.add('expanded');
                        children.style.display = 'block';
                    } else {
                        toggle.classList.remove('expanded');
                        children.style.display = 'none';
                    }

                    this.selectItem(content);
                });

                return item;
            }

            createFileElement(file) {
                const item = document.createElement('div');
                item.className = 'tree-item';

                const size = this.formatFileSize(file.size);
                const icon = this.getFileIcon(file.extension);
                const isImage = this.isImageFile(file.extension);

                item.innerHTML = `
            <div class="tree-content" data-path="${this.escapeHtml(file.path)}" data-type="file" 
                 data-file='${JSON.stringify(file)}' data-is-image="${isImage}">
                <span class="toggle"></span>
                <span class="icon">${icon}</span>
                <span class="name">${this.escapeHtml(file.name)}</span>
                <span class="file-size">${size}</span>
            </div>
        `;

                const content = item.querySelector('.tree-content');
                content.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this.selectItem(content);

                    if (isImage) {
                        this.showImageGallery(file);
                    } else {
                        this.showFileInfo(file);
                    }
                });

                return item;
            }

            async expandDirectory(directory, childrenContainer) {
                if (childrenContainer.children.length > 0) {
                    console.log('📁 Katalog już rozwinięty:', directory.name);
                    return;
                }

                console.log('🔄 Rozwijanie katalogu:', directory.name);

                const url = `/api/files?dir=${encodeURIComponent(directory.name)}${this.fileTypes ? `&type=${this.fileTypes}` : ''}`;

                console.log('📡 Żądanie do:', url);

                const result = await apiRequest(url);

                if (!result || !result.success) {
                    console.error('❌ Błąd ładowania katalogu:', directory.name);
                    childrenContainer.innerHTML = '<div class="error">❌ Błąd ładowania</div>';
                    return;
                }

                console.log('✅ Załadowano katalog:', result.data);

                if (result.data.directories.length === 0 && result.data.files.length === 0) {
                    childrenContainer.innerHTML = '<div class="empty-message">📭 Pusty katalog</div>';
                    return;
                }

                result.data.directories.forEach(dir => {
                    const dirElement = this.createDirectoryElement(dir);
                    childrenContainer.appendChild(dirElement);
                });

                result.data.files.forEach(file => {
                    const fileElement = this.createFileElement(file);
                    childrenContainer.appendChild(fileElement);
                });
            }

            // POPRAWIONA GALERIA - DZIAŁA DLA GŁÓWNEGO KATALOGU
            async showImageGallery(clickedFile) {
                console.log('🖼️ Kliknięto zdjęcie:', clickedFile);
                console.log('📁 Aktualne zdjęcia:', this.currentImages);

                // Sprawdź czy kliknięte zdjęcie jest w currentImages
                let imageIndex = this.currentImages.findIndex(img => img.path === clickedFile.path);

                if (imageIndex === -1) {
                    // Zdjęcie nie znalezione - może być w podkatalogu
                    console.log('🔍 Zdjęcie nie znalezione w currentImages, szukam w podkatalogu...');

                    const fileDirectory = this.getDirectoryFromPath(clickedFile.path);
                    console.log('📁 Szukam w katalogu:', fileDirectory);

                    if (fileDirectory && fileDirectory !== this.currentDirectory) {
                        // Załaduj zdjęcia z właściwego katalogu
                        await this.loadImagesFromDirectory(fileDirectory, clickedFile);
                        return;
                    } else {
                        // To zdjęcie powinno być w currentImages, ale nie ma - odśwież listę
                        console.log('🔄 Odświeżam listę zdjęć dla aktualnego katalogu');
                        await this.loadImagesFromDirectory(this.currentDirectory, clickedFile);
                        return;
                    }
                }

                // Zdjęcie znalezione - pokaż galerię
                this.currentImageIndex = imageIndex;
                this.showGallery();
                this.updateGallery();
            }

            async loadImagesFromDirectory(directoryPath, clickedFile) {
                console.log('🔄 Ładowanie zdjęć z katalogu:', directoryPath);

                // Dla głównego katalogu directoryPath będzie pusty string
                const url = directoryPath ? `/api/files?dir=${encodeURIComponent(directoryPath)}` : '/api/files';
                const result = await apiRequest(url);

                if (!result || !result.success) {
                    console.error('❌ Błąd ładowania zdjęć z katalogu:', directoryPath);
                    this.showFileInfo(clickedFile);
                    return;
                }

                // Zaktualizuj listę zdjęć
                this.currentImages = result.data.files.filter(file =>
                    this.isImageFile(file.extension)
                );

                console.log('🖼️ Nowa lista zdjęć:', this.currentImages);

                // Znajdź indeks klikniętego zdjęcia w nowej liście
                const imageIndex = this.currentImages.findIndex(img => img.path === clickedFile.path);

                if (imageIndex === -1) {
                    console.warn('❌ Zdjęcie nie znalezione nawet po załadowaniu katalogu');
                    this.showFileInfo(clickedFile);
                    return;
                }

                this.currentImageIndex = imageIndex;
                this.showGallery();
                this.updateGallery();
            }

            getDirectoryFromPath(filePath) {
                // Wyodrębnij katalog z ścieżki pliku
                const pathParts = filePath.split(/[\\\/]/);
                console.log('🔍 Analiza ścieżki:', filePath, 'Części:', pathParts);

                if (pathParts.length > 2) {
                    // Plik jest w podkatalogu, np: "FILES\Zdjęcia\obraz.jpg" -> "Zdjęcia"
                    const directory = pathParts[pathParts.length - 2];
                    console.log('📁 Znaleziono katalog:', directory);
                    return directory;
                } else if (pathParts.length === 2) {
                    // Plik jest w głównym katalogu FILES, np: "FILES\obraz.jpg"
                    console.log('📁 Plik w głównym katalogu FILES');
                    return ''; // Pusty string oznacza główny katalog
                }

                console.log('❓ Nieznany format ścieżki:', filePath);
                return '';
            }

            showGallery() {
                this.galleryModal.style.display = 'block';
                document.body.style.overflow = 'hidden';
                console.log('🎨 Galeria otwarta');
            }

            hideGallery() {
                this.galleryModal.style.display = 'none';
                document.body.style.overflow = '';
                this.mainImage.classList.remove('zoomed');
                console.log('🎨 Galeria zamknięta');
            }

            updateGallery() {
                const currentImage = this.currentImages[this.currentImageIndex];

                if (!currentImage) {
                    console.error('❌ Brak aktualnego zdjęcia w galerii');
                    return;
                }

                console.log('🖼️ Aktualizuję galerię dla:', currentImage.name);

                // Aktualizuj główne zdjęcie
                this.mainImage.src = `/api/file-content?path=${encodeURIComponent(currentImage.path)}`;
                this.mainImage.alt = currentImage.name;
                this.mainImage.classList.add('loading-image');

                this.mainImage.onload = () => {
                    this.mainImage.classList.remove('loading-image');
                    this.mainImage.classList.add('loaded-image');
                    console.log('✅ Zdjęcie załadowane:', currentImage.name);
                };

                this.mainImage.onerror = () => {
                    console.error('❌ Błąd ładowania zdjęcia:', currentImage.path);
                    this.mainImage.alt = 'Błąd ładowania zdjęcia';
                    this.mainImage.classList.remove('loading-image');
                };

                // Aktualizuj informacje
                this.imageName.textContent = currentImage.name;
                this.imageSize.textContent = this.formatFileSize(currentImage.size);

                // Aktualizuj przyciski nawigacji
                this.prevBtn.disabled = this.currentImageIndex === 0;
                this.nextBtn.disabled = this.currentImageIndex === this.currentImages.length - 1;

                // Aktualizuj miniaturki
                this.updateThumbnails();
            }

            updateThumbnails() {
                this.thumbnailsContainer.innerHTML = '';

                if (this.currentImages.length === 0) {
                    console.log('📭 Brak zdjęć do wyświetlenia w miniaturkach');
                    return;
                }

                console.log('🖼️ Tworzenie miniaturek:', this.currentImages.length);

                this.currentImages.forEach((image, index) => {
                    const thumbnail = document.createElement('img');
                    thumbnail.className = `thumbnail ${index === this.currentImageIndex ? 'active' : ''}`;
                    thumbnail.src = `/api/file-content?path=${encodeURIComponent(image.path)}`;
                    thumbnail.alt = image.name;
                    thumbnail.title = image.name;

                    thumbnail.style.opacity = '0.5';
                    thumbnail.style.transition = 'opacity 0.3s';

                    thumbnail.addEventListener('load', () => {
                        thumbnail.style.opacity = '1';
                    });

                    thumbnail.addEventListener('click', () => {
                        console.log('🖼️ Kliknięto miniaturkę:', image.name);
                        this.currentImageIndex = index;
                        this.updateGallery();
                    });

                    this.thumbnailsContainer.appendChild(thumbnail);
                });
            }

            showPreviousImage() {
                if (this.currentImageIndex > 0) {
                    this.currentImageIndex--;
                    this.updateGallery();
                }
            }

            showNextImage() {
                if (this.currentImageIndex < this.currentImages.length - 1) {
                    this.currentImageIndex++;
                    this.updateGallery();
                }
            }

            toggleZoom() {
                this.mainImage.classList.toggle('zoomed');
            }

            handleKeyPress(e) {
                if (this.galleryModal.style.display !== 'block') return;

                switch (e.key) {
                    case 'ArrowLeft':
                        this.showPreviousImage();
                        break;
                    case 'ArrowRight':
                        this.showNextImage();
                        break;
                    case 'Escape':
                        this.hideGallery();
                        break;
                    case ' ':
                        e.preventDefault();
                        this.toggleZoom();
                        break;
                }
            }

            isImageFile(extension) {
                const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
                return imageExtensions.includes(extension?.toLowerCase());
            }

            selectItem(selectedContent) {
                document.querySelectorAll('.tree-content.selected').forEach(item => {
                    item.classList.remove('selected');
                });
                selectedContent.classList.add('selected');
            }

            showFileInfo(file) {
                const modified = new Date(file.modified * 1000).toLocaleString();
                const size = this.formatFileSize(file.size);

                this.fileInfoElement.innerHTML = `
            <div class="info-line"><span class="info-label">Nazwa:</span> ${file.name}</div>
            <div class="info-line"><span class="info-label">Ścieżka:</span> ${file.path}</div>
            <div class="info-line"><span class="info-label">Rozszerzenie:</span> ${file.extension || 'brak'}</div>
            <div class="info-line"><span class="info-label">Rozmiar:</span> ${size}</div>
            <div class="info-line"><span class="info-label">Zmodyfikowany:</span> ${modified}</div>
        `;
            }

            getFileIcon(extension) {
                const icons = {
                    '.jpg': '🖼️', '.jpeg': '🖼️', '.png': '🖼️', '.gif': '🖼️', '.bmp': '🖼️', '.svg': '🖼️',
                    '.pdf': '📕', '.doc': '📄', '.docx': '📄', '.txt': '📄', '.rtf': '📄',
                    '.xls': '📊', '.xlsx': '📊', '.csv': '📊',
                    '.zip': '📦', '.rar': '📦', '.7z': '📦', '.tar': '📦', '.gz': '📦',
                    '.mp3': '🎵', '.wav': '🎵', '.flac': '🎵',
                    '.mp4': '🎬', '.avi': '🎬', '.mkv': '🎬', '.mov': '🎬',
                    '.exe': '⚙️', '.msi': '⚙️',
                    '.html': '🌐', '.htm': '🌐', '.css': '🎨', '.js': '📜', '.json': '📜'
                };
                return icons[extension?.toLowerCase()] || '📄';
            }

            formatFileSize(bytes) {
                if (bytes === 0) return '0 B';
                const k = 1024;
                const sizes = ['B', 'KB', 'MB', 'GB'];
                const i = Math.floor(Math.log(bytes) / Math.log(k));
                return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
            }

            updateCurrentPath(path) {
                const pathElement = this.currentPathElement.querySelector('.path');
                pathElement.textContent = path;
            }

            showLoading() {
                this.loadingElement.style.display = 'block';
                this.treeElement.style.display = 'none';
            }

            hideLoading() {
                this.loadingElement.style.display = 'none';
                this.treeElement.style.display = 'block';
            }

            showError(message) {
                this.treeElement.innerHTML = `<div class="error">❌ ${message}</div>`;
            }

            escapeHtml(unsafe) {
                return unsafe
                    .replace(/&/g, "&amp;")
                    .replace(/</g, "&lt;")
                    .replace(/>/g, "&gt;")
                    .replace(/"/g, "&quot;")
                    .replace(/'/g, "&#039;");
            }
        }


        new FileTree();

    }
};