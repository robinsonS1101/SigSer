// js/script.js
        // Configuración de Supabase
        const SUPABASE_URL = 'https://vkyrvcqzueafykfcycnw.supabase.co';
        const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZreXJ2Y3F6dWVhZnlrZmN5Y253Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNjU1MTYsImV4cCI6MjA3Mjk0MTUxNn0.fe36007a-7NmObG9Ias-m6gmU8psY8-2vNAePjs702w';

        // Inicializar Supabase
        let supabase;
        try {
            supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
                auth: {
                    autoRefreshToken: true,
                    persistSession: true,
                    detectSessionInUrl: true
                }
            });
        } catch (error) {
            console.error('Error inicializando Supabase:', error);
        }

        // Estado de la aplicación
        let currentUser = null;
        let editingId = null;
        let charts = {};

        // Elementos DOM
        const loginSection = document.getElementById('login-section');
        const registerSection = document.getElementById('register-section');
        const appContainer = document.getElementById('app-container');
        const loginForm = document.getElementById('login-form');
        const registerForm = document.getElementById('register-form');
        const logoutBtn = document.getElementById('logout-btn');
        const userAvatar = document.getElementById('user-avatar');
        const userName = document.getElementById('user-name');
        const userEmail = document.getElementById('user-email');
        const mobileUserName = document.getElementById('mobile-user-name');
        const mobileUserEmail = document.getElementById('mobile-user-email');
        const mobileUserAvatar = document.getElementById('mobile-user-avatar');
        const mobileLogoutBtn = document.getElementById('mobile-logout-btn');
        const navLinks = document.querySelectorAll('.nav-link');
        const sections = document.querySelectorAll('.section');
        const dashboardCards = document.querySelectorAll('.dashboard-card');
        const mobileMenuBtn = document.getElementById('mobile-menu-btn');
        const mobileNav = document.getElementById('mobile-nav');
        const closeMobileMenu = document.getElementById('close-mobile-menu');
        const mobileNavLinks = document.querySelectorAll('.mobile-nav-links .nav-link');
        const showRegister = document.getElementById('show-register');
        const showLogin = document.getElementById('show-login');
        const fab = document.getElementById('fab');

        // Inicializar la aplicación
        document.addEventListener('DOMContentLoaded', function() {
            setupEventListeners();
            checkAuth();
        });

        // Configurar event listeners
        function setupEventListeners() {
            // Login y registro
            loginForm.addEventListener('submit', handleLogin);
            registerForm.addEventListener('submit', handleRegister);
            showRegister.addEventListener('click', function(e) {
                e.preventDefault();
                showRegisterSection();
            });
            showLogin.addEventListener('click', function(e) {
                e.preventDefault();
                showLoginSection();
            });
            logoutBtn.addEventListener('click', handleLogout);
            mobileLogoutBtn.addEventListener('click', handleLogout);

            // Navegación
            navLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    showSection(this.getAttribute('data-section'));
                    setActiveNavLink(this);
                });
            });

            // Dashboard cards
            dashboardCards.forEach(card => {
                card.addEventListener('click', function() {
                    const section = this.getAttribute('data-section');
                    showSection(section);
                    setActiveNavLink(document.querySelector(`[data-section="${section}"]`));
                });
            });

            // Navegación móvil
            mobileMenuBtn.addEventListener('click', function() {
                mobileNav.classList.add('active');
            });

            closeMobileMenu.addEventListener('click', function() {
                mobileNav.classList.remove('active');
            });

            mobileNavLinks.forEach(link => {
                link.addEventListener('click', function(e) {
                    e.preventDefault();
                    showSection(this.getAttribute('data-section'));
                    setActiveNavLink(this);
                    mobileNav.classList.remove('active');
                });
            });

            // Botones de agregar
            document.getElementById('add-servicio').addEventListener('click', () => openModal('servicio'));
            document.getElementById('add-combustible').addEventListener('click', () => openModal('combustible'));
            document.getElementById('add-gasto-vehiculo').addEventListener('click', () => openModal('gasto-vehiculo'));
            document.getElementById('add-otro').addEventListener('click', () => openModal('otro'));

            // Cerrar modales
            document.getElementById('close-servicio-modal').addEventListener('click', () => closeModal('servicio'));
            document.getElementById('close-combustible-modal').addEventListener('click', () => closeModal('combustible'));
            document.getElementById('close-gasto-vehiculo-modal').addEventListener('click', () => closeModal('gasto-vehiculo'));
            document.getElementById('close-otro-modal').addEventListener('click', () => closeModal('otro'));

            // Formularios
            document.getElementById('servicio-form').addEventListener('submit', handleServicioSubmit);
            document.getElementById('combustible-form').addEventListener('submit', handleCombustibleSubmit);
            document.getElementById('gasto-vehiculo-form').addEventListener('submit', handleGastoVehiculoSubmit);
            document.getElementById('otro-form').addEventListener('submit', handleOtroSubmit);

            // Filtros
            document.getElementById('apply-filter-servicios').addEventListener('click', applyServiciosFilter);
            document.getElementById('clear-filter-servicios').addEventListener('click', clearServiciosFilter);
            document.getElementById('apply-filter-combustible').addEventListener('click', applyCombustibleFilter);
            document.getElementById('clear-filter-combustible').addEventListener('click', clearCombustibleFilter);
            document.getElementById('apply-filter-gastos').addEventListener('click', applyGastosFilter);
            document.getElementById('clear-filter-gastos').addEventListener('click', clearGastosFilter);
            document.getElementById('apply-filter-otros').addEventListener('click', applyOtrosFilter);
            document.getElementById('clear-filter-otros').addEventListener('click', clearOtrosFilter);

            // Filtros de tiempo para gráficos
            document.querySelectorAll('.time-filter-btn').forEach(btn => {
                btn.addEventListener('click', function() {
                    const container = this.closest('.stats-card');
                    const period = this.getAttribute('data-period');
                    
                    // Actualizar botones activos
                    this.parentElement.querySelectorAll('.time-filter-btn').forEach(b => {
                        b.classList.remove('active');
                    });
                    this.classList.add('active');
                    
                    // Actualizar gráfico según el período
                    if (container.querySelector('#monthly-expenses-chart')) {
                        updateMonthlyExpensesChart(parseInt(period));
                    } else if (container.querySelector('#expense-evolution-chart')) {
                        updateExpenseEvolutionChart(parseInt(period));
                    }
                });
            });

            // Floating Action Button
            fab.addEventListener('click', handleFabClick);
        }

        // Verificar autenticación
        async function checkAuth() {
            try {
                const { data: { session }, error } = await supabase.auth.getSession();
                if (error) throw error;
                
                if (session) {
                    currentUser = session.user;
                    await ensureUserProfile();
                    showApp();
                } else {
                    showLoginSection();
                }
            } catch (error) {
                console.error('Error checking auth:', error);
                showLoginSection();
            }
        }

        // Asegurar que el perfil de usuario exista
        async function ensureUserProfile() {
            if (!currentUser) return;
            
            try {
                // Verificar si el perfil existe
                const { data: existingProfile, error: checkError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('id', currentUser.id)
                    .single();

                // Si no existe, crear uno
                if (!existingProfile && checkError?.code === 'PGRST116') {
                    console.log('Creando perfil para usuario:', currentUser.id);
                    const userName = currentUser.user_metadata?.name || 
                                   document.getElementById('register-name')?.value || 
                                   currentUser.email?.split('@')[0] || 
                                   'Usuario';
                    
                    const { error: createError } = await supabase
                        .from('profiles')
                        .insert([
                            { 
                                id: currentUser.id, 
                                name: userName,
                                email: currentUser.email 
                            }
                        ]);

                    if (createError) {
                        console.error('Error creando perfil:', createError);
                    } else {
                        console.log('Perfil creado exitosamente');
                        // Actualizar la información mostrada
                        getUserProfile();
                    }
                } else if (checkError && checkError.code !== 'PGRST116') {
                    console.error('Error verificando perfil:', checkError);
                } else {
                    // El perfil existe, actualizar la información
                    getUserProfile();
                }
            } catch (error) {
                console.error('Error ensuring user profile:', error);
            }
        }

        // Manejar login
        async function handleLogin(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const errorDiv = document.getElementById('login-error');

            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) throw error;

                currentUser = data.user;
                await ensureUserProfile();
                showApp();
            } catch (error) {
                errorDiv.textContent = 'Error: ' + error.message;
                errorDiv.style.display = 'block';
            }
        }

        // Manejar registro
        async function handleRegister(e) {
            e.preventDefault();
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;
            const name = document.getElementById('register-name').value;
            const errorDiv = document.getElementById('register-error');

            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            name: name
                        }
                    }
                });

                if (error) throw error;

                alert('✅ Registro exitoso. Revisa tu email para confirmar tu cuenta y luego inicia sesión.');
                showLoginSection();
            } catch (error) {
                errorDiv.textContent = 'Error: ' + error.message;
                errorDiv.style.display = 'block';
            }
        }

        // Manejar logout
        async function handleLogout() {
            try {
                const { error } = await supabase.auth.signOut();
                if (error) throw error;
                
                currentUser = null;
                showLoginSection();
            } catch (error) {
                console.error('Error logging out:', error);
            }
        }

        // Mostrar sección de login
        function showLoginSection() {
            loginSection.style.display = 'flex';
            registerSection.style.display = 'none';
            appContainer.style.display = 'none';
            fab.style.display = 'none';
        }

        // Mostrar sección de registro
        function showRegisterSection() {
            loginSection.style.display = 'none';
            registerSection.style.display = 'flex';
            appContainer.style.display = 'none';
            fab.style.display = 'none';
        }

        // Mostrar aplicación
        function showApp() {
            loginSection.style.display = 'none';
            registerSection.style.display = 'none';
            appContainer.style.display = 'block';
            fab.style.display = 'flex';
            
            // Obtener información del perfil
            getUserProfile();
            loadDashboardData();
        }

        // Obtener perfil de usuario
        async function getUserProfile() {
            if (!currentUser) return;
            
            try {
                const { data, error } = await supabase
                    .from('profiles')
                    .select('name, email')
                    .eq('id', currentUser.id)
                    .single();
                    
                if (data) {
                    // Actualizar información en desktop
                    userName.textContent = data.name || 'Usuario';
                    userEmail.textContent = currentUser.email;
                    userAvatar.textContent = data.name ? data.name.charAt(0).toUpperCase() : currentUser.email?.charAt(0).toUpperCase() || 'U';
                    
                    // Actualizar información en móvil
                    mobileUserName.textContent = data.name || 'Usuario';
                    mobileUserEmail.textContent = currentUser.email;
                    mobileUserAvatar.textContent = data.name ? data.name.charAt(0).toUpperCase() : currentUser.email?.charAt(0).toUpperCase() || 'U';
                } else if (error) {
                    console.error('Error getting profile:', error);
                    setDefaultUserInfo();
                }
            } catch (error) {
                console.error('Error getting user profile:', error);
                setDefaultUserInfo();
            }
        }

        // Función auxiliar para establecer información por defecto
        function setDefaultUserInfo() {
            const defaultName = currentUser.user_metadata?.name || currentUser.email?.split('@')[0] || 'Usuario';
            const defaultInitial = defaultName.charAt(0).toUpperCase();
            
            // Desktop
            userName.textContent = defaultName;
            userEmail.textContent = currentUser.email;
            userAvatar.textContent = defaultInitial;
            
            // Móvil
            mobileUserName.textContent = defaultName;
            mobileUserEmail.textContent = currentUser.email;
            mobileUserAvatar.textContent = defaultInitial;
        }

        // Mostrar sección
        function showSection(sectionId) {
            sections.forEach(section => {
                section.classList.remove('active');
            });
            document.getElementById(sectionId).classList.add('active');
            
            // Si es la sección de estadísticas, cargar los gráficos
            if (sectionId === 'estadisticas') {
                loadStatisticsData();
            } else if (sectionId === 'servicios') {
                loadServicios();
            } else if (sectionId === 'combustible') {
                loadCombustible();
            } else if (sectionId === 'gastos-vehiculo') {
                loadGastosVehiculo();
            } else if (sectionId === 'otros') {
                loadOtros();
            }
        }

        // Establecer enlace de navegación activo
        function setActiveNavLink(activeLink) {
            navLinks.forEach(link => {
                link.classList.remove('active');
            });
            mobileNavLinks.forEach(link => {
                link.classList.remove('active');
            });
            if (activeLink) {
                activeLink.classList.add('active');
            }
        }

        // Abrir modal
        function openModal(type) {
            editingId = null;
            const modal = document.getElementById(`${type}-modal`);
            const title = document.getElementById(`${type}-modal-title`);
            title.textContent = title.textContent.replace('Editar', 'Agregar').replace('Agregar', 'Agregar');
            modal.classList.add('active');
            clearForm(`${type}-form`);
        }

        // Cerrar modal
        function closeModal(type) {
            const modal = document.getElementById(`${type}-modal`);
            modal.classList.remove('active');
            editingId = null;
        }

        // Limpiar formulario
        function clearForm(formId) {
            document.getElementById(formId).reset();
        }

        // Manejar FAB click
        function handleFabClick() {
            const activeSection = document.querySelector('.section.active').id;
            switch(activeSection) {
                case 'servicios':
                    openModal('servicio');
                    break;
                case 'combustible':
                    openModal('combustible');
                    break;
                case 'gastos-vehiculo':
                    openModal('gasto-vehiculo');
                    break;
                case 'otros':
                    openModal('otro');
                    break;
                default:
                    // En dashboard, ir a servicios por defecto
                    showSection('servicios');
                    setActiveNavLink(document.querySelector('[data-section="servicios"]'));
            }
        }

        // Cargar datos del dashboard
        async function loadDashboardData() {
            const [servicios, combustible, gastos, otros] = await Promise.all([
                loadServicios(),
                loadCombustible(),
                loadGastosVehiculo(),
                loadOtros()
            ]);
            
            updateDashboardStats(servicios, combustible, gastos, otros);
            createDashboardCharts(servicios, combustible, gastos, otros);
        }

        // ========== DASHBOARD ==========
        function updateDashboardStats(servicios, combustible, gastos, otros) {
            // Servicios
            document.getElementById('dashboard-servicios').textContent = servicios.length;
            document.getElementById('dashboard-servicios-valor').textContent = `$${servicios.reduce((sum, s) => sum + (s.valor || 0), 0).toLocaleString()}`;
            
            // Combustible
            document.getElementById('dashboard-combustible').textContent = combustible.length;
            document.getElementById('dashboard-combustible-valor').textContent = `$${combustible.reduce((sum, c) => sum + (c.valor || 0), 0).toLocaleString()}`;
            
            // Gastos Vehículo
            document.getElementById('dashboard-gastos').textContent = gastos.length;
            document.getElementById('dashboard-gastos-valor').textContent = `$${gastos.reduce((sum, g) => sum + (g.valor || 0), 0).toLocaleString()}`;
            
            // Otros Gastos
            document.getElementById('dashboard-otros').textContent = otros.length;
            document.getElementById('dashboard-otros-valor').textContent = `$${otros.reduce((sum, o) => sum + (o.valor || 0), 0).toLocaleString()}`;
        }

        // Crear gráficos del dashboard
        function createDashboardCharts(servicios, combustible, gastos, otros) {
            // Gráfico de distribución de gastos
            const expensesCtx = document.getElementById('expenses-chart').getContext('2d');
            const serviciosTotal = servicios.reduce((sum, s) => sum + (s.valor || 0), 0);
            const combustibleTotal = combustible.reduce((sum, c) => sum + (c.valor || 0), 0);
            const gastosTotal = gastos.reduce((sum, g) => sum + (g.valor || 0), 0);
            const otrosTotal = otros.reduce((sum, o) => sum + (o.valor || 0), 0);
            
            if (charts.expenses) charts.expenses.destroy();
            
            charts.expenses = new Chart(expensesCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Servicios', 'Combustible', 'Gastos Vehículo', 'Otros Gastos'],
                    datasets: [{
                        data: [serviciosTotal, combustibleTotal, gastosTotal, otrosTotal],
                        backgroundColor: [
                            '#4361ee',
                            '#f8961e',
                            '#4cc9f0',
                            '#7209b7'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });

            // Gráfico de gastos mensuales
            updateMonthlyExpensesChart(3);
        }

        // Actualizar gráfico de gastos mensuales
        async function updateMonthlyExpensesChart(months) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            
            // Obtener datos de todos los tipos de gastos
            const [servicios, combustible, gastos, otros] = await Promise.all([
                getMonthlyData('servicios', startDate, endDate),
                getMonthlyData('combustible', startDate, endDate),
                getMonthlyData('gastos_vehiculo', startDate, endDate),
                getMonthlyData('otros_gastos', startDate, endDate)
            ]);
            
            // Preparar datos para el gráfico
            const labels = [];
            const serviciosData = [];
            const combustibleData = [];
            const gastosData = [];
            const otrosData = [];
            
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const monthYear = `${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
                labels.push(monthYear);
                
                serviciosData.push(servicios[monthYear] || 0);
                combustibleData.push(combustible[monthYear] || 0);
                gastosData.push(gastos[monthYear] || 0);
                otrosData.push(otros[monthYear] || 0);
                
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            
            const monthlyCtx = document.getElementById('monthly-expenses-chart').getContext('2d');
            
            if (charts.monthly) charts.monthly.destroy();
            
            charts.monthly = new Chart(monthlyCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Servicios',
                            data: serviciosData,
                            backgroundColor: '#4361ee',
                            borderColor: '#3a0ca3',
                            borderWidth: 1
                        },
                        {
                            label: 'Combustible',
                            data: combustibleData,
                            backgroundColor: '#f8961e',
                            borderColor: '#f3722c',
                            borderWidth: 1
                        },
                        {
                            label: 'Gastos Vehículo',
                            data: gastosData,
                            backgroundColor: '#4cc9f0',
                            borderColor: '#4895ef',
                            borderWidth: 1
                        },
                        {
                            label: 'Otros Gastos',
                            data: otrosData,
                            backgroundColor: '#7209b7',
                            borderColor: '#9d4edd',
                            borderWidth: 1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        x: {
                            stacked: false,
                        },
                        y: {
                            stacked: false,
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.dataset.label || '';
                                    const value = context.raw || 0;
                                    return `${label}: $${value.toLocaleString()}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Obtener datos mensuales de una tabla
        async function getMonthlyData(table, startDate, endDate) {
            try {
                const { data, error } = await supabase
                    .from(table)
                    .select('fecha, valor')
                    .eq('user_id', currentUser.id)
                    .gte('fecha', startDate.toISOString().split('T')[0])
                    .lte('fecha', endDate.toISOString().split('T')[0]);

                if (error) throw error;

                const monthlyData = {};
                data.forEach(item => {
                    const date = new Date(item.fecha);
                    const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
                    
                    if (!monthlyData[monthYear]) {
                        monthlyData[monthYear] = 0;
                    }
                    
                    monthlyData[monthYear] += item.valor || 0;
                });

                return monthlyData;
            } catch (error) {
                console.error(`Error getting monthly data from ${table}:`, error);
                return {};
            }
        }

        // ========== ESTADÍSTICAS ==========
        async function loadStatisticsData() {
            const [servicios, combustible, gastos, otros] = await Promise.all([
                loadServicios(),
                loadCombustible(),
                loadGastosVehiculo(),
                loadOtros()
            ]);
            
            createStatisticsCharts(servicios, combustible, gastos, otros);
            updateStatisticsSummary(servicios, combustible, gastos, otros);
        }

        // Crear gráficos de estadísticas
        function createStatisticsCharts(servicios, combustible, gastos, otros) {
            // Gráfico de evolución de gastos
            updateExpenseEvolutionChart(3);
            
            // Gráfico de top vehículos (combustible)
            createTopVehiclesChart(combustible);
            
            // Gráfico de tipos de servicios
            createServiceTypesChart(servicios);
            
            // Gráfico de actividad por día de la semana
            createWeeklyActivityChart([...servicios, ...combustible, ...gastos, ...otros]);
        }

        // Actualizar gráfico de evolución de gastos
        async function updateExpenseEvolutionChart(months) {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setMonth(startDate.getMonth() - months);
            
            // Obtener datos de todos los tipos de gastos
            const [servicios, combustible, gastos, otros] = await Promise.all([
                getMonthlyData('servicios', startDate, endDate),
                getMonthlyData('combustible', startDate, endDate),
                getMonthlyData('gastos_vehiculo', startDate, endDate),
                getMonthlyData('otros_gastos', startDate, endDate)
            ]);
            
            // Preparar datos para el gráfico
            const labels = [];
            const totalData = [];
            
            let currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                const monthYear = `${currentDate.getMonth() + 1}/${currentDate.getFullYear()}`;
                labels.push(monthYear);
                
                const total = (servicios[monthYear] || 0) + 
                             (combustible[monthYear] || 0) + 
                             (gastos[monthYear] || 0) + 
                             (otros[monthYear] || 0);
                
                totalData.push(total);
                
                currentDate.setMonth(currentDate.getMonth() + 1);
            }
            
            const evolutionCtx = document.getElementById('expense-evolution-chart').getContext('2d');
            
            if (charts.evolution) charts.evolution.destroy();
            
            charts.evolution = new Chart(evolutionCtx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gastos Totales',
                        data: totalData,
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        borderColor: '#4361ee',
                        borderWidth: 3,
                        tension: 0.3,
                        fill: true
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Total: $${context.raw.toLocaleString()}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Crear gráfico de top vehículos
        function createTopVehiclesChart(combustible) {
            // Agrupar por placa de vehículo
            const vehicleData = {};
            combustible.forEach(item => {
                const placa = item.placa_vehiculo || 'Sin especificar';
                if (!vehicleData[placa]) {
                    vehicleData[placa] = 0;
                }
                vehicleData[placa] += item.valor || 0;
            });
            
            // Ordenar y tomar los top 5
            const sortedVehicles = Object.entries(vehicleData)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 5);
            
            const labels = sortedVehicles.map(v => v[0]);
            const data = sortedVehicles.map(v => v[1]);
            
            const vehiclesCtx = document.getElementById('top-vehicles-chart').getContext('2d');
            
            if (charts.vehicles) charts.vehicles.destroy();
            
            charts.vehicles = new Chart(vehiclesCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Gasto en Combustible',
                        data: data,
                        backgroundColor: '#f8961e',
                        borderColor: '#f3722c',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return '$' + value.toLocaleString();
                                }
                            }
                        }
                    },
                    plugins: {
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    return `Gasto: $${context.raw.toLocaleString()}`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Crear gráfico de tipos de servicios
        function createServiceTypesChart(servicios) {
            // Agrupar por tipo de servicio
            const serviceData = {};
            servicios.forEach(item => {
                const tipo = item.tipo_servicio || 'Sin especificar';
                if (!serviceData[tipo]) {
                    serviceData[tipo] = 0;
                }
                serviceData[tipo] += item.valor || 0;
            });
            
            const labels = Object.keys(serviceData);
            const data = Object.values(serviceData);
            
            const servicesCtx = document.getElementById('service-types-chart').getContext('2d');
            
            if (charts.services) charts.services.destroy();
            
            charts.services = new Chart(servicesCtx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: data,
                        backgroundColor: [
                            '#4361ee',
                            '#4895ef',
                            '#4cc9f0',
                            '#7209b7',
                            '#9d4edd'
                        ],
                        borderWidth: 2,
                        borderColor: '#fff'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        },
                        tooltip: {
                            callbacks: {
                                label: function(context) {
                                    const label = context.label || '';
                                    const value = context.raw || 0;
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = Math.round((value / total) * 100);
                                    return `${label}: $${value.toLocaleString()} (${percentage}%)`;
                                }
                            }
                        }
                    }
                }
            });
        }

        // Crear gráfico de actividad por día de la semana
        function createWeeklyActivityChart(allData) {
            // Agrupar por día de la semana
            const dayData = {
                'Domingo': 0,
                'Lunes': 0,
                'Martes': 0,
                'Miércoles': 0,
                'Jueves': 0,
                'Viernes': 0,
                'Sábado': 0
            };
            
            allData.forEach(item => {
                if (item.fecha) {
                    const date = new Date(item.fecha);
                    const dayName = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'][date.getDay()];
                    dayData[dayName] += 1;
                }
            });
            
            const labels = Object.keys(dayData);
            const data = Object.values(dayData);
            
            const weeklyCtx = document.getElementById('weekly-activity-chart').getContext('2d');
            
            if (charts.weekly) charts.weekly.destroy();
            
            charts.weekly = new Chart(weeklyCtx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Actividad',
                        data: data,
                        backgroundColor: '#7209b7',
                        borderColor: '#9d4edd',
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                precision: 0
                            }
                        }
                    }
                }
            });
        }

        // Actualizar resumen de estadísticas
        function updateStatisticsSummary(servicios, combustible, gastos, otros) {
            // Gastos del mes actual
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            const serviciosMes = servicios.filter(s => {
                const date = new Date(s.fecha);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            
            const combustibleMes = combustible.filter(c => {
                const date = new Date(c.fecha);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            
            const gastosMes = gastos.filter(g => {
                const date = new Date(g.fecha);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            
            const otrosMes = otros.filter(o => {
                const date = new Date(o.fecha);
                return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
            });
            
            const totalMes = serviciosMes.reduce((s, i) => s + (i.valor || 0), 0) +
                           combustibleMes.reduce((s, i) => s + (i.valor || 0), 0) +
                           gastosMes.reduce((s, i) => s + (i.valor || 0), 0) +
                           otrosMes.reduce((s, i) => s + (i.valor || 0), 0);
            
            document.getElementById('total-gastos-mes').textContent = `$${totalMes.toLocaleString()}`;
            document.getElementById('total-servicios-mes').textContent = serviciosMes.length;
            
            // Promedio mensual (últimos 6 meses)
            const sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            
            const allLastSixMonths = [...servicios, ...combustible, ...gastos, ...otros].filter(item => {
                const date = new Date(item.fecha);
                return date >= sixMonthsAgo;
            });
            
            const monthlyTotals = {};
            allLastSixMonths.forEach(item => {
                const date = new Date(item.fecha);
                const monthYear = `${date.getMonth() + 1}/${date.getFullYear()}`;
                
                if (!monthlyTotals[monthYear]) {
                    monthlyTotals[monthYear] = 0;
                }
                
                monthlyTotals[monthYear] += item.valor || 0;
            });
            
            const averageMonthly = Object.values(monthlyTotals).reduce((s, v) => s + v, 0) / Object.keys(monthlyTotals).length;
            document.getElementById('promedio-gasto-mes').textContent = `$${averageMonthly.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
            
            // Vehículo más usado (por gastos en combustible)
            const vehicleUsage = {};
            combustible.forEach(item => {
                const placa = item.placa_vehiculo || 'Sin especificar';
                if (!vehicleUsage[placa]) {
                    vehicleUsage[placa] = 0;
                }
                vehicleUsage[placa] += item.valor || 0;
            });
            
            const topVehicle = Object.entries(vehicleUsage).sort((a, b) => b[1] - a[1])[0];
            document.getElementById('vehiculo-mas-usado').textContent = topVehicle ? topVehicle[0] : '-';
        }

        // ========== SERVICIOS ==========
        async function loadServicios() {
            const loading = document.getElementById('servicios-loading');
            const table = document.getElementById('servicios-table');
            
            loading.style.display = 'block';
            table.style.display = 'none';

            try {
                const { data, error } = await supabase
                    .from('servicios')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('fecha', { ascending: false });

                if (error) throw error;

                displayServicios(data);
                updateServiciosSummary(data);
                return data;
            } catch (error) {
                console.error('Error loading servicios:', error);
                showEmptyState('servicios-table', 'Error cargando servicios');
                return [];
            } finally {
                loading.style.display = 'none';
                table.style.display = 'table';
            }
        }

        function displayServicios(servicios) {
            const tbody = document.querySelector('#servicios-table tbody');
            tbody.innerHTML = '';

            if (servicios.length === 0) {
                showEmptyState('servicios-table', 'No hay servicios registrados', 'fas fa-cogs');
                return;
            }

            servicios.forEach(servicio => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${servicio.cuenta || ''}</td>
                    <td>${servicio.orden_trabajo || ''}</td>
                    <td><span class="badge">${servicio.tipo_servicio || ''}</span></td>
                    <td>${servicio.nombre_cliente || ''}</td>
                    <td><strong>$${servicio.valor?.toLocaleString() || '0'}</strong></td>
                    <td>${servicio.direccion || ''}</td>
                    <td>${servicio.detalles || ''}</td>
                    <td>${formatDate(servicio.fecha)} ${servicio.hora || ''}</td>
                    <td class="actions">
                        <button class="btn btn-warning btn-sm btn-edit-servicio" data-id="${servicio.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-servicio" data-id="${servicio.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            // Agregar event listeners a los botones
            document.querySelectorAll('.btn-edit-servicio').forEach(btn => {
                btn.addEventListener('click', function() {
                    editServicio(this.getAttribute('data-id'));
                });
            });

            document.querySelectorAll('.btn-delete-servicio').forEach(btn => {
                btn.addEventListener('click', function() {
                    deleteServicio(this.getAttribute('data-id'));
                });
            });
        }

        function updateServiciosSummary(servicios) {
            const totalServicios = servicios.length;
            const totalValor = servicios.reduce((sum, servicio) => sum + (servicio.valor || 0), 0);
            const promedio = totalServicios > 0 ? totalValor / totalServicios : 0;
            
            document.getElementById('total-servicios').textContent = totalServicios;
            document.getElementById('total-valor-servicios').textContent = `$${totalValor.toLocaleString()}`;
            document.getElementById('promedio-servicios').textContent = `$${promedio.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
        }

        async function handleServicioSubmit(e) {
            e.preventDefault();
            
            const servicioData = {
                cuenta: document.getElementById('cuenta').value,
                orden_trabajo: document.getElementById('orden-trabajo').value,
                tipo_servicio: document.getElementById('tipo-servicio').value,
                nombre_cliente: document.getElementById('nombre-cliente').value,
                valor: parseFloat(document.getElementById('valor-servicio').value) || 0,
                direccion: document.getElementById('direccion-servicio').value,
                detalles: document.getElementById('detalles-servicio').value,
                fecha: document.getElementById('fecha-servicio').value,
                hora: document.getElementById('hora-servicio').value,
                user_id: currentUser.id
            };

            try {
                // Verificar nuevamente que el perfil existe antes de guardar
                await ensureUserProfile();

                if (editingId) {
                    const { error } = await supabase
                        .from('servicios')
                        .update(servicioData)
                        .eq('id', editingId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('servicios')
                        .insert([servicioData]);
                    if (error) throw error;
                }

                closeModal('servicio');
                const servicios = await loadServicios();
                updateDashboardStats(servicios, await loadCombustible(), await loadGastosVehiculo(), await loadOtros());
            } catch (error) {
                console.error('Error saving servicio:', error);
                if (error.message.includes('foreign key constraint')) {
                    alert('❌ Error: El perfil de usuario no existe. Por favor, contacta al administrador o verifica que las tablas estén creadas correctamente.');
                } else {
                    alert('❌ Error al guardar el servicio: ' + error.message);
                }
            }
        }

        async function editServicio(id) {
            try {
                const { data, error } = await supabase
                    .from('servicios')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                document.getElementById('cuenta').value = data.cuenta || '';
                document.getElementById('orden-trabajo').value = data.orden_trabajo || '';
                document.getElementById('tipo-servicio').value = data.tipo_servicio || '';
                document.getElementById('nombre-cliente').value = data.nombre_cliente || '';
                document.getElementById('valor-servicio').value = data.valor || '';
                document.getElementById('direccion-servicio').value = data.direccion || '';
                document.getElementById('detalles-servicio').value = data.detalles || '';
                document.getElementById('fecha-servicio').value = data.fecha || '';
                document.getElementById('hora-servicio').value = data.hora || '';

                editingId = id;
                document.getElementById('servicio-modal-title').innerHTML = '<i class="fas fa-edit"></i> Editar Servicio';
                document.getElementById('servicio-modal').classList.add('active');
            } catch (error) {
                console.error('Error loading servicio:', error);
                alert('❌ Error cargando el servicio: ' + error.message);
            }
        }

        async function deleteServicio(id) {
            if (!confirm('¿Estás seguro de que quieres eliminar este servicio?')) return;

            try {
                const { error } = await supabase
                    .from('servicios')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                const servicios = await loadServicios();
                updateDashboardStats(servicios, await loadCombustible(), await loadGastosVehiculo(), await loadOtros());
            } catch (error) {
                console.error('Error deleting servicio:', error);
                alert('❌ Error al eliminar el servicio: ' + error.message);
            }
        }

        async function applyServiciosFilter() {
            const cuenta = document.getElementById('filter-cuenta').value;
            const orden = document.getElementById('filter-orden').value;
            const fechaInicio = document.getElementById('filter-fecha-inicio').value;
            const fechaFin = document.getElementById('filter-fecha-fin').value;

            let query = supabase
                .from('servicios')
                .select('*')
                .eq('user_id', currentUser.id);

            if (cuenta) query = query.ilike('cuenta', `%${cuenta}%`);
            if (orden) query = query.ilike('orden_trabajo', `%${orden}%`);
            if (fechaInicio) query = query.gte('fecha', fechaInicio);
            if (fechaFin) query = query.lte('fecha', fechaFin);

            query = query.order('fecha', { ascending: false });

            try {
                const { data, error } = await query;
                if (error) throw error;
                displayServicios(data);
                updateServiciosSummary(data);
            } catch (error) {
                console.error('Error filtering servicios:', error);
            }
        }

        function clearServiciosFilter() {
            document.getElementById('filter-cuenta').value = '';
            document.getElementById('filter-orden').value = '';
            document.getElementById('filter-fecha-inicio').value = '';
            document.getElementById('filter-fecha-fin').value = '';
            loadServicios();
        }

        // ========== COMBUSTIBLE ==========
        async function loadCombustible() {
            const loading = document.getElementById('combustible-loading');
            const table = document.getElementById('combustible-table');
            
            loading.style.display = 'block';
            table.style.display = 'none';

            try {
                const { data, error } = await supabase
                    .from('combustible')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('fecha', { ascending: false });

                if (error) throw error;

                displayCombustible(data);
                updateCombustibleSummary(data);
                return data;
            } catch (error) {
                console.error('Error loading combustible:', error);
                showEmptyState('combustible-table', 'Error cargando combustible');
                return [];
            } finally {
                loading.style.display = 'none';
                table.style.display = 'table';
            }
        }

        function displayCombustible(combustible) {
            const tbody = document.querySelector('#combustible-table tbody');
            tbody.innerHTML = '';

            if (combustible.length === 0) {
                showEmptyState('combustible-table', 'No hay registros de combustible', 'fas fa-gas-pump');
                return;
            }

            combustible.forEach(item => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${item.placa_vehiculo || ''}</strong></td>
                    <td>${item.estacion_servicio || ''}</td>
                    <td>${item.direccion || ''}</td>
                    <td><strong>$${item.valor?.toLocaleString() || '0'}</strong></td>
                    <td>${formatDate(item.fecha)} ${item.hora || ''}</td>
                    <td class="actions">
                        <button class="btn btn-warning btn-sm btn-edit-combustible" data-id="${item.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-combustible" data-id="${item.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            document.querySelectorAll('.btn-edit-combustible').forEach(btn => {
                btn.addEventListener('click', function() {
                    editCombustible(this.getAttribute('data-id'));
                });
            });

            document.querySelectorAll('.btn-delete-combustible').forEach(btn => {
                btn.addEventListener('click', function() {
                    deleteCombustible(this.getAttribute('data-id'));
                });
            });
        }

        function updateCombustibleSummary(combustible) {
            const total = combustible.length;
            const totalValor = combustible.reduce((sum, item) => sum + (item.valor || 0), 0);
            const promedio = total > 0 ? totalValor / total : 0;
            
            document.getElementById('total-combustible').textContent = total;
            document.getElementById('total-valor-combustible').textContent = `$${totalValor.toLocaleString()}`;
            document.getElementById('promedio-combustible').textContent = `$${promedio.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
        }

        async function handleCombustibleSubmit(e) {
            e.preventDefault();
            
            const combustibleData = {
                placa_vehiculo: document.getElementById('placa-combustible').value,
                estacion_servicio: document.getElementById('estacion-servicio').value,
                direccion: document.getElementById('direccion-combustible').value,
                valor: parseFloat(document.getElementById('valor-combustible').value) || 0,
                fecha: document.getElementById('fecha-combustible').value,
                hora: document.getElementById('hora-combustible').value,
                user_id: currentUser.id
            };

            try {
                // Verificar nuevamente que el perfil existe antes de guardar
                await ensureUserProfile();

                if (editingId) {
                    const { error } = await supabase
                        .from('combustible')
                        .update(combustibleData)
                        .eq('id', editingId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('combustible')
                        .insert([combustibleData]);
                    if (error) throw error;
                }

                closeModal('combustible');
                const combustible = await loadCombustible();
                updateDashboardStats(await loadServicios(), combustible, await loadGastosVehiculo(), await loadOtros());
            } catch (error) {
                console.error('Error saving combustible:', error);
                if (error.message.includes('foreign key constraint')) {
                    alert('❌ Error: El perfil de usuario no existe. Por favor, contacta al administrador o verifica que las tablas estén creadas correctamente.');
                } else {
                    alert('❌ Error al guardar el registro de combustible: ' + error.message);
                }
            }
        }

        async function editCombustible(id) {
            try {
                const { data, error } = await supabase
                    .from('combustible')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                document.getElementById('placa-combustible').value = data.placa_vehiculo || '';
                document.getElementById('estacion-servicio').value = data.estacion_servicio || '';
                document.getElementById('direccion-combustible').value = data.direccion || '';
                document.getElementById('valor-combustible').value = data.valor || '';
                document.getElementById('fecha-combustible').value = data.fecha || '';
                document.getElementById('hora-combustible').value = data.hora || '';

                editingId = id;
                document.getElementById('combustible-modal-title').innerHTML = '<i class="fas fa-edit"></i> Editar Combustible';
                document.getElementById('combustible-modal').classList.add('active');
            } catch (error) {
                console.error('Error loading combustible:', error);
                alert('❌ Error cargando el combustible: ' + error.message);
            }
        }

        async function deleteCombustible(id) {
            if (!confirm('¿Estás seguro de que quieres eliminar este registro de combustible?')) return;

            try {
                const { error } = await supabase
                    .from('combustible')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                const combustible = await loadCombustible();
                updateDashboardStats(await loadServicios(), combustible, await loadGastosVehiculo(), await loadOtros());
            } catch (error) {
                console.error('Error deleting combustible:', error);
                alert('❌ Error al eliminar el registro de combustible: ' + error.message);
            }
        }

        async function applyCombustibleFilter() {
            const placa = document.getElementById('filter-placa-combustible').value;
            const estacion = document.getElementById('filter-estacion-combustible').value;
            const fecha = document.getElementById('filter-fecha-combustible').value;

            let query = supabase
                .from('combustible')
                .select('*')
                .eq('user_id', currentUser.id);

            if (placa) query = query.ilike('placa_vehiculo', `%${placa}%`);
            if (estacion) query = query.ilike('estacion_servicio', `%${estacion}%`);
            if (fecha) query = query.eq('fecha', fecha);

            query = query.order('fecha', { ascending: false });

            try {
                const { data, error } = await query;
                if (error) throw error;
                displayCombustible(data);
                updateCombustibleSummary(data);
            } catch (error) {
                console.error('Error filtering combustible:', error);
            }
        }

        function clearCombustibleFilter() {
            document.getElementById('filter-placa-combustible').value = '';
            document.getElementById('filter-estacion-combustible').value = '';
            document.getElementById('filter-fecha-combustible').value = '';
            loadCombustible();
        }

        // ========== GASTOS VEHÍCULO ==========
        async function loadGastosVehiculo() {
            const loading = document.getElementById('gastos-loading');
            const table = document.getElementById('gastos-table');
            
            loading.style.display = 'block';
            table.style.display = 'none';

            try {
                const { data, error } = await supabase
                    .from('gastos_vehiculo')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('fecha', { ascending: false });

                if (error) throw error;

                displayGastosVehiculo(data);
                updateGastosVehiculoSummary(data);
                return data;
            } catch (error) {
                console.error('Error loading gastos vehiculo:', error);
                showEmptyState('gastos-table', 'Error cargando gastos');
                return [];
            } finally {
                loading.style.display = 'none';
                table.style.display = 'table';
            }
        }

        function displayGastosVehiculo(gastos) {
            const tbody = document.querySelector('#gastos-table tbody');
            tbody.innerHTML = '';

            if (gastos.length === 0) {
                showEmptyState('gastos-table', 'No hay gastos de vehículo registrados', 'fas fa-car');
                return;
            }

            gastos.forEach(gasto => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${gasto.placa_vehiculo || ''}</strong></td>
                    <td>${gasto.direccion || ''}</td>
                    <td><strong>$${gasto.valor?.toLocaleString() || '0'}</strong></td>
                    <td>${formatDate(gasto.fecha)} ${gasto.hora || ''}</td>
                    <td class="actions">
                        <button class="btn btn-warning btn-sm btn-edit-gasto" data-id="${gasto.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-gasto" data-id="${gasto.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            document.querySelectorAll('.btn-edit-gasto').forEach(btn => {
                btn.addEventListener('click', function() {
                    editGastoVehiculo(this.getAttribute('data-id'));
                });
            });

            document.querySelectorAll('.btn-delete-gasto').forEach(btn => {
                btn.addEventListener('click', function() {
                    deleteGastoVehiculo(this.getAttribute('data-id'));
                });
            });
        }

        function updateGastosVehiculoSummary(gastos) {
            const total = gastos.length;
            const totalValor = gastos.reduce((sum, gasto) => sum + (gasto.valor || 0), 0);
            const promedio = total > 0 ? totalValor / total : 0;
            
            document.getElementById('total-gastos').textContent = total;
            document.getElementById('total-valor-gastos').textContent = `$${totalValor.toLocaleString()}`;
            document.getElementById('promedio-gastos').textContent = `$${promedio.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
        }

        async function handleGastoVehiculoSubmit(e) {
            e.preventDefault();
            
            const gastoData = {
                placa_vehiculo: document.getElementById('placa-gasto').value,
                direccion: document.getElementById('direccion-gasto').value,
                valor: parseFloat(document.getElementById('valor-gasto').value) || 0,
                detalles: document.getElementById('detalles-gasto').value,
                fecha: document.getElementById('fecha-gasto').value,
                hora: document.getElementById('hora-gasto').value,
                user_id: currentUser.id
            };

            try {
                // Verificar nuevamente que el perfil existe antes de guardar
                await ensureUserProfile();

                if (editingId) {
                    const { error } = await supabase
                        .from('gastos_vehiculo')
                        .update(gastoData)
                        .eq('id', editingId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('gastos_vehiculo')
                        .insert([gastoData]);
                    if (error) throw error;
                }

                closeModal('gasto-vehiculo');
                const gastos = await loadGastosVehiculo();
                updateDashboardStats(await loadServicios(), await loadCombustible(), gastos, await loadOtros());
            } catch (error) {
                console.error('Error saving gasto vehiculo:', error);
                if (error.message.includes('foreign key constraint')) {
                    alert('❌ Error: El perfil de usuario no existe. Por favor, contacta al administrador o verifica que las tablas estén creadas correctamente.');
                } else {
                    alert('❌ Error al guardar el gasto de vehículo: ' + error.message);
                }
            }
        }

        async function editGastoVehiculo(id) {
            try {
                const { data, error } = await supabase
                    .from('gastos_vehiculo')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                document.getElementById('placa-gasto').value = data.placa_vehiculo || '';
                document.getElementById('direccion-gasto').value = data.direccion || '';
                document.getElementById('valor-gasto').value = data.valor || '';
                document.getElementById('detalles-gasto').value = data.detalles || '';
                document.getElementById('fecha-gasto').value = data.fecha || '';
                document.getElementById('hora-gasto').value = data.hora || '';

                editingId = id;
                document.getElementById('gasto-vehiculo-modal-title').innerHTML = '<i class="fas fa-edit"></i> Editar Gasto Vehículo';
                document.getElementById('gasto-vehiculo-modal').classList.add('active');
            } catch (error) {
                console.error('Error loading gasto vehiculo:', error);
                alert('❌ Error cargando el gasto de vehículo: ' + error.message);
            }
        }

        async function deleteGastoVehiculo(id) {
            if (!confirm('¿Estás seguro de que quieres eliminar este gasto de vehículo?')) return;

            try {
                const { error } = await supabase
                    .from('gastos_vehiculo')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                const gastos = await loadGastosVehiculo();
                updateDashboardStats(await loadServicios(), await loadCombustible(), gastos, await loadOtros());
            } catch (error) {
                console.error('Error deleting gasto vehiculo:', error);
                alert('❌ Error al eliminar el gasto de vehículo: ' + error.message);
            }
        }

        async function applyGastosFilter() {
            const placa = document.getElementById('filter-placa-gastos').value;
            const fecha = document.getElementById('filter-fecha-gastos').value;

            let query = supabase
                .from('gastos_vehiculo')
                .select('*')
                .eq('user_id', currentUser.id);

            if (placa) query = query.ilike('placa_vehiculo', `%${placa}%`);
            if (fecha) query = query.eq('fecha', fecha);

            query = query.order('fecha', { ascending: false });

            try {
                const { data, error } = await query;
                if (error) throw error;
                displayGastosVehiculo(data);
                updateGastosVehiculoSummary(data);
            } catch (error) {
                console.error('Error filtering gastos:', error);
            }
        }

        function clearGastosFilter() {
            document.getElementById('filter-placa-gastos').value = '';
            document.getElementById('filter-fecha-gastos').value = '';
            loadGastosVehiculo();
        }

        // ========== OTROS GASTOS ==========
        async function loadOtros() {
            const loading = document.getElementById('otros-loading');
            const table = document.getElementById('otros-table');
            
            loading.style.display = 'block';
            table.style.display = 'none';

            try {
                const { data, error } = await supabase
                    .from('otros_gastos')
                    .select('*')
                    .eq('user_id', currentUser.id)
                    .order('fecha', { ascending: false });

                if (error) throw error;

                displayOtros(data);
                updateOtrosSummary(data);
                return data;
            } catch (error) {
                console.error('Error loading otros gastos:', error);
                showEmptyState('otros-table', 'Error cargando otros gastos');
                return [];
            } finally {
                loading.style.display = 'none';
                table.style.display = 'table';
            }
        }

        function displayOtros(otros) {
            const tbody = document.querySelector('#otros-table tbody');
            tbody.innerHTML = '';

            if (otros.length === 0) {
                showEmptyState('otros-table', 'No hay otros gastos registrados', 'fas fa-receipt');
                return;
            }

            otros.forEach(otro => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td><strong>${otro.nombre_gasto || ''}</strong></td>
                    <td>${otro.direccion || ''}</td>
                    <td><strong>$${otro.valor?.toLocaleString() || '0'}</strong></td>
                    <td>${formatDate(otro.fecha)} ${otro.hora || ''}</td>
                    <td class="actions">
                        <button class="btn btn-warning btn-sm btn-edit-otro" data-id="${otro.id}">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-danger btn-sm btn-delete-otro" data-id="${otro.id}">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            });

            document.querySelectorAll('.btn-edit-otro').forEach(btn => {
                btn.addEventListener('click', function() {
                    editOtro(this.getAttribute('data-id'));
                });
            });

            document.querySelectorAll('.btn-delete-otro').forEach(btn => {
                btn.addEventListener('click', function() {
                    deleteOtro(this.getAttribute('data-id'));
                });
            });
        }

        function updateOtrosSummary(otros) {
            const total = otros.length;
            const totalValor = otros.reduce((sum, otro) => sum + (otro.valor || 0), 0);
            const promedio = total > 0 ? totalValor / total : 0;
            
            document.getElementById('total-otros').textContent = total;
            document.getElementById('total-valor-otros').textContent = `$${totalValor.toLocaleString()}`;
            document.getElementById('promedio-otros').textContent = `$${promedio.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
        }

        async function handleOtroSubmit(e) {
            e.preventDefault();
            
            const otroData = {
                nombre_gasto: document.getElementById('nombre-gasto').value,
                direccion: document.getElementById('direccion-otro').value,
                valor: parseFloat(document.getElementById('valor-otro').value) || 0,
                fecha: document.getElementById('fecha-otro').value,
                hora: document.getElementById('hora-otro').value,
                user_id: currentUser.id
            };

            try {
                // Verificar nuevamente que el perfil existe antes de guardar
                await ensureUserProfile();

                if (editingId) {
                    const { error } = await supabase
                        .from('otros_gastos')
                        .update(otroData)
                        .eq('id', editingId);
                    if (error) throw error;
                } else {
                    const { error } = await supabase
                        .from('otros_gastos')
                        .insert([otroData]);
                    if (error) throw error;
                }

                closeModal('otro');
                const otros = await loadOtros();
                updateDashboardStats(await loadServicios(), await loadCombustible(), await loadGastosVehiculo(), otros);
            } catch (error) {
                console.error('Error saving otro gasto:', error);
                if (error.message.includes('foreign key constraint')) {
                    alert('❌ Error: El perfil de usuario no existe. Por favor, contacta al administrador o verifica que las tablas estén creadas correctamente.');
                } else {
                    alert('❌ Error al guardar el otro gasto: ' + error.message);
                }
            }
        }

        async function editOtro(id) {
            try {
                const { data, error } = await supabase
                    .from('otros_gastos')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                document.getElementById('nombre-gasto').value = data.nombre_gasto || '';
                document.getElementById('direccion-otro').value = data.direccion || '';
                document.getElementById('valor-otro').value = data.valor || '';
                document.getElementById('fecha-otro').value = data.fecha || '';
                document.getElementById('hora-otro').value = data.hora || '';

                editingId = id;
                document.getElementById('otro-modal-title').innerHTML = '<i class="fas fa-edit"></i> Editar Otro Gasto';
                document.getElementById('otro-modal').classList.add('active');
            } catch (error) {
                console.error('Error loading otro gasto:', error);
                alert('❌ Error cargando el otro gasto: ' + error.message);
            }
        }

        async function deleteOtro(id) {
            if (!confirm('¿Estás seguro de que quieres eliminar este otro gasto?')) return;

            try {
                const { error } = await supabase
                    .from('otros_gastos')
                    .delete()
                    .eq('id', id);

                if (error) throw error;
                const otros = await loadOtros();
                updateDashboardStats(await loadServicios(), await loadCombustible(), await loadGastosVehiculo(), otros);
            } catch (error) {
                console.error('Error deleting otro gasto:', error);
                alert('❌ Error al eliminar el otro gasto: ' + error.message);
            }
        }

        async function applyOtrosFilter() {
            const nombre = document.getElementById('filter-nombre-otros').value;
            const fecha = document.getElementById('filter-fecha-otros').value;

            let query = supabase
                .from('otros_gastos')
                .select('*')
                .eq('user_id', currentUser.id);

            if (nombre) query = query.ilike('nombre_gasto', `%${nombre}%`);
            if (fecha) query = query.eq('fecha', fecha);

            query = query.order('fecha', { ascending: false });

            try {
                const { data, error } = await query;
                if (error) throw error;
                displayOtros(data);
                updateOtrosSummary(data);
            } catch (error) {
                console.error('Error filtering otros:', error);
            }
        }

        function clearOtrosFilter() {
            document.getElementById('filter-nombre-otros').value = '';
            document.getElementById('filter-fecha-otros').value = '';
            loadOtros();
        }

        // ========== FUNCIONES AUXILIARES ==========
        
        // Función utilitaria para formatear fecha
        function formatDate(dateString) {
            if (!dateString) return '';
            const date = new Date(dateString);
            return date.toLocaleDateString('es-ES');
        }

        // Función para mostrar estado vacío
        function showEmptyState(tableId, message, icon = 'fas fa-inbox') {
            const tbody = document.querySelector(`#${tableId} tbody`);
            tbody.innerHTML = `
                <tr>
                    <td colspan="7">
                        <div class="empty-state">
                            <i class="${icon}"></i>
                            <h3>${message}</h3>
                            <p>No se encontraron registros para mostrar</p>
                        </div>
                    </td>
                </tr>
            `;
        }
