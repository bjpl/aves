module.exports = {
  register({ strapi }) {
    // Register phase
  },

  bootstrap({ strapi }) {
    // Bootstrap phase - runs after the app is registered
    console.log('Strapi CMS is running for Aves project');
  },
};