// C:\troxtetherworld\server\admin\integrations\controller.js
import db from '../../config/database.js';

export class IntegrationController {
  async listIntegrations(req, res) {
    try {
      const integrations = await db.query('SELECT * FROM integrations ORDER BY name ASC');
      res.json({ success: true, data: integrations });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async createIntegration(req, res) {
    try {
      const { name, type, config, webhook } = req.body;

      if (!name || !type) {
        return res.status(400).json({
          success: false,
          error: 'name et type sont requis'
        });
      }

      const integration = {
        id: `int_${Date.now()}`,
        name,
        type,
        config: JSON.stringify(config || {}),
        webhook: webhook || null,
        active: true,
        created_by: req.user.id,
        created_at: new Date()
      };

      await db.query('INSERT INTO integrations SET ?', [integration]);
      res.json({ success: true, data: integration });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  }

  async getIntegration(req, res) {
    try {
      const [integration] = await db.query(
        'SELECT * FROM integrations WHERE id = ?',
        [req.params.id]
      );

      if (!integration) {
        return res.status(404).json({ success: false, error: 'Intégration non trouvée' });
      }

      // Parser la config
      integration.config = typeof integration.config === 'string' 
        ? JSON.parse(integration.config) 
        : integration.config;

      res.json({ success: true, data: integration