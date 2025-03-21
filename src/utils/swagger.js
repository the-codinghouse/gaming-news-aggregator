const swaggerJsdoc = require('swagger-jsdoc');
const swaggerUi = require('swagger-ui-express');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Gaming News API',
      version: '1.0.0',
      description: 'API for gaming news and reviews from IGN',
      contact: {
        name: 'API Support',
        url: 'https://github.com/yourusername/gaming-news-api/issues'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ],
    tags: [
      {
        name: 'News',
        description: 'Gaming news and announcements'
      },
      {
        name: 'Games',
        description: 'Game reviews and ratings'
      }
    ],
    components: {
      responses: {
        Error: {
          description: 'Error response',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: {
                    type: 'boolean',
                    example: false
                  },
                  error: {
                    type: 'object',
                    properties: {
                      message: {
                        type: 'string'
                      },
                      code: {
                        type: 'integer'
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  },
  apis: ['./src/routes/*.js']
};

function swaggerSetup(app) {
  const specs = swaggerJsdoc(options);
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
    explorer: true,
    customCss: '.swagger-ui .topbar { display: none }',
    customSiteTitle: 'Gaming News API Documentation'
  }));
}

module.exports = swaggerSetup;