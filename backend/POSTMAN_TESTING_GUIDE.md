# Guía de Testing con Postman - Contract Endpoints

## Información General

**Base URL:** `http://localhost:3000`  
**Autenticación:** JWT Bearer Token requerido para algunos endpoints

## Pre-requisitos

### 1. Iniciar el servidor
```bash
# Desde el directorio backend
npm run start:dev
```

### 2. Crear datos de prueba (opcional)
Ejecutar el seed de Prisma si existe:
```bash
npx prisma db seed
```

## Endpoints Implementados

### 1. **GET** - Listar documentos por materia
**Endpoint:** `/api/v1/documentos/materias/{materiaId}/documentos`

#### Configuración en Postman:
- **Método:** GET
- **URL:** `http://localhost:3000/api/v1/documentos/materias/course-uuid-aqui/documentos`
- **Headers:**
  ```
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
  ```
- **Query Parameters (opcionales):**
  - `tipo`: pdf, libro, etc.
  - `page`: 1, 2, 3... (default: 1)
  - `limit`: 10, 20, 50... (default: 10)

#### Ejemplo de URL completa:
```
http://localhost:3000/api/v1/documentos/materias/123e4567-e89b-12d3-a456-426614174000/documentos?tipo=pdf&page=1&limit=10
```

#### Respuesta esperada (200 OK):
```json
{
  "documentos": [
    {
      "id": "doc123",
      "titulo": "Libro de Matemáticas Básicas", 
      "tipo": "pdf",
      "url": "https://storage.example.com/doc123.pdf",
      "fechaCarga": "2025-09-01T00:00:00Z",
      "profesorId": "prof456"
    }
  ],
  "total": 5,
  "pagina": 1
}
```

---

### 2. **GET** - Obtener contenido de documento
**Endpoint:** `/api/v1/documentos/{docId}/contenido`

#### Configuración en Postman:
- **Método:** GET
- **URL:** `http://localhost:3000/api/v1/documentos/document-uuid-aqui/contenido`
- **Headers:**
  ```
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
  ```

#### Ejemplo de URL:
```
http://localhost:3000/api/v1/documentos/456e7890-e89b-12d3-a456-426614174001/contenido
```

#### Respuesta esperada (200 OK):
```json
{
  "contenido": "Texto extraído del PDF... (puede ser largo, con secciones)",
  "metadata": {
    "paginas": 150,
    "resumen": "Resumen generado por IA si aplica"
  }
}
```

---

### 3. **POST** - Asociar documento con curso (endpoint adicional)
**Endpoint:** `/api/documents/{documentId}/associate-course/{courseId}`

#### Configuración en Postman:
- **Método:** POST
- **URL:** `http://localhost:3000/api/documents/document-uuid/associate-course/course-uuid`
- **Headers:**
  ```
  Authorization: Bearer YOUR_JWT_TOKEN_HERE
  Content-Type: application/json
  ```

#### Respuesta esperada (200 OK):
```json
{
  "success": true,
  "message": "Documento asociado con el curso exitosamente",
  "documentId": "document-uuid",
  "courseId": "course-uuid"
}
```

---


---

## Obtener Token JWT para Testing

### 1. Login Endpoint
**Endpoint:** `/api/auth/login` (si existe)

#### Configuración:
- **Método:** POST
- **URL:** `http://localhost:3000/api/auth/login`
- **Body (JSON):**
  ```json
  {
    "email": "usuario@ejemplo.com",
    "password": "password123"
  }
  ```

#### Respuesta:
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user-uuid",
    "email": "usuario@ejemplo.com"
  }
}
```

### 2. Usar el token
Copiar el `access_token` y usarlo en el header `Authorization: Bearer <token>`

---

## IDs de Ejemplo para Testing

Para realizar las pruebas necesitarás IDs reales de tu base de datos. Puedes obtenerlos ejecutando:

```sql
-- Obtener IDs de cursos
SELECT id, name FROM "Course" LIMIT 5;

-- Obtener IDs de documentos
SELECT id, "originalName", "uploadedBy" FROM "Document" LIMIT 5;

-- Obtener IDs de usuarios
SELECT id, email FROM "User" LIMIT 5;
```

---

## Configuración de Colección Postman

### Variables de Entorno
Crear las siguientes variables en Postman:

- `baseUrl`: `http://localhost:3000`
- `authToken`: `Bearer your-jwt-token-here`
- `courseId`: `uuid-del-curso`
- `documentId`: `uuid-del-documento`

### Headers Globales
```
Authorization: {{authToken}}
Content-Type: application/json
```

---

## Troubleshooting

### Error: "Cannot read properties of undefined"
- Verificar que el servidor esté corriendo
- Verificar que la base de datos esté conectada
- Verificar que las migraciones estén aplicadas

### Error: "Unauthorized"
- Verificar que el token JWT esté en el header
- Verificar que el token no haya expirado
- Verificar el formato: `Bearer <token>`

### Error: "Not Found"
- Verificar que los UUIDs sean válidos
- Verificar que los recursos existan en la base de datos
- Verificar la URL del endpoint

---

## Scripts de Automatización Postman

### Pre-request Script (para obtener token automáticamente):
```javascript
// Pre-request script para login automático
const loginRequest = {
  url: pm.environment.get("baseUrl") + "/api/auth/login",
  method: 'POST',
  header: {
    'Content-Type': 'application/json',
  },
  body: {
    mode: 'raw',
    raw: JSON.stringify({
      email: "test@example.com",
      password: "password123"
    })
  }
};

pm.sendRequest(loginRequest, (err, response) => {
  if (err) {
    console.log('Error during login:', err);
  } else {
    const responseJson = response.json();
    pm.environment.set("authToken", "Bearer " + responseJson.access_token);
  }
});
```

### Test Script (para validar respuestas):
```javascript
// Test script para validar respuesta
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("Response has required fields", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData).to.have.property('documentos');
    pm.expect(jsonData).to.have.property('total');
    pm.expect(jsonData).to.have.property('pagina');
});

pm.test("Documents array is not empty", function () {
    const jsonData = pm.response.json();
    pm.expect(jsonData.documentos).to.be.an('array');
});
```
