// C:\troxtetherworld\server\AdminConsole\index.js (suite)
export class AdminConsole {
  constructor(kernel) {
    this.kernel = kernel;
    this.app = express();
    this.server = createServer(this.app);
    this.io = new Server(this.server, {
      cors: {
        origin: config.security.corsOrigin,
        credentials: true
      }
    });
    
    this.port = parseInt(process.env.ADMIN_PORT || '4040');
    this.routes = new Map();
    this.middlewares = [];
  }

  async initialize() {
    // Middleware globaux
    this.app.use(helmet({
      contentSecurityPolicy: false
    }));
    this.app.use(cors({
      origin: config.security.corsOrigin,
      credentials: true
    }));
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // Rate limiting
    const { rateLimit } = await import('../middleware/rateLimit.js');
    this.app.use('/api/', rateLimit({
      windowMs: config.security.rateLimitWindow,
      max: config.security.rateLimitMax
    }));

    // Auth middleware
    const { auth } = await import('../admin/src/utils/auth.js');
    this.app.use('/api/admin', auth);

    // Logger des requêtes
    this.app.use((req, res, next) => {
      console.log(`[Admin] ${req.method} ${req.path}`);
      next();
    });

    // Fichiers statiques
    this.app.use('/admin', express.static(path.join(config.paths.admin, 'public')));
    this.app.use('/admin/storage', express.static(config.paths.admin, 'storage'));

    // Routes API
    await this._loadRoutes();
    
    // WebSocket
    this._setupWebSocket();

    // Route fallback SPA
    this.app.get('/admin/*', (req, res) => {
      res.sendFile(path.join(config.paths.admin, 'public', 'index.html'));
    });

    return this;
  }

  async _loadRoutes() {
    // Routes dashboard
    const dashboardRoutes = (await import('../admin/dashboard/routes.js')).default;
    this.app.use('/api/admin/dashboard', dashboardRoutes);
    
    // Routes commandes
    const commandRoutes = (await import('../admin/commands/routes.js')).default;
    this.app.use('/api/admin/commands', commandRoutes);
    
    // Routes punitions
    const punishmentRoutes = (await import('../admin/punishments/routes.js')).default;
    this.app.use('/api/admin/punishments', punishmentRoutes);
    
    // Routes intégrations
    const integrationRoutes = (await import('../admin/integrations/routes.js')).default;
    this.app.use('/api/admin/integrations', integrationRoutes);
    
    // Routes scheduler
    const schedulerRoutes = (await import('../admin/scheduler/routes.js')).default;
    this.app.use('/api/admin/scheduler', schedulerRoutes);
  }

  _setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log(`[Admin WS] Connecté: ${socket.id}`);

      socket.on('admin:subscribe', (channel) => {
        socket.join(`admin:${channel}`);
        console.log(`[Admin WS] Abonné à ${channel}`);
      });

      socket.on('admin:unsubscribe', (channel) => {
        socket.leave(`admin:${channel}`);
      });

      socket.on('admin:execute', async (data) => {
        try {
          const result = await this.kernel.brain.execute(data.command, data.params);
          socket.emit('admin:result', { id: data.id, result });
        } catch (error) {
          socket.emit('admin:error', { id: data.id, error: error.message });
        }
      });

      socket.on('disconnect', () => {
        console.log(`[Admin WS] Déconnecté: ${socket.id}`);
      });
    });

    // Écouter les événements du kernel pour les broadcast admin
    this.kernel.bus.on('*', (event, data) => {
      this.io.to('admin:live').emit('kernel:event', { event, data, timestamp: Date.now() });
    });
  }

  async start() {
    return new Promise((resolve) => {
      this.server.listen(this.port, '0.0.0.0', () => {
        console.log(`[Admin Console] Écoute sur port ${this.port}`);
        resolve();
      });
    });
  }

  async stop() {
    this.io.close();
    this.server.close();
  }
}