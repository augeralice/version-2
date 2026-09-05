// ============================================================
// TRANSITION DE PAGE — fondu noir à l'arrivée / avant de quitter
// ============================================================
// Repli pour les navigateurs qui ne supportent pas encore la View
// Transition API native (voir @view-transition dans style.css).
// Là où elle est supportée, ce bloc entier ne fait rien : le navigateur
// gère la transition tout seul, sans délai JS ni calque manuel.
(() => {
    if ('startViewTransition' in document) return;

    // On crée l'overlay nous-mêmes : aucune balise à ajouter dans le HTML,
    // ça fonctionne automatiquement sur toute page qui charge ce script.
    let overlay = document.querySelector('.page-transition-overlay');
    if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'page-transition-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        document.body.prepend(overlay);
    }

    const FADE_DURATION = 600; // ms — doit correspondre à la transition CSS

    // --- Apparition : on dissipe le noir dès que la page est prête ---
    const revealPage = () => {
        // Double rAF : on s'assure que le navigateur a bien peint l'état
        // opaque avant de démarrer la transition, sinon pas de fondu visible.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                overlay.classList.add('is-hidden');
            });
        });
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', revealPage);
    } else {
        revealPage();
    }

    // Retour depuis le cache navigateur (bouton précédent/suivant) :
    // on rejoue le fondu pour rester cohérent.
    window.addEventListener('pageshow', (e) => {
        if (e.persisted) {
            overlay.classList.remove('is-hidden');
            revealPage();
        }
    });

    // --- Disparition : avant de quitter vers un lien interne ---
    document.addEventListener('click', (e) => {
        // Si un autre script a déjà géré ce clic (ex: le bouton retour de
        // projet-manager.js), on ne s'en mêle pas.
        if (e.defaultPrevented) return;

        const link = e.target.closest('a');
        if (!link) return;

        const href = link.getAttribute('href');
        if (!href) return;

        const isExternal = link.hostname && link.hostname !== window.location.hostname;
        const isAnchor = href.startsWith('#');
        const isSpecialProtocol = href.startsWith('mailto:') || href.startsWith('tel:');
        const opensNewTab = link.target === '_blank';
        const hasModifier = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

        if (isExternal || isAnchor || isSpecialProtocol || opensNewTab || hasModifier || e.button !== 0) {
            return;
        }

        e.preventDefault();
        overlay.classList.remove('is-hidden');
        setTimeout(() => {
            window.location.href = link.href;
        }, FADE_DURATION);
    });
})();

if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
}

// 'pageshow' se déclenche à chaque affichage de la page, y compris
// quand elle revient du cache du navigateur (bouton retour / bfcache),
// contrairement à 'DOMContentLoaded' qui ne se redéclenche pas dans ce cas.
window.addEventListener('pageshow', () => {
    window.scrollTo(0, 0);
});

