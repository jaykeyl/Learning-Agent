import { Injectable, NestMiddleware, Logger } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface LoggingRequest extends Request {
  requestId?: string;
  startTime?: number;
}

@Injectable()
export class LoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('DocumentsAPI');

  use(req: LoggingRequest, res: Response, next: NextFunction) {
    // Generar ID único para la petición
    req.requestId = uuidv4();
    req.startTime = Date.now();

    // Log de inicio de petición
    this.logger.log(
      `[${req.requestId}] ${req.method} ${req.url} - Request started`,
      {
        requestId: req.requestId,
        method: req.method,
        url: req.url,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        timestamp: new Date().toISOString(),
      },
    );

    // Interceptar la respuesta para loggear el final
    const originalSend = res.send;
    res.send = function (body: any) {
      const duration = Date.now() - (req.startTime || 0);
      
      const logLevel = res.statusCode >= 400 ? 'error' : 'log';
      const logMessage = `[${req.requestId}] ${req.method} ${req.url} - ${res.statusCode} - ${duration}ms`;
      
      if (logLevel === 'error') {
        Logger.prototype.error.call(
          new Logger('DocumentsAPI'),
          logMessage,
          {
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            timestamp: new Date().toISOString(),
          },
        );
      } else {
        Logger.prototype.log.call(
          new Logger('DocumentsAPI'),
          logMessage,
          {
            requestId: req.requestId,
            method: req.method,
            url: req.url,
            statusCode: res.statusCode,
            duration,
            timestamp: new Date().toISOString(),
          },
        );
      }

      return originalSend.call(this, body);
    };

    next();
  }
}
