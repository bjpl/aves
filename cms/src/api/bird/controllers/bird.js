const { createCoreController } = require('@strapi/strapi').factories;

module.exports = createCoreController('api::bird.bird', ({ strapi }) => ({
  async findOne(ctx) {
    const { id } = ctx.params;
    const entity = await strapi.service('api::bird.bird').findOne(id, {
      populate: ['images', 'sounds', 'lessons']
    });
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
    return this.transformResponse(sanitizedEntity);
  },

  async find(ctx) {
    const entities = await strapi.service('api::bird.bird').find({
      ...ctx.query,
      populate: ['images', 'sounds', 'lessons']
    });
    const sanitizedResults = await this.sanitizeOutput(entities, ctx);
    return this.transformResponse(sanitizedResults);
  }
}));