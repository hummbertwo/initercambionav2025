        /**
         * CONFIGURACIÓN: Pega aquí la URL de tu Web App de Google Apps Script
         */
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzGHlveSItoqy1Cmflf7ZP0u23J4qevpBY70aBO6uub9sTCtpEC2RU5dncAOVNTFT5hOg/exec";

        let participants = [];

        // --- EFECTO NIEVE ---
        const canvas = document.getElementById('snow-canvas');
        const ctx = canvas.getContext('2d');
        let particles = [];
        function resize() { canvas.width = window.innerWidth; canvas.height = window.innerHeight; }
        window.addEventListener('resize', resize);
        resize();
        function createParticles() {
            for(let i = 0; i < 80; i++) {
                particles.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, radius: Math.random() * 3 + 1, speed: Math.random() * 1 + 0.5, opacity: Math.random() * 0.5 + 0.3 });
            }
        }
        createParticles();
        function drawSnow() {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
            particles.forEach(p => {
                ctx.beginPath(); ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
                ctx.globalAlpha = p.opacity; ctx.fill();
                p.y += p.speed; if(p.y > canvas.height) p.y = -10;
            });
            requestAnimationFrame(drawSnow);
        }
        drawSnow();

        // --- VALIDACIÓN DE URL ---
        function isValidUrl(string) {
            try {
                new URL(string);
                return string.startsWith("https://script.google.com");
            } catch (_) {
                return false;  
            }
        }

        // --- LÓGICA DE DATOS (GOOGLE SHEETS) ---

        async function fetchWishlist() {
            const container = document.getElementById('resultsContainer');
            
            if (!isValidUrl(SCRIPT_URL)) {
                console.warn("URL de Apps Script no configurada o inválida.");
                container.innerHTML = `
                    <div class="text-center py-10 text-orange-600 bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <p class="font-bold">⚠️ Pendiente de Configuración</p>
                        <p class="text-xs mt-2">Por favor, pega la URL de tu Google Apps Script en la variable SCRIPT_URL del código.</p>
                    </div>`;
                return;
            }

            try {
                const response = await fetch(SCRIPT_URL);
                const data = await response.json();
                participants = data;
                renderResults(document.getElementById('searchInput').value);
            } catch (error) {
                console.error("Error al cargar:", error);
                container.innerHTML = `<div class="text-center py-10 text-red-600">Error al conectar con la hoja de cálculo. Revisa la URL y que la aplicación esté publicada para "Cualquier persona".</div>`;
            }
        }

        const form = document.getElementById('wishlistForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!isValidUrl(SCRIPT_URL)) {
                showToast("Configura primero la URL del script.");
                return;
            }

            const submitBtn = document.getElementById('submitBtn');
            const btnLoader = document.getElementById('btnLoader');
            const btnText = document.getElementById('btnText');

            const formData = new FormData(form);
            const data = {
                nombre: formData.get('nombre'),
                deseos: formData.get('deseos')
            };

            submitBtn.disabled = true;
            btnLoader.classList.remove('hidden');
            btnText.textContent = "Sincronizando...";

            try {
                await fetch(SCRIPT_URL, {
                    method: 'POST',
                    mode: 'no-cors', 
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });

                confetti({ 
                    particleCount: 150, 
                    spread: 70, 
                    origin: { y: 0.6 }, 
                    colors: ['#be1e2d', '#1a472a', '#ffffff'] 
                });
                
                showToast("¡Deseos enviados a la lista! 🎅");
                form.reset();
                setTimeout(fetchWishlist, 2000); 
            } catch (err) {
                showToast("Error al enviar los datos.");
                console.error(err);
            } finally {
                submitBtn.disabled = false;
                btnLoader.classList.add('hidden');
                btnText.textContent = "¡Enviar a la Lista! 📜";
            }
        });

        // --- UI BÚSQUEDA ---
        const searchInput = document.getElementById('searchInput');
        const resultsContainer = document.getElementById('resultsContainer');

        searchInput.addEventListener('input', (e) => renderResults(e.target.value));
        document.getElementById('refreshBtn').onclick = fetchWishlist;

        function renderResults(queryStr) {
            if (!isValidUrl(SCRIPT_URL) && participants.length === 0) return;

            resultsContainer.innerHTML = "";
            if (!queryStr || queryStr.trim() === "") {
                resultsContainer.innerHTML = `<div class="text-center py-10 text-gray-500 fade-in italic"><p>Busca un nombre para ver sus deseos.</p><span class="text-3xl block mt-2">🌲</span></div>`;
                return;
            }

            const filtered = participants.filter(p => p.nombre.toLowerCase().includes(queryStr.toLowerCase()));

            if (filtered.length === 0) {
                resultsContainer.innerHTML = `<div class="text-center py-10 text-gray-400">No se encontró a nadie con ese nombre.</div>`;
                return;
            }

            filtered.forEach(person => {
                const div = document.createElement('div');
                div.className = "gift-tag p-5 rounded-2xl fade-in shadow-md mb-4 border border-red-50";
                div.innerHTML = `
                    <h3 class="font-bold text-red-800 text-xl">🎁 ${person.nombre}</h3>
                    <p class="text-gray-700 mt-3 whitespace-pre-line text-sm leading-relaxed">${person.deseos}</p>
                `;
                resultsContainer.appendChild(div);
            });
        }

        function showToast(msg) {
            const toast = document.getElementById('toast');
            document.getElementById('toastMsg').innerText = msg;
            toast.classList.remove('opacity-0', 'pointer-events-none');
            toast.classList.add('opacity-100', 'translate-y-4');
            setTimeout(() => {
                toast.classList.add('opacity-0', 'pointer-events-none');
                toast.classList.remove('opacity-100', 'translate-y-4');
            }, 4000);
        }

        // Carga inicial
        window.onload = fetchWishlist;