# Documentación de Endpoints del Contrato - API de Contexto de Materias

## Resumen de la Implementación

Se han implementado los endpoints requeridos por el contrato para proporcionar acceso a los documentos cargados por profesores para materias específicas.

## Base URL
`/api/v1/documentos`

## Autenticación
JWT Bearer Token (enviado en header `Authorization: Bearer <token>`)

## Endpoints Implementados

### 1. GET /materias/{materiaId}/documentos

**Descripción:** Obtiene la lista de documentos disponibles para una materia.

**Parámetros de Ruta:**
- `materiaId` (string, requerido): ID de la materia (e.g., "mate1")

**Parámetros de Consulta:**
- `tipo` (string, opcional): Filtrar por tipo (e.g., "pdf", "libro"). Default: todos
- `page` (integer, opcional): Página para paginación. Default: 1
- `limit` (integer, opcional): Límite por página. Default: 10

**Respuesta Exitosa (200 OK):**
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

**Controlador:** `ContractDocumentsController.getDocumentsBySubject()`
**Caso de Uso:** `GetDocumentsBySubjectUseCase`

### 2. GET /documentos/{docId}/contenido

**Descripción:** Obtiene el contenido extraído de un documento específico (texto plano para procesamiento).

**Parámetros de Ruta:**
- `docId` (string, requerido): ID del documento

**Respuesta Exitosa (200 OK):**
```json
{
  "contenido": "Texto extraído del PDF... (puede ser largo, con secciones)",
  "metadata": {
    "paginas": 150,
    "resumen": "Resumen generado por IA si aplica"
  }
}
```

**Controlador:** `ContractDocumentsController.getDocumentContent()`
**Caso de Uso:** `GetDocumentContentUseCase`

## Cambios en la Base de Datos

### Migración Aplicada: `20250907011252_add_document_course_relation`

**Cambios realizados:**
1. ✅ Campo `courseId` opcional agregado a la tabla `Document`
2. ✅ Índice `Document_courseId_idx` para optimizar consultas
3. ✅ Clave foránea `Document_courseId_fkey` con `ON DELETE SET NULL`

## Arquitectura de la Implementación

### Casos de Uso Creados
- `GetDocumentsBySubjectUseCase`: Lista documentos filtrados por materia/curso
- `GetDocumentContentUseCase`: Obtiene el contenido extraído de un documento

### DTOs Creados
- `ContractDocumentItemDto`: DTO específico para el contrato con `profesorId`
- `ContractDocumentListResponseDto`: Respuesta que cumple con el formato del contrato
- `DocumentContentResponseDto`: Respuesta para el contenido del documento

### Controlador
- `ContractDocumentsController`: Nuevo controlador específico para los endpoints del contrato

### Repositorio Extendido
- `DocumentRepositoryPort`: Agregados métodos `findByCourseId()` y `associateWithCourse()`
- `PrismaDocumentRepositoryAdapter`: Implementación de los nuevos métodos

## Estado de la Implementación

 **Completado:**
- Migración de base de datos aplicada
- Casos de uso implementados
- DTOs creados según el contrato
- Controlador implementado
- Repositorio extendido
- Módulo actualizado con nuevos providers
- Compilación exitosa



## Comandos Útiles

```bash
# Aplicar migraciones
npx prisma migrate deploy

# Ver estado de migraciones
npx prisma migrate status

# Generar cliente Prisma
npx prisma generate

# Iniciar servidor de desarrollo
npm run start:dev

# Compilar proyecto
npm run build
```

## Notas Técnicas

- Los endpoints mantienen compatibilidad con la implementación existente
- Se utiliza arquitectura hexagonal (puertos y adaptadores)
- Los DTOs cumplen exactamente con el contrato especificado
- La relación Document-Course es opcional (no rompe documentos existentes)
- Se aprovecha la infraestructura existente de S3, autenticación y extracción de texto
