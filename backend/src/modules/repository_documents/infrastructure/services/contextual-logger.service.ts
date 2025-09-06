import { Injectable, Logger, Scope, Inject } from '@nestjs/common';
import { REQUEST } from '@nestjs/core';
import type { LoggingRequest } from '../http/middleware/logging.middleware';

export interface LogContext {
  requestId?: string;
  userId?: string;
  action?: string;
  resource?: string;
  metadata?: Record<string, any>;
}

@Injectable({ scope: Scope.REQUEST })
export class ContextualLoggerService {
  private readonly logger = new Logger('DocumentsService');
  private context: LogContext = {};

  constructor(@Inject(REQUEST) private request: LoggingRequest) {
    // Extraer requestId del request
    this.context.requestId = this.request.requestId;
  }

  setContext(context: Partial<LogContext>) {
    this.context = { ...this.context, ...context };
  }

  private formatMessage(message: string, additionalContext?: Record<string, any>) {
    const fullContext = {
      ...this.context,
      ...additionalContext,
      timestamp: new Date().toISOString(),
    };

    const contextStr = this.context.requestId 
      ? `[${this.context.requestId}]` 
      : '';

    return {
      message: `${contextStr} ${message}`,
      context: fullContext,
    };
  }

  log(message: string, context?: Record<string, any>) {
    const formatted = this.formatMessage(message, context);
    this.logger.log(formatted.message, formatted.context);
  }

  error(message: string, error?: Error | string, context?: Record<string, any>) {
    const formatted = this.formatMessage(message, {
      ...context,
      error: error instanceof Error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : error,
    });
    this.logger.error(formatted.message, formatted.context);
  }

  warn(message: string, context?: Record<string, any>) {
    const formatted = this.formatMessage(message, context);
    this.logger.warn(formatted.message, formatted.context);
  }

  debug(message: string, context?: Record<string, any>) {
    const formatted = this.formatMessage(message, context);
    this.logger.debug(formatted.message, formatted.context);
  }

  verbose(message: string, context?: Record<string, any>) {
    const formatted = this.formatMessage(message, context);
    this.logger.verbose(formatted.message, formatted.context);
  }

  // Métodos específicos para el dominio de documentos
  logDocumentOperation(
    operation: 'upload' | 'download' | 'delete' | 'process' | 'list',
    documentId?: string,
    additionalContext?: Record<string, any>
  ) {
    this.setContext({
      action: operation,
      resource: 'document',
      metadata: { documentId, ...additionalContext },
    });
    
    this.log(`Document ${operation} operation`, {
      documentId,
      ...additionalContext,
    });
  }

  logChunkOperation(
    operation: 'create' | 'process' | 'retrieve',
    documentId: string,
    chunkCount?: number,
    additionalContext?: Record<string, any>
  ) {
    this.setContext({
      action: `chunk_${operation}`,
      resource: 'document_chunk',
      metadata: { documentId, chunkCount, ...additionalContext },
    });

    this.log(`Chunk ${operation} operation for document`, {
      documentId,
      chunkCount,
      ...additionalContext,
    });
  }

  logEmbeddingOperation(
    operation: 'generate' | 'search',
    documentId?: string,
    additionalContext?: Record<string, any>
  ) {
    this.setContext({
      action: `embedding_${operation}`,
      resource: 'embedding',
      metadata: { documentId, ...additionalContext },
    });

    this.log(`Embedding ${operation} operation`, {
      documentId,
      ...additionalContext,
    });
  }
}
