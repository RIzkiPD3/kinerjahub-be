"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const package_json_1 = require("../../package.json");
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'KinerjaHub API Docs',
            version: package_json_1.version,
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
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        email: { type: 'string' },
                        phone_number: { type: 'string' },
                        organization_id: { type: 'string', format: 'uuid' },
                        department_id: { type: 'string', format: 'uuid' },
                        role_id: { type: 'string', format: 'uuid' },
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
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        division_id: { type: 'string', format: 'uuid' },
                        organization: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                            },
                        },
                        division: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                            },
                        },
                        created_at: { type: 'string', format: 'date-time' },
                        updated_at: { type: 'string', format: 'date-time' },
                    },
                },
                DepartmentInput: {
                    type: 'object',
                    required: ['name', 'division_id'],
                    properties: {
                        name: { type: 'string', example: 'Engineering' },
                        division_id: { type: 'string', format: 'uuid', example: '5f80ae5d-4321-44f1-9b18-b4de1916ea65' },
                    },
                },
                Division: {
                    type: 'object',
                    properties: {
                        id: { type: 'string', format: 'uuid' },
                        name: { type: 'string' },
                        organization_id: { type: 'string', format: 'uuid' },
                        organization: {
                            type: 'object',
                            properties: {
                                id: { type: 'string', format: 'uuid' },
                                name: { type: 'string' },
                            },
                        },
                        departments: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string', format: 'uuid' },
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
                        organization_id: { type: 'string', format: 'uuid', example: '5f80ae5d-4321-44f1-9b18-b4de1916ea65' },
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(options);
exports.default = swaggerSpec;