document.addEventListener('DOMContentLoaded', () => {
 
    window.scrollTo(0, 0);
    // --- 0. Burger ---
    const burgerCheck = document.getElementById('burger-check');
    const burgerLabel = document.querySelector('label.hamburger');
    if (burgerCheck && burgerLabel) {
        const syncAria = () => burgerLabel.setAttribute('aria-expanded', burgerCheck.checked ? 'true' : 'false');
        burgerCheck.addEventListener('change', syncAria);
        syncAria();
    }



    // --- 1. BARRE DE PROGRESSION ---
    const progressBar = document.querySelector('.progress-bar');
    if (progressBar) {
        window.addEventListener('scroll', () => {
            const pixels = window.pageYOffset || document.documentElement.scrollTop;
            const height = document.documentElement.scrollHeight - window.innerHeight;
            const percentage = (pixels / height) * 100;
            progressBar.style.width = percentage + '%';
        });
    }

    // --- 2. RÉCUPÉRATION DES ÉLÉMENTS ---
    const projects = document.querySelectorAll('.grid-item');
    const filters = document.querySelectorAll('.filter-btn');
    const filterNav = document.querySelector('.filter-nav');
    // Masques hero (logo/texte) : simple fondu, indépendant de la cascade galerie ci-dessous
    // Masques hero (logo/texte) : simple fondu, indépendant de la cascade galerie.
    // On exclut .project-grid-item : sur la page projet, ces éléments ont leur
    // propre cascade (voir projet-manager.js) — les observer ici en plus
    // déclencherait leur apparition sans délai, en conflit avec cette cascade.
    const itemsToReveal = document.querySelectorAll('.reveal-mask:not(.project-grid-item), .reveal-right');

    // --- 3. LOGIQUE DU REVEAL AU SCROLL (simple, sans cascade) ---
    const revealObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
                revealObserver.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    itemsToReveal.forEach(item => revealObserver.observe(item));

    // --- 3bis. REVEAL EN CASCADE (nav de filtres + galerie) ---
    // Objectif : que les éléments apparaissent dans l'ordre du DOM (ordre des blocs),
    // que ce soit au chargement (plusieurs éléments déjà visibles à l'écran) ou au
    // scroll (nouveaux éléments qui entrent dans le viewport). Le délai n'est plus
    // fixé en CSS par nth-child (limité aux 3 premiers) mais calculé ici, à chaque
    // "vague" d'apparition, ce qui s'adapte automatiquement au nombre de colonnes
    // affichées selon la taille d'écran.
    const cascadeItems = Array.from(document.querySelectorAll('.filter-nav, .grid-item'));
    const CASCADE_STEP = 0.09;   // secondes entre deux éléments d'une même vague
    const CASCADE_MAX_STEPS = 8; // au-delà, on ne rallonge plus l'attente

    // Le header (logo + nav) et le hero jouent sur une timeline fixe en CSS
    // (animation-delay codé en dur) qui se termine vers 1.9s après le chargement
    // (dernier élément : .hero-col-right .reveal-text, delay 0.8s + durée 1.1s).
    // Sur mobile, si la galerie est déjà visible à l'écran au chargement (page
    // courte), on ne veut pas qu'elle double le hero encore en train d'apparaître :
    // on la fait donc patienter jusqu'à la fin de cette timeline avant de démarrer
    // sa propre cascade. Si elle se déclenche plus tard (scroll classique, hero déjà
    // terminé), ce délai de base tombe naturellement à 0.
    // ⚠️ Si tu modifies les delays/durées du hero ou du header en CSS, pense à
    // mettre à jour cette valeur en conséquence.
    const HERO_TIMELINE_END = 1.9; // secondes

    const cascadeObserver = new IntersectionObserver((entries) => {
        // On isole les éléments qui entrent dans CE batch, remis dans l'ordre du DOM,
        // pour que la cascade suive toujours l'ordre visuel des blocs de la page.
        const entering = entries
            .filter(entry => entry.isIntersecting)
            .map(entry => entry.target)
            .sort((a, b) => cascadeItems.indexOf(a) - cascadeItems.indexOf(b));

        // Temps écoulé depuis le chargement de la page, pour savoir si le hero
        // est potentiellement encore en train d'animer.
        const elapsed = performance.now() / 1000;
        const baseDelay = Math.max(0, HERO_TIMELINE_END - elapsed);

        entering.forEach((target, i) => {
            const step = Math.min(i, CASCADE_MAX_STEPS);
            const delay = baseDelay + step * CASCADE_STEP;
            target.style.transitionDelay = `${delay.toFixed(2)}s`;
            target.classList.add('is-visible');
            cascadeObserver.unobserve(target);

            // Une fois l'apparition jouée, on retire le délai inline pour ne pas
            // qu'il perturbe les futures transitions (ex: clic sur un filtre).
            target.addEventListener('transitionend', () => {
                target.style.transitionDelay = '';
            }, { once: true });
        });
    }, {
        threshold: 0.1,
        rootMargin: "0px 0px -50px 0px"
    });

    cascadeItems.forEach(item => cascadeObserver.observe(item));

    // Initialise les liens par défaut
    projects.forEach(project => {
        const link = project.querySelector('a');
        if (!link) return;
        try {
            const url = new URL(link.href, window.location.origin);
            if (url.search && !url.searchParams.get('filter')) {
                url.searchParams.set('filter', 'all');
                link.href = url.toString();
            }
        } catch (_) { }
    });


    // --- 4. FONCTION DE FILTRAGE (Version Grid-Safe) ---
    const applyFilter = (filterValue, clickedButton) => {
        filters.forEach(btn => {
            btn.classList.remove('active');
            btn.setAttribute('aria-pressed', 'false');
        });
        if (clickedButton) {
            clickedButton.classList.add('active');
            clickedButton.setAttribute('aria-pressed', 'true');
        }

        projects.forEach(project => {
            const isMatch = filterValue === 'all' || project.classList.contains(filterValue);

            // --- MISE À JOUR DYNAMIQUE DES LIENS ---
            // --- MISE À JOUR DYNAMIQUE DES LIENS ---
            const link = project.querySelector('a');
            if (link) {
                try {
                    const url = new URL(link.href, window.location.origin);
                    const projectId = url.searchParams.get('id');
                    if (projectId) {
                        url.searchParams.set('filter', filterValue);
                        link.href = url.toString();
                    }
                } catch (_) {
                    // on ignore si URL relative exotic
                }
            }


            if (isMatch) {
                project.classList.remove('filtering-out');
                requestAnimationFrame(() => {
                    project.classList.add('is-visible');
                    project.style.display = "";
                });
            } else {
                project.classList.remove('is-visible');
                setTimeout(() => {
                    if (!project.classList.contains('is-visible')) {
                        project.classList.add('filtering-out');
                    }
                }, 600);
            }
        });
    };
    // --- 5. ÉCOUTEURS DE CLIC (Version ultra-stable) ---
    filters.forEach(filter => {
        filter.addEventListener('click', function (e) {
            // Empêche toute action résiduelle
            e.preventDefault();

            const filterValue = this.getAttribute('data-filter');

            // On applique le filtre visuel
            applyFilter(filterValue, this);

            // On change l'URL de manière "silencieuse" 
            // Si ça rafraîchit encore, commente les 2 lignes ci-dessous pour tester
            const newUrl = filterValue !== 'all' ? `?filter=${filterValue}` : window.location.pathname;
            window.history.pushState({ path: newUrl }, '', newUrl);
        });
    });

    // --- 6. GESTION DU FILTRE VIA URL AU CHARGEMENT ---
    const params = new URLSearchParams(window.location.search);
    const filterParam = params.get('filter');

    if (filterParam) {
        const targetFilter = document.querySelector(`.filter-btn[data-filter="${filterParam}"]`);
        if (targetFilter) {
            // On applique le filtre de l'URL après un léger délai pour l'animation
            setTimeout(() => {
                applyFilter(filterParam, targetFilter);
            }, 200);
        }
    }



});
// --- 7. LOGIQUE D'AFFICHAGE DES MÉDIAS (IMG VS VIDEO) ---
const renderMedia = (item) => {
    const isVideo = item.src.endsWith('.mp4');

    if (isVideo) {
        // On ajoute 'gallery-item' pour le style CSS 
        // et 'video-gallery' pour le script JS de lecture au scroll
        return `
            <div class="grid-item ${item.layout || ''}">
                <video 
                    src="${item.src}" 
                    class="video-gallery"
                    loop 
                    muted 
                    playsinline 
                    style="width:100%; height:100%; object-fit:cover; display:block; cursor:pointer;">
                </video>
            </div>`;
    } else {
        return `
            <div class="grid-item ${item.layout || ''}">
                <img src="${item.src}" alt="Projet" style="width:100%; height:100%; object-fit:cover; display:block;">
            </div>`;
    }
};