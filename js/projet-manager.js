// js/projet-manager.js

document.addEventListener('DOMContentLoaded', () => {
    // --- 1. RÉCUPÉRATION DES DONNÉES DU PROJET ---
    const params = new URLSearchParams(window.location.search);
    const projectId = params.get('id');
    const currentFilter = params.get('filter') || 'all';

    const projectIndex = PROJECTS_DATA.findIndex(p => p.id === projectId);
    const currentProject = PROJECTS_DATA[projectIndex];

    if (!currentProject) return;

    document.title = `${currentProject.title} | Alice Auger`;

    // --- 2. MISE À JOUR DU CONTENU ---
    const nameEl = document.querySelector('.name-project .reveal-text');
    const catEl = document.querySelector('.projet-category');
    const yearEl = document.querySelector('.project-year');
    const descContainer = document.querySelector('.description-text');
    const detailsContainer = document.querySelector('.project-details');
    
    // ÉLÉMENT IMAGE HERO
    const heroImgEl = document.getElementById('project-hero-img');

    if (nameEl) {
        nameEl.innerHTML = currentProject.displayTitle || currentProject.title;
    }
    if (catEl) {
        catEl.innerHTML = `${currentProject.displayCategory}`;
    }
    if (yearEl) {
        yearEl.textContent = currentProject.year;
    }

    // Gestion de la description (gestion des paragraphes \n\n)
    if (descContainer && currentProject.description) {
        const paragraphs = currentProject.description.split('\n\n');
        descContainer.innerHTML = paragraphs.map(p => `<p>${p.replace(/\n/g, '<br>')}</p>`).join('');
    }

    // INJECTION DE L'IMAGE HERO + AJOUT DE LA CLASSE .loaded
    if (heroImgEl && currentProject.imageHero) {
        heroImgEl.src = currentProject.imageHero;
        heroImgEl.alt = currentProject.title;

        // Si l'image est déjà chargée en cache navigateur
        if (heroImgEl.complete) {
            heroImgEl.classList.add('loaded');
        } else {
            // Sinon on attend le chargement
            heroImgEl.onload = () => heroImgEl.classList.add('loaded');
        }
    }

    // INJECTION DES MÉTADONNÉES
    // Chaque champ n'est affiché que s'il est renseigné dans data.js —
    // évite des lignes vides tant que client/prestations ne sont pas remplis.
    if (detailsContainer) {
        const rows = [];

        if (currentProject.client) {
            rows.push(`
                <li>
                    <span class="meta-label">Client</span>
                    <span class="meta-value">${currentProject.client}</span>
                </li>`);
        }

        if (currentProject.displayCategory) {
            rows.push(`
                <li>
                    <span class="meta-label">Catégorie</span>
                    <span class="meta-value">${currentProject.displayCategory}</span>
                </li>`);
        }

        if (currentProject.year) {
            rows.push(`
                <li>
                    <span class="meta-label">Année</span>
                    <span class="meta-value">${currentProject.year}</span>
                </li>`);
        }

        if (Array.isArray(currentProject.prestations) && currentProject.prestations.length) {
            const items = currentProject.prestations.map(p => `<li>${p}</li>`).join('');
            rows.push(`
                <li>
                    <span class="meta-label">Prestations</span>
                    <ul class="meta-services">${items}</ul>
                </li>`);
        }

        detailsContainer.innerHTML = rows.join('');
    }

    // --- 3. GALERIE ---
    const galleryGrid = document.querySelector('.project-grid');

    if (galleryGrid && currentProject.gallery) {
        galleryGrid.innerHTML = '';

        currentProject.gallery.forEach(imgData => {
            const item = document.createElement('div');
            // Injection automatique des classes : reveal-mask, project-grid-item + le layout (portrait, tall, etc.)
            item.className = `reveal-mask project-grid-item ${imgData.layout || 'square'}`;

            const isVideo = imgData.src.toLowerCase().endsWith('.mp4');
            if (isVideo) {
                item.innerHTML = `
                <video 
                    src="${imgData.src}" 
                    class="video-gallery" 
                    autoplay 
                    muted 
                    loop 
                    playsinline 
                    webkit-playsinline 
                    preload="auto"
                    style="cursor:pointer;">
                </video>`;
            } else {
                item.innerHTML = `<img src="${imgData.src}" loading="lazy" alt="${currentProject.title}">`;
            }
            galleryGrid.appendChild(item);
        });

        // Calcul du span de chaque case à partir de sa largeur réelle (fixée par
        // les colonnes de la grille) et de son aspect-ratio CSS (.square/.portrait/
        // .tall/.landscape/.wide) — jamais à partir de la hauteur du média, qui
        // dépend elle-même du span qu'on cherche à calculer (boucle circulaire).
        resizeAllGridItems();

        let resizeTimer;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(resizeAllGridItems, 150);
        });
    }

    function getItemAspectRatio(item) {
        const css = getComputedStyle(item).aspectRatio; // ex: "4 / 5"
        if (!css || css === 'auto') return 1;
        const [w, h] = css.split('/').map(Number);
        return w / h; // largeur / hauteur
    }

    function resizeGridItem(item) {
        const grid = item.closest('.project-grid');
        const rowUnit = parseFloat(getComputedStyle(grid).getPropertyValue('grid-auto-rows')) || 1;
        const rowGap = parseFloat(getComputedStyle(grid).getPropertyValue('row-gap')) || 16;

        const itemWidth = item.getBoundingClientRect().width; // fiable : vient des colonnes
        const desiredHeight = itemWidth / getItemAspectRatio(item);

        const span = Math.ceil((desiredHeight + rowGap) / (rowUnit + rowGap));
        item.style.gridRowEnd = `span ${span}`;
    }

    function resizeAllGridItems() {
        document.querySelectorAll('.project-grid .project-grid-item').forEach(resizeGridItem);
    }

    // --- 4. NAVIGATION SUIVANT ---
    const nextLink = document.getElementById('next-project-link');
    const nextTitle = document.getElementById('next-project-title');
    const nextImg = document.getElementById('next-project-img');

    let filteredList = PROJECTS_DATA;
    if (currentFilter && currentFilter !== 'all') {
        filteredList = PROJECTS_DATA.filter(p => p.category === currentFilter);
    }

    let filteredIndex = filteredList.findIndex(p => p.id === projectId);

    if (filteredIndex === -1) {
        filteredList = PROJECTS_DATA;
        filteredIndex = filteredList.findIndex(p => p.id === projectId);
    }

    if (filteredIndex !== -1 && filteredList.length > 0) {
        const nextProject = filteredList[(filteredIndex + 1) % filteredList.length];
        const targetUrl = `projets.html?id=${nextProject.id}&filter=${currentFilter}`;

        if (nextLink) {
            nextLink.setAttribute('href', targetUrl);
        }

        if (nextTitle) {
            nextTitle.textContent = nextProject.title;
        }

        if (nextImg) {
            nextImg.src = nextProject.imageHero;
        }
    }

    // --- 5. INTERSECTION OBSERVER ---
    const observerOptions = { threshold: 0.1 };

    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');

                const video = entry.target.querySelector('video.video-gallery');
                if (video) {
                    video.muted = true;
                    const playPromise = video.play();
                    if (playPromise !== undefined) {
                        playPromise.catch(() => { console.log("Autoplay bloqué par le navigateur"); });
                    }

                    video.onclick = function () {
                        this.muted = !this.muted;
                        if (!this.muted) {
                            this.classList.add('sound-on');
                        } else {
                            this.classList.remove('sound-on');
                        }
                    };
                }
                revealObserver.unobserve(entry.target);
            }
        });
    }, observerOptions);

    document.querySelectorAll('.project-grid .reveal-mask').forEach(el => revealObserver.observe(el));
    if (nextLink) revealObserver.observe(nextLink);

    // --- 6. BOUTON RETOUR ---
    const backButton = document.getElementById('back-button');
    if (backButton) {
        backButton.addEventListener('click', (e) => {
            e.preventDefault();
            if (document.referrer && document.referrer.includes(window.location.hostname)) {
                history.back();
            } else {
                window.location.href = `index.html?filter=${currentFilter}#portfolio`;
            }
        });
    }
});