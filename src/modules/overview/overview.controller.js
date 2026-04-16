var amberService = require('../amber/amber.service');

exports.getOverview = async function getOverview(_req, res, next) {
  try {
    var stats = await amberService.getAmberStats();

    res.json({
      project: {
        name: 'MIA',
        subtitle: 'Moments in Amber',
        architecture: {
          frontend: 'React + Vite',
          backend: 'Express Generator',
        },
      },
      modules: [
        'Gate auth shell',
        'Interactive room',
        'Seal / Unseal / History / Pricing / Settings',
        'Express auth, amber, payment, and admin routes',
      ],
      roadmap: [
        'Finalize MongoDB Atlas deployment and secret management',
        'Harden durable sessions and user tier upgrades',
        'Add sender edit/cancel flows',
        'Integrate email delivery',
        'Add mail logs and durable admin audit trail',
      ],
      stats: stats,
    });
  } catch (error) {
    next(error);
  }
};
