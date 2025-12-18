        /**
         * CONFIGURACIÓN: Pega aquí la URL de tu Web App de Google Apps Script
         */
        const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzGHlveSItoqy1Cmflf7ZP0u23J4qevpBY70aBO6uub9sTCtpEC2RU5dncAOVNTFT5hOg/exec";

        let participants = [];
        let isEditing = false;
        let lastDetectedName = "";

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
                container.innerHTML = `
                    <div class="text-center py-10 text-orange-600 bg-orange-50 rounded-xl p-4 border border-orange-200">
                        <p class="font-bold">⚠️ Configuración Pendiente</p>
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
                container.innerHTML = `<div class="text-center py-10 text-red-600">Error al conectar.</div>`;
            }
        }

        // --- NUEVA LÓGICA DE EDICIÓN ---
        const userNameInput = document.getElementById('userName');
        const userWishesInput = document.getElementById('userWishes');
        const submitBtn = document.getElementById('submitBtn');
        const btnText = document.getElementById('btnText');
        const statusBadge = document.getElementById('statusBadge');

        userNameInput.addEventListener('input', (e) => {
            const name = e.target.value.trim();
            const lowerName = name.toLowerCase();
            
            // Buscar si el usuario existe para cargar sus datos
            const existing = participants.find(p => p.nombre.toLowerCase() === lowerName);
            
            if (existing && name !== "") {
                if (lastDetectedName !== lowerName) {
                    isEditing = true;
                    lastDetectedName = lowerName;
                    
                    // Acción clave: Cargar los deseos previos para que el usuario los edite
                    userWishesInput.value = existing.deseos;
                    
                    // Feedback visual de edición
                    submitBtn.classList.add('btn-update');
                    btnText.textContent = "Guardar cambios 🔄";
                    statusBadge.classList.remove('hidden');
                    userWishesInput.classList.add('border-blue-400');
                }
            } else {
                isEditing = false;
                lastDetectedName = "";
                submitBtn.classList.remove('btn-update');
                btnText.textContent = "¡Enviar a la Lista! 📜";
                statusBadge.classList.add('hidden');
                userWishesInput.classList.remove('border-blue-400');
                // No borramos el texto automáticamente por si el usuario está escribiendo y se equivoca en una letra
            }
        });

        const form = document.getElementById('wishlistForm');
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (!isValidUrl(SCRIPT_URL)) return;

            const btnLoader = document.getElementById('btnLoader');
            const data = {
                nombre: userNameInput.value.trim(),
                deseos: userWishesInput.value.trim()
            };

            submitBtn.disabled = true;
            btnLoader.classList.remove('hidden');
            btnText.textContent = isEditing ? "Actualizando..." : "Sincronizando...";

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
                    colors: isEditing ? ['#2b58ff', '#ffffff'] : ['#be1e2d', '#1a472a', '#ffffff'] 
                });
                
                showToast(isEditing ? "¡Edición guardada! ✨" : "¡Registro completado! 🎅");
                form.reset();
                isEditing = false;
                lastDetectedName = "";
                submitBtn.classList.remove('btn-update');
                statusBadge.classList.add('hidden');
                userWishesInput.classList.remove('border-blue-400');
                
                setTimeout(fetchWishlist, 2000); 
            } catch (err) {
                showToast("Error al procesar.");
            } finally {
                submitBtn.disabled = false;
                btnLoader.classList.add('hidden');
                btnText.textContent = "¡Enviar a la Lista! 📜";
            }
        });

        // --- BÚSQUEDA ---
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => renderResults(e.target.value));
        document.getElementById('refreshBtn').onclick = fetchWishlist;

        function renderResults(queryStr) {
            const resultsContainer = document.getElementById('resultsContainer');
            resultsContainer.innerHTML = "";
            if (!queryStr || queryStr.trim() === "") {
                resultsContainer.innerHTML = `<div class="text-center py-10 text-gray-500 italic">Busca un nombre para ver sus deseos.</div>`;
                return;
            }
            const filtered = participants.filter(p => p.nombre.toLowerCase().includes(queryStr.toLowerCase()));
            if (filtered.length === 0) {
                resultsContainer.innerHTML = `<div class="text-center py-10 text-gray-400">No se encontró ese nombre.</div>`;
                return;
            }
            filtered.forEach(person => {
                const div = document.createElement('div');
                div.className = "gift-tag p-5 rounded-2xl fade-in shadow-md mb-4 border border-red-50";
                div.innerHTML = `<h3 class="font-bold text-red-800 text-xl">🎁 ${person.nombre}</h3><p class="text-gray-700 mt-3 whitespace-pre-line text-sm leading-relaxed">${person.deseos}</p>`;
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

        window.onload = fetchWishlist;

