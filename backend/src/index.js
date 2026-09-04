'use strict';

module.exports = {
  /**
   * An asynchronous register function that runs before
   * your application is initialized.
   */
  register(/*{ strapi }*/) {},

  /**
   * An asynchronous bootstrap function that runs before
   * your application gets started.
   */
  async bootstrap({ strapi }) {
    // Set Public Permissions for Read-Only APIs (Articles, Projects, Services)
    try {
      const publicRole = await strapi
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'public' } });

      if (publicRole) {
        const permissionsToEnable = [
          'api::article.article.find',
          'api::article.article.findOne',
          'api::project.project.find',
          'api::project.project.findOne',
          'api::service.service.find',
          'api::service.service.findOne',
        ];

        for (const action of permissionsToEnable) {
          const count = await strapi
            .query('plugin::users-permissions.permission')
            .count({
              where: {
                role: publicRole.id,
                action,
              },
            });

          if (count === 0) {
            await strapi.query('plugin::users-permissions.permission').create({
              data: {
                action,
                role: publicRole.id,
              },
            });
          }
        }
        strapi.log.info('🚀 Public API permissions automatically registered for NovaSphere CMS.');
      }
    } catch (err) {
      strapi.log.warn('Could not auto-configure public permissions:', err.message);
    }
  },
};
