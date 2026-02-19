import swaggerJsdoc from 'swagger-jsdoc';
import { version } from '../../package.json';

const options: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'KinerjaHub API Docs',
      version,
      description: 'Dokumentasi API untuk KinerjaHub Backend',
    },
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        User: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            email: { type: 'string' },
            phone_number: { type: 'string' },
            organization_id: { type: 'integer' },
            department_id: { type: 'integer' },
            role_id: { type: 'integer' },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        RegisterInput: {
          type: 'object',
          required: ['email', 'name', 'password', 'organization_name', 'organization_address', 'phone_number'],
          properties: {
            email: { type: 'string', default: 'user@example.com' },
            name: { type: 'string', default: 'John Doe' },
            password: { type: 'string', default: 'password123' },
            organization_name: { type: 'string', default: 'Example Corp' },
            organization_address: { type: 'string', default: '123 Main St, Jakarta' },
            phone_number: { type: 'string', default: '+6281234567890' },
          },
        },
        LoginInput: {
          type: 'object',
          required: ['email', 'password'],
          properties: {
            email: { type: 'string', default: 'user@example.com' },
            password: { type: 'string', default: 'password123' },
          },
        },
        Department: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            organization_id: { type: 'integer' },
            division_id: { type: 'integer' },
            organization: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
            division: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        DepartmentInput: {
          type: 'object',
          required: ['name', 'organization_id', 'division_id'],
          properties: {
            name: { type: 'string', example: 'Engineering' },
            organization_id: { type: 'integer', example: 1 },
            division_id: { type: 'integer', example: 1 },
          },
        },
        Division: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
            name: { type: 'string' },
            organization_id: { type: 'integer' },
            organization: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                name: { type: 'string' },
              },
            },
            departments: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'integer' },
                  name: { type: 'string' },
                },
              },
            },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        DivisionInput: {
          type: 'object',
          required: ['name', 'organization_id'],
          properties: {
            name: { type: 'string', example: 'Technology' },
            organization_id: { type: 'integer', example: 1 },
          },
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  apis: ['./src/routes/*.ts', './src/models/*.ts'],
};

const swaggerSpec = swaggerJsdoc(options);

export default swaggerSpec;
